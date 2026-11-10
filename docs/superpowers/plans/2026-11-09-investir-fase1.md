# Investir (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a aba Investir, que recomenda onde aplicar o dinheiro que sobra (renda fixa BR, ações/FIIs da B3, exterior, cripto) a partir de dados públicos com cache offline e uma tela "ver a conta".

**Architecture:** Motor puro em `src/engine/invest/` (sem rede, sem React) recebe um snapshot de taxas e devolve plano de alocação e ranking líquido. Adaptadores de rede em `src/invest/` (BCB SGS, Tesouro Transparente, Yahoo) gravam numa tabela de cache SQLite; a UI lê só o cache e dispara a atualização por fonte. Cada fonte falha sozinha.

**Tech Stack:** Expo/React Native 0.88, TypeScript, expo-sqlite (better-sqlite3 nos testes via `tests/helpers/memoryDb.ts`), Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-11-09-investir-design.md`. A Fase 2 (ligar o motor às Decisões) fica **fora** deste plano, porque a tela Decisões ainda é "Em breve" (M4).

## Global Constraints

- Dinheiro em **centavos inteiros** (`Cents`, `src/lib/money.ts`). Taxas são decimais anuais (0,1475 = 14,75% a.a.) e podem ser `number`.
- Textos em português do Brasil. Visual só com `tokens` de `src/theme/tokens.ts`.
- Motor em `src/engine/invest/` não importa React, expo nem `fetch`. Adaptadores recebem `fetch` por parâmetro (`FetchFn = typeof fetch`).
- Prazos: `6 | 12 | 24` meses, padrão **12**. `days = Math.round(termMonths * 365 / 12)` (6 meses = 183 dias).
- IR regressivo sobre o ganho: até 180 dias 22,5%; até 360 20%; até 720 17,5%; acima 15%. Poupança e LCI/LCA: sem IR.
- IOF (tabela do dia 1 ao 30, em %): 96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0.
- Hipóteses padrão: CDB 100% do CDI, LCI/LCA 90% do CDI, custódia B3 0,2% a.a. (Tesouro apenas).
- Reserva alvo = 6 × gasto essencial mensal médio. Entre 3 e 6 meses: 50% do valor vai à reserva; abaixo de 3: 100% (sempre limitado à lacuna).
- Mix por perfil (renda fixa / FII / ações BR / exterior / cripto, em %): conservador 90/5/5/0/0; moderado 60/15/15/8/2; arrojado 30/20/25/20/5. Faixa exibida = pct ± 5 (limitada a 0..100); 0% = "não sugerido neste perfil".
- Cache: defasagem avaliada por fonte. TTL: bcb 6 h, yahoo 6 h, tesouro 24 h (arquivo grande; mudança minha em relação aos 6 h do spec).
- Aviso fixo na aba, exatamente: `Simulação educativa com dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante futura.`
- Sem chaves de API, sem token. Indicador ausente = `—`.
- Desvios do spec, por decisão do plano: **brapi.dev fica de fora** (sem token só cobre poucos tickers) e o Yahoo atende B3, exterior e cripto; câmbio USD/BRL vem do Yahoo (`USDBRL=X`) em vez do PTAX; CDI vem da série SGS 4389 (anualizada) em vez da 12. Stooq fica para depois.

## Review Focus

- Cache vazio e sem internet: a aba renderiza com "sem dado", sem lançar erro (Task 9, Task 10, Task 11).
- Valor a investir 0 ou negativo: estado "Sem sobra este mês" e digitar valor manual continua possível, sem divisão por zero (Task 3, Task 10).
- Reserva ou gasto essencial desconhecidos: aviso `reserva-desconhecida`, sem passo de reserva e sem quebrar (Task 3).
- Feed parcial ou malformado (valor não numérico, array vazio, preço nulo, dividendos ausentes): omite só aquele item (Tasks 6, 7, 8).
- Arredondamento: a soma dos passos e das classes sempre bate com o valor total em centavos (Task 3).

---

### Task 1: Tipos e impostos

**Files:**
- Create: `src/engine/invest/types.ts`
- Create: `src/engine/invest/tax.ts`
- Test: `tests/engine/invest/tax.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type Profile = 'conservador' | 'moderado' | 'arrojado'`
  - `type Term = 6 | 12 | 24`
  - `type AssetClass = 'rendaFixa' | 'fii' | 'acoesBr' | 'exterior' | 'cripto'`
  - `type ProductId = 'poupanca' | 'tesouroSelic' | 'tesouroPre' | 'tesouroIpca' | 'cdb' | 'lciLca'`
  - `interface Rates { selic: number | null; cdi: number | null; ipca12m: number | null; tr: number | null; tesouroSelicSpread: number | null; tesouroPre: Record<Term, number | null>; tesouroIpca: Record<Term, number | null> }`
  - `interface Hypotheses { cdbPctCdi: number; lciPctCdi: number; custodyPct: number }` e `const DEFAULT_HYPOTHESES: Hypotheses` (1, 0.9, 0.002)
  - `interface ExplainLine { label: string; value: string }`
  - `const EMPTY_RATES: Rates` (tudo `null`)
- Produces (`tax.ts`): `irRate(days: number): number`, `iofRate(days: number): number`, `termDays(term: Term): number`.

- [ ] **Step 1: Write the failing test** `tests/engine/invest/tax.test.ts`: `irRate(180)=0.225`, `irRate(181)=0.2`, `irRate(360)=0.2`, `irRate(361)=0.175`, `irRate(720)=0.175`, `irRate(721)=0.15`; `iofRate(1)=0.96`, `iofRate(15)=0.5`, `iofRate(29)=0.03`, `iofRate(30)=0`, `iofRate(400)=0`; `termDays(6)=183`, `termDays(12)=365`, `termDays(24)=730`.
- [ ] **Step 2: Run** `npx jest tests/engine/invest/tax.test.ts` — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** os tipos em `types.ts` (assinaturas acima) e as três funções em `tax.ts`; IOF por lookup da tabela das Global Constraints (dias ≤ 0 contam como dia 1).
- [ ] **Step 4: Run** o mesmo teste — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/engine/invest tests/engine/invest
git commit -m "feat(invest): tipos e impostos (IR regressivo, IOF)"
```

