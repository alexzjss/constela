// Estende o app.json. No CI, GITHUB_RUN_NUMBER faz o versionCode crescer a cada build,
// que é o que o Android exige para aceitar a atualização por cima.
const run = Number(process.env.GITHUB_RUN_NUMBER) || 0;

module.exports = ({ config }) => ({
  ...config,
  version: `0.1.${run}`,
  plugins: [...(config.plugins ?? []), './plugins/withReleaseSigning'],
  android: { ...config.android, versionCode: run || 1 },
});
