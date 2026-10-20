-- %%CHUNK%%
-- ============ 1. CLIENTES, EMPRESAS, PERFIS, PERMISSOES ============
INSERT INTO clientes (id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo, palavras_positivas, palavras_negativas, terceirizacao, concorrentes) VALUES
('c1000001-0000-4000-8000-000000000000','Clinica Vida Plena Ltda','12.345.678/0001-90','contato@vidaplena.com.br','(15) 3222-1010','Rua das Flores, 250','Sorocaba','SP','18010-000',true,ARRAY['saude','qualidade','atencao humanizada'],ARRAY['preco','atraso'],false,ARRAY['Hospital Sao Lucas','Laboratorio Vita']),
('c1000002-0000-4000-8000-000000000000','Construtora Horizonte S.A.','98.765.432/0001-10','obras@horizonte.com.br','(19) 3255-2020','Av. Central, 1800','Campinas','SP','13070-100',true,ARRAY['prazo','experiencia','engenharia'],ARRAY['cancelamento','multa'],true,ARRAY['Geo Construcoes','Vale Obras']),
('c1000003-0000-4000-8000-000000000000','Alimentos Serra Azul Ltda','45.678.912/0001-33','comercial@serraazul.com.br','(41) 3311-4040','Rod. BR-116, km 32','Curitiba','PR','81530-000',true,ARRAY['frescor','entrega','certificacao'],ARRAY['logistica','preco'],false,ARRAY['Distribuidora Norte','Alimentos Bandeirantes']);

INSERT INTO empresas (id, cliente_id, razao_social, nome_fantasia, cnpj, cep, endereco, numero, bairro, cidade, estado, telefone, email, ativo) VALUES
('e2000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Clinica Vida Plena Matriz Ltda','Vida Plena Matriz','12.345.678/0001-90','18010-000','Rua das Flores','250','Centro','Sorocaba','SP','(15) 3222-1010','matriz@vidaplena.com.br',true),
('e2000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Clinica Vida Plena Campinas Ltda','Vida Plena Campinas','12.345.678/0002-71','13070-100','Rua Bandeirantes','95','Jardim Guanabara','Campinas','SP','(19) 3233-4040','campinas@vidaplena.com.br',true),
('e2000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Construtora Horizonte S.A.','Horizonte','98.765.432/0001-10','13070-100','Av. Central','1800','Centro','Campinas','SP','(19) 3255-2020','contato@horizonte.com.br',true),
('e2000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Horizonte Obras e Servicos Ltda','Horizonte Servicos','98.765.432/0002-51','13070-100','Rua dos Pinheiros','420','Ponte Preta','Campinas','SP','(19) 3255-2121','servicos@horizonte.com.br',true),
('e2000005-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','Alimentos Serra Azul S.A.','Serra Azul','45.678.912/0001-33','81530-000','Rod. BR-116','km 32','Industrial','Colombo','PR','(41) 3311-4040','sac@serraazul.com.br',true),
('e2000006-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','Serra Azul Distribuidora Ltda','Serra Azul Dist.','45.678.912/0002-14','81530-000','Rua Angola','77','Santa Felicidade','Curitiba','PR','(41) 3311-4141','dist@serraazul.com.br',true);

INSERT INTO perfis_acesso (id, cliente_id, nome, descricao, ativo) VALUES
('a3000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Gerente de Licitacoes','Acesso amplo a licitacoes, tarefas e relatorios',true),
('a3000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Analista de Compras','Operacao do dia a dia, sem exclusao',true),
('a3000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Diretor de Compras','Acesso total para a filial de obras',true),
('a3000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Engenheiro de Obras','Acompanhamento de contratos e etapas',true),
('a3000005-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','Coordenador de Suprimentos','Gestao de fornecedores e pedidos',true),
('a3000006-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','Assistente Administrativo','Acesso de leitura e lancamento',true);

INSERT INTO perfil_permissoes (id, perfil_id, modulo, pode_visualizar, pode_criar, pode_editar, pode_excluir) VALUES
('b4000001-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','dashboard',true,true,true,false),
('b4000002-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','licitacoes',true,true,true,true),
('b4000003-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','clientes',true,true,true,false),
('b4000004-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','tarefas',true,true,true,true),
('b4000005-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','contratos',true,true,true,false),
('b4000006-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','produtos',true,true,true,true),
('b4000007-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','documentos',true,true,true,false),
('b4000008-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','relatorios',true,false,false,false),
('b4000009-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','agenda',true,true,true,false),
('b400000a-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','pendencias',true,true,true,false),
('b4000011-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','dashboard',true,false,false,false),
('b4000012-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','licitacoes',true,true,true,false),
('b4000013-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','tarefas',true,true,true,false),
('b4000014-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','produtos',true,true,true,false),
('b4000015-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','documentos',true,true,true,false),
('b4000016-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','contratos',true,false,false,false),
('b4000017-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','agenda',true,true,true,false),
('b4000018-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','pendencias',true,false,false,false);

UPDATE profiles SET cliente_id = 'c1000001-0000-4000-8000-000000000000', perfil_acesso_id = 'a3000001-0000-4000-8000-000000000000', cargo = 'Gerente de Licitacoes' WHERE id = 'be000001-0000-4000-8000-000000000000';
UPDATE profiles SET cliente_id = 'c1000001-0000-4000-8000-000000000000', perfil_acesso_id = 'a3000002-0000-4000-8000-000000000000', cargo = 'Analista de Compras' WHERE id = 'be000002-0000-4000-8000-000000000000';

INSERT INTO declaracoes_templates (id, cliente_id, nome, titulo, conteudo, variaveis, ativo) VALUES
('76000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Declaracao de Capacidade Tecnica','Declaracao de Capacidade Tecnica','Declaramos, para os devidos fins, que a {{empresa}} possui capacidade tecnica para executar o objeto licitado no processo {{processo}}.',ARRAY['empresa','processo','objeto'],true),
('76000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Declaracao de Vinculo','Declaracao de Vinculo','Declaramos que a {{empresa}} nao mantem vinculo com o orgao {{orgao}}.',ARRAY['empresa','orgao'],true),
('76000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Declaracao de Impedimento','Declaracao de Impedimento','Declaramos sob as penas da lei que nao ha impedimento de participar do certame {{processo}}.',ARRAY['processo'],true);

INSERT INTO propostas_config (id, cliente_id, nome, modelo_cabecalho, modelo_rodape, campos_obrigatorios, incluir_logo, incluir_assinatura, formato_preco, casas_decimais, ativo) VALUES
('77000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Proposta Padrao','{{empresa}} - CNPJ {{cnpj}}','Atenciosamente, {{responsavel}}',ARRAY['valor_total','prazo_entrega'],true,true,'BRL',2,true);
-- %%CHUNK%%
-- ============ 2. WORKFLOWS, ETAPAS, CAMPOS, APROVACOES, CONFIG ============
INSERT INTO licitacao_workflows (id, cliente_id, nome, descricao, ativo) VALUES
('41000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Fluxo Pregao Eletronico','Fluxo completo para pregao eletronico',true),
('41000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Fluxo Dispensa e Inexigibilidade','Fluxo simplificado para dispensa',true),
('41000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Fluxo Obras e Servicos','Fluxo para concorrencias de obras',true),
('41000004-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','Fluxo Suprimentos','Fluxo de compras e suprimentos',true);

INSERT INTO workflow_etapas (id, workflow_id, nome, descricao, ordem, cor, icone, obrigatoria, prazo_dias) VALUES
('42000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Analise do Edital','Leitura e mapeamento do edital',1,'#3b82f6','file-search',true,2),
('42000002-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Esclarecimentos e Impugnacoes','Questoes e impugnacoes ao edital',2,'#f59e0b','help-circle',true,3),
('42000003-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Aprovacoes Internas','Aprovacao comercial e financeira',3,'#8b5cf6','check-circle',true,2),
('42000004-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Preparacao de Documentos','Montagem da documentacao',4,'#06b6d4','folder-open',true,3),
('42000005-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Elaboracao de Proposta','Planilha de precos e proposta',5,'#10b981','file-text',true,2),
('42000006-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Disputa / Pregao','Participacao na disputa',6,'#ef4444','gavel',true,1),
('42000007-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Resultado e Recursos','Analise do resultado e recursos',7,'#ec4899','award',false,5),
('42000008-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','Contratacao e Contrato','Assinatura e implantacao',8,'#22c55e','briefcase',true,10),
('42000011-0000-4000-8000-000000000000','41000002-0000-4000-8000-000000000000','Analise do Edital',NULL,1,'#3b82f6','file-search',true,2),
('42000012-0000-4000-8000-000000000000','41000002-0000-4000-8000-000000000000','Aprovacoes Internas',NULL,2,'#8b5cf6','check-circle',true,1),
('42000013-0000-4000-8000-000000000000','41000002-0000-4000-8000-000000000000','Documentacao e Proposta',NULL,3,'#06b6d4','file-text',true,2),
('42000014-0000-4000-8000-000000000000','41000002-0000-4000-8000-000000000000','Resultado',NULL,4,'#ec4899','award',false,3),
('42000015-0000-4000-8000-000000000000','41000002-0000-4000-8000-000000000000','Contratacao',NULL,5,'#22c55e','briefcase',true,7),
('42000021-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','Analise do Edital',NULL,1,'#3b82f6','file-search',true,5),
('42000022-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','Habilitacao Tecnica',NULL,2,'#f59e0b','file-check',true,7),
('42000023-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','Aprovacoes Internas',NULL,3,'#8b5cf6','check-circle',true,3),
('42000024-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','Proposta Tecnica e Precos',NULL,4,'#10b981','file-text',true,5),
('42000025-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','Disputa e Julgamento',NULL,5,'#ef4444','gavel',true,2),
('42000031-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','Analise do Edital',NULL,1,'#3b82f6','file-search',true,2),
('42000032-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','Esclarecimentos',NULL,2,'#f59e0b','help-circle',false,3),
('42000033-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','Aprovacoes Internas',NULL,3,'#8b5cf6','check-circle',true,2),
('42000034-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','Proposta',NULL,4,'#10b981','file-text',true,2),
('42000035-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','Resultado e Contrato',NULL,5,'#22c55e','briefcase',true,7);

INSERT INTO workflow_campos (id, etapa_id, nome, label, tipo, obrigatorio, ordem, valor_padrao) VALUES
('43000001-0000-4000-8000-000000000000','42000005-0000-4000-8000-000000000000','valor_proposta','Valor da Proposta','numero',true,1,NULL),
('43000002-0000-4000-8000-000000000000','42000005-0000-4000-8000-000000000000','prazo_entrega','Prazo de Entrega (dias)','numero',true,2,'15'),
('43000003-0000-4000-8000-000000000000','42000005-0000-4000-8000-000000000000','garantia','Garantia Contratual','texto',false,3,'5%'),
('43000004-0000-4000-8000-000000000000','42000001-0000-4000-8000-000000000000','data_visita','Data da Visita Tecnica','data',false,1,NULL),
('43000005-0000-4000-8000-000000000000','42000004-0000-4000-8000-000000000000','docs_requisitados','Documentos Requisitados','texto',true,1,NULL);

INSERT INTO workflow_aprovacoes (id, etapa_id, nome, tipo, aprovadores_minimos, ordem) VALUES
('44000001-0000-4000-8000-000000000000','42000003-0000-4000-8000-000000000000','Aprovacao Comercial','simples',1,1),
('44000002-0000-4000-8000-000000000000','42000003-0000-4000-8000-000000000000','Aprovacao Financeira','comite',1,2),
('44000003-0000-4000-8000-000000000000','42000012-0000-4000-8000-000000000000','Aprovacao Gerencia','simples',1,1),
('44000004-0000-4000-8000-000000000000','42000033-0000-4000-8000-000000000000','Aprovacao Suprimentos','simples',1,1);