### Task 2: Renda fixa, retorno líquido

**Files:**
- Create: `src/engine/invest/fixedIncome.ts`
- Test: `tests/engine/invest/fixedIncome.test.ts`

**Interfaces:**
- Consumes: tipos e `irRate`, `iofRate`, `termDays` da Task 1.
- Produces:
  - `const PRODUCTS: Record<ProductId, { name: string; liquidity: 'diaria' | 'vencimento'; taxed: boolean; custody: boolean }>`. Nomes: Poupança, Tesouro Selic, Tesouro Prefixado, Tesouro IPCA+, CDB, LCI/LCA. Liquidez diária: poupança, tesouroSelic, cdb; vencimento: os demais. `taxed=false` para poupança e lciLca. `custody=true` para os três Tesouros.
  - `interface FixedIncomeResult { id: ProductId; name: string; liquidity: 'diaria' | 'vencimento'; term: Term; days: number; grossAnnual: number; netAnnual: number; gain: Cents; ir: Cents; iof: Cents; custody: Cents; netProfit: Cents; finalValue: Cents; explain: ExplainLine[] }`
  - `evaluateFixedIncome(id: ProductId, principal: Cents, term: Term, rates: Rates, hyp: Hypotheses): FixedIncomeResult | null` (`null` se faltar a taxa necessária)
  - `rankFixedIncome(principal: Cents, term: Term, rates: Rates, hyp: Hypotheses): FixedIncomeResult[]` (maior `netProfit` primeiro, sem os `null`)

Fórmulas (fator = `(1 + grossAnnual) ^ (days / 365)`; `gain = round(principal * (fator - 1))`):
- poupança: `base = selic <= 0.085 ? 0.7 * selic : 1.005 ** 12 - 1`; `grossAnnual = (1 + base) * (1 + tr) - 1` (precisa de `selic` e `tr`).
- tesouroSelic: `selic + (tesouroSelicSpread ?? 0)`. tesouroPre: `tesouroPre[term]`. tesouroIpca: `(1 + ipca12m) * (1 + tesouroIpca[term]) - 1`. cdb: `cdi * cdbPctCdi`. lciLca: `cdi * lciPctCdi`.
- `ir = round(gain * irRate(days))` se `taxed`; `iof = round(gain * iofRate(days))` se `taxed`; `custody = round((principal + gain) * custodyPct * days / 365)` se `custody`.
- `netProfit = gain - ir - iof - custody`; `netAnnual = ((principal + netProfit) / principal) ** (365 / days) - 1`.
- `explain` lista taxa usada, prazo em dias, IR/IOF/custódia aplicados e a hipótese (ex.: `CDB a 100% do CDI`) em texto pt-BR.

- [ ] **Step 1: Write the failing tests** (principal 1_000_000, prazo 12, `cdi: 0.15`): cdb → `gain 150000`, `ir 26250`, `netProfit 123750`, `finalValue 1123750`; lciLca → `netProfit 135000`, `ir 0`; tesouroSelic com `selic: 0.15` e spread nulo → `custody 2300`, `netProfit 121450`; poupança com `selic: 0.08, tr: 0` → `gain 56000`; poupança com `selic: 0.15, tr: 0` → `gain 61678`; prazo 6 de cdb usa IR de 20% (`days 183`); `rates` vazio → `evaluateFixedIncome` devolve `null` para todos e `rankFixedIncome` devolve `[]`; ranking ordena por `netProfit` (lciLca acima de cdb com os números acima).
- [ ] **Step 2: Run** `npx jest tests/engine/invest/fixedIncome.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** em `fixedIncome.ts` conforme as assinaturas e fórmulas acima.
- [ ] **Step 4: Run** o mesmo teste — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/engine/invest/fixedIncome.ts tests/engine/invest/fixedIncome.test.ts
git commit -m "feat(invest): retorno líquido da renda fixa"
```

