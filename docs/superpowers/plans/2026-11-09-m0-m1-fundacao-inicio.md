# Paralelo M0+M1: Fundação e Início — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um APK Android que importa os extratos CSV do Nubank, registra gastos e ganhos por frase ou teclado e mostra a tela inicial (score provisório, gastos do mês por categoria e o fantasma do mês anterior), tudo no aparelho.

**Architecture:** App Expo único, sem servidor. Regras puras em TypeScript (`src/ingest`, `src/parser`, `src/engine`) testadas com Jest; persistência em SQLite por trás de uma interface `Db` pequena, para que os repositórios sejam testados em Node com `better-sqlite3` e rodem no aparelho com `expo-sqlite`. As telas só leem o que o engine devolve.

**Tech Stack:** Expo (SDK estável mais recente via `create-expo-app`), TypeScript estrito, expo-router, expo-sqlite, expo-document-picker, expo-file-system, expo-sharing, Jest (`jest-expo`), better-sqlite3 (só em teste), EAS Build (perfil `preview`, APK).

**Spec:** `docs/00-proposta.md` a `docs/07-nubank.md`. Este plano cobre M0, M1 e, puxados de M2, a importação do CSV e o fantasma (ver "Mudanças de escopo").

## Mudanças de escopo (decisão do Claude, com base nos CSVs reais)

- **Importação do CSV entra no M1** (estava no M2): há 11 meses de extrato real em `data/private/`, e com eles a tela inicial já nasce com dados de verdade.
- **Fantasma entra no M1** (estava no M2): só depende de lançamentos, que a importação já fornece.
- **Score provisório = (Folga + Constância) × 2**, de 0 a 100, sempre marcado como provisório. Reserva e Rumo dependem de saldo inicial e metas (M3).
- **"Alimentação" passa a se chamar "Comida"** e entra a categoria **"Cartão"** (pagamento de fatura). Atualizar `docs/05-dados.md` no Task 4.

## O que os CSVs do Nubank mostraram

Formato (verificado nos 11 arquivos, 448 linhas): UTF-8, cabeçalho `Data,Valor,Identificador,Descrição`, data `dd/MM/yyyy`, valor com ponto decimal e sinal (negativo = saída), `Identificador` UUID único por lançamento, descrição `"<Tipo> - <contraparte> - ..."`. Os arquivos cobrem um mês cada; o de novembro é parcial (01 a 08).

Tipos encontrados e como cada um é tratado:

| Prefixo da descrição | `kind` | Categoria inicial |
|---|---|---|
| `Compra no débito` | expense | pelo dicionário de estabelecimentos |
| `Transferência enviada pelo Pix` | expense | Outros |
| `Débito em conta` | expense | Contas |
| `Pagamento de fatura` | expense | Cartão |
| `Transferência recebida pelo Pix`, `Transferência Recebida`, `Depósito Recebido por Boleto` | income | Renda |
| `Reembolso recebido pelo Pix`, `Estorno` | income | Reembolso |
| `Aplicação RDB`, `Resgate RDB` | internal | Reserva |
| `Valor adicionado na conta por cartão de crédito` | internal | Cartão |
| qualquer outro | pelo sinal | Outros, com `needsReview = true` |

`internal` nunca conta como renda nem gasto. As compras no crédito não aparecem no extrato da conta; elas entram como o pagamento de fatura (categoria Cartão).

## Global Constraints

- Só Android. Nenhum servidor, login ou serviço pago. Nenhuma chamada de rede neste plano.
- Dinheiro em centavos inteiros (`number` inteiro); nunca ponto flutuante em cálculo. Conversão só na borda (CSV, teclado, exibição).
- Datas como string local `YYYY-MM-DD`; nunca `new Date(string)` para dias (evita deslocamento de fuso).
- Dados reais só em `data/private/` (ignorada pelo git). Testes usam apenas `data/samples/`, com nomes e valores inventados.
- Ao importar, a descrição guardada é sanitizada: remove CPF mascarado (`•••.123.456-••` e similares), banco, agência e conta. Fica só `Tipo - contraparte`.
- Texto da interface mínimo, sem subtítulos explicativos. Rótulos fixos: `Hoje`, `Mês`, `Gasto`, `Ganho`, `Salvar`, `Decidir`, `Importar extrato`, `Exportar dados`. Fantasma: `R$ {x} à frente de {mês}` / `R$ {x} atrás de {mês}` (mês por extenso, minúsculo).
- Cor dominante `#2447F9`; texto `#10151C`; texto secundário `#4A5462`; fundos `#FFFFFF`, `#EEF1FF`; tom escuro do primário `#1A38D6`, claro `#4B68FF`, `#D9E0FF`. Outras cores só em categorias (tabela no Task 4).
- Fontes: Space Grotesk 700 (números e títulos), Inter 400/500/600 (resto), via `@expo-google-fonts`.
- Alvos de toque ≥ 44 dp; contraste de texto ≥ 4.5:1.

