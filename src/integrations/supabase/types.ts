export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analise_estrategica_historico: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          periodo_fim: string
          periodo_inicio: string
          resultado: Json
          score_geral: number | null
          taxa_sucesso: number | null
          total_licitacoes: number | null
          valor_total_ganho: number | null
          valor_total_perdido: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          periodo_fim: string
          periodo_inicio: string
          resultado: Json
          score_geral?: number | null
          taxa_sucesso?: number | null
          total_licitacoes?: number | null
          valor_total_ganho?: number | null
          valor_total_perdido?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          resultado?: Json
          score_geral?: number | null
          taxa_sucesso?: number | null
          total_licitacoes?: number | null
          valor_total_ganho?: number | null
          valor_total_perdido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analise_estrategica_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          cliente_id: string | null
          created_at: string
          dados_antigos: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          cliente_id?: string | null
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          cliente_id?: string | null
          created_at?: string
          dados_antigos?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cliente_aprovacao_config: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          aprovador_id: string | null
          aprovadores_ids: string[] | null
          area: string | null
          ativo: boolean
          cliente_id: string
          created_at: string | null
          descricao: string | null
          email_area: string | null
          emails_area: string[] | null
          id: string
          nome_etapa: string
          ordem: number
          updated_at: string | null
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          aprovador_id?: string | null
          aprovadores_ids?: string[] | null
          area?: string | null
          ativo?: boolean
          cliente_id: string
          created_at?: string | null
          descricao?: string | null
          email_area?: string | null
          emails_area?: string[] | null
          id?: string
          nome_etapa: string
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          aprovador_id?: string | null
          aprovadores_ids?: string[] | null
          area?: string | null
          ativo?: boolean
          cliente_id?: string
          created_at?: string | null
          descricao?: string | null
          email_area?: string | null
          emails_area?: string[] | null
          id?: string
          nome_etapa?: string
          ordem?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_aprovacao_config_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_aprovacao_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_onboarding: {
        Row: {
          cliente_id: string
          concluido: boolean
          concluido_em: string | null
          created_at: string
          dados_coletados: Json | null
          etapa_atual: number
          etapas_concluidas: Json
          id: string
          iniciado_em: string
          iniciado_por: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          dados_coletados?: Json | null
          etapa_atual?: number
          etapas_concluidas?: Json
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          dados_coletados?: Json | null
          etapa_atual?: number
          etapas_concluidas?: Json
          id?: string
          iniciado_em?: string
          iniciado_por?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_onboarding_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_onboarding_iniciado_por_fkey"
            columns: ["iniciado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_regras: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          ativo: boolean
          campos: Json | null
          categoria: string
          cliente_id: string
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          ativo?: boolean
          campos?: Json | null
          categoria?: string
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          ativo?: boolean
          campos?: Json | null
          categoria?: string
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_regras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          concorrentes: string[] | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome: string
          palavras_negativas: string[] | null
          palavras_positivas: string[] | null
          telefone: string | null
          terceirizacao: boolean
          token: string | null
          updated_at: string
          webhook_ativo: boolean | null
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          concorrentes?: string[] | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          palavras_negativas?: string[] | null
          palavras_positivas?: string[] | null
          telefone?: string | null
          terceirizacao?: boolean
          token?: string | null
          updated_at?: string
          webhook_ativo?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          concorrentes?: string[] | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          palavras_negativas?: string[] | null
          palavras_positivas?: string[] | null
          telefone?: string | null
          terceirizacao?: boolean
          token?: string | null
          updated_at?: string
          webhook_ativo?: boolean | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      conlicitacao_config: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          filtro_descricao: string | null
          filtro_id: number | null
          id: string
          token: string
          ultimo_boletim_id: number | null
          ultimo_sync: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          filtro_descricao?: string | null
          filtro_id?: number | null
          id?: string
          token: string
          ultimo_boletim_id?: number | null
          ultimo_sync?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          filtro_descricao?: string | null
          filtro_id?: number | null
          id?: string
          token?: string
          ultimo_boletim_id?: number | null
          ultimo_sync?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conlicitacao_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conlicitacao_logs: {
        Row: {
          acompanhamentos_recebidos: number | null
          boletim_id: number | null
          cliente_id: string | null
          created_at: string
          dados_brutos: Json | null
          erro: string | null
          filtro_id: number | null
          id: string
          licitacoes_atualizadas: number | null
          licitacoes_novas: number | null
          licitacoes_recebidas: number | null
          sucesso: boolean
          tipo: string
        }
        Insert: {
          acompanhamentos_recebidos?: number | null
          boletim_id?: number | null
          cliente_id?: string | null
          created_at?: string
          dados_brutos?: Json | null
          erro?: string | null
          filtro_id?: number | null
          id?: string
          licitacoes_atualizadas?: number | null
          licitacoes_novas?: number | null
          licitacoes_recebidas?: number | null
          sucesso?: boolean
          tipo?: string
        }
        Update: {
          acompanhamentos_recebidos?: number | null
          boletim_id?: number | null
          cliente_id?: string | null
          created_at?: string
          dados_brutos?: Json | null
          erro?: string | null
          filtro_id?: number | null
          id?: string
          licitacoes_atualizadas?: number | null
          licitacoes_novas?: number | null
          licitacoes_recebidas?: number | null
          sucesso?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conlicitacao_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_aditivos: {
        Row: {
          arquivo_url: string | null
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          data_publicacao: string | null
          id: string
          justificativa: string | null
          nova_data_fim_vigencia: string | null
          novo_valor_contrato: number | null
          numero_termo: string
          prazo_adicional_dias: number | null
          status: string
          tipo: string
          updated_at: string
          valor_alteracao: number | null
        }
        Insert: {
          arquivo_url?: string | null
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_publicacao?: string | null
          id?: string
          justificativa?: string | null
          nova_data_fim_vigencia?: string | null
          novo_valor_contrato?: number | null
          numero_termo: string
          prazo_adicional_dias?: number | null
          status?: string
          tipo: string
          updated_at?: string
          valor_alteracao?: number | null
        }
        Update: {
          arquivo_url?: string | null
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_publicacao?: string | null
          id?: string
          justificativa?: string | null
          nova_data_fim_vigencia?: string | null
          novo_valor_contrato?: number | null
          numero_termo?: string
          prazo_adicional_dias?: number | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_alteracao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_aditivos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_apostilamentos: {
        Row: {
          arquivo_url: string | null
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_aplicacao: string | null
          id: string
          indice: string | null
          justificativa: string | null
          numero: string
          percentual: number | null
          periodo_referencia_fim: string | null
          periodo_referencia_inicio: string | null
          tipo: string
          updated_at: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          arquivo_url?: string | null
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_aplicacao?: string | null
          id?: string
          indice?: string | null
          justificativa?: string | null
          numero: string
          percentual?: number | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
          tipo?: string
          updated_at?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          arquivo_url?: string | null
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_aplicacao?: string | null
          id?: string
          indice?: string | null
          justificativa?: string | null
          numero?: string
          percentual?: number | null
          periodo_referencia_fim?: string | null
          periodo_referencia_inicio?: string | null
          tipo?: string
          updated_at?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_apostilamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_apostilamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_cronograma: {
        Row: {
          cliente_id: string
          contrato_id: string
          created_at: string
          descricao: string | null
          etapa: string
          id: string
          mes_referencia: string
          observacoes: string | null
          ordem: number
          percentual_previsto: number | null
          percentual_realizado: number | null
          status: string
          updated_at: string
          valor_previsto: number | null
          valor_realizado: number | null
        }
        Insert: {
          cliente_id: string
          contrato_id: string
          created_at?: string
          descricao?: string | null
          etapa: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          ordem?: number
          percentual_previsto?: number | null
          percentual_realizado?: number | null
          status?: string
          updated_at?: string
          valor_previsto?: number | null
          valor_realizado?: number | null
        }
        Update: {
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          descricao?: string | null
          etapa?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          ordem?: number
          percentual_previsto?: number | null
          percentual_realizado?: number | null
          status?: string
          updated_at?: string
          valor_previsto?: number | null
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_cronograma_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_cronograma_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_empenho_anexos: {
        Row: {
          arquivo_path: string
          arquivo_tamanho: number | null
          arquivo_tipo: string | null
          arquivo_url: string
          categoria: string | null
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          parent_id: string
          parent_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          arquivo_path: string
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url: string
          categoria?: string | null
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          parent_id: string
          parent_type: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          arquivo_path?: string
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url?: string
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          parent_id?: string
          parent_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      contrato_faturas: {
        Row: {
          arquivo_pdf_url: string | null
          arquivo_xml_url: string | null
          chave_acesso: string | null
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_atesto: string | null
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string | null
          empenho_id: string | null
          id: string
          medicao_id: string | null
          numero_nf: string
          observacoes: string | null
          outras_retencoes: number | null
          retencao_garantia: number | null
          retencao_inss: number | null
          retencao_ir: number | null
          retencao_iss: number | null
          retencao_pis_cofins_csll: number | null
          serie: string | null
          status: string
          updated_at: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          arquivo_pdf_url?: string | null
          arquivo_xml_url?: string | null
          chave_acesso?: string | null
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_atesto?: string | null
          data_emissao: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empenho_id?: string | null
          id?: string
          medicao_id?: string | null
          numero_nf: string
          observacoes?: string | null
          outras_retencoes?: number | null
          retencao_garantia?: number | null
          retencao_inss?: number | null
          retencao_ir?: number | null
          retencao_iss?: number | null
          retencao_pis_cofins_csll?: number | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Update: {
          arquivo_pdf_url?: string | null
          arquivo_xml_url?: string | null
          chave_acesso?: string | null
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_atesto?: string | null
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empenho_id?: string | null
          id?: string
          medicao_id?: string | null
          numero_nf?: string
          observacoes?: string | null
          outras_retencoes?: number | null
          retencao_garantia?: number | null
          retencao_inss?: number | null
          retencao_ir?: number | null
          retencao_iss?: number | null
          retencao_pis_cofins_csll?: number | null
          serie?: string | null
          status?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_faturas_empenho_id_fkey"
            columns: ["empenho_id"]
            isOneToOne: false
            referencedRelation: "empenhos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_faturas_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "contrato_medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_garantias: {
        Row: {
          arquivo_url: string | null
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_vigencia_fim: string | null
          data_vigencia_inicio: string | null
          emissor: string | null
          id: string
          numero_apolice: string | null
          observacoes: string | null
          percentual_contrato: number | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          emissor?: string | null
          id?: string
          numero_apolice?: string | null
          observacoes?: string | null
          percentual_contrato?: number | null
          status?: string
          tipo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          arquivo_url?: string | null
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          emissor?: string | null
          id?: string
          numero_apolice?: string | null
          observacoes?: string | null
          percentual_contrato?: number | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_garantias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_garantias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_medicoes: {
        Row: {
          arquivo_boletim_url: string | null
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_atesto: string | null
          data_envio: string | null
          fiscal_aprovador_id: string | null
          fiscal_aprovador_nome: string | null
          id: string
          motivo_glosa: string | null
          numero: string
          observacoes: string | null
          percentual_acumulado: number | null
          percentual_fisico: number | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          updated_at: string
          valor_glosa: number | null
          valor_medido: number
        }
        Insert: {
          arquivo_boletim_url?: string | null
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_atesto?: string | null
          data_envio?: string | null
          fiscal_aprovador_id?: string | null
          fiscal_aprovador_nome?: string | null
          id?: string
          motivo_glosa?: string | null
          numero: string
          observacoes?: string | null
          percentual_acumulado?: number | null
          percentual_fisico?: number | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          updated_at?: string
          valor_glosa?: number | null
          valor_medido?: number
        }
        Update: {
          arquivo_boletim_url?: string | null
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_atesto?: string | null
          data_envio?: string | null
          fiscal_aprovador_id?: string | null
          fiscal_aprovador_nome?: string | null
          id?: string
          motivo_glosa?: string | null
          numero?: string
          observacoes?: string | null
          percentual_acumulado?: number | null
          percentual_fisico?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          updated_at?: string
          valor_glosa?: number | null
          valor_medido?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_medicoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_medicoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_medicoes_fiscal_aprovador_id_fkey"
            columns: ["fiscal_aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_rescisoes: {
        Row: {
          cliente_id: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_rescisao: string
          documento_url: string | null
          id: string
          motivo: string | null
          multa_aplicada: number | null
          observacoes: string | null
          responsavel_orgao: string | null
          saldo_remanescente: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_rescisao: string
          documento_url?: string | null
          id?: string
          motivo?: string | null
          multa_aplicada?: number | null
          observacoes?: string | null
          responsavel_orgao?: string | null
          saldo_remanescente?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_rescisao?: string
          documento_url?: string | null
          id?: string
          motivo?: string | null
          multa_aplicada?: number | null
          observacoes?: string | null
          responsavel_orgao?: string | null
          saldo_remanescente?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_rescisoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_rescisoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_subcontratacoes: {
        Row: {
          cliente_id: string
          cnpj: string
          contrato_id: string
          created_at: string
          created_by: string | null
          data_aprovacao: string | null
          data_fim: string | null
          data_inicio: string | null
          documento_url: string | null
          id: string
          objeto_subcontratado: string | null
          observacoes: string | null
          percentual: number | null
          razao_social: string
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          cliente_id: string
          cnpj: string
          contrato_id: string
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          documento_url?: string | null
          id?: string
          objeto_subcontratado?: string | null
          observacoes?: string | null
          percentual?: number | null
          razao_social: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cliente_id?: string
          cnpj?: string
          contrato_id?: string
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          documento_url?: string | null
          id?: string
          objeto_subcontratado?: string | null
          observacoes?: string | null
          percentual?: number | null
          razao_social?: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_subcontratacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_subcontratacoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          data_fim_vigencia: string | null
          data_inicio_vigencia: string | null
          empresa_id: string | null
          fiscal_id: string | null
          fiscal_nome: string | null
          fornecedor: string | null
          gestor_id: string | null
          gestor_nome: string | null
          id: string
          indice_reajuste: string | null
          licitacao_id: string | null
          modalidade: string | null
          numero: string
          objeto: string | null
          observacoes: string | null
          orgao: string
          percentual_subcontratacao_max: number | null
          permite_subcontratacao: boolean
          status: string
          uf: string | null
          updated_at: string
          valor_atual: number
          valor_executado: number
          valor_original: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string | null
          empresa_id?: string | null
          fiscal_id?: string | null
          fiscal_nome?: string | null
          fornecedor?: string | null
          gestor_id?: string | null
          gestor_nome?: string | null
          id?: string
          indice_reajuste?: string | null
          licitacao_id?: string | null
          modalidade?: string | null
          numero: string
          objeto?: string | null
          observacoes?: string | null
          orgao: string
          percentual_subcontratacao_max?: number | null
          permite_subcontratacao?: boolean
          status?: string
          uf?: string | null
          updated_at?: string
          valor_atual?: number
          valor_executado?: number
          valor_original?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string | null
          empresa_id?: string | null
          fiscal_id?: string | null
          fiscal_nome?: string | null
          fornecedor?: string | null
          gestor_id?: string | null
          gestor_nome?: string | null
          id?: string
          indice_reajuste?: string | null
          licitacao_id?: string | null
          modalidade?: string | null
          numero?: string
          objeto?: string | null
          observacoes?: string | null
          orgao?: string
          percentual_subcontratacao_max?: number | null
          permite_subcontratacao?: boolean
          status?: string
          uf?: string | null
          updated_at?: string
          valor_atual?: number
          valor_executado?: number
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          cliente_id: string
          created_at: string
          data_source: string
          id: string
          navigation_path: string | null
          position: number
          size: string
          title: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_source: string
          id?: string
          navigation_path?: string | null
          position?: number
          size?: string
          title: string
          updated_at?: string
          widget_type: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_source?: string
          id?: string
          navigation_path?: string | null
          position?: number
          size?: string
          title?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      declaracoes_templates: {
        Row: {
          ativo: boolean
          cliente_id: string
          conteudo: string
          created_at: string
          id: string
          nome: string
          titulo: string
          updated_at: string
          variaveis: string[] | null
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          conteudo: string
          created_at?: string
          id?: string
          nome: string
          titulo: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          nome?: string
          titulo?: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "declaracoes_templates_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_envios: {
        Row: {
          assunto: string
          cliente_id: string
          conteudo_html: string
          created_at: string
          destinatario_email: string
          destinatario_nome: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          status: string
          template_id: string | null
        }
        Insert: {
          assunto: string
          cliente_id: string
          conteudo_html: string
          created_at?: string
          destinatario_email: string
          destinatario_nome?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          assunto?: string
          cliente_id?: string
          conteudo_html?: string
          created_at?: string
          destinatario_email?: string
          destinatario_nome?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_envios_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          assunto: string
          ativo: boolean
          cliente_id: string
          conteudo_html: string
          conteudo_texto: string | null
          created_at: string
          created_by: string | null
          cta_texto: string | null
          cta_url: string | null
          ctas: Json | null
          evento: string
          id: string
          nome: string
          updated_at: string
          variaveis: string[] | null
          workflow_etapa_id: string | null
        }
        Insert: {
          assunto: string
          ativo?: boolean
          cliente_id: string
          conteudo_html: string
          conteudo_texto?: string | null
          created_at?: string
          created_by?: string | null
          cta_texto?: string | null
          cta_url?: string | null
          ctas?: Json | null
          evento: string
          id?: string
          nome: string
          updated_at?: string
          variaveis?: string[] | null
          workflow_etapa_id?: string | null
        }
        Update: {
          assunto?: string
          ativo?: boolean
          cliente_id?: string
          conteudo_html?: string
          conteudo_texto?: string | null
          created_at?: string
          created_by?: string | null
          cta_texto?: string | null
          cta_url?: string | null
          ctas?: Json | null
          evento?: string
          id?: string
          nome?: string
          updated_at?: string
          variaveis?: string[] | null
          workflow_etapa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_workflow_etapa_id_fkey"
            columns: ["workflow_etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      empenhos: {
        Row: {
          cliente_id: string
          contrato_id: string | null
          created_at: string
          data_emissao: string
          data_vencimento: string | null
          empresa_id: string | null
          fonte_recurso: string | null
          id: string
          licitacao_id: string | null
          natureza_despesa: string | null
          numero: string
          objeto: string | null
          observacoes: string | null
          orgao_emissor: string
          programa_trabalho: string | null
          saldo_disponivel: number | null
          status: string
          tipo: string
          unidade_gestora: string | null
          updated_at: string
          valor_empenhado: number
          valor_utilizado: number
        }
        Insert: {
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_vencimento?: string | null
          empresa_id?: string | null
          fonte_recurso?: string | null
          id?: string
          licitacao_id?: string | null
          natureza_despesa?: string | null
          numero: string
          objeto?: string | null
          observacoes?: string | null
          orgao_emissor: string
          programa_trabalho?: string | null
          saldo_disponivel?: number | null
          status?: string
          tipo?: string
          unidade_gestora?: string | null
          updated_at?: string
          valor_empenhado?: number
          valor_utilizado?: number
        }
        Update: {
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_vencimento?: string | null
          empresa_id?: string | null
          fonte_recurso?: string | null
          id?: string
          licitacao_id?: string | null
          natureza_despesa?: string | null
          numero?: string
          objeto?: string | null
          observacoes?: string | null
          orgao_emissor?: string
          programa_trabalho?: string | null
          saldo_disponivel?: number | null
          status?: string
          tipo?: string
          unidade_gestora?: string | null
          updated_at?: string
          valor_empenhado?: number
          valor_utilizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "empenhos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empenhos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empenhos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empenhos_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_news_config: {
        Row: {
          ativo: boolean
          cnaes_prioritarios: string[] | null
          created_at: string
          empresa_id: string
          id: string
          palavras_chave: string[] | null
          tipos_evento: string[] | null
          ufs_monitoradas: string[] | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnaes_prioritarios?: string[] | null
          created_at?: string
          empresa_id: string
          id?: string
          palavras_chave?: string[] | null
          tipos_evento?: string[] | null
          ufs_monitoradas?: string[] | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnaes_prioritarios?: string[] | null
          created_at?: string
          empresa_id?: string
          id?: string
          palavras_chave?: string[] | null
          tipos_evento?: string[] | null
          ufs_monitoradas?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_news_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_news_events: {
        Row: {
          cidade: string | null
          cnae: string | null
          cnpj: string | null
          created_at: string
          data_publicacao: string | null
          descricao_noticia: string | null
          empresa_id: string
          entidades_extraidas: Json | null
          fonte: string | null
          id: string
          palavras_chave_encontradas: string[] | null
          razao_social: string | null
          score_relevancia: number
          tipo_evento: string
          titulo_noticia: string
          uf: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          data_publicacao?: string | null
          descricao_noticia?: string | null
          empresa_id: string
          entidades_extraidas?: Json | null
          fonte?: string | null
          id?: string
          palavras_chave_encontradas?: string[] | null
          razao_social?: string | null
          score_relevancia?: number
          tipo_evento?: string
          titulo_noticia: string
          uf?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          data_publicacao?: string | null
          descricao_noticia?: string | null
          empresa_id?: string
          entidades_extraidas?: Json | null
          fonte?: string | null
          id?: string
          palavras_chave_encontradas?: string[] | null
          razao_social?: string | null
          score_relevancia?: number
          tipo_evento?: string
          titulo_noticia?: string
          uf?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_news_events_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string
          cnpj: string | null
          complemento: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id: string
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_conhecimento: {
        Row: {
          assunto: string
          ativo: boolean
          categoria: string
          cliente_id: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          fonte: string | null
          id: string
          relevancia: number | null
          tags: string[] | null
          titulo: string
          updated_at: string
          uso_count: number | null
        }
        Insert: {
          assunto: string
          ativo?: boolean
          categoria: string
          cliente_id?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          fonte?: string | null
          id?: string
          relevancia?: number | null
          tags?: string[] | null
          titulo: string
          updated_at?: string
          uso_count?: number | null
        }
        Update: {
          assunto?: string
          ativo?: boolean
          categoria?: string
          cliente_id?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          fonte?: string | null
          id?: string
          relevancia?: number | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          uso_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_conhecimento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_execucoes: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          entrada: string
          erro: string | null
          id: string
          prompt_id: string | null
          saida: string | null
          sucesso: boolean | null
          tempo_execucao_ms: number | null
          tipo: string
          tokens_entrada: number | null
          tokens_saida: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          entrada: string
          erro?: string | null
          id?: string
          prompt_id?: string | null
          saida?: string | null
          sucesso?: boolean | null
          tempo_execucao_ms?: number | null
          tipo: string
          tokens_entrada?: number | null
          tokens_saida?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          entrada?: string
          erro?: string | null
          id?: string
          prompt_id?: string | null
          saida?: string | null
          sucesso?: boolean | null
          tempo_execucao_ms?: number | null
          tipo?: string
          tokens_entrada?: number | null
          tokens_saida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_execucoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_execucoes_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ia_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_prompts: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          max_tokens: number | null
          modelo: string | null
          nome: string
          prompt_sistema: string
          prompt_usuario: string | null
          temperatura: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          max_tokens?: number | null
          modelo?: string | null
          nome: string
          prompt_sistema: string
          prompt_usuario?: string | null
          temperatura?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          max_tokens?: number | null
          modelo?: string | null
          nome?: string
          prompt_sistema?: string
          prompt_usuario?: string | null
          temperatura?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_prompts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      idocumentei_config: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          id: string
          ultimo_sync: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          id?: string
          ultimo_sync?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          id?: string
          ultimo_sync?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idocumentei_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      idocumentei_documentos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          dados_raw: Json | null
          data_emissao: string | null
          data_validade: string | null
          empresa_id: string
          id: string
          idocumentei_empresa_id: string
          nome: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          dados_raw?: Json | null
          data_emissao?: string | null
          data_validade?: string | null
          empresa_id: string
          id?: string
          idocumentei_empresa_id: string
          nome: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          dados_raw?: Json | null
          data_emissao?: string | null
          data_validade?: string | null
          empresa_id?: string
          id?: string
          idocumentei_empresa_id?: string
          nome?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idocumentei_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      idocumentei_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          idocumentei_id: string
          status_sync: string
          ultimo_processamento: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          idocumentei_id: string
          status_sync?: string
          ultimo_processamento?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          idocumentei_id?: string
          status_sync?: string
          ultimo_processamento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idocumentei_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes: {
        Row: {
          created_at: string
          erros: Json | null
          id: string
          importado_por: string
          nome_arquivo: string
          registros_erro: number | null
          registros_sucesso: number | null
          status: string
          tipo: string
          total_registros: number | null
        }
        Insert: {
          created_at?: string
          erros?: Json | null
          id?: string
          importado_por: string
          nome_arquivo: string
          registros_erro?: number | null
          registros_sucesso?: number | null
          status?: string
          tipo: string
          total_registros?: number | null
        }
        Update: {
          created_at?: string
          erros?: Json | null
          id?: string
          importado_por?: string
          nome_arquivo?: string
          registros_erro?: number | null
          registros_sucesso?: number | null
          status?: string
          tipo?: string
          total_registros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_mensageria: {
        Row: {
          api_key_encrypted: string | null
          ativo: boolean
          cliente_id: string
          configuracoes: Json | null
          created_at: string
          email_remetente: string | null
          id: string
          numero_telefone: string | null
          provedor: string | null
          tipo: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          ativo?: boolean
          cliente_id: string
          configuracoes?: Json | null
          created_at?: string
          email_remetente?: string | null
          id?: string
          numero_telefone?: string | null
          provedor?: string | null
          tipo: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          ativo?: boolean
          cliente_id?: string
          configuracoes?: Json | null
          created_at?: string
          email_remetente?: string | null
          id?: string
          numero_telefone?: string | null
          provedor?: string | null
          tipo?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracao_mensageria_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ipesquisei_dados: {
        Row: {
          cliente_id: string
          cnpj: string
          created_at: string
          id: string
          nome_entidade: string | null
          tipo_entidade: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          cnpj: string
          created_at?: string
          id?: string
          nome_entidade?: string | null
          tipo_entidade?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          cnpj?: string
          created_at?: string
          id?: string
          nome_entidade?: string | null
          tipo_entidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ipesquisei_dados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ipesquisei_licitacoes: {
        Row: {
          cidade: string | null
          created_at: string
          dados_completos: Json | null
          data_abertura: string | null
          data_resultado: string | null
          ganhou: boolean | null
          id: string
          ipesquisei_dado_id: string
          ipesquisei_id: string | null
          modalidade: string | null
          numero: string | null
          objeto: string | null
          orgao: string | null
          uf: string | null
          updated_at: string
          valor_estimado: number | null
          valor_vencedor: number | null
          vencedor_cnpj: string | null
          vencedor_nome: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          dados_completos?: Json | null
          data_abertura?: string | null
          data_resultado?: string | null
          ganhou?: boolean | null
          id?: string
          ipesquisei_dado_id: string
          ipesquisei_id?: string | null
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          orgao?: string | null
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
          valor_vencedor?: number | null
          vencedor_cnpj?: string | null
          vencedor_nome?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          dados_completos?: Json | null
          data_abertura?: string | null
          data_resultado?: string | null
          ganhou?: boolean | null
          id?: string
          ipesquisei_dado_id?: string
          ipesquisei_id?: string | null
          modalidade?: string | null
          numero?: string | null
          objeto?: string | null
          orgao?: string | null
          uf?: string | null
          updated_at?: string
          valor_estimado?: number | null
          valor_vencedor?: number | null
          vencedor_cnpj?: string | null
          vencedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ipesquisei_licitacoes_ipesquisei_dado_id_fkey"
            columns: ["ipesquisei_dado_id"]
            isOneToOne: false
            referencedRelation: "ipesquisei_dados"
            referencedColumns: ["id"]
          },
        ]
      }
      ipesquisei_sancoes: {
        Row: {
          created_at: string
          dados_completos: Json | null
          data_fim: string | null
          data_inicio: string | null
          fundamentacao: string | null
          id: string
          ipesquisei_dado_id: string
          orgao_sancionador: string | null
          tipo_cadastro: string | null
          tipo_sancao: string | null
          updated_at: string
          vigente: boolean | null
        }
        Insert: {
          created_at?: string
          dados_completos?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          fundamentacao?: string | null
          id?: string
          ipesquisei_dado_id: string
          orgao_sancionador?: string | null
          tipo_cadastro?: string | null
          tipo_sancao?: string | null
          updated_at?: string
          vigente?: boolean | null
        }
        Update: {
          created_at?: string
          dados_completos?: Json | null
          data_fim?: string | null
          data_inicio?: string | null
          fundamentacao?: string | null
          id?: string
          ipesquisei_dado_id?: string
          orgao_sancionador?: string | null
          tipo_cadastro?: string | null
          tipo_sancao?: string | null
          updated_at?: string
          vigente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ipesquisei_sancoes_ipesquisei_dado_id_fkey"
            columns: ["ipesquisei_dado_id"]
            isOneToOne: false
            referencedRelation: "ipesquisei_dados"
            referencedColumns: ["id"]
          },
        ]
      }
      ipesquisei_sync_logs: {
        Row: {
          cliente_id: string
          created_at: string
          dados_brutos: Json | null
          erro: string | null
          id: string
          sucesso: boolean
          tipo: string
          total_licitacoes: number | null
          total_sancoes: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dados_brutos?: Json | null
          erro?: string | null
          id?: string
          sucesso?: boolean
          tipo: string
          total_licitacoes?: number | null
          total_sancoes?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dados_brutos?: Json | null
          erro?: string | null
          id?: string
          sucesso?: boolean
          tipo?: string
          total_licitacoes?: number | null
          total_sancoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ipesquisei_sync_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_analises: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          arquivos_analisados: string[] | null
          created_at: string
          created_by: string | null
          erro: string | null
          id: string
          licitacao_id: string
          resultado: Json | null
          status: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          arquivos_analisados?: string[] | null
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          licitacao_id: string
          resultado?: Json | null
          status?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          arquivos_analisados?: string[] | null
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          licitacao_id?: string
          resultado?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_analises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_analises_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_aprovacoes: {
        Row: {
          aprovacao_config_id: string
          aprovador_id: string | null
          comentario: string | null
          created_at: string
          data_resposta: string | null
          id: string
          licitacao_etapa_id: string
          status: string
        }
        Insert: {
          aprovacao_config_id: string
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          data_resposta?: string | null
          id?: string
          licitacao_etapa_id: string
          status?: string
        }
        Update: {
          aprovacao_config_id?: string
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string
          data_resposta?: string | null
          id?: string
          licitacao_etapa_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_aprovacoes_aprovacao_config_id_fkey"
            columns: ["aprovacao_config_id"]
            isOneToOne: false
            referencedRelation: "workflow_aprovacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_aprovacoes_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_aprovacoes_licitacao_etapa_id_fkey"
            columns: ["licitacao_etapa_id"]
            isOneToOne: false
            referencedRelation: "licitacao_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_campos_valores: {
        Row: {
          arquivo_url: string | null
          campo_id: string
          created_at: string
          id: string
          licitacao_etapa_id: string
          updated_at: string
          valor: string | null
          valor_calculado: string | null
        }
        Insert: {
          arquivo_url?: string | null
          campo_id: string
          created_at?: string
          id?: string
          licitacao_etapa_id: string
          updated_at?: string
          valor?: string | null
          valor_calculado?: string | null
        }
        Update: {
          arquivo_url?: string | null
          campo_id?: string
          created_at?: string
          id?: string
          licitacao_etapa_id?: string
          updated_at?: string
          valor?: string | null
          valor_calculado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_campos_valores_campo_id_fkey"
            columns: ["campo_id"]
            isOneToOne: false
            referencedRelation: "workflow_campos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_campos_valores_licitacao_etapa_id_fkey"
            columns: ["licitacao_etapa_id"]
            isOneToOne: false
            referencedRelation: "licitacao_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_chat: {
        Row: {
          created_at: string
          created_by: string | null
          favorita: boolean | null
          id: string
          licitacao_id: string
          pergunta: string
          resposta: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          favorita?: boolean | null
          id?: string
          licitacao_id: string
          pergunta: string
          resposta?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          favorita?: boolean | null
          id?: string
          licitacao_id?: string
          pergunta?: string
          resposta?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_chat_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_chat_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_concorrentes: {
        Row: {
          cliente_id: string
          created_at: string
          ganhou: boolean | null
          id: string
          licitacao_id: string
          nome_concorrente: string
          observacoes: string | null
          participou: boolean
          updated_at: string
          valor_proposta: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          ganhou?: boolean | null
          id?: string
          licitacao_id: string
          nome_concorrente: string
          observacoes?: string | null
          participou?: boolean
          updated_at?: string
          valor_proposta?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          ganhou?: boolean | null
          id?: string
          licitacao_id?: string
          nome_concorrente?: string
          observacoes?: string | null
          participou?: boolean
          updated_at?: string
          valor_proposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_concorrentes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_concorrentes_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_documentos_checklist: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          categoria: string
          created_at: string
          data_validade: string | null
          descricao: string | null
          id: string
          licitacao_id: string
          nome: string
          obrigatorio: boolean
          status: string
          updated_at: string
          verificado_em: string | null
          verificado_por: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          data_validade?: string | null
          descricao?: string | null
          id?: string
          licitacao_id: string
          nome: string
          obrigatorio?: boolean
          status?: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          created_at?: string
          data_validade?: string | null
          descricao?: string | null
          id?: string
          licitacao_id?: string
          nome?: string
          obrigatorio?: boolean
          status?: string
          updated_at?: string
          verificado_em?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_documentos_checklist_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_documentos_checklist_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_etapa_execucao: {
        Row: {
          created_at: string
          dados: Json | null
          data_conclusao: string | null
          data_inicio: string | null
          etapa_codigo: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id: string
          licitacao_id: string
          observacoes: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["etapa_licitacao_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          data_conclusao?: string | null
          data_inicio?: string | null
          etapa_codigo: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id?: string
          licitacao_id: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["etapa_licitacao_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados?: Json | null
          data_conclusao?: string | null
          data_inicio?: string | null
          etapa_codigo?: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id?: string
          licitacao_id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["etapa_licitacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_etapa_execucao_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_etapa_execucao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_etapas: {
        Row: {
          created_at: string
          data_conclusao: string | null
          data_inicio: string | null
          etapa_id: string
          id: string
          licitacao_id: string
          observacoes: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          etapa_id: string
          id?: string
          licitacao_id: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          etapa_id?: string
          id?: string
          licitacao_id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_etapas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_etapas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_etapas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_etapas_config: {
        Row: {
          ativo: boolean
          cliente_id: string
          configuracoes: Json | null
          created_at: string
          etapa_codigo: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          configuracoes?: Json | null
          created_at?: string
          etapa_codigo: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          configuracoes?: Json | null
          created_at?: string
          etapa_codigo?: Database["public"]["Enums"]["etapa_licitacao_codigo"]
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_etapas_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_fluxo_aprovacao: {
        Row: {
          aprovador_id: string | null
          comentario: string | null
          created_at: string | null
          created_by: string | null
          data_resposta: string | null
          descricao: string | null
          id: string
          licitacao_id: string
          nome_etapa: string
          ordem: number
          status: string
          updated_at: string | null
        }
        Insert: {
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          licitacao_id: string
          nome_etapa: string
          ordem?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          aprovador_id?: string | null
          comentario?: string | null
          created_at?: string | null
          created_by?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          licitacao_id?: string
          nome_etapa?: string
          ordem?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_fluxo_aprovacao_aprovador_id_fkey"
            columns: ["aprovador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_fluxo_aprovacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_fluxo_aprovacao_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_mensagens_internas: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          autor_id: string
          conteudo: string
          created_at: string
          id: string
          licitacao_id: string
          mencoes: string[] | null
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          autor_id: string
          conteudo: string
          created_at?: string
          id?: string
          licitacao_id: string
          mencoes?: string[] | null
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          autor_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          licitacao_id?: string
          mencoes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_mensagens_internas_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_mensagens_internas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_monitoramento_mensagens: {
        Row: {
          autor_nome: string | null
          autor_tipo: string
          created_at: string
          data_mensagem: string
          id: string
          licitacao_id: string
          mensagem: string
          metadata: Json | null
          origem: string
        }
        Insert: {
          autor_nome?: string | null
          autor_tipo?: string
          created_at?: string
          data_mensagem?: string
          id?: string
          licitacao_id: string
          mensagem: string
          metadata?: Json | null
          origem?: string
        }
        Update: {
          autor_nome?: string | null
          autor_tipo?: string
          created_at?: string
          data_mensagem?: string
          id?: string
          licitacao_id?: string
          mensagem?: string
          metadata?: Json | null
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_monitoramento_mensagens_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_pecas: {
        Row: {
          cliente_id: string
          conteudo_gerado: string | null
          created_at: string
          created_by: string | null
          descricao_solicitacao: string
          erro: string | null
          id: string
          licitacao_id: string
          modelo_ia: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          conteudo_gerado?: string | null
          created_at?: string
          created_by?: string | null
          descricao_solicitacao: string
          erro?: string | null
          id?: string
          licitacao_id: string
          modelo_ia?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          conteudo_gerado?: string | null
          created_at?: string
          created_by?: string | null
          descricao_solicitacao?: string
          erro?: string | null
          id?: string
          licitacao_id?: string
          modelo_ia?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_pecas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_pecas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_pecas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_produtos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          item_numero: number
          licitacao_id: string
          marca: string | null
          modelo: string | null
          observacoes: string | null
          produto_id: string | null
          quantidade: number
          unidade: string
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          item_numero: number
          licitacao_id: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          item_numero?: number
          licitacao_id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_produtos_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_resultado_itens: {
        Row: {
          created_at: string
          descricao: string
          id: string
          item_numero: number
          licitacao_id: string
          observacoes: string | null
          resultado: string
          updated_at: string
          valor_proposta: number | null
          valor_vencedor: number | null
          vencedor_nome: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          item_numero: number
          licitacao_id: string
          observacoes?: string | null
          resultado?: string
          updated_at?: string
          valor_proposta?: number | null
          valor_vencedor?: number | null
          vencedor_nome?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          item_numero?: number
          licitacao_id?: string
          observacoes?: string | null
          resultado?: string
          updated_at?: string
          valor_proposta?: number | null
          valor_vencedor?: number | null
          vencedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_resultado_itens_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_status_regras: {
        Row: {
          ativo: boolean
          cliente_id: string
          condicao_dias_apos_encerramento: number | null
          condicao_dias_sem_analise: number | null
          condicao_etapa_finalizada: boolean | null
          condicao_etapa_workflow_id: string | null
          condicao_sem_analise_ia: boolean | null
          condicao_valor_maximo: number | null
          condicao_valor_minimo: number | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          status_destino: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          condicao_dias_apos_encerramento?: number | null
          condicao_dias_sem_analise?: number | null
          condicao_etapa_finalizada?: boolean | null
          condicao_etapa_workflow_id?: string | null
          condicao_sem_analise_ia?: boolean | null
          condicao_valor_maximo?: number | null
          condicao_valor_minimo?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          status_destino: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          condicao_dias_apos_encerramento?: number | null
          condicao_dias_sem_analise?: number | null
          condicao_etapa_finalizada?: boolean | null
          condicao_etapa_workflow_id?: string | null
          condicao_sem_analise_ia?: boolean | null
          condicao_valor_maximo?: number | null
          condicao_valor_minimo?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          status_destino?: string
          updated_at?: string
        }
        Relationships: []
      }
      licitacao_versoes: {
        Row: {
          boletim_id: number | null
          campos_alterados: Json | null
          conlicitacao_id: number | null
          created_at: string
          id: string
          licitacao_id: string
          situacao_conlicitacao: string | null
          snapshot: Json
          total_mudancas: number | null
          versao: number
        }
        Insert: {
          boletim_id?: number | null
          campos_alterados?: Json | null
          conlicitacao_id?: number | null
          created_at?: string
          id?: string
          licitacao_id: string
          situacao_conlicitacao?: string | null
          snapshot: Json
          total_mudancas?: number | null
          versao: number
        }
        Update: {
          boletim_id?: number | null
          campos_alterados?: Json | null
          conlicitacao_id?: number | null
          created_at?: string
          id?: string
          licitacao_id?: string
          situacao_conlicitacao?: string | null
          snapshot?: Json
          total_mudancas?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_versoes_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_workflows: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_workflows_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes: {
        Row: {
          analise_ia: Json | null
          analise_ia_data: string | null
          analise_ia_status: string | null
          boletim_id: number | null
          cidade_orgao: string | null
          cliente_id: string
          conlicitacao_id: number | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          data_documento: string | null
          data_encerramento: string | null
          data_prazo: string | null
          data_retirada: string | null
          data_visita: string | null
          edital_url: string | null
          empresa_id: string | null
          endereco_orgao: string | null
          etapa_atual_codigo:
            | Database["public"]["Enums"]["etapa_licitacao_codigo"]
            | null
          etapa_atual_id: string | null
          filtro_id: number | null
          id: string
          modalidade: string | null
          numero: string
          objeto: string
          observacoes: string | null
          orgao: string
          portal: string | null
          preco_edital: number | null
          processo: string | null
          relevancia: string | null
          site_orgao: string | null
          situacao_conlicitacao: string | null
          status: string
          telefone_orgao: string | null
          uasg: string | null
          uf_orgao: string | null
          ultima_atualizacao_conlicitacao: string | null
          ultimas_mudancas: Json | null
          updated_at: string
          valor_estimado: number | null
          versao_atual: number
          workflow_id: string
        }
        Insert: {
          analise_ia?: Json | null
          analise_ia_data?: string | null
          analise_ia_status?: string | null
          boletim_id?: number | null
          cidade_orgao?: string | null
          cliente_id: string
          conlicitacao_id?: number | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_documento?: string | null
          data_encerramento?: string | null
          data_prazo?: string | null
          data_retirada?: string | null
          data_visita?: string | null
          edital_url?: string | null
          empresa_id?: string | null
          endereco_orgao?: string | null
          etapa_atual_codigo?:
            | Database["public"]["Enums"]["etapa_licitacao_codigo"]
            | null
          etapa_atual_id?: string | null
          filtro_id?: number | null
          id?: string
          modalidade?: string | null
          numero: string
          objeto: string
          observacoes?: string | null
          orgao: string
          portal?: string | null
          preco_edital?: number | null
          processo?: string | null
          relevancia?: string | null
          site_orgao?: string | null
          situacao_conlicitacao?: string | null
          status?: string
          telefone_orgao?: string | null
          uasg?: string | null
          uf_orgao?: string | null
          ultima_atualizacao_conlicitacao?: string | null
          ultimas_mudancas?: Json | null
          updated_at?: string
          valor_estimado?: number | null
          versao_atual?: number
          workflow_id: string
        }
        Update: {
          analise_ia?: Json | null
          analise_ia_data?: string | null
          analise_ia_status?: string | null
          boletim_id?: number | null
          cidade_orgao?: string | null
          cliente_id?: string
          conlicitacao_id?: number | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_documento?: string | null
          data_encerramento?: string | null
          data_prazo?: string | null
          data_retirada?: string | null
          data_visita?: string | null
          edital_url?: string | null
          empresa_id?: string | null
          endereco_orgao?: string | null
          etapa_atual_codigo?:
            | Database["public"]["Enums"]["etapa_licitacao_codigo"]
            | null
          etapa_atual_id?: string | null
          filtro_id?: number | null
          id?: string
          modalidade?: string | null
          numero?: string
          objeto?: string
          observacoes?: string | null
          orgao?: string
          portal?: string | null
          preco_edital?: number | null
          processo?: string | null
          relevancia?: string | null
          site_orgao?: string | null
          situacao_conlicitacao?: string | null
          status?: string
          telefone_orgao?: string | null
          uasg?: string | null
          uf_orgao?: string | null
          ultima_atualizacao_conlicitacao?: string | null
          ultimas_mudancas?: Json | null
          updated_at?: string
          valor_estimado?: number | null
          versao_atual?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_etapa_atual_id_fkey"
            columns: ["etapa_atual_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "licitacao_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      mensageria_canais: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensageria_canais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensageria_canais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensageria_membros: {
        Row: {
          canal_id: string
          created_at: string
          id: string
          notificacoes_ativas: boolean
          role: string
          user_id: string
        }
        Insert: {
          canal_id: string
          created_at?: string
          id?: string
          notificacoes_ativas?: boolean
          role?: string
          user_id: string
        }
        Update: {
          canal_id?: string
          created_at?: string
          id?: string
          notificacoes_ativas?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensageria_membros_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "mensageria_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensageria_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensageria_mensagens: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          autor_id: string | null
          canal_id: string
          conteudo: string
          created_at: string
          editado: boolean
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          autor_id?: string | null
          canal_id: string
          conteudo: string
          created_at?: string
          editado?: boolean
          id?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          autor_id?: string | null
          canal_id?: string
          conteudo?: string
          created_at?: string
          editado?: boolean
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensageria_mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensageria_mensagens_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "mensageria_canais"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_agendamentos: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          empresa_id: string
          horario_envio: string
          id: string
          ultimo_envio_em: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empresa_id: string
          horario_envio?: string
          id?: string
          ultimo_envio_em?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          empresa_id?: string
          horario_envio?: string
          id?: string
          ultimo_envio_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_agendamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_envios: {
        Row: {
          created_at: string
          empresa_id: string
          enviado_em: string | null
          enviado_por: string | null
          erro_mensagem: string | null
          id: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_destinatarios: number
          total_noticias: number
        }
        Insert: {
          created_at?: string
          empresa_id: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
          total_destinatarios?: number
          total_noticias?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          total_destinatarios?: number
          total_noticias?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_envios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencias_kanban_config: {
        Row: {
          ativo: boolean | null
          cliente_id: string
          cor: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          filtro_campo: string | null
          filtro_data_campo: string | null
          filtro_data_fim_offset_dias: number | null
          filtro_data_inicio_offset_dias: number | null
          filtro_periodo_dias: number | null
          filtro_responsavel_atual: boolean | null
          filtro_status: string | null
          filtro_valor: string | null
          filtros_avancados: Json | null
          fonte_dados: string
          icone: string | null
          id: string
          ordem: number | null
          secao: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cliente_id: string
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          filtro_campo?: string | null
          filtro_data_campo?: string | null
          filtro_data_fim_offset_dias?: number | null
          filtro_data_inicio_offset_dias?: number | null
          filtro_periodo_dias?: number | null
          filtro_responsavel_atual?: boolean | null
          filtro_status?: string | null
          filtro_valor?: string | null
          filtros_avancados?: Json | null
          fonte_dados?: string
          icone?: string | null
          id?: string
          ordem?: number | null
          secao?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cliente_id?: string
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          filtro_campo?: string | null
          filtro_data_campo?: string | null
          filtro_data_fim_offset_dias?: number | null
          filtro_data_inicio_offset_dias?: number | null
          filtro_periodo_dias?: number | null
          filtro_responsavel_atual?: boolean | null
          filtro_status?: string | null
          filtro_valor?: string | null
          filtros_avancados?: Json | null
          fonte_dados?: string
          icone?: string | null
          id?: string
          ordem?: number | null
          secao?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_kanban_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_kanban_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_permissoes: {
        Row: {
          created_at: string
          id: string
          modulo: string
          perfil_id: string
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_visualizar: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          modulo: string
          perfil_id: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          modulo?: string
          perfil_id?: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_acesso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          cliente_id: string
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          preco: number | null
          tipo: string
          unidade: string | null
          unidade_negocio: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          cliente_id: string
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco?: number | null
          tipo?: string
          unidade?: string | null
          unidade_negocio?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          cliente_id?: string
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco?: number | null
          tipo?: string
          unidade?: string | null
          unidade_negocio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          cliente_id: string | null
          created_at: string
          id: string
          nome: string
          perfil_acesso_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string
          id: string
          nome?: string
          perfil_acesso_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          perfil_acesso_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_config: {
        Row: {
          ativo: boolean
          campos_obrigatorios: string[] | null
          casas_decimais: number | null
          cliente_id: string
          created_at: string
          formato_preco: string | null
          id: string
          incluir_assinatura: boolean | null
          incluir_logo: boolean | null
          modelo_cabecalho: string | null
          modelo_rodape: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campos_obrigatorios?: string[] | null
          casas_decimais?: number | null
          cliente_id: string
          created_at?: string
          formato_preco?: string | null
          id?: string
          incluir_assinatura?: boolean | null
          incluir_logo?: boolean | null
          modelo_cabecalho?: string | null
          modelo_rodape?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campos_obrigatorios?: string[] | null
          casas_decimais?: number | null
          cliente_id?: string
          created_at?: string
          formato_preco?: string | null
          id?: string
          incluir_assinatura?: boolean | null
          incluir_logo?: boolean | null
          modelo_cabecalho?: string | null
          modelo_rodape?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_config_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          cliente_id: string | null
          created_at: string
          criado_por: string
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          licitacao_id: string | null
          prioridade: string
          responsaveis_ids: string[]
          responsavel_id: string | null
          status: string
          tags: string[] | null
          taskgi_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          criado_por: string
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          licitacao_id?: string | null
          prioridade?: string
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          taskgi_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          licitacao_id?: string | null
          prioridade?: string
          responsaveis_ids?: string[]
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          taskgi_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mensagens: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          id: string
          is_ia: boolean
          is_interno: boolean
          sugestao_ia: string | null
          ticket_id: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string
          id?: string
          is_ia?: boolean
          is_interno?: boolean
          sugestao_ia?: string | null
          ticket_id: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          is_ia?: boolean
          is_interno?: boolean
          sugestao_ia?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          atendente_id: string | null
          categoria: Database["public"]["Enums"]["ticket_categoria"]
          cliente_id: string
          correcao_aplicada: boolean | null
          correcao_aplicada_por: string | null
          correcao_data: string | null
          correcao_descricao: string | null
          correcao_link: string | null
          created_at: string
          criado_por: string
          descricao: string
          id: string
          prioridade: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_em: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          atendente_id?: string | null
          categoria?: Database["public"]["Enums"]["ticket_categoria"]
          cliente_id: string
          correcao_aplicada?: boolean | null
          correcao_aplicada_por?: string | null
          correcao_data?: string | null
          correcao_descricao?: string | null
          correcao_link?: string | null
          created_at?: string
          criado_por: string
          descricao: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          atendente_id?: string | null
          categoria?: Database["public"]["Enums"]["ticket_categoria"]
          cliente_id?: string
          correcao_aplicada?: boolean | null
          correcao_aplicada_por?: string | null
          correcao_data?: string | null
          correcao_descricao?: string | null
          correcao_link?: string | null
          created_at?: string
          criado_por?: string
          descricao?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_correcao_aplicada_por_fkey"
            columns: ["correcao_aplicada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          cliente_id: string
          created_at: string
          erro: string | null
          evento: string
          id: string
          payload: Json | null
          response_body: string | null
          status_code: number | null
          sucesso: boolean
          tempo_resposta_ms: number | null
          ticket_id: string | null
          webhook_url: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          erro?: string | null
          evento: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          sucesso?: boolean
          tempo_resposta_ms?: number | null
          ticket_id?: string | null
          webhook_url: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          erro?: string | null
          evento?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          sucesso?: boolean
          tempo_resposta_ms?: number | null
          ticket_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_aprovacoes: {
        Row: {
          aprovadores_minimos: number
          created_at: string
          etapa_id: string
          id: string
          nome: string
          ordem: number
          tipo: string
        }
        Insert: {
          aprovadores_minimos?: number
          created_at?: string
          etapa_id: string
          id?: string
          nome: string
          ordem?: number
          tipo?: string
        }
        Update: {
          aprovadores_minimos?: number
          created_at?: string
          etapa_id?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_aprovacoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_aprovadores: {
        Row: {
          aprovacao_id: string
          created_at: string
          id: string
          ordem: number
          perfil_id: string | null
          usuario_id: string | null
        }
        Insert: {
          aprovacao_id: string
          created_at?: string
          id?: string
          ordem?: number
          perfil_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          aprovacao_id?: string
          created_at?: string
          id?: string
          ordem?: number
          perfil_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_aprovadores_aprovacao_id_fkey"
            columns: ["aprovacao_id"]
            isOneToOne: false
            referencedRelation: "workflow_aprovacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_aprovadores_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_aprovadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_campos: {
        Row: {
          campos_referencia: string[] | null
          created_at: string
          etapa_id: string
          formula: string | null
          id: string
          label: string
          mascara: string | null
          nome: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          tipo: string
          valor_padrao: string | null
        }
        Insert: {
          campos_referencia?: string[] | null
          created_at?: string
          etapa_id: string
          formula?: string | null
          id?: string
          label: string
          mascara?: string | null
          nome: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          tipo?: string
          valor_padrao?: string | null
        }
        Update: {
          campos_referencia?: string[] | null
          created_at?: string
          etapa_id?: string
          formula?: string | null
          id?: string
          label?: string
          mascara?: string | null
          nome?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          tipo?: string
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_campos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "workflow_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_etapas: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          obrigatoria: boolean
          ordem: number
          prazo_dias: number | null
          workflow_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          obrigatoria?: boolean
          ordem?: number
          prazo_dias?: number | null
          workflow_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          obrigatoria?: boolean
          ordem?: number
          prazo_dias?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_etapas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "licitacao_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_cliente_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inicializar_etapas_licitacao: {
        Args: { p_cliente_id: string; p_licitacao_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "usuario" | "atendente"
      etapa_licitacao_codigo:
        | "analise_edital"
        | "esclarecimento_impugnacao"
        | "aprovacoes"
        | "preparacao_documentos"
        | "proposta"
        | "disputa_pregao"
        | "resultado"
        | "custom_1"
        | "custom_2"
        | "custom_3"
        | "custom_4"
        | "custom_5"
        | "concorrentes"
        | "produtos"
        | "tarefas"
        | "contratos"
        | "empenhos"
        | "impugnacao_contrarrazao"
      etapa_licitacao_status:
        | "edital_pendente_analise"
        | "edital_analisado"
        | "pendente"
        | "elaborando_peca"
        | "peca_enviada"
        | "finalizada"
        | "aguardando_aprovacoes"
        | "concluido"
        | "em_analise"
        | "documentos_analisados"
        | "elaborando_proposta"
        | "proposta_finalizada"
        | "em_disputa"
        | "recurso_contrarrazao"
        | "disputa_finalizada"
        | "aguardando_resultado"
        | "resultado_finalizado"
        | "nao_iniciada"
        | "em_andamento"
        | "custom_concluida"
      ticket_categoria: "duvida" | "erro" | "sugestao" | "outro"
      ticket_prioridade: "baixa" | "media" | "alta" | "urgente"
      ticket_status:
        | "aberto"
        | "em_atendimento"
        | "aguardando_cliente"
        | "resolvido"
        | "fechado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "usuario", "atendente"],
      etapa_licitacao_codigo: [
        "analise_edital",
        "esclarecimento_impugnacao",
        "aprovacoes",
        "preparacao_documentos",
        "proposta",
        "disputa_pregao",
        "resultado",
        "custom_1",
        "custom_2",
        "custom_3",
        "custom_4",
        "custom_5",
        "concorrentes",
        "produtos",
        "tarefas",
        "contratos",
        "empenhos",
        "impugnacao_contrarrazao",
      ],
      etapa_licitacao_status: [
        "edital_pendente_analise",
        "edital_analisado",
        "pendente",
        "elaborando_peca",
        "peca_enviada",
        "finalizada",
        "aguardando_aprovacoes",
        "concluido",
        "em_analise",
        "documentos_analisados",
        "elaborando_proposta",
        "proposta_finalizada",
        "em_disputa",
        "recurso_contrarrazao",
        "disputa_finalizada",
        "aguardando_resultado",
        "resultado_finalizado",
        "nao_iniciada",
        "em_andamento",
        "custom_concluida",
      ],
      ticket_categoria: ["duvida", "erro", "sugestao", "outro"],
      ticket_prioridade: ["baixa", "media", "alta", "urgente"],
      ticket_status: [
        "aberto",
        "em_atendimento",
        "aguardando_cliente",
        "resolvido",
        "fechado",
      ],
    },
  },
} as const