### Task 3: Alocação por perfil e plano em cascata

**Files:**
- Create: `src/engine/invest/allocation.ts`
- Modify: `src/engine/composite.ts` (exportar `goalRatio`, hoje privada)
- Test: `tests/engine/invest/allocation.test.ts`

**Interfaces:**
- Consumes: `Profile`, `AssetClass` (Task 1); `Goal` de `src/domain/types.ts`; `goalRatio(g: Goal, today: string): number`; `daysBetween` de `src/lib/dates.ts`.
- Produces:
  - `const PROFILE_MIX: Record<Profile, Record<AssetClass, number>>` (percentuais da Global Constraints)
  - `splitByMix(total: Cents, profile: Profile): Record<AssetClass, Cents>`: `floor(total * pct / 100)` por classe; a sobra de centavos vai para a classe de maior pct do perfil, de modo que a soma = `total`.
  - `classRange(pct: number): { min: number; max: number } | null` (`null` se pct = 0)
  - `type PlanWarning = 'reserva-baixa' | 'reserva-desconhecida' | 'sem-valor'`
  - `type PlanStep = { kind: 'reserva'; amount: Cents } | { kind: 'meta'; amount: Cents; goalId: string; goalName: string } | { kind: 'mix'; amount: Cents; byClass: Record<AssetClass, Cents> }`
  - `interface PlanInput { amount: Cents; profile: Profile; reserve: Cents | null; essentialMonthly: Cents; goals: Goal[]; today: string }`
  - `interface Plan { steps: PlanStep[]; warnings: PlanWarning[]; reserveMonths: number | null }`
  - `planAllocation(input: PlanInput): Plan`

Regras de `planAllocation`: `amount <= 0` → `steps: []`, `warnings: ['sem-valor']`. `reserve === null` ou `essentialMonthly <= 0` → `reserveMonths: null`, aviso `reserva-desconhecida`, sem passo de reserva. Senão `reserveMonths = reserve / essentialMonthly`; `gap = max(0, 6 * essentialMonthly - reserve)`; `reserveMonths < 6` adiciona `reserva-baixa`; passo de reserva = `min(gap, reserveMonths < 3 ? amount : round(amount / 2))`, omitido se 0. Depois, metas com `daysBetween(today, deadline) < 365` e `goalRatio(g, today) < 1`, por prazo crescente: `restante = target - saved`; se o prazo já passou (`daysBetween <= 0`) a parcela é `restante`; senão `monthsLeft = ceil(daysBetween / 30)` e parcela = `ceil(restante / monthsLeft)`; cada parcela é limitada ao saldo ainda não alocado. O que sobra vira um passo `mix` (omitido se 0).

