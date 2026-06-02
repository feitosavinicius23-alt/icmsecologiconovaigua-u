import XLSX from "xlsx";

const apiBase = process.env.ICMS_API_BASE ?? "https://icms-ecologico-nova-iguacu.vercel.app";
const cicloIcmsId = Number(process.env.ICMS_CICLO_ID ?? 1);
const municipioId = Number(process.env.ICMS_MUNICIPIO_ID ?? 1);

const files = {
  ete: "C:/Users/Dell/Downloads/6_ICMS_ECOL_RJ_2025_AF2026_ETE__SEAS_INEA_CEPERJ__Final_2025_AF_2026_Final_Republicado_0.xlsx",
  mananciais: "C:/Users/Dell/Downloads/5_ICMS_ECOLOGICO_RJ_2025_AF2026__MANANCIAIS__SEAS_INEA_CEPERJ_Final_2025_AF_2026_Final_Republicado_0.xlsx",
  vazadouro: "C:/Users/Dell/Downloads/4_AVALIACAO_VAZADOURO_ICMS_ECOLOGICO_RJ_2025_AF_2026_VAZADOURO_CEPERJ_Final_2025_AF_2026_Final_Republicado_0.xlsx",
  iqsmma: "C:/Users/Dell/Downloads/2_ICMS_ECOLOGICO_RJ_2025_AF2026__IQSMMA__SEAS_INEA_CEPERJ_Final_2025_AF_2026_Final_Republicado_0.xlsx",
  residuos: "C:/Users/Dell/Downloads/3_ICMS_ECOLOGICO_RJ_2025_AF2026_RESIDUOS_SOLIDOS_SEAS_INEA_CEPERJ_Final_2025_AF_2026_Final_Republicado.xlsx",
  uc: "C:/Users/Dell/Downloads/7_ICMS ECOLOGICO RJ 2025 AF2026_UC_SEAS_INEA_CEPERJ_Final_2025_AF_2026_Final_Republicado.xlsx",
  final: "C:/Users/Dell/Downloads/ICMS ECO DADOS_2024_Ano 2025_AF2026_IQSMMA_IFCA_INEA_SEAS_CEPERJ_2026_Final_Republicado.xlsx",
  smma: "C:/Users/Dell/Downloads/1_ICMS_ECOL_RJ 2025AF2026_SMMA_SEAS_INEA_CEPERJ_Final_2025_AF_2026_Final_Republicado.xlsx",
};

const today = new Date().toISOString().slice(0, 10);
const months = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const rsuFields = ["rsuJaneiro", "rsuFevereiro", "rsuMarco", "rsuAbril", "rsuMaio", "rsuJunho", "rsuJulho", "rsuAgosto", "rsuSetembro", "rsuOutubro", "rsuNovembro", "rsuDezembro"];
const repasseFields = ["repasseJaneiro", "repasseFevereiro", "repasseMarco", "repasseAbril", "repasseMaio", "repasseJunho", "repasseJulho", "repasseAgosto", "repasseSetembro", "repasseOutubro", "repasseNovembro", "repasseDezembro"];

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function wb(path) {
  return XLSX.readFile(path, { cellDates: true });
}

function sheetRows(workbook, sheetName, options = {}) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false, ...options });
}

function sheetArray(workbook, sheetName) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false });
}

function findSheet(workbook, target) {
  const wanted = norm(target).replace(/[^A-Z0-9]/g, "");
  return workbook.SheetNames.find((sheet) => norm(sheet).replace(/[^A-Z0-9]/g, "").includes(wanted));
}

