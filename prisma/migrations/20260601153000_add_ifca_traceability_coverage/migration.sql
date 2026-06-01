ALTER TABLE "unidades_conservacao"
ADD COLUMN "area_municipio_ha" DECIMAL(14,4),
ADD COLUMN "ato_criacao_documento_id" BIGINT,
ADD COLUMN "plano_manejo_documento_id" BIGINT,
ADD COLUMN "mapa_documento_id" BIGINT,
ADD COLUMN "fiscalizacao_documento_id" BIGINT;

CREATE TABLE "destinacao_final_residuos" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT NOT NULL UNIQUE,
  "tipo_destinacao" VARCHAR(60) NOT NULL,
  "unidade_destino" VARCHAR(180) NOT NULL,
  "municipio_destino" VARCHAR(120) NOT NULL,
  "operador" VARCHAR(180) NOT NULL,
  "numero_licenca" VARCHAR(100) NOT NULL,
  "validade_licenca" DATE,
  "massa_rsu_anual_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "percentual_rsu_destinado" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "tratamento_percolado" VARCHAR(40),
  "captacao_gases" VARCHAR(30),
  "possui_lixao_ativo" BOOLEAN NOT NULL DEFAULT false,
  "licenca_documento_id" BIGINT,
  "contrato_documento_id" BIGINT,
  "relatorio_pesagem_documento_id" BIGINT,
  "comprovante_recebimento_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "bacias_mananciais" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT,
  "nome" VARCHAR(180) NOT NULL,
  "area_drenagem_total_km2" DECIMAL(14,4) NOT NULL,
  "area_drenagem_municipal_km2" DECIMAL(14,4) NOT NULL,
  "fonte_cartografica" VARCHAR(180) NOT NULL,
  "abastece_fora_bacia" BOOLEAN NOT NULL DEFAULT false,
  "depende_transposicao" VARCHAR(30),
  "mapa_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "pontos_captacao_abastecimento" (
  "id" BIGSERIAL PRIMARY KEY,
  "bacia_manancial_id" BIGINT NOT NULL,
  "nome" VARCHAR(180) NOT NULL,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "vazao_captada_m3_dia" DECIMAL(14,3),
  "declaracao_documento_id" BIGINT,
  "status_validacao" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "calculo_irma_anual" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT NOT NULL UNIQUE,
  "area_drenagem_total_km2" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "area_drenagem_municipal_km2" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "percentual_area_municipal" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "pontuacao_irma" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "status_calculo" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "calculo_ifca_anual" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT NOT NULL UNIQUE,
  "nota_ies" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "nota_irs" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "nota_iea_ifm" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "nota_iqsmma" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "peso_ies" DECIMAL(6,4) NOT NULL DEFAULT 0.2000,
  "peso_irs" DECIMAL(6,4) NOT NULL DEFAULT 0.2500,
  "peso_iea_ifm" DECIMAL(6,4) NOT NULL DEFAULT 0.4500,
  "peso_iqsmma" DECIMAL(6,4) NOT NULL DEFAULT 0.1000,
  "ifca_final" DECIMAL(14,6) NOT NULL DEFAULT 0,
  "status_conformidade" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_ato_criacao_documento_id_fkey"
FOREIGN KEY ("ato_criacao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_plano_manejo_documento_id_fkey"
FOREIGN KEY ("plano_manejo_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_mapa_documento_id_fkey"
FOREIGN KEY ("mapa_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_fiscalizacao_documento_id_fkey"
FOREIGN KEY ("fiscalizacao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_ciclo_icms_id_fkey"
FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_licenca_documento_id_fkey"
FOREIGN KEY ("licenca_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_contrato_documento_id_fkey"
FOREIGN KEY ("contrato_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_relatorio_pesagem_documento_id_fkey"
FOREIGN KEY ("relatorio_pesagem_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_comprovante_recebimento_documento_id_fkey"
FOREIGN KEY ("comprovante_recebimento_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bacias_mananciais"
ADD CONSTRAINT "bacias_mananciais_ciclo_icms_id_fkey"
FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bacias_mananciais"
ADD CONSTRAINT "bacias_mananciais_mapa_documento_id_fkey"
FOREIGN KEY ("mapa_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pontos_captacao_abastecimento"
ADD CONSTRAINT "pontos_captacao_abastecimento_bacia_manancial_id_fkey"
FOREIGN KEY ("bacia_manancial_id") REFERENCES "bacias_mananciais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pontos_captacao_abastecimento"
ADD CONSTRAINT "pontos_captacao_abastecimento_declaracao_documento_id_fkey"
FOREIGN KEY ("declaracao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calculo_irma_anual"
ADD CONSTRAINT "calculo_irma_anual_ciclo_icms_id_fkey"
FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calculo_ifca_anual"
ADD CONSTRAINT "calculo_ifca_anual_ciclo_icms_id_fkey"
FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "bacias_mananciais_ciclo_icms_id_idx" ON "bacias_mananciais"("ciclo_icms_id");
CREATE INDEX "bacias_mananciais_nome_idx" ON "bacias_mananciais"("nome");
CREATE INDEX "pontos_captacao_abastecimento_bacia_manancial_id_idx" ON "pontos_captacao_abastecimento"("bacia_manancial_id");