- [ ] **Step 1: Write the failing tests**: `splitByMix(100001, 'moderado')` soma 100001 e a diferença cai em `rendaFixa`; `splitByMix(1000, 'conservador').cripto = 0`; `classRange(0) = null`, `classRange(60) = {min:55,max:65}`, `classRange(2) = {min:0,max:7}`. `planAllocation` (today `2026-11-09`, essentialMonthly 100000): (a) reserve 0, amount 300000 → só passo `reserva` de 300000 e aviso `reserva-baixa`; (b) reserve 400000, amount 300000 → reserva 150000 + mix 150000; (c) reserve 700000 e uma meta (target 120000, saved 0, start `2026-01-01`, deadline `2027-01-01`) → passo `meta` de 60000 e `mix` com o resto, sem passo de reserva e sem aviso; (d) reserve `null` → aviso `reserva-desconhecida`, só `mix` com o valor total; (e) amount 0 e amount -500 → `sem-valor`, `steps` vazio; (f) em todos os casos acima a soma dos `amount` dos passos = `amount`.
- [ ] **Step 2: Run** `npx jest tests/engine/invest/allocation.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** em `allocation.ts`; em `composite.ts` só adicionar `export` a `goalRatio`.
- [ ] **Step 4: Run** `npx jest tests/engine` — Expected: PASS (inclui os testes antigos do motor).
- [ ] **Step 5: Commit**

```bash
git add src/engine tests/engine
git commit -m "feat(invest): mix por perfil e plano em cascata (reserva, metas, mix)"
```

### Task 4: Recomendação composta

**Files:**
- Create: `src/engine/invest/recommend.ts`
- Test: `tests/engine/invest/recommend.test.ts`

**Interfaces:**
- Consumes: `planAllocation`, `PlanInput`, `Plan`, `PROFILE_MIX`, `classRange` (Task 3); `rankFixedIncome`, `FixedIncomeResult` (Task 2); `Rates`, `Hypotheses`, `Term`, `AssetClass`, `ProductId` (Task 1).
- Produces:
  - `interface RecommendInput extends PlanInput { term: Term; rates: Rates; hyp: Hypotheses }`
  - `interface ClassAllocation { cls: AssetClass; pct: number; range: { min: number; max: number } | null; amount: Cents }`
  - `interface Recommendation { plan: Plan; ranking: FixedIncomeResult[]; reserveProduct: ProductId | null; fixedProduct: ProductId | null; classes: ClassAllocation[] }`
  - `recommend(input: RecommendInput): Recommendation`

`ranking` usa principal `amount > 0 ? amount : 100000` (referência de R$ 1.000). `reserveProduct` = primeiro do ranking com `liquidity === 'diaria'`; `fixedProduct` = `ranking[0]`; ambos `null` se o ranking é vazio. `classes` lista as 5 classes na ordem de `AssetClass` com `pct` do perfil, `range` e `amount` vindo do passo `mix` (0 se não houver).

- [ ] **Step 1: Write the failing tests**: com `rates` `{cdi: 0.15, selic: 0.15, tr: 0, ...vazios}`, valor 1_000_000, perfil moderado, reserva completa → `fixedProduct = 'lciLca'`, `reserveProduct = 'cdb'` ou `'tesouroSelic'` (o de maior `netProfit` entre os de liquidez diária; assert contra o ranking), `classes` soma `amount` = valor e `classes[4]` (cripto) tem `range {min:0,max:7}`; conservador tem `exterior` com `range null`; `EMPTY_RATES` → `ranking []`, `reserveProduct null`, `fixedProduct null`, `plan` ainda calculado.
- [ ] **Step 2: Run** `npx jest tests/engine/invest/recommend.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `recommend` compondo as funções existentes.
- [ ] **Step 4: Run** `npx jest tests/engine` — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/engine/invest/recommend.ts tests/engine/invest/recommend.test.ts
git commit -m "feat(invest): recomendação composta"
```

### Task 5: Cache em SQLite

**Files:**
- Modify: `src/db/schema.ts` (`SCHEMA_VERSION = 3`; criar tabela)
- Create: `src/invest/cache.ts`
- Test: `tests/invest/cache.test.ts`

**Interfaces:**
- Produces:
  - tabela `reference_rate (key TEXT PRIMARY KEY, value REAL NOT NULL, asOf TEXT NOT NULL, fetchedAt TEXT NOT NULL, extra TEXT)` criada com `CREATE TABLE IF NOT EXISTS` em `migrate`
  - `interface CacheEntry { key: string; value: number; asOf: string; fetchedAt: string; extra?: Record<string, number | null> }`
  - `putEntries(db: Db, entries: CacheEntry[]): Promise<void>` (upsert por `key`)
  - `getAllEntries(db: Db): Promise<CacheEntry[]>`
  - `type FetchFn = typeof fetch` (exportado de `src/invest/cache.ts` para os adaptadores)

- [ ] **Step 1: Write the failing test**: após `migrate(await memoryDb())`, `putEntries` com duas entradas e `getAllEntries` as devolve, `extra` ida e volta (JSON); um segundo `putEntries` com a mesma `key` e outro `value` sobrescreve sem duplicar; `migrate` chamado duas vezes não falha. Procurar em `tests/` algum teste que fixe `SCHEMA_VERSION` ou `schema_version` e atualizar para 3.
- [ ] **Step 2: Run** `npx jest tests/invest/cache.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** a tabela em `migrate` e o módulo `cache.ts`.
- [ ] **Step 4: Run** `npx jest tests/db tests/invest` — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/invest/cache.ts tests
git commit -m "feat(invest): cache de taxas e cotações no SQLite"
```

### Task 6: Adaptador Banco Central (SGS)

**Files:**
- Create: `src/invest/sources/bcb.ts`
- Test: `tests/invest/bcb.test.ts`

**Interfaces:**
- Consumes: `CacheEntry`, `FetchFn` (Task 5).
- Produces: `fetchBcb(fetchFn: FetchFn, now: Date): Promise<CacheEntry[]>`. Chaves: `bcb.selic` (SGS 432, % a.a. ÷ 100), `bcb.cdi` (SGS 4389, % a.a. ÷ 100), `bcb.ipca12m` (SGS 433, últimos 12 valores mensais compostos: `Π(1 + v/100) - 1`; exige 12 valores válidos), `bcb.tr` (SGS 226, último valor v em % por período mensal, anualizado `(1 + v/100) ** 12 - 1`). URL: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json`. Resposta: `[{ data: "dd/MM/yyyy", valor: "14.90" }]`. `asOf` = data do último ponto em `YYYY-MM-DD`; `fetchedAt` = `now.toISOString()`. Cada série é independente: erro de rede, status não-ok, array vazio ou `valor` não numérico omite só aquela chave.