INSERT INTO workflow_aprovadores (id, aprovacao_id, perfil_id, usuario_id, ordem) VALUES
('45000001-0000-4000-8000-000000000000','44000001-0000-4000-8000-000000000000','a3000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',1),
('45000002-0000-4000-8000-000000000000','44000002-0000-4000-8000-000000000000','a3000002-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000',1),
('45000003-0000-4000-8000-000000000000','44000003-0000-4000-8000-000000000000','a3000003-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',1);

INSERT INTO licitacao_etapas_config (id, cliente_id, etapa_codigo, ativo, ordem) VALUES
('46000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','analise_edital',true,1),
('46000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','esclarecimento_impugnacao',true,2),
('46000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','aprovacoes',true,3),
('46000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','preparacao_documentos',true,4),
('46000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','proposta',true,5),
('46000006-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','disputa_pregao',true,6),
('46000007-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','resultado',true,7),
('46000008-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','impugnacao_contrarrazao',true,8),
('46000009-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','concorrentes',true,9),
('4600000a-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','produtos',true,10),
('4600000b-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','tarefas',true,11),
('4600000c-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','contratos',true,12),
('4600000d-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','empenhos',true,13),
('4600000e-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','analise_edital',true,1),
('4600000f-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','aprovacoes',true,2),
('46000010-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','preparacao_documentos',true,3),
('46000011-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','disputa_pregao',true,4),
('46000012-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','analise_edital',true,1),
('46000013-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','esclarecimento_impugnacao',true,2),
('46000014-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','proposta',true,3),
('46000015-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','contratos',true,4);

INSERT INTO cliente_aprovacao_config (id, cliente_id, nome_etapa, descricao, ordem, aprovador_id, ativo, area) VALUES
('47000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Aprovacao Comercial','Validacao da margem e do preco',1,'be000001-0000-4000-8000-000000000000',true,'Comercial'),
('47000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Aprovacao Financeira','Validacao de fluxo de caixa',2,'be000002-0000-4000-8000-000000000000',true,'Financeiro');
-- %%CHUNK%%
-- %%CHUNK%%
-- ============ 3. PRODUTOS + LICITACOES ============
INSERT INTO produtos (id, cliente_id, codigo, nome, descricao, tipo, categoria, unidade, preco, ativo, unidade_negocio) VALUES
('21000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MED001','Dipirona 500mg cx 10 comp','Analgesico e antitermico','produto','Medicamentos','cx',12.50,true,'Saude'),
('21000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MED002','Soro Fisiologico 0,9% 500ml','Solucao para infusao','produto','Insumos','frasco',8.90,true,'Saude'),
('21000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MED003','Luva de Procedimento Tam P','Descartavel nitrilica','produto','EPI','cx',39.90,true,'Saude'),
('21000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MED004','Mascara Cirurgica Tripla','Descartavel 3 ply','produto','EPI','cx',24.90,true,'Saude'),
('21000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MOB001','Mesa de Consultorio 1,20m','Laminado e aco','produto','Mobiliario','un',750.00,true,'Administrativo'),
('21000006-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','MOB002','Cadeira com Rodapes','Aco e espuma','produto','Mobiliario','un',320.00,true,'Administrativo'),
('21000007-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','INS001','Alcool Gel 70% 500ml','Antisseptico','produto','Insumos','frasco',11.00,true,'Saude'),
('21000008-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','CON001','Cimento CP-II-E 50kg','Uso geral','produto','Material','saco',32.00,true,'Obras'),
('21000009-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','CON002','Aco CA-50 10mm 12m','Vergalhao','produto','Material','barra',45.00,true,'Obras'),
('2100000a-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','CON003','Areia Media Lavada','Para concreto','produto','Material','m3',120.00,true,'Obras'),
('2100000b-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','EMB001','Caixa Cartao Ondulado 40x30','Dupla onda','produto','Embalagens','un',3.20,true,'Producao'),
('2100000c-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','EMB002','Filme PVC 45cm 300m','Estiravel','produto','Embalagens','rolo',18.50,true,'Producao'),
('2100000d-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','EMB003','Plastico Bolha 1m2','Protecao','produto','Embalagens','m2',7.40,true,'Producao');

INSERT INTO licitacoes (id, cliente_id, empresa_id, workflow_id, numero, objeto, orgao, modalidade, portal, valor_estimado, data_abertura, data_encerramento, etapa_atual_id, etapa_atual_codigo, status, relevancia, observacoes, created_by, uasg, cidade_orgao, uf_orgao, processo, preco_edital) VALUES
('11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','041/2026','Aquisicao de medicamentos e insumos hospitalares','Hospital Municipal de Sorocaba','Pregão Eletrônico','Licitacoes-Brasil',480000.00,now() + interval '3 days',now() + interval '10 days','42000005-0000-4000-8000-000000000000','proposta','em_andamento','alta','Edital com 12 itens; disputa em lote unico.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','187456','Sorocaba','SP','2026/0041',480000.00),
('11000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','025/2026','Fornecimento de generos alimenticios','Prefeitura Municipal de Votorantim','Dispensa','Comprasnet',152000.00,now() - interval '40 days',now() - interval '25 days','42000008-0000-4000-8000-000000000000','contratos','finalizado','media','Contrato assinado e em vigencia.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','192310','Votorantim','SP','2026/0025',152000.00),
('11000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','047/2026','Servicos de limpeza, conservacao e higienizacao','Estado de SP - Secretaria da Saude','Pregão Presencial','PNCP',320000.00,now() + interval '7 days',now() + interval '14 days','42000003-0000-4000-8000-000000000000','aprovacoes','em_andamento','media','Aguardando aprovacao comercial.','be000001-0000-4000-8000-000000000000','205512','Sao Paulo','SP','2026/0047',320000.00),
('11000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000002-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','052/2026','Reforma predial do ambulatorio','Prefeitura de Salto de Itapetininga','Concorrência','PNCP',890000.00,now() + interval '15 days',now() + interval '30 days','42000001-0000-4000-8000-000000000000','analise_edital','pendente_analise','alta','Visita tecnica marcada para a proxima semana.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','178920','Salto de Itapetininga','SP','2026/0052',890000.00),
('11000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','018/2026','Aquisicao de mobiliario escolar','Prefeitura Municipal de Piedade','Pregão Eletrônico','Licitacoes-Brasil',96000.00,now() - interval '70 days',now() - interval '55 days','42000008-0000-4000-8000-000000000000','contratos','finalizado','baixa','Perdida para concorrente com menor preco.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','165430','Piedade','SP','2026/0018',96000.00),
('11000006-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','e2000003-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','009/2026','Execucao de pavimentacao asfaltica - Avenida das Nacoes','Prefeitura de Sumare','Concorrência','PNCP',2400000.00,now() + interval '5 days',now() + interval '20 days','42000024-0000-4000-8000-000000000000','preparacao_documentos','em_andamento','alta','Proposta tecnica em revisao pelo engenheiro.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','198840','Sumare','SP','2026/0009',2400000.00),
('11000007-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','e2000004-0000-4000-8000-000000000000','41000003-0000-4000-8000-000000000000','014/2026','Manutencao predial do edificio administrativo','Universidade Estadual de Campinas','Tomada de Preços','PNCP',430000.00,now() - interval '90 days',now() - interval '70 days','42000025-0000-4000-8000-000000000000','disputa_pregao','finalizado','media','Resultado parcial: lote 1 ganho, lote 2 perdido.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','130210','Campinas','SP','2026/0014',430000.00),
('11000008-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','077/2026','Fornecimento de embalagens para linha de producao','Industria Brasileira de Alimentos','Pregão Eletrônico','Licitacoes-Brasil',178000.00,now() + interval '2 days',now() + interval '9 days','42000032-0000-4000-8000-000000000000','esclarecimento_impugnacao','em_andamento','media','Impugnacao enviada sobre lote 3.','be000001-0000-4000-8000-000000000000','214780','Colombo','PR','2026/0077',178000.00),
('11000009-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','e2000006-0000-4000-8000-000000000000','41000004-0000-4000-8000-000000000000','078/2026','Contratacao de servicos de transporte e logistica','Industria Brasileira de Alimentos','Pregão Eletrônico','Licitacoes-Brasil',64000.00,now() + interval '25 days',now() + interval '40 days',NULL,NULL,'pendente_analise','baixa','Rascunho aguardando definicao de precos.','be000002-0000-4000-8000-000000000000','214780','Colombo','PR','2026/0078',64000.00),
('11000010-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','41000001-0000-4000-8000-000000000000','030/2026','Contratacao de vigilancia patrimonial','Hospital Municipal de Sorocaba','Pregão Eletrônico','Licitacoes-Brasil',260000.00,now() - interval '10 days',now() - interval '2 days','42000001-0000-4000-8000-000000000000','analise_edital','recusado','media','Cancelada pelo orgao; edital revogado.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','187456','Sorocaba','SP','2026/0030',260000.00);

-- timeline de etapas de cada licitacao (ids deterministicos via md5)
INSERT INTO licitacao_etapas (id, licitacao_id, etapa_id, status, responsavel_id, data_inicio, data_conclusao)
SELECT
  md5('le:' || l.id::text || ':' || we.id::text)::uuid,
  l.id,
  we.id,
  CASE
    WHEN l.status = 'finalizado' THEN 'concluida'
    WHEN l.status IN ('pendente_analise','recusado') THEN 'pendente'
    WHEN we.ordem < cur.ordem THEN 'concluida'
    WHEN we.ordem = cur.ordem THEN 'em_andamento'
    ELSE 'pendente'
  END,
  CASE WHEN we.ordem % 2 = 0 THEN 'be000002-0000-4000-8000-000000000000'::uuid ELSE 'be000001-0000-4000-8000-000000000000'::uuid END,
  now() - interval '20 days' + (we.ordem || ' days')::interval,
  CASE WHEN l.status = 'finalizado' OR (l.status = 'em_andamento' AND we.ordem < cur.ordem) THEN now() - interval '20 days' + (we.ordem || ' days')::interval ELSE NULL END
FROM licitacoes l
JOIN workflow_etapas cur ON cur.id = l.etapa_atual_id
JOIN licitacao_workflows w ON w.id = l.workflow_id
JOIN workflow_etapas we ON we.workflow_id = w.id
ON CONFLICT (id) DO NOTHING;

INSERT INTO licitacao_etapa_execucao (id, licitacao_id, etapa_codigo, status, dados, observacoes, responsavel_id, data_inicio, data_conclusao)
SELECT
  md5('exec:' || l.id::text)::uuid,
  l.id,
  l.etapa_atual_codigo,
  CASE l.status
    WHEN 'finalizado' THEN 'finalizada'::etapa_licitacao_status
    WHEN 'em_andamento' THEN 'em_andamento'::etapa_licitacao_status
    ELSE 'nao_iniciada'::etapa_licitacao_status
  END,
  '{}'::jsonb,
  'Etapa corrente da licitacao (demo).',
  'be000001-0000-4000-8000-000000000000',
  CASE WHEN l.status IN ('em_andamento','finalizado') THEN now() - interval '6 days' ELSE NULL END,
  CASE WHEN l.status = 'finalizado' THEN now() - interval '3 days' ELSE NULL END
FROM licitacoes l
WHERE l.etapa_atual_codigo IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- aprovacoes pendentes/aprovadas nas etapas de aprovacao do fluxo 1
INSERT INTO licitacao_aprovacoes (id, licitacao_etapa_id, aprovacao_config_id, aprovador_id, status, comentario, data_resposta)
SELECT
  md5('ap:' || l.id::text || ':' || wa.id::text)::uuid,
  le.id,
  wa.id,
  CASE WHEN l.id = '11000003-0000-4000-8000-000000000000' THEN 'be000001-0000-4000-8000-000000000000'::uuid ELSE 'be000001-0000-4000-8000-000000000000'::uuid END,
  CASE WHEN l.status = 'finalizado' THEN 'aprovado'
       WHEN l.id = '11000003-0000-4000-8000-000000000000' AND wa.ordem = 1 THEN 'pendente'
       ELSE 'aprovado' END,
  CASE WHEN l.status = 'finalizado' THEN 'Aprovado em reuniao de comite.' ELSE 'Aguardando ciencia do gestor.' END,
  CASE WHEN l.status = 'finalizado' THEN now() - interval '18 days' WHEN l.id = '11000003-0000-4000-8000-000000000000' AND wa.ordem = 1 THEN NULL ELSE now() - interval '9 days' END
