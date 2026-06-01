CREATE TABLE "documentos_arquivos" (
  "id" BIGSERIAL PRIMARY KEY,
  "documento_evidencia_id" BIGINT NOT NULL UNIQUE,
  "nome_arquivo" VARCHAR(180) NOT NULL,
  "mime_type" VARCHAR(120) NOT NULL,
  "tamanho_bytes" INTEGER NOT NULL,
  "conteudo" BYTEA NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documentos_arquivos_documento_evidencia_id_fkey"
    FOREIGN KEY ("documento_evidencia_id")
    REFERENCES "documentos_evidencias"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