- [ ] **Step 1: Write the failing tests** com `fetchFn` falso que responde por URL: selic `14.90` em `06/11/2026` → `{key:'bcb.selic', value:0.149, asOf:'2026-11-06'}`; 12 meses de `0.5` → `bcb.ipca12m` ≈ 0.0616778 (`toBeCloseTo(0.0616778, 6)`); IPCA com 11 valores → chave ausente; `valor: "abc"` → chave ausente; um `fetchFn` que rejeita só para a série 432 → as outras três ainda voltam.
- [ ] **Step 2: Run** `npx jest tests/invest/bcb.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `fetchBcb`.
- [ ] **Step 4: Run** o teste — Expected: PASS. Depois **verificação ao vivo**: `curl -s "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json"` (e 432, 433, 226) e confirmar que cada série tem o formato e a unidade assumidos. Se algum código estiver errado, ajustar o código da série e o teste, e anotar no commit.
- [ ] **Step 5: Commit**

```bash
git add src/invest/sources/bcb.ts tests/invest/bcb.test.ts
git commit -m "feat(invest): adaptador do Banco Central (Selic, CDI, IPCA, TR)"
```

### Task 7: Adaptador Tesouro Transparente

**Files:**
- Create: `src/invest/sources/tesouro.ts`
- Test: `tests/invest/tesouro.test.ts`

**Interfaces:**
- Consumes: `CacheEntry`, `FetchFn`.
- Produces: `fetchTesouro(fetchFn: FetchFn, now: Date): Promise<CacheEntry[]>`. Chaves: `tesouro.selicSpread` (título "Tesouro Selic", vencimento mais próximo de `dataBase + 12 meses`), `tesouro.pre.6|12|24` (título "Tesouro Prefixado") e `tesouro.ipca.6|12|24` (título "Tesouro IPCA+"), cada um com o vencimento mais próximo de `dataBase + prazo`. Valor = coluna `Taxa Compra Manha` ÷ 100. Só linhas da `Data Base` mais recente do arquivo. CSV separado por `;`, decimal `,`, datas `dd/MM/yyyy`; títulos "com Juros Semestrais" não entram. URL do CSV: `https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv`. `asOf` = data base. O arquivo é grande: percorrer o texto uma vez, guardando só as linhas da maior data base.

- [ ] **Step 1: Write the failing tests** com um CSV de fixture pequeno (cabeçalho `Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;...` com 2 datas base, vários vencimentos): escolhe só a data base mais recente; escolhe o vencimento mais próximo do prazo (12 meses → `2027-xx`); `Taxa Compra Manha` `"12,34"` → `0.1234`; título "Tesouro Prefixado com Juros Semestrais" é ignorado; título ausente → chaves ausentes (sem lançar); resposta não-ok → `[]`.
- [ ] **Step 2: Run** `npx jest tests/invest/tesouro.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `fetchTesouro`.
- [ ] **Step 4: Run** o teste — Expected: PASS. **Verificação ao vivo**: `curl -sI` na URL acima (esperado 200 e CSV); se o endereço mudou, achar o recurso atual no dataset "Taxas dos Títulos Ofertados pelo Tesouro Direto" no portal Tesouro Transparente, atualizar a URL e conferir os nomes das colunas.
- [ ] **Step 5: Commit**

```bash
git add src/invest/sources/tesouro.ts tests/invest/tesouro.test.ts
git commit -m "feat(invest): adaptador do Tesouro Transparente"
```

### Task 8: Adaptador Yahoo e lista de ativos

**Files:**
- Create: `src/invest/assets.ts`
- Create: `src/invest/sources/yahoo.ts`
- Test: `tests/invest/yahoo.test.ts`

