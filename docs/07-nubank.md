# 7. Importar do Nubank

## Exportar o extrato da conta

Caminho descrito por guias públicos (os menus do app mudam; confira na sua versão):

1. Abra o app do Nubank e toque em **Conta**.
2. Toque em **Pedir extrato**.
3. Escolha o período (um mês por vez é o mais simples).
4. Toque em **Exportar extrato** e escolha o formato **CSV**.
5. O arquivo chega no seu e-mail cadastrado; em algumas versões o app também oferece salvar ou compartilhar na hora.

## Fatura do cartão

Não encontrei confirmação de que o app exporta a fatura em CSV. Enquanto isso não for confirmado no seu app, as compras no cartão entram por lançamento manual. Se o seu app oferecer o arquivo, guarde um exemplo em `data/private/` para criarmos o leitor.

## Usar seus dados como exemplo neste projeto

1. Salve os CSVs em `data/private/`. Essa pasta é ignorada pelo git; nada dela vai para o GitHub.
2. Nunca coloque um extrato real em `data/samples/`, que é pública.
3. Para os testes, criamos em `data/samples/` arquivos fictícios com as mesmas colunas e valores inventados.
4. O leitor do CSV já existe (`src/ingest/nubank.ts`) e foi escrito a partir de extratos reais. Colunas: `Data, Valor, Identificador, Descrição`. O Identificador se repete entre as duas pontas de uma operação, então o app usa `Identificador|valor` para não duplicar nem perder lançamentos.

## Exportar os dados do próprio app

Em Ajustes › Exportar dados, o app gera:

- um **JSON** completo (backup, pode ser reimportado);
- um **CSV** de lançamentos (para planilha ou análise).

O arquivo sai pelo menu de compartilhar do Android: Drive, e-mail ou pasta do aparelho.
