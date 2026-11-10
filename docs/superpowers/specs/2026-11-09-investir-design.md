# Investir: onde colocar o dinheiro que sobra (design)

Data: 2026-11-09. Estado: aguardando aprovação.

## Intenção

Quando sobra dinheiro no fim do mês, o dono do app quer abrir o Paralelo e ver **onde vale mais a pena colocá-lo**, com dados públicos atualizados do Brasil e do exterior, e entender a conta por trás. Hoje o app só sugere destinos genéricos (reserva, meta, renda fixa) sem taxa real nenhuma. Este recurso troca isso por números vivos.

## Objetivos

- Aba nova **Investir** com a recomendação do mês, um comparativo e o detalhe de cada opção.
- Recomendação **personalizada**: usa o valor que o app calcula como guardável, a reserva atual, as metas e o **perfil que o dono escolhe** (conservador, moderado ou arrojado).
- Cobrir: renda fixa BR (poupança, Tesouro Selic/IPCA+/prefixado, CDB, LCI/LCA), ações e FIIs da B3, ações e ETFs internacionais, cripto.
- Renda fixa comparada por **retorno líquido estimado** (após IR e IOF) no prazo escolhido.
- Renda variável mostrada como **faixa de alocação** mais **indicadores públicos** (dividend yield, P/L, variação em 12 meses). Sem "compre X".
- Tela **"ver a conta"**: taxas, datas, IR/IOF e hipóteses usadas em cada número.
- Dados 100% de fontes gratuitas e sem chave paga. **Cache local**: sem internet, mostra o último dado com a data.
- Integração com **Decisões**: um ganho extra vira uma decisão de investimento usando o mesmo motor.

## Não objetivos

- Não executa ordens, não conecta corretora, não move dinheiro.
- Não promete retorno futuro nem dá previsão de preço.
- Não é recomendação regulada (CVM). Texto sempre educativo.
- Sem servidor próprio e sem conta de usuário nova.
- Sem Open Finance, sem leitura da carteira real do usuário nesta versão.

## Anti-objetivos (seria falha mesmo funcionando)

- Parecer ordem de compra de um papel específico.
- Recomendar risco a quem não tem reserva sem avisar com clareza.
- Mostrar número sem dizer de onde veio nem a data.
- Quebrar o app quando uma fonte cair: cada fonte falha sozinha.

## Decisões do dono

- Priorização: **o dono escolhe o perfil** (conservador, moderado, arrojado).
- Renda variável: faixa de alocação mais indicadores, sem ranking de compra.
- Onde aparece: **nova aba Investir e também em Decisões**.
- Aviso: educativo, premissas visíveis, aviso curto e fixo.
- Fontes: APIs públicas oficiais e abertas. Offline: cache do último dado.

## Escolhas minhas (marcadas como minhas, para você conferir)

- **Reserva é piso de segurança em todo perfil.** Reserva abaixo de 6 meses faz o app sugerir liquidez diária primeiro e mostrar um aviso, mas não bloqueia: o dono pode seguir.
- **Valor a investir** = o "pode guardar" que o motor já calcula (renda prevista menos fixas, metas e gasto variável), editável na tela.
- **Prazos** para renda fixa: 6, 12 e 24 meses (padrão 12).
- **Fontes**: Banco Central SGS (Selic 432, CDI 12, IPCA 433, poupança 195, PTAX), Tesouro Transparente (taxas do Tesouro Direto), brapi.dev (B3), Yahoo Finance/Stooq (exterior e cripto). Podem ser trocadas se alguma mudar de forma ou sair do ar.
- **Taxas de CDB/LCI/LCA** não têm API pública. Usa-se **múltiplos do CDI típicos** como hipótese editável (ex.: CDB 100%, LCI/LCA 90%), sempre rotulados "hipótese".
- **Alocação por perfil** (ponto de partida, calibrável):

| Perfil | Renda fixa | FIIs | Ações BR | Exterior | Cripto |
|---|---|---|---|---|---|
| Conservador | 90% | 5% | 5% | 0% | 0% |
| Moderado | 60% | 15% | 15% | 8% | 2% |
| Arrojado | 30% | 20% | 25% | 20% | 5% |

  Aplicados só ao que sobra depois da reserva e das metas atrasadas. Mostrados como faixa (±5 pontos), não como valor exato.
