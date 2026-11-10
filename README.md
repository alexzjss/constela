# Paralelo

> Nome provisório (o repositório continua `money`).

Companheiro de investimentos para Android. Pesquise ativos, veja como eles se movem entre si e em relação à sua carteira, e descubra onde colocar o próximo aporte, com a conta sempre à mostra.

Roda inteiro no celular: sem servidor, sem conta, sem custo. Todo número vem de regras determinísticas; a IA (opcional, com a chave do próprio usuário) só explica o que o motor já calculou.

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
