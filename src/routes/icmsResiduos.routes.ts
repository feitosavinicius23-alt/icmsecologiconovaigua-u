import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { calcularFRMunicipal, TipoSistemaColeta } from "../services/calculoResiduos.service.js";

const router = Router();

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

router.post("/api/icms/residuos/coleta-seletiva", async (req, res) => {
  try {
    const ano = Number(req.body.anoReferencia);
    const mes = Number(req.body.mesReferencia);
    const nomeCooperativa = String(req.body.nomeCooperativa ?? "").trim();
    const caminhoMtrOuNotaFiscal = String(req.body.caminhoMtrOuNotaFiscal ?? "").trim();
    const cicloIcmsId = req.body.cicloIcmsId ? Number(req.body.cicloIcmsId) : null;
    const documentoEvidenciaId = req.body.documentoEvidenciaId ? Number(req.body.documentoEvidenciaId) : null;

    const pesos = {
      papel: toNumber(req.body.pesoPapelT),
      plastico: toNumber(req.body.pesoPlasticoT),
      vidro: toNumber(req.body.pesoVidroT),
      metal: toNumber(req.body.pesoMetalT),
    };

    if (!Number.isInteger(ano) || ano < 2007) return res.status(400).json({ erro: "Ano invalido." });
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return res.status(400).json({ erro: "Mes invalido." });
    if (!nomeCooperativa) return res.status(400).json({ erro: "Informe a cooperativa." });
    if (!caminhoMtrOuNotaFiscal) return res.status(400).json({ erro: "Informe o MTR ou nota fiscal." });
    if (Object.values(pesos).some((valor) => Number.isNaN(valor) || valor < 0)) {
      return res.status(400).json({ erro: "Pesos devem ser maiores ou iguais a zero." });
    }

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
        observacoes: req.body.observacoes ?? null,
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
        observacoes: req.body.observacoes ?? null,
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
    return res.status(500).json({
      erro: "Nao foi possivel salvar a pesagem mensal.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

router.post("/api/icms/residuos/calcular-consolidado", async (req, res) => {
  try {
    const cicloIcmsId = Number(req.body.cicloIcmsId);
    const totalRsuAnualT = Number(req.body.totalRsuAnualT);
    const tipoSistema = req.body.tipoSistema as TipoSistemaColeta;

    if (!Number.isInteger(cicloIcmsId)) return res.status(400).json({ erro: "cicloIcmsId invalido." });
    if (!Number.isFinite(totalRsuAnualT) || totalRsuAnualT <= 0) {
      return res.status(400).json({ erro: "totalRsuAnualT deve ser maior que zero." });
    }
    if (!["Domiciliar", "UTC_Ponto"].includes(tipoSistema)) {
      return res.status(400).json({ erro: "tipoSistema deve ser Domiciliar ou UTC_Ponto." });
    }

    const resultado = await calcularFRMunicipal({ cicloIcmsId, totalRsuAnualT, tipoSistema });
    return res.status(200).json({ mensagem: "Calculo consolidado de residuos realizado com sucesso.", resultado });
  } catch (error) {
    return res.status(422).json({
      erro: "Nao foi possivel calcular o consolidado de residuos.",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
});

export default router;
