import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Status = "idle" | "loading" | "ready" | "error";
type FormStatus = "nao_iniciado" | "em_preenchimento" | "pendente_documento" | "completo";
type FieldKind = "text" | "number" | "date" | "select" | "textarea" | "file" | "checkbox";

type FieldConfig = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type DigitalFormConfig = {
  id: string;
  module: string;
  title: string;
  description: string;
  spreadsheet?: boolean;
  fields: FieldConfig[];
};

type DraftRecord = Record<string, string | boolean>;

type EvidenceUploadResponse = {
  resultado: {
    documentoId: number;
    caminhoArquivo: string;
    statusValidacao: string;
    arquivoPersistido?: boolean;
  };
};

type ServerFormResponse = {
  resultado: null | {
    id: number;
    formularioCodigo: string;
    status: string;
    respostaJson: DraftRecord;
    atualizadoEm: string;
  };
};

type CommentResponse = {
  resultados: Array<{
    id: number;
    comentario: string;
    criadoEm: string;
  }>;
};

type ComplianceItem = {
  id: string;
  title: string;
  penalty: string;
  formIds: string[];
  requiredFields?: Array<{ formId: string; fields: string[] }>;
};

type ComplianceSection = {
  id: string;
  title: string;
  acronym: string;
  weight: string;
  tone: "green" | "amber" | "red" | "blue";
  items: ComplianceItem[];
};

type EsgotoResultado = {
  pontuacaoFinalMunicipal: number;
  somaPercentualAtendido: number;
  possuiPossivelSobreposicaoPopulacional: boolean;
  totalEstacoes: number;
  estacoes: Array<{
    estacaoId: number;
    nome: string;
    nivelTratamento: string;
    statusCalculo: string;
    percentualPopulacaoAtendida: number;
    reRelatorioEficiencia: number;
    pontuacaoParcial: number;
  }>;
};

type IqsmmaResultado = {
  statusInstitucional: "Regular" | "Atencao" | "Critico";
  requisitos: {
    condema: { atasValidadas: number; minimoExigido: number; regular: boolean };
    fundoMunicipal: {
      statusIqsmma: string;
      mesesSemExtratoValidado: number[];
      possuiSerieCompletaDeExtratos: boolean;
    };
  };
  alertas: Array<{
    titulo: string;
    descricao: string;
    nivelImpactoIfca: "Alto" | "Medio" | "Baixo";
    tipo: string;
  }>;
};

type ResiduosResultado = {
  fatorReciclagem: number;
  percentualReciclagem: number;
  totalReciclaveisT: number;
  totalRsuAnualT: number;
  tipoSistema: string;
  registrosValidadosConsiderados: number;
  totaisPorMaterial: { papelT: number; plasticoT: number; vidroT: number; metalT: number };
};

type ReportCellKind = "text" | "number" | "select";

type ReportColumn<T extends Record<string, string>> = {
  key: keyof T;
  label: string;
  kind?: ReportCellKind;
  options?: string[];
  readOnly?: boolean;
};

type EteReportRow = {
  nomeEte: string;
  localidade: string;
  tipoTratamento: string;
  populacaoAtendida: string;
  vazaoMedia: string;
  dboAfluente: string;
  dboEfluente: string;
  eficienciaRemocao: string;
};

type ColetaReportRow = {
  razaoSocial: string;
  cnpj: string;
  catadores: string;
  cadastroSinir: string;
  material: string;
  janeiro: string;
  fevereiro: string;
  marco: string;
  abril: string;
  maio: string;
  junho: string;
  julho: string;
  agosto: string;
  setembro: string;
  outubro: string;
  novembro: string;
  dezembro: string;
};

type FundoReportRow = {
  saldoInicial: string;
  repassesRecebidos: string;
  despesasLiquidadas: string;
  saldoFinal: string;
  acaoAmbiental: string;
  documentoComprobatorio: string;
};

type UcReportRow = {
  unidadeConservacao: string;
  atoCriacao: string;
  infraestruturaSede: string;
  conselhoGestor: string;
  planoManejo: string;
  observacoes: string;
};

const cicloId = 1;
const draftPrefix = "icms-ni-draft";
const reportPrefix = "icms-ni-report";
const profileKey = "icms-ni-profile";

type UserProfile = {
  nome: string;
  perfil: "Administrador" | "Gestor Municipal" | "Tecnico" | "Visualizador";
};

const scoreAxes = [
  { key: "mananciais", label: "Mananciais", weight: 0.10, formIds: ["mananciais_abastecimento"] },
  { key: "esgoto", label: "Tratamento de Esgoto", weight: 0.20, formIds: ["esgoto_ete_laudos", "esgoto_procon_agua"] },
  { key: "destinacao", label: "Destinacao de Residuos", weight: 0.20, formIds: ["residuos_destinacao_final"] },
  { key: "remediacao", label: "Remediacao de Vazadouros", weight: 0.05, formIds: ["residuos_remediacao_vazadouros"] },
  { key: "areas", label: "Areas Protegidas", weight: 0.36, formIds: ["uc_gestao", "uc_rppn_privada"] },
  { key: "municipais", label: "Areas Protegidas Municipais", weight: 0.09, formIds: ["uc_municipais"] },
];

