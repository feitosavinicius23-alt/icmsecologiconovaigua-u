import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/http.js";
import { roundDecimal, safePercent, sumDecimals } from "../lib/math.js";

export type TipoSistemaColeta = "Domiciliar" | "UTC_Ponto";

function calcularFaixaFR(percentualReciclagem: number, tipoSistema: TipoSistemaColeta): number {
  if (tipoSistema === "Domiciliar") {
    if (percentualReciclagem > 20) return 5;
    if (percentualReciclagem >= 10) return 4;
    if (percentualReciclagem >= 5) return 3;
    if (percentualReciclagem >= 3) return 2;
    if (percentualReciclagem >= 1) return 1;
    return 0;
  }

  if (percentualReciclagem >= 20) return 2;
  if (percentualReciclagem >= 10) return 1;
  return 0;
}

export async function calcularFRMunicipal(params: {
  cicloIcmsId: number;
  totalRsuAnualT: number;
  tipoSistema: TipoSistemaColeta;
}) {
  const { cicloIcmsId, totalRsuAnualT, tipoSistema } = params;

  if (!Number.isInteger(cicloIcmsId)) throw badRequest("cicloIcmsId invalido.");
  if (!Number.isFinite(totalRsuAnualT) || totalRsuAnualT <= 0) {
    throw badRequest("totalRsuAnualT deve ser maior que zero.");
  }

  const agregado = await prisma.coleta_seletiva.aggregate({
    where: { ciclo_icms_id: BigInt(cicloIcmsId), status_dado: "Validado" },
    _sum: {
      peso_papel_t: true,
      peso_plastico_t: true,
      peso_vidro_t: true,
      peso_metal_t: true,
    },
    _count: { id: true },
  });

  const totalPapelT = Number(agregado._sum.peso_papel_t ?? 0);
  const totalPlasticoT = Number(agregado._sum.peso_plastico_t ?? 0);
  const totalVidroT = Number(agregado._sum.peso_vidro_t ?? 0);
  const totalMetalT = Number(agregado._sum.peso_metal_t ?? 0);
  const totalReciclaveisT = sumDecimals([totalPapelT, totalPlasticoT, totalVidroT, totalMetalT], 6);
  const percentualReciclagem = safePercent(
    totalReciclaveisT,
    totalRsuAnualT,
    "Percentual de reciclagem",
    4,
  );
  const fatorReciclagem = calcularFaixaFR(percentualReciclagem, tipoSistema);

  const resultado = await prisma.calculo_irs_anual.upsert({
    where: { ciclo_icms_id: BigInt(cicloIcmsId) },
    create: {
      ciclo_icms_id: BigInt(cicloIcmsId),
      total_rsu_anual_t: totalRsuAnualT,
      tipo_sistema: tipoSistema,
      total_papel_t: totalPapelT,
      total_plastico_t: totalPlasticoT,
      total_vidro_t: totalVidroT,
      total_metal_t: totalMetalT,
      total_reciclaveis_t: totalReciclaveisT,
      percentual_reciclagem: percentualReciclagem,
      fator_reciclagem: fatorReciclagem,
      status_calculo: "Calculado",
    },
    update: {
      total_rsu_anual_t: totalRsuAnualT,
      tipo_sistema: tipoSistema,
      total_papel_t: totalPapelT,
      total_plastico_t: totalPlasticoT,
      total_vidro_t: totalVidroT,
      total_metal_t: totalMetalT,
      total_reciclaveis_t: totalReciclaveisT,
      percentual_reciclagem: percentualReciclagem,
      fator_reciclagem: fatorReciclagem,
      status_calculo: "Calculado",
      calculado_em: new Date(),
    },
  });

  return {
    cicloIcmsId,
    municipio: "Nova Iguacu",
    tipoSistema,
    totalRsuAnualT: roundDecimal(totalRsuAnualT, 6),
    totaisPorMaterial: {
      papelT: totalPapelT,
      plasticoT: totalPlasticoT,
      vidroT: totalVidroT,
      metalT: totalMetalT,
    },
    totalReciclaveisT,
    percentualReciclagem,
    fatorReciclagem,
    registrosValidadosConsiderados: agregado._count.id,
    registroCalculoId: Number(resultado.id),
  };
}