## Review Focus

1. **Importar arquivos sobrepostos** (o parcial de novembro e depois o completo, ou o mesmo arquivo duas vezes) não duplica nada — dedupe por `Identificador`. Teste no Task 6.
2. **Aplicação/Resgate RDB** não aparecem como renda nem gasto em nenhum total — teste no Task 7.
3. **Frase com vírgula, milhar e "R$"** (`"paguei R$ 1.200,50 de aluguel"`) vira 120050 centavos; frase sem número não cria lançamento — testes no Task 5.
4. **Fantasma no dia 31** quando o mês anterior tem 30 dias, e no primeiro mês sem histórico (sem fantasma) — testes no Task 7.
5. **Lançamento no dia 1º às 00:30** fica no mês certo — datas são strings locais; teste no Task 3 (`todayLocal`).

---

## File Structure

```
app/
  _layout.tsx                 fontes, provedor do banco, tema
  (tabs)/_layout.tsx          abas Início / Decisões / Tempo + botão +
  (tabs)/index.tsx            Início
  (tabs)/decisoes.tsx         vazio por ora ("Em breve")
  (tabs)/tempo.tsx            vazio por ora ("Em breve")
  adicionar.tsx               folha modal de adicionar
  ajustes.tsx                 importar / exportar
src/
  lib/money.ts                centavos <-> texto
  lib/dates.ts                datas locais
  theme/tokens.ts             cores, fontes, raios
  domain/types.ts             tipos compartilhados
  domain/categories.ts        categorias padrão e cores
  ingest/nubank.ts            CSV do Nubank -> ImportedRow[]
  parser/merchants.ts         dicionário estabelecimento -> categoria
  parser/phrase.ts            frase -> Draft
  db/db.ts                    interface Db
  db/schema.ts                SQL de criação e migração
  db/repo.ts                  consultas e gravações
  db/expo.ts                  adaptador expo-sqlite
  engine/month.ts             totais do mês e fantasma
  engine/score.ts             score provisório
  features/home/*.tsx         componentes da Início
  features/add/*.tsx          componentes de adicionar
  features/settings/*.ts      importar e exportar
tests/                        espelha src/
data/samples/nubank-exemplo.csv
```

---

### Task 1: Projeto Expo, tema e utilitários de dinheiro

