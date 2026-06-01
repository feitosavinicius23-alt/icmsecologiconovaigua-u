import { prisma } from "../lib/prisma.js";

type NivelTratamento = "Primario" | "Secundario" | "Terciario" | "Emissario Submarino";

const FATOR_TRATAMENTO: Record<NivelTratamento, number> = {
  Primario: 1,
  Secundario: 2,
  "Emissario Submarino": 2,
  Terciario: 4,
};

function calcularFatorRE(nivelTratamento: NivelTratamento, mediaEficienciaDbo: number | null): number {
  if (nivelTratamento === "Emissario Submarino") return 10;
  if (mediaEficienciaDbo === null) {
    throw new Error("Nao ha laudos validados de eficiencia de DBO para calcular o RE da ETE.");
  }
  if (mediaEficienciaDbo < 80) return 0;
  if (mediaEficienciaDbo <= 90) return 8;
  return 10;
}

export async function calcularITEPorEstacao(params: {
  cicloIcmsId: number;
  estacaoTratamentoEsgotoId: number;
}) {
  const { cicloIcmsId, estacaoTratamentoEsgotoId } = params;

  return prisma.$transaction(async (tx) => {
    const ete = await tx.estacoes_tratamento_esgoto.findUnique({
      where: { id: BigInt(estacaoTratamentoEsgotoId) },
      select: {
        id: true,
        nome: true,
        nivel_tratamento: true,
        populacao_atendida: true,
        populacao_urbana_referencia: true,
      },
    });

    if (!ete) throw new Error("Estacao de Tratamento de Esgoto nao encontrada.");
    if (!ete.populacao_urbana_referencia || ete.populacao_urbana_referencia <= 0) {
      throw new Error("Populacao urbana de referencia invalida.");
    }

    const nivelTratamento = ete.nivel_tratamento as NivelTratamento;
    const fatorTratamento = FATOR_TRATAMENTO[nivelTratamento];
    if (fatorTratamento === undefined) {
      throw new Error(`Nivel de tratamento invalido: ${ete.nivel_tratamento}`);
    }

    const percentualPopulacaoAtendida =
      (ete.populacao_atendida / ete.populacao_urbana_referencia) * 100;

    if (percentualPopulacaoAtendida < 0 || percentualPopulacaoAtendida > 100) {
      throw new Error("Percentual de populacao atendida fora do intervalo esperado.");
    }

    const mediaLaudos = await tx.laudos_eficiencia_ete.aggregate({
      where: {
        estacao_tratamento_esgoto_id: BigInt(estacaoTratamentoEsgotoId),
        ciclo_icms_id: BigInt(cicloIcmsId),
        status_validacao: "Validado",
      },
      _avg: { eficiencia_remocao_dbo_percentual: true },
      _count: { id: true },
    });

    const mediaEficienciaDbo =
      mediaLaudos._avg.eficiencia_remocao_dbo_percentual === null
        ? null
        : Number(mediaLaudos._avg.eficiencia_remocao_dbo_percentual);

    const reRelatorioEficiencia = calcularFatorRE(nivelTratamento, mediaEficienciaDbo);
    const pontuacaoParcial = fatorTratamento * percentualPopulacaoAtendida + reRelatorioEficiencia;

    const resultado = await tx.calculo_ite_anual.upsert({
      where: {
        ciclo_icms_id_estacao_tratamento_esgoto_id: {
          ciclo_icms_id: BigInt(cicloIcmsId),
          estacao_tratamento_esgoto_id: BigInt(estacaoTratamentoEsgotoId),
        },
      },
      create: {
        ciclo_icms_id: BigInt(cicloIcmsId),
        estacao_tratamento_esgoto_id: BigInt(estacaoTratamentoEsgotoId),
        percentual_populacao_atendida: percentualPopulacaoAtendida,
        fator_tratamento: fatorTratamento,
        re_relatorio_eficiencia: reRelatorioEficiencia,
        pontuacao_parcial: pontuacaoParcial,
        status_calculo: "Calculado",
      },
      update: {
        percentual_populacao_atendida: percentualPopulacaoAtendida,
        fator_tratamento: fatorTratamento,
        re_relatorio_eficiencia: reRelatorioEficiencia,
        pontuacao_parcial: pontuacaoParcial,
        status_calculo: "Calculado",
        calculado_em: new Date(),
      },
    });

    return {
      estacao: { id: Number(ete.id), nome: ete.nome, nivelTratamento },
      cicloIcmsId,
      populacaoAtendida: ete.populacao_atendida,
      populacaoUrbanaReferencia: ete.populacao_urbana_referencia,
      percentualPopulacaoAtendida,
      fatorTratamento,
      mediaEficienciaDbo,
      quantidadeLaudosValidados: mediaLaudos._count.id,
      reRelatorioEficiencia,
      pontuacaoParcial,
      registroCalculoId: Number(resultado.id),
    };
  });
}

