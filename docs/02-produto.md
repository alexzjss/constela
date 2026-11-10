# 2. Produto

O app tem **três abas** e **um botão**. Nada mais na v1.

| Aba | Pergunta que responde |
|---|---|
| Início | Como estou neste mês? |
| Decisões | O que fiz com meu dinheiro extra, e valeu a pena? |
| Linha do tempo | Como cheguei até aqui? |

O botão **+** flutua sobre todas as abas.

## Início

De cima para baixo, em uma tela sem rolagem:

1. **Score** (0 a 100) com a variação desde a semana passada. Tocar abre o detalhe.
2. **Pode gastar hoje**: um valor em reais.
3. **Gastos do mês**: uma barra única, dividida por categoria, com o total. Sobre ela, a marca do **fantasma**: quanto o você do mês passado tinha gasto até este mesmo dia. Tocar numa fatia lista os lançamentos dela.
4. **Um cartão de aviso**, no máximo, quando houver: gasto fora do padrão, decisão pendente ou resumo novo.

## Adicionar (botão +)

Dois caminhos na mesma folha:

- **Escrever**: "gastei 35 no almoço", "recebi 300 de freela ontem". Um interpretador local, por regras e sem IA, devolve um cartão com valor, tipo, categoria e data. O usuário confirma ou corrige, e só então o lançamento é salvo.
- **Preencher**: teclado numérico, gasto/ganho e categoria.

Os dois caminhos funcionam sem internet.

A importação do CSV do Nubank fica em Ajustes. Lançamentos importados que batem com um manual (mesmo valor, data próxima) são fundidos, não duplicados.

## Score aberto

A tela de detalhe mostra os 4 pilares, cada um com sua nota, a conta que a gerou e os dados usados:

| Pilar | O que mede | Peso |
|---|---|---|
| Folga | Quanto da renda sobra. | 30 |
| Reserva | Quantos meses de gastos essenciais você aguenta. | 30 |
| Constância | Se os registros estão em dia e os gastos, estáveis. | 20 |
| Rumo | Se você está no ritmo das suas metas. | 20 |

No fim, **a próxima ação**: o motor simula algumas ações possíveis e mostra a que mais sobe a nota ("guardar R$ 80 este mês: +3 pontos"). As fórmulas estão em [Motor financeiro](03-motor-financeiro.md).

## Pode gastar hoje

Um número, recalculado a cada lançamento. Se o dia fechar abaixo, a sobra se espalha pelos dias seguintes; se estourar, eles encolhem. Sem culpa, sem vermelho piscando.

## Diário de decisões

1. **Gatilho**: entra um ganho fora da renda recorrente (ou o usuário toca em "decidir" num valor).
2. **Opções**: o motor monta de 2 a 4 destinos (reserva, caixinha, CDB/Tesouro, objetivo, gastar), cada um com motivo, risco e prazo, ordenados pela situação atual. Exemplo: com menos de 3 meses de reserva, ela vem primeiro.
3. **Escolha**: o usuário divide o valor entre as opções. O app registra; a aplicação em si é feita pelo usuário no banco.
4. **Revisita**: em 30, 90 e 180 dias o app mostra quanto a escolha vale hoje e quanto valeriam as alternativas, usando as taxas públicas do Banco Central.

Cada opção não escolhida vira um **você paralelo**: o app continua calculando quanto ela valeria, e a revisita mostra você e os seus paralelos lado a lado. As opções, a ordem, os valores e os textos vêm do motor, sem IA.

## Eras (Linha do tempo)

Uma **era** é um período com a mesma renda recorrente. O app propõe uma era nova quando a renda recorrente muda por dois meses seguidos; o usuário confirma e dá um nome ("Bolsa", "Estágio").

A linha do tempo mostra, por era: renda, percentual gasto, score médio, decisões tomadas e metas alcançadas. Como o score trabalha em percentuais da renda, ele continua comparável entre eras, e gastar mais na mesma proporção em que se ganha mais aparece como tal.

## Avisos

| Aviso | Quando |
|---|---|
| Gasto fora do padrão | Uma categoria passa do seu ritmo habitual para aquele dia do mês. |
| Decisão pendente | Há dinheiro extra sem destino há mais de 2 dias. |
| Revisita | Uma decisão chegou a 30, 90 ou 180 dias. |
| Resumo | Toda semana e todo mês: o que mudou, em 3 ou 4 frases. |

Cada aviso aparece como notificação e como cartão no Início. No máximo um por dia.
