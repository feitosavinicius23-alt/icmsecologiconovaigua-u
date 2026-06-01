import { Router } from "express";
import { badRequest, sendError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  decimalNumber,
  enumValue,
  integerParam,
  optionalInteger,
  optionalText,
  requiredText,
} from "../lib/validation.js";
import { calcularFRMunicipal, TipoSistemaColeta } from "../services/calculoResiduos.service.js";

const router = Router();

router.post("/api/icms/residuos/coleta-seletiva", async (req, res) => {
  try {
    const ano = integerParam(req.body.anoReferencia, "anoReferencia", { min: 2007 });
    const mes = integerParam(req.body.mesReferencia, "mesReferencia", { min: 1, max: 12 });
    const nomeCooperativa = requiredText(req.body.nomeCooperativa, "nomeCooperativa", 180);
    const caminhoMtrOuNotaFiscal = requiredText(req.body.caminhoMtrOuNotaFiscal, "caminhoMtrOuNotaFiscal", 500);
    const cicloIcmsId = optionalInteger(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const documentoEvidenciaId = optionalInteger(req.body.documentoEvidenciaId, "documentoEvidenciaId", { min: 1 });

    const pesos = {
      papel: decimalNumber(req.body.pesoPapelT, "pesoPapelT", { min: 0 }),
      plastico: decimalNumber(req.body.pesoPlasticoT, "pesoPlasticoT", { min: 0 }),
      vidro: decimalNumber(req.body.pesoVidroT, "pesoVidroT", { min: 0 }),
      metal: decimalNumber(req.body.pesoMetalT, "pesoMetalT", { min: 0 }),
    };

    const coleta = await prisma.coleta_seletiva.upsert({
      where: {
        ano_referencia_mes_referencia_nome_cooperativa: {
          ano_referencia: ano,
          mes_referencia: mes,
          nome_cooperativa: nomeCooperativa,
        },
      },
      create: {
        ciclo_icms_id: cicloIcmsId ? BigInt(cicloIcmsId) : null,
        ano_referencia: ano,
        mes_referencia: mes,
        nome_cooperativa: nomeCooperativa,
        peso_papel_t: pesos.papel,
        peso_plastico_t: pesos.plastico,
        peso_vidro_t: pesos.vidro,
        peso_metal_t: pesos.metal,
        caminho_mtr_ou_nota_fiscal: caminhoMtrOuNotaFiscal,
        documento_evidencia_id: documentoEvidenciaId ? BigInt(documentoEvidenciaId) : null,
        status_dado: "Pendente",
        observacoes: optionalText(req.body.observacoes, 1000),
      },
      update: {
        ciclo_icms_id: cicloIcmsId ? BigInt(cicloIcmsId) : null,
        peso_papel_t: pesos.papel,
        peso_plastico_t: pesos.plastico,
        peso_vidro_t: pesos.vidro,
        peso_metal_t: pesos.metal,
        caminho_mtr_ou_nota_fiscal: caminhoMtrOuNotaFiscal,
        documento_evidencia_id: documentoEvidenciaId ? BigInt(documentoEvidenciaId) : null,
        status_dado: "Pendente",
        observacoes: optionalText(req.body.observacoes, 1000),
      },
    });

    return res.status(201).json({
      mensagem: "Pesagem mensal salva com sucesso.",
      resultado: {
        coletaId: Number(coleta.id),
        toneladaTotalReciclavel: pesos.papel + pesos.plastico + pesos.vidro + pesos.metal,
      },
    });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel salvar a pesagem mensal.");
  }
});

router.post("/api/icms/residuos/calcular-consolidado", async (req, res) => {
  try {
    const cicloIcmsId = integerParam(req.body.cicloIcmsId, "cicloIcmsId", { min: 1 });
    const totalRsuAnualT = decimalNumber(req.body.totalRsuAnualT, "totalRsuAnualT", { min: 0 });
    if (totalRsuAnualT <= 0) throw badRequest("totalRsuAnualT deve ser maior que zero.");
    const tipoSistema = enumValue<TipoSistemaColeta>(req.body.tipoSistema, "tipoSistema", ["Domiciliar", "UTC_Ponto"]);

    const resultado = await calcularFRMunicipal({ cicloIcmsId, totalRsuAnualT, tipoSistema });
    return res.status(200).json({ mensagem: "Calculo consolidado de residuos realizado com sucesso.", resultado });
  } catch (error) {
    return sendError(res, error, "Nao foi possivel calcular o consolidado de residuos.", 422);
  }
});

export default router;
