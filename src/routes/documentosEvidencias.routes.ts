import { Router } from "express";
import multer from "multer";
import { badRequest, sendError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
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

      const documento = await prisma.documentos_evidencias.create({
        data: {
          ciclo_icms_id: BigInt(cicloIcmsId),
          tipo_documento: tipoDocumento,
          modulo_origem: moduloOrigem,
          registro_origem_id: registroOrigemId ? BigInt(registroOrigemId) : null,
          caminho_arquivo: `evidencias/${moduloOrigem}/${Date.now()}-${filename}`,
          status_validacao: "Pendente",
          observacoes,
        },
      });

      return res.status(201).json({
        mensagem: "Evidencia registrada com sucesso.",
        resultado: {
          documentoId: Number(documento.id),
          caminhoArquivo: documento.caminho_arquivo,
          statusValidacao: documento.status_validacao,
        },
      });
    } catch (error) {
      return sendError(res, error, "Nao foi possivel registrar a evidencia.");
    }
  });
});

export default router;