FROM licitacoes l
JOIN licitacao_etapas le ON le.licitacao_id = l.id AND le.etapa_id = '42000003-0000-4000-8000-000000000000'
JOIN workflow_aprovacoes wa ON wa.etapa_id = '42000003-0000-4000-8000-000000000000'
WHERE l.id IN ('11000002-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- valores dos campos na etapa corrente da 11000001 (etapa proposta)
INSERT INTO licitacao_campos_valores (id, licitacao_etapa_id, campo_id, valor, valor_calculado)
SELECT
  md5('cv:' || le.id::text || ':' || wc.id::text)::uuid,
  le.id,
  wc.id,
  CASE wc.nome WHEN 'valor_proposta' THEN '468500.00' WHEN 'prazo_entrega' THEN '12' WHEN 'garantia' THEN '5%' END,
  NULL
FROM licitacao_etapas le
JOIN workflow_campos wc ON wc.etapa_id = '42000005-0000-4000-8000-000000000000'
WHERE le.licitacao_id = '11000001-0000-4000-8000-000000000000' AND le.etapa_id = '42000005-0000-4000-8000-000000000000'
ON CONFLICT (id) DO NOTHING;

INSERT INTO licitacao_produtos (id, licitacao_id, produto_id, item_numero, descricao, unidade, quantidade, valor_unitario, valor_total, marca, modelo, observacoes) VALUES
('14000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','21000001-0000-4000-8000-000000000000',1,'Dipirona 500mg cx 10 comp','cx',5000,11.80,59000.00,'Medley','Cx 10',NULL),
('14000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','21000002-0000-4000-8000-000000000000',2,'Soro Fisiologico 0,9% 500ml','frasco',8000,8.20,65600.00,'Fresenius','500ml',NULL),
('14000003-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','21000003-0000-4000-8000-000000000000',3,'Luva de Procedimento Tam P','cx',3000,37.50,112500.00,'Supermax','Nitrilica',NULL),
('14000004-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','21000004-0000-4000-8000-000000000000',4,'Mascara Cirurgica Tripla','cx',4000,23.90,95600.00,'Descarpack','3 ply',NULL),
('14000005-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000','21000005-0000-4000-8000-000000000000',1,'Mesa de Consultorio 1,20m','un',40,730.00,29200.00,'Fujioka','Mesa 120',NULL),
('14000006-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000','21000006-0000-4000-8000-000000000000',2,'Cadeira com Rodapes','un',100,310.00,31000.00,'Commerz','Cadeira R',NULL),
('14000007-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','21000008-0000-4000-8000-000000000000',1,'Cimento CP-II-E 50kg','saco',15000,31.00,465000.00,'Votoran','CP-II',NULL),
('14000008-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','21000009-0000-4000-8000-000000000000',2,'Aco CA-50 10mm 12m','barra',8000,43.50,348000.00,'Gerdau','CA-50',NULL),
('14000009-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','2100000a-0000-4000-8000-000000000000',3,'Areia Media Lavada','m3',4000,115.00,460000.00,'Local','LaVada',NULL),
('1400000a-0000-4000-8000-000000000000','11000008-0000-4000-8000-000000000000','2100000b-0000-4000-8000-000000000000',1,'Caixa Cartao Ondulado 40x30','un',30000,3.05,91500.00,'Smurfit','Onda Dupla',NULL),
('1400000b-0000-4000-8000-000000000000','11000008-0000-4000-8000-000000000000','2100000c-0000-4000-8000-000000000000',2,'Filme PVC 45cm 300m','rolo',4000,17.90,71600.00,'Tecnochips','45cm',NULL);

INSERT INTO licitacao_concorrentes (id, licitacao_id, cliente_id, nome_concorrente, participou, ganhou, valor_proposta, observacoes) VALUES
('15000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Hospital Sao Lucas Distribuidora',true,false,472000.00,'Historico de boas entregas.'),
('15000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Farma Mais Atacado',true,false,455000.00,'Agressivo em precos.'),
('15000003-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Med Supply Brasil',false,false,NULL,'Nao confirmada presenca.'),
('15000004-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Distribuidora Bandeirante',true,true,149800.00,'Vencedora do certame.'),
('15000005-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Atacado Norte Alimentos',true,false,151200.00,'Preco acima do vencedor.'),
('15000006-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Moveis Imperial',true,true,92000.00,'Venceu por menor preco.'),
('15000007-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Office Design',true,false,94500.00,NULL),
('15000008-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Geo Construcoes e Pavimentacao',true,false,2350000.00,'Forte em obras via.'),
('15000009-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Vale Obras Servicos',true,false,2480000.00,NULL),
('1500000a-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Manutencao Total Ltda',true,true,418000.00,'Venceu lote 1.'),
('1500000b-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Predial Servicos Integrados',true,true,405000.00,'Venceu lote 2.');

INSERT INTO licitacao_documentos_checklist (id, licitacao_id, categoria, nome, descricao, status, obrigatorio, arquivo_url, data_validade, verificado_por, verificado_em) VALUES
('16000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Habilitacao','CNPJ e Inscricao Estadual','Documentos societarios basicos','concluido',true,'https://example.com/docs/cnpj.pdf',now() + interval '300 days','be000001-0000-4000-8000-000000000000',now() - interval '12 days'),
('16000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Habilitacao','Certidao Negativa Federal','FCDF regular','concluido',true,'https://example.com/docs/fcdf.pdf',now() + interval '40 days','be000001-0000-4000-8000-000000000000',now() - interval '12 days'),
('16000003-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Proposta','Planilha de Precos','Planilha preenchida com todos os itens','pendente',true,NULL,NULL,NULL,NULL),
('16000004-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Proposta','Declaracao de Capacidade Tecnica','Assinada pelo representante legal','pendente',true,NULL,NULL,NULL,NULL),
('16000005-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Tecnica','Atestado de Capacidade Tecnica','3 atestados emitidos','concluido',false,'https://example.com/docs/atestados.pdf',now() + interval '180 days','be000002-0000-4000-8000-000000000000',now() - interval '8 days'),
('16000006-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Garantia','Proposta de Garantia Contratual','5% do valor do contrato','pendente',false,NULL,NULL,NULL,NULL),
('16000007-0000-4000-8000-000000000000','11000004-0000-4000-8000-000000000000','Habilitacao','CNDT e CND Municipal','Certidoes em dia','concluido',true,'https://example.com/docs/cndt.pdf',now() + interval '60 days','be000001-0000-4000-8000-000000000000',now() - interval '2 days'),
('16000008-0000-4000-8000-000000000000','11000004-0000-4000-8000-000000000000','Tecnica','Projeto Executivo','Arquivo em PDF assinado','pendente',true,NULL,NULL,NULL,NULL),
('16000009-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','Habilitacao','Registro CREA da equipe','Engenheiro responsavel com CREA ativo','concluido',true,'https://example.com/docs/crea.pdf',now() + interval '200 days','be000002-0000-4000-8000-000000000000',now() - interval '15 days'),
('1600000a-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','Proposta','Proposta Tecnica','Metodologia e cronograma','pendente',true,NULL,NULL,NULL,NULL),
('1600000b-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','Tecnica','Memoria de Calculo','Detalhamento de quantitativos','pendente',false,NULL,NULL,NULL,NULL);

INSERT INTO licitacao_chat (id, licitacao_id, pergunta, resposta, favorita, status, created_by) VALUES
('17000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','O edital permite agrupamento por lote?', 'Sim, o item 9.3 do edital permite ofertar por lote unico.',true,'respondida','be000001-0000-4000-8000-000000000000'),
('17000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Qual o prazo de validade da proposta?', '90 dias corridos a partir da data de abertura.',false,'respondida','be000002-0000-4000-8000-000000000000'),
('17000003-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','Ha exigencia de marca especifica?', 'Nao ha marca registrada; aceita marca de valor tecnico equivalente ou superior.',true,'respondida','be000001-0000-4000-8000-000000000000'),
('17000004-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','O quantitativo de horas pode ser ajustado em contrato?', 'Sim, por termo aditivo mediante justificativa tecnica.',false,'pendente','be000001-0000-4000-8000-000000000000');

INSERT INTO licitacao_mensagens_internas (id, licitacao_id, autor_id, conteudo, mencoes) VALUES
('18000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Equipe, revisar a planilha antes de sexta. @carlos',ARRAY['be000002-0000-4000-8000-000000000000']::uuid[]),
('18000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Planilha revisada; ajustei os precos dos itens 2 e 3.',ARRAY[]::uuid[]),
('18000003-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Bom trabalho. Podemos ofertar margem de 6%.',ARRAY[]::uuid[]),
('18000004-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Aprovacao comercial pendente; cobrar o gestor ate terca.',ARRAY[]::uuid[]),
('18000005-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Documentos de habilitacao ja digitalizados.',ARRAY[]::uuid[]),
('18000006-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Proposta tecnica precisa de revisao do calculo de asfalto.',ARRAY[]::uuid[]),
('18000007-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Atualizei a memoria com os novos quantitativos.',ARRAY[]::uuid[]);

INSERT INTO licitacao_resultado_itens (id, licitacao_id, item_numero, descricao, resultado, valor_proposta, valor_vencedor, vencedor_nome, observacoes) VALUES
('19000001-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000',1,'Generos alimenticios - lote 1','ganho',52000.00,52000.00,'Distribuidora Bandeirante',NULL),
('19000002-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000',2,'Generos alimenticios - lote 2','ganho',49000.00,49000.00,'Distribuidora Bandeirante',NULL),
('19000003-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000',3,'Hortifruti - lote 3','perdido',51000.00,48500.00,'Atacado Norte Alimentos','Menor preco.'),
('19000004-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000',1,'Mesas de consultorio','perdido',29200.00,27600.00,'Moveis Imperial',NULL),
('19000005-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000',2,'Cadeiras com rodapes','perdido',31000.00,29800.00,'Moveis Imperial',NULL),
('19000006-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000',3,'Armarios arquivos','perdido',35800.00,33000.00,'Office Design',NULL),
('19000007-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000',1,'Manutencao predial - lote 1','ganho',418000.00,418000.00,'Manutencao Total Ltda',NULL),
('19000008-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000',2,'Manutencao predial - lote 2','ganho',405000.00,405000.00,'Predial Servicos Integrados',NULL),
('19000009-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000',3,'Pintura externa','perdido',12000.00,11400.00,'Pinturas Paulista',NULL);

INSERT INTO licitacao_pecas (id, licitacao_id, cliente_id, tipo, titulo, descricao_solicitacao, conteudo_gerado, modelo_ia, status, created_by) VALUES
('1a000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','proposta_tecnica','Proposta Tecnica - Medicamentos','Texto tecnico com capacidade de fornecimento','A Clinica Vida Plena detaha estrutura logistica para atender o prazo de 5 dias uteis...','gpt-4o-mini','gerada','be000001-0000-4000-8000-000000000000'),
('1a000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','impugnacao','Impugnacao - Lote 3','Questionar quantitativo minimo exigido',NULL,'gpt-4o-mini','pendente','be000001-0000-4000-8000-000000000000'),
('1a000003-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','proposta_tecnica','Proposta Tecnica - Limpeza','Metodologia e escalas de equipe','Equipe de 12 profissionais com escalas de 6x1...','gpt-4o-mini','gerada','be000001-0000-4000-8000-000000000000'),
('1a000004-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','contrarrazao','Contrarrazao - Pavimentacao','Recurso contra classificacao',NULL,'gpt-4o-mini','erro','be000001-0000-4000-8000-000000000000');

INSERT INTO licitacao_analises (id, licitacao_id, arquivo_nome, arquivo_url, arquivos_analisados, resultado, status, created_by) VALUES
('1b000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','edital_041_2026.pdf','https://example.com/edital/041.pdf',ARRAY['edital_041_2026.pdf'],'{"risco":"medio","prazo_dias":10,"itens":12,"alertas":["garantia de 5%"]}','concluida','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('1b000002-0000-4000-8000-000000000000','11000004-0000-4000-8000-000000000000','edital_052_2026.pdf','https://example.com/edital/052.pdf',ARRAY['edital_052_2026.pdf'],'{"risco":"alto","prazo_dias":30,"itens":1,"alertas":["visita tecnica obrigatoria"]}','pendente','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO licitacao_fluxo_aprovacao (id, licitacao_id, nome_etapa, descricao, ordem, aprovador_id, status, comentario, data_resposta, created_by) VALUES
('1f000001-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','Aprovacao Comercial','Margem de 7% validada',1,'be000001-0000-4000-8000-000000000000','aprovado','Aprovado sem ressalvas.',now() - interval '30 days','be000001-0000-4000-8000-000000000000'),
('1f000002-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','Aprovacao Financeira','Fluxo de caixa conferido',2,'be000002-0000-4000-8000-000000000000','aprovado','Pagamento em 30 dias.',now() - interval '29 days','be000001-0000-4000-8000-000000000000'),
('1f000003-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','Aprovacao Comercial','Margem proposta de 6%',1,'be000001-0000-4000-8000-000000000000','pendente',NULL,NULL,'be000001-0000-4000-8000-000000000000'),
('1f000004-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','Aprovacao Financeira','Contrato de 12 meses',2,'be000002-0000-4000-8000-000000000000','aprovado','Ok para o financeiro.',now() - interval '4 days','be000001-0000-4000-8000-000000000000');

INSERT INTO licitacao_status_regras (id, cliente_id, nome, descricao, status_destino, ordem, ativo, condicao_sem_analise_ia, condicao_dias_sem_analise, condicao_dias_apos_encerramento, condicao_valor_minimo, condicao_valor_maximo, created_by) VALUES
('1e000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Revisao por falta de analise','Mover para revisao se nao houver analise IA','em_andamento',1,true,false,3,NULL,NULL,NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('1e000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Encerramento automatico','Encerrar apos encerramento do edital','finalizado',2,true,false,NULL,5,NULL,NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('1e000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Licitoes de alto valor','Enviar para comite quando acima de R$ 500 mil','em_andamento',3,true,false,NULL,NULL,500000,NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO conlicitacao_logs (id, cliente_id, boletim_id, filtro_id, tipo, licitacoes_recebidas, licitacoes_novas, licitacoes_atualizadas, acompanhamentos_recebidos, sucesso, created_at) VALUES
('1c000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',88421,7,'sincronizacao',25,3,6,0,true,now() - interval '2 days'),
('1c000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',88390,7,'sincronizacao',31,5,4,2,true,now() - interval '9 days');

INSERT INTO licitacao_monitoramento_mensagens (id, licitacao_id, autor_tipo, autor_nome, mensagem, data_mensagem, origem, metadata) VALUES
('1d000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','orgao','Hospital Municipal de Sorocaba','Publicado esclarecimento sobre o item 7.',now() - interval '4 days','pncp','{}'::jsonb),
('1d000002-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000','participante','Farma Mais Atacado','Impugnacao protocolada sobre prazo de entrega.',now() - interval '3 days','pncp','{}'::jsonb),
('1d000003-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','orgao','Prefeitura de Sumare','Agendada reuniao de esclarecimentos.',now() - interval '1 day','pncp','{}'::jsonb);

INSERT INTO licitacao_versoes (id, licitacao_id, versao, conlicitacao_id, boletim_id, situacao_conlicitacao, snapshot, campos_alterados, total_mudancas) VALUES
('0b000001-0000-4000-8000-000000000000','11000001-0000-4000-8000-000000000000',1,55231,88421,'divulgada','{"numero":"041/2026","valor_estimado":480000}','["valor_estimado"]'::jsonb,1),
('0b000002-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000',1,55190,88390,'aberta','{"numero":"009/2026","valor_estimado":2400000}','["data_encerramento"]'::jsonb,1);
-- %%CHUNK%%
-- %%CHUNK%%
-- ============ 4. CONTRATOS, EMPENHOS, TAREFAS, IMPORTACOES, DASH ============
INSERT INTO contratos (id, cliente_id, licitacao_id, empresa_id, numero, objeto, orgao, uf, modalidade, fornecedor, valor_original, valor_atual, valor_executado, data_assinatura, data_inicio_vigencia, data_fim_vigencia, fiscal_id, fiscal_nome, gestor_id, gestor_nome, indice_reajuste, permite_subcontratacao, percentual_subcontratacao_max, status, observacoes, created_by) VALUES
('31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','001/2026','Fornecimento de generos alimenticios para unidades de saude','Prefeitura Municipal de Votorantim','SP','Dispensa','Clinica Vida Plena Ltda',152000.00,152000.00,74000.00,now() - interval '25 days',now() - interval '20 days',now() + interval '340 days','be000001-0000-4000-8000-000000000000','Maria Ferreira','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','IPCA',false,NULL,'vigente','Entregas mensais em ate 5 dias uteis.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('31000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'e2000001-0000-4000-8000-000000000000','014/2025','Fornecimento de material de escritorio','Prefeitura Municipal de Piedade','SP','Pregão Eletrônico','Clinica Vida Plena Ltda',68000.00,68000.00,68000.00,now() - interval '400 days',now() - interval '395 days',now() - interval '60 days','be000002-0000-4000-8000-000000000000','Carlos Souza','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','INPC',false,NULL,'encerrado','Contrato encerrado por fim de vigencia.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000','e2000004-0000-4000-8000-000000000000','007/2026','Manutencao predial do edificio administrativo','Universidade Estadual de Campinas','SP','Tomada de Preços','Horizonte Obras e Servicos Ltda',430000.00,430000.00,210000.00,now() - interval '60 days',now() - interval '55 days',now() + interval '300 days','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','IPCA',true,30.00,'vigente','Medicoes mensais com aprovacao da fiscalia.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('31000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',NULL,'e2000003-0000-4000-8000-000000000000','003/2025','Reforma da sede administrativa','Prefeitura de Sumare','SP','Concorrência','Construtora Horizonte S.A.',780000.00,820000.00,410000.00,now() - interval '300 days',now() - interval '295 days',now() + interval '70 days','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','INPC',true,20.00,'suspenso','Suspenso por demanda de projeto aditivo.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('31000005-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000',NULL,'e2000005-0000-4000-8000-000000000000','021/2025','Fornecimento de embalagens industriais','Industria Brasileira de Alimentos','PR','Pregão Eletrônico','Alimentos Serra Azul Ltda',240000.00,240000.00,240000.00,now() - interval '500 days',now() - interval '495 days',now() - interval '130 days','be000001-0000-4000-8000-000000000000','Maria Ferreira','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','IPCA',false,NULL,'concluido','Executado integralmente.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_medicoes (id, contrato_id, cliente_id, numero, periodo_inicio, periodo_fim, valor_medido, percentual_fisico, percentual_acumulado, status, data_envio, data_atesto, fiscal_aprovador_id, fiscal_aprovador_nome, observacoes, created_by) VALUES
('38000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','001',(now() - interval '25 days')::date,(now() - interval '15 days')::date,26000.00,17.1,17.1,'atestada',now() - interval '14 days',now() - interval '12 days','be000001-0000-4000-8000-000000000000','Maria Ferreira',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('38000002-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','002',(now() - interval '14 days')::date,(now() - interval '4 days')::date,24000.00,15.8,32.9,'enviada',now() - interval '3 days',NULL,'be000001-0000-4000-8000-000000000000','Maria Ferreira',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('38000003-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','003',(now() - interval '3 days')::date,(now() + interval '7 days')::date,24000.00,15.8,48.7,'pendente',NULL,NULL,'be000001-0000-4000-8000-000000000000','Maria Ferreira','Em elaboracao.', 'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('38000004-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','001',(now() - interval '55 days')::date,(now() - interval '25 days')::date,120000.00,27.9,27.9,'atestada',now() - interval '22 days',now() - interval '20 days','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('38000005-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','002',(now() - interval '24 days')::date,(now() - interval '4 days')::date,90000.00,20.9,48.8,'enviada',now() - interval '2 days',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Juliano','Aguardando atesto.', 'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_faturas (id, contrato_id, cliente_id, medicao_id, numero_nf, serie, data_emissao, data_vencimento, data_atesto, valor_bruto, status, observacoes, created_by) VALUES
('39000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','38000001-0000-4000-8000-000000000000','000123456','1',(now() - interval '13 days')::date,(now() + interval '17 days')::date,(now() - interval '12 days')::date,26000.00,'pendente',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('39000002-0000-4000-8000-000000000000','31000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'000098712','1',(now() - interval '200 days')::date,(now() - interval '170 days')::date,(now() - interval '175 days')::date,34000.00,'paga',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('39000003-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','38000004-0000-4000-8000-000000000000','000045521','1',(now() - interval '18 days')::date,(now() + interval '12 days')::date,(now() - interval '16 days')::date,120000.00,'paga',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('39000004-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','38000005-0000-4000-8000-000000000000','000045688','1',(now() - interval '1 day')::date,(now() + interval '29 days')::date,NULL,90000.00,'pendente','NF emitida apos envio da medicao.', 'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_aditivos (id, contrato_id, cliente_id, numero_termo, tipo, data_assinatura, data_publicacao, valor_alteracao, novo_valor_contrato, prazo_adicional_dias, justificativa, status, created_by) VALUES
('32000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','001/2026','prazo',now() - interval '5 days',now() - interval '4 days',0,152000.00,60,'Prorrogação para entrega do lote 3.','ativo','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('32000002-0000-4000-8000-000000000000','31000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','001/2026','valor',now() - interval '40 days',now() - interval '39 days',40000.00,820000.00,0,'Ajuste por reajuste de material.','ativo','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_cronograma (id, contrato_id, cliente_id, ordem, etapa, descricao, mes_referencia, percentual_previsto, percentual_realizado, valor_previsto, valor_realizado, status, observacoes) VALUES
('33000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',1,'Entrega mensal','Lote 1 de generos alimenticios',date_trunc('month', now())::date,16.6,17.1,25000.00,26000.00,'concluido',NULL),
('33000002-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',2,'Entrega mensal','Lote 2 de generos alimenticios',date_trunc('month', now() + interval '1 month')::date,16.6,0,25000.00,0,'em_andamento',NULL),
('33000003-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',3,'Entrega mensal','Lote 3 de generos alimenticios',date_trunc('month', now() + interval '2 months')::date,16.6,0,25000.00,0,'pendente',NULL),
('33000004-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',1,'Fase 1','Reparos estruturais',date_trunc('month', now() - interval '2 months')::date,30,27.9,129000.00,120000.00,'concluido',NULL),
('33000005-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',2,'Fase 2','Instalacoes eletricas',date_trunc('month', now())::date,30,20.9,129000.00,90000.00,'em_andamento',NULL),
('33000006-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',3,'Fase 3','Acabamento e pintura',date_trunc('month', now() + interval '1 month')::date,40,0,172000.00,0,'pendente',NULL);

INSERT INTO contrato_garantias (id, contrato_id, cliente_id, tipo, valor, percentual_contrato, emissor, numero_apolice, data_emissao, data_vigencia_inicio, data_vigencia_fim, status, observacoes, created_by) VALUES
('34000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','execucao',7600.00,5.00,'Seguros Brasil','AP-2026-7781',now() - interval '20 days',now() - interval '20 days',now() + interval '345 days','vigente',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('34000002-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','fiel_cumprimento',21500.00,5.00,'Caixa Seguros','AP-2025-4410',now() - interval '300 days',now() - interval '300 days',now() + interval '65 days','vigente','Vence junto com o contrato.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_apostilamentos (id, contrato_id, cliente_id, numero, tipo, indice, percentual, periodo_referencia_inicio, periodo_referencia_fim, valor_anterior, valor_novo, data_aplicacao, justificativa, created_by) VALUES
('35000001-0000-4000-8000-000000000000','31000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','001/2026','reajuste','IPCA',4.35,(now() - interval '12 months')::date,(now() - interval '1 month')::date,152000.00,158612.00,now() - interval '10 days','Reajuste anual contratual.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_subcontratacoes (id, contrato_id, cliente_id, cnpj, razao_social, objeto_subcontratado, percentual, valor, data_aprovacao, data_inicio, data_fim, status, observacoes, created_by) VALUES
('36000001-0000-4000-8000-000000000000','31000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','22.333.444/0001-55','Eletrica Paulista Ltda','Instalacoes eletricas prediais',25.00,107500.00,now() - interval '40 days',now() - interval '35 days',now() + interval '120 days','aprovada','Subcontratacao aprovada pela fiscalia.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_rescisoes (id, contrato_id, cliente_id, tipo, motivo, data_rescisao, saldo_remanescente, multa_aplicada, responsavel_orgao, observacoes, created_by) VALUES
('37000001-0000-4000-8000-000000000000','31000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','parcial','Inexecucao parcial de fornecimento',now() - interval '30 days',410000.00,0,'Prefeitura de Sumare','Rescisao parcial homologada.','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO contrato_empenho_anexos (id, cliente_id, parent_type, parent_id, nome, descricao, categoria, arquivo_url, arquivo_path, arquivo_tamanho, arquivo_tipo, uploaded_by) VALUES
('3a000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','contrato','31000001-0000-4000-8000-000000000000','contrato_001_2026.pdf','Contrato assinado digitalmente','contrato','https://example.com/anexos/contrato_001_2026.pdf','contratos/contrato_001_2026.pdf',184320,'application/pdf','bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('3a000002-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','contrato','31000003-0000-4000-8000-000000000000','termo_referencia_007_2026.pdf','Termo de referencia anexado','termo','https://example.com/anexos/tr_007_2026.pdf','contratos/tr_007_2026.pdf',229376,'application/pdf','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO empenhos (id, numero, cliente_id, licitacao_id, empresa_id, orgao_emissor, tipo, valor_empenhado, valor_utilizado, data_emissao, data_vencimento, objeto, fonte_recurso, programa_trabalho, natureza_despesa, unidade_gestora, status, observacoes) VALUES
('61000001-0000-4000-8000-000000000000','2026NE004501','c1000001-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','Prefeitura Municipal de Votorantim','inicial',152000.00,74000.00,now() - interval '25 days',now() + interval '340 days','Fornecimento de generos alimenticios','Recursos Ordinarios','200101','3.3.90.39','UG-01','ativo',NULL),
('61000002-0000-4000-8000-000000000000','2026NE004780','c1000001-0000-4000-8000-000000000000','11000003-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','Estado de SP - Secretaria da Saude','inicial',320000.00,0.00,now() - interval '3 days',now() + interval '300 days','Servicos de limpeza e conservacao','Recursos Ordinarios','200101','3.3.90.30','UG-04','ativo','Aguardando aprovacao do contrato.'),
('61000003-0000-4000-8000-000000000000','2025NE009911','c1000001-0000-4000-8000-000000000000','11000005-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','Prefeitura Municipal de Piedade','inicial',96000.00,96000.00,now() - interval '70 days',now() - interval '40 days','Mobiliario escolar','Recursos Ordinarios','200101','3.3.90.39','UG-01','encerrado','Empenho liquidado integralmente.'),
('61000004-0000-4000-8000-000000000000','2026NE002210','c1000002-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000','e2000004-0000-4000-8000-000000000000','Universidade Estadual de Campinas','inicial',430000.00,210000.00,now() - interval '60 days',now() + interval '300 days','Manutencao predial','Recursos Proprios','440101','3.3.90.30','UG-02','ativo',NULL),
('61000005-0000-4000-8000-000000000000','2026NE005120','c1000002-0000-4000-8000-000000000000','11000006-0000-4000-8000-000000000000','e2000003-0000-4000-8000-000000000000','Prefeitura de Sumare','global',2400000.00,0.00,now() - interval '8 days',now() + interval '360 days','Pavimentacao asfaltica','Recursos de Convencio','330101','4.4.90.39','UG-07','ativo',NULL),
('61000006-0000-4000-8000-000000000000','001/2026','c1000001-0000-4000-8000-000000000000','11000002-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','Clinica Vida Plena Ltda','contrato',152000.00,74000.00,now() - interval '25 days',now() + interval '340 days','Fornecimento de generos alimenticios','Recursos Ordinarios','200101','3.3.90.39','UG-01','vigente','Contrato vigente vinculado a licitacao.'),
('61000007-0000-4000-8000-000000000000','007/2026','c1000002-0000-4000-8000-000000000000','11000007-0000-4000-8000-000000000000','e2000004-0000-4000-8000-000000000000','Horizonte Obras e Servicos Ltda','contrato',430000.00,210000.00,now() - interval '60 days',now() + interval '300 days','Manutencao predial do edificio administrativo','Recursos Proprios','440101','3.3.90.30','UG-02','vigente','Contrato vinculado a licitacao concluida.');

INSERT INTO tarefas (id, titulo, descricao, status, prioridade, data_vencimento, data_conclusao, responsavel_id, cliente_id, criado_por, tags, responsaveis_ids, licitacao_id) VALUES
('62000001-0000-4000-8000-000000000000','Revisar planilha de precos do edital 041/2026','Conferir unitarios e totais antes do envio.','pendente','alta',now() + interval '2 days',NULL,'be000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['edital','planilha'],ARRAY['be000002-0000-4000-8000-000000000000']::uuid[],'11000001-0000-4000-8000-000000000000'),
('62000002-0000-4000-8000-000000000000','Enviar documentacao de habilitacao','Digitalizar e anexar certidoes no portal.','em_andamento','urgente',now() + interval '1 day',NULL,'be000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['documentos'],ARRAY['be000001-0000-4000-8000-000000000000']::uuid[],'11000001-0000-4000-8000-000000000000'),
('62000003-0000-4000-8000-000000000000','Cobrar aprovacao comercial da licitacao 047/2026','Prazo de disputa em 7 dias.','pendente','media',now() + interval '4 days',NULL,'be000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['aprovacao'],ARRAY['be000002-0000-4000-8000-000000000000']::uuid[],'11000003-0000-4000-8000-000000000000'),
('62000004-0000-4000-8000-000000000000','Protocolar impugnacao ao item 7','Prazo vencido - verificar recurso.','pendente','urgente',now() - interval '1 day',NULL,'be000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['impugnacao','urgente'],ARRAY['be000001-0000-4000-8000-000000000000']::uuid[],'11000001-0000-4000-8000-000000000000'),
('62000005-0000-4000-8000-000000000000','Atualizar precos com fornecedor','Precos negociados para a proposta.','concluida','media',now() - interval '3 days',now() - interval '3 days','be000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['fornecedor'],ARRAY['be000002-0000-4000-8000-000000000000']::uuid[],'11000001-0000-4000-8000-000000000000'),
('62000006-0000-4000-8000-000000000000','Agendar reuniao de esclarecimentos','Confirmar presenca na reuniao online.','em_andamento','baixa',now() + interval '6 days',NULL,'be000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['agenda'],ARRAY[]::uuid[],'11000008-0000-4000-8000-000000000000'),
('62000007-0000-4000-8000-000000000000','Conferir atestado de capacidade','Validar os 3 atestados anexados.','concluida','alta',now() - interval '8 days',now() - interval '8 days','be000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['documentos'],ARRAY['be000002-0000-4000-8000-000000000000']::uuid[],'11000001-0000-4000-8000-000000000000'),
('62000008-0000-4000-8000-000000000000','Registrar atas de registro de precos','Arquivar no Drive da equipe.','pendente','baixa',now() + interval '12 days',NULL,NULL,'c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['arp'],ARRAY[]::uuid[],NULL),
('62000009-0000-4000-8000-000000000000','Revisar memoria de calculo do asfalto','Conferir quantitativos por camada.','em_andamento','alta',now() + interval '3 days',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','c1000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',ARRAY['tecnico'],ARRAY[]::uuid[],'11000006-0000-4000-8000-000000000000'),
('6200000a-0000-4000-8000-000000000000','Enviar proposta tecnica ao portal','Anexar metodiologia e cronograma.','pendente','urgente',now() - interval '2 days',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','c1000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',ARRAY['proposta'],ARRAY[]::uuid[],'11000006-0000-4000-8000-000000000000'),
('6200000b-0000-4000-8000-000000000000','Faturar medicao 002','Emitir NF apos atesto.','pendente','media',now() + interval '5 days',NULL,NULL,'c1000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',ARRAY['financeiro'],ARRAY[]::uuid[],NULL),
('6200000c-0000-4000-8000-000000000000','Negociar entrega de embalagens','Ajustar cronograma com a producao.','em_andamento','media',now() + interval '8 days',NULL,'be000001-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000',ARRAY['fornecedor'],ARRAY[]::uuid[],'11000008-0000-4000-8000-000000000000'),
('6200000d-0000-4000-8000-000000000000','Cancelar rascunho 078/2026','Aguardando definicao da diretoria.','cancelada','baixa',now() - interval '5 days',NULL,NULL,'c1000003-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000',ARRAY[]::text[],ARRAY[]::uuid[],'11000009-0000-4000-8000-000000000000');

INSERT INTO importacoes (id, tipo, nome_arquivo, total_registros, registros_sucesso, registros_erro, status, erros, importado_por) VALUES
('72000001-0000-4000-8000-000000000000','licitacoes','licitacoes_outubro.csv',120,118,2,'concluido','[{"linha":45,"erro":"CNPJ invalido"},{"linha":88,"erro":"Data de abertura fora do formato"}]'::jsonb,'be000001-0000-4000-8000-000000000000'),
('72000002-0000-4000-8000-000000000000','produtos','catalogo_fornecedores.xlsx',45,0,45,'erro','[{"linha":2,"erro":"Coluna codigo ausente"}]'::jsonb,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO dashboard_widgets (id, cliente_id, title, widget_type, data_source, size, position, navigation_path) VALUES
('63000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Licitações Abertas','number','licitacoes_abertas','small',1,'/licitacoes'),
('63000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Tarefas por Status','bar_chart','tarefas_por_status','medium',2,'/tarefas'),
('63000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Valor Total Licitações','number','valor_licitacoes','large',3,'/licitacoes'),
('63000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Clientes Ativos','number','clientes_ativos','small',4,'/clientes'),
('63000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Contratos Vencendo','bar_chart','contratos_vencendo','medium',5,'/contratos'),
('63000006-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Eventos da Semana','line_chart','eventos_semana','medium',6,'/agenda');

INSERT INTO pendencias_kanban_config (id, cliente_id, titulo, descricao, secao, icone, cor, fonte_dados, filtro_status, ordem, ativo, filtro_responsavel_atual) VALUES
('64000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Licitações Aguardando Analise','Situacoes pendentes de triagem','licitacoes','search','green','licitacoes','pendente_analise',1,true,false),
('64000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Documentos Pendentes','Checklist com itens nao concluidos','documentos','file','blue','licitacao_documentos_checklist','pendente',1,true,false),
('64000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Aprovacoes Pendentes','Aguardando aprovador','workflow','workflow','purple','licitacao_aprovacoes','pendente',1,true,false),
('64000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Tarefas em Aberto','Tarefas pendentes da equipe','geral','clock','red','tarefas','pendente',1,true,false),
('64000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Tickets em Aberto','Atendimentos nao resolvidos','geral','alert','yellow','tickets','aberto',2,true,false),
('64000006-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Empenhos Ativos','Empenhos com saldo','licitacoes','trending','green','empenhos','ativo',2,true,false);

INSERT INTO notificacoes (id, cliente_id, user_id, titulo, mensagem, tipo, link, lida) VALUES
('65000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Aprovacao pendente','A licitacao 047/2026 aguarda sua aprovacao comercial.','alerta','/licitacoes?id=11000003-0000-4000-8000-000000000000',false),
('65000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Nova tarefa atribuida','Carlos criou a tarefa "Atualizar precos com fornecedor".','info','/tarefas',false),
('65000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Tarefa vencida','"Protocolar impugnacao ao item 7" venceu ontem.','erro','/tarefas',false),
('65000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Analise IA concluida','A analise do edital 041/2026 esta disponivel.','sucesso','/licitacoes?id=11000001-0000-4000-8000-000000000000',true),
('65000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'Sincronizacao conlicitacao','3 novas licitacoes importadas do boletim.','info','/licitacoes',false),
('65000006-0000-4000-8000-000000000000',NULL,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Backup concluido','Snapshot do banco realizado com sucesso.','sucesso','/admin',false);
-- %%CHUNK%%
-- %%CHUNK%%
-- ============ 5. MENSAGERIA, TICKETS, IA, EMAIL, REGRAS, NEWS ============
INSERT INTO mensageria_canais (id, cliente_id, nome, descricao, tipo, icone, ativo, created_by) VALUES
('66000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Licitacao 041/2026','Acompanhamento do pregao de medicamentos','grupo','file',true,'be000001-0000-4000-8000-000000000000'),
('66000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Geral - Equipe','Conversa geral da equipe de licitacoes','grupo','users',true,'be000001-0000-4000-8000-000000000000'),
('66000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','Obras e Contratos','Obras da Construtora Horizonte','grupo','building',true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO mensageria_membros (id, canal_id, user_id, role, notificacoes_ativas) VALUES
('67000001-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','admin',true),
('67000002-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','membro',true),
('67000003-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','membro',false),
('67000004-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','admin',true),
('67000005-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','membro',true),
('67000006-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','membro',true),
('67000007-0000-4000-8000-000000000000','66000003-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','admin',true);

INSERT INTO mensageria_mensagens (id, canal_id, autor_id, conteudo, tipo, editado) VALUES
('68000001-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Pessoal, edital 041/2026 abre em 3 dias. Vamos fechar a planilha hoje.','texto',false),
('68000002-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Combinado. Ja ajustei os itens 2 e 3.','texto',false),
('68000003-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Bom. Margem maxima de 6% conforme combinado.','texto',false),
('68000004-0000-4000-8000-000000000000','66000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Alguem ja tem o certidao federal atualizada?','texto',false),
('68000005-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Bom dia gente!','texto',false),
('68000006-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Bom dia! Lembrar da reuniao as 14h.','texto',false),
('68000007-0000-4000-8000-000000000000','66000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','A pauta esta no Drive.','texto',true),
('68000008-0000-4000-8000-000000000000','66000003-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Medicao 002 da manutencao enviada para atesto.','texto',false),
('68000009-0000-4000-8000-000000000000','66000003-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Lembrete: reuniao de cronograma amanha as 10h.','texto',false);

INSERT INTO tickets (id, cliente_id, criado_por, atendente_id, titulo, descricao, categoria, prioridade, status, resolvido_em, correcao_aplicada) VALUES
('69000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Erro ao importar CSV de licitacoes','O arquivo licitacoes_outubro.csv falha na linha 45 com CNPJ invalido.','erro','alta','em_atendimento',NULL,false),
('69000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000',NULL,'Como configurar notificacoes por email','Gostaria de receber alertas de licitacoes abertas por email.','duvida','baixa','aberto',NULL,false),
('69000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Sugestao de filtro por UF na lista','Seria util filtrar licitacoes por estado na listagem principal.','sugestao','media','aguardando_cliente',NULL,false),
('69000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Planilha de precos nao calcula total','Ao alterar quantidade o total nao era recalculado na aba de produtos.','erro','urgente','resolvido',now() - interval '2 days',true),
('69000005-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',NULL,'Duvida sobre perfis de acesso','Qual a diferenca entre perfil Gerente e Analista?','duvida','media','aberto',NULL,false);

INSERT INTO ticket_mensagens (id, ticket_id, autor_id, conteudo, is_ia, is_interno, sugestao_ia) VALUES
('6a000001-0000-4000-8000-000000000000','69000001-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','O CSV falha na linha 45, parece problema de mascara de CNPJ.',false,false,NULL),
('6a000002-0000-4000-8000-000000000000','69000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Ola! Vamos validar o arquivo. Pode reenviar com o CNPJ formatado?',false,false,NULL),
('6a000003-0000-4000-8000-000000000000','69000001-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Verificar rotina de validacao de CNPJ no importador.',false,true,NULL),
('6a000004-0000-4000-8000-000000000000','69000002-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Preciso configurar alertas diarios.',false,false,NULL),
('6a000005-0000-4000-8000-000000000000','69000002-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Acesse Configuracoes > Notificacoes para ativar o email diario.',true,false,'Sugestao: vincular o canal de email ao filtro de UF preferido.'),
('6a000006-0000-4000-8000-000000000000','69000004-0000-4000-8000-000000000000','be000002-0000-4000-8000-000000000000','Total nao recalcula ao mudar quantidade.',false,false,NULL),
('6a000007-0000-4000-8000-000000000000','69000004-0000-4000-8000-000000000000','be000001-0000-4000-8000-000000000000','Corrigido na build de ontem. Pode testar novamente?',false,false,NULL),
('6a000008-0000-4000-8000-000000000000','69000003-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb','Boa sugestao! Entrou no backlog da proxima sprint.',false,false,NULL);

INSERT INTO audit_logs (id, tabela, registro_id, acao, dados_antigos, dados_novos, user_id, user_email, cliente_id, ip_address) VALUES
('6b000001-0000-4000-8000-000000000000','licitacoes','11000001-0000-4000-8000-000000000000','UPDATE','{"status":"pendente"}'::jsonb,'{"status":"em_andamento"}'::jsonb,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','juliano@startgi.com.br','c1000001-0000-4000-8000-000000000000','189.45.10.22'),
('6b000002-0000-4000-8000-000000000000','tarefas','62000004-0000-4000-8000-000000000000','INSERT',NULL,'{"titulo":"Protocolar impugnacao ao item 7","status":"pendente"}'::jsonb,'be000001-0000-4000-8000-000000000000','maria.gerente@startgi.com.br','c1000001-0000-4000-8000-000000000000','177.92.44.10'),
('6b000003-0000-4000-8000-000000000000','contratos','31000001-0000-4000-8000-000000000000','INSERT',NULL,'{"numero":"001/2026","status":"vigente"}'::jsonb,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','juliano@startgi.com.br','c1000001-0000-4000-8000-000000000000','189.45.10.22'),
('6b000004-0000-4000-8000-000000000000','tickets','69000004-0000-4000-8000-000000000000','UPDATE','{"status":"aberto"}'::jsonb,'{"status":"resolvido"}'::jsonb,'be000001-0000-4000-8000-000000000000','maria.gerente@startgi.com.br','c1000001-0000-4000-8000-000000000000','177.92.44.10'),
('6b000005-0000-4000-8000-000000000000','produtos','21000008-0000-4000-8000-000000000000','INSERT',NULL,'{"codigo":"CON001","preco":32.00}'::jsonb,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','juliano@startgi.com.br','c1000002-0000-4000-8000-000000000000','189.45.10.22'),
('6b000006-0000-4000-8000-000000000000','profiles','be000002-0000-4000-8000-000000000000','UPDATE','{"ativo":false}'::jsonb,'{"ativo":true}'::jsonb,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb','juliano@startgi.com.br',NULL,'189.45.10.22');

INSERT INTO ia_prompts (id, cliente_id, tipo, nome, descricao, prompt_sistema, prompt_usuario, modelo, temperatura, max_tokens, ativo, created_by) VALUES
('6c000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','analise_edital','Analise de Edital','Extrai exigencias, prazos e riscos do edital','Voce e um assistente especializado em licitacoes publicas brasileiras.','Analise o edital a seguir e liste prazos, exigencias e riscos:','gpt-4o-mini',0.3,2000,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6c000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','pecas_esclarecimento','Pecas e Esclarecimentos','Gera texto de proposta tecnica','Redija propostas tecnicas objetivas e aderentes ao edital.','Gere proposta tecnica para o objeto:','gpt-4o-mini',0.5,3000,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6c000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','analise_estrategica','Analise Estrategica','Responde duvidas internas da equipe','Responda de forma curta e pratica em portugues.','Duvida:','gpt-4o-mini',0.7,800,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6c000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','pecas_contrarrazoes','Contrarrazoes e Recursos','Redige pecas processuais','Elabore pecas com fundamentacao legal pertinente.','Texto da peca:','gpt-4o-mini',0.4,2500,false,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO ia_conhecimento (id, cliente_id, categoria, assunto, titulo, conteudo, fonte, tags, relevancia, uso_count, ativo, created_by) VALUES
('6d000001-0000-4000-8000-000000000000',NULL,'licitacoes','Prazos','Prazos do Codigo de Processo Administrativo','Impugnacao: 3 dias uteis antes da abertura; recurso: 2 dias uteis.','interno',ARRAY['prazo','recurso'],5,12,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6d000002-0000-4000-8000-000000000000',NULL,'legal','LGPD','Tratamento de dados em licitacoes','Dados de proponentes devem ser mantidos pelo prazo legal de 5 anos.','interno',ARRAY['lgpd','dados'],4,6,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6d000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','comercial','Margem','Politica de margem da empresa','Margem minima de 4% e maxima de 8% para servicos continuados.','interno',ARRAY['margem','politica'],5,9,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6d000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','operacional','Habilitacao','Checklist de habilitacao fiscal','CNDT, CND Federal, CND Municipal e FGTS em dia.','interno',ARRAY['habilitacao','documentos'],4,15,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('6d000005-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','obras','Obras','Quantitativos em pavimentacao','Referencia de espessura: 6cm em camada de desgaste.','interno',ARRAY['pavimentacao','quantitativos'],3,4,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO email_templates (id, cliente_id, nome, assunto, conteudo_html, conteudo_texto, evento, variaveis, cta_texto, cta_url, ativo, created_by) VALUES
('6e000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Ticket aberto','Novo ticket: {{titulo}}','<p>O ticket <strong>{{titulo}}</strong> foi aberto por {{autor}}.</p>','O ticket {{titulo}} foi aberto por {{autor}}.','ticket_aberto',ARRAY['titulo','autor'],NULL,NULL,true,'be000001-0000-4000-8000-000000000000'),
('6e000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Aprovacao pendente','Aprovacao pendente na licitacao {{numero}}','<p>A licitacao <strong>{{numero}}</strong> aguarda aprovacao.</p>','A licitacao {{numero}} aguarda aprovacao.','aprovacao_pendente',ARRAY['numero'],'Abrir licitacao','/licitacoes',true,'be000001-0000-4000-8000-000000000000'),
('6e000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Licitacao encerrada','Resultado publicado: {{numero}}','<p>O resultado da licitacao <strong>{{numero}}</strong> foi publicado.</p>','O resultado da licitacao {{numero}} foi publicado.','licitacao_encerrada',ARRAY['numero'],NULL,NULL,false,'be000001-0000-4000-8000-000000000000');

INSERT INTO cliente_onboarding (id, cliente_id, etapa_atual, etapas_concluidas, dados_coletados, iniciado_por, iniciado_em, concluido) VALUES
('6f000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',3,'[1,2]'::jsonb,'{"cnpj":"12.345.678/0001-90","responsavel":"Maria Ferreira"}'::jsonb,'be000001-0000-4000-8000-000000000000',now() - interval '15 days',false);

INSERT INTO cliente_regras (id, cliente_id, titulo, descricao, categoria, ordem, ativo, created_by) VALUES
('71000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Margem minima de 4%','Nao ofertar abaixo de 4% de margem em servicos continuados.','comercial',1,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('71000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Prazo de entrega maximo','Entregas em ate 15 dias corridos apos pedido.','operacional',2,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('71000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Certidoes sempre ativas','Renovar CNDs com 30 dias de antecedencia.','documental',3,true,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb'),
('71000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','Aprovacao obrigatoria acima de R$ 500 mil','Encaminhar ao comite antes da disputa.','comercial',4,false,'bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO integracao_mensageria (id, cliente_id, tipo, provedor, webhook_url, numero_telefone, configuracoes, ativo) VALUES
('75000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','whatsapp','evolution',NULL,'5515999990000','{"protocolo":"websocket","encoding":"base64"}'::jsonb,false);

INSERT INTO empresa_news_config (id, empresa_id, palavras_chave, tipos_evento, cnaes_prioritarios, ufs_monitoradas, ativo) VALUES
('73000001-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000',ARRAY['licitacao','edital','embalagem','pregao'],ARRAY['licitacao','edital'],ARRAY['C1091','C2511'],ARRAY['PR','SC','SP'],true);

INSERT INTO empresa_news_events (id, empresa_id, cnpj, razao_social, tipo_evento, titulo_noticia, descricao_noticia, fonte, url, data_publicacao, score_relevancia, cidade, uf, cnae, palavras_chave_encontradas) VALUES
('74000001-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','45.678.912/0001-33','Alimentos Serra Azul Ltda','licitacao','Novo pregao para embalagens industriais publicado','Orgao publico divulgou pregao eletronico para fornecimento de embalagens.','PNCP','https://example.com/noticias/pregao-embalagens',now() - interval '2 days',92,'Colombo','PR','C1091',ARRAY['licitacao','embalagem']),
('74000002-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','45.678.912/0001-33','Alimentos Serra Azul Ltda','edital','Edital de correcao publicado','Correcao de quantitativos no lote 2 do edital em questao.','Diario Oficial','https://example.com/noticias/correcao-edital',now() - interval '6 days',74,'Colombo','PR','C1091',ARRAY['edital']),
('74000003-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','12.345.678/0001-90','Clinica Vida Plena Ltda','licitacao','Contratacao de insumos hospitalares em pregao','Hospital municipal abriu pregao para insumos medicos.','PNCP','https://example.com/noticias/insumos-hospitalares',now() - interval '9 days',88,'Sorocaba','SP','Q8630',ARRAY['licitacao','insumos']);

INSERT INTO newsletter_agendamentos (id, empresa_id, ativo, horario_envio, criado_por) VALUES
('79000001-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000',true,'08:00','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO newsletter_envios (id, empresa_id, enviado_por, total_destinatarios, total_noticias, periodo_inicio, periodo_fim, status, enviado_em) VALUES
('7a000001-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','bf30cca7-b4e5-401d-ac7b-343dcc1167cb',14,6,(now() - interval '7 days')::date,(now())::date,'enviado',now() - interval '1 day');

INSERT INTO webhook_logs (id, cliente_id, ticket_id, evento, webhook_url, payload, status_code, response_body, sucesso, tempo_resposta_ms) VALUES
('78000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','69000001-0000-4000-8000-000000000000','ticket.created','https://hooks.example.com/iganhei','{"ticket":"69000001-0000-4000-8000-000000000000"}'::jsonb,200,'{"ok":true}',true,143),
('78000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','69000004-0000-4000-8000-000000000000','ticket.resolved','https://hooks.example.com/iganhei','{"ticket":"69000004-0000-4000-8000-000000000000"}'::jsonb,500,'internal error',false,2031);
-- %%CHUNK%%
-- %%CHUNK%%
-- ============ 6. TELAS DE INTEGRACOES: i-Documetnei, iPesquisei, Analise, E-mail, iA ============
INSERT INTO idocumentei_config (id, cliente_id, ativo, ultimo_sync, created_at, updated_at) VALUES
('98000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',true,now() - interval '1 day',now() - interval '30 days',now() - interval '1 day'),
('98000002-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',true,now() - interval '3 days',now() - interval '30 days',now() - interval '3 days'),
('98000003-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000',false,NULL,now() - interval '30 days',now() - interval '30 days');

INSERT INTO idocumentei_empresas (id, empresa_id, idocumentei_id, status_sync, ultimo_processamento, created_at, updated_at) VALUES
('97000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','idoc_10234567000190','sincronizado',now() - interval '1 day',now() - interval '20 days',now() - interval '1 day'),
('97000002-0000-4000-8000-000000000000','e2000002-0000-4000-8000-000000000000','idoc_10234567000271','sincronizado',now() - interval '2 days',now() - interval '20 days',now() - interval '2 days'),
('97000003-0000-4000-8000-000000000000','e2000003-0000-4000-8000-000000000000','idoc_20987654000110','sincronizado',now() - interval '4 days',now() - interval '15 days',now() - interval '4 days'),
('97000004-0000-4000-8000-000000000000','e2000004-0000-4000-8000-000000000000','idoc_20987654000251','pendente',NULL,now() - interval '15 days',now() - interval '15 days'),
('97000005-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','idoc_30456789000133','erro',now() - interval '6 days',now() - interval '10 days',now() - interval '6 days'),
('97000006-0000-4000-8000-000000000000','e2000006-0000-4000-8000-000000000000','idoc_30456789000214','sincronizado',now() - interval '2 days',now() - interval '10 days',now() - interval '2 days');

INSERT INTO idocumentei_documentos (id, empresa_id, idocumentei_empresa_id, tipo, nome, status, data_emissao, data_validade, arquivo_url, dados_raw, created_at, updated_at) VALUES
('99000001-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','idoc_10234567000190','alvara','Alvara Sanitario','vigente',now() - interval '300 days',now() + interval '65 days','https://example.com/doc/alvara.pdf','{"orgao":"Vigilancia Sanitaria"}',now() - interval '20 days',now() - interval '1 day'),
('99000002-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','idoc_10234567000190','certidao_negativa','Certidao Negativa Federal','vigente',now() - interval '90 days',now() + interval '275 days','https://example.com/doc/cndf.pdf','{"orgao":"Receita Federal"}',now() - interval '20 days',now() - interval '1 day'),
('99000003-0000-4000-8000-000000000000','e2000001-0000-4000-8000-000000000000','idoc_10234567000190','contrato_social','Contrato Social','vigente',now() - interval '800 days',NULL,'https://example.com/doc/contrato.pdf','{"junta_comercial":"JUCESP"}',now() - interval '20 days',now() - interval '1 day'),
('99000004-0000-4000-8000-000000000000','e2000002-0000-4000-8000-000000000000','idoc_10234567000271','certidao_negativa','Certidao Negativa Estadual','vencendo',now() - interval '330 days',now() + interval '35 days','https://example.com/doc/cndes.pdf','{"orgao":"SEFAZ-SP"}',now() - interval '20 days',now() - interval '2 days'),
('99000005-0000-4000-8000-000000000000','e2000003-0000-4000-8000-000000000000','idoc_20987654000110','alvara','Alvara da Prefeitura','vigente',now() - interval '200 days',now() + interval '165 days','https://example.com/doc/alvara-campinas.pdf','{"orgao":"Prefeitura de Campinas"}',now() - interval '15 days',now() - interval '4 days'),
('99000006-0000-4000-8000-000000000000','e2000005-0000-4000-8000-000000000000','idoc_30456789000133','certidao_negativa','Certidao Negativa Federal','vencido',now() - interval '400 days',now() - interval '35 days','https://example.com/doc/cndf-vencida.pdf','{"orgao":"Receita Federal"}',now() - interval '10 days',now() - interval '6 days');

INSERT INTO ipesquisei_dados (id, cliente_id, cnpj, tipo_entidade, nome_entidade, created_at, updated_at) VALUES
('91000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','12.345.678/0001-90','cliente','Clinica Vida Plena Ltda',now() - interval '40 days',now() - interval '2 days'),
('91000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','33.111.222/0001-44','concorrente','Hospital Sao Lucas',now() - interval '40 days',now() - interval '2 days'),
('91000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','44.222.333/0001-55','concorrente','Laboratorio Vita',now() - interval '40 days',now() - interval '2 days'),
('91000004-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','98.765.432/0001-10','cliente','Construtora Horizonte S.A.',now() - interval '25 days',now() - interval '3 days'),
('91000005-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','45.678.912/0001-33','cliente','Alimentos Serra Azul Ltda',now() - interval '25 days',now() - interval '3 days');

INSERT INTO ipesquisei_licitacoes (id, ipesquisei_dado_id, ipesquisei_id, numero, objeto, orgao, modalidade, uf, cidade, valor_estimado, data_abertura, data_resultado, vencedor_cnpj, vencedor_nome, valor_vencedor, ganhou, dados_completos, created_at, updated_at) VALUES
('92000001-0000-4000-8000-000000000000','91000001-0000-4000-8000-000000000000','99881','041/2026','Fornecimento de medicamentos','Prefeitura Municipal de Sorocaba','Pregao Eletronico','SP','Sorocaba',480000.00,now() - interval '50 days',now() - interval '35 days','12.345.678/0001-90','Clinica Vida Plena Ltda',472000.00,true,'{"src":"ipesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('92000002-0000-4000-8000-000000000000','91000001-0000-4000-8000-000000000000','99882','042/2026','Material de consumo hospitalar','Secretaria de Saude do Estado','Pregao Eletronico','SP','Sao Paulo',920000.00,now() - interval '80 days',now() - interval '65 days','55.666.777/0001-88','MedCare Distribuidora',905000.00,false,'{"src":"ipesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('92000003-0000-4000-8000-000000000000','91000002-0000-4000-8000-000000000000','99883','043/2026','Servico de coleta de residuos','Prefeitura Municipal de Sorocaba','Concorrencia','SP','Sorocaba',310000.00,now() - interval '70 days',now() - interval '55 days','33.111.222/0001-44','Hospital Sao Lucas',305000.00,false,'{"src":"ipesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('92000004-0000-4000-8000-000000000000','91000002-0000-4000-8000-000000000000','99884','044/2026','Fornecimento de refeicoes','Hospital Municipal de Sorocaba','Dispensa','SP','Sorocaba',150000.00,now() - interval '30 days',now() - interval '18 days','33.111.222/0001-44','Hospital Sao Lucas',148500.00,false,'{"src":"ipesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('92000005-0000-4000-8000-000000000000','91000003-0000-4000-8000-000000000000','99885','045/2026','Exames laboratoriais','Prefeitura de Campinas','Pregao Eletronico','SP','Campinas',640000.00,now() - interval '60 days',now() - interval '44 days','12.345.678/0001-90','Clinica Vida Plena Ltda',618000.00,false,'{"src":"ipesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('92000006-0000-4000-8000-000000000000','91000004-0000-4000-8000-000000000000','99886','014/2026','Reforma de escola municipal','Prefeitura Municipal de Piedade','Pregao Eletronico','SP','Piedade',760000.00,now() - interval '100 days',now() - interval '84 days','98.765.432/0001-10','Construtora Horizonte S.A.',754000.00,true,'{"src":"ipesquisei"}',now() - interval '25 days',now() - interval '3 days'),
('92000007-0000-4000-8000-000000000000','91000004-0000-4000-8000-000000000000','99887','015/2026','Drenagem urbana','Prefeitura Municipal de Campinas','Tomada de Precos','SP','Campinas',1450000.00,now() - interval '90 days',now() - interval '72 days','77.888.999/0001-00','Obras &amp; Obras Ltda',1490000.00,false,'{"src":"ipesquisei"}',now() - interval '25 days',now() - interval '3 days'),
('92000008-0000-4000-8000-000000000000','91000005-0000-4000-8000-000000000000','99888','078/2026','Fornecimento de alimentos processados','Industria Brasileira de Alimentos','Pregao Eletronico','PR','Colombo',64000.00,now() + interval '25 days',NULL,NULL,NULL,NULL,NULL,'{"src":"ipesquisei"}',now() - interval '25 days',now() - interval '3 days');

INSERT INTO ipesquisei_sancoes (id, ipesquisei_dado_id, tipo_cadastro, orgao_sancionador, tipo_sancao, fundamentacao, data_inicio, data_fim, vigente, dados_completos, created_at, updated_at) VALUES
('93000001-0000-4000-8000-000000000000','91000002-0000-4000-8000-000000000000','empresa','Tribunal de Contas da Unidade','Impedimento de contratar','Inexecucao contratual em licitacao anterior.',now() - interval '120 days',now() + interval '245 days',true,'{"src":"pesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('93000002-0000-4000-8000-000000000000','91000003-0000-4000-8000-000000000000','empresa','Ministerio Publico Estadual','Multa administrativa','Apresentacao de documentos com vicios formais.',now() - interval '700 days',now() - interval '640 days',false,'{"src":"pesquisei"}',now() - interval '40 days',now() - interval '2 days'),
('93000003-0000-4000-8000-000000000000','91000002-0000-4000-8000-000000000000','empresa','CEIS','Alerta','Registro de alerta por irregularidade fiscal.',now() - interval '40 days',NULL,true,'{"src":"pesquisei"}',now() - interval '40 days',now() - interval '2 days');

INSERT INTO ipesquisei_sync_logs (id, cliente_id, tipo, sucesso, total_licitacoes, total_sancoes, erro, dados_brutos, created_at) VALUES
('94000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','completo',true,5,2,NULL,'{"req":"sync-completo"}',now() - interval '2 days'),
('94000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','completo',true,3,0,NULL,'{"req":"sync-completo"}',now() - interval '9 days'),
('94000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','completo',true,2,0,NULL,'{"req":"sync-completo"}',now() - interval '3 days'),
('94000004-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','completo',false,0,0,'Timeout na consulta a API.',NULL,now() - interval '3 days');

INSERT INTO analise_estrategica_historico (id, cliente_id, periodo_inicio, periodo_fim, resultado, score_geral, total_licitacoes, taxa_sucesso, valor_total_ganho, valor_total_perdido, created_at) VALUES
('95000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',(now() - interval '90 days')::date,(now() - interval '1 days')::date,
'{"resumo_executivo":"Nos ultimos 90 dias a Clinica Vida Plena participou de 10 licitacoes, conquistando 3. O desempenho foi liderado por pregoes eletronicos de saude, com destaque para o edital 041/2026. Recomenda-se ampliar a participacao em dispensas do municipio de Sorocaba.","indicadores":{"total_licitacoes":10,"taxa_sucesso":30.0,"taxa_participacao":75.0,"valor_total_ganho":472000,"valor_total_perdido":1540000,"ticket_medio":157333.33,"principais_orgaos":["Prefeitura de Sorocaba","Secretaria de Saude do Estado","Prefeitura de Campinas"],"modalidades_frequentes":["Pregao Eletronico","Dispensa"]},"analise_competitiva":{"posicionamento":"Posicionamento competitivo saudavel, com preco agressivo em medicamentos e diferencial tecnico em exames.","principais_concorrentes":[{"nome":"Hospital Sao Lucas","frequencia":4,"taxa_vitoria":50.0,"nivel_risco":"alto"},{"nome":"Laboratorio Vita","frequencia":3,"taxa_vitoria":33.3,"nivel_risco":"medio"},{"nome":"MedCare Distribuidora","frequencia":2,"taxa_vitoria":0.0,"nivel_risco":"alto"}],"vantagens_competitivas":["Capacidade de entrega em 5 dias uteis","Certificacao ISO 9001","Historico de atestados junto a Saude"],"ameacas":["Entrada de distribuidoras nacionais com preco agressivo","Tendencia de empenho menor em dispensas"]},"tendencias":{"crescimento":"Crescimento de 12% no valor disputado na regiao do Alto Tiete.","setores_promissores":["Saude publica","Manutencao predial","Alimentacao escolar"],"alertas":["Prazo de entrega exigido em editais do estado subiu para 10 dias"],"previsoes":["Temporada de compras do fim do ano tende a abrir mais 4 pregoes"]},"recomendacoes":{"estrategicas":["Mapear os proximos editais do PNCP com antecedencia de 30 dias","Firmar acordo de precos com 2 fornecedores de medicamentos"],"operacionais":["Atualizar a planilha de precos trimestralmente","Revisar atestados proximos do vencimento"],"urgentes":["Renovar certidao negativa estadual em vencimento"]},"score_geral":78}',
78,10,30.0,472000.00,1540000.00,now() - interval '1 day'),
('95000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',(now() - interval '180 days')::date,(now() - interval '91 days')::date,
'{"resumo_executivo":"No periodo anterior a equipe participou de 7 licitacoes com 1 vitoria. A taxa de sucesso ficou abaixo da meta de 35%, puxada para baixo por dois pregoes de mobiliario perdidos por margem minima.","indicadores":{"total_licitacoes":7,"taxa_sucesso":14.3,"taxa_participacao":60.0,"valor_total_ganho":96000,"valor_total_perdido":830000,"ticket_medio":137142.86,"principais_orgaos":["Prefeitura de Piedade","Prefeitura de Sorocaba"],"modalidades_frequentes":["Pregao Eletronico"]},"analise_competitiva":{"posicionamento":"Competitivo em servicos, fraco em fornecimento de bens.","principais_concorrentes":[{"nome":"Distribuidora Norte","frequencia":3,"taxa_vitoria":66.7,"nivel_risco":"alto"},{"nome":"Geo Construcoes","frequencia":2,"taxa_vitoria":50.0,"nivel_risco":"medio"}],"vantagens_competitivas":["Proximidade com os orgaos locais"],"ameacas":["Falta de catalogo competitivo em bens"]},"tendencias":{"crescimento":"Estavel, sem variacao relevante.","setores_promissores":["Servicos de engenharia"],"alertas":["Margem de disputa em bens muito apertada"],"previsoes":["Reducao de pregoes no periodo de fim de ano"]},"recomendacoes":{"estrategicas":["Reposicionar precos em bens de maior giro"],"operacionais":["Aproximar o comercial dos orgaos de saude"],"urgentes":["Revisar tabela de precos de mobiliario"]},"score_geral":54}',
54,7,14.3,96000.00,830000.00,now() - interval '95 days'),
('95000003-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000',(now() - interval '120 days')::date,(now() - interval '1 days')::date,
'{"resumo_executivo":"Construtora Horizonte disputou 5 obras publicas no periodo, vencendo 2. Destaque para a reforma da escola municipal em Piedade, com margem saudavel de 0.8%.","indicadores":{"total_licitacoes":5,"taxa_sucesso":40.0,"taxa_participacao":80.0,"valor_total_ganho":754000,"valor_total_perdido":1450000,"ticket_medio":440800.0,"principais_orgaos":["Prefeitura de Piedade","Prefeitura de Campinas"],"modalidades_frequentes":["Pregao Eletronico","Tomada de Precos"]},"analise_competitiva":{"posicionamento":"Bom desempenho em obras civis de pequeno e medio porte.","principais_concorrentes":[{"nome":"Obras &amp; Obras Ltda","frequencia":3,"taxa_vitoria":33.3,"nivel_risco":"alto"},{"nome":"Vale Obras","frequencia":2,"taxa_vitoria":50.0,"nivel_risco":"medio"}],"vantagens_competitivas":["Equipe propria de engenharia","Certificacao de capacidade tecnica"],"ameacas":["Aumento de insumos de construcao"]},"tendencias":{"crescimento":"Demanda crescente de drenagem e pavimentacao.","setores_promissores":["Drenagem urbana","Reforma predial"],"alertas":["Cláusulas de reajuste IPCA mais frequentes"],"previsoes":["Novos lotes de convencio no proximo semestre"]},"recomendacoes":{"estrategicas":["Capitalizar no programa de drenagem da regiao"],"operacionais":["Manter diario de obra atualizado para atestos"],"urgentes":["Renovar garantia de execucao"]},"score_geral":71}',
71,5,40.0,754000.00,1450000.00,now() - interval '4 days');

INSERT INTO email_envios (id, cliente_id, template_id, destinatario_email, destinatario_nome, assunto, conteudo_html, status, erro, enviado_em, created_at) VALUES
('96000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6e000001-0000-4000-8000-000000000000','maria.gerente@startgi.com.br','Maria Ferreira','Novo ticket: Falha na integracao conlicitacao','<p>O ticket <strong>Falha na integracao conlicitacao</strong> foi aberto por Maria Ferreira.</p>','aberto',NULL,now() - interval '6 days',now() - interval '6 days'),
('96000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6e000002-0000-4000-8000-000000000000','carlos.operador@startgi.com.br','Carlos Souza','Aprovacao pendente na licitacao 047/2026','<p>A licitacao <strong>047/2026</strong> aguarda aprovacao.</p>','clicado',NULL,now() - interval '4 days',now() - interval '5 days'),
('96000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6e000002-0000-4000-8000-000000000000','juliano@startgi.com.br','Juliano','Aprovacao pendente na licitacao 038/2026','<p>A licitacao <strong>038/2026</strong> aguarda aprovacao.</p>','enviado',NULL,now() - interval '2 days',now() - interval '3 days'),
('96000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'financeiro@vidaplena.com.br','Financeiro','Lembrete de vencimento de medicao','<p>Medicao pendente de atesto.</p>','pendente',NULL,NULL,now() - interval '1 day'),
('96000005-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'maria.gerente@startgi.com.br','Maria Ferreira','Resultado publicado: 018/2026','<p>O resultado da licitacao <strong>018/2026</strong> foi publicado.</p>','falha',NULL,NULL,now() - interval '12 hours'),
('96000006-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6e000003-0000-4000-8000-000000000000','contato@vidaplena.com.br','Clinica Vida Plena','Resultado publicado: 041/2026','<p>O resultado da licitacao <strong>041/2026</strong> foi publicado.</p>','entregue',NULL,now() - interval '30 days',now() - interval '30 days');

INSERT INTO ia_execucoes (id, cliente_id, prompt_id, tipo, entrada, saida, tokens_entrada, tokens_saida, tempo_execucao_ms, sucesso, erro, created_at, created_by) VALUES
('9a000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6c000001-0000-4000-8000-000000000000','analise_edital','Edital 041/2026 - Fornecimento de generos alimenticios','Analise concluida: risco medio, prazo de 5 dias uteis, 12 itens identificados.',1850,640,2410,true,NULL,now() - interval '5 days','be000001-0000-4000-8000-000000000000'),
('9a000002-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6c000004-0000-4000-8000-000000000000','pecas_contrarrazoes','Contrarrazao ao recurso no processo 038/2026','Texto gerado com fundamentacao no art. 59 da Lei 14.133/2021.',2200,890,3120,true,NULL,now() - interval '3 days','be000002-0000-4000-8000-000000000000'),
('9a000003-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','6c000002-0000-4000-8000-000000000000','pecas_esclarecimento','Proposta tecnica - limpeza e conservacao','Proposta tecnica gerada com escalas de equipe 6x1.',1500,720,2050,true,NULL,now() - interval '1 day','be000001-0000-4000-8000-000000000000'),
('9a000004-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000',NULL,'analise_estrategica','Periodo 90 dias - Clinica Vida Plena','Falha na chamada ao provedor de IA.',0,0,0,false,'Rate limit excedido (429).',now() - interval '12 hours','bf30cca7-b4e5-401d-ac7b-343dcc1167cb');

INSERT INTO conlicitacao_config (id, cliente_id, token, filtro_id, filtro_descricao, ativo, ultimo_boletim_id, ultimo_sync, created_at, updated_at) VALUES
('9b000001-0000-4000-8000-000000000000','c1000001-0000-4000-8000-000000000000','clt_demo_vidaplena_2026',7,'Saude - Alto Tiete',true,88421,now() - interval '2 days',now() - interval '60 days',now() - interval '2 days'),
('9b000002-0000-4000-8000-000000000000','c1000002-0000-4000-8000-000000000000','clt_demo_horizonte_2026',12,'Obras e Servicos - SP',true,88110,now() - interval '5 days',now() - interval '60 days',now() - interval '5 days'),
('9b000003-0000-4000-8000-000000000000','c1000003-0000-4000-8000-000000000000','clt_demo_serraazul_2026',9,'Alimentos - PR',false,NULL,now() - interval '40 days',now() - interval '60 days',now() - interval '40 days');