- **Fase 1 / Fase 2.** A tela Decisões do app ainda é "Em breve" (marco M4). A **Fase 1** entrega a aba Investir completa e o motor reutilizável. A **Fase 2** liga o motor às Decisões quando o diário de decisões existir. O desenho do motor já prevê a Fase 2.

## Como funciona

### Motor de recomendação (puro, testável, sem rede)

Entrada: `valor`, `perfil`, `prazo`, `reservaMeses`, `metasAtrasadas`, `taxas` (snapshot de dados) e `data`.
Saída: lista ordenada de destinos com valor sugerido, retorno líquido estimado (renda fixa) ou indicadores (variável), motivo em texto e avisos.

Ordem de decisão (herda `docs/03-motor-financeiro.md`):

1. Dívida com juros → quitar (se o app souber).
2. Reserva abaixo de 3 meses → liquidez diária (Tesouro Selic, CDB liquidez diária, poupança só se for a melhor líquida).
3. Meta com prazo < 12 meses atrasada → a meta.
4. Reserva entre 3 e 6 meses → dividir entre reserva e renda fixa.
5. Reserva completa → distribuir pelo mix do perfil.

### Renda fixa: retorno líquido

Para cada produto e o prazo escolhido: rentabilidade bruta pela taxa de referência, menos IR regressivo (22,5% até 180 dias, 20% até 360, 17,5% até 720, 15% acima), menos IOF se aplicável (≤ 30 dias), menos taxa de custódia B3 do Tesouro quando houver. LCI/LCA e poupança isentas de IR para pessoa física. O resultado é comparado em **% ao ano líquido** e em **R$ no prazo**. Todos os números são **estimativas**, sem inflação futura (IPCA+ usa a taxa contratada mais IPCA recente como hipótese rotulada).

### Renda variável: faixa mais indicadores

Para B3, exterior e cripto: classe, faixa de % do aporte (do perfil) e lista curta de ativos com indicadores públicos. Quais ativos entram na lista: um conjunto curado e editável de grandes e líquidos (ex.: IBOV/IVVB11/BOVA11, alguns FIIs de tijolo e papel, S&P500 ETF, BTC, ETH), para evitar "ranking de papel". Mostrar cotação em reais (câmbio PTAX) e a data.

### Dados e cache

- Camada `rates` com um adaptador por fonte. Cada um devolve `{valor, data, fonte}` ou erro tipado.
- Falha de uma fonte afeta só os produtos que dependem dela, que ficam marcados "sem dado".
- Cache em SQLite (tabela `reference_rate` já prevista em `docs/05-dados.md`, estendida com cotações). Atualiza ao abrir a aba se o dado tem mais de 6 h, ou por botão. Offline mostra o último dado com a data e o selo "desatualizado".
- Nenhuma chave paga. Se uma fonte exigir token no futuro, vira configuração opcional do usuário.

### Telas

- **Investir** (aba nova): topo com valor a investir editável e seletor de perfil e prazo. Card "Sugestão do mês" com o mix e o motivo. Lista de renda fixa ordenada por líquido. Seção de renda variável por classe com faixa e indicadores. Rodapé com data dos dados e o aviso curto.
- **Ver a conta**: abre de qualquer linha. Mostra taxa usada, data e fonte, IR/IOF aplicados, hipótese e a fórmula.
- **Decisões** (Fase 2): ao destinar um ganho extra, as opções vêm do mesmo motor.

### Aviso

Texto curto fixo na aba: "Simulação educativa com dados públicos. Não é recomendação de investimento. Rentabilidade passada não garante futura." Sem termo de aceite.

## Restrições

- Expo / React Native 0.88, TypeScript, SQLite local; dinheiro em centavos inteiros (regra do app).
- Motor em `src/engine`, sem importar React nem rede, com testes Jest como o resto.
- Adaptadores de rede em camada separada com `fetch` mockável nos testes.
- Mesmo tema visual (`tokens`) e mesma navegação por abas (`TabBar`).
- App em português do Brasil.
- Build continua gerando APK pelo CI atual.

