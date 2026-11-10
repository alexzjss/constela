# Paralelo

> Nome provisório (sugestão; o repositório continua `money`).

**Seu único rival é você.** App Android de finanças pessoais que compara você com as suas outras versões: o você do mês passado, o você que fez a escolha que você não fez, e o você de amanhã.

Roda inteiro no celular: sem servidor, sem conta, sem custo. Todo número vem de regras determinísticas e mostra a própria conta.

## O que o app faz (v1)

| Peça | Em uma frase |
|---|---|
| Tela inicial | Score, gastos do mês contra o "fantasma" do mês passado e um botão para adicionar. |
| Score aberto | Nota de 0 a 100 em 4 pilares, com a conta visível e a próxima ação que mais sobe a nota. |
| Pode gastar hoje | Quanto dá para gastar hoje sem comprometer contas e metas. |
| Diário de decisões | Dinheiro extra vira uma decisão; o app acompanha o "você paralelo" que escolheu diferente. |
| Eras | Linha do tempo por fase de renda. |

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo (React Native + TypeScript), só Android |
| Dados | SQLite no próprio aparelho |
| Motor financeiro | TypeScript puro, testado, sem rede |
| Texto para lançamento | Interpretador local por regras (sem IA) |
| IA | Opcional e sob demanda: Gemini com a chave do próprio usuário |
| Backup | Exportação para arquivo (JSON e CSV) |

## Documentação

0. [Proposta](docs/00-proposta.md): a ideia central e o posicionamento.
1. [Visão](docs/01-visao.md): por que existe, metas e o que fica de fora.
2. [Produto](docs/02-produto.md): telas e comportamento de cada peça.
3. [Motor financeiro](docs/03-motor-financeiro.md): as fórmulas.
4. [Arquitetura](docs/04-arquitetura.md): pastas, fluxo de dados e decisões técnicas.
5. [Dados](docs/05-dados.md): entidades e regras de armazenamento.
6. [Roadmap](docs/06-roadmap.md): marcos de entrega e questões em aberto.
7. [Importar do Nubank](docs/07-nubank.md): como exportar seu extrato e usá-lo aqui.

## Estado

Planejamento. Ainda não há código; as pastas são só o esqueleto.