**Interfaces:**
- Consumes: `CacheEntry`, `FetchFn`; `AssetClass`.
- Produces:
  - `interface CuratedAsset { symbol: string; name: string; cls: Exclude<AssetClass, 'rendaFixa'>; currency: 'BRL' | 'USD' }` e `const CURATED_ASSETS: CuratedAsset[]`: ações BR `BOVA11.SA` (BOVA11), `ITUB4.SA`, `PETR4.SA`, `WEGE3.SA`; FIIs `KNRI11.SA`, `HGLG11.SA`, `KNCR11.SA`, `MXRF11.SA`; exterior `IVVB11.SA` (BRL), `VOO` (USD), `VT` (USD); cripto `BTC-USD`, `ETH-USD` (USD).
  - `fetchYahoo(fetchFn: FetchFn, now: Date, symbols: string[]): Promise<CacheEntry[]>`. Para cada símbolo: `GET https://query1.finance.yahoo.com/v8/finance/chart/{encodeURIComponent(symbol)}?range=1y&interval=1mo&events=div` com header `User-Agent: Mozilla/5.0`. Entrada `asset:{symbol}`: `value` = `chart.result[0].meta.regularMarketPrice` (moeda nativa), `asOf` = data de `meta.regularMarketTime` (epoch s) em `YYYY-MM-DD`, `extra = { change12m, dividendYield }` com `change12m = último close válido / primeiro close válido - 1` (`null` se faltar) e `dividendYield = soma dos dividendos de 12 meses / value` (`null` se não houver dividendos). Entrada extra `fx.usdbrl` com `symbol USDBRL=X` sempre buscada junto (`value` = preço). Cada símbolo é independente; preço ausente, ≤ 0 ou não numérico omite só aquele.

