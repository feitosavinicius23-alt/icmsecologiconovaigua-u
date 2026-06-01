import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Status = "idle" | "loading" | "ready" | "error";

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
          <h2>Esgotamento Sanitário</h2>
          <p>Consolidação das ETEs de Nova Iguaçu para o Índice de Tratamento de Esgoto.</p>
        </div>
        <button onClick={recalcular} disabled={status === "loading"}>{status === "loading" ? "Calculando..." : "Recalcular ITE"}</button>
      </div>
      {error && <div className="alert red">{error}</div>}
      <div className="grid three">
        <MetricCard title="Pontuação final" value={numberPt(data?.pontuacaoFinalMunicipal, 4)} helper="Resultado consolidado das estações calculadas." tone={data?.possuiPossivelSobreposicaoPopulacional ? "amber" : "green"} />
        <MetricCard title="Cobertura somada" value={`${numberPt(data?.somaPercentualAtendido)}%`} helper="Soma da população atendida informada." />
        <MetricCard title="ETEs monitoradas" value={String(data?.totalEstacoes ?? 0)} helper="Estações cadastradas no ciclo atual." />
      </div>
      {data?.possuiPossivelSobreposicaoPopulacional && <div className="alert amber">A cobertura ultrapassou 100%. Revise a população atendida antes de enviar ao INEA/CEPERJ.</div>}
      <Table
        columns={["ETE", "Tratamento", "População atendida", "RE", "Nota", "Status"]}
        rows={(data?.estacoes ?? []).map((ete) => [
          ete.nome,
          ete.nivelTratamento,
          `${numberPt(ete.percentualPopulacaoAtendida)}%`,
          numberPt(ete.reRelatorioEficiencia),
          numberPt(ete.pontuacaoParcial, 4),
          ete.statusCalculo,
        ])}
      />
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
      ["Plástico", data.totaisPorMaterial.plasticoT, "green"],
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
          <h2>Resíduos Sólidos e Coleta Seletiva</h2>
          <p>Simulação do Fator de Reciclagem com base nas pesagens validadas.</p>
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
        <MetricCard title="Índice conquistado" value={`${numberPt(data?.percentualReciclagem)}%`} helper="Percentual sobre o total anual de RSU." />
        <MetricCard title="Toneladas recicladas" value={`${numberPt(data?.totalReciclaveisT, 3)} t`} helper="Papel, plástico, vidro e metal consolidados." />
      </div>
      <div className="bars">
        {materiais.map((m) => (
          <div key={m.nome as string}>
            <div className="bar-label"><strong>{m.nome}</strong><span>{numberPt(m.valor, 3)} t · {numberPt(m.pct)}%</span></div>
            <div className="bar"><i className={String(m.cor)} style={{ width: `${Math.min(m.pct, 100)}%` }} /></div>
          </div>
        ))}
      </div>
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
          <h2>Governança Institucional IQSMMA</h2>
          <p>Auditoria do CONDEMA e do Fundo Municipal de Meio Ambiente.</p>
        </div>
        <button onClick={carregar} disabled={status === "loading"}>Atualizar auditoria</button>
      </div>
      {error && <div className="alert red">{error}</div>}
      <div className={`status-block ${tone}`}>
        {data?.statusInstitucional === "Critico" ? "STATUS CRÍTICO - RISCO ALTO DE PERDA DE RECEITA" : data?.statusInstitucional === "Atencao" ? "STATUS EM ATENÇÃO" : "STATUS REGULAR"}
      </div>
      <div className="grid two">
        <MetricCard title="CONDEMA" value={`${data?.requisitos.condema.atasValidadas ?? 0}/${data?.requisitos.condema.minimoExigido ?? 3}`} helper="Atas validadas no ciclo." tone={data?.requisitos.condema.regular ? "green" : "red"} />
        <MetricCard title="Fundo Municipal" value={data?.requisitos.fundoMunicipal.statusIqsmma ?? "-"} helper={(data?.requisitos.fundoMunicipal.mesesSemExtratoValidado.length ?? 0) > 0 ? `Faltam meses: ${data?.requisitos.fundoMunicipal.mesesSemExtratoValidado.join(", ")}` : "Série de extratos sem pendências."} tone={data?.requisitos.fundoMunicipal.possuiSerieCompletaDeExtratos ? "green" : "amber"} />
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
    </section>
  );
}

function ConsolidadorPanel() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Consolidador IFCA</h2>
          <p>Relatório executivo para fechamento do ciclo e preparação do envio oficial.</p>
        </div>
        <button onClick={() => window.print()}>Exportar relatório</button>
      </div>
      <div className="ifca-card">
        <span>Município</span>
        <strong>Nova Iguaçu</strong>
        <p>Ciclo 2026 · relatório gerado em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="grid three">
        <MetricCard title="Saneamento" value="IES" helper="Nota calculada pelo módulo de ETEs." />
        <MetricCard title="Resíduos" value="IRS" helper="Fator de Reciclagem e coleta seletiva." />
        <MetricCard title="Institucional" value="IQSMMA" helper="CONDEMA e Fundo Municipal." />
      </div>
      <div className="status-footer green">PRONTO PARA OPERAÇÃO ASSISTIDA DO MVP</div>
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
  const [tab, setTab] = useState("esgoto");
  const tabs = [
    ["esgoto", "Esgoto"],
    ["residuos", "Resíduos"],
    ["iqsmma", "IQSMMA"],
    ["ifca", "IFCA"],
  ];

  return (
    <main>
      <header className="hero">
        <div>
          <span>SEMAM Nova Iguaçu</span>
          <h1>ICMS Ecológico</h1>
          <p>Painel interno para monitoramento técnico, evidências e fechamento do ciclo anual.</p>
        </div>
        <a href="/api/health" target="_blank" rel="noreferrer">API online</a>
      </header>
      <nav className="tabs">
        {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === "esgoto" && <EsgotoPanel />}
      {tab === "residuos" && <ResiduosPanel />}
      {tab === "iqsmma" && <IqsmmaPanel />}
      {tab === "ifca" && <ConsolidadorPanel />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
