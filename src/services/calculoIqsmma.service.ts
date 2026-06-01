import { prisma } from "../lib/prisma.js";

type NivelImpacto = "Alto" | "Medio" | "Baixo";

type AlertaAuditoria = {
  titulo: string;
  descricao: string;
  nivelImpactoIfca: NivelImpacto;
  tipo: "CONDEMA" | "FUNDO_MUNICIPAL";
};

function mesesFaltantes(mesesExistentes: number[]) {
  const existentes = new Set(mesesExistentes);
  return Array.from({ length: 12 }, (_, index) => index + 1).filter((mes) => !existentes.has(mes));
}

export async function auditarRequisitosLegais(cicloIcmsId: number) {
  if (!Number.isInteger(cicloIcmsId)) throw new Error("cicloIcmsId invalido.");

  const alertas: AlertaAuditoria[] = [];
  const atasCondemaValidadas = await prisma.atas_reunioes.count({
    where: {
      ciclo_icms_id: BigInt(cicloIcmsId),
      orgao_colegiado: "CONDEMA",
      status_validacao: "Validado",
    },
  });

  if (atasCondemaValidadas < 3) {
    alertas.push({
      tipo: "CONDEMA",
      titulo: "Risco de Nota Zero por Inatividade do Conselho",
      descricao: `Foram encontradas apenas ${atasCondemaValidadas} atas validadas do CONDEMA no ciclo. O minimo operacional exigido e de 3 reunioes comprovadas no ano.`,
      nivelImpactoIfca: "Alto",
    });
  }

  const fundo = await prisma.fundo_municipal_meio_ambiente.findUnique({
    where: { ciclo_icms_id: BigInt(cicloIcmsId) },
    include: {
      repasses_fundo_municipal: {
        select: {
          mes_referencia: true,
          extrato_documento_id: true,
          status_validacao: true,
        },
        orderBy: { mes_referencia: "asc" },
      },
    },
  });

  let statusFundoAtual = "Nao implementado";
  let mesesSemExtrato: number[] = [];
  let fundoAtualizado = false;

  if (!fundo) {
    alertas.push({
      tipo: "FUNDO_MUNICIPAL",
      titulo: "Fundo Municipal nao cadastrado no ciclo",
      descricao: "Nao ha registro do Fundo Municipal de Meio Ambiente para este ciclo.",
      nivelImpactoIfca: "Alto",
    });
  } else {
    statusFundoAtual = fundo.status_iqsmma;
    const mesesComExtratoValido = fundo.repasses_fundo_municipal
      .filter((repasse) => repasse.extrato_documento_id !== null && repasse.status_validacao === "Validado")
      .map((repasse) => repasse.mes_referencia);

    mesesSemExtrato = mesesFaltantes(mesesComExtratoValido);

    if (fundo.status_iqsmma === "Totalmente implementado" && mesesSemExtrato.length > 0) {
      await prisma.fundo_municipal_meio_ambiente.update({
        where: { id: fundo.id },
        data: { status_iqsmma: "Parcialmente implementado" },
      });
      statusFundoAtual = "Parcialmente implementado";
      fundoAtualizado = true;
    }

    if (mesesSemExtrato.length > 0) {
      alertas.push({
        tipo: "FUNDO_MUNICIPAL",
        titulo: "Extratos mensais incompletos do Fundo Municipal",
        descricao: `Faltam extratos bancarios validados para os meses: ${mesesSemExtrato.join(", ")}.`,
        nivelImpactoIfca: fundo.status_iqsmma === "Totalmente implementado" ? "Alto" : "Medio",
      });
    }
  }

  const statusInstitucional = alertas.some((alerta) => alerta.nivelImpactoIfca === "Alto")
    ? "Critico"
    : alertas.length > 0
      ? "Atencao"
      : "Regular";

  return {
    cicloIcmsId,
    municipio: "Nova Iguacu",
    statusInstitucional,
    requisitos: {
      condema: {
        atasValidadas: atasCondemaValidadas,
        minimoExigido: 3,
        regular: atasCondemaValidadas >= 3,
      },
      fundoMunicipal: {
        cadastrado: Boolean(fundo),
        statusIqsmma: statusFundoAtual,
        statusFoiAjustadoNaAuditoria: fundoAtualizado,
        mesesSemExtratoValidado: mesesSemExtrato,
        possuiSerieCompletaDeExtratos: fundo ? mesesSemExtrato.length === 0 : false,
      },
    },
    alertas,
  };
}
