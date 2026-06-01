-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ciclos_icms" (
    "id" BIGSERIAL NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "ano_envio" INTEGER NOT NULL,
    "data_limite_envio" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Em preparacao',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciclos_icms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cargo" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nivel_acesso" VARCHAR(30) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_evidencias" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT,
    "tipo_documento" VARCHAR(80) NOT NULL,
    "modulo_origem" VARCHAR(80) NOT NULL,
    "registro_origem_id" BIGINT,
    "caminho_arquivo" TEXT NOT NULL,
    "data_documento" DATE,
    "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_conservacao" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(180) NOT NULL,
    "categoria" VARCHAR(10) NOT NULL,
    "esfera" VARCHAR(20) NOT NULL,
    "status_plano_manejo" VARCHAR(30) NOT NULL,
    "status_conselho_gestor" VARCHAR(30) NOT NULL,
    "observacoes" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_conservacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atas_reunioes" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT,
    "tipo_vinculo" VARCHAR(20) NOT NULL,
    "unidade_conservacao_id" BIGINT,
    "orgao_colegiado" VARCHAR(40) NOT NULL,
    "data_reuniao" DATE NOT NULL,
    "numero_ata" VARCHAR(50) NOT NULL,
    "caminho_pdf" TEXT NOT NULL,
    "documento_evidencia_id" BIGINT,
    "assunto_principal" VARCHAR(180),
    "aborda_saneamento" BOOLEAN NOT NULL DEFAULT false,
    "aborda_pmsb" BOOLEAN NOT NULL DEFAULT false,
    "aborda_uc" BOOLEAN NOT NULL DEFAULT false,
    "aborda_licenciamento" BOOLEAN NOT NULL DEFAULT false,
    "lista_presenca_documento_id" BIGINT,
    "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "validada_para_iqsmma" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atas_reunioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coleta_seletiva" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT,
    "ano_referencia" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "nome_cooperativa" VARCHAR(180) NOT NULL,
    "peso_papel_t" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "peso_plastico_t" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "peso_vidro_t" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "peso_metal_t" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "caminho_mtr_ou_nota_fiscal" TEXT NOT NULL,
    "documento_evidencia_id" BIGINT,
    "status_dado" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coleta_seletiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estacoes_tratamento_esgoto" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(180) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "endereco" TEXT,
    "operador" VARCHAR(150),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "inicio_operacao_mes" INTEGER,
    "inicio_operacao_ano" INTEGER,
    "nivel_tratamento" VARCHAR(30) NOT NULL,
    "vazao_media_m3_dia" DECIMAL(14,3),
    "vazao_maxima_projeto_m3_dia" DECIMAL(14,3),
    "populacao_atendida" INTEGER NOT NULL DEFAULT 0,
    "populacao_urbana_referencia" INTEGER NOT NULL DEFAULT 0,
    "vinculada_procon_agua" BOOLEAN NOT NULL DEFAULT false,
    "status_operacao" VARCHAR(30) NOT NULL DEFAULT 'Ativa',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estacoes_tratamento_esgoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencas_ambientais_ete" (
    "id" BIGSERIAL NOT NULL,
    "estacao_tratamento_esgoto_id" BIGINT NOT NULL,
    "tipo_licenca" VARCHAR(60) NOT NULL,
    "numero_licenca" VARCHAR(80) NOT NULL,
    "data_emissao" DATE,
    "data_validade" DATE,
    "status_licenca" VARCHAR(30) NOT NULL,
    "protocolo_renovacao" VARCHAR(100),
    "data_protocolo_renovacao" DATE,
    "documento_evidencia_id" BIGINT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licencas_ambientais_ete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laudos_eficiencia_ete" (
    "id" BIGSERIAL NOT NULL,
    "estacao_tratamento_esgoto_id" BIGINT NOT NULL,
    "ciclo_icms_id" BIGINT NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "eficiencia_remocao_dbo_percentual" DECIMAL(5,2) NOT NULL,
    "laboratorio" VARCHAR(180),
    "laboratorio_credenciado_inea" BOOLEAN NOT NULL DEFAULT false,
    "certificado_credenciamento_documento_id" BIGINT,
    "laudo_documento_id" BIGINT,
    "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laudos_eficiencia_ete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculo_ite_anual" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT NOT NULL,
    "estacao_tratamento_esgoto_id" BIGINT NOT NULL,
    "percentual_populacao_atendida" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "fator_tratamento" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "re_relatorio_eficiencia" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "pontuacao_parcial" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "status_calculo" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculo_ite_anual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculo_irs_anual" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT NOT NULL,
    "total_rsu_anual_t" DECIMAL(14,3) NOT NULL,
    "tipo_sistema" VARCHAR(20) NOT NULL,
    "total_papel_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "total_plastico_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "total_vidro_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "total_metal_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "total_reciclaveis_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "percentual_reciclagem" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "fator_reciclagem" INTEGER NOT NULL DEFAULT 0,
    "status_calculo" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculo_irs_anual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundo_municipal_meio_ambiente" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT NOT NULL,
    "possui_fundo" BOOLEAN NOT NULL DEFAULT false,
    "lei_criacao_numero" VARCHAR(80),
    "lei_criacao_data" DATE,
    "lei_criacao_documento_id" BIGINT,
    "possui_lei_repasse_icms_ecologico" BOOLEAN NOT NULL DEFAULT false,
    "norma_repasse_tipo" VARCHAR(30),
    "norma_repasse_numero" VARCHAR(80),
    "norma_repasse_data_publicacao" DATE,
    "norma_repasse_documento_id" BIGINT,
    "percentual_repasse_previsto" DECIMAL(6,3),
    "status_iqsmma" VARCHAR(40) NOT NULL DEFAULT 'Nao implementado',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundo_municipal_meio_ambiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repasses_fundo_municipal" (
    "id" BIGSERIAL NOT NULL,
    "fundo_municipal_id" BIGINT NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "valor_repassado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "percentual_repassado" DECIMAL(6,3),
    "extrato_documento_id" BIGINT,
    "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repasses_fundo_municipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_pendencias" (
    "id" BIGSERIAL NOT NULL,
    "ciclo_icms_id" BIGINT,
    "titulo" VARCHAR(180) NOT NULL,
    "descricao" TEXT NOT NULL,
    "nivel_impacto_ifca" VARCHAR(10) NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    "responsavel_usuario_id" BIGINT,
    "unidade_conservacao_id" BIGINT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "alertas_pendencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_icms_ano_referencia_key" ON "ciclos_icms"("ano_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "documentos_evidencias_ciclo_icms_id_idx" ON "documentos_evidencias"("ciclo_icms_id");

-- CreateIndex
CREATE INDEX "documentos_evidencias_modulo_origem_registro_origem_id_idx" ON "documentos_evidencias"("modulo_origem", "registro_origem_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_conservacao_nome_key" ON "unidades_conservacao"("nome");

-- CreateIndex
CREATE INDEX "atas_reunioes_ciclo_icms_id_idx" ON "atas_reunioes"("ciclo_icms_id");

-- CreateIndex
CREATE INDEX "atas_reunioes_unidade_conservacao_id_idx" ON "atas_reunioes"("unidade_conservacao_id");

-- CreateIndex
CREATE INDEX "atas_reunioes_data_reuniao_idx" ON "atas_reunioes"("data_reuniao");

-- CreateIndex
CREATE INDEX "atas_reunioes_orgao_colegiado_validada_para_iqsmma_status_v_idx" ON "atas_reunioes"("orgao_colegiado", "validada_para_iqsmma", "status_validacao");

-- CreateIndex
CREATE UNIQUE INDEX "atas_reunioes_tipo_vinculo_unidade_conservacao_id_numero_at_key" ON "atas_reunioes"("tipo_vinculo", "unidade_conservacao_id", "numero_ata", "data_reuniao");

-- CreateIndex
CREATE INDEX "coleta_seletiva_ano_referencia_mes_referencia_idx" ON "coleta_seletiva"("ano_referencia", "mes_referencia");

-- CreateIndex
CREATE INDEX "coleta_seletiva_status_dado_idx" ON "coleta_seletiva"("status_dado");

-- CreateIndex
CREATE UNIQUE INDEX "coleta_seletiva_ano_referencia_mes_referencia_nome_cooperat_key" ON "coleta_seletiva"("ano_referencia", "mes_referencia", "nome_cooperativa");

-- CreateIndex
CREATE UNIQUE INDEX "estacoes_tratamento_esgoto_nome_key" ON "estacoes_tratamento_esgoto"("nome");

-- CreateIndex
CREATE INDEX "estacoes_tratamento_esgoto_nivel_tratamento_idx" ON "estacoes_tratamento_esgoto"("nivel_tratamento");

-- CreateIndex
CREATE UNIQUE INDEX "licencas_ambientais_ete_estacao_tratamento_esgoto_id_numero_key" ON "licencas_ambientais_ete"("estacao_tratamento_esgoto_id", "numero_licenca");

-- CreateIndex
CREATE INDEX "laudos_eficiencia_ete_estacao_tratamento_esgoto_id_ciclo_ic_idx" ON "laudos_eficiencia_ete"("estacao_tratamento_esgoto_id", "ciclo_icms_id");

-- CreateIndex
CREATE UNIQUE INDEX "laudos_eficiencia_ete_estacao_tratamento_esgoto_id_ciclo_ic_key" ON "laudos_eficiencia_ete"("estacao_tratamento_esgoto_id", "ciclo_icms_id", "mes_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "calculo_ite_anual_ciclo_icms_id_estacao_tratamento_esgoto_i_key" ON "calculo_ite_anual"("ciclo_icms_id", "estacao_tratamento_esgoto_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculo_irs_anual_ciclo_icms_id_key" ON "calculo_irs_anual"("ciclo_icms_id");

-- CreateIndex
CREATE UNIQUE INDEX "fundo_municipal_meio_ambiente_ciclo_icms_id_key" ON "fundo_municipal_meio_ambiente"("ciclo_icms_id");

-- CreateIndex
CREATE UNIQUE INDEX "repasses_fundo_municipal_fundo_municipal_id_mes_referencia_key" ON "repasses_fundo_municipal"("fundo_municipal_id", "mes_referencia");

-- CreateIndex
CREATE INDEX "alertas_pendencias_data_vencimento_idx" ON "alertas_pendencias"("data_vencimento");

-- CreateIndex
CREATE INDEX "alertas_pendencias_status_nivel_impacto_ifca_idx" ON "alertas_pendencias"("status", "nivel_impacto_ifca");

-- AddForeignKey
ALTER TABLE "documentos_evidencias" ADD CONSTRAINT "documentos_evidencias_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atas_reunioes" ADD CONSTRAINT "atas_reunioes_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atas_reunioes" ADD CONSTRAINT "atas_reunioes_unidade_conservacao_id_fkey" FOREIGN KEY ("unidade_conservacao_id") REFERENCES "unidades_conservacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atas_reunioes" ADD CONSTRAINT "atas_reunioes_documento_evidencia_id_fkey" FOREIGN KEY ("documento_evidencia_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atas_reunioes" ADD CONSTRAINT "atas_reunioes_lista_presenca_documento_id_fkey" FOREIGN KEY ("lista_presenca_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coleta_seletiva" ADD CONSTRAINT "coleta_seletiva_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coleta_seletiva" ADD CONSTRAINT "coleta_seletiva_documento_evidencia_id_fkey" FOREIGN KEY ("documento_evidencia_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencas_ambientais_ete" ADD CONSTRAINT "licencas_ambientais_ete_estacao_tratamento_esgoto_id_fkey" FOREIGN KEY ("estacao_tratamento_esgoto_id") REFERENCES "estacoes_tratamento_esgoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencas_ambientais_ete" ADD CONSTRAINT "licencas_ambientais_ete_documento_evidencia_id_fkey" FOREIGN KEY ("documento_evidencia_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos_eficiencia_ete" ADD CONSTRAINT "laudos_eficiencia_ete_estacao_tratamento_esgoto_id_fkey" FOREIGN KEY ("estacao_tratamento_esgoto_id") REFERENCES "estacoes_tratamento_esgoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos_eficiencia_ete" ADD CONSTRAINT "laudos_eficiencia_ete_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos_eficiencia_ete" ADD CONSTRAINT "laudos_eficiencia_ete_certificado_credenciamento_documento_fkey" FOREIGN KEY ("certificado_credenciamento_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laudos_eficiencia_ete" ADD CONSTRAINT "laudos_eficiencia_ete_laudo_documento_id_fkey" FOREIGN KEY ("laudo_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_ite_anual" ADD CONSTRAINT "calculo_ite_anual_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_ite_anual" ADD CONSTRAINT "calculo_ite_anual_estacao_tratamento_esgoto_id_fkey" FOREIGN KEY ("estacao_tratamento_esgoto_id") REFERENCES "estacoes_tratamento_esgoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_irs_anual" ADD CONSTRAINT "calculo_irs_anual_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundo_municipal_meio_ambiente" ADD CONSTRAINT "fundo_municipal_meio_ambiente_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundo_municipal_meio_ambiente" ADD CONSTRAINT "fundo_municipal_meio_ambiente_lei_criacao_documento_id_fkey" FOREIGN KEY ("lei_criacao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundo_municipal_meio_ambiente" ADD CONSTRAINT "fundo_municipal_meio_ambiente_norma_repasse_documento_id_fkey" FOREIGN KEY ("norma_repasse_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_fundo_municipal" ADD CONSTRAINT "repasses_fundo_municipal_fundo_municipal_id_fkey" FOREIGN KEY ("fundo_municipal_id") REFERENCES "fundo_municipal_meio_ambiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_fundo_municipal" ADD CONSTRAINT "repasses_fundo_municipal_extrato_documento_id_fkey" FOREIGN KEY ("extrato_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_pendencias" ADD CONSTRAINT "alertas_pendencias_ciclo_icms_id_fkey" FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_pendencias" ADD CONSTRAINT "alertas_pendencias_responsavel_usuario_id_fkey" FOREIGN KEY ("responsavel_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_pendencias" ADD CONSTRAINT "alertas_pendencias_unidade_conservacao_id_fkey" FOREIGN KEY ("unidade_conservacao_id") REFERENCES "unidades_conservacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