**Files:**
- Create: projeto Expo na raiz (`package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `eas.json`), `src/lib/money.ts`, `src/theme/tokens.ts`
- Test: `tests/lib/money.test.ts`

**Interfaces:**
- Produces: `type Cents = number`; `parseBRL(text: string): Cents | null`; `formatBRL(c: Cents, opts?: { cents?: boolean }): string`; `tokens` (cores, fontes e raios do Global Constraints).

- [ ] **Step 1: Criar o projeto na raiz preservando `docs/`, `data/`, `README.md`, `.gitignore`**

Run: `npx create-expo-app@latest tmp-app --template tabs` e mova o conteúdo para a raiz (sem sobrescrever os arquivos listados; junte o `.gitignore`). Apague `tmp-app`. Remova telas de exemplo do template. Ative `"strict": true` no `tsconfig.json`. Em `app.json`: `name: "Paralelo"`, `slug: "paralelo"`, `android.package: "dev.paralelo.app"`, sem bloco `ios`.

- [ ] **Step 2: Instalar dependências**

Run: `npx expo install expo-sqlite expo-document-picker expo-file-system expo-sharing @expo-google-fonts/inter @expo-google-fonts/space-grotesk` e `npm i -D jest-expo jest @types/jest better-sqlite3 @types/better-sqlite3`. Adicione `"test": "jest"` ao `package.json`, com `preset: "jest-expo"` e `testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"]`.

- [ ] **Step 3: Escrever o teste que falha**

```ts
import { parseBRL, formatBRL } from '../../src/lib/money';
test('parseBRL', () => {
  expect(parseBRL('35')).toBe(3500);
  expect(parseBRL('35,90')).toBe(3590);
  expect(parseBRL('R$ 1.200,50')).toBe(120050);
  expect(parseBRL('-16.80')).toBe(-1680);   // formato do CSV
  expect(parseBRL('1.200')).toBe(120000);   // ponto como milhar
  expect(parseBRL('abc')).toBeNull();
});
test('formatBRL', () => {
  expect(formatBRL(41200)).toBe('R$ 412');
  expect(formatBRL(3590, { cents: true })).toBe('R$ 35,90');
  expect(formatBRL(160000)).toBe('R$ 1.600');
});
```

- [ ] **Step 4: Rodar e ver falhar** — Run: `npm test -- money` · Expected: FAIL, módulo não encontrado.

- [ ] **Step 5: Implementar `src/lib/money.ts` e `src/theme/tokens.ts`**

Regra do ponto: um único ponto seguido de exatamente 2 dígitos no fim é decimal (formato CSV); caso contrário, ponto é milhar e vírgula é decimal. Use aritmética de string, não `parseFloat * 100`.

- [ ] **Step 6: Rodar e ver passar** — Run: `npm test -- money` · Expected: PASS.

- [ ] **Step 7: Configurar `eas.json` com perfil `preview` (`android.buildType: "apk"`) e conferir que o app abre**

Run: `npx expo start` e abra no Expo Go no Android. Expected: o app abre com as três abas vazias.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "chore: scaffold Expo app, theme tokens and money utils"`

---

### Task 2: Tipos do domínio

**Files:**
- Create: `src/domain/types.ts`

**Interfaces:**
- Produces:
```ts
type Kind = 'expense' | 'income' | 'internal';
type Source = 'csv' | 'text' | 'form';
interface Category { id: string; name: string; color: string; tint: string; essential: boolean; kind: Kind }
interface Transaction {
  id: string; date: string; amount: Cents; // amount sempre > 0
  kind: Kind; categoryId: string; description: string; source: Source;
  externalId: string | null; needsReview: boolean; createdAt: string;
}
interface Draft { kind: Kind; amount: Cents; date: string; categoryId: string; description: string }
```

Sem teste próprio: os tipos são exercitados pelos testes dos Tasks 3 a 7. Vai no mesmo commit do Task 3.

---

### Task 3: Datas locais

**Files:**
- Create: `src/lib/dates.ts`
- Test: `tests/lib/dates.test.ts`

**Interfaces:**
- Produces: `todayLocal(now?: Date): string`; `fromBR(ddmmyyyy: string): string`; `addDays(d: string, n: number): string`; `monthOf(d: string): string` (`YYYY-MM`); `prevMonth(m: string): string`; `daysInMonth(m: string): number`; `dayOf(d: string): number`; `monthNamePt(m: string): string` (`"outubro"`).

- [ ] **Step 1: Teste que falha**

```ts
test('todayLocal usa o fuso do aparelho', () => {
  expect(todayLocal(new Date(2026, 10, 1, 0, 30))).toBe('2026-11-01');
});
test('conversões', () => {
  expect(fromBR('02/10/2026')).toBe('2026-10-02');
  expect(prevMonth('2026-01')).toBe('2025-12');
  expect(daysInMonth('2026-02')).toBe(28);
  expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  expect(monthNamePt('2026-10')).toBe('outubro');
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- dates` · FAIL.
- [ ] **Step 3: Implementar** com `getFullYear/getMonth/getDate` locais; nada de `toISOString`.
- [ ] **Step 4: Rodar e ver passar** — `npm test -- dates` · PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: domain types and local date utils"`

---

### Task 4: Categorias e dicionário de estabelecimentos

**Files:**
- Create: `src/domain/categories.ts`, `src/parser/merchants.ts`
- Modify: `docs/05-dados.md` (seção "Categorias iniciais")
- Test: `tests/parser/merchants.test.ts`

**Interfaces:**
- Produces: `DEFAULT_CATEGORIES: Category[]`; `categorizeMerchant(text: string, userRules: Record<string, string>): string` (devolve `categoryId`; regras do usuário vencem as padrão; sem match → `'outros'`); `normalizeKey(text: string): string` (minúsculas, sem acento, sem `MP *`, `PE*`, dígitos e espaços extras).

Categorias (id · nome · cor · tint · essencial · kind):

| id | nome | cor | tint | ess. | kind |
|---|---|---|---|---|---|
| comida | Comida | #FF8A3D | #FFF1E6 | sim | expense |
| transporte | Transporte | #19C78A | #E3F8EF | sim | expense |
| contas | Contas | #FFC53D | #FFF7DE | sim | expense |
| moradia | Moradia | #8C6A4F | #F3ECE6 | sim | expense |
| saude | Saúde | #FF6B5E | #FFE9E7 | sim | expense |
| educacao | Educação | #00B8D9 | #E0F7FB | não | expense |
| lazer | Lazer | #FF5DA2 | #FFE8F2 | não | expense |
| compras | Compras | #A98BFF | #F1ECFF | não | expense |
| presentes | Presentes | #E86BD8 | #FCE9F9 | não | expense |
| cartao | Cartão | #10151C | #E9EBEE | não | expense |
| outros | Outros | #8E99A8 | #EFF1F4 | não | expense |
| renda | Renda | #2447F9 | #EEF1FF | não | income |
| reembolso | Reembolso | #4B68FF | #EEF1FF | não | income |
| reserva | Reserva | #1A38D6 | #EEF1FF | não | internal |

Dicionário padrão por palavra-chave (sobre `normalizeKey`): `padaria, acai, lanche, lamen, churrasco, coffee, cafe, restaurante, milho, bar, ifood, mercado` → comida; `autopass, metro, sptrans, uber, 99, tmob` → transporte; `usp, escola, livraria, letras, materiais` → educação; `shopping, celular, magazine, americanas` → compras; `farmacia, drogaria` → saúde.

- [ ] **Step 1: Teste que falha**

```ts
test('estabelecimentos', () => {
  expect(categorizeMerchant('PADARIA MORADA', {})).toBe('comida');
  expect(categorizeMerchant('AUTOPASS S.A*ATM TMOB', {})).toBe('transporte');
  expect(categorizeMerchant('MP *DESCONHECIDO', {})).toBe('outros');
  expect(categorizeMerchant('PADARIA MORADA', { [normalizeKey('PADARIA MORADA')]: 'lazer' })).toBe('lazer');
});
test('normalizeKey', () => {
  expect(normalizeKey('MP *Açaí  Central 12')).toBe('acai central');
});
```

- [ ] **Step 2: Rodar e ver falhar** · **Step 3: Implementar** · **Step 4: Rodar e ver passar** (`npm test -- merchants`).
- [ ] **Step 5: Atualizar `docs/05-dados.md`** com a tabela acima.
- [ ] **Step 6: Commit** — `git commit -m "feat: default categories and merchant dictionary"`

---

### Task 5: Interpretador de frases

**Files:**
- Create: `src/parser/phrase.ts`
- Test: `tests/parser/phrase.test.ts`

**Interfaces:**
- Consumes: `parseBRL`, `todayLocal`, `addDays`, `categorizeMerchant`.
- Produces: `parsePhrase(text: string, today: string, userRules: Record<string,string>): Draft | null` (null quando não há valor).

Regras: valor = primeiro número reconhecido por `parseBRL`; ganho se contém `recebi|ganhei|caiu|entrou|salário|salario|freela`, senão gasto; data: `hoje` (padrão), `ontem`, `anteontem`, `dia N` (mês atual; se N > hoje, mês anterior); categoria de gasto pelo resto da frase via `categorizeMerchant` e ainda `almoço|janta|lanche` → comida, `internet|luz|celular|aluguel` → contas/moradia (`aluguel` → moradia); ganho → `renda`; `description` = frase original sem o valor, aparada.

- [ ] **Step 1: Teste que falha**

```ts
const T = '2026-11-09';
test('gasto simples', () => {
  expect(parsePhrase('gastei 35 no almoço', T, {})).toEqual(
    { kind: 'expense', amount: 3500, date: T, categoryId: 'comida', description: 'gastei no almoço' });
});
test('milhar e R$', () => {
  expect(parsePhrase('paguei R$ 1.200,50 de aluguel', T, {})?.amount).toBe(120050);
  expect(parsePhrase('paguei R$ 1.200,50 de aluguel', T, {})?.categoryId).toBe('moradia');
});
test('ganho e data', () => {
  const d = parsePhrase('recebi 300 de freela ontem', T, {});
  expect(d?.kind).toBe('income'); expect(d?.date).toBe('2026-11-08'); expect(d?.categoryId).toBe('renda');
  expect(parsePhrase('gastei 20 dia 30', T, {})?.date).toBe('2026-10-30');
});
test('sem valor', () => { expect(parsePhrase('almoço', T, {})).toBeNull(); });
```

- [ ] **Step 2–4:** falhar, implementar, passar (`npm test -- phrase`).
- [ ] **Step 5: Commit** — `git commit -m "feat: rule-based phrase parser"`

---

### Task 6: Leitor do CSV do Nubank

**Files:**
- Create: `src/ingest/nubank.ts`, `data/samples/nubank-exemplo.csv`
- Test: `tests/ingest/nubank.test.ts`

**Interfaces:**
- Consumes: `parseBRL`, `fromBR`, `categorizeMerchant`.
- Produces: `parseNubankCsv(text: string, userRules: Record<string,string>): ImportedRow[]`, onde `ImportedRow = Omit<Transaction, 'id' | 'createdAt'>` com `source: 'csv'` e `externalId` = `Identificador`; lança `NubankFormatError` se o cabeçalho não for `Data,Valor,Identificador,Descrição`. `sanitizeDescription(desc: string): string`.

`data/samples/nubank-exemplo.csv`: 12 linhas fictícias cobrindo todos os tipos da tabela "O que os CSVs mostraram", com nomes inventados (ex.: `FULANO DE TAL`), CPF mascarado inventado, uma linha com BOM no início do arquivo e uma descrição com vírgula entre aspas.

- [ ] **Step 1: Teste que falha**

```ts
const rows = parseNubankCsv(readFileSync('data/samples/nubank-exemplo.csv','utf8'), {});
test('converte e classifica', () => {
  const pix = rows.find(r => r.description.startsWith('Transferência enviada pelo Pix'))!;
  expect(pix).toMatchObject({ kind: 'expense', categoryId: 'outros', amount: 1680, date: '2026-10-02' });
  expect(pix.description).toBe('Transferência enviada pelo Pix - FULANO DE TAL');
  expect(rows.find(r => r.description.startsWith('Aplicação RDB'))!.kind).toBe('internal');
  expect(rows.find(r => r.description.startsWith('Resgate RDB'))!.kind).toBe('internal');
  expect(rows.find(r => r.description.startsWith('Pagamento de fatura'))!.categoryId).toBe('cartao');
  expect(rows.find(r => r.description.startsWith('Estorno'))!.categoryId).toBe('reembolso');
  expect(rows.every(r => r.amount > 0)).toBe(true);
});
test('tipo desconhecido vai para revisão', () => {
  expect(rows.find(r => r.description.startsWith('Tipo Inventado'))!.needsReview).toBe(true);
});
test('cabeçalho errado', () => {
  expect(() => parseNubankCsv('a,b\n1,2', {})).toThrow(NubankFormatError);
});
```

- [ ] **Step 2–4:** falhar, implementar (parser CSV próprio com suporte a aspas; sem dependência), passar (`npm test -- nubank`).
- [ ] **Step 5: Conferência com os dados reais (local, nada é commitado)**

Run: `npx tsx -e "import {parseNubankCsv} from './src/ingest/nubank'; import {readdirSync,readFileSync} from 'fs'; let n=0,r=0; for (const f of readdirSync('data/private')) { const x=parseNubankCsv(readFileSync('data/private/'+f,'utf8'),{}); n+=x.length; r+=x.filter(y=>y.needsReview).length } console.log(n,r)"`
Expected: `448 0`.

- [ ] **Step 6: Commit** — `git add src/ingest data/samples tests/ingest && git commit -m "feat: Nubank CSV importer"` (confira com `git status` que nada de `data/private` entrou).

---

### Task 7: Banco, repositório e engine do mês

**Files:**
- Create: `src/db/db.ts`, `src/db/schema.ts`, `src/db/repo.ts`, `src/db/expo.ts`, `src/engine/month.ts`, `src/engine/score.ts`, `tests/helpers/memoryDb.ts`
- Test: `tests/db/repo.test.ts`, `tests/engine/month.test.ts`, `tests/engine/score.test.ts`

**Interfaces:**
- Consumes: tipos do Task 2, `ImportedRow` do Task 6, utilitários de data.
- Produces:
```ts
interface Db { run(sql: string, params?: unknown[]): Promise<void>; all<T>(sql: string, params?: unknown[]): Promise<T[]> }
migrate(db: Db): Promise<void>
insertTransaction(db: Db, t: Draft & { source: Source }): Promise<Transaction>
importRows(db: Db, rows: ImportedRow[]): Promise<{ added: number; skipped: number }>
listTransactions(db: Db, from: string, to: string): Promise<Transaction[]>
getUserRules(db: Db): Promise<Record<string,string>>; setUserRule(db: Db, key: string, categoryId: string): Promise<void>
exportAll(db: Db): Promise<{ version: 1; transactions: Transaction[]; rules: Record<string,string> }>
// engine (puro)
monthSummary(txs: Transaction[], month: string, today: string): MonthSummary
interface MonthSummary { month: string; income: Cents; spent: Cents; byCategory: { categoryId: string; amount: Cents }[]; ghost: { month: string; spentSameDay: Cents; diff: Cents } | null }
provisionalScore(txs: Transaction[], today: string): { total: number; folga: number; constancia: number; provisional: true }
```

Tabelas: `transactions` (colunas do tipo, `externalId` UNIQUE quando não nulo), `user_rules(key PRIMARY KEY, categoryId)`, `meta(key, value)` com `schema_version`. `memoryDb` adapta `better-sqlite3` em memória à interface `Db`; `expo.ts` adapta `expo-sqlite` (`openDatabaseAsync('paralelo.db')`).

Engine: `spent` soma só `expense`; `income` só `income`; `internal` fica fora. `byCategory` ordenado do maior para o menor. Fantasma: gasto do mês anterior do dia 1 até `min(dia de hoje, dias do mês anterior)`; `diff = ghost − spent` (positivo = à frente); `null` se não há lançamento algum no mês anterior. Score: Folga e Constância pelas fórmulas de `docs/03-motor-financeiro.md` sobre os últimos 30 dias; Constância "registros" conta um dia como coberto se tiver qualquer lançamento (`csv` cobre o dia); `total = round((folga + constancia) * 2)`.

- [ ] **Step 1: Testes que falham**

```ts
// repo.test.ts
test('importar duas vezes não duplica', async () => {
  const db = await memoryDb(); await migrate(db);
  const rows = parseNubankCsv(readFileSync('data/samples/nubank-exemplo.csv','utf8'), {});
  expect((await importRows(db, rows)).added).toBe(rows.length);
  expect(await importRows(db, rows)).toEqual({ added: 0, skipped: rows.length });
});
// month.test.ts  (tx(date, amount, kind, cat) é um helper do teste)
test('internal fora dos totais', () => {
  const s = monthSummary([tx('2026-11-02',50000,'internal','reserva'), tx('2026-11-03',3500,'expense','comida')], '2026-11', '2026-11-09');
  expect(s.spent).toBe(3500); expect(s.income).toBe(0);
});
test('fantasma no dia 31 com mês anterior de 30 dias', () => {
  const s = monthSummary([tx('2026-11-30',1000,'expense','comida'), tx('2026-12-31',500,'expense','comida')], '2026-12', '2026-12-31');
  expect(s.ghost).toEqual({ month: '2026-11', spentSameDay: 1000, diff: 500 });
});
test('sem mês anterior não há fantasma', () => {
  expect(monthSummary([tx('2026-11-03',3500,'expense','comida')], '2026-11', '2026-11-09').ghost).toBeNull();
});
// score.test.ts
test('folga máxima e registros completos', () => {
  // renda 1000 e gasto 700 nos últimos 30 dias, um lançamento por dia nos últimos 14
  expect(provisionalScore(fixture30Dias(), '2026-11-09').folga).toBe(30);
});
test('renda zero', () => {
  expect(provisionalScore([tx('2026-11-08',100,'expense','comida')], '2026-11-09').folga).toBe(0);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test -- repo month score` · FAIL.
- [ ] **Step 3: Implementar `db/*`** (schema, migração idempotente, `INSERT OR IGNORE` por `externalId`).
- [ ] **Step 4: Implementar `engine/month.ts` e `engine/score.ts`.**
- [ ] **Step 5: Rodar e ver passar** — `npm test` · PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: sqlite repo, month summary, ghost and provisional score"`

---

### Task 8: Tela Início

**Files:**
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/decisoes.tsx`, `app/(tabs)/tempo.tsx`, `src/features/home/ScoreHeader.tsx`, `src/features/home/MonthBar.tsx`, `src/features/home/CategoryGrid.tsx`, `src/features/home/useHome.ts`
- Test: `tests/features/home/MonthBar.test.tsx`

**Interfaces:**
- Consumes: `migrate`, `listTransactions`, `monthSummary`, `provisionalScore`, `DEFAULT_CATEGORIES`, `tokens`, `formatBRL`, `monthNamePt`.
- Produces: `useHome(): { score; summary; reload(): void }`; contexto `DbProvider` em `app/_layout.tsx` com `useDb(): Db`.

Layout (referência visual: artboard "1 · Início" do canvas de design): topo azul `#2447F9` com mês, selo `provisório` no lugar do "+3" enquanto não houver snapshot anterior, número do score em Space Grotesk 156, 4 barras finas (Reserva e Rumo cinza-azuladas `#4B68FF` vazias neste marco); painel branco arredondado com `Mês` e total, barra segmentada por categoria com o traço tracejado do fantasma, a linha do fantasma, e a grade das 4 maiores categorias com tint e valor. Sem a linha "Hoje" (Pode gastar hoje é M2). Abas Decisões e Tempo mostram só `Em breve`. Botão + circular abre `adicionar`. Estado vazio (sem lançamentos): número `—` e um único botão `Importar extrato` que leva a `ajustes`.

- [ ] **Step 1: Teste que falha** (`@testing-library/react-native`, instalar como dev)

```tsx
test('mostra a linha do fantasma', () => {
  render(<MonthBar summary={{ month:'2026-11', income:0, spent:41200,
    byCategory:[{categoryId:'comida',amount:18000}], ghost:{month:'2026-10',spentSameDay:46800,diff:5600} }} />);
  expect(screen.getByText('R$ 56 à frente de outubro')).toBeTruthy();
});
test('sem fantasma não mostra a linha', () => {
  render(<MonthBar summary={{ month:'2026-11', income:0, spent:100, byCategory:[], ghost:null }} />);
  expect(screen.queryByText(/de outubro/)).toBeNull();
});
```

- [ ] **Step 2–4:** falhar, implementar, passar (`npm test -- MonthBar`).
- [ ] **Step 5: Ver no aparelho** — `npx expo start`, Expo Go no Android. Expected: Início com estado vazio e botão `Importar extrato`.
- [ ] **Step 6: Commit** — `git commit -m "feat: home screen"`

---

### Task 9: Adicionar por frase ou teclado

**Files:**
- Create: `app/adicionar.tsx`, `src/features/add/AmountDisplay.tsx`, `src/features/add/CategoryChips.tsx`, `src/features/add/useAdd.ts`
- Test: `tests/features/add/useAdd.test.ts`

**Interfaces:**
- Consumes: `parsePhrase`, `insertTransaction`, `setUserRule`, `normalizeKey`, `getUserRules`.
- Produces: `useAddCore(db: Db, today: string)` (lógica pura, sem React) com `{ draft: Draft | null, setText(t), setKind(k), setCategory(id), setAmount(c), save(): Promise<void>, canSave: boolean }`, e `useAdd(db, today)`, o envoltório React com a mesma forma. Nos testes, `fakeDb` é um `Db` cujos métodos não fazem nada.

Referência visual: artboard "2 · Adicionar". Folha azul: alternador `Gasto`/`Ganho`, valor grande, campo de texto branco (rótulo só para acessibilidade), chips de categoria (selecionado = branco), chip de data, botão `Salvar`. Digitar atualiza o rascunho a cada tecla via `parsePhrase`; tocar no valor abre o teclado numérico. Se o usuário trocar a categoria sugerida, `save` grava a regra `normalizeKey(descrição) → categoria`. Salvar volta para a Início, que recarrega.

- [ ] **Step 1: Teste que falha**

```ts
test('trocar categoria ensina a regra', async () => {
  const db = await memoryDb(); await migrate(db);
  const h = useAddCore(db, '2026-11-09');           // núcleo sem React, usado pelo hook
  h.setText('gastei 12 no rei do milho'); h.setCategory('lazer'); await h.save();
  expect(Object.values(await getUserRules(db))).toContain('lazer');
});
test('sem valor não salva', () => {
  const h = useAddCore(fakeDb, '2026-11-09'); h.setText('almoço'); expect(h.canSave).toBe(false);
});
```

- [ ] **Step 2–4:** falhar, implementar `useAddCore` (lógica pura) e `useAdd` (envoltório React), passar.
- [ ] **Step 5: Ver no aparelho** — adicionar `gastei 35 no almoço`. Expected: Comida aumenta R$ 35 na Início.
- [ ] **Step 6: Commit** — `git commit -m "feat: add sheet with phrase and keypad input"`

---

### Task 10: Importar extrato e exportar dados

**Files:**
- Create: `app/ajustes.tsx`, `src/features/settings/importCsv.ts`, `src/features/settings/exportData.ts`
- Modify: `app/(tabs)/_layout.tsx` (ícone de engrenagem no cabeçalho da Início → `ajustes`)
- Test: `tests/features/settings/exportData.test.ts`

**Interfaces:**
- Consumes: `parseNubankCsv`, `importRows`, `getUserRules`, `exportAll`.
- Produces: `importCsvFiles(db: Db, texts: string[]): Promise<{ added: number; skipped: number }>`; `toCsv(txs: Transaction[]): string` (cabeçalho `data,valor,tipo,categoria,descricao`, valor com vírgula decimal).

Tela: dois botões, `Importar extrato` (`DocumentPicker` com `multiple: true`, tipo `text/*`) e `Exportar dados` (grava `paralelo-backup.json` e `paralelo-lancamentos.csv` no cache e abre o compartilhar do Android). Resultado da importação numa linha: `{added} novos · {skipped} já existiam`. Arquivo com cabeçalho errado: `Esse arquivo não é um extrato do Nubank.`

- [ ] **Step 1: Teste que falha**

```ts
test('toCsv', () => {
  expect(toCsv([txFull({ date:'2026-11-03', amount:3590, kind:'expense', categoryId:'comida', description:'almoço' })]))
    .toBe('data,valor,tipo,categoria,descricao\n2026-11-03,"35,90",gasto,Comida,almoço\n');
});
```

- [ ] **Step 2–4:** falhar, implementar, passar.
- [ ] **Step 5: Ver no aparelho com dados reais** — copie os CSVs de `data/private/` para o celular, importe todos. Expected: `448 novos · 0 já existiam`; importar de novo: `0 novos · 448 já existiam`; Início mostra novembro com o fantasma de outubro.
- [ ] **Step 6: Commit** — `git commit -m "feat: import Nubank statements and export data"`

---

### Task 11: APK e documentação de uso

**Files:**
- Modify: `README.md` (seção "Rodar e instalar"), `docs/06-roadmap.md` (marcar o que saiu do M2 para o M1)

- [ ] **Step 1: Gerar o APK**

Run: `npx eas-cli build -p android --profile preview` (exige conta Expo gratuita; o login é feito pelo dono no terminal).
Expected: link para baixar o `.apk`.

- [ ] **Step 2: Instalar no Android e repetir a conferência do Task 10, Step 5, no app instalado (sem Expo Go).**

- [ ] **Step 3: Documentar** no README: `npm install`, `npx expo start`, `npm test`, como gerar o APK e como exportar o extrato do Nubank (link para `docs/07-nubank.md`).

- [ ] **Step 4: Rodar a suíte inteira** — `npm test` · Expected: todos PASS.

- [ ] **Step 5: Commit** — `git commit -m "docs: build and install instructions"`