- [ ] **Step 1: Write the failing tests** com JSON canned: preço 100, closes `[null, 80, 90, 100]` → `change12m = 0.25`; dividendos `{a:{amount:2},b:{amount:3}}` → `dividendYield 0.05`; sem `events` → `dividendYield null`; `regularMarketPrice: 0` → entrada ausente; um símbolo que rejeita não impede os outros; `fx.usdbrl` presente quando `USDBRL=X` responde.
- [ ] **Step 2: Run** `npx jest tests/invest/yahoo.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `assets.ts` e `yahoo.ts`.
- [ ] **Step 4: Run** o teste — Expected: PASS. **Verificação ao vivo**: `curl -s -A "Mozilla/5.0" "https://query1.finance.yahoo.com/v8/finance/chart/BOVA11.SA?range=1y&interval=1mo&events=div"`; se o formato ou o bloqueio diferir, ajustar o adaptador e o teste e registrar no commit.
- [ ] **Step 5: Commit**

```bash
git add src/invest/assets.ts src/invest/sources/yahoo.ts tests/invest/yahoo.test.ts
git commit -m "feat(invest): adaptador Yahoo (B3, exterior, cripto) e lista de ativos"
```

### Task 9: Orquestração, snapshot e taxas

**Files:**
- Create: `src/invest/refresh.ts`
- Test: `tests/invest/refresh.test.ts`

**Interfaces:**
- Consumes: `fetchBcb`, `fetchTesouro`, `fetchYahoo`, `CURATED_ASSETS`, `putEntries`, `getAllEntries`, `CacheEntry`, `FetchFn`, `Rates`, `EMPTY_RATES`, `Term`.
- Produces:
  - `type SourceId = 'bcb' | 'tesouro' | 'yahoo'`; `const TTL_HOURS: Record<SourceId, number>` (6, 24, 6)
  - `sourceOf(key: string): SourceId` (`bcb.` → bcb; `tesouro.` → tesouro; qualquer outro → yahoo)
  - `type RefreshStatus = 'ok' | 'cached' | 'erro'`; `interface RefreshReport { sources: Record<SourceId, RefreshStatus> }`
  - `refreshMarket(db: Db, fetchFn: FetchFn, now: Date, force?: boolean): Promise<RefreshReport>`: por fonte, se há entrada e a mais nova tem `fetchedAt` dentro do TTL e `force` é falso → `cached` sem chamar a rede; senão chama o adaptador; resultado vazio ou exceção → `erro` (cache antigo permanece); senão grava e `ok`. Uma fonte nunca impede as outras.
  - `interface Quote { value: number; asOf: string; fetchedAt: string; stale: boolean; extra?: Record<string, number | null> }`; `type MarketSnapshot = Record<string, Quote>`
  - `loadSnapshot(db: Db, now: Date): Promise<MarketSnapshot>` (`stale` = idade > TTL da fonte da chave)
  - `ratesFromSnapshot(snap: MarketSnapshot): Rates` (`bcb.selic` → `selic`, `bcb.cdi` → `cdi`, `bcb.ipca12m`, `bcb.tr`, `tesouro.selicSpread`, `tesouro.pre.{6,12,24}`, `tesouro.ipca.{6,12,24}`; ausente → `null`)

- [ ] **Step 1: Write the failing tests** (memoryDb migrada, `fetchFn` falso contando chamadas): primeira chamada grava e devolve `ok` nas fontes que respondem; segunda chamada dentro do TTL → `cached` e `fetchFn` não é chamado de novo; com `force` busca de novo; fonte que rejeita → `erro` e entradas antigas preservadas, outras fontes seguem `ok`; entrada com `fetchedAt` 7 h atrás vem com `stale: true` para `bcb.*` e 7 h atrás é `stale: false` para `tesouro.*`; `ratesFromSnapshot({})` equivale a `EMPTY_RATES`; `ratesFromSnapshot` com `bcb.cdi` e `tesouro.pre.12` preenche só esses campos.
- [ ] **Step 2: Run** `npx jest tests/invest/refresh.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `refresh.ts`.
- [ ] **Step 4: Run** `npx jest tests/invest` — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/invest/refresh.ts tests/invest/refresh.test.ts
git commit -m "feat(invest): atualização por fonte, snapshot e taxas"
```

### Task 10: Configurações e modelo de tela

**Files:**
- Create: `src/features/invest/settings.ts`
- Create: `src/features/invest/view.ts`
- Create: `src/features/invest/useInvest.ts`
- Test: `tests/features/invest/settings.test.ts`
- Test: `tests/features/invest/view.test.ts`

**Interfaces:**
- Consumes: `getSetting`, `setSetting`, `listTransactions`, `listBills`, `listGoals` (`src/db/repo.ts`); `canSpendToday`, `expectedMonthlyIncome` (`src/engine/today.ts`); `essentialMonthlyAverage` (`src/engine/composite.ts`); `recommend`, `Recommendation`; `loadSnapshot`, `refreshMarket`, `ratesFromSnapshot`, `MarketSnapshot`; `CURATED_ASSETS`; tipos da Task 1.
- Produces (`settings.ts`):
  - `interface InvestSettings { profile: Profile; term: Term; amountOverride: Cents | null; hyp: Hypotheses }`
  - `loadInvestSettings(db: Db): Promise<InvestSettings>` (padrões: `moderado`, 12, `null`, `DEFAULT_HYPOTHESES`; valores inválidos gravados voltam ao padrão)
  - `saveInvestSettings(db: Db, patch: Partial<InvestSettings>): Promise<void>` (chaves em `meta`: `invest.profile`, `invest.term`, `invest.amount` (vazio = remove), `invest.cdbPctCdi`, `invest.lciPctCdi`, `invest.custodyPct`)
- Produces (`view.ts`):
  - `interface AssetRow { symbol: string; name: string; cls: AssetClass; priceBrl: Cents | null; change12m: number | null; dividendYield: number | null; asOf: string | null; stale: boolean }` (preço em USD × `fx.usdbrl`, arredondado a centavos; `null` se faltar preço ou câmbio)
  - `interface InvestView { amount: Cents; defaultAmount: Cents; recommendation: Recommendation; assets: AssetRow[]; asOf: string | null; anyStale: boolean; noData: boolean }`
  - `buildInvestView(input: { settings: InvestSettings; snapshot: MarketSnapshot; txs: Transaction[]; bills: Bill[]; goals: Goal[]; reserve: Cents | null; today: string }): InvestView`: `defaultAmount = max(0, canSpendToday(...)?.available ?? 0)`; `amount = settings.amountOverride ?? defaultAmount`; `noData` = nenhuma taxa de renda fixa disponível; `asOf` = data mais recente das entradas.
  - `explainFor(view: InvestView, ref: string): { title: string; lines: ExplainLine[] } | null` com `ref` = `fixed:{ProductId}`, `asset:{symbol}` ou `plan`.
- Produces (`useInvest.ts`): hook `useInvest(): { settings, view: InvestView | null, refreshing: boolean, refresh(force?: boolean): Promise<void>, update(patch: Partial<InvestSettings>): Promise<void> }`, carregando dados do banco no foco da tela (como `src/features/home/useHome.ts`) e disparando `refreshMarket` sem bloquear a renderização. Sem teste próprio; coberto pelos de `view` e `settings`.

- [ ] **Step 1: Write the failing tests**: `settings` — padrões em banco vazio; ida e volta de cada campo; `amountOverride: null` limpa; `term` gravado como `'7'` volta a 12. `view` — snapshot vazio: não lança, `noData: true`, `recommendation.ranking` vazio, `assets` com 13 linhas e `priceBrl null`; `amountOverride 50000` vira `amount`; sem sobra (gasto > renda) → `defaultAmount 0` e `plan.warnings` contém `sem-valor`; ativo USD com `asset:VOO` = 100 e `fx.usdbrl` = 5 → `priceBrl 50000`; ativo USD sem câmbio → `priceBrl null`; `explainFor(view, 'fixed:cdb')` devolve as linhas de `explain`; `explainFor(view, 'inexistente')` devolve `null`.
- [ ] **Step 2: Run** `npx jest tests/features/invest` — Expected: FAIL.
- [ ] **Step 3: Implement** os três arquivos.
- [ ] **Step 4: Run** `npx jest tests/features/invest` e `npx tsc --noEmit` — Expected: PASS e sem erros de tipo.
- [ ] **Step 5: Commit**

```bash
git add src/features/invest tests/features/invest
git commit -m "feat(invest): configurações, modelo de tela e hook"
```

### Task 11: Telas (aba Investir e "ver a conta")

**Files:**
- Modify: `src/components/TabBar.tsx` (rótulo `investir: 'Investir'`)
- Modify: `app/(tabs)/_layout.tsx` (nova `Tabs.Screen name="investir"` depois de `index`)
- Modify: `app/_layout.tsx` (`Stack.Screen name="conta"`)
- Create: `app/(tabs)/investir.tsx`
- Create: `app/conta.tsx`
- Create: `src/features/invest/Disclaimer.tsx`, `PlanCard.tsx`, `FixedIncomeList.tsx`, `AssetSection.tsx`
- Test: `tests/features/invest/components.test.tsx`

**Interfaces:**
- Consumes: `InvestView`, `InvestSettings`, `useInvest`, `explainFor`, `formatBRL`/`parseBRL`, `tokens`, `useRouter`.
- Produces: componentes de apresentação puros (props, sem hooks de dados):
  - `Disclaimer()` com o texto exato das Global Constraints.
  - `PlanCard({ view }: { view: InvestView })`: mostra "Sugestão do mês", um item por passo do plano (reserva, meta, mix por classe com faixa `55–65%` ou "não sugerido neste perfil"), os avisos (`reserva-baixa` → "Sua reserva está abaixo de 6 meses. Liquidez diária vem primeiro."; `reserva-desconhecida` → "Informe sua reserva em Metas e reserva para personalizar."; `sem-valor` → "Sem sobra este mês").
  - `FixedIncomeList({ ranking, noData, onOpen })`: linhas com nome, `% a.a. líquido`, `R$ no prazo`, toque chama `onOpen('fixed:{id}')`; sem dados mostra "Sem dados de taxas ainda. Conecte-se para atualizar."
  - `AssetSection({ assets, onOpen })`: agrupa por classe, mostra preço em reais, variação 12m e yield (`—` quando nulo), selo "desatualizado" quando `stale`; toque chama `onOpen('asset:{symbol}')`.
- `investir.tsx`: entrada de valor (`parseBRL`), seletores de perfil e prazo, botão "Atualizar", cartão "Hipóteses" (CDB % do CDI, LCI/LCA % do CDI, custódia % a.a.), rodapé "Dados de {dd/MM/yyyy}" e `Disclaimer`. Navegação para `/conta` com `params: { ref }`.
- `conta.tsx`: título e linhas de `explainFor` (fonte e data do dado, fórmula, IR/IOF, hipótese); `ref` desconhecido mostra "Nada para mostrar".

- [ ] **Step 1: Write the failing tests** (`components.test.tsx`, no estilo de `tests/features/home/MonthBar.test.tsx`): `Disclaimer` mostra o texto exato; `PlanCard` com plano só de reserva mostra "Sua reserva está abaixo de 6 meses. Liquidez diária vem primeiro."; `PlanCard` com `sem-valor` mostra "Sem sobra este mês"; `PlanCard` conservador mostra "não sugerido neste perfil" para exterior; `FixedIncomeList` com `noData` mostra a mensagem de sem dados; `AssetSection` com `dividendYield: null` mostra `—`; com `stale: true` mostra "desatualizado".
- [ ] **Step 2: Run** `npx jest tests/features/invest/components.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** componentes e telas; `app/(tabs)/_layout.tsx` e `TabBar` ganham a aba sem mudar o comportamento das outras.
- [ ] **Step 4: Run** `npx jest` e `npx tsc --noEmit` — Expected: PASS em tudo.
- [ ] **Step 5: Commit**

