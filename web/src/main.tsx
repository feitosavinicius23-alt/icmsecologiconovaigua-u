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

const cicloId = 1;
const draftPrefix = "icms-ni-draft";

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
      { name: "licencaAmbiental", label: "Numero da licenca ambiental", kind: "text", required: true },
      { name: "validadeLicenca", label: "Validade da licenca", kind: "date", required: true },
      { name: "massaRsuAnualT", label: "Massa anual enviada (t)", kind: "number", required: true },
      { name: "percentualRsuDestino", label: "Percentual do RSU municipal destinado (%)", kind: "number", required: true },
      { name: "tratamentoPercolado", label: "Tratamento de percolado", kind: "select", required: true, options: ["Nao informado", "Primario", "Secundario", "Terciario"] },
      { name: "captacaoGases", label: "Possui captacao/queima de gases?", kind: "select", required: true, options: ["Sim", "Nao", "Nao se aplica"] },
      { name: "documentoLicenca", label: "Upload da licenca ambiental", kind: "file", required: true },
      { name: "documentoContrato", label: "Upload do contrato/declaracao do operador", kind: "file", required: true },
      { name: "documentoPesagem", label: "Upload de relatorio de pesagens/MTR", kind: "file", required: true },
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
      { name: "mesReferencia", label: "Mes de referencia", kind: "select", required: true, options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] },
      { name: "papelT", label: "Papel (t)", kind: "number", required: true },
      { name: "plasticoT", label: "Plastico (t)", kind: "number", required: true },
      { name: "vidroT", label: "Vidro (t)", kind: "number", required: true },
      { name: "metalT", label: "Metal (t)", kind: "number", required: true },
      { name: "notaFiscalMtr", label: "Upload da nota fiscal ou MTR", kind: "file", required: true },
      { name: "parceriaCatadores", label: "Documento de parceria com catadores", kind: "file", required: true },
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
      { name: "dataPlano", label: "Data do plano", kind: "date", required: true },
      { name: "prazoRevisao", label: "Plano esta dentro do prazo de revisao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "abrangeTerritorio", label: "Abrange todo o territorio municipal?", kind: "select", required: true, options: ["Sim", "Nao", "Parcialmente"] },
      { name: "controleSocial", label: "Houve audiencia, conselho ou consulta publica?", kind: "select", required: true, options: ["Audiencia publica", "Conselho municipal", "Consulta publica", "Nao comprovado"] },
      { name: "planoUpload", label: "Upload do PMGIRS datado", kind: "file", required: true },
      { name: "ataAprovacao", label: "Upload da ata/relatorio de participacao social", kind: "file", required: true },
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
      { name: "pontosColeta", label: "Quantidade de pontos de coleta", kind: "number", required: true },
      { name: "volumeLitros", label: "Volume anual coletado (litros)", kind: "number", required: true },
      { name: "destinador", label: "Empresa/cooperativa destinadora", kind: "text", required: true },
      { name: "relatorioOleo", label: "Upload do relatorio anual de coleta", kind: "file", required: true },
      { name: "comprovanteDestinacao", label: "Upload do comprovante de destinacao", kind: "file", required: true },
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
      { name: "nivelTratamento", label: "Nivel de tratamento", kind: "select", required: true, options: ["Primario", "Secundario", "Terciario", "Emissario Submarino"] },
      { name: "populacaoAtendida", label: "Populacao atendida", kind: "number", required: true },
      { name: "vazaoMedia", label: "Vazao media anual (m3/dia)", kind: "number", required: true },
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
      { name: "dentroPrazo", label: "Dentro do prazo de revisao?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "componentes", label: "Componentes contemplados", kind: "select", required: true, options: ["4 componentes", "2 ou 3 componentes", "Menos de 2 componentes"] },
      { name: "instituidoLegalmente", label: "Instituido por Lei ou Decreto Municipal?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "conteudoMinimo", label: "Percentual do conteudo minimo atendido (%)", kind: "number", required: true },
      { name: "controleSocialPmsb", label: "Mecanismo de controle social", kind: "select", required: true, options: ["Conselho", "Audiencia publica", "Consulta publica", "Conferencia", "Nao comprovado"] },
      { name: "pmsbUpload", label: "Upload do PMSB datado", kind: "file", required: true },
      { name: "leiDecretoUpload", label: "Upload da Lei/Decreto de instituicao", kind: "file", required: true },
      { name: "audienciaUpload", label: "Upload do relatorio/ata/lista de presenca", kind: "file", required: true },
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
      { name: "areaMunicipioHa", label: "Area incidente em Nova Iguacu (ha)", kind: "number", required: true },
      { name: "planoManejo", label: "Status do Plano de Manejo", kind: "select", required: true, options: ["Atualizado", "Vencido", "Inexistente", "Em revisao"] },
      { name: "conselhoGestor", label: "Status do Conselho Gestor", kind: "select", required: true, options: ["Ativo", "Inativo", "Inexistente", "Pendente"] },
      { name: "infraestrutura", label: "Infraestrutura e equipamentos comprovados", kind: "textarea", required: false },
      { name: "limiteVetor", label: "Upload limite vetorial/mapa da UC", kind: "file", required: true },
      { name: "planoManejoUpload", label: "Upload do Plano de Manejo", kind: "file", required: true },
      { name: "atasConselhoUc", label: "Upload atas do Conselho Gestor", kind: "file", required: true },
      { name: "fotosInfra", label: "Upload fotos/relatorio de infraestrutura", kind: "file", required: true },
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
      { name: "aprovadoConselho", label: "Aprovado pelo Conselho Municipal de Meio Ambiente?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "dataAprovacao", label: "Data de aprovacao", kind: "date", required: true },
      { name: "acoesRestauracao", label: "Acoes de conservacao/restauracao executadas", kind: "textarea", required: true },
      { name: "pmmaUpload", label: "Upload do PMMA", kind: "file", required: true },
      { name: "ataPmmaUpload", label: "Upload ata de aprovacao do PMMA", kind: "file", required: true },
      { name: "relatorioAcoes", label: "Upload relatorio das acoes", kind: "file", required: true },
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
      { name: "abasteceForaBacia", label: "Abastece municipios fora da bacia?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "dependeTransposicao", label: "Depende de agua transposta?", kind: "select", required: true, options: ["Sim", "Nao", "Parcialmente"] },
      { name: "areaDrenagemTotal", label: "Area drenagem total da bacia (km2)", kind: "number", required: true },
      { name: "areaDrenagemMunicipal", label: "Area drenagem em Nova Iguacu (km2)", kind: "number", required: true },
      { name: "fonteCartografica", label: "Fonte cartografica", kind: "text", required: true },
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
      { name: "leiFundo", label: "Numero da lei de criacao do Fundo", kind: "text", required: true },
      { name: "normaRepasse", label: "Norma de repasse do ICMS Ecologico", kind: "text", required: true },
      { name: "percentualRepasse", label: "Percentual previsto de repasse (%)", kind: "number", required: true },
      { name: "atasUpload", label: "Upload das atas do CONDEMA", kind: "file", required: true },
      { name: "leiFundoUpload", label: "Upload da lei/norma do Fundo", kind: "file", required: true },
      { name: "extratosUpload", label: "Upload dos 12 extratos mensais", kind: "file", required: true },
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
      { name: "infraAdministrativa", label: "Infraestrutura administrativa comprovada?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "equipeHabilitada", label: "Profissionais habilitados em numero compativel?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "poderPolicia", label: "Servidores com poder de policia ambiental?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "legislacaoPropria", label: "Legislacao suplementar propria?", kind: "select", required: true, options: ["Sim", "Nao"] },
      { name: "requerimentosRecebidos", label: "Quantidade de requerimentos recebidos no ano", kind: "number", required: true },
      { name: "licencasConcedidas", label: "Quantidade de instrumentos concedidos no ano", kind: "number", required: true },
      { name: "infraUpload", label: "Upload descricao/evidencias de infraestrutura", kind: "file", required: true },
      { name: "equipeUpload", label: "Upload relacao de equipe habilitada", kind: "file", required: true },
      { name: "normasUpload", label: "Upload leis/normas de licenciamento e fiscalizacao", kind: "file", required: true },
      { name: "licencasUpload", label: "Upload relacao de licencas concedidas", kind: "file", required: true },
      { name: "conemaUpload", label: "Upload manifestacao CONEMA 95/2022", kind: "file", required: true },
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
      { name: "acoesExecutadas", label: "Quantidade de acoes executadas no ano", kind: "number", required: true },
      { name: "publicoAtendido", label: "Publico atendido estimado", kind: "number", required: true },
      { name: "periodicidade", label: "Periodicidade das atividades", kind: "select", required: true, options: ["Anual", "Semestral", "Mensal", "Pontual"] },
      { name: "temas", label: "Temas trabalhados", kind: "textarea", required: true },
      { name: "programaUpload", label: "Upload do programa/plano de educacao ambiental", kind: "file", required: true },
      { name: "relatorioAtividades", label: "Upload relatorio com fotos/listas de presenca", kind: "file", required: true },
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
        requiredFields: [{ formId: "esgoto_ete_laudos", fields: ["nomeEte", "licencaEte"] }],
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
        requiredFields: [{ formId: "residuos_destinacao_final", fields: ["tipoDestinacao", "licencaAmbiental", "documentoLicenca", "documentoPesagem"] }],
      },
      {
        id: "irs-fr",
        title: "Cadastro e comprovacao do Fator de Reciclagem (FR) por cooperativas de catadores.",
        penalty: "Sem pesagens validadas de cooperativas, o FR tende a ficar zerado ou subestimado.",
        formIds: ["residuos_coleta_seletiva"],
        requiredFields: [{ formId: "residuos_coleta_seletiva", fields: ["cooperativa", "papelT", "plasticoT", "vidroT", "metalT"] }],
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
        requiredFields: [{ formId: "residuos_destinacao_final", fields: ["tipoDestinacao", "documentoContrato"] }],
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
        requiredFields: [{ formId: "uc_gestao", fields: ["nomeUc", "categoriaUc", "esferaUc", "areaMunicipioHa", "limiteVetor"] }],
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
        requiredFields: [{ formId: "uc_gestao", fields: ["planoManejo", "planoManejoUpload"] }],
      },
      {
        id: "uc-delimitacao-fiscalizacao",
        title: "Delimitacao geografica e relatorios de fiscalizacao/combate a incendios nas areas protegidas.",
        penalty: "Sem mapa e relatorios operacionais, a evidencia territorial da conservacao fica incompleta.",
        formIds: ["uc_gestao", "mananciais_abastecimento"],
        requiredFields: [
          { formId: "uc_gestao", fields: ["limiteVetor", "fotosInfra"] },
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
        requiredFields: [{ formId: "iqsmma_condema_fundo", fields: ["atasCondema", "atasUpload"] }],
      },
      {
        id: "iq-fundo",
        title: "Fundo Municipal de Meio Ambiente instituido e cadastrado no Cadastro Estadual.",
        penalty: "Fundo nao instituido ou sem norma de repasse compromete a regularidade do IQSMMA.",
        formIds: ["iqsmma_condema_fundo"],
        requiredFields: [{ formId: "iqsmma_condema_fundo", fields: ["leiFundo", "normaRepasse", "leiFundoUpload"] }],
      },
      {
        id: "iq-extratos",
        title: "Serie completa de 12 extratos bancarios mensais, de janeiro a dezembro, validada.",
        penalty: "Extratos incompletos rebaixam a conformidade do Fundo e geram pendencia documental impeditiva.",
        formIds: ["iqsmma_condema_fundo"],
        requiredFields: [{ formId: "iqsmma_condema_fundo", fields: ["extratosUpload"] }],
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

function loadDraft(formId: string): DraftRecord {
  try {
    return JSON.parse(localStorage.getItem(storageKey(formId)) || "{}") as DraftRecord;
  } catch {
    return {};
  }
}

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

function DigitalForm({ config }: { config: DigitalFormConfig }) {
  const [draft, setDraft] = useState<DraftRecord>(() => loadDraft(config.id));
  const didMount = useRef(false);
  const status = getFormStatus(config, draft);
  const checklist = getChecklist(config, draft);
  const pending = checklist.filter((item) => !item.complete);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(storageKey(config.id), JSON.stringify(draft));
      window.dispatchEvent(new Event("draft-saved"));
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [config.id, draft]);

  function updateField(field: FieldConfig, value: string | boolean) {
    setDraft((current) => {
      return { ...current, [field.name]: value };
    });
  }

  function saveDraft() {
    localStorage.setItem(storageKey(config.id), JSON.stringify(draft));
    window.dispatchEvent(new Event("draft-saved"));
  }

  return (
    <article className="digital-form">
      <div className="digital-form-header">
        <div>
          <p>{config.module.toUpperCase()}</p>
          <h3>{config.title}</h3>
          <span>{config.description}</span>
        </div>
        <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
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
                onChange={(event) => updateField(field, event.target.files?.[0]?.name || "")}
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
            {field.kind === "file" && draft[field.name] && <small>Arquivo selecionado: {String(draft[field.name])}</small>}
          </label>
        ))}
      </div>

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
  const tabs = [
    ["conformidade", "Central de Conformidade"],
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
          <p>Painel interno para monitoramento tecnico, evidencias e fechamento do ciclo anual.</p>
        </div>
        <a href="/api/health" target="_blank" rel="noreferrer">API online</a>
      </header>
      <CompletionDashboard />
      <nav className="tabs">
        {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === "conformidade" && <CompliancePanel />}
      {tab === "esgoto" && <EsgotoPanel />}
      {tab === "residuos" && <ResiduosPanel />}
      {tab === "uc" && <UcPanel />}
      {tab === "iqsmma" && <IqsmmaPanel />}
      {tab === "ifca" && <ConsolidadorPanel />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
