CREATE TABLE "municipios" (
  "id" BIGSERIAL PRIMARY KEY,
  "nome" VARCHAR(150) NOT NULL,
  "codigo_ibge" VARCHAR(20),
  "uf" VARCHAR(2) NOT NULL DEFAULT 'RJ',
  "cnpj_prefeitura" VARCHAR(18),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipios_nome_uf_key" UNIQUE ("nome", "uf")
);

CREATE TABLE "modulos_sistema" (
  "id" BIGSERIAL PRIMARY KEY,
  "codigo" VARCHAR(80) NOT NULL UNIQUE,
  "nome" VARCHAR(180) NOT NULL,
  "eixo_ifca" VARCHAR(80) NOT NULL,
  "peso" DECIMAL(6,4),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "formularios_digitais" (
  "id" BIGSERIAL PRIMARY KEY,
  "modulo_codigo" VARCHAR(80) NOT NULL,
  "codigo" VARCHAR(100) NOT NULL UNIQUE,
  "titulo" VARCHAR(180) NOT NULL,
  "versao" VARCHAR(20) NOT NULL DEFAULT '1.0',
  "schema_json" JSONB NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "respostas_formularios" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "municipio_id" BIGINT,
  "formulario_codigo" VARCHAR(100) NOT NULL,
  "usuario_id" BIGINT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'Rascunho',
  "resposta_json" JSONB NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "checklists_formularios" (
  "id" BIGSERIAL PRIMARY KEY,
  "resposta_formulario_id" BIGINT,
  "item" VARCHAR(220) NOT NULL,
  "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
  "completo" BOOLEAN NOT NULL DEFAULT false,
  "documento_exigido" BOOLEAN NOT NULL DEFAULT false,
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "pontuacoes_estimadas" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "municipio_id" BIGINT,
  "eixo" VARCHAR(80) NOT NULL,
  "peso" DECIMAL(6,4) NOT NULL,
  "nota_estimada" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "impacto_pendente" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "pendencias_json" JSONB,
  "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "historico_alteracoes" (
  "id" BIGSERIAL PRIMARY KEY,
  "usuario_id" BIGINT,
  "entidade" VARCHAR(120) NOT NULL,
  "entidade_id" BIGINT,
  "acao" VARCHAR(60) NOT NULL,
  "antes_json" JSONB,
  "depois_json" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "comentarios_internos" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "modulo_codigo" VARCHAR(80) NOT NULL,
  "usuario_id" BIGINT,
  "comentario" TEXT NOT NULL,
  "resolvido" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "consorcios_intermunicipais_residuos" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "participa_consorcio" BOOLEAN NOT NULL DEFAULT false,
  "nome_consorcio" VARCHAR(180),
  "cnpj_consorcio" VARCHAR(18),
  "data_adesao" DATE,
  "contrato_rateio_numero" VARCHAR(100),
  "documento_formacao_id" BIGINT,
  "protocolo_intencoes_documento_id" BIGINT,
  "estatuto_documento_id" BIGINT,
  "lei_autorizativa_documento_id" BIGINT,
  "cnpj_documento_id" BIGINT,
  "contrato_rateio_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "remediacao_vazadouros" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "existe_vazadouro" BOOLEAN NOT NULL DEFAULT false,
  "estagio" VARCHAR(40) NOT NULL,
  "possui_lar_valida" BOOLEAN NOT NULL DEFAULT false,
  "numero_licenca" VARCHAR(100),
  "validade_licenca" DATE,
  "descricao_obras" TEXT,
  "cronograma" TEXT,
  "ano_execucao" INTEGER,
  "responsavel_tecnico" VARCHAR(180),
  "lar_documento_id" BIGINT,
  "condicionantes_documento_id" BIGINT,
  "projeto_remediacao_documento_id" BIGINT,
  "cronograma_documento_id" BIGINT,
  "monitoramento_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "rppn_unidades_privadas" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "nome" VARCHAR(180) NOT NULL,
  "proprietario" VARCHAR(180),
  "area_ha" DECIMAL(14,4),
  "municipio" VARCHAR(120),
  "ato_reconhecimento" VARCHAR(180),
  "status_plano_manejo" VARCHAR(40),
  "acoes_conservacao" TEXT,
  "fiscalizacao" TEXT,
  "pesquisa" TEXT,
  "educacao_ambiental" TEXT,
  "infraestrutura" TEXT,
  "ato_documento_id" BIGINT,
  "mapa_documento_id" BIGINT,
  "plano_manejo_documento_id" BIGINT,
  "relatorio_atividades_documento_id" BIGINT,
  "fotos_documento_id" BIGINT,
  "documentos_comprobatorios_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "programas_seguranca_hidrica" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "possui_acoes" BOOLEAN NOT NULL DEFAULT false,
  "estagio_acoes" VARCHAR(40),
  "politica_municipal_publicada" BOOLEAN NOT NULL DEFAULT false,
  "programa_municipal_publicado" BOOLEAN NOT NULL DEFAULT false,
  "objetivos_json" JSONB,
  "politica_documento_id" BIGINT,
  "programa_documento_id" BIGINT,
  "diario_oficial_documento_id" BIGINT,
  "termo_referencia_documento_id" BIGINT,
  "relatorios_documento_id" BIGINT,
  "projetos_documento_id" BIGINT,
  "comprovantes_acoes_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "respostas_formularios_ciclo_icms_id_idx" ON "respostas_formularios"("ciclo_icms_id");
CREATE INDEX "respostas_formularios_formulario_codigo_status_idx" ON "respostas_formularios"("formulario_codigo", "status");
CREATE INDEX "checklists_formularios_resposta_formulario_id_idx" ON "checklists_formularios"("resposta_formulario_id");
CREATE INDEX "checklists_formularios_completo_obrigatorio_idx" ON "checklists_formularios"("completo", "obrigatorio");
CREATE INDEX "pontuacoes_estimadas_ciclo_icms_id_eixo_idx" ON "pontuacoes_estimadas"("ciclo_icms_id", "eixo");
CREATE INDEX "historico_alteracoes_entidade_entidade_id_idx" ON "historico_alteracoes"("entidade", "entidade_id");
CREATE INDEX "comentarios_internos_ciclo_icms_id_modulo_codigo_idx" ON "comentarios_internos"("ciclo_icms_id", "modulo_codigo");
CREATE INDEX "consorcios_intermunicipais_residuos_ciclo_icms_id_idx" ON "consorcios_intermunicipais_residuos"("ciclo_icms_id");
CREATE INDEX "remediacao_vazadouros_ciclo_icms_id_idx" ON "remediacao_vazadouros"("ciclo_icms_id");
CREATE INDEX "rppn_unidades_privadas_ciclo_icms_id_idx" ON "rppn_unidades_privadas"("ciclo_icms_id");
CREATE INDEX "programas_seguranca_hidrica_ciclo_icms_id_idx" ON "programas_seguranca_hidrica"("ciclo_icms_id");
