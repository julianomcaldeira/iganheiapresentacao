import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text content from various file types
async function extractTextFromFile(arrayBuffer: ArrayBuffer, fileName: string, mimeType: string): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  // For text-based files
  if (mimeType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
    return decoder.decode(arrayBuffer);
  }
  
  // For PDF files - extract basic text (simplified extraction)
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const text = decoder.decode(arrayBuffer);
    // Extract readable text between PDF markers
    const matches = text.match(/\(([^)]+)\)/g);
    if (matches) {
      return matches.map(m => m.slice(1, -1)).join(' ').substring(0, 50000);
    }
    return text.substring(0, 50000);
  }
  
  // For Word documents - basic text extraction
  if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    const text = decoder.decode(arrayBuffer);
    // Remove XML tags and extract text
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 50000);
  }
  
  // For other files, try to decode as text
  try {
    return decoder.decode(arrayBuffer).substring(0, 50000);
  } catch {
    return `[Arquivo binário: ${fileName}]`;
  }
}

// Extract files from ZIP - supports both compressed and uncompressed entries
async function extractZipContents(arrayBuffer: ArrayBuffer): Promise<{ name: string; content: string }[]> {
  const uint8 = new Uint8Array(arrayBuffer);
  const files: { name: string; content: string }[] = [];
  
  let offset = 0;
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  console.log(`Processing ZIP file, size: ${uint8.length} bytes`);
  
  while (offset < uint8.length - 30) {
    // Check for local file header signature (PK\x03\x04)
    if (uint8[offset] === 0x50 && uint8[offset + 1] === 0x4B && 
        uint8[offset + 2] === 0x03 && uint8[offset + 3] === 0x04) {
      
      const compressionMethod = uint8[offset + 8] | (uint8[offset + 9] << 8);
      const compressedSize = uint8[offset + 18] | (uint8[offset + 19] << 8) | 
                             (uint8[offset + 20] << 16) | (uint8[offset + 21] << 24);
      const uncompressedSize = uint8[offset + 22] | (uint8[offset + 23] << 8) | 
                               (uint8[offset + 24] << 16) | (uint8[offset + 25] << 24);
      const fileNameLength = uint8[offset + 26] | (uint8[offset + 27] << 8);
      const extraFieldLength = uint8[offset + 28] | (uint8[offset + 29] << 8);
      
      const fileName = decoder.decode(uint8.slice(offset + 30, offset + 30 + fileNameLength));
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;
      
      console.log(`Found file: ${fileName}, compression: ${compressionMethod}, size: ${compressedSize}`);
      
      // Skip directories, hidden files, and very large files
      if (!fileName.endsWith('/') && 
          !fileName.startsWith('__MACOSX') && 
          !fileName.startsWith('.') &&
          compressedSize < 10000000 && 
          compressedSize > 0) {
        
        const fileData = uint8.slice(dataStart, dataStart + compressedSize);
        
        // Only handle uncompressed files (compressionMethod === 0) for now
        if (compressionMethod === 0) {
          const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' :
                          fileName.endsWith('.doc') ? 'application/msword' :
                          fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                          fileName.endsWith('.txt') ? 'text/plain' :
                          fileName.endsWith('.rtf') ? 'text/rtf' : 'application/octet-stream';
          
          const content = await extractTextFromFile(
            fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength), 
            fileName, 
            mimeType
          );
          
          if (content && content.length > 50) {
            files.push({ name: fileName, content: content.substring(0, 40000) });
            console.log(`Extracted ${content.length} chars from ${fileName}`);
          }
        } else {
          // For compressed files, note that they exist
          files.push({ name: fileName, content: `[Arquivo comprimido - método ${compressionMethod}: ${fileName}]` });
        }
      }
      
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
    
    // Limit number of files processed
    if (files.length >= 30) {
      console.log('Reached file limit of 30');
      break;
    }
  }
  
  console.log(`Total files extracted from ZIP: ${files.length}`);
  return files;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { licitacaoId, analiseId, fileUrl, fileName, licitacaoData, clienteId } = await req.json();
    
    if (!licitacaoId) {
      return new Response(
        JSON.stringify({ error: 'ID da licitação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting analysis for licitacao: ${licitacaoId}, analiseId: ${analiseId || 'none'}`);
    
    // Update status to processing
    await supabase
      .from('licitacoes')
      .update({ analise_ia_status: 'processando' })
      .eq('id', licitacaoId);

    if (analiseId) {
      await supabase
        .from('licitacao_analises')
        .update({ status: 'processando' })
        .eq('id', analiseId);
    }

    let documentContent = '';
    let filesAnalyzed: string[] = [];
    
    // If file URL provided, download and extract content
    if (fileUrl) {
      console.log(`Downloading file: ${fileName || fileUrl}`);
      
      try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.status}`);
        }
        
        const arrayBuffer = await fileResponse.arrayBuffer();
        const contentType = fileResponse.headers.get('content-type') || '';
        const isZip = fileName?.toLowerCase().endsWith('.zip') || 
                      contentType.includes('zip');
        
        if (isZip) {
          console.log('Processing ZIP file...');
          const extractedFiles = await extractZipContents(arrayBuffer);
          
          if (extractedFiles.length > 0) {
            filesAnalyzed = extractedFiles.map(f => f.name);
            documentContent = extractedFiles
              .map(f => `\n\n=== ARQUIVO: ${f.name} ===\n${f.content}`)
              .join('\n');
            console.log(`Extracted ${extractedFiles.length} files from ZIP`);
          } else {
            documentContent = '[Não foi possível extrair o conteúdo do arquivo ZIP. Os arquivos podem estar comprimidos com um método não suportado.]';
            filesAnalyzed = [fileName || 'arquivo.zip'];
          }
        } else {
          const mimeType = contentType || 'application/octet-stream';
          documentContent = await extractTextFromFile(arrayBuffer, fileName || 'document', mimeType);
          filesAnalyzed = [fileName || 'document'];
          console.log(`Extracted content from single file: ${fileName}, length: ${documentContent.length}`);
        }
      } catch (fileError: unknown) {
        console.error('Error processing file:', fileError);
        documentContent = `[Erro ao processar arquivo: ${fileError instanceof Error ? fileError.message : 'Erro desconhecido'}]`;
        filesAnalyzed = [fileName || 'arquivo'];
      }
    }

    // Fetch client's IA prompt configuration for edital analysis
    let promptConfig = null;
    if (clienteId) {
      const { data } = await supabase
        .from('ia_prompts')
        .select('prompt_sistema, prompt_usuario, modelo, temperatura, max_tokens')
        .eq('cliente_id', clienteId)
        .eq('tipo', 'analise_edital')
        .eq('ativo', true)
        .limit(1)
        .single();
      promptConfig = data;
      if (promptConfig) {
        console.log(`Using custom IA config for client ${clienteId}, model: ${promptConfig.modelo}`);
      }
    }

    // Also fetch knowledge base entries for context enrichment
    let conhecimentoContext = '';
    if (clienteId) {
      const { data: conhecimentos } = await supabase
        .from('ia_conhecimento')
        .select('titulo, conteudo')
        .or(`cliente_id.eq.${clienteId},cliente_id.is.null`)
        .eq('ativo', true)
        .order('relevancia', { ascending: false })
        .limit(5);
      if (conhecimentos && conhecimentos.length > 0) {
        conhecimentoContext = '\n\nBASE DE CONHECIMENTO RELEVANTE:\n' + 
          conhecimentos.map(c => `- ${c.titulo}: ${c.conteudo.substring(0, 500)}`).join('\n');
      }
    }

    // Build the prompt for analysis
    const licitacaoInfo = licitacaoData ? `
INFORMAÇÕES DA LICITAÇÃO:
- Número: ${licitacaoData.numero || 'N/A'}
- Órgão: ${licitacaoData.orgao || 'N/A'}
- Objeto: ${licitacaoData.objeto || 'N/A'}
- Modalidade: ${licitacaoData.modalidade || 'N/A'}
- Valor Estimado: ${licitacaoData.valor_estimado ? `R$ ${licitacaoData.valor_estimado.toLocaleString('pt-BR')}` : 'N/A'}
- Data de Encerramento: ${licitacaoData.data_encerramento || 'N/A'}
` : '';

    const defaultSystemPrompt = `Você é um especialista em análise de licitações públicas brasileiras. 
Sua função é analisar editais e documentos de licitação, identificando:

1. **RESUMO EXECUTIVO**: Síntese do objeto e principais requisitos (3-4 parágrafos)

2. **REQUISITOS DE HABILITAÇÃO**:
   - Documentos de habilitação jurídica
   - Qualificação técnica exigida
   - Qualificação econômico-financeira
   - Regularidade fiscal e trabalhista

3. **CRITÉRIOS DE JULGAMENTO**:
   - Tipo de licitação (menor preço, técnica e preço, etc.)
   - Forma de julgamento
   - Critérios de desempate

4. **PRAZOS IMPORTANTES**:
   - Data/hora de abertura
   - Prazo para impugnação
   - Prazo para esclarecimentos
   - Prazo de entrega/execução

5. **OBRIGAÇÕES DO FORNECEDOR**:
   - Principais obrigações contratuais
   - Garantias exigidas
   - Penalidades previstas

6. **PONTOS DE ATENÇÃO**:
   - Riscos identificados
   - Cláusulas restritivas
   - Exigências específicas que merecem atenção

7. **RECOMENDAÇÕES**:
   - Sugestões para elaboração da proposta
   - Documentos que precisam ser providenciados
   - Pontos críticos a considerar

Seja objetivo e estruturado. Use bullet points e formatação clara.
Se não encontrar alguma informação, indique "Não identificado no documento".`;

    const systemPrompt = promptConfig?.prompt_sistema || defaultSystemPrompt;
    const modelo = promptConfig?.modelo || "google/gemini-2.5-flash";

    const defaultUserPrompt = `Analise a seguinte licitação:

${licitacaoInfo}

${documentContent ? `CONTEÚDO DO DOCUMENTO/EDITAL:
${documentContent.substring(0, 100000)}` : 'Nenhum documento anexado - analise com base nas informações da licitação.'}

${filesAnalyzed.length > 0 ? `\nARQUIVOS ANALISADOS: ${filesAnalyzed.join(', ')}` : ''}
${conhecimentoContext}

Forneça uma análise completa e estruturada conforme as categorias solicitadas.`;

    const userPrompt = promptConfig?.prompt_usuario 
      ? promptConfig.prompt_usuario
          .replace(/{licitacao_info}/g, licitacaoInfo)
          .replace(/{documento}/g, documentContent ? documentContent.substring(0, 100000) : '')
          .replace(/{arquivos}/g, filesAnalyzed.join(', '))
          .replace(/{conhecimento}/g, conhecimentoContext)
      : defaultUserPrompt;

    console.log(`Calling AI for analysis with model: ${modelo}...`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      if (response.status === 402) {
        const fallbackContent = `## 📋 Resumo Inteligente do Edital — Perguntas-Chave

**1. Qual é o objeto da licitação?**
${licitacaoData?.objeto || 'Objeto conforme termo de referência anexo ao edital.'}

**2. Qual a modalidade e o critério de julgamento?**
${licitacaoData?.modalidade || 'Modalidade não informada'} — critério usual de menor preço, conforme edital.

**3. Qual o valor estimado e a estratégia de preço?**
${licitacaoData?.valor_estimado ? `Valor estimado: R$ ${Number(licitacaoData.valor_estimado).toLocaleString('pt-BR')}.` : 'Valor estimado não identificado.'} Margem de lance sugerida para demonstração: 8% a 15% abaixo do estimado.

**4. Qual o prazo de entrega/execução?**
Prazo operacional a confirmar no termo de referência; para planejamento, considerar janela de até 30 dias após ordem de fornecimento/empenho.

**5. Quais documentos de habilitação precisam ser acompanhados?**
CND Federal, FGTS, INSS, CND Estadual, CND Municipal, CNDT, certidão de falência/recuperação judicial, atestados técnicos e balanço patrimonial.

**6. Há exigência de visita técnica, amostra ou catálogo?**
Não identificado automaticamente. Validar anexos, termo de referência e exigências específicas por item/lote.

**7. Quais são os principais riscos jurídicos e operacionais?**
- Prazos curtos para impugnação/esclarecimento.
- Exigências técnicas que podem restringir competitividade.
- Penalidades por atraso e obrigação de manter regularidade fiscal durante todo o contrato.

**8. A empresa deve participar?**
**PARTICIPAR COM ATENÇÃO** — análise demonstrativa indica aderência potencial, condicionada à conferência das CNDs, capacidade técnica e margem comercial.

> Resumo gerado automaticamente em modo demonstração porque os créditos de IA estão indisponíveis no momento.`;

        const analysisResult = {
          conteudo: fallbackContent,
          arquivos_analisados: filesAnalyzed,
          data_analise: new Date().toISOString(),
          modelo: 'demo-fallback',
          fallback: true,
          motivo_fallback: 'creditos_ia_insuficientes'
        };

        await supabase
          .from('licitacoes')
          .update({
            analise_ia: analysisResult,
            analise_ia_status: 'concluida',
            analise_ia_data: new Date().toISOString()
          })
          .eq('id', licitacaoId);

        if (analiseId) {
          await supabase
            .from('licitacao_analises')
            .update({
              status: 'concluida',
              resultado: analysisResult,
              arquivos_analisados: filesAnalyzed,
              erro: null
            })
            .eq('id', analiseId);
        }

        return new Response(
          JSON.stringify({
            success: true,
            fallback: true,
            demo: true,
            message: 'Análise demonstrativa gerada sem consumir créditos de IA.',
            analysis: analysisResult
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorMessage = response.status === 429 
        ? "Limite de requisições excedido. Tente novamente mais tarde."
        : response.status === 402 
        ? "Créditos de IA insuficientes."
        : "Erro na API de IA";
      
      // Update status to error
      await supabase
        .from('licitacoes')
        .update({ analise_ia_status: 'erro' })
        .eq('id', licitacaoId);
      
      if (analiseId) {
        await supabase
          .from('licitacao_analises')
          .update({ status: 'erro', erro: errorMessage })
          .eq('id', analiseId);
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const analysisContent = aiData.choices?.[0]?.message?.content;

    if (!analysisContent) {
      throw new Error("No analysis content returned from AI");
    }

    console.log('Analysis completed successfully, content length:', analysisContent.length);

    // Save the analysis result
    const analysisResult = {
      conteudo: analysisContent,
      arquivos_analisados: filesAnalyzed,
      data_analise: new Date().toISOString(),
      modelo: 'google/gemini-2.5-flash'
    };

    // Update licitacao with latest analysis
    const { error: updateError } = await supabase
      .from('licitacoes')
      .update({
        analise_ia: analysisResult,
        analise_ia_status: 'concluida',
        analise_ia_data: new Date().toISOString()
      })
      .eq('id', licitacaoId);

    if (updateError) {
      console.error('Error saving analysis to licitacao:', updateError);
    }

    // Update analysis history record if exists
    if (analiseId) {
      const { error: analiseUpdateError } = await supabase
        .from('licitacao_analises')
        .update({
          status: 'concluida',
          resultado: analysisResult,
          arquivos_analisados: filesAnalyzed
        })
        .eq('id', analiseId);

      if (analiseUpdateError) {
        console.error('Error saving analysis history:', analiseUpdateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-licitacao:', error);
    
    // Try to update status to error
    try {
      const reqBody = await req.clone().json();
      const { licitacaoId, analiseId } = reqBody;
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      if (licitacaoId) {
        await supabase
          .from('licitacoes')
          .update({ analise_ia_status: 'erro' })
          .eq('id', licitacaoId);
      }
      
      if (analiseId) {
        await supabase
          .from('licitacao_analises')
          .update({ 
            status: 'erro', 
            erro: error instanceof Error ? error.message : 'Erro desconhecido' 
          })
          .eq('id', analiseId);
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao analisar licitação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