## Detalhes fechados após a revisão (minhas escolhas, marcadas como minhas)

- **Meta de reserva** = 6 × gasto essencial mensal médio, como já calcula `essentialMonthlyAverage` em `src/engine/composite.ts`. `reservaMeses` = saldo da reserva digitado em Metas ÷ esse gasto. Sem saldo digitado, o app usa o estimado da caixinha (regra de `docs/03-motor-financeiro.md`). Renda irregular não muda a regra: ela só usa gasto, não renda.
- **Ordem e divisão do valor:** (1) a lacuna da reserva é preenchida primeiro até 6 meses; entre 3 e 6 meses, 50% do valor vai para a lacuna e 50% segue adiante; abaixo de 3 meses, 100%. (2) Metas atrasadas com prazo < 12 meses recebem a parcela mensal planejada que falta, descontada **depois** da reserva. (3) O que sobra segue o mix do perfil.
- **Dívida com juros (passo 1):** o app não tem esse dado hoje. Na fase 1 o passo fica **de fora** (não implementado); o motor deixa o ponto de extensão.
- **Tesouro:** cada produto usa **um título de referência** (Selic: o vigente; prefixado e IPCA+: o vencimento mais próximo do prazo escolhido) com a taxa de compra publicada no Tesouro Transparente (arquivo CSV, baixado e guardado em cache). O cálculo é **carregar até o prazo escolhido** com a taxa contratada, sem simular preço de venda. Isso fica escrito em "ver a conta" como hipótese.
- **IPCA+:** inflação = **acumulado em 12 meses** (SGS 433) mantido constante, rotulado "hipótese". **Poupança:** 70% da Selic + TR quando a Selic ≤ 8,5% a.a., senão 0,5% a.m. + TR (regra vigente), usando SGS para Selic e TR.
- **Cache:** uma linha por série ou cotação com `valor`, `data` e `buscadoEm` (último valor, sem histórico). Defasagem de 6 h avaliada **por fonte**. Migração: nova tabela criada por `CREATE TABLE IF NOT EXISTS`, sem tocar nas atuais.
- **Zero configuração:** a tela funciona sem token. Se brapi limitar ou falhar, o ativo mostra "sem dado" e o Yahoo/Stooq tenta no lugar. Token opcional fica **fora da fase 1**.
- **Indicadores faltantes** aparecem como "—". Não é critério de pronto ter todos para todo ativo; cripto e ETF não têm P/L e isso é esperado.
- **Hipóteses editáveis:** os múltiplos do CDI (CDB, LCI/LCA) e a taxa de custódia B3 ficam num cartão "Hipóteses" na própria aba, **gravados no aparelho**. Tabela de alocação por perfil e lista de ativos ficam como constantes no código na fase 1.
- **Arredondamento:** valores em centavos inteiros; a diferença de centavos vai para a maior classe, de modo que a soma bata com o total. Classes com 0% aparecem como "não sugerido neste perfil".
- **Valor a investir ≤ 0:** a aba mostra estado vazio ("Sem sobra este mês") mas deixa digitar um valor manualmente.

## Deixado para o construtor

- Estrutura exata de pastas e nomes dos módulos.
- Formato do JSON de cada API e tratamento de falhas e limites de taxa.
- Esquema SQL exato do cache.
- Visual detalhado dos cards, dentro do tema atual.
- Lista curada final de ativos, dentro do critério "grandes e líquidos".
- Calibrar a tabela de alocação com o dono depois de usar.

## Como saberemos que está pronto (Fase 1)

- Com internet, a aba mostra taxas reais com data de hoje; sem internet, mostra o cache marcado como desatualizado.
- Mudar perfil, prazo ou valor reordena e recalcula na hora.
- Cada número abre "ver a conta" com fonte, data e fórmula.
- Reserva abaixo de 6 meses gera o aviso e sugere liquidez diária primeiro.
- Uma fonte fora do ar não derruba a tela.
- Testes do motor cobrem IR regressivo, IOF, reserva como piso e cada perfil.