```bash
git add app src tests
git commit -m "feat(invest): aba Investir e tela ver a conta"
```

### Task 12: Documentação e verificação final

**Files:**
- Modify: `docs/03-motor-financeiro.md` (seção "Investir": ordem do plano, fórmulas líquidas, hipóteses)
- Modify: `docs/06-roadmap.md` (marco "Investir (fase 1)" feito; Fase 2 ligada ao M4)
- Modify: `docs/05-dados.md` (entidade `reference_rate` com as colunas reais)
- Modify: `README.md` se listar telas ou marcos

- [ ] **Step 1:** Atualizar os documentos acima com o que foi realmente construído, incluindo os desvios do spec listados nas Global Constraints.
- [ ] **Step 2: Run** `npx jest` e `npx tsc --noEmit` — Expected: tudo passando, sem erros de tipo.
- [ ] **Step 3: Verificação no app** (skill `run`): abrir a aba Investir com internet e conferir taxas reais com a data de hoje; desligar a rede, reabrir e conferir que o cache aparece marcado como desatualizado; mudar perfil, prazo e valor e ver o recálculo; abrir "ver a conta" em uma linha de renda fixa e em um ativo.
- [ ] **Step 4: Commit**

```bash
git add docs README.md
git commit -m "docs: Investir fase 1 (motor, dados e roadmap)"
```
