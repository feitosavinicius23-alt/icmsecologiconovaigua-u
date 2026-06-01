import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import {
  calcularITEMunicipalConsolidado,
  calcularITEPorEstacao,
  obterResultadoITEMunicipalConsolidado,
} from "../services/calculoIte.service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/api/icms/esgoto/calcular-estacao", async (req, res) => {
  try {
    const cicloIcmsId = Number(req.body.cicloIcmsId);
    const estacaoTratamentoEsgotoId = Number(req.body.estacaoTratamentoEsgotoId);

    if (!Number.isInteger(cicloIcmsId) || !Number.isInteger(estacaoTratamentoEsgotoId)) {
      return res.status(400).json({ erro: "Informe cicloIcmsId e estacaoTratamentoEsgotoId validos." });
    }

    const resultado = await calcularITEPorEstacao({ cicloIcmsId, estacaoTratamentoEsgotoId });
    return res.status(200).json({ mensagem: "Calculo da ETE realizado com sucesso.", resultado });
  } catch (error) {
    return res.status(422).json({
      erro: "Nao foi possivel calcular a ETE.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

router.post("/api/icms/esgoto/calcular-consolidado/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = Number(req.params.cicloId);
    if (!Number.isInteger(cicloIcmsId)) return res.status(400).json({ erro: "cicloId invalido." });
    const resultado = await calcularITEMunicipalConsolidado(cicloIcmsId);
    return res.status(200).json({ mensagem: "Calculo consolidado municipal realizado com sucesso.", resultado });
  } catch (error) {
    return res.status(422).json({
      erro: "Nao foi possivel calcular o consolidado municipal.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

router.get("/api/icms/esgoto/resultado-consolidado/:cicloId", async (req, res) => {
  try {
    const cicloIcmsId = Number(req.params.cicloId);
    if (!Number.isInteger(cicloIcmsId)) return res.status(400).json({ erro: "cicloId invalido." });
    const resultado = await obterResultadoITEMunicipalConsolidado(cicloIcmsId);
    return res.status(200).json({ resultado });
  } catch (error) {
    return res.status(500).json({
      erro: "Nao foi possivel carregar o resultado consolidado.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

router.post("/api/icms/esgoto/laudos", upload.single("arquivoLaudo"), async (req, res) => {
  try {
    const cicloIcmsId = Number(req.body.cicloIcmsId);
    const estacaoTratamentoEsgotoId = Number(req.body.estacaoTratamentoEsgotoId);
    const mesReferencia = Number(req.body.mesReferencia);
    const eficiencia = Number(req.body.eficienciaRemocaoDboPercentual);
    const laboratorio = String(req.body.laboratorio ?? "").trim();
    const laboratorioCredenciadoInea = String(req.body.laboratorioCredenciadoInea) === "true";

    if (!Number.isInteger(cicloIcmsId) || !Number.isInteger(estacaoTratamentoEsgotoId)) {
      return res.status(400).json({ erro: "cicloIcmsId ou estacaoTratamentoEsgotoId invalido." });
    }
    if (!Number.isInteger(mesReferencia) || mesReferencia < 1 || mesReferencia > 12) {
      return res.status(400).json({ erro: "Mes de referencia invalido." });
    }
    if (!Number.isFinite(eficiencia) || eficiencia < 0 || eficiencia > 100) {
      return res.status(400).json({ erro: "Eficiencia de DBO deve estar entre 0 e 100." });
    }
    if (!req.file) return res.status(400).json({ erro: "Anexe o PDF do laudo tecnico." });

    const documento = await prisma.documentos_evidencias.create({
      data: {
        ciclo_icms_id: BigInt(cicloIcmsId),
        tipo_documento: "Laudo de Eficiencia DBO",
        modulo_origem: "Esgotamento Sanitario",
        caminho_arquivo: `uploads/laudos/${Date.now()}-${req.file.originalname}`,
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
    return res.status(500).json({
      erro: "Nao foi possivel salvar o laudo.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

export default router;
