# 3. Motor financeiro

Código em `src/engine/`, em TypeScript, rodando no aparelho. Funções puras: recebem dados, devolvem números e a explicação estruturada da conta. Sem IA, sem acesso à rede, 100% cobertas por testes.

## Fantasma (você de ontem)

`fantasma = gasto acumulado do mês anterior até o mesmo dia do mês`. A tela inicial mostra a diferença: "R$ 56 à frente" ou "R$ 40 atrás". Em meses de tamanhos diferentes, usa-se o último dia disponível. Sem mês anterior, a marca não aparece.

Valores sempre em **centavos inteiros**. Os limites abaixo são pontos de partida e ficam num único arquivo de configuração.

## Score

`score = Folga + Reserva + Constância + Rumo` (0 a 100). Cada pilar é linear entre um piso e um teto.

| Pilar | Medida | 0 pontos | Máximo |
|---|---|---|---|
| Folga (30) | `(renda − gastos) / renda` nos últimos 30 dias | 0% ou menos | 30% ou mais |
| Reserva (30) | `reserva / gasto essencial mensal médio` | 0 meses | 6 meses |
| Constância (20) | metade registros, metade estabilidade (abaixo) | | |
| Rumo (20) | `guardado / planejado até hoje`, média das metas | 0% | 100% |

**Constância**
- Registros (10): dias dos últimos 14 com lançamento ou com "nada hoje" confirmado. Um CSV importado cobre os dias do período.
- Estabilidade (10): gasto variável do mês, projetado até o fim, contra a mediana dos 3 meses anteriores. Máximo se até 10% acima; zero se 50% acima.

**Casos de borda**
- Sem meta cadastrada: Rumo vale 10 (neutro) e a próxima ação sugere criar uma.
- Menos de 30 dias de dados: o score aparece como "provisório" e usa o período disponível.
- Renda zero no período: Folga vale 0 e o detalhe explica o motivo.

**Snapshot**: o score é gravado uma vez por dia com os pilares e os dados de entrada. É isso que alimenta o "ver a conta", a variação semanal e a linha do tempo.

**Próxima ação**: o motor recalcula o score para um conjunto fixo de ações hipotéticas (guardar X, registrar os dias em falta, criar meta, cortar X numa categoria) e devolve a de maior ganho.

## Pode gastar hoje

```
disponível = renda prevista do mês
           − contas fixas ainda não pagas
           − valor a guardar no mês (metas)
           − gasto variável já feito
pode gastar hoje = max(0, disponível / dias restantes no mês)
```

A renda prevista é a renda recorrente da era atual mais os ganhos extras já recebidos e não destinados a uma decisão.

## Gasto fora do padrão

Para cada categoria: compara o acumulado no mês com a mediana do acumulado **até o mesmo dia** nos 3 meses anteriores. Avisa quando passa de 130% e a diferença é maior que um valor mínimo (para não avisar por R$ 5). Com menos de 2 meses de histórico, não avisa.

## Decisões

**Ordem das opções** (regras, da mais prioritária para a menos):

1. Dívida com juros → quitar.
2. Reserva abaixo de 3 meses → reserva de liquidez diária.
3. Meta com prazo menor que 12 meses atrasada → a meta.
4. Reserva entre 3 e 6 meses → dividir entre reserva e renda fixa.
5. Reserva completa → renda fixa de prazo maior.

"Gastar" está sempre disponível, sem julgamento.

**Revisita**: cada opção tem uma taxa de referência (por exemplo, % do CDI). O valor atual de cada alternativa é o valor aplicado corrigido pela série diária do Banco Central (API pública SGS) entre a data da decisão e hoje. O app deixa claro que é uma estimativa por taxa de referência, bruta de impostos, e não o saldo real da aplicação.

## Investir

A aba Investir cruza o que sobra no mês com taxas públicas. Tudo é estimativa educativa.

**Plano em cascata** (`src/engine/invest/allocation.ts`), sobre o valor a investir (o que sobra no mês, editável):

1. Reserva abaixo de 3 meses: 100% vai para a reserva, até a lacuna de 6 meses de gasto essencial. Entre 3 e 6 meses: 50%.
2. Metas atrasadas com prazo menor que 12 meses recebem a parcela mensal que falta.
3. O resto segue o mix do perfil (conservador 90/5/5/0/0, moderado 60/15/15/8/2, arrojado 30/20/25/20/5 em renda fixa/FIIs/ações BR/exterior/cripto), mostrado como faixa de ±5 pontos.

Reserva desconhecida não bloqueia: o app avisa e segue. A regra de dívida com juros ainda não existe, porque o app não guarda dívidas.

**Renda fixa líquida** (`fixedIncome.ts`): ganho bruto pela taxa de referência no prazo (6, 12 ou 24 meses; 365 dias por ano), menos IR regressivo (22,5%, 20%, 17,5%, 15%), IOF (só abaixo de 30 dias), e custódia B3 de 0,2% a.a. nos títulos do Tesouro. Poupança e LCI/LCA não pagam IR. CDB (100% do CDI) e LCI/LCA (90% do CDI) são hipóteses editáveis, porque não há API pública. O Tesouro carrega o título até o prazo; IPCA+ usa o IPCA de 12 meses mantido constante.

**Fontes** (todas gratuitas, sem chave): Banco Central SGS (Selic 432, CDI 4389, IPCA 433, TR 226), Tesouro Transparente (CSV de taxas) e Yahoo Finance (B3, exterior, cripto e dólar). Cada fonte tem cache próprio (6 h; Tesouro 24 h) e falha sozinha.

## Eras

- Renda recorrente: lançamentos de ganho marcados como recorrentes, ou a mesma origem com valor parecido em 2 meses seguidos.
- Proposta de nova era: a renda recorrente muda mais de 15% e se mantém por 2 meses.
- Métricas por era: renda média, % gasto, % guardado, score médio, e a variação do % gasto em relação à era anterior.

## Como o código resolveu os pontos em aberto (M3)

- **Gasto essencial mensal** = média, nos até 3 meses anteriores com dados, das categorias essenciais mais o pagamento de fatura (Cartão).
- **Saldo da reserva** vem do que você digita em Metas e reserva. Se estiver vazio, o app só sugere o saldo estimado da caixinha (aplicações RDB menos resgates).
- **Pilar desconhecido entra neutro**: Reserva 15 e Rumo 10. Com os dois desconhecidos vale o score provisório (Folga + Constância) × 2. O score fica "provisório" enquanto um dos dois for desconhecido.
- **Meta recém-criada** (nada planejado ainda) vale 100% do planejado, para não punir o primeiro dia.
- **Próxima ação** testa três ações (guardar na reserva, registrar os dias em falta, guardar numa meta atrasada) e mostra a de maior ganho, com no mínimo 1 ponto. O valor de teste é 10% da renda esperada, com piso de R$ 50.
