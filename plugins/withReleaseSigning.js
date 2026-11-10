const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Assina o APK de release com a chave do CI (variáveis RELEASE_*).
 * Sem as variáveis, cai na chave de debug, então o build local continua funcionando.
 * Falha de propósito se o template do Gradle mudar, para não publicar APK mal assinado.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('RELEASE_STORE_FILE')) return cfg;

    const useRelease = /(release \{[^}]*?)signingConfig signingConfigs\.debug/;
    if (!useRelease.test(g)) throw new Error('withReleaseSigning: bloco buildTypes.release não encontrado');
    g = g.replace(
      useRelease,
      '$1signingConfig System.getenv("RELEASE_STORE_FILE") ? signingConfigs.release : signingConfigs.debug',
    );

    if (!/signingConfigs\s*\{/.test(g)) throw new Error('withReleaseSigning: bloco signingConfigs não encontrado');
    g = g.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (System.getenv("RELEASE_STORE_FILE")) {
                storeFile file(System.getenv("RELEASE_STORE_FILE"))
                storePassword System.getenv("RELEASE_STORE_PASSWORD")
                keyAlias System.getenv("RELEASE_KEY_ALIAS")
                keyPassword System.getenv("RELEASE_KEY_PASSWORD")
            }
        }`,
    );

    cfg.modResults.contents = g;
    return cfg;
  });
};
