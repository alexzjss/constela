# 4. Arquitetura

## Visão geral

Tudo roda no celular. Não existe servidor.

```
┌───────────────────────── App Android (Expo) ─────────────────────────┐
│  Telas (features)                                                     │
│     │                                                                 │
│     ▼                                                                 │
│  engine  ◀── db (SQLite) ◀── ingest (CSV Nubank) / parser (texto)     │
│     │                                                                 │
│     └── ai (opcional, sob demanda) ──▶ Gemini, com a chave do usuário │
└───────────────────────────────────────────────────────────────────────┘
        Rede só para: taxas do Banco Central e IA opcional
```

## Pastas

```
money/
├── app/                 Rotas (expo-router): 3 abas, folha "+", detalhe do score
├── src/
│   ├── features/
│   │   ├── home/        Início: score, pode gastar hoje, barra do mês com fantasma
│   │   ├── score/       Detalhe dos 4 pilares e próxima ação
│   │   ├── add/         Adicionar por texto ou teclado
│   │   ├── decisions/   Diário de decisões, você paralelo, revisitas
│   │   ├── eras/        Linha do tempo
│   │   └── settings/    Importar CSV, exportar dados, chave de IA
│   ├── engine/          Motor determinístico: score, pode gastar, fantasma, decisões, eras
│   ├── db/              Esquema SQLite, migrações e consultas
│   ├── ingest/          Leitura do CSV do Nubank e deduplicação
│   ├── parser/          "gastei 35 no almoço" → lançamento, por regras
│   ├── ai/              Opcional: resumo narrado sob demanda
│   ├── components/      Peças visuais reutilizadas
│   ├── theme/           Cores, tipografia, espaçamentos
│   └── lib/             Moeda, datas, notificações locais, exportação
├── tests/               Testes do engine, do parser e do ingest
├── data/
│   ├── samples/         CSVs fictícios (entram no repositório)
│   └── private/         Seus CSVs reais (ignorado pelo git)
└── docs/
```

## Decisões técnicas

| Decisão | Escolha | Quem decidiu | Motivo |
|---|---|---|---|
| Plataforma | Expo / React Native, só Android | Dono | App nativo; instalar por APK é gratuito. |
| Custo | Zero, rodando direto no celular | Dono | Requisito. |
| IA | Não obrigatória; ocasional e sob demanda | Dono | Requisito. |
| Sem servidor | SQLite local, sem API nem login | Claude | É o único desenho que garante custo zero para sempre e funciona offline. |
| Motor em TypeScript | `src/engine/`, funções puras | Claude | Sem servidor, o cálculo precisa rodar no aparelho. Substitui o FastAPI/Python do plano anterior. |
| Texto sem IA | Interpretador por regras em `src/parser/` | Claude | Frases de gasto são curtas e regulares; regras resolvem, offline e de graça. |
| IA opcional | Gemini com a chave do próprio usuário, só para o resumo narrado | Claude | Sem chave, o app mostra o resumo em modelo fixo. |
| Avisos | Notificações locais agendadas no aparelho | Claude | Não precisam de servidor. |
| Backup | Exportar/importar arquivo pelo menu de compartilhar do Android | Claude | Sem nuvem própria; o usuário guarda onde quiser (Drive, e-mail). |
| Instalação | APK gerado pelo build do Expo | Claude | Gratuito no Android; sem loja. |

## Interpretador de texto (`parser/`)

1. Acha o valor ("35", "35,90", "R$ 1.200").
2. Decide gasto ou ganho por verbos ("gastei", "paguei", "comprei" / "recebi", "ganhei", "caiu").
3. Acha a data ("ontem", "sexta", "dia 5"); sem data, é hoje.
4. Escolhe a categoria por um dicionário de palavras ("almoço" → Alimentação).
5. Mostra o cartão para confirmar. Quando o usuário corrige a categoria, a palavra entra no dicionário dele.

Se não achar um valor, abre o teclado numérico já com o texto como descrição.

## IA opcional (`ai/`)

- Único uso: transformar os números do resumo semanal ou mensal em um texto curto, quando o usuário toca em "Narrar com IA".
- Recebe apenas agregados já calculados. Nunca lançamentos, descrições ou saldos por conta.
- Todo valor citado na resposta é conferido contra os dados enviados; se não bater, o app mostra o modelo fixo.
- A chave fica no armazenamento seguro do aparelho e nunca entra no repositório.
- No plano gratuito do Gemini, o Google pode usar o conteúdo enviado para melhorar os produtos dele. O app avisa disso antes de salvar a chave.

## Privacidade e segurança

- Os dados ficam em um banco SQLite dentro do app. Nada sai do aparelho sem uma ação do usuário (exportar, narrar com IA).
- O repositório é público: dados reais vão só em `data/private/`, que o git ignora.
- Bloqueio opcional do app por biometria.
- Desinstalar apaga os dados; por isso o app lembra de exportar um backup uma vez por mês.

## Testes

- `engine/`: unitários com casos de borda (renda zero, mês incompleto, primeira semana).
- `parser/`: lista fixa de frases com a resposta esperada.
- `ingest/`: CSVs de exemplo, incluindo duplicados e o mesmo arquivo importado duas vezes.
