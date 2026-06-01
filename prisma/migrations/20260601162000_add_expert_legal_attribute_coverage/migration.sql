CREATE TABLE "condema_municipal" (
  "id" BIGSERIAL PRIMARY KEY,
  "ciclo_icms_id" BIGINT NOT NULL UNIQUE,
  "lei_criacao_numero" VARCHAR(80),
  "lei_criacao_data" DATE,
  "lei_criacao_documento_id" BIGINT,
  "decreto_nomeacao_numero" VARCHAR(80),
  "decreto_nomeacao_data" DATE,
  "decreto_nomeacao_documento_id" BIGINT,
  "mandato_inicio" DATE,
  "mandato_fim" DATE,
  "status_funcionamento" VARCHAR(30) NOT NULL DEFAULT 'Pendente',
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "atas_reunioes"
ADD COLUMN "carater_reuniao" VARCHAR(30),
ADD COLUMN "quorum_governamental" INTEGER,
ADD COLUMN "quorum_nao_governamental" INTEGER;

ALTER TABLE "fundo_municipal_meio_ambiente"
ADD COLUMN "cnpj_fundo" VARCHAR(18),
ADD COLUMN "banco_nome" VARCHAR(120),
ADD COLUMN "agencia" VARCHAR(20),
ADD COLUMN "conta_bancaria" VARCHAR(30),
ADD COLUMN "receita_anual_arrecadada" DECIMAL(14,2),
ADD COLUMN "despesa_anual_executada" DECIMAL(14,2),
ADD COLUMN "balanco_anual_documento_id" BIGINT,
ADD COLUMN "execucao_financeira_documento_id" BIGINT;

ALTER TABLE "destinacao_final_residuos"
ADD COLUMN "volume_total_rsu_gerado_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
ADD COLUMN "volume_rejeitos_destinados_t" DECIMAL(14,3) NOT NULL DEFAULT 0,
ADD COLUMN "cnpj_aterro_receptor" VARCHAR(18),
ADD COLUMN "cdf_mtr_documento_id" BIGINT,
ADD COLUMN "laudo_inexistencia_lixao_documento_id" BIGINT;

ALTER TABLE "coleta_seletiva"
ADD COLUMN "cnpj_cooperativa" VARCHAR(18),
ADD COLUMN "numero_catadores_cooperados" INTEGER,
ADD COLUMN "termo_colaboracao_documento_id" BIGINT;

ALTER TABLE "estacoes_tratamento_esgoto"
ADD COLUMN "vazao_media_projeto_m3_dia" DECIMAL(14,3),
ADD COLUMN "vazao_real_operada_m3_dia" DECIMAL(14,3);

ALTER TABLE "laudos_eficiencia_ete"
ADD COLUMN "dbo_afluente_mg_l" DECIMAL(10,2),
ADD COLUMN "dbo_efluente_mg_l" DECIMAL(10,2);

ALTER TABLE "unidades_conservacao"
ADD COLUMN "area_total_ha" DECIMAL(14,4),
ADD COLUMN "plano_manejo_data_publicacao" DATE,
ADD COLUMN "memorial_descritivo_documento_id" BIGINT,
ADD COLUMN "shapefile_documento_id" BIGINT,
ADD COLUMN "investimento_gestao_documento_id" BIGINT;

ALTER TABLE "bacias_mananciais"
ADD COLUMN "area_total_bacia_ha" DECIMAL(14,4),
ADD COLUMN "area_protecao_municipal_ha" DECIMAL(14,4),
ADD COLUMN "populacao_dependente" INTEGER,
ADD COLUMN "ato_legal_documento_id" BIGINT;

ALTER TABLE "condema_municipal"
ADD CONSTRAINT "condema_municipal_ciclo_icms_id_fkey"
FOREIGN KEY ("ciclo_icms_id") REFERENCES "ciclos_icms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "condema_municipal"
ADD CONSTRAINT "condema_municipal_lei_criacao_documento_id_fkey"
FOREIGN KEY ("lei_criacao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "condema_municipal"
ADD CONSTRAINT "condema_municipal_decreto_nomeacao_documento_id_fkey"
FOREIGN KEY ("decreto_nomeacao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fundo_municipal_meio_ambiente"
ADD CONSTRAINT "fundo_municipal_meio_ambiente_balanco_anual_documento_id_fkey"
FOREIGN KEY ("balanco_anual_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fundo_municipal_meio_ambiente"
ADD CONSTRAINT "fundo_municipal_meio_ambiente_execucao_financeira_documento_id_fkey"
FOREIGN KEY ("execucao_financeira_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_cdf_mtr_documento_id_fkey"
FOREIGN KEY ("cdf_mtr_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "destinacao_final_residuos"
ADD CONSTRAINT "destinacao_final_residuos_laudo_inexistencia_lixao_documento_id_fkey"
FOREIGN KEY ("laudo_inexistencia_lixao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coleta_seletiva"
ADD CONSTRAINT "coleta_seletiva_termo_colaboracao_documento_id_fkey"
FOREIGN KEY ("termo_colaboracao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_memorial_descritivo_documento_id_fkey"
FOREIGN KEY ("memorial_descritivo_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_shapefile_documento_id_fkey"
FOREIGN KEY ("shapefile_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unidades_conservacao"
ADD CONSTRAINT "unidades_conservacao_investimento_gestao_documento_id_fkey"
FOREIGN KEY ("investimento_gestao_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bacias_mananciais"
ADD CONSTRAINT "bacias_mananciais_ato_legal_documento_id_fkey"
FOREIGN KEY ("ato_legal_documento_id") REFERENCES "documentos_evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
