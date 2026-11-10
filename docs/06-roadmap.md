# 6. Roadmap

Cada marco termina com um APK usável no celular.

| Marco | Entrega | Pronto quando |
|---|---|---|
| **M0 Fundação** | Projeto Expo, SQLite, tema visual, build de APK, testes rodando | O app abre no Android instalado por APK. |
| **M1 Início** | Adicionar por teclado e por texto (parser local), barra de gastos do mês, score provisório (Folga + Constância) | Registrar um gasto leva menos de 10 s e o mês cabe numa tela. |
| **M2 Dia a dia** | CSV do Nubank, contas fixas, Pode gastar hoje, fantasma do mês passado, alerta de gasto fora do padrão, exportar/importar backup | Um mês inteiro de uso real sem planilha paralela. |
| **M3 Score completo** | Metas, Reserva e Rumo, tela "ver a conta", próxima ação | Todo ponto do score é explicado na tela. |
| **M4 Decisões** | Diário de decisões, você paralelo, taxas do Banco Central, revisitas | Um ganho extra vira decisão e é revisitado em 30 dias. |
| **M5 Memória** | Eras, linha do tempo, resumos semanal e mensal (modelo fixo; IA opcional) | A troca de renda vira uma era nova sem perder o histórico. |

## Depois da v1

- Simulador "e se eu passar a ganhar R$ 3.000?".
- Ações e fundos no diário de decisões.
- Leitura de notificações do banco para sugerir lançamentos.
- Open Finance (exigiria servidor e possivelmente custo).
- Análises em Python sobre o arquivo exportado (Polars/DuckDB), como material de portfólio.

## Questões em aberto

| Questão | Por que importa | Decidir até |
|---|---|---|
| Fatura do cartão | Não confirmei um CSV oficial da fatura do Nubank; ver [07-nubank.md](07-nubank.md). | M2 |
| Nome do app | "Paralelo" é sugestão. | M1 |
| Limites do score | Pisos e tetos são ponto de partida; calibrar com 1 a 2 meses de dados reais. | M3 |
| Taxas por destino | Definir a referência de cada opção (ex.: % do CDI). | M4 |
| Dados iniciais | Despesas recorrentes, reserva atual e metas do dono. | M1 |
| Pesquisa de concorrentes | Confirmar se "você paralelo" é mesmo inédito antes de divulgar assim. | Antes de divulgar |