export async function calcularITEMunicipalConsolidado(cicloIcmsId: number) {
  const estacoes = await prisma.estacoes_tratamento_esgoto.findMany({
    where: { status_operacao: { in: ["Ativa", "Paralisada"] } },
    select: { id: true, nome: true, nivel_tratamento: true, status_operacao: true },
    orderBy: { nome: "asc" },
  });

  const resultados = [];
  for (const estacao of estacoes) {
    try {
      const resultado = await calcularITEPorEstacao({
        cicloIcmsId,
        estacaoTratamentoEsgotoId: Number(estacao.id),
      });
      resultados.push({
        estacaoId: Number(estacao.id),
        nome: estacao.nome,
        nivelTratamento: estacao.nivel_tratamento,
        statusOperacao: estacao.status_operacao,
        statusCalculo: "Calculado",
        percentualPopulacaoAtendida: resultado.percentualPopulacaoAtendida,
        fatorTratamento: resultado.fatorTratamento,
        mediaEficienciaDbo: resultado.mediaEficienciaDbo,
        reRelatorioEficiencia: resultado.reRelatorioEficiencia,
        pontuacaoParcial: resultado.pontuacaoParcial,
        erro: null,
      });
    } catch (error) {
      resultados.push({
        estacaoId: Number(estacao.id),
        nome: estacao.nome,
        nivelTratamento: estacao.nivel_tratamento,
        statusOperacao: estacao.status_operacao,
        statusCalculo: "Revisar",
        percentualPopulacaoAtendida: null,
        fatorTratamento: null,
        mediaEficienciaDbo: null,
        reRelatorioEficiencia: null,
        pontuacaoParcial: 0,
        erro: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    }
  }

  const pontuacaoBruta = resultados.reduce((total, item) => total + Number(item.pontuacaoParcial || 0), 0);
  const somaPercentualAtendido = resultados.reduce(
    (total, item) => total + Number(item.percentualPopulacaoAtendida || 0),
    0,
  );
  const possuiPossivelSobreposicaoPopulacional = somaPercentualAtendido > 100;
  const pontuacaoFinalMunicipal = possuiPossivelSobreposicaoPopulacional
    ? pontuacaoBruta * (100 / somaPercentualAtendido)
    : pontuacaoBruta;

  return {
    cicloIcmsId,
    municipio: "Nova Iguacu",
    pontuacaoBruta,
    pontuacaoFinalMunicipal,
    somaPercentualAtendido,
    possuiPossivelSobreposicaoPopulacional,
    totalEstacoes: estacoes.length,
    totalCalculadas: resultados.filter((item) => item.statusCalculo === "Calculado").length,
    totalParaRevisar: resultados.filter((item) => item.statusCalculo === "Revisar").length,
    estacoes: resultados,
  };
}

export async function obterResultadoITEMunicipalConsolidado(cicloIcmsId: number) {
  const calculos = await prisma.calculo_ite_anual.findMany({
    where: { ciclo_icms_id: BigInt(cicloIcmsId) },
    include: {
      estacoes_tratamento_esgoto: {
        select: { id: true, nome: true, nivel_tratamento: true, status_operacao: true },
      },
    },
    orderBy: { estacoes_tratamento_esgoto: { nome: "asc" } },
  });

  const estacoes = calculos.map((calculo) => ({
    estacaoId: Number(calculo.estacao_tratamento_esgoto_id),
    nome: calculo.estacoes_tratamento_esgoto.nome,
    nivelTratamento: calculo.estacoes_tratamento_esgoto.nivel_tratamento,
    statusOperacao: calculo.estacoes_tratamento_esgoto.status_operacao,
    statusCalculo: calculo.status_calculo,
    percentualPopulacaoAtendida: Number(calculo.percentual_populacao_atendida),
    fatorTratamento: Number(calculo.fator_tratamento),
    reRelatorioEficiencia: Number(calculo.re_relatorio_eficiencia),
    pontuacaoParcial: Number(calculo.pontuacao_parcial),
    calculadoEm: calculo.calculado_em,
  }));

  const pontuacaoBruta = estacoes.reduce((total, item) => total + item.pontuacaoParcial, 0);
  const somaPercentualAtendido = estacoes.reduce((total, item) => total + item.percentualPopulacaoAtendida, 0);
  const possuiPossivelSobreposicaoPopulacional = somaPercentualAtendido > 100;

  return {
    cicloIcmsId,
    municipio: "Nova Iguacu",
    pontuacaoBruta,
    pontuacaoFinalMunicipal: possuiPossivelSobreposicaoPopulacional
      ? pontuacaoBruta * (100 / somaPercentualAtendido)
      : pontuacaoBruta,
    somaPercentualAtendido,
    possuiPossivelSobreposicaoPopulacional,
    totalEstacoes: estacoes.length,
    estacoes,
  };
}
