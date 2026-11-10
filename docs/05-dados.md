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
| `reference_rate` | Cache de taxas e cotações (Banco Central, Tesouro, Yahoo) | key, value, asOf, fetchedAt, extra (JSON) |

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
- **Importação é idempotente.** Importar o mesmo CSV duas vezes não duplica nada. A chave é `Identificador|valor`, porque o Identificador do Nubank se repete entre as duas pontas de uma operação (Pix + crédito adicionado, Pix + estorno).
- **Snapshots são imutáveis.** O score de um dia passado não é recalculado quando a fórmula muda; a versão da fórmula fica gravada no snapshot.
- **Um usuário só.** O banco vive no aparelho; não há `user_id`.
- **Datas** são texto `YYYY-MM-DD` no dia local do aparelho. Nunca `new Date(texto)`.

## Categorias iniciais

Definidas em `src/domain/categories.ts`. Gasto: Comida, Transporte, Contas, Moradia, Saúde (essenciais) e Educação, Lazer, Compras, Presentes, Cartão (pagamento de fatura), Outros. Ganho: Renda, Reembolso. Interna: Reserva (aplicações e resgates, que não contam como renda nem gasto). Cada categoria de gasto tem uma cor própria; o azul do app fica reservado à interface.
