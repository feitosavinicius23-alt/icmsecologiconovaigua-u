INSERT INTO ciclos_icms (
    ano_referencia,
    ano_envio,
    data_limite_envio,
    status
)
VALUES (
    2026,
    2027,
    '2027-04-20',
    'Em preparacao'
)
ON CONFLICT (ano_referencia)
DO UPDATE SET
    ano_envio = EXCLUDED.ano_envio,
    data_limite_envio = EXCLUDED.data_limite_envio,
    status = EXCLUDED.status;

INSERT INTO estacoes_tratamento_esgoto (
    nome,
    tipo,
    endereco,
    operador,
    latitude,
    longitude,
    inicio_operacao_mes,
    inicio_operacao_ano,
    nivel_tratamento,
    vazao_media_m3_dia,
    vazao_maxima_projeto_m3_dia,
    populacao_atendida,
    populacao_urbana_referencia,
    vinculada_procon_agua,
    status_operacao,
    observacoes
)
VALUES
(
    'ETE Nova Iguacu',
    'ETE',
    'Nova Iguacu - RJ',
    'Concessionaria de saneamento',
    -22.7592000,
    -43.4511000,
    1,
    2012,
    'Secundario',
    42000.000,
    65000.000,
    360000,
    820000,
    TRUE,
    'Ativa',
    'Dados iniciais ficticios para homologacao do MVP.'
),
(
    'ETE Tingua',
    'ETE',
    'Regiao de Tingua, Nova Iguacu - RJ',
    'Concessionaria de saneamento',
    -22.5850000,
    -43.4300000,
    6,
    2016,
    'Secundario',
    3500.000,
    6000.000,
    25000,
    820000,
    TRUE,
    'Ativa',
    'Dados iniciais ficticios para homologacao do MVP.'
)
ON CONFLICT (nome)
DO UPDATE SET
    tipo = EXCLUDED.tipo,
    endereco = EXCLUDED.endereco,
    operador = EXCLUDED.operador,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    inicio_operacao_mes = EXCLUDED.inicio_operacao_mes,
    inicio_operacao_ano = EXCLUDED.inicio_operacao_ano,
    nivel_tratamento = EXCLUDED.nivel_tratamento,
    vazao_media_m3_dia = EXCLUDED.vazao_media_m3_dia,
    vazao_maxima_projeto_m3_dia = EXCLUDED.vazao_maxima_projeto_m3_dia,
    populacao_atendida = EXCLUDED.populacao_atendida,
    populacao_urbana_referencia = EXCLUDED.populacao_urbana_referencia,
    vinculada_procon_agua = EXCLUDED.vinculada_procon_agua,
    status_operacao = EXCLUDED.status_operacao,
    observacoes = EXCLUDED.observacoes;

INSERT INTO unidades_conservacao (
    nome,
    categoria,
    esfera,
    status_plano_manejo,
    status_conselho_gestor,
    observacoes
)
VALUES
(
    'Parque Natural Municipal de Nova Iguacu',
    'PI',
    'Municipal',
    'Atualizado',
    'Ativo',
    'UC municipal prioritaria para acompanhamento do ICMS Ecologico.'
),
(
    'Reserva Biologica do Tingua',
    'PI',
    'Federal',
    'Atualizado',
    'Ativo',
    'Registro voltado ao acompanhamento da area incidente em Nova Iguacu.'
)
ON CONFLICT (nome)
DO UPDATE SET
    categoria = EXCLUDED.categoria,
    esfera = EXCLUDED.esfera,
    status_plano_manejo = EXCLUDED.status_plano_manejo,
    status_conselho_gestor = EXCLUDED.status_conselho_gestor,
    observacoes = EXCLUDED.observacoes,
    atualizado_em = CURRENT_TIMESTAMP;
