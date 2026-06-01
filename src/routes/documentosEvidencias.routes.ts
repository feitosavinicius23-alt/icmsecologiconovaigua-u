import { Router } from "express";
import multer from "multer";
import { badRequest, sendError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { uploadEvidenceFile } from "../lib/supabaseStorage.js";
import { integerParam, optionalText, requiredText, sanitizeFilename } from "../lib/validation.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

router.post("/api/icms/documentos/evidencias", (req, res) => {
  upload.single("arquivo")(req, res, async (uploadError) => {
    if (uploadError) {
      return sendError(res, badRequest(uploadError.message), "Nao foi possivel receber o arquivo.");
    }

    try {
      if (!req.file) throw badRequest("Arquivo de evidencia obrigatorio.");

      const cicloIcmsId = integerParam(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
      const tipoDocumento = requiredText(req.body.tipoDocumento, "tipoDocumento", 80);
      const moduloOrigem = requiredText(req.body.moduloOrigem, "moduloOrigem", 80);
      const registroOrigemId = req.body.registroOrigemId
        ? integerParam(req.body.registroOrigemId, "registroOrigemId", { min: 1 })
        : null;
      const observacoes = optionalText(req.body.observacoes, 500);
      const filename = sanitizeFilename(req.file.originalname);
      const storagePath = `evidencias/${moduloOrigem}/${cicloIcmsId}/${Date.now()}-${filename}`;
      const uploaded = await uploadEvidenceFile({
        path: storagePath,
        contentType: req.file.mimetype || "application/octet-stream",
        buffer: req.file.buffer,
      }).catch(() => ({ storagePath, publicUrl: null, persisted: false }));

      const documento = await prisma.$transaction(async (tx) => {
        const created = await tx.documentos_evidencias.create({
          data: {
            ciclo_icms_id: BigInt(cicloIcmsId),
            tipo_documento: tipoDocumento,
            modulo_origem: moduloOrigem,
            registro_origem_id: registroOrigemId ? BigInt(registroOrigemId) : null,
            caminho_arquivo: uploaded.publicUrl ?? `/api/icms/documentos/evidencias/__PENDING__/arquivo`,
            status_validacao: "Pendente",
            observacoes: [
              observacoes,
              uploaded.persisted ? "Arquivo enviado ao Supabase Storage." : "Arquivo armazenado no banco de dados como fallback operacional.",
            ].filter(Boolean).join(" | ") || null,
          },
        });

        if (!uploaded.persisted) {
          await tx.documentos_arquivos.create({
            data: {
              documento_evidencia_id: created.id,
              nome_arquivo: filename,
              mime_type: req.file?.mimetype || "application/octet-stream",
              tamanho_bytes: req.file?.size || 0,
              conteudo: Uint8Array.from(req.file?.buffer || Buffer.from("")),
            },
          });

          return tx.documentos_evidencias.update({
            where: { id: created.id },
            data: { caminho_arquivo: `/api/icms/documentos/evidencias/${created.id.toString()}/arquivo` },
          });
        }

        return created;
      });

      return res.status(201).json({
        mensagem: "Evidencia registrada com sucesso.",
        resultado: {
          documentoId: Number(documento.id),
          caminhoArquivo: documento.caminho_arquivo,
          statusValidacao: documento.status_validacao,
          arquivoPersistido: uploaded.persisted,
        },
      });
    } catch (error) {
      return sendError(res, error, "Nao foi possivel registrar a evidencia.");
    }
  });
});

router.get("/api/icms/documentos/evidencias/:documentoId/arquivo", async (req, res) => {
  try {
    const documentoId = integerParam(req.params.documentoId, "documentoId", { min: 1 });
    const arquivo = await prisma.documentos_arquivos.findUnique({
      where: { documento_evidencia_id: BigInt(documentoId) },
    });

    if (!arquivo) throw badRequest("Arquivo nao encontrado para esta evidencia.");

    res.setHeader("Content-Type", arquivo.mime_type);
    res.setHeader("Content-Length", String(arquivo.tamanho_bytes));
    res.setHeader("Content-Disposition", `inline; filename="${arquivo.nome_arquivo}"`);
    return res.send(Buffer.from(arquivo.conteudo));
  } catch (error) {
    return sendError(res, error, "Nao foi possivel baixar a evidencia.");
  }
});

export default router;
