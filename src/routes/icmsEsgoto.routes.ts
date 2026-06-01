import { Router } from "express";
import multer from "multer";
import { badRequest, sendError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  decimalNumber,
  integerParam,
  requiredText,
  sanitizeFilename,
} from "../lib/validation.js";
import {
  calcularITEMunicipalConsolidado,
  calcularITEPorEstacao,
  obterResultadoITEMunicipalConsolidado,
} from "../services/calculoIte.service.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Apenas arquivos PDF sao aceitos para laudos tecnicos."));
    }
    return cb(null, true);
  },
});

router.post("/api/icms/esgoto/calcular-estacao", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const estacaoTratamentoEsgotoId = integerParam(req.body.estacaoTratamentoEsgotoId, "estacaoTratamentoEsgotoId", { min: 1 });

    const resultado = await calcularITEPorEstacao({ cicloIcmsId, estacaoTratamentoEsgotoId });
    return res.status(200).json({ mensagem: "Calculo da ETE realizado com sucesso.", resultado });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel calcular a ETE.", 422);
  }
});

router.post("/api/icms/esgoto/calcular-consolidado/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.params.cicloId, "cicloId", { min: 1 });
    const resultado = await calcularITEMunicipalConsolidado(cicloIcmsId);
    return res.status(200).json({ mensagem: "Calculo consolidado municipal realizado com sucesso.", resultado });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel calcular o consolidado municipal.", 422);
  }
});

router.get("/api/icms/esgoto/resultado-consolidado/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.params.cicloId, "cicloId", { min: 1 });
    const resultado = await obterResultadoITEMunicipalConsolidado(cicloIcmsId);
    return res.status(200).json({ resultado });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel carregar o resultado consolidado.");
  }
});

router.post("/api/icms/esgoto/laudos", (req, res) => {
  upload.single("arquivoLaudo")(req, res, async (uploadError) => {
    if (uploadError) {
      return sendError(res, badRequest(uploadError.message), "Nao foi possivel receber o arquivo do laudo.");
    }

    try {
      const cicloIcmsId = integerParam(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
      const estacaoTratamentoEsgotoId = integerParam(req.body.estacaoTratamentoEsgotoId, "estacaoTratamentoEsgotoId", { min: 1 });
      const mesReferencia = integerParam(req.body.mesReferencia, "mesReferencia", { min: 1, max: 12 });
      const eficiencia = decimalNumber(req.body.eficienciaRemocaoDboPercentual, "eficienciaRemocaoDboPercentual", { min: 0, max: 100 });
      const laboratorio = requiredText(req.body.laboratorio, "laboratorio", 180);
      const laboratorioCredenciadoInea = String(req.body.laboratorioCredenciadoInea) === "true";

      if (!req.file) return res.status(400).json({ erro: "Anexe o PDF do laudo tecnico." });
      const filename = sanitizeFilename(req.file.originalname);

      const documento = await prisma.documentos_evidencias.create({
        data: {
          ciclo_icms_id: BigInt(cicloIcmsId),
          tipo_documento: "Laudo de Eficiencia DBO",
          modulo_origem: "Esgotamento Sanitario",
          caminho_arquivo: `uploads/laudos/${Date.now()}-${filename}`,
          status_validacao: "Pendente",
        },
      });

      const laudo = await prisma.laudos_eficiencia_ete.upsert({
        where: {
          estacao_tratamento_esgoto_id_ciclo_icms_id_mes_referencia: {
            estacao_tratamento_esgoto_id: BigInt(estacaoTratamentoEsgotoId),
            ciclo_icms_id: BigInt(cicloIcmsId),
            mes_referencia: mesReferencia,
          },
        },
        create: {
          estacao_tratamento_esgoto_id: BigInt(estacaoTratamentoEsgotoId),
          ciclo_icms_id: BigInt(cicloIcmsId),
          mes_referencia: mesReferencia,
          eficiencia_remocao_dbo_percentual: eficiencia,
          laboratorio,
          laboratorio_credenciado_inea: laboratorioCredenciadoInea,
          laudo_documento_id: documento.id,
          status_validacao: "Pendente",
        },
        update: {
          eficiencia_remocao_dbo_percentual: eficiencia,
          laboratorio,
          laboratorio_credenciado_inea: laboratorioCredenciadoInea,
          laudo_documento_id: documento.id,
          status_validacao: "Pendente",
        },
      });

      return res.status(201).json({
        mensagem: "Laudo mensal cadastrado com sucesso.",
        resultado: { laudoId: Number(laudo.id), documentoId: Number(documento.id) },
      });
    } catch (error) {
      return sendError(res, error, "Nao foi possivel salvar o laudo.");
    }
  });
});

export default router;
