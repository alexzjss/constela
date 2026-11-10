# 5. Dados

Banco SQLite dentro do app, no próprio aparelho.

## Entidades

| Entidade | O que guarda | Campos principais |
|---|---|---|
| `user` | O dono dos dados | email, fuso horário |
| `account` | Onde o dinheiro está | nome, tipo (conta, cartão, reserva, investimento) |
| `category` | Classificação do lançamento | nome, essencial (sim/não), arquivada |
| `transaction` | Um gasto ou ganho | valor em centavos, tipo, categoria, conta, data, origem (texto, formulário, csv), texto original, recorrente, hash de importação |
| `recurring_bill` | Conta fixa esperada | nome, valor, dia do vencimento, categoria |
| `goal` | Meta | nome, valor alvo, prazo, valor guardado |
| `era` | Fase de renda | nome, início, fim, renda recorrente |
| `decision` | Um destino a escolher | valor, data, transação de origem, estado (pendente, decidida) |
| `decision_option` | Alternativa oferecida | tipo, motivo, risco, taxa de referência, valor escolhido |
| `decision_review` | Revisita | data, valor atual de cada opção |
| `score_snapshot` | Score do dia | total, pilares, dados de entrada (JSON), provisório |
| `insight` | Aviso ou resumo | tipo, texto, dados usados, lido |
| `reference_rate` | Série do Banco Central | série, data, valor |

## Relações

```
user ─┬─ account ─── transaction ─── category
      ├─ recurring_bill
      ├─ goal
      ├─ era
      ├─ decision ─┬─ decision_option
      │            └─ decision_review
      ├─ score_snapshot
      └─ insight
```

## Regras

- **Dinheiro é inteiro.** Centavos, nunca ponto flutuante.
- **Nada é apagado de verdade.** Lançamentos e categorias são arquivados; o histórico não muda de forma.
- **Correção deixa rastro.** Editar um lançamento guarda o valor anterior.
- **Importação é idempotente.** Importar o mesmo CSV duas vezes não duplica nada (hash por linha).
- **Snapshots são imutáveis.** O score de um dia passado não é recalculado quando a fórmula muda; a versão da fórmula fica gravada no snapshot.
- **Tudo tem `user_id`.** Mesmo com um usuário só.
- **Datas** em UTC no banco, exibidas no fuso do usuário. O "dia" de um lançamento é o dia local.

## Categorias iniciais

Moradia, Alimentação, Transporte, Contas (internet, celular, luz), Saúde, Educação, Lazer, Compras, Presentes, Outros. As quatro primeiras e Saúde contam como essenciais para o pilar Reserva. O usuário pode renomear, criar e arquivar.