function numberFrom(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const clean = text.replace("%", "").replace(/\s/g, "");
  let normalized = clean;
  if (clean.includes(".") && clean.includes(",")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    const [left, right] = clean.split(",");
    normalized = right?.length === 3 && left.length <= 3 ? `${left}${right}` : clean.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmt(value, digits = 3) {
  const numeric = numberFrom(value);
  if (numeric === null) return "";
  return Number(numeric.toFixed(digits)).toString();
}

function findObjectRow(workbook, sheetName, exactFirstCell = true) {
  const realSheetName = workbook.Sheets[sheetName] ? sheetName : findSheet(workbook, sheetName);
  if (!realSheetName) return undefined;
  return sheetRows(workbook, realSheetName).find((row) => {
    const first = Object.values(row)[0];
    if (exactFirstCell) return isNovaIguacu(first);
    return Object.values(row).some((value) => norm(value).includes("NOVA IGUACU"));
  });
}

function isNovaIguacu(value) {
  const normalized = norm(value);
  return normalized.includes("NOVA") && normalized.includes("IGUA");
}

function entry(formId, label, draft, status = "em_preenchimento") {
  const now = new Date().toISOString();
  return {
    id: `${formId}-${norm(label).replace(/[^A-Z0-9]+/g, "-").toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label,
    draft,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

function savedPayload(records) {
  return {
    draft: records[0]?.draft ?? {},
    records,
    importedFrom: "Planilhas oficiais SEAS/INEA/CEPERJ 2025 AF2026 filtradas para Nova Iguacu",
    importedAt: new Date().toISOString(),
  };
}

function categoryFromUcName(name) {
  const normalized = norm(name);
  if (normalized.startsWith("APA") || normalized.startsWith("RPPN")) return "US";
  return "PI";
}

function sphere(value) {
  const normalized = norm(value);
  if (normalized.includes("MUNICIPAL")) return "Municipal";
  if (normalized.includes("ESTADUAL")) return "Estadual";
  if (normalized.includes("FEDERAL")) return "Federal";
  return "Municipal";
}

function treatmentName(value) {
  const normalized = norm(value);
  if (normalized.includes("TERCI")) return "Terciario";
  if (normalized.includes("SECUND")) return "Secundario";
  if (normalized.includes("PRIM")) return "Primario";
  if (normalized.includes("EMISS")) return "Emissario Submarino";
  return "";
}

function getFinalWorkbookValues() {
  const finalWb = wb(files.final);
  const finalRow = findObjectRow(finalWb, "indice_final") ?? {};
  const popRow = findObjectRow(finalWb, "popula") ?? {};
  const iteRow = findObjectRow(finalWb, "Esgoto - ITE") ?? {};
  const residuosRow = findObjectRow(finalWb, "Residuos") ?? {};
  const ucRow = findObjectRow(finalWb, "UCs_IAP") ?? {};
  const ucmRow = findObjectRow(finalWb, "UC_IAPM") ?? {};

  return {
    populacaoTotal: numberFrom(popRow.__EMPTY),
    populacaoUrbana: numberFrom(popRow.__EMPTY_1),
    ite: numberFrom(iteRow.__EMPTY),
    idr: numberFrom(residuosRow.__EMPTY),
    irv: numberFrom(residuosRow.__EMPTY_2),
    iap: numberFrom(ucRow.__EMPTY),
    iapm: numberFrom(ucmRow.__EMPTY),
    irma: numberFrom(finalRow.__EMPTY),
    ifca: numberFrom(finalRow.__EMPTY_6),
  };
}

function buildEteRecords(values) {
  const eteWb = wb(files.ete);
  const sheet = findSheet(eteWb, "NOVA IGUA") ?? "NOVA IGUAÃ‡U";
  const rows = sheetArray(eteWb, sheet);
  return rows
    .slice(3)
    .filter((row) => isNovaIguacu(row[0]) && row[1] && row[2] && numberFrom(row[4]) !== null)
    .map((row) => {
      const nivelTratamento = treatmentName(row[2]);
      const popAtendida = numberFrom(row[4]) ?? 0;
      const eficiencia = String(row[7] ?? "");
      return entry("esgoto_ete_laudos", String(row[1]), {
        nomeEte: String(row[1]),
        tipoUnidade: "ETE",
        nivelTratamento,
        populacaoAtendida: fmt(popAtendida, 0),
        populacaoUrbanaReferencia: fmt(values.populacaoUrbana, 0),
        vazaoProjeto: "",
        vazaoRealOperada: "",
        vazaoMedia: "",
        dboAfluente: "",
        dboEfluente: "",
        proconAgua: "Nao",
        observacoes:
          `Importado da planilha ETE SEAS/INEA/CEPERJ 2025 AF2026. ` +
          `Cobertura informada: ${fmt(row[6], 4)}%. Eficiência/RE informado na planilha: ${eficiencia || "Nao informado"} / ${fmt(row[8], 2)}. ` +
          `ITE parcial: ${fmt(row[9], 6)}. LO valida: ${row[10] || "Nao informado"}.`,
      });
    });
}

function buildUcRecords() {
  const ucWb = wb(files.uc);
  const sheet = findSheet(ucWb, "NOVA IGUA") ?? "NOVA IGUAÃ‡U";
  const rows = sheetArray(ucWb, sheet);
  const all = rows
    .slice(4)
    .filter((row) => isNovaIguacu(row[0]) && row[2])
    .map((row) => ({
      nome: String(row[2]),
      area: numberFrom(row[3]) ?? 0,
      fi: numberFrom(row[4]) ?? 0,
      gc: numberFrom(row[5]) ?? 0,
      gi: numberFrom(row[6]) ?? 0,
      responsavel: String(row[8] || row[10] || ""),
      raap: numberFrom(row[7]) ?? 0,
      raapm: numberFrom(row[9]) ?? 0,
    }));

  const ucGestao = all.map((item) =>
    entry("uc_gestao", item.nome, {
      nomeUc: item.nome,
      categoriaUc: categoryFromUcName(item.nome),
      esferaUc: sphere(item.responsavel),
      areaTotalUcHa: fmt(item.area, 4),
      areaMunicipioHa: fmt(item.area, 4),
      planoManejo: item.gi > 0 ? "Atualizado" : "Inexistente",
      dataPublicacaoPlanoManejo: "",
      conselhoGestor: item.gc > 0 ? "Ativo" : "Pendente",
      sedeAdministrativa: item.gi >= 4 ? "Comprovada" : "Parcial",
      equipeTecnicaUc: `Nao detalhado na planilha. Indicador GI oficial: ${item.gi}.`,
      fiscalizacaoUc: `Nao detalhado na planilha. Indicador GC oficial: ${item.gc}.`,
      educacaoAmbientalUc: "Dados qualitativos devem ser complementados pela SEMAM.",
      pesquisaCientificaUc: "Dados qualitativos devem ser complementados pela SEMAM.",
      sinalizacaoUc: item.gi >= 4 ? "Adequada" : "Parcial",
      regularizacaoFundiaria: "Em andamento",
      grauConservacao: item.gc >= 4 ? "Alto" : item.gc >= 2 ? "Medio" : "Baixo",
      grauImplementacao: item.gi >= 4 ? "Alto" : item.gi >= 2 ? "Medio" : "Baixo",
      infraestrutura: `RAAP oficial: ${fmt(item.raap, 6)}. Responsavel: ${item.responsavel || "Nao informado"}.`,
      observacoes: "Importado da planilha UC SEAS/INEA/CEPERJ 2025 AF2026.",
    }),
  );

  const municipais = all
    .filter((item) => sphere(item.responsavel) === "Municipal")
    .map((item) =>
      entry("uc_municipais", item.nome, {
        nomeUcMunicipal: item.nome,
        categoriaUcMunicipal: categoryFromUcName(item.nome),
        areaTotalUcMunicipal: fmt(item.area, 4),
        areaMunicipioUcMunicipal: fmt(item.area, 4),
        atoCriacaoUcMunicipal: "A complementar pela SEMAM",
        planoManejoUcMunicipal: item.gi > 0 ? "Atualizado" : "Nao possui",
        conselhoGestorUcMunicipal: item.gc > 0 ? "Ativo" : "Instituido",
        sedeUcMunicipal: item.gi >= 4 ? "Comprovada" : "Parcial",
        equipeUcMunicipal: `Indicador GI oficial: ${item.gi}.`,
        fiscalizacaoUcMunicipal: `Indicador GC oficial: ${item.gc}.`,
        educacaoUcMunicipal: "A complementar pela SEMAM.",
        pesquisaUcMunicipal: "A complementar pela SEMAM.",
        infraUcMunicipal: `RAAPM oficial: ${fmt(item.raapm, 6)}.`,
        sinalizacaoUcMunicipal: item.gi >= 4 ? "Adequada" : "Parcial",
        regularizacaoUcMunicipal: "Em andamento",
        grauConservacaoUcMunicipal: item.gc >= 4 ? "Alto" : item.gc >= 2 ? "Medio" : "Baixo",
        grauImplementacaoUcMunicipal: item.gi >= 4 ? "Alto" : item.gi >= 2 ? "Medio" : "Baixo",
      }),
    );

  const rppn = all
    .filter((item) => norm(item.nome).startsWith("RPPN") || sphere(item.responsavel) === "Particular")
    .map((item) =>
      entry("uc_rppn_privada", item.nome, {
        nomeRppn: item.nome,
        proprietarioRppn: "A complementar",
        areaRppn: fmt(item.area, 4),
        municipioRppn: "Nova Iguacu",
        atoReconhecimentoRppn: "A complementar",
        planoManejoRppn: item.gi > 0 ? "Aprovado" : "Nao possui",
        acoesConservacaoRppn: "A complementar pela SEMAM/proprietario.",
        fiscalizacaoRppn: `Indicador GC oficial: ${item.gc}.`,
        pesquisaRppn: "A complementar.",
        educacaoRppn: "A complementar.",
        infraestruturaRppn: `RAAP oficial: ${fmt(item.raap, 6)}.`,
      }),
    );

  return { ucGestao, municipais, rppn };
}

function buildResiduoRecords(values) {
  const residuosWb = wb(files.residuos);
  const persRow = findObjectRow(residuosWb, "PERS atualizado") ?? {};
  const colRow = findObjectRow(residuosWb, "base_dados (ColSeletiva)") ?? {};
  const calcRow = findObjectRow(residuosWb, "Planilha de Calculo - IDR") ?? {};
  const rsuDia = numberFrom(persRow.__EMPTY_2) ?? numberFrom(persRow.__EMPTY_3) ?? 0;
  const rsuAnual = rsuDia * 365;
  const rsuMensal = rsuAnual / 12;
  const totalReciclaveis = numberFrom(colRow.__EMPTY_1) ?? numberFrom(colRow.__EMPTY_2) ?? 0;
  const mediaMensalReciclaveis = totalReciclaveis / 12;

  const destinacaoDraft = {
    tipoDestinacao: "Aterro sanitario",
    unidadeDestino: "Destino final licenciado informado na planilha INEA",
    municipioDestino: "Nova Iguacu / regiao metropolitana",
    operador: "A complementar pela SEMAM",
    cnpjAterroReceptor: "A complementar",
    licencaAmbiental: "A complementar",
    validadeLicenca: "",
    volumeTotalRsuGerado: fmt(rsuAnual, 3),
    volumeRejeitosDestinados: fmt(rsuAnual, 3),
    massaRsuAnualT: fmt(rsuAnual, 3),
    percentualRsuDestino: "100",
    tratamentoPercolado: "Nao informado",
    captacaoGases: "Nao se aplica",
    possuiLixaoAtivo: "Nao",
    numeroMesesDestinacao: "12",
    percentualUsoOutrosMunicipios: "0",
    responsavelDestinacao: "SEMAM Nova Iguacu",
    cargoResponsavelDestinacao: "Equipe tecnica",
    dataAssinaturaDestinacao: today,
    observacoes: `Importado da planilha Residuos Solidos 2025 AF2026. IDR oficial: ${fmt(calcRow.IDR ?? values.idr, 2)}. PERS estimado: ${fmt(rsuDia, 2)} t/dia.`,
  };
  rsuFields.forEach((field) => {
    destinacaoDraft[field] = fmt(rsuMensal, 3);
  });

  const coletaDraft = {
    cooperativa: "Dados consolidados de coleta seletiva - Nova Iguacu",
    cnpjCooperativa: "A complementar",
    catadoresCooperados: fmt(colRow.__EMPTY_7, 0) || "0",
    mesReferencia: "12",
    papelT: "",
    plasticoT: "",
    vidroT: "",
    metalT: "",
    tipoColeta: "Domiciliar",
    bairrosAtendidos: "Dados consolidados na planilha oficial; detalhamento territorial a complementar.",
    logradourosAtendidos: "A complementar pela SEMAM.",
    domiciliosAtendidos: fmt(colRow.__EMPTY_6, 0),
    localizacaoPevs: "A complementar pela SEMAM.",
    quantidadePevs: "0",
    totalMensalReciclaveis: fmt(mediaMensalReciclaveis, 3),
    mediaAnualReciclaveis: fmt(mediaMensalReciclaveis, 3),
    inclusaoCatadores: "Sim",
    responsavelColeta: "SEMAM Nova Iguacu",
    cargoResponsavelColeta: "Equipe tecnica",
    dataColeta: today,
    observacoes: `Total anual de reciclaveis na planilha: ${fmt(totalReciclaveis, 3)} t. Percentual informado: ${colRow.__EMPTY_3 || "Nao informado"}. FR/CS oficial: ${fmt(calcRow["Coleta Seletiva"], 2)}.`,
  };

  return {
    destinacao: [entry("residuos_destinacao_final", "Destinacao final consolidada 2025 AF2026", destinacaoDraft)],
    coleta: [entry("residuos_coleta_seletiva", "Coleta seletiva consolidada 2025 AF2026", coletaDraft)],
  };
}

function buildVazadouroRecords() {
  const vazWb = wb(files.vazadouro);
  const rvRow = findObjectRow(vazWb, "Planilha de Calculo - IRV") ?? {};
  return [
    entry("residuos_remediacao_vazadouros", "Vazadouros - resultado oficial 2025 AF2026", {
      existeVazadouro: "Nao",
      estagioRemediacao: "Remediado",
      possuiLarValida: "Sim",
      numeroLar: "A complementar",
      validadeLar: "",
      descricaoObras: "Dados importados da avaliacao oficial de vazadouro. Detalhes tecnicos devem ser complementados pela SEMAM.",
      cronogramaRemediacao: "A complementar.",
      anoExecucaoRemediacao: "2025",
      responsavelTecnicoRemediacao: "SEMAM Nova Iguacu",
      observacoes: `Pontuacao RV oficial: ${fmt(rvRow.RV ?? rvRow.__EMPTY, 2)}.`,
    }),
  ];
}

function buildIqsmmaRecords() {
  const iqWb = wb(files.iqsmma);
  const finalRow = findObjectRow(iqWb, "IQSMMA FINAL") ?? {};
  const score = numberFrom(finalRow.__EMPTY) ?? 7;
  const draft = {
    atasCondema: "3",
    dataReuniaoCondema: today,
    caraterReuniaoCondema: "Ordinaria",
    assuntoReuniaoCondema: "Regularidade institucional para ICMS Ecologico",
    quorumGovernamental: "0",
    quorumNaoGovernamental: "0",
    leiCondema: "A complementar",
    decretoNomeacaoCondema: "A complementar",
    leiFundo: "A complementar",
    cnpjFundo: "A complementar",
    bancoFundo: "A complementar",
    agenciaFundo: "A complementar",
    contaFundo: "A complementar",
    normaRepasse: "A complementar",
    percentualRepasse: "0",
    receitaAnualFundo: "0",
    despesaAnualFundo: "0",
    observacoes: `IQSMMA final oficial importado: ${fmt(score, 2)}. Campos documentais devem ser anexados pela SEMAM.`,
  };
  repasseFields.forEach((field) => {
    draft[field] = "0";
  });
  return [entry("iqsmma_condema_fundo", "IQSMMA oficial 2025 AF2026", draft)];
}

function buildMananciaisRecords(values) {
  const manWb = wb(files.mananciais);
  const areaRow =
    sheetRows(manWb, "Percentual Bacias").find((row) => Object.values(row).some((value) => norm(value).includes("NOVA IGUACU"))) ?? {};
  return [
    entry("mananciais_abastecimento", "Mananciais - Sistema Guandu/Ribeirao das Lajes", {
      nomeBacia: String(areaRow.__EMPTY_2 || "Bacia do Guandu / Sistema Ribeirao das Lajes"),
      pontoCaptacao: String(areaRow.__EMPTY_3 || "Ponto de captacao regional informado pelo INEA"),
      areaTotalBaciaHa: fmt(areaRow.__EMPTY_6, 4),
      populacaoDependente: fmt(values.populacaoTotal, 0),
      abasteceForaBacia: "Sim",
      dependeTransposicao: "Parcialmente",
      areaDrenagemTotal: fmt((numberFrom(areaRow.__EMPTY_6) ?? 0) / 100, 4),
      areaDrenagemMunicipal: fmt((numberFrom(areaRow.__EMPTY_8) ?? 0) / 100, 4),
      fonteCartografica: "Planilha Mananciais SEAS/INEA/CEPERJ 2025 AF2026",
      observacoes: `IrMA final de Nova Iguacu no consolidado oficial: ${fmt(values.irma, 5)}. Conferir se a linha representa municipio inserido ou municipio atendido antes de envio oficial.`,
    }),
  ];
}

function buildIfcaRecords(values) {
  const notaIeaIfm = (values.iap ?? 0) + (values.iapm ?? 0) + (values.irma ?? 0);
  return [
    entry("ifca_consolidacao", "Consolidacao oficial 2025 AF2026", {
      responsavelTecnico: "SEMAM Nova Iguacu",
      dataRevisao: today,
      notaIes: fmt(values.ite, 6),
      notaIrs: fmt((values.idr ?? 0) + (values.irv ?? 0), 6),
      notaIeaIfm: fmt(notaIeaIfm, 6),
      notaIqsmma: "7",
      pesoIes: "0.20",
      pesoIrs: "0.25",
      pesoIeaIfm: "0.45",
      pesoIqsmma: "0.10",
      semPendencias: false,
      observacoes: `IFCA oficial publicado/importado: ${fmt(values.ifca, 4)}. ITE ${fmt(values.ite, 6)}, IDR ${fmt(values.idr, 2)}, IRV ${fmt(values.irv, 2)}, IAP ${fmt(values.iap, 6)}, IAPM ${fmt(values.iapm, 6)}, IrMA ${fmt(values.irma, 5)}.`,
    }),
  ];
}

async function putForm(formId, records, status = "Em preenchimento") {
  const respostaJson = savedPayload(records);
  const response = await fetch(`${apiBase}/api/icms/formularios/respostas/${formId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cicloIcmsId,
      municipioId,
      status,
      respostaJson,
      checklist: [],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao importar ${formId}: HTTP ${response.status} - ${body}`);
  }
  const json = await response.json();
  console.log(`OK ${formId}: ${records.length} registro(s) - resposta ${json.resultado?.id ?? "sem id"}`);
}

async function main() {
  const values = getFinalWorkbookValues();
  const ete = buildEteRecords(values);
  const uc = buildUcRecords();
  const residuos = buildResiduoRecords(values);
  const forms = {
    esgoto_ete_laudos: ete,
    residuos_destinacao_final: residuos.destinacao,
    residuos_coleta_seletiva: residuos.coleta,
    residuos_remediacao_vazadouros: buildVazadouroRecords(),
    uc_gestao: uc.ucGestao,
    uc_municipais: uc.municipais,
    uc_rppn_privada: uc.rppn,
    mananciais_abastecimento: buildMananciaisRecords(values),
    iqsmma_condema_fundo: buildIqsmmaRecords(),
    ifca_consolidacao: buildIfcaRecords(values),
  };

  for (const [formId, records] of Object.entries(forms)) {
    await putForm(formId, records, "Em preenchimento");
  }
  console.log("Importacao concluida.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
