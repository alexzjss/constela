export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\bmp\s*\*/g, ' ')
    .replace(/\bpe\s*\*/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** [categoria, palavras que casam por prefixo de palavra, palavras que casam exatas] */
const DICTIONARY: [string, string[], string[]][] = [
  ['comida', ['padaria', 'acai', 'lanche', 'lamen', 'churrasco', 'coffee', 'cafe', 'restaurante',
    'milho', 'ifood', 'mercado', 'pizza', 'burger', 'almoco', 'janta'], ['bar']],
  ['transporte', ['autopass', 'metro', 'sptrans', 'uber', 'tmob', 'onibus', 'gasolina'], []],
  ['educacao', ['escola', 'livraria', 'letras', 'materiais', 'curso'], ['usp']],
  ['compras', ['shopping', 'celular', 'magazine', 'americanas'], []],
  ['saude', ['farmacia', 'drogaria', 'consulta'], []],
  ['moradia', ['aluguel', 'condominio'], []],
  ['contas', ['internet', 'luz', 'energia', 'vivo', 'claro'], []],
];

export function categorizeMerchant(text: string, userRules: Record<string, string>): string {
  const key = normalizeKey(text);
  if (userRules[key]) return userRules[key];
  const words = key.split(' ');
  for (const [cat, prefixes, exact] of DICTIONARY) {
    if (words.some((w) => exact.includes(w) || prefixes.some((p) => w.startsWith(p)))) return cat;
  }
  return 'outros';
}