const digitalForms: DigitalFormConfig[] = [
  {
    id: "residuos_destinacao_final",
    module: "residuos",
    title: "Destinacao Final de Residuos Solidos",
    description:
      "Comprova tipo de destinacao, massa de RSU encaminhada, licenciamento do destino, tratamento de percolado e evidencias documentais.",
    spreadsheet: true,
    fields: [
      { name: "tipoDestinacao", label: "Tipo de destinacao final", kind: "select", required: true, options: ["Aterro sanitario", "Aterro controlado", "Lixao/vazadouro", "Unidade de transbordo", "Outro"] },
      { name: "unidadeDestino", label: "Nome da unidade de destino", kind: "text", required: true, placeholder: "Ex.: CTR / Aterro contratado" },
      { name: "municipioDestino", label: "Municipio de destino", kind: "text", required: true },
      { name: "operador", label: "Operador responsavel", kind: "text", required: true },
      { name: "cnpjAterroReceptor", label: "CNPJ da CTR/Aterro receptor", kind: "text", required: true },
      { name: "licencaAmbiental", label: "Numero da licenca ambiental", kind: "text", required: true },
      { name: "validadeLicenca", label: "Validade da licenca", kind: "date", required: true },
      { name: "volumeTotalRsuGerado", label: "Volume total de RSU gerado (t/ano)", kind: "number", required: true },
      { name: "volumeRejeitosDestinados", label: "Volume de rejeitos destinados ao aterro (t/ano)", kind: "number", required: true },
      { name: "massaRsuAnualT", label: "Massa anual enviada (t)", kind: "number", required: true },
      { name: "percentualRsuDestino", label: "Percentual do RSU municipal destinado (%)", kind: "number", required: true },
      { name: "tratamentoPercolado", label: "Tratamento de percolado", kind: "select", required: true, options: ["Nao informado", "Primario", "Secundario", "Terciario"] },
      { name: "captacaoGases", label: "Possui captacao/queima de gases?", kind: "select", required: true, options: ["Sim", "Nao", "Nao se aplica"] },
      { name: "possuiLixaoAtivo", label: "Existe lixao/vazadouro ativo no municipio?", kind: "select", required: true, options: ["Nao", "Sim"] },
      { name: "numeroMesesDestinacao", label: "Numero de meses com destinacao comprovada", kind: "number", required: true },
      { name: "percentualUsoOutrosMunicipios", label: "Percentual de uso do aterro por outros municipios (%)", kind: "number", required: true },
      { name: "rsuJaneiro", label: "RSU Janeiro (t)", kind: "number", required: true },
      { name: "rsuFevereiro", label: "RSU Fevereiro (t)", kind: "number", required: true },
      { name: "rsuMarco", label: "RSU Marco (t)", kind: "number", required: true },
      { name: "rsuAbril", label: "RSU Abril (t)", kind: "number", required: true },
      { name: "rsuMaio", label: "RSU Maio (t)", kind: "number", required: true },
      { name: "rsuJunho", label: "RSU Junho (t)", kind: "number", required: true },
      { name: "rsuJulho", label: "RSU Julho (t)", kind: "number", required: true },
      { name: "rsuAgosto", label: "RSU Agosto (t)", kind: "number", required: true },
      { name: "rsuSetembro", label: "RSU Setembro (t)", kind: "number", required: true },
      { name: "rsuOutubro", label: "RSU Outubro (t)", kind: "number", required: true },
      { name: "rsuNovembro", label: "RSU Novembro (t)", kind: "number", required: true },
      { name: "rsuDezembro", label: "RSU Dezembro (t)", kind: "number", required: true },
      { name: "responsavelDestinacao", label: "Responsavel pelas informacoes", kind: "text", required: true },
      { name: "cargoResponsavelDestinacao", label: "Cargo do responsavel", kind: "text", required: true },
      { name: "dataAssinaturaDestinacao", label: "Data", kind: "date", required: true },
      { name: "assinaturaDestinacao", label: "Upload assinatura/declaracao do responsavel", kind: "file", required: true },
      { name: "documentoLicenca", label: "Upload da licenca ambiental", kind: "file", required: true },
      { name: "cdfMtrConsolidado", label: "Upload do CDF ou MTR consolidado SINIR/INEA", kind: "file", required: true },
      { name: "documentoContrato", label: "Upload do contrato/declaracao do operador", kind: "file", required: true },
      { name: "documentoPesagem", label: "Upload de relatorio de pesagens/MTR", kind: "file", required: true },
      { name: "comprovanteRecebimentoAterro", label: "Upload comprovante de recebimento do rejeito pelo aterro licenciado", kind: "file", required: true },
      { name: "laudoInexistenciaLixao", label: "Upload laudo/declaracao de inexistencia de lixoes ativos", kind: "file", required: true },
    ],
  },
  {
    id: "residuos_coleta_seletiva",
    module: "residuos",
    title: "Coleta Seletiva e Cooperativas",
    description: "Registra pesagens por material reciclavel e comprovantes das cooperativas beneficiarias.",
    spreadsheet: true,
    fields: [
      { name: "cooperativa", label: "Cooperativa/associacao", kind: "text", required: true },
      { name: "cnpjCooperativa", label: "CNPJ da cooperativa/associacao", kind: "text", required: true },
      { name: "catadoresCooperados", label: "Numero de catadores cooperados", kind: "number", required: true },
      { name: "mesReferencia", label: "Mes de referencia", kind: "select", required: true, options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
      { name: "papelT", label: "Papel (t)", kind: "number", required: true },
      { name: "plasticoT", label: "Plastico (t)", kind: "number", required: true },
      { name: "vidroT", label: "Vidro (t)", kind: "number", required: true },
      { name: "metalT", label: "Metal (t)", kind: "number", required: true },
      { name: "notaFiscalMtr", label: "Upload da nota fiscal ou MTR", kind: "file", required: true },
      { name: "parceriaCatadores", label: "Upload do termo de colaboracao/contrato com catadores", kind: "file", required: true },
      { name: "tipoColeta", label: "Tipo de coleta", kind: "select", required: true, options: ["Domiciliar", "Ponto a ponto", "UTC"] },
      { name: "bairrosAtendidos", label: "Bairros atendidos", kind: "textarea", required: true },
      { name: "logradourosAtendidos", label: "Logradouros atendidos", kind: "textarea", required: true },
      { name: "domiciliosAtendidos", label: "Quantidade de domicilios atendidos", kind: "number", required: true },
      { name: "localizacaoPevs", label: "Localizacao dos PEVs", kind: "textarea", required: true },
      { name: "quantidadePevs", label: "Quantidade total de PEVs", kind: "number", required: true },
      { name: "totalMensalReciclaveis", label: "Total mensal reciclaveis (t)", kind: "number", required: true },
      { name: "mediaAnualReciclaveis", label: "Media anual reciclaveis (t)", kind: "number", required: true },
      { name: "inclusaoCatadores", label: "Ha inclusao formal de catadores?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "responsavelColeta", label: "Responsavel", kind: "text", required: true },
      { name: "cargoResponsavelColeta", label: "Cargo", kind: "text", required: true },
      { name: "dataColeta", label: "Data", kind: "date", required: true },
      { name: "imagemSateliteArea", label: "Upload imagem de satelite da area atendida", kind: "file", required: true },
      { name: "cnpjCooperativaUpload", label: "Upload comprovante CNPJ da cooperativa", kind: "file", required: true },
      { name: "contratoEmpresaColeta", label: "Upload contrato com empresa, se houver", kind: "file", required: false },
      { name: "licencaUtc", label: "Upload licenca da UTC, se houver", kind: "file", required: false },
    ],
  },
  {
    id: "residuos_consorcio_intermunicipal",
    module: "residuos",
    title: "Consorcio Intermunicipal de Residuos",
    description: "Comprova participacao em consorcio publico, protocolo de intencoes, estatuto, lei autorizativa e contrato de rateio.",
    spreadsheet: false,
    fields: [
      { name: "participaConsorcio", label: "Municipio participa de consorcio?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "nomeConsorcio", label: "Nome do consorcio", kind: "text", required: true },
      { name: "cnpjConsorcio", label: "CNPJ do consorcio", kind: "text", required: true },
      { name: "dataAdesao", label: "Data de adesao", kind: "date", required: true },
      { name: "contratoRateio", label: "Contrato de rateio", kind: "text", required: true },
      { name: "documentoFormacao", label: "Upload documento de formacao", kind: "file", required: true },
      { name: "protocoloIntencoes", label: "Upload protocolo de intencoes", kind: "file", required: true },
      { name: "estatutoSocial", label: "Upload estatuto social", kind: "file", required: true },
      { name: "leiAutorizativa", label: "Upload lei municipal autorizando participacao", kind: "file", required: true },
      { name: "cnpjConsorcioUpload", label: "Upload comprovante CNPJ", kind: "file", required: true },
      { name: "contratoRateioUpload", label: "Upload contrato de rateio", kind: "file", required: true },
    ],
  },
  {
    id: "residuos_pmgirs",
    module: "residuos",
    title: "Plano Municipal de Gestao Integrada de Residuos Solidos",
    description:
      "Comprova elaboracao, validade, aprovacao social e conteudo minimo do PMGIRS para bonificacao qualitativa do IQSMMA.",
    spreadsheet: false,
    fields: [
      { name: "possuiPlano", label: "Municipio possui PMGIRS em versao final?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "anoElaboracaoPmgirs", label: "Ano de elaboracao", kind: "number", required: true },
      { name: "instituidoLeiDecretoPmgirs", label: "Instituido por lei/decreto?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "dataPlano", label: "Data do plano", kind: "date", required: true },
      { name: "vigentePmgirs", label: "Esta vigente?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "prazoRevisao", label: "Plano esta dentro do prazo de revisao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "houveAudienciaPmgirs", label: "Houve audiencia publica?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "houveRevisaoPmgirs", label: "Houve revisao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeTerritorio", label: "Abrange todo o territorio municipal?", kind: "select", required: true, options: ["Sim", "Nao", "Parcialmente"] },
      { name: "controleSocial", label: "Houve audiencia, conselho ou consulta publica?", kind: "select", required: true, options: ["Audiencia publica", "Conselho municipal", "Consulta publica", "Nao comprovado"] },
      { name: "planoUpload", label: "Upload do PMGIRS datado", kind: "file", required: true },
      { name: "leiDecretoPmgirsUpload", label: "Upload lei/decreto do PMGIRS", kind: "file", required: true },
      { name: "ataAprovacao", label: "Upload da ata/relatorio de participacao social", kind: "file", required: true },
      { name: "listaPresencaPmgirsUpload", label: "Upload lista de presenca", kind: "file", required: true },
      { name: "publicacaoOficialPmgirsUpload", label: "Upload publicacao oficial", kind: "file", required: true },
      { name: "revisaoPmgirsUpload", label: "Upload revisao do plano", kind: "file", required: true },
      { name: "matrizConteudo", label: "Upload da matriz de conteudo minimo", kind: "file", required: true },
    ],
  },
  {
    id: "residuos_oleo_vegetal",
    module: "residuos",
    title: "Coleta de Oleo Vegetal",
    description:
      "Registra acao complementar de coleta de oleo vegetal, pontos participantes, volume coletado e comprovantes de destinacao.",
    spreadsheet: true,
    fields: [
      { name: "programaOleo", label: "Existe programa ou acao de coleta de oleo vegetal?", kind: "select", required: true, options: ["Sim", "Nao", "Em implantacao"] },
      { name: "prefeituraOleo", label: "Prefeitura", kind: "text", required: true },
      { name: "cnpjPrefeituraOleo", label: "CNPJ da Prefeitura", kind: "text", required: true },
      { name: "enderecoOleo", label: "Endereco", kind: "text", required: true },
      { name: "numeroDocumentoOleo", label: "Numero do MTR, CDF ou declaracao", kind: "text", required: true },
      { name: "dataDocumentoOleo", label: "Data", kind: "date", required: true },
      { name: "descricaoResiduoOleo", label: "Descricao do residuo", kind: "text", required: true },
      { name: "pontosColeta", label: "Quantidade de pontos de coleta", kind: "number", required: true },
      { name: "volumeLitros", label: "Volume anual coletado (litros)", kind: "number", required: true },
      { name: "transportadorOleo", label: "Transportador", kind: "text", required: true },
      { name: "cnpjTransportadorOleo", label: "CNPJ do transportador", kind: "text", required: true },
      { name: "licencaTransportadorOleo", label: "Licenca/certidao do transportador", kind: "text", required: true },
      { name: "receptorOleo", label: "Receptor", kind: "text", required: true },
      { name: "cnpjReceptorOleo", label: "CNPJ do receptor", kind: "text", required: true },
      { name: "licencaReceptorOleo", label: "Licenca/certidao do receptor", kind: "text", required: true },
      { name: "destinador", label: "Empresa/cooperativa destinadora", kind: "text", required: true },
      { name: "responsavelOleo", label: "Responsavel", kind: "text", required: true },
      { name: "cargoResponsavelOleo", label: "Cargo", kind: "text", required: true },
      { name: "emailResponsavelOleo", label: "E-mail", kind: "text", required: true },
      { name: "telefoneResponsavelOleo", label: "Telefone", kind: "text", required: true },
      { name: "relatorioOleo", label: "Upload do relatorio anual de coleta", kind: "file", required: true },
      { name: "mtrOleoUpload", label: "Upload MTR", kind: "file", required: true },
      { name: "cdfOleoUpload", label: "Upload CDF", kind: "file", required: true },
      { name: "declaracaoDestinacaoOleo", label: "Upload declaracao de destinacao", kind: "file", required: true },
      { name: "licencasAmbientaisOleo", label: "Upload licencas ambientais", kind: "file", required: true },
      { name: "certidoesInexigibilidadeOleo", label: "Upload certidoes de inexigibilidade", kind: "file", required: true },
      { name: "comprovanteDestinacao", label: "Upload do comprovante de destinacao", kind: "file", required: true },
    ],
  },
  {
    id: "residuos_remediacao_vazadouros",
    module: "residuos",
    title: "Remediacao de Vazadouros",
    description: "Controla status de vazadouros/lixoes, LAR, projeto de remediacao, condicionantes e monitoramento.",
    spreadsheet: true,
    fields: [
      { name: "existeVazadouro", label: "Existe vazadouro/lixao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "estagioRemediacao", label: "Estagio", kind: "select", required: true, options: ["Nao remediado", "Em remediacao", "Remediado"] },
      { name: "possuiLarValida", label: "Existe LAR valida?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "numeroLar", label: "Numero da licenca", kind: "text", required: true },
      { name: "validadeLar", label: "Validade da licenca", kind: "date", required: true },
      { name: "descricaoObras", label: "Descricao das obras", kind: "textarea", required: true },
      { name: "cronogramaRemediacao", label: "Cronograma", kind: "textarea", required: true },
      { name: "anoExecucaoRemediacao", label: "Ano de execucao", kind: "number", required: true },
      { name: "responsavelTecnicoRemediacao", label: "Responsavel tecnico", kind: "text", required: true },
      { name: "larUpload", label: "Upload Licenca Ambiental de Recuperacao", kind: "file", required: true },
      { name: "condicionantesUpload", label: "Upload relatorio de condicionantes", kind: "file", required: true },
      { name: "projetoRemediacaoUpload", label: "Upload projeto de remediacao", kind: "file", required: true },
      { name: "cronogramaUpload", label: "Upload cronograma de execucao", kind: "file", required: true },
      { name: "monitoramentoUpload", label: "Upload relatorio de monitoramento", kind: "file", required: true },
    ],
  },
  {
    id: "esgoto_ete_laudos",
    module: "esgoto",
    title: "ETE, Licenca e Laudos de Eficiencia",
    description: "Cadastro operacional para pontuacao de esgotamento sanitario: populacao atendida, nivel de tratamento, licenca e laudos DBO.",
    spreadsheet: true,
    fields: [
      { name: "nomeEte", label: "Nome da ETE/ETR", kind: "text", required: true },
      { name: "tipoUnidade", label: "Tipo da unidade", kind: "select", required: true, options: ["ETE", "ETR", "Elevatoria", "Emissario Submarino", "Outro"] },
      { name: "nivelTratamento", label: "Nivel de tratamento", kind: "select", required: true, options: ["Primario", "Secundario", "Terciario", "Emissario Submarino"] },
      { name: "populacaoAtendida", label: "Populacao atendida", kind: "number", required: true },
      { name: "populacaoUrbanaReferencia", label: "Populacao urbana total de referencia (IBGE)", kind: "number", required: true },
      { name: "vazaoProjeto", label: "Vazao media anual de projeto (m3/dia)", kind: "number", required: true },
      { name: "vazaoRealOperada", label: "Vazao real operada (m3/dia)", kind: "number", required: true },
      { name: "vazaoMedia", label: "Vazao media anual (m3/dia)", kind: "number", required: true },
      { name: "dboAfluente", label: "Carga organica afluente - DBO (mg/L)", kind: "number", required: true },
      { name: "dboEfluente", label: "Carga organica efluente - DBO (mg/L)", kind: "number", required: true },
      { name: "proconAgua", label: "Vinculada ao Procon Agua?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "licencaEte", label: "Upload da licenca da ETE", kind: "file", required: true },
      { name: "laudoDbo", label: "Upload dos laudos mensais DBO", kind: "file", required: true },
      { name: "certificadoLaboratorio", label: "Upload certificado laboratorio credenciado", kind: "file", required: true },
    ],
  },
  {
    id: "esgoto_pmsb",
    module: "esgoto",
    title: "Plano Municipal de Saneamento Basico",
    description:
      "Comprova o PMSB, seus quatro componentes, instituicao legal, audiencia publica, controle social e conteudo minimo.",
    spreadsheet: false,
    fields: [
      { name: "possuiPmsb", label: "Possui PMSB em versao final?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeAguaPmsb", label: "Abrange abastecimento de agua?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeEsgotoPmsb", label: "Abrange esgotamento sanitario?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeResiduosPmsb", label: "Abrange residuos solidos?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeDrenagemPmsb", label: "Abrange drenagem urbana?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "anoPlanoPmsb", label: "Ano do plano", kind: "number", required: true },
      { name: "dentroPrazo", label: "Dentro do prazo de revisao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "componentes", label: "Componentes contemplados", kind: "select", required: true, options: ["4 componentes", "2 ou 3 componentes", "Menos de 2 componentes"] },
      { name: "instituidoLegalmente", label: "Instituido por Lei ou Decreto Municipal?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "conteudoMinimo", label: "Percentual do conteudo minimo atendido (%)", kind: "number", required: true },
      { name: "controleSocialPmsb", label: "Mecanismo de controle social", kind: "select", required: true, options: ["Conselho", "Audiencia publica", "Consulta publica", "Conferencia", "Nao comprovado"] },
      { name: "estaVigentePmsb", label: "Esta vigente?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "pmsbUpload", label: "Upload do PMSB datado", kind: "file", required: true },
      { name: "leiDecretoUpload", label: "Upload da Lei/Decreto de instituicao", kind: "file", required: true },
      { name: "audienciaUpload", label: "Upload do relatorio/ata/lista de presenca", kind: "file", required: true },
      { name: "listaPresencaPmsbUpload", label: "Upload lista de presenca", kind: "file", required: true },
      { name: "publicacaoOficialPmsbUpload", label: "Upload publicacao oficial", kind: "file", required: true },
      { name: "revisaoPmsbUpload", label: "Upload revisao", kind: "file", required: true },
      { name: "matrizPmsbUpload", label: "Upload da matriz de conteudo minimo", kind: "file", required: true },
    ],
  },
  {
    id: "esgoto_procon_agua",
    module: "esgoto",
    title: "PROCON Agua e Autocontrole de Efluentes",
    description:
      "Organiza evidencias de vinculo ao PROCON Agua, RAE, laudos mensais e laboratorios credenciados pelo INEA.",
    spreadsheet: true,
    fields: [
      { name: "empreendimento", label: "ETE/empreendimento vinculado", kind: "text", required: true },
      { name: "vinculoProcon", label: "Possui vinculo no PROCON Agua?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "raeEnviado", label: "RAE enviado regularmente?", kind: "select", required: true, options: ["Sim", "Nao", "Parcialmente"] },
      { name: "mesesLaudo", label: "Quantidade de meses com laudo DBO", kind: "number", required: true },
      { name: "proconComprovante", label: "Upload comprovante de vinculo PROCON Agua", kind: "file", required: true },
      { name: "raeUpload", label: "Upload dos RAEs/relatorios de autocontrole", kind: "file", required: true },
    ],
  },
  {
    id: "uc_gestao",
    module: "uc",
    title: "Unidades de Conservacao e Qualidade de Gestao",
    description:
      "Registra dados de gestao do Parque Natural Municipal de Nova Iguacu, Rebio Tingua, APA Guandu e demais areas protegidas.",
    spreadsheet: true,
    fields: [
      { name: "nomeUc", label: "Unidade de Conservacao", kind: "text", required: true },
      { name: "categoriaUc", label: "Categoria", kind: "select", required: true, options: ["PI", "US"] },
      { name: "esferaUc", label: "Esfera", kind: "select", required: true, options: ["Municipal", "Estadual", "Federal"] },
      { name: "areaTotalUcHa", label: "Area total da UC (ha)", kind: "number", required: true },
      { name: "areaMunicipioHa", label: "Area incidente em Nova Iguacu (ha)", kind: "number", required: true },
      { name: "planoManejo", label: "Status do Plano de Manejo", kind: "select", required: true, options: ["Atualizado", "Vencido", "Inexistente", "Em revisao"] },
      { name: "dataPublicacaoPlanoManejo", label: "Data de publicacao/aprovacao do Plano de Manejo", kind: "date", required: true },
      { name: "conselhoGestor", label: "Status do Conselho Gestor", kind: "select", required: true, options: ["Ativo", "Inativo", "Inexistente", "Pendente"] },
      { name: "sedeAdministrativa", label: "Sede administrativa", kind: "select", required: true, options: ["Nao possui", "Parcial", "Comprovada"] },
      { name: "equipeTecnicaUc", label: "Equipe tecnica", kind: "textarea", required: true },
      { name: "fiscalizacaoUc", label: "Fiscalizacao", kind: "textarea", required: true },
      { name: "educacaoAmbientalUc", label: "Educacao ambiental", kind: "textarea", required: true },
      { name: "pesquisaCientificaUc", label: "Pesquisa cientifica", kind: "textarea", required: true },
      { name: "sinalizacaoUc", label: "Sinalizacao", kind: "select", required: true, options: ["Inexistente", "Parcial", "Adequada"] },
      { name: "regularizacaoFundiaria", label: "Regularizacao fundiaria", kind: "select", required: true, options: ["Nao iniciada", "Em andamento", "Regularizada"] },
      { name: "grauConservacao", label: "Grau de conservacao", kind: "select", required: true, options: ["Baixo", "Medio", "Alto"] },
      { name: "grauImplementacao", label: "Grau de implementacao", kind: "select", required: true, options: ["Baixo", "Medio", "Alto"] },
      { name: "infraestrutura", label: "Infraestrutura e equipamentos comprovados", kind: "textarea", required: false },
      { name: "atoCriacaoUc", label: "Upload do Ato de Criacao/Decreto da UC", kind: "file", required: true },
      { name: "memorialDescritivoUc", label: "Upload do memorial descritivo/coordenadas geograficas", kind: "file", required: true },
      { name: "shapefileUc", label: "Upload do arquivo shapefile (.shp/.zip)", kind: "file", required: true },
      { name: "limiteVetor", label: "Upload limite vetorial/mapa da UC", kind: "file", required: true },
      { name: "planoManejoUpload", label: "Upload do Plano de Manejo", kind: "file", required: true },
      { name: "atasConselhoUc", label: "Upload atas do Conselho Gestor", kind: "file", required: true },
      { name: "fotosInfra", label: "Upload fotos/relatorio de infraestrutura", kind: "file", required: true },
      { name: "relatorioInvestimentoGestaoUc", label: "Upload relatorio de investimentos, guarda-parques, brigadistas e combate a incendios", kind: "file", required: true },
      { name: "comprovantesAcoesUc", label: "Upload comprovantes das acoes", kind: "file", required: true },
    ],
  },
  {
    id: "uc_municipais",
    module: "uc",
    title: "Areas Protegidas Municipais",
    description: "Formulario especifico para UCs municipais, com os mesmos criterios de qualidade de gestao filtrados para a esfera municipal.",
    spreadsheet: true,
    fields: [
      { name: "nomeUcMunicipal", label: "Nome da UC municipal", kind: "text", required: true },
      { name: "categoriaUcMunicipal", label: "Categoria", kind: "select", required: true, options: ["PI", "US"] },
      { name: "areaTotalUcMunicipal", label: "Area total (ha)", kind: "number", required: true },
      { name: "areaMunicipioUcMunicipal", label: "Area no municipio (ha)", kind: "number", required: true },
      { name: "atoCriacaoUcMunicipal", label: "Ato de criacao", kind: "text", required: true },
      { name: "planoManejoUcMunicipal", label: "Plano de manejo", kind: "select", required: true, options: ["Nao possui", "Desatualizado", "Atualizado"] },
      { name: "conselhoGestorUcMunicipal", label: "Conselho gestor", kind: "select", required: true, options: ["Inexistente", "Instituido", "Ativo"] },
      { name: "sedeUcMunicipal", label: "Sede administrativa", kind: "select", required: true, options: ["Nao possui", "Parcial", "Comprovada"] },
      { name: "equipeUcMunicipal", label: "Equipe tecnica", kind: "textarea", required: true },
      { name: "fiscalizacaoUcMunicipal", label: "Fiscalizacao", kind: "textarea", required: true },
      { name: "educacaoUcMunicipal", label: "Educacao ambiental", kind: "textarea", required: true },
      { name: "pesquisaUcMunicipal", label: "Pesquisa cientifica", kind: "textarea", required: true },
      { name: "infraUcMunicipal", label: "Infraestrutura", kind: "textarea", required: true },
      { name: "sinalizacaoUcMunicipal", label: "Sinalizacao", kind: "select", required: true, options: ["Inexistente", "Parcial", "Adequada"] },
      { name: "regularizacaoUcMunicipal", label: "Regularizacao fundiaria", kind: "select", required: true, options: ["Nao iniciada", "Em andamento", "Regularizada"] },
      { name: "grauConservacaoUcMunicipal", label: "Grau de conservacao", kind: "select", required: true, options: ["Baixo", "Medio", "Alto"] },
      { name: "grauImplementacaoUcMunicipal", label: "Grau de implementacao", kind: "select", required: true, options: ["Baixo", "Medio", "Alto"] },
      { name: "atoLegalUcMunicipalUpload", label: "Upload ato legal de criacao", kind: "file", required: true },
      { name: "mapaUcMunicipalUpload", label: "Upload mapa/georreferenciamento", kind: "file", required: true },
      { name: "planoManejoUcMunicipalUpload", label: "Upload plano de manejo", kind: "file", required: true },
      { name: "atasUcMunicipalUpload", label: "Upload atas do conselho", kind: "file", required: true },
      { name: "relatorioGestaoUcMunicipalUpload", label: "Upload relatorio de gestao", kind: "file", required: true },
      { name: "fotosUcMunicipalUpload", label: "Upload fotos", kind: "file", required: true },
      { name: "comprovantesUcMunicipalUpload", label: "Upload comprovantes das acoes", kind: "file", required: true },
    ],
  },
  {
    id: "uc_rppn_privada",
    module: "uc",
    title: "RPPN / Unidade de Conservacao Privada",
    description: "Cadastro de RPPN e areas protegidas privadas com ato de reconhecimento, plano de manejo e acoes de conservacao.",
    spreadsheet: true,
    fields: [
      { name: "nomeRppn", label: "Nome da RPPN", kind: "text", required: true },
      { name: "proprietarioRppn", label: "Proprietario", kind: "text", required: true },
      { name: "areaRppn", label: "Area (ha)", kind: "number", required: true },
      { name: "municipioRppn", label: "Municipio", kind: "text", required: true },
      { name: "atoReconhecimentoRppn", label: "Ato de reconhecimento", kind: "text", required: true },
      { name: "planoManejoRppn", label: "Plano de manejo", kind: "select", required: true, options: ["Nao possui", "Em elaboracao", "Aprovado"] },
      { name: "acoesConservacaoRppn", label: "Acoes de conservacao", kind: "textarea", required: true },
      { name: "fiscalizacaoRppn", label: "Fiscalizacao", kind: "textarea", required: true },
      { name: "pesquisaRppn", label: "Pesquisa", kind: "textarea", required: true },
      { name: "educacaoRppn", label: "Educacao ambiental", kind: "textarea", required: true },
      { name: "infraestruturaRppn", label: "Infraestrutura", kind: "textarea", required: true },
      { name: "portariaRppnUpload", label: "Upload portaria/ato de reconhecimento", kind: "file", required: true },
      { name: "mapaRppnUpload", label: "Upload mapa", kind: "file", required: true },
      { name: "planoManejoRppnUpload", label: "Upload plano de manejo", kind: "file", required: true },
      { name: "relatorioAtividadesRppnUpload", label: "Upload relatorio de atividades", kind: "file", required: true },
      { name: "fotosRppnUpload", label: "Upload fotos", kind: "file", required: true },
      { name: "documentosRppnUpload", label: "Upload documentos comprobatorios", kind: "file", required: true },
    ],
  },
  {
    id: "uc_mata_atlantica",
    module: "uc",
    title: "Plano Municipal da Mata Atlantica",
    description:
      "Comprova PMMA, aprovacao pelo Conselho Municipal de Meio Ambiente e acoes de conservacao/restauracao.",
    spreadsheet: false,
    fields: [
      { name: "possuiPmma", label: "Possui PMMA?", kind: "select", required: true, options: ["Sim", "Nao", "Em elaboracao"] },
      { name: "anoElaboracaoPmma", label: "Ano de elaboracao", kind: "number", required: true },
      { name: "atoInstituicaoPmma", label: "Ato de instituicao", kind: "text", required: true },
      { name: "diagnosticoAmbientalPmma", label: "Diagnostico ambiental", kind: "textarea", required: true },
      { name: "areasPrioritariasPmma", label: "Areas prioritarias", kind: "textarea", required: true },
      { name: "aprovadoConselho", label: "Aprovado pelo Conselho Municipal de Meio Ambiente?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "dataAprovacao", label: "Data de aprovacao", kind: "date", required: true },
      { name: "acoesRestauracao", label: "Acoes de conservacao/restauracao executadas", kind: "textarea", required: true },
      { name: "estagioPmma", label: "Estagio", kind: "select", required: true, options: ["Planejado", "Parcial", "Implementado"] },
      { name: "pmmaUpload", label: "Upload do PMMA", kind: "file", required: true },
      { name: "decretoLeiPmmaUpload", label: "Upload decreto/lei", kind: "file", required: true },
      { name: "ataPmmaUpload", label: "Upload ata de aprovacao do PMMA", kind: "file", required: true },
      { name: "relatorioAcoes", label: "Upload relatorio das acoes", kind: "file", required: true },
      { name: "mapasPmmaUpload", label: "Upload mapas", kind: "file", required: true },
      { name: "fotosPmmaUpload", label: "Upload fotos", kind: "file", required: true },
      { name: "publicacaoOficialPmmaUpload", label: "Upload publicacao oficial", kind: "file", required: true },
    ],
  },
  {
    id: "mananciais_abastecimento",
    module: "uc",
    title: "Mananciais de Abastecimento",
    description:
      "Registra bacias, pontos de captacao, area de drenagem municipal e documentos cartograficos para calculo do IrMA.",
    spreadsheet: true,
    fields: [
      { name: "nomeBacia", label: "Bacia/manancial", kind: "text", required: true },
      { name: "pontoCaptacao", label: "Ponto de captacao", kind: "text", required: true },
      { name: "areaTotalBaciaHa", label: "Area total da bacia/zona de protecao (ha)", kind: "number", required: true },
      { name: "populacaoDependente", label: "Populacao regional dependente do manancial", kind: "number", required: true },
      { name: "abasteceForaBacia", label: "Abastece municipios fora da bacia?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "dependeTransposicao", label: "Depende de agua transposta?", kind: "select", required: true, options: ["Sim", "Nao", "Parcialmente"] },
      { name: "areaDrenagemTotal", label: "Area drenagem total da bacia (km2)", kind: "number", required: true },
      { name: "areaDrenagemMunicipal", label: "Area drenagem em Nova Iguacu (km2)", kind: "number", required: true },
      { name: "fonteCartografica", label: "Fonte cartografica", kind: "text", required: true },
      { name: "atoLegalManancial", label: "Upload do ato legal de protecao do manancial", kind: "file", required: true },
      { name: "mapaDrenagem", label: "Upload mapa/shape/relatorio cartografico", kind: "file", required: true },
      { name: "declaracaoCaptacao", label: "Upload declaracao do ponto de captacao", kind: "file", required: true },
    ],
  },
  {
    id: "iqsmma_condema_fundo",
    module: "iqsmma",
    title: "CONDEMA e Fundo Municipal",
    description: "Comprova funcionamento do conselho e regularidade dos repasses ao Fundo Municipal de Meio Ambiente.",
    spreadsheet: false,
    fields: [
      { name: "atasCondema", label: "Quantidade de atas CONDEMA validadas", kind: "number", required: true },
      { name: "dataReuniaoCondema", label: "Data da reuniao CONDEMA mais recente", kind: "date", required: true },
      { name: "caraterReuniaoCondema", label: "Carater da reuniao", kind: "select", required: true, options: ["Ordinaria", "Extraordinaria"] },
      { name: "assuntoReuniaoCondema", label: "Assunto/pauta principal da reuniao", kind: "text", required: true },
      { name: "quorumGovernamental", label: "Quorum governamental presente", kind: "number", required: true },
      { name: "quorumNaoGovernamental", label: "Quorum nao-governamental presente", kind: "number", required: true },
      { name: "leiCondema", label: "Numero da Lei de criacao do CONDEMA", kind: "text", required: true },
      { name: "decretoNomeacaoCondema", label: "Numero do Decreto de nomeacao dos membros", kind: "text", required: true },
      { name: "leiFundo", label: "Numero da lei de criacao do Fundo", kind: "text", required: true },
      { name: "cnpjFundo", label: "CNPJ do Fundo Municipal", kind: "text", required: true },
      { name: "bancoFundo", label: "Banco oficial do Fundo", kind: "text", required: true },
      { name: "agenciaFundo", label: "Agencia bancaria do Fundo", kind: "text", required: true },
      { name: "contaFundo", label: "Conta bancaria do Fundo", kind: "text", required: true },
      { name: "normaRepasse", label: "Norma de repasse do ICMS Ecologico", kind: "text", required: true },
      { name: "percentualRepasse", label: "Percentual previsto de repasse (%)", kind: "number", required: true },
      { name: "repasseJaneiro", label: "Valor repassado Janeiro (R$)", kind: "number", required: true },
      { name: "repasseFevereiro", label: "Valor repassado Fevereiro (R$)", kind: "number", required: true },
      { name: "repasseMarco", label: "Valor repassado Marco (R$)", kind: "number", required: true },
      { name: "repasseAbril", label: "Valor repassado Abril (R$)", kind: "number", required: true },
      { name: "repasseMaio", label: "Valor repassado Maio (R$)", kind: "number", required: true },
      { name: "repasseJunho", label: "Valor repassado Junho (R$)", kind: "number", required: true },
      { name: "repasseJulho", label: "Valor repassado Julho (R$)", kind: "number", required: true },
      { name: "repasseAgosto", label: "Valor repassado Agosto (R$)", kind: "number", required: true },
      { name: "repasseSetembro", label: "Valor repassado Setembro (R$)", kind: "number", required: true },
      { name: "repasseOutubro", label: "Valor repassado Outubro (R$)", kind: "number", required: true },
      { name: "repasseNovembro", label: "Valor repassado Novembro (R$)", kind: "number", required: true },
      { name: "repasseDezembro", label: "Valor repassado Dezembro (R$)", kind: "number", required: true },
      { name: "receitaAnualFundo", label: "Receita anual arrecadada pelo Fundo (R$)", kind: "number", required: true },
      { name: "despesaAnualFundo", label: "Despesa anual executada em projetos ambientais (R$)", kind: "number", required: true },
      { name: "leiCondemaUpload", label: "Upload da Lei Municipal de criacao do CONDEMA", kind: "file", required: true },
      { name: "decretoNomeacaoCondemaUpload", label: "Upload do Decreto de nomeacao dos membros do CONDEMA", kind: "file", required: true },
      { name: "atasUpload", label: "Upload das atas do CONDEMA", kind: "file", required: true },
      { name: "listasPresencaCondema", label: "Upload das listas de presenca assinadas do CONDEMA", kind: "file", required: true },
      { name: "leiFundoUpload", label: "Upload da Lei de Criacao do Fundo", kind: "file", required: true },
      { name: "normaRepasseUpload", label: "Upload da Norma de Repasse do ICMS Ecologico", kind: "file", required: true },
      { name: "balancoFundoUpload", label: "Upload do balanco anual de receitas e despesas do Fundo", kind: "file", required: true },
      { name: "comprovantesExecucaoFundo", label: "Upload dos empenhos/pagamentos de projetos ambientais", kind: "file", required: true },
      { name: "extratoJaneiro", label: "Upload extrato bancario Janeiro", kind: "file", required: true },
      { name: "extratoFevereiro", label: "Upload extrato bancario Fevereiro", kind: "file", required: true },
      { name: "extratoMarco", label: "Upload extrato bancario Marco", kind: "file", required: true },
      { name: "extratoAbril", label: "Upload extrato bancario Abril", kind: "file", required: true },
      { name: "extratoMaio", label: "Upload extrato bancario Maio", kind: "file", required: true },
      { name: "extratoJunho", label: "Upload extrato bancario Junho", kind: "file", required: true },
      { name: "extratoJulho", label: "Upload extrato bancario Julho", kind: "file", required: true },
      { name: "extratoAgosto", label: "Upload extrato bancario Agosto", kind: "file", required: true },
      { name: "extratoSetembro", label: "Upload extrato bancario Setembro", kind: "file", required: true },
      { name: "extratoOutubro", label: "Upload extrato bancario Outubro", kind: "file", required: true },
      { name: "extratoNovembro", label: "Upload extrato bancario Novembro", kind: "file", required: true },
      { name: "extratoDezembro", label: "Upload extrato bancario Dezembro", kind: "file", required: true },
    ],
  },
  {
    id: "iqsmma_licenciamento",
    module: "iqsmma",
    title: "Licenciamento Ambiental de Impacto Local",
    description:
      "Formulario dos 15 itens do licenciamento municipal: equipe, infraestrutura, poder de policia, normas, licencas e manifestacoes CONEMA.",
    spreadsheet: true,
    fields: [
      { name: "realizaLicenciamento", label: "Municipio realiza licenciamento ambiental?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "normaMunicipalLicenciamento", label: "Norma municipal", kind: "text", required: true },
      { name: "conselhoMeioAmbienteLicenciamento", label: "Conselho municipal de meio ambiente", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "fundoMunicipalLicenciamento", label: "Fundo municipal", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "infraAdministrativa", label: "Infraestrutura administrativa comprovada?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "equipeHabilitada", label: "Profissionais habilitados em numero compativel?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "poderPolicia", label: "Servidores com poder de policia ambiental?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "legislacaoPropria", label: "Legislacao suplementar propria?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "requerimentosRecebidos", label: "Quantidade de requerimentos recebidos no ano", kind: "number", required: true },
      { name: "processosLicenciadosAno", label: "Processos licenciados no ano", kind: "number", required: true },
      { name: "tiposLicencasEmitidas", label: "Tipos de licencas emitidas", kind: "textarea", required: true },
      { name: "licencasConcedidas", label: "Quantidade de instrumentos concedidos no ano", kind: "number", required: true },
      { name: "leiDecretoLicenciamentoUpload", label: "Upload lei/decreto", kind: "file", required: true },
      { name: "organogramaLicenciamentoUpload", label: "Upload organograma", kind: "file", required: true },
      { name: "infraUpload", label: "Upload descricao/evidencias de infraestrutura", kind: "file", required: true },
      { name: "equipeUpload", label: "Upload relacao de equipe habilitada", kind: "file", required: true },
      { name: "normasUpload", label: "Upload leis/normas de licenciamento e fiscalizacao", kind: "file", required: true },
      { name: "licencasUpload", label: "Upload relacao de licencas concedidas", kind: "file", required: true },
      { name: "publicacoesLicenciamentoUpload", label: "Upload publicacoes oficiais", kind: "file", required: true },
      { name: "conemaUpload", label: "Upload manifestacao CONEMA 95/2022", kind: "file", required: true },
    ],
  },
  {
    id: "iqsmma_seguranca_hidrica",
    module: "iqsmma",
    title: "Programa Municipal de Seguranca Hidrica",
    description: "Registra politica, programa, acoes e documentos de seguranca hidrica municipal.",
    spreadsheet: true,
    fields: [
      { name: "possuiAcoesSegurancaHidrica", label: "Municipio possui acoes de seguranca hidrica?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "estagioSegurancaHidrica", label: "Estagio das acoes", kind: "select", required: true, options: ["Planejadas", "Em implementacao", "Implementadas"] },
      { name: "politicaPublicada", label: "Existe politica municipal publicada?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "programaPublicado", label: "Existe programa municipal publicado?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "objetivosSegurancaHidrica", label: "Objetivos das acoes", kind: "textarea", required: true, placeholder: "Estudos, recursos hidricos, informacoes, oferta hidrica, reducao de consumo, monitoramento, efluentes, saneamento, recuperacao ambiental, PSA, agricultura sustentavel, desassoreamento, inundacoes, drenagem..." },
      { name: "politicaSegurancaUpload", label: "Upload politica municipal", kind: "file", required: true },
      { name: "programaSegurancaUpload", label: "Upload programa municipal", kind: "file", required: true },
      { name: "diarioOficialSegurancaUpload", label: "Upload Diario Oficial", kind: "file", required: true },
      { name: "termoReferenciaSegurancaUpload", label: "Upload termo de referencia", kind: "file", required: true },
      { name: "relatoriosSegurancaUpload", label: "Upload relatorios", kind: "file", required: true },
      { name: "projetosSegurancaUpload", label: "Upload projetos", kind: "file", required: true },
      { name: "comprovantesSegurancaUpload", label: "Upload comprovantes das acoes", kind: "file", required: true },
    ],
  },
  {
    id: "iqsmma_educacao_ambiental",
    module: "iqsmma",
    title: "Programa Municipal de Educacao Ambiental",
    description:
      "Comprova programa, acoes executadas, publico atendido, periodicidade e documentos das atividades de educacao ambiental.",
    spreadsheet: true,
    fields: [
      { name: "possuiPrograma", label: "Possui Programa Municipal de Educacao Ambiental?", kind: "select", required: true, options: ["Sim", "Nao", "Em elaboracao"] },
      { name: "leiDecretoEducacao", label: "Lei/decreto de instituicao", kind: "text", required: true },
      { name: "acoesExecutadas", label: "Quantidade de acoes executadas no ano", kind: "number", required: true },
      { name: "publicoAlvoEducacao", label: "Publico-alvo", kind: "text", required: true },
      { name: "escolasAtendidas", label: "Escolas atendidas", kind: "number", required: true },
      { name: "participantesEducacao", label: "Numero de participantes", kind: "number", required: true },
      { name: "periodoAcoesEducacao", label: "Periodo das acoes", kind: "text", required: true },
      { name: "responsavelEducacao", label: "Responsavel", kind: "text", required: true },
      { name: "publicoAtendido", label: "Publico atendido estimado", kind: "number", required: true },
      { name: "periodicidade", label: "Periodicidade das atividades", kind: "select", required: true, options: ["Anual", "Semestral", "Mensal", "Pontual"] },
      { name: "temas", label: "Temas trabalhados", kind: "textarea", required: true },
      { name: "programaUpload", label: "Upload do programa/plano de educacao ambiental", kind: "file", required: true },
      { name: "leiDecretoEducacaoUpload", label: "Upload lei/decreto", kind: "file", required: true },
      { name: "relatorioAtividades", label: "Upload relatorio com fotos/listas de presenca", kind: "file", required: true },
      { name: "materiaisEducativosUpload", label: "Upload materiais educativos", kind: "file", required: true },
    ],
  },
  {
    id: "ifca_consolidacao",
    module: "ifca",
    title: "Fechamento e Envio IFCA",
    description: "Checklist final de revisao antes da exportacao do pacote oficial para INEA/CEPERJ.",
    spreadsheet: false,
    fields: [
      { name: "responsavelTecnico", label: "Responsavel tecnico", kind: "text", required: true },
      { name: "dataRevisao", label: "Data da revisao final", kind: "date", required: true },
      { name: "notaIes", label: "Nota parcial IES - Esgoto", kind: "number", required: true },
      { name: "notaIrs", label: "Nota parcial IRS - Residuos", kind: "number", required: true },
      { name: "notaIeaIfm", label: "Nota parcial IEA/IFM - UCs e Mananciais", kind: "number", required: true },
      { name: "notaIqsmma", label: "Nota parcial IQSMMA - Governanca", kind: "number", required: true },
      { name: "pesoIes", label: "Peso IES aplicado (0.20)", kind: "number", required: true },
      { name: "pesoIrs", label: "Peso IRS aplicado (0.25)", kind: "number", required: true },
      { name: "pesoIeaIfm", label: "Peso IEA/IFM aplicado (0.45)", kind: "number", required: true },
      { name: "pesoIqsmma", label: "Peso IQSMMA aplicado (0.10)", kind: "number", required: true },
      { name: "semPendencias", label: "Todos os modulos foram revisados?", kind: "checkbox", required: true },
      { name: "observacoes", label: "Observacoes finais", kind: "textarea", required: false },
      { name: "relatorioFinal", label: "Upload do relatorio consolidado assinado", kind: "file", required: true },
    ],
  },
];

const complianceSections: ComplianceSection[] = [
  {
    id: "ies",
    title: "Criterio Esgoto",
    acronym: "IES",
    weight: "Peso 20%",
    tone: "blue",
    items: [
      {
        id: "ies-ete-licenca",
        title: "Comprovacao de operacao de ETEs no territorio com licenca ambiental valida.",
        penalty: "Sem ETE licenciada e comprovada, a pontuacao de tratamento de esgoto fica vulneravel a glosa tecnica no IES.",
        formIds: ["esgoto_ete_laudos"],
        requiredFields: [{ formId: "esgoto_ete_laudos", fields: ["nomeEte", "tipoUnidade", "licencaEte"] }],
      },
      {
        id: "ies-dbo",
        title: "Relatorios de eficiencia de remocao de DBO conforme exigencia INEA/DZ-215.",
        penalty: "Ausencia de laudos de DBO validados impede comprovar eficiencia e pode zerar o Fator RE da ETE.",
        formIds: ["esgoto_ete_laudos", "esgoto_procon_agua"],
        requiredFields: [
          { formId: "esgoto_ete_laudos", fields: ["laudoDbo", "certificadoLaboratorio"] },
          { formId: "esgoto_procon_agua", fields: ["raeUpload"] },
        ],
      },
      {
        id: "ies-vazao-populacao",
        title: "Dados de vazao media (m3/dia) e populacao urbana de referencia atualizados.",
        penalty: "Valores ausentes, zerados ou inconsistentes comprometem a formula de cobertura e podem gerar revisao manual pelo INEA.",
        formIds: ["esgoto_ete_laudos"],
        requiredFields: [{ formId: "esgoto_ete_laudos", fields: ["populacaoAtendida", "vazaoMedia"] }],
      },
      {
        id: "ies-laudo-concessionaria",
        title: "Upload do laudo tecnico de conformidade da concessionaria operadora.",
        penalty: "Sem laudo da operadora, a SEMAM fica sem lastro documental para defender a informacao declarada.",
        formIds: ["esgoto_ete_laudos", "esgoto_procon_agua"],
        requiredFields: [{ formId: "esgoto_procon_agua", fields: ["proconComprovante", "raeUpload"] }],
      },
    ],
  },
  {
    id: "irs",
    title: "Criterio Residuos Solidos",
    acronym: "IRS",
    weight: "Peso 25%",
    tone: "amber",
    items: [
      {
        id: "irs-destinacao",
        title: "Comprovacao de Destinacao Final adequada em aterro sanitario licenciado.",
        penalty: "Destinacao final sem licenca ou sem contrato/MTR reduz a confiabilidade do IRS e pode bloquear a nota do criterio.",
        formIds: ["residuos_destinacao_final"],
        requiredFields: [{ formId: "residuos_destinacao_final", fields: ["tipoDestinacao", "cnpjAterroReceptor", "licencaAmbiental", "documentoLicenca", "cdfMtrConsolidado", "documentoPesagem", "comprovanteRecebimentoAterro"] }],
      },
      {
        id: "irs-fr",
        title: "Cadastro e comprovacao do Fator de Reciclagem (FR) por cooperativas de catadores.",
        penalty: "Sem pesagens validadas de cooperativas, o FR tende a ficar zerado ou subestimado.",
        formIds: ["residuos_coleta_seletiva"],
        requiredFields: [{ formId: "residuos_coleta_seletiva", fields: ["cooperativa", "cnpjCooperativa", "catadoresCooperados", "papelT", "plasticoT", "vidroT", "metalT"] }],
      },
      {
        id: "irs-mtr-nf",
        title: "Notas fiscais, MTRs ou laudos de triagem anexados.",
        penalty: "Tonelagens sem documento comprobatorio nao devem ser usadas no calculo oficial do FR.",
        formIds: ["residuos_coleta_seletiva"],
        requiredFields: [{ formId: "residuos_coleta_seletiva", fields: ["notaFiscalMtr", "parceriaCatadores"] }],
      },
      {
        id: "irs-sem-lixao",
        title: "Inexistencia de vazadouros a ceu aberto ativos no municipio.",
        penalty: "A existencia de lixao ativo e uma evidencia critica contra a regularidade da destinacao final.",
        formIds: ["residuos_destinacao_final"],
        requiredFields: [{ formId: "residuos_destinacao_final", fields: ["tipoDestinacao", "possuiLixaoAtivo", "documentoContrato", "laudoInexistenciaLixao"] }],
      },
    ],
  },
  {
    id: "iea-ifm",
    title: "Criterio Unidades de Conservacao e Mananciais",
    acronym: "IEA/IFM",
    weight: "Peso 45%",
    tone: "green",
    items: [
      {
        id: "uc-cadastro",
        title: "Cadastro atualizado das UCs, incluindo Parque Natural Municipal de Nova Iguacu e Rebio Tingua.",
        penalty: "UC sem cadastro, area incidente ou mapa reduz a base de calculo ambiental do municipio.",
        formIds: ["uc_gestao"],
        requiredFields: [{ formId: "uc_gestao", fields: ["nomeUc", "categoriaUc", "esferaUc", "areaTotalUcHa", "areaMunicipioHa", "atoCriacaoUc", "memorialDescritivoUc", "shapefileUc", "limiteVetor"] }],
      },
      {
        id: "uc-conselho",
        title: "Comprovacao de Conselho Gestor instituido e ativo com atas do ano corrente.",
        penalty: "Conselho inativo ou sem atas fragiliza a qualidade de gestao da UC.",
        formIds: ["uc_gestao"],
        requiredFields: [{ formId: "uc_gestao", fields: ["conselhoGestor", "atasConselhoUc"] }],
      },
      {
        id: "uc-plano-manejo",
        title: "Plano de Manejo oficial publicado e dentro do prazo de validade/atualizacao.",
        penalty: "Plano inexistente ou vencido reduz a capacidade de comprovar gestao efetiva da unidade.",
        formIds: ["uc_gestao"],
        requiredFields: [{ formId: "uc_gestao", fields: ["planoManejo", "dataPublicacaoPlanoManejo", "planoManejoUpload"] }],
      },
      {
        id: "uc-delimitacao-fiscalizacao",
        title: "Delimitacao geografica e relatorios de fiscalizacao/combate a incendios nas areas protegidas.",
        penalty: "Sem mapa e relatorios operacionais, a evidencia territorial da conservacao fica incompleta.",
        formIds: ["uc_gestao", "mananciais_abastecimento"],
        requiredFields: [
          { formId: "uc_gestao", fields: ["limiteVetor", "fotosInfra", "relatorioInvestimentoGestaoUc"] },
          { formId: "mananciais_abastecimento", fields: ["mapaDrenagem"] },
        ],
      },
    ],
  },
  {
    id: "iqsmma",
    title: "Criterio Governanca Ambiental",
    acronym: "IQSMMA",
    weight: "Peso 10%",
    tone: "red",
    items: [
      {
        id: "iq-condema",
        title: "CONDEMA ativo com no minimo 3 atas ordinarias validadas e assinadas no ciclo.",
        penalty: "Regra de corte institucional: menos de 3 atas validadas cria risco alto de perda de pontuacao.",
        formIds: ["iqsmma_condema_fundo"],
        requiredFields: [{ formId: "iqsmma_condema_fundo", fields: ["atasCondema", "dataReuniaoCondema", "caraterReuniaoCondema", "assuntoReuniaoCondema", "quorumGovernamental", "quorumNaoGovernamental", "leiCondema", "decretoNomeacaoCondema", "leiCondemaUpload", "decretoNomeacaoCondemaUpload", "atasUpload", "listasPresencaCondema"] }],
      },
      {
        id: "iq-fundo",
        title: "Fundo Municipal de Meio Ambiente instituido e cadastrado no Cadastro Estadual.",
        penalty: "Fundo nao instituido ou sem norma de repasse compromete a regularidade do IQSMMA.",
        formIds: ["iqsmma_condema_fundo"],
        requiredFields: [{ formId: "iqsmma_condema_fundo", fields: ["leiFundo", "cnpjFundo", "bancoFundo", "agenciaFundo", "contaFundo", "normaRepasse", "receitaAnualFundo", "despesaAnualFundo", "leiFundoUpload", "normaRepasseUpload", "balancoFundoUpload", "comprovantesExecucaoFundo"] }],
      },
      {
        id: "iq-extratos",
        title: "Serie completa de 12 extratos bancarios mensais, de janeiro a dezembro, validada.",
        penalty: "Extratos incompletos rebaixam a conformidade do Fundo e geram pendencia documental impeditiva.",
        formIds: ["iqsmma_condema_fundo"],
        requiredFields: [{
          formId: "iqsmma_condema_fundo",
          fields: [
            "extratoJaneiro",
            "extratoFevereiro",
            "extratoMarco",
            "extratoAbril",
            "extratoMaio",
            "extratoJunho",
            "extratoJulho",
            "extratoAgosto",
            "extratoSetembro",
            "extratoOutubro",
            "extratoNovembro",
            "extratoDezembro",
          ],
        }],
      },
    ],
  },
];

function numberPt(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.detalhes || payload?.erro || "Falha na API");
  return payload as T;
}

async function uploadEvidence(config: DigitalFormConfig, field: FieldConfig, file: File) {
  const formData = new FormData();
  formData.append("arquivo", file);
  formData.append("cicloIcmsId", String(cicloId));
  formData.append("moduloOrigem", config.module);
  formData.append("tipoDocumento", field.label);
  formData.append("observacoes", `${config.title} - ${field.name}`);

  return api<EvidenceUploadResponse>("/api/icms/documentos/evidencias", {
    method: "POST",
    body: formData,
  });
}

function storageKey(formId: string) {
  return `${draftPrefix}:${formId}`;
}

function isFilled(value: string | boolean | undefined) {
  if (typeof value === "boolean") return value;
  return Boolean(value && value.trim().length > 0);
}

function getChecklist(config: DigitalFormConfig, draft: DraftRecord) {
  return config.fields
    .filter((field) => field.required)
    .map((field) => ({
      label: field.label,
      complete: isFilled(draft[field.name]),
      document: field.kind === "file",
    }));
}

function getFormStatus(config: DigitalFormConfig, draft: DraftRecord): FormStatus {
  const hasAnyValue = Object.values(draft).some(isFilled);
  if (!hasAnyValue) return "nao_iniciado";

  const checklist = getChecklist(config, draft);
  const missingDocs = checklist.some((item) => item.document && !item.complete);
  const missingRequired = checklist.some((item) => !item.complete);

  if (!missingRequired) return "completo";
  if (missingDocs) return "pendente_documento";
  return "em_preenchimento";
}

function statusLabel(status: FormStatus) {
  return {
    nao_iniciado: "Nao iniciado",
    em_preenchimento: "Em preenchimento",
    pendente_documento: "Pendente de documento",
    completo: "Completo",
  }[status];
}

function statusTone(status: FormStatus): "green" | "amber" | "red" | "blue" {
  return {
    nao_iniciado: "blue",
    em_preenchimento: "amber",
    pendente_documento: "red",
    completo: "green",
  }[status];
}

function apiStatus(status: FormStatus) {
  return {
    nao_iniciado: "Rascunho",
    em_preenchimento: "Em preenchimento",
    pendente_documento: "Pendente de documento",
    completo: "Completo",
  }[status];
}

function loadDraft(formId: string): DraftRecord {
  try {
    return JSON.parse(localStorage.getItem(storageKey(formId)) || "{}") as DraftRecord;
  } catch {
    return {};
  }
}

function loadProfile(): UserProfile {
  try {
    return JSON.parse(localStorage.getItem(profileKey) || "") as UserProfile;
  } catch {
    return { nome: "Tecnico SEMAM", perfil: "Tecnico" };
  }
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

function auditKey(formId: string) {
  return `${draftPrefix}:audit:${formId}`;
}

function commentsKey(formId: string) {
  return `${draftPrefix}:comments:${formId}`;
}

function appendAudit(formId: string, text: string) {
  const current = JSON.parse(localStorage.getItem(auditKey(formId)) || "[]") as string[];
  const next = [`${new Date().toLocaleString("pt-BR")} - ${text}`, ...current].slice(0, 8);
  localStorage.setItem(auditKey(formId), JSON.stringify(next));
}

function loadStringList(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch {
    return [];
  }
}

async function loadServerDraft(formId: string) {
  return api<ServerFormResponse>(`/api/icms/formularios/respostas/${formId}?cicloIcmsId=${cicloId}`);
}

async function saveServerDraft(config: DigitalFormConfig, draft: DraftRecord, status: FormStatus) {
  const checklist = getChecklist(config, draft).map((item) => ({
    item: item.label,
    obrigatorio: true,
    completo: item.complete,
    documentoExigido: item.document,
  }));

  return api<{ mensagem: string }>("/api/icms/formularios/respostas/" + config.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cicloIcmsId: cicloId,
      status: apiStatus(status),
      respostaJson: draft,
      checklist,
    }),
  });
}

async function loadServerComments(formId: string) {
  return api<CommentResponse>(`/api/icms/formularios/${formId}/comentarios?cicloIcmsId=${cicloId}`);
}

async function saveServerComment(formId: string, comentario: string) {
  return api<{ resultado: { id: number; comentario: string; criadoEm: string } }>(`/api/icms/formularios/${formId}/comentarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cicloIcmsId: cicloId, comentario }),
  });
}

function reportStorageKey(reportId: string) {
  return `${reportPrefix}:${reportId}`;
}

function loadReportRows<T extends Record<string, string>>(reportId: string, fallback: T[]): T[] {
  try {
    return JSON.parse(localStorage.getItem(reportStorageKey(reportId)) || "") as T[];
  } catch {
    return fallback;
  }
}

function saveReportRows<T extends Record<string, string>>(reportId: string, rows: T[]) {
  localStorage.setItem(reportStorageKey(reportId), JSON.stringify(rows));
}

function calculateDboEfficiency(afluente: string, efluente: string) {
  const inValue = Number(afluente);
  const outValue = Number(efluente);
  if (!Number.isFinite(inValue) || inValue <= 0 || !Number.isFinite(outValue) || outValue < 0) return "";
  return Math.max(0, Math.min(100, ((inValue - outValue) / inValue) * 100)).toFixed(2);
}

const reportMonths: Array<keyof ColetaReportRow> = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function getComplianceItemStatus(item: ComplianceItem) {
  if (item.requiredFields?.length) {
    return item.requiredFields.every((group) => {
      const draft = loadDraft(group.formId);
      return group.fields.every((field) => isFilled(draft[field]));
    });
  }

  return item.formIds.every((formId) => {
    const form = digitalForms.find((candidate) => candidate.id === formId);
    return form ? getFormStatus(form, loadDraft(formId)) === "completo" : false;
  });
}

function getComplianceSummary() {
  const items = complianceSections.flatMap((section) => section.items);
  const validated = items.filter(getComplianceItemStatus).length;
  return {
    total: items.length,
    validated,
    percent: Math.round((validated / items.length) * 100),
  };
}

function saveCsv(filename: string, config: DigitalFormConfig, draft: DraftRecord) {
  const header = ["campo", "valor"];
  const rows = config.fields.map((field) => [field.label, String(draft[field.name] ?? "")]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard(props: { title: string; value: string; helper: string; tone?: "green" | "amber" | "red" }) {
  return (
    <article className={`metric ${props.tone || ""}`}>
      <span>{props.title}</span>
      <strong>{props.value}</strong>
      <p>{props.helper}</p>
    </article>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "red" | "blue" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function CompletionDashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onStorage = () => setTick((value) => value + 1);
    window.addEventListener("draft-saved", onStorage);
    return () => window.removeEventListener("draft-saved", onStorage);
  }, []);

  const summary = useMemo(() => {
    const statuses = digitalForms.map((form) => getFormStatus(form, loadDraft(form.id)));
    const complete = statuses.filter((status) => status === "completo").length;
    const pendingDocument = statuses.filter((status) => status === "pendente_documento").length;
    return {
      complete,
      pendingDocument,
      total: digitalForms.length,
      percent: Math.round((complete / digitalForms.length) * 100),
    };
  }, [tick]);

  return (
    <section className="completion-panel">
      <div>
        <span>Conclusao geral dos formularios</span>
        <strong>{summary.percent}%</strong>
      </div>
      <div className="completion-track">
        <i style={{ width: `${summary.percent}%` }} />
      </div>
      <p>
        {summary.complete} de {summary.total} completos. {summary.pendingDocument} com documento pendente.
      </p>
    </section>
  );
}

function AccessPanel({ profile, onChange }: { profile: UserProfile; onChange: (profile: UserProfile) => void }) {
  function update(next: UserProfile) {
    saveProfile(next);
    onChange(next);
  }

  return (
    <section className="access-panel">
      <label>
        Usuario
        <input value={profile.nome} onChange={(event) => update({ ...profile, nome: event.target.value })} />
      </label>
      <label>
        Perfil
        <select value={profile.perfil} onChange={(event) => update({ ...profile, perfil: event.target.value as UserProfile["perfil"] })}>
          <option>Administrador</option>
          <option>Gestor Municipal</option>
          <option>Tecnico</option>
          <option>Visualizador</option>
        </select>
      </label>
      <Badge tone={profile.perfil === "Visualizador" ? "blue" : "green"}>{profile.perfil}</Badge>
    </section>
  );
}

function ScoreSimulatorPanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onStorage = () => setTick((value) => value + 1);
    window.addEventListener("draft-saved", onStorage);
    return () => window.removeEventListener("draft-saved", onStorage);
  }, []);

  const rows = useMemo(() => scoreAxes.map((axis) => {
    const completed = axis.formIds.filter((formId) => {
      const form = digitalForms.find((item) => item.id === formId);
      return form ? getFormStatus(form, loadDraft(formId)) === "completo" : false;
    }).length;
    const ratio = completed / axis.formIds.length;
    const score = ratio * axis.weight * 100;
    return { ...axis, completed, total: axis.formIds.length, ratio, score };
  }), [tick]);

  const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
  const pending = rows
    .filter((row) => row.completed < row.total)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return (
    <section className="simulator-panel">
      <div className="section-header">
        <div>
          <h2>Simulador de Pontuacao</h2>
          <p>Estimativa baseada nos pesos do roteiro e na conclusao dos formularios.</p>
        </div>
        <strong>{numberPt(totalScore, 2)} pts</strong>
      </div>
      <div className="grid three">
        {rows.map((row) => (
          <MetricCard
            key={row.key}
            title={row.label}
            value={`${numberPt(row.score, 2)} pts`}
            helper={`${row.completed}/${row.total} formularios completos - peso ${numberPt(row.weight * 100, 0)}%`}
            tone={row.completed === row.total ? "green" : "amber"}
          />
        ))}
      </div>
      <div className="alerts-list">
        {pending.map((row) => (
          <article key={row.key} className="risk medio">
            <Badge tone="amber">Impacto {numberPt(row.weight * 100, 0)}%</Badge>
            <h3>{row.label}</h3>
            <p>Completar este eixo tende a aumentar a pontuacao estimada e reduzir pendencias no dossie.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DigitalForm({ config }: { config: DigitalFormConfig }) {
  const [draft, setDraft] = useState<DraftRecord>(() => loadDraft(config.id));
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [comment, setComment] = useState("");
  const [serverComments, setServerComments] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [syncMessage, setSyncMessage] = useState("Rascunho local carregado.");
  const [auditTick, setAuditTick] = useState(0);
  const didMount = useRef(false);
  const status = getFormStatus(config, draft);
  const checklist = getChecklist(config, draft);
  const pending = checklist.filter((item) => !item.complete);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const localDraft = loadDraft(config.id);
        const [serverDraft, comments] = await Promise.all([
          loadServerDraft(config.id),
          loadServerComments(config.id),
        ]);
        if (!active) return;

        const localHasValues = Object.values(localDraft).some(isFilled);
        if (serverDraft.resultado?.respostaJson && !localHasValues) {
          setDraft(serverDraft.resultado.respostaJson);
          localStorage.setItem(storageKey(config.id), JSON.stringify(serverDraft.resultado.respostaJson));
          setSyncStatus("synced");
          setSyncMessage("Ultima versao carregada do banco.");
        }
        setServerComments(comments.resultados.map((item) => `${new Date(item.criadoEm).toLocaleString("pt-BR")} - ${item.comentario}`));
      } catch {
        if (!active) return;
        setSyncStatus("local");
        setSyncMessage("Trabalhando com rascunho local; sincronizacao sera tentada ao salvar.");
      }
    }

    hydrate();
    return () => {
      active = false;
    };
  }, [config.id]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(storageKey(config.id), JSON.stringify(draft));
      window.dispatchEvent(new Event("draft-saved"));
      setSyncStatus("syncing");
      saveServerDraft(config, draft, getFormStatus(config, draft))
        .then(() => {
          appendAudit(config.id, "Rascunho sincronizado no banco");
          setSyncStatus("synced");
          setSyncMessage("Salvo no banco de dados.");
          setAuditTick((value) => value + 1);
        })
        .catch(() => {
          setSyncStatus("error");
          setSyncMessage("Rascunho salvo localmente, mas ainda nao sincronizado no banco.");
        });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [config.id, draft]);

  function updateField(field: FieldConfig, value: string | boolean) {
    setDraft((current) => {
      return { ...current, [field.name]: value };
    });
  }

  async function saveDraft() {
    localStorage.setItem(storageKey(config.id), JSON.stringify(draft));
    window.dispatchEvent(new Event("draft-saved"));
    setSyncStatus("syncing");
    try {
      await saveServerDraft(config, draft, status);
      appendAudit(config.id, "Rascunho salvo manualmente e sincronizado no banco");
      setSyncStatus("synced");
      setSyncMessage("Rascunho salvo no banco de dados.");
    } catch {
      appendAudit(config.id, "Rascunho salvo apenas localmente por falha de sincronizacao");
      setSyncStatus("error");
      setSyncMessage("Rascunho local salvo; tente novamente para sincronizar no banco.");
    } finally {
      setAuditTick((value) => value + 1);
    }
  }

  async function addComment() {
    if (!comment.trim()) return;
    const current = loadStringList(commentsKey(config.id));
    const commentText = comment.trim();
    localStorage.setItem(commentsKey(config.id), JSON.stringify([`${new Date().toLocaleString("pt-BR")} - ${commentText}`, ...current].slice(0, 8)));
    try {
      const saved = await saveServerComment(config.id, commentText);
      setServerComments((items) => [`${new Date(saved.resultado.criadoEm).toLocaleString("pt-BR")} - ${saved.resultado.comentario}`, ...items].slice(0, 8));
      appendAudit(config.id, "Comentario interno sincronizado no banco");
    } catch {
      appendAudit(config.id, "Comentario interno salvo apenas localmente");
    }
    setComment("");
    setAuditTick((value) => value + 1);
  }

  async function handleFileChange(field: FieldConfig, file?: File) {
    if (!file) {
      updateField(field, "");
      return;
    }

    setUploadError("");
    setUploadingField(field.name);
    try {
      const payload = await uploadEvidence(config, field, file);
      setDraft((current) => ({
        ...current,
        [field.name]: `${file.name} - Evidencia #${payload.resultado.documentoId}`,
        [`${field.name}DocumentoId`]: String(payload.resultado.documentoId),
        [`${field.name}ArquivoPersistido`]: payload.resultado.arquivoPersistido ? "Sim" : "Nao",
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Falha ao enviar evidencia.");
      updateField(field, file.name);
    } finally {
      setUploadingField(null);
    }
  }

  return (
    <article className="digital-form">
      <div className="digital-form-header">
        <div>
          <p>{config.module.toUpperCase()}</p>
          <h3>{config.title}</h3>
          <span>{config.description}</span>
        </div>
        <div className="status-stack">
          <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
          <Badge tone={syncStatus === "synced" ? "green" : syncStatus === "error" ? "red" : "amber"}>
            {syncStatus === "syncing" ? "Sincronizando" : syncStatus === "synced" ? "Banco sincronizado" : syncStatus === "error" ? "Falha de sync" : "Local"}
          </Badge>
        </div>
      </div>

      <div className="form-grid">
        {config.fields.map((field) => (
          <label key={field.name} className={field.kind === "textarea" || field.kind === "file" ? "wide" : ""}>
            {field.label}
            {field.kind === "select" && (
              <select value={String(draft[field.name] ?? "")} onChange={(event) => updateField(field, event.target.value)}>
                <option value="">Selecione</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            {field.kind === "textarea" && (
              <textarea value={String(draft[field.name] ?? "")} onChange={(event) => updateField(field, event.target.value)} placeholder={field.placeholder} />
            )}
            {field.kind === "checkbox" && (
              <span className="check-row">
                <input type="checkbox" checked={Boolean(draft[field.name])} onChange={(event) => updateField(field, event.target.checked)} />
                Confirmado
              </span>
            )}
            {field.kind === "file" && (
              <input
                type="file"
                onChange={(event) => handleFileChange(field, event.target.files?.[0])}
              />
            )}
            {(field.kind === "text" || field.kind === "number" || field.kind === "date") && (
              <input
                type={field.kind}
                value={String(draft[field.name] ?? "")}
                onChange={(event) => updateField(field, event.target.value)}
                placeholder={field.placeholder}
              />
            )}
            {field.kind === "file" && uploadingField === field.name && <small>Enviando evidencia para documentos_evidencias...</small>}
            {field.kind === "file" && draft[field.name] && <small>Arquivo registrado: {String(draft[field.name])}</small>}
          </label>
        ))}
      </div>

      <div className={`alert ${syncStatus === "error" ? "amber" : "green"}`}>{syncMessage}</div>
      {uploadError && <div className="alert amber">{uploadError}. O nome do arquivo foi salvo no rascunho, mas revise a conexao antes do envio oficial.</div>}

      <div className="checklist">
        <h4>Checklist automatico de pendencias</h4>
        {checklist.map((item) => (
          <div key={item.label} className={item.complete ? "done" : "missing"}>
            <span>{item.complete ? "OK" : "Pendente"}</span>
            {item.label}
          </div>
        ))}
        {pending.length === 0 && <div className="done"><span>OK</span>Formulario completo para revisao tecnica.</div>}
      </div>

      <div className="audit-tools">
        <label>
          Comentario interno do modulo
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Registre uma observacao de conferencia, pendencia ou decisao tecnica." />
        </label>
        <button type="button" onClick={addComment}>Adicionar comentario</button>
        <div>
          <h4>Historico recente</h4>
          {loadStringList(auditKey(config.id)).map((item) => <p key={item}>{item}</p>)}
          {serverComments.map((item) => <p key={`server-${item}`}>Comentario no banco: {item}</p>)}
          {loadStringList(commentsKey(config.id)).map((item) => <p key={item}>Comentario: {item}</p>)}
          {auditTick < 0 && null}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={saveDraft}>Salvar rascunho</button>
        <button type="button" onClick={() => window.print()}>Gerar PDF</button>
        {config.spreadsheet && (
          <button type="button" onClick={() => saveCsv(`${config.id}.csv`, config, draft)}>Exportar Excel</button>
        )}
      </div>
    </article>
  );
}

function ModuleForms({ module }: { module: string }) {
  return (
    <div className="module-forms">
      {digitalForms.filter((form) => form.module === module).map((form) => (
        <DigitalForm key={form.id} config={form} />
      ))}
    </div>
  );
}

function EsgotoPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<EsgotoResultado | null>(null);
  const [error, setError] = useState("");

  async function carregar() {
    setStatus("loading");
    setError("");
    try {
      const payload = await api<{ resultado: EsgotoResultado }>(`/api/icms/esgoto/resultado-consolidado/${cicloId}`);
      setData(payload.resultado);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  async function recalcular() {
    setStatus("loading");
    setError("");
    try {
      const payload = await api<{ resultado: EsgotoResultado }>(`/api/icms/esgoto/calcular-consolidado/${cicloId}`, {
        method: "POST",
      });
      setData(payload.resultado);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Esgotamento Sanitario</h2>
          <p>Consolidacao das ETEs de Nova Iguacu para o Indice de Tratamento de Esgoto.</p>
        </div>
        <button onClick={recalcular} disabled={status === "loading"}>{status === "loading" ? "Calculando..." : "Recalcular ITE"}</button>
      </div>
      {error && <div className="alert red">{error}</div>}
      <div className="grid three">
        <MetricCard title="Pontuacao final" value={numberPt(data?.pontuacaoFinalMunicipal, 4)} helper="Resultado consolidado das estacoes calculadas." tone={data?.possuiPossivelSobreposicaoPopulacional ? "amber" : "green"} />
        <MetricCard title="Cobertura somada" value={`${numberPt(data?.somaPercentualAtendido)}%`} helper="Soma da populacao atendida informada." />
        <MetricCard title="ETEs monitoradas" value={String(data?.totalEstacoes ?? 0)} helper="Estacoes cadastradas no ciclo atual." />
      </div>
      {data?.possuiPossivelSobreposicaoPopulacional && <div className="alert amber">A cobertura ultrapassou 100%. Revise a populacao atendida antes de enviar ao INEA/CEPERJ.</div>}
      <Table
        columns={["ETE", "Tratamento", "Populacao atendida", "RE", "Nota", "Status"]}
        rows={(data?.estacoes ?? []).map((ete) => [
          ete.nome,
          ete.nivelTratamento,
          `${numberPt(ete.percentualPopulacaoAtendida)}%`,
          numberPt(ete.reRelatorioEficiencia),
          numberPt(ete.pontuacaoParcial, 4),
          ete.statusCalculo,
        ])}
      />
      <ModuleForms module="esgoto" />
    </section>
  );
}

function ResiduosPanel() {
  const [totalRsu, setTotalRsu] = useState("250000");
  const [tipoSistema, setTipoSistema] = useState("Domiciliar");
  const [data, setData] = useState<ResiduosResultado | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const materiais = useMemo(() => {
    if (!data) return [];
    const total = data.totalReciclaveisT || 1;
    return [
      ["Papel", data.totaisPorMaterial.papelT, "blue"],
      ["Plastico", data.totaisPorMaterial.plasticoT, "green"],
      ["Vidro", data.totaisPorMaterial.vidroT, "teal"],
      ["Metal", data.totaisPorMaterial.metalT, "amber"],
    ].map(([nome, valor, cor]) => ({ nome, valor: Number(valor), cor, pct: (Number(valor) / total) * 100 }));
  }, [data]);

  async function calcular() {
    setStatus("loading");
    setError("");
    try {
      const payload = await api<{ resultado: ResiduosResultado }>("/api/icms/residuos/calcular-consolidado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cicloIcmsId: cicloId, totalRsuAnualT: Number(totalRsu), tipoSistema }),
      });
      setData(payload.resultado);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Residuos Solidos e Coleta Seletiva</h2>
          <p>Simulacao do Fator de Reciclagem com base nas pesagens validadas.</p>
        </div>
      </div>
      <div className="form-card">
        <label>Massa total anual de RSU<input value={totalRsu} onChange={(e) => setTotalRsu(e.target.value)} type="number" /></label>
        <label>Tipo de sistema<select value={tipoSistema} onChange={(e) => setTipoSistema(e.target.value)}><option value="Domiciliar">Domiciliar</option><option value="UTC_Ponto">UTC ou Coleta Ponto a Ponto</option></select></label>
        <button onClick={calcular} disabled={status === "loading"}>{status === "loading" ? "Calculando..." : "Calcular FR"}</button>
      </div>
      {error && <div className="alert red">{error}</div>}
      <div className="grid three">
        <MetricCard title="Fator de Reciclagem" value={`Nota ${data?.fatorReciclagem ?? "-"}`} helper={`${data?.registrosValidadosConsiderados ?? 0} registros validados considerados.`} tone="green" />
        <MetricCard title="Indice conquistado" value={`${numberPt(data?.percentualReciclagem)}%`} helper="Percentual sobre o total anual de RSU." />
        <MetricCard title="Toneladas recicladas" value={`${numberPt(data?.totalReciclaveisT, 3)} t`} helper="Papel, plastico, vidro e metal consolidados." />
      </div>
      <div className="bars">
        {materiais.map((m) => (
          <div key={m.nome as string}>
            <div className="bar-label"><strong>{m.nome}</strong><span>{numberPt(m.valor, 3)} t - {numberPt(m.pct)}%</span></div>
            <div className="bar"><i className={String(m.cor)} style={{ width: `${Math.min(m.pct, 100)}%` }} /></div>
          </div>
        ))}
      </div>
      <ModuleForms module="residuos" />
    </section>
  );
}

function IqsmmaPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<IqsmmaResultado | null>(null);
  const [error, setError] = useState("");

  async function carregar() {
    setStatus("loading");
    setError("");
    try {
      const payload = await api<{ resultado: IqsmmaResultado }>(`/api/icms/iqsmma/auditoria/${cicloId}`);
      setData(payload.resultado);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const tone = data?.statusInstitucional === "Critico" ? "red" : data?.statusInstitucional === "Atencao" ? "amber" : "green";

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Governanca Institucional IQSMMA</h2>
          <p>Auditoria do CONDEMA e do Fundo Municipal de Meio Ambiente.</p>
        </div>
        <button onClick={carregar} disabled={status === "loading"}>Atualizar auditoria</button>
      </div>
      {error && <div className="alert red">{error}</div>}
      <div className={`status-block ${tone}`}>
        {data?.statusInstitucional === "Critico" ? "STATUS CRITICO - RISCO ALTO DE PERDA DE RECEITA" : data?.statusInstitucional === "Atencao" ? "STATUS EM ATENCAO" : "STATUS REGULAR"}
      </div>
      <div className="grid two">
        <MetricCard title="CONDEMA" value={`${data?.requisitos.condema.atasValidadas ?? 0}/${data?.requisitos.condema.minimoExigido ?? 3}`} helper="Atas validadas no ciclo." tone={data?.requisitos.condema.regular ? "green" : "red"} />
        <MetricCard title="Fundo Municipal" value={data?.requisitos.fundoMunicipal.statusIqsmma ?? "-"} helper={(data?.requisitos.fundoMunicipal.mesesSemExtratoValidado.length ?? 0) > 0 ? `Faltam meses: ${data?.requisitos.fundoMunicipal.mesesSemExtratoValidado.join(", ")}` : "Serie de extratos sem pendencias."} tone={data?.requisitos.fundoMunicipal.possuiSerieCompletaDeExtratos ? "green" : "amber"} />
      </div>
      <div className="alerts-list">
        {(data?.alertas ?? []).map((alerta, index) => (
          <article key={index} className={`risk ${alerta.nivelImpactoIfca.toLowerCase()}`}>
            <Badge tone={alerta.nivelImpactoIfca === "Alto" ? "red" : alerta.nivelImpactoIfca === "Medio" ? "amber" : "blue"}>Impacto {alerta.nivelImpactoIfca}</Badge>
            <h3>{alerta.titulo}</h3>
            <p>{alerta.descricao}</p>
          </article>
        ))}
        {data?.alertas.length === 0 && <div className="empty">Nenhum alerta institucional identificado.</div>}
      </div>
      <ModuleForms module="iqsmma" />
    </section>
  );
}

function UcPanel() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Unidades de Conservacao e Mananciais</h2>
          <p>Formularios de areas protegidas, qualidade de gestao, Mata Atlantica e Mananciais de Abastecimento.</p>
        </div>
        <button onClick={() => window.print()}>Gerar PDF do modulo</button>
      </div>
      <div className="grid three">
        <MetricCard title="UCs prioritarias" value="3+" helper="Parque Natural Municipal, Rebio Tingua, APA Guandu e areas correlatas." />
        <MetricCard title="Gestao documental" value="UC" helper="Plano de Manejo, Conselho Gestor, atas e infraestrutura." tone="green" />
        <MetricCard title="Mananciais" value="IrMA" helper="Bacias, captacoes e areas de drenagem para abastecimento." />
      </div>
      <ModuleForms module="uc" />
    </section>
  );
}

function ReportTable<T extends Record<string, string>>(props: {
  columns: ReportColumn<T>[];
  rows: T[];
  onChange: (rows: T[]) => void;
}) {
  function updateCell(rowIndex: number, key: keyof T, value: string) {
    const nextRows = props.rows.map((row, index) => {
      if (index !== rowIndex) return row;
      return { ...row, [key]: value };
    });
    props.onChange(nextRows);
  }

  return (
    <div className="official-table-wrap">
      <table className="official-table">
        <thead>
          <tr>{props.columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {props.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {props.columns.map((column) => (
                <td key={String(column.key)}>
                  {column.readOnly ? (
                    <strong>{row[column.key] || "-"}</strong>
                  ) : column.kind === "select" ? (
                    <select value={row[column.key]} onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}>
                      <option value="">Selecione</option>
                      {column.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={column.kind === "number" ? "number" : "text"}
                      value={row[column.key]}
                      onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfficialReportCard<T extends Record<string, string>>(props: {
  reportId: string;
  title: string;
  subtitle: string;
  legalReference: string;
  columns: ReportColumn<T>[];
  rows: T[];
  onChange: (rows: T[]) => void;
  blankRow: T;
}) {
  function addRow() {
    props.onChange([...props.rows, props.blankRow]);
  }

  function printReport() {
    document.body.dataset.printReport = props.reportId;
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.printReport;
    }, 300);
  }

  return (
    <article className="official-report" data-report-id={props.reportId}>
      <div className="report-letterhead">
        <div>
          <span>Prefeitura Municipal de Nova Iguacu</span>
          <strong>Secretaria Municipal de Meio Ambiente</strong>
          <p>ICMS Ecologico do Estado do Rio de Janeiro - Ciclo {new Date().getFullYear()}</p>
        </div>
        <div className="report-stamp">INEA/CEPERJ</div>
      </div>

      <div className="digital-form-header">
        <div>
          <p>{props.legalReference}</p>
          <h3>{props.title}</h3>
          <span>{props.subtitle}</span>
        </div>
        <Badge tone="blue">Modelo editavel</Badge>
      </div>

      <ReportTable columns={props.columns} rows={props.rows} onChange={props.onChange} />

      <div className="signature-block">
        <div>
          <span>Responsavel tecnico</span>
          <strong>Nome, matricula e assinatura</strong>
        </div>
        <div>
          <span>Secretario Municipal de Meio Ambiente</span>
          <strong>Assinatura e carimbo</strong>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={addRow}>Adicionar linha</button>
        <button type="button" onClick={printReport}>Gerar Relatorio Oficial para PDF</button>
      </div>
    </article>
  );
}

const eteBlankRow: EteReportRow = {
  nomeEte: "",
  localidade: "",
  tipoTratamento: "",
  populacaoAtendida: "",
  vazaoMedia: "",
  dboAfluente: "",
  dboEfluente: "",
  eficienciaRemocao: "",
};

const coletaBlankRow: ColetaReportRow = {
  razaoSocial: "",
  cnpj: "",
  catadores: "",
  cadastroSinir: "",
  material: "Papel/Papelao",
  janeiro: "",
  fevereiro: "",
  marco: "",
  abril: "",
  maio: "",
  junho: "",
  julho: "",
  agosto: "",
  setembro: "",
  outubro: "",
  novembro: "",
  dezembro: "",
};

const fundoBlankRow: FundoReportRow = {
  saldoInicial: "",
  repassesRecebidos: "",
  despesasLiquidadas: "",
  saldoFinal: "",
  acaoAmbiental: "",
  documentoComprobatorio: "",
};

const ucBlankRow: UcReportRow = {
  unidadeConservacao: "",
  atoCriacao: "",
  infraestruturaSede: "",
  conselhoGestor: "",
  planoManejo: "",
  observacoes: "",
};

function ReportModelsPanel() {
  const [eteRows, setEteRows] = useState<EteReportRow[]>(() => loadReportRows("ies-ete-autocontrole", [eteBlankRow]));
  const [coletaRows, setColetaRows] = useState<ColetaReportRow[]>(() => loadReportRows("irs-coleta-seletiva", [
    { ...coletaBlankRow, material: "Papel/Papelao" },
    { ...coletaBlankRow, material: "Plastico" },
    { ...coletaBlankRow, material: "Vidro" },
    { ...coletaBlankRow, material: "Metal" },
  ]));
  const [fundoRows, setFundoRows] = useState<FundoReportRow[]>(() => loadReportRows("iqsmma-fmma-regularidade", [fundoBlankRow]));
  const [ucRows, setUcRows] = useState<UcReportRow[]>(() => loadReportRows("iea-qualidade-gestao-uc", [ucBlankRow]));

  function updateEteRows(rows: EteReportRow[]) {
    const calculated = rows.map((row) => ({
      ...row,
      eficienciaRemocao: calculateDboEfficiency(row.dboAfluente, row.dboEfluente),
    }));
    setEteRows(calculated);
    saveReportRows("ies-ete-autocontrole", calculated);
  }

  function updateColetaRows(rows: ColetaReportRow[]) {
    setColetaRows(rows);
    saveReportRows("irs-coleta-seletiva", rows);
  }

  function updateFundoRows(rows: FundoReportRow[]) {
    setFundoRows(rows);
    saveReportRows("iqsmma-fmma-regularidade", rows);
  }

  function updateUcRows(rows: UcReportRow[]) {
    setUcRows(rows);
    saveReportRows("iea-qualidade-gestao-uc", rows);
  }

  const eteColumns: ReportColumn<EteReportRow>[] = [
    { key: "nomeEte", label: "Nome da ETE" },
    { key: "localidade", label: "Localidade" },
    { key: "tipoTratamento", label: "Tipo de Tratamento", kind: "select", options: ["Primario", "Secundario", "Terciario", "Emissario Submarino"] },
    { key: "populacaoAtendida", label: "Populacao Atendida", kind: "number" },
    { key: "vazaoMedia", label: "Vazao Media (m3/dia)", kind: "number" },
    { key: "dboAfluente", label: "DBO Afluente (mg/L)", kind: "number" },
    { key: "dboEfluente", label: "DBO Efluente (mg/L)", kind: "number" },
    { key: "eficienciaRemocao", label: "Eficiencia de Remocao (%)", readOnly: true },
  ];

  const coletaColumns: ReportColumn<ColetaReportRow>[] = [
    { key: "razaoSocial", label: "Razao Social da Associacao" },
    { key: "cnpj", label: "CNPJ" },
    { key: "catadores", label: "No. Catadores", kind: "number" },
    { key: "cadastroSinir", label: "Cadastro SINIR" },
    { key: "material", label: "Material", kind: "select", options: ["Papel/Papelao", "Plastico", "Vidro", "Metal"] },
    ...reportMonths.map((month) => ({ key: month, label: String(month).charAt(0).toUpperCase() + String(month).slice(1), kind: "number" as const })),
  ];

  const fundoColumns: ReportColumn<FundoReportRow>[] = [
    { key: "saldoInicial", label: "Saldo Inicial (R$)", kind: "number" },
    { key: "repassesRecebidos", label: "Repasses ICMS Ecologico Recebidos (R$)", kind: "number" },
    { key: "despesasLiquidadas", label: "Despesas Liquidadas em Conservacao Ambiental (R$)", kind: "number" },
    { key: "saldoFinal", label: "Saldo Final do Exercicio (R$)", kind: "number" },
    { key: "acaoAmbiental", label: "Acao Ambiental Executada" },
    { key: "documentoComprobatorio", label: "Documento Comprobatorio" },
  ];

  const ucColumns: ReportColumn<UcReportRow>[] = [
    { key: "unidadeConservacao", label: "Unidade de Conservacao" },
    { key: "atoCriacao", label: "Status do Ato de Criacao", kind: "select", options: ["Nao comprovado", "Comprovado sem memorial", "Comprovado com memorial e mapa"] },
    { key: "infraestruturaSede", label: "Infraestrutura/Sede", kind: "select", options: ["Inexistente", "Parcial", "Comprovada"] },
    { key: "conselhoGestor", label: "Conselho Gestor Paritario e Ativo", kind: "select", options: ["Inexistente", "Instituido sem reunioes", "Ativo com reunioes comprovadas"] },
    { key: "planoManejo", label: "Implementacao do Plano de Manejo", kind: "select", options: ["Nao possui", "Desatualizado", "Atualizado e em implementacao"] },
    { key: "observacoes", label: "Observacoes/Evidencias" },
  ];

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Modelos de Relatorios</h2>
          <p>Anexos operacionais editaveis para impressao, assinatura e envio ao INEA/CEPERJ.</p>
        </div>
        <button onClick={() => window.print()}>Imprimir todos</button>
      </div>

      <div className="report-stack">
        <OfficialReportCard
          reportId="ies-ete-autocontrole"
          title="Anexo IES - Quadro de Autocontrole de ETEs"
          subtitle="Tabela de comprovacao semestral/anual da operacao, vazao, DBO e eficiencia de remocao."
          legalReference="Criterio Esgoto - IES"
          columns={eteColumns}
          rows={eteRows}
          onChange={updateEteRows}
          blankRow={eteBlankRow}
        />

        <OfficialReportCard
          reportId="irs-coleta-seletiva"
          title="Anexo IRS - Formulario de Habilitacao de Coleta Seletiva"
          subtitle="Quadro de comprovacao de materiais reciclaveis comercializados por cooperativas ou associacoes."
          legalReference="Criterio Residuos Solidos - IRS"
          columns={coletaColumns}
          rows={coletaRows}
          onChange={updateColetaRows}
          blankRow={coletaBlankRow}
        />

        <OfficialReportCard
          reportId="iqsmma-fmma-regularidade"
          title="Anexo IQSMMA - Regularidade do Fundo Municipal de Meio Ambiente"
          subtitle="Consolidacao financeira do FMMA: saldo inicial, repasses, despesas liquidadas e saldo final."
          legalReference="Criterio Governanca Ambiental - IQSMMA"
          columns={fundoColumns}
          rows={fundoRows}
          onChange={updateFundoRows}
          blankRow={fundoBlankRow}
        />

        <OfficialReportCard
          reportId="iea-qualidade-gestao-uc"
          title="Anexo IEA - Ficha de Avaliacao de Qualidade de Gestao da UC"
          subtitle="Questionario de evidencias para qualidade de gestao, conselho, infraestrutura e Plano de Manejo."
          legalReference="Criterio Unidades de Conservacao - IEA"
          columns={ucColumns}
          rows={ucRows}
          onChange={updateUcRows}
          blankRow={ucBlankRow}
        />
      </div>
    </section>
  );
}

function CompliancePanel() {
  const [tick, setTick] = useState(0);
  const firstItem = complianceSections[0].items[0];
  const [selectedItemId, setSelectedItemId] = useState(firstItem.id);

  useEffect(() => {
    const onDraftSaved = () => setTick((value) => value + 1);
    window.addEventListener("draft-saved", onDraftSaved);
    return () => window.removeEventListener("draft-saved", onDraftSaved);
  }, []);

  const summary = useMemo(() => getComplianceSummary(), [tick]);
  const selectedItem = useMemo(
    () => complianceSections.flatMap((section) => section.items).find((item) => item.id === selectedItemId) ?? firstItem,
    [selectedItemId],
  );
  const selectedValidated = getComplianceItemStatus(selectedItem);

  return (
    <section className="panel compliance-panel">
      <div className="section-header">
        <div>
          <h2>Central de Conformidade</h2>
          <p>Checklist Nota Tecnica INEA para auditoria dos documentos e criterios do ICMS Ecologico.</p>
        </div>
        <button onClick={() => window.print()}>Gerar PDF da conformidade</button>
      </div>

      <div className="readiness-card">
        <div>
          <span>Indice de Prontidao do Municipio</span>
          <strong>{summary.percent}%</strong>
          <p>{summary.validated} de {summary.total} itens validados no sistema.</p>
        </div>
        <div className="readiness-track" aria-label="Progresso geral de conformidade">
          <i style={{ width: `${summary.percent}%` }} />
        </div>
      </div>

      <div className="compliance-layout">
        <div className="compliance-sections">
          {complianceSections.map((section) => {
            const sectionValidated = section.items.filter(getComplianceItemStatus).length;
            return (
              <article key={section.id} className={`compliance-section ${section.tone}`}>
                <div className="compliance-section-head">
                  <div className="section-icon">{section.acronym}</div>
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.acronym} - {section.weight}</p>
                  </div>
                  <Badge tone={sectionValidated === section.items.length ? "green" : sectionValidated > 0 ? "amber" : "red"}>
                    {sectionValidated}/{section.items.length}
                  </Badge>
                </div>

                <div className="compliance-items">
                  {section.items.map((item) => {
                    const validated = getComplianceItemStatus(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`compliance-item ${selectedItemId === item.id ? "active" : ""}`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <span className={`status-dot ${validated ? "valid" : "pending"}`} />
                        <span>{item.title}</span>
                        <Badge tone={validated ? "green" : "amber"}>{validated ? "Validado no Sistema" : "Pendente"}</Badge>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="penalty-panel">
          <span>Regra de Corte / Risco</span>
          <h3>{selectedItem.title}</h3>
          <Badge tone={selectedValidated ? "green" : "red"}>{selectedValidated ? "Evidencia localizada" : "Requer acao tecnica"}</Badge>
          <p>{selectedItem.penalty}</p>
          <div className="linked-forms">
            <strong>Formularios relacionados</strong>
            {selectedItem.formIds.map((formId) => {
              const form = digitalForms.find((candidate) => candidate.id === formId);
              const status = form ? getFormStatus(form, loadDraft(formId)) : "nao_iniciado";
              return (
                <div key={formId}>
                  <span>{form?.title ?? formId}</span>
                  <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ConsolidadorPanel() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Consolidador IFCA</h2>
          <p>Relatorio executivo para fechamento do ciclo e preparacao do envio oficial.</p>
        </div>
        <button onClick={() => window.print()}>Exportar relatorio</button>
      </div>
      <div className="ifca-card">
        <span>Municipio</span>
        <strong>Nova Iguacu</strong>
        <p>Ciclo 2026 - relatorio gerado em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="grid three">
        <MetricCard title="Saneamento" value="IES" helper="Nota calculada pelo modulo de ETEs." />
        <MetricCard title="Residuos" value="IRS" helper="Fator de Reciclagem e coleta seletiva." />
        <MetricCard title="Institucional" value="IQSMMA" helper="CONDEMA e Fundo Municipal." />
      </div>
      <ScoreSimulatorPanel />
      <ModuleForms module="ifca" />
      <div className="status-footer green">PRONTO PARA OPERACAO ASSISTIDA DO MVP</div>
    </section>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={columns.length}>Sem registros calculados ainda.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState("residuos");
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [cycleYear, setCycleYear] = useState(String(new Date().getFullYear()));
  const tabs = [
    ["conformidade", "Central de Conformidade"],
    ["modelos", "Modelos de Relatorios"],
    ["residuos", "Residuos"],
    ["esgoto", "Esgoto"],
    ["uc", "UCs e Mananciais"],
    ["iqsmma", "IQSMMA"],
    ["ifca", "IFCA"],
  ];

  return (
    <main>
      <header className="hero">
        <div>
          <span>SEMAM Nova Iguacu</span>
          <h1>ICMS Ecologico</h1>
          <p>Painel interno para monitoramento tecnico, evidencias e fechamento do ciclo anual. Ano-base {cycleYear}.</p>
        </div>
        <div className="hero-actions">
          <label>
            Ano-base
            <input value={cycleYear} onChange={(event) => setCycleYear(event.target.value)} />
          </label>
          <button type="button" onClick={() => setTab("ifca")}>Simular Pontuacao</button>
          <button type="button" onClick={() => window.print()}>Gerar Dossie Final</button>
          <a href="/api/health" target="_blank" rel="noreferrer">API online</a>
        </div>
      </header>
      <AccessPanel profile={profile} onChange={setProfile} />
      <CompletionDashboard />
      <nav className="tabs">
        {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === "conformidade" && <CompliancePanel />}
      {tab === "modelos" && <ReportModelsPanel />}
      {tab === "esgoto" && <EsgotoPanel />}
      {tab === "residuos" && <ResiduosPanel />}
      {tab === "uc" && <UcPanel />}
      {tab === "iqsmma" && <IqsmmaPanel />}
      {tab === "ifca" && <ConsolidadorPanel />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
