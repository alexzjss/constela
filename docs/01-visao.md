# 1. Visão

## Por que existe

Apps de finanças mostram saldos e gráficos, mas não respondem "estou indo bem?" nem lembram por que você fez o que fez. Este app responde à primeira pergunta com uma nota que mostra a própria conta, e resolve a segunda guardando cada decisão e voltando a ela depois.

Ele serve a dois propósitos, nesta ordem:

1. Ser um app que o dono usa todo dia, por anos, enquanto a renda muda (bolsa, estágio, freelas, emprego).
2. Ser um repositório público que demonstra engenharia de software, dados e IA aplicada.

## Metas

- Registrar um gasto em menos de 10 segundos.
- Abrir o app e entender a situação do mês em uma tela, sem rolar.
- Todo número exibido tem um "ver a conta" que mostra de onde veio.
- O histórico sobrevive a mudanças de renda, de banco e de categorias.
- Um desenvolvedor de fora consegue subir o projeto localmente seguindo o README.

## Fora do escopo (por enquanto)

- Servidor, login e qualquer serviço pago. O app roda inteiro no celular.
- IA obrigatória. Ela é opcional e só narra resumos sob demanda.
- iPhone. A v1 é só Android.
- Open Finance / Pluggy. A entrada é texto, teclado e CSV do Nubank.
- Ações, fundos e cripto. A v1 cobre reserva, caixinha, CDB/Tesouro e objetivos.
- Vários usuários, planos pagos, loja de aplicativos.
- Modelos de machine learning. Os alertas começam com estatística simples.
- Vários agentes de IA. Há um motor de regras e uma camada fina de IA.

## O que tornaria o projeto um fracasso

- **Virar um app de mil funções.** Cada tela nova precisa justificar por que não cabe nas existentes.
- **A IA inventar ou arredondar um valor.** Cálculo é do motor; a IA recebe números prontos.
- **O app decidir pelo usuário.** Ele mostra opções, motivos e riscos. Quem escolhe e executa é a pessoa, no banco dela.
- **Exigir disciplina de planilha.** Se registrar for chato, o app morre em duas semanas.
- **Perder ou vazar dados financeiros.** Ver a seção de privacidade em [Arquitetura](04-arquitetura.md).

## Princípios

1. **Uma tela, uma pergunta.** Início: "como estou?". Score: "por quê?". Decisão: "o que faço com isto?".
2. **Regra antes de modelo.** Determinístico, testado e explicável primeiro.
3. **Confirmar antes de salvar.** O que a IA interpretou aparece num cartão para o usuário confirmar ou corrigir.
4. **Comparar você com você.** Sem médias de mercado nem ranking; a referência é a sua própria era.
5. **Memória é dado estruturado.** O histórico vive em tabelas (eras, decisões, snapshots), não em texto solto de conversa.
