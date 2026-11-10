# Paralelo

> Nome provisório (o repositório continua `money`).

Companheiro de investimentos para Android. Pesquise ativos, veja como eles se movem entre si e em relação à sua carteira, e descubra onde colocar o próximo aporte, com a conta sempre à mostra.

Roda inteiro no celular: sem servidor, sem conta, sem custo. Todo número vem de regras determinísticas; a IA (opcional, com a chave do próprio usuário) só explica o que o motor já calculou.

## O que o app faz

| Aba | Em uma frase |
|---|---|
| Carteira | Suas posições, aportes e rendimento contra o CDI e a inflação, mais o risco da carteira (volatilidade e posições que andam juntas). |
| Pesquisar | Busca livre de ações, FIIs, ETFs e cripto; a ficha do ativo mostra a correlação com Ibovespa, S&P 500 e dólar, quem anda parecido, quem diversifica e o efeito na sua carteira. |
| Companheiro | Onde colocar o próximo aporte (mix do perfil ajustado à carteira, renda fixa por retorno líquido de IR/IOF, ativos que mais reduzem o risco) e perguntas à IA. |

**Como a correlação é calculada** (`src/engine/correlation.ts`): retornos semanais dos últimos 3 anos, ativos em dólar convertidos para reais, Pearson entre pares e beta contra os índices. Com menos de 26 semanas em comum o app não mostra o número. É histórico: não prevê o futuro.

**IA opcional:** em Ajustes, escolha Claude ou Gemini e cole a sua chave (fica no cofre do Android, fora do backup). A IA só explica os números que o motor já calculou.

## Stack

| Camada | Tecnologia |
|---|---|
| App | Expo (React Native + TypeScript), só Android |
| Dados | SQLite no próprio aparelho |
| Motor | TypeScript puro, testado, sem rede (`src/engine`) |
| Mercado | Banco Central, Tesouro Transparente e Yahoo Finance, com cache local |
| Backup | Exportação da carteira para JSON |

## Rodar e instalar

```bash
npm install
npm test              # testes (Jest)
npx expo start        # abre no Expo Go, no Android
```

### APK e atualização automática

A cada push na `main`, o GitHub Actions ([workflow](.github/workflows/build-apk.yml)) roda os testes, gera o APK assinado e publica numa [Release](../../releases). Não usa conta Expo nem serviço pago.

No celular:

1. Instale o [Obtainium](https://github.com/ImranR98/Obtainium) (app de código aberto, fora da Play Store).
2. Em "Adicionar app", cole a URL deste repositório. O Obtainium baixa a Release mais recente e avisa quando sai uma nova.

A chave de assinatura fica nos *Secrets* do repositório (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) e em backup local do dono. Sem ela o Android recusa atualizar o app instalado. Para gerar um APK local sem a chave de release: `npx expo prebuild --platform android` e `cd android && ./gradlew assembleRelease` (assina com a chave de debug).
