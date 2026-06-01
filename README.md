# Sistema ICMS Ecologico Nova Iguacu

Sistema web interno para a Secretaria Municipal de Meio Ambiente de Nova Iguacu
(SEMAM), projetado para centralizar dados, evidencias e calculos relacionados ao
ICMS Ecologico do Estado do Rio de Janeiro.

O objetivo do MVP e apoiar a equipe tecnica no acompanhamento anual dos
indicadores ambientais, na reducao de riscos documentais e na preparacao do
pacote de envio ao INEA/CEPERJ, com foco nos eixos de esgotamento sanitario,
residuos solidos, unidades de conservacao e governanca institucional do IQSMMA.

## Objetivo Do Sistema

O sistema foi customizado para a realidade ambiental e institucional de Nova
Iguacu, considerando:

- Parque Natural Municipal de Nova Iguacu, Rebio Tingua e demais areas
  protegidas relevantes ao IFCA.
- ETEs localizadas no territorio municipal, com calculo do Indice de Tratamento
  de Esgoto a partir de populacao atendida, nivel de tratamento e laudos de DBO.
- Cooperativas locais de catadores, pesagens mensais, notas fiscais e MTRs para
  consolidacao do Fator de Reciclagem.
- CONDEMA, Fundo Municipal de Meio Ambiente e comprovacoes institucionais
  necessarias ao IQSMMA.
- Centralizacao de evidencias documentais para auditoria, revisao e exportacao.

## Arquitetura Do Projeto

O MVP foi desenhado como uma aplicacao web full stack, com separacao clara entre
API, banco de dados e interface administrativa.

### Backend

- **Node.js**: runtime principal da API.
- **TypeScript**: tipagem estatica para rotas, servicos e contratos internos.
- **Express.js**: camada HTTP para exposicao dos endpoints REST.
- **Prisma ORM**: acesso ao PostgreSQL, migrations e execucao de seeds.
- **PostgreSQL**: banco relacional para dados ambientais, evidencias,
  calculos anuais e auditorias institucionais.

### Frontend

- **React**: interface administrativa modular.
- **TypeScript**: contratos tipados para payloads da API.
- **Tailwind CSS**: design system utilitario para telas executivas, dashboards,
  cards, tabelas, badges e alertas.

### Infraestrutura

- **Docker**: empacotamento do backend.
- **Docker Compose**: orquestracao local dos servicos `backend` e `postgres`.
- **start-app.sh**: entrypoint com suporte aos modos local/dev e deploy.

## Estrutura De Pastas Sugerida

```text
.
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── icmsEsgoto.routes.ts
│   │   │   ├── icmsResiduos.routes.ts
│   │   │   └── icmsIqsmma.routes.ts
│   │   └── services/
│   │       ├── calculoIte.service.ts
│   │       ├── calculoResiduos.service.ts
│   │       └── calculoIqsmma.service.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── seeds/
│   │   └── nova-iguacu.seed.sql
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ModalUploadLaudo.tsx
│   │   └── pages/
│   │       ├── IcmsEsgotoDashboard.tsx
│   │       ├── IcmsResiduosDashboard.tsx
│   │       ├── IcmsIqsmmaDashboard.tsx
│   │       └── IcmsConsolidadorIfca.tsx
│   ├── package.json
│   └── tailwind.config.ts
├── Dockerfile
├── docker-compose.yml
├── start-app.sh
├── .dockerignore
└── README.md
```

Observacao: os arquivos de infraestrutura atuais assumem que a aplicacao Node
exponha o build em `dist/server.js`, que o Prisma esteja em `prisma/schema.prisma`
e que o seed SQL esteja em `seeds/nova-iguacu.seed.sql`.

## Inicializacao Com Docker Compose

### 1. Configurar Variaveis De Ambiente

O `docker-compose.yml` ja fornece uma `DATABASE_URL` padrao para o ambiente
local:

```text
postgresql://icms_user:icms_password@postgres:5432/icms_ecologico_nova_iguacu?schema=public
```

Para ambientes de homologacao ou producao, substitua usuario, senha, host e nome
do banco por valores seguros.

### 2. Subir Banco E Backend

Na raiz do projeto:

```bash
docker compose up --build
```

Esse comando:

- sobe o PostgreSQL;
- aguarda o banco ficar saudavel;
- cria o container do backend;
- executa as migrations Prisma em modo `deploy`;
- executa o seed SQL de Nova Iguacu;
- inicia a API na porta `3000`.

### 3. Conferir Saude Da API

```bash
curl http://localhost:3000/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "sistema": "ICMS Ecologico Nova Iguacu"
}
```

## Inicializacao Local Sem Docker

Para desenvolvimento fora do container:

```bash
npm install
export DATABASE_URL="postgresql://icms_user:icms_password@localhost:5432/icms_ecologico_nova_iguacu?schema=public"
PRISMA_MIGRATION_MODE=dev RUN_SEEDS=true ./start-app.sh
```

O script local executa:

- instalacao de dependencias, quando `INSTALL_DEPS_ON_START=true`;
- `npx prisma migrate dev`;
- seed SQL configurado em `SEED_SQL_PATH`;
- `npm run dev`, caso `dist/server.js` ainda nao exista.

## Seeds Iniciais De Nova Iguacu

O arquivo `seeds/nova-iguacu.seed.sql` deve inserir:

- ciclo corrente do ICMS;
- ETE Nova Iguacu;
- ETE Tingua;
- Parque Natural Municipal de Nova Iguacu;
- Reserva Biologica do Tingua.

Os dados operacionais iniciais de ETE podem ser ficticios para homologacao, mas
devem ser substituidos por dados oficiais antes do envio ao INEA/CEPERJ.

## Mapeamento Dos Endpoints Da API

### Esgotamento Sanitario

```http
POST /api/icms/esgoto/calcular-estacao
```

Calcula o ITE de uma ETE especifica.

Body:

```json
{
  "cicloIcmsId": 1,
  "estacaoTratamentoEsgotoId": 10
}
```

```http
POST /api/icms/esgoto/calcular-consolidado/:cicloId
```

Recalcula o consolidado municipal de esgotamento sanitario para o ciclo.

```http
GET /api/icms/esgoto/resultado-consolidado/:cicloId
```

Retorna a pontuacao final municipal e a lista de ETEs com nota, status e
eventuais pendencias.

```http
POST /api/icms/esgoto/laudos
```

Endpoint sugerido para upload de laudos mensais de eficiencia de DBO,
integrado ao componente `ModalUploadLaudo.tsx`.

### Residuos Solidos E Coleta Seletiva

```http
POST /api/icms/residuos/coleta-seletiva
```

Salva ou atualiza a pesagem mensal de uma cooperativa de Nova Iguacu.

Body:

```json
{
  "cicloIcmsId": 1,
  "anoReferencia": 2026,
  "mesReferencia": 5,
  "nomeCooperativa": "Cooperativa Exemplo",
  "pesoPapelT": 12.5,
  "pesoPlasticoT": 8.2,
  "pesoVidroT": 3.1,
  "pesoMetalT": 1.7,
  "caminhoMtrOuNotaFiscal": "/documentos/mtr-maio.pdf",
  "documentoEvidenciaId": 100
}
```

```http
POST /api/icms/residuos/calcular-consolidado
```

Calcula o Fator de Reciclagem municipal a partir das pesagens validadas.

Body:

```json
{
  "cicloIcmsId": 1,
  "totalRsuAnualT": 250000,
  "tipoSistema": "Domiciliar"
}
```

### IQSMMA Institucional

```http
GET /api/icms/iqsmma/auditoria/:cicloId
```

Executa auditoria institucional do CONDEMA e do Fundo Municipal de Meio Ambiente.

Retorna:

- status institucional geral;
- quantidade de atas validadas do CONDEMA;
- regularidade dos extratos mensais do Fundo;
- alertas de risco por impacto no IFCA.

### Saude Da Aplicacao

```http
GET /api/health
```

Verifica se a API esta ativa.

## Principais Regras De Negocio Implementadas

### ITE - Esgotamento Sanitario

- Busca populacao atendida e populacao urbana de referencia por ETE.
- Aplica fator de tratamento:
  - Primario: `1.0`
  - Secundario: `2.0`
  - Emissario Submarino: `2.0`
  - Terciario: `4.0`
- Calcula RE pela media anual de remocao de DBO:
  - menor que 80%: `0`
  - entre 80% e 90%: `8`
  - maior que 90%: `10`
  - emissario submarino: `10`
- Sinaliza possivel sobreposicao se a soma de populacao atendida ultrapassar
  100%.

### FR - Residuos Solidos

- Considera apenas registros de coleta seletiva com `status_dado = Validado`.
- Soma papel, plastico, vidro e metal.
- Calcula o percentual sobre o total anual de RSU informado.
- Aplica a faixa de FR conforme o tipo de sistema:
  - `Domiciliar`: FR de 0 a 5.
  - `UTC_Ponto`: FR de 0 a 2.

### IQSMMA - Governanca Institucional

- Exige pelo menos 3 atas validadas do CONDEMA no ciclo.
- Verifica o Fundo Municipal de Meio Ambiente.
- Rebaixa automaticamente o Fundo de `Totalmente implementado` para
  `Parcialmente implementado` quando faltam extratos mensais validados.
- Gera alertas de risco para o painel executivo.

## Telas Do MVP

- `IcmsEsgotoDashboard.tsx`: painel do modulo de esgotamento sanitario.
- `ModalUploadLaudo.tsx`: cadastro de laudo mensal de eficiencia de DBO.
- `IcmsResiduosDashboard.tsx`: simulador do Fator de Reciclagem.
- `IcmsIqsmmaDashboard.tsx`: auditoria institucional CONDEMA/Fundo.
- `IcmsConsolidadorIfca.tsx`: tela final de consolidacao e exportacao.

## Observacoes Para Homologacao

- Substituir dados ficticios dos seeds por dados oficiais da SEMAM.
- Validar nomes oficiais das ETEs, operadores, populacao atendida e vazoes.
- Conferir documentos obrigatorios da Nota Tecnica SEAS/INEA antes do primeiro
  envio oficial.
- Implementar autenticacao e controle de acesso antes da producao.
- Configurar armazenamento seguro para PDFs e evidencias documentais.
- Adicionar testes automatizados para calculos de ITE, FR e IQSMMA.

## Licenca E Uso

Projeto interno proposto para apoio tecnico da Secretaria Municipal de Meio
Ambiente de Nova Iguacu no acompanhamento do ICMS Ecologico RJ.
