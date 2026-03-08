// Basit küfür / argo filtresi (TR + EN)
// Yeni kelimeler eklemek için listeye eklemeniz yeterlidir

const BAD_WORDS_TR = [
  "amk", "aq", "orospu", "piç", "sik", "sikerim", "sikeyim", "yarrak",
  "göt", "götünü", "ananı", "pezevenk", "kahpe", "oç", "mk", "mq",
  "amına", "taşak", "dalyarak", "gerizekalı", "salak", "aptal", "dangalak",
  "hıyar", "ibne", "s2m", "s2k", "amcık",
];

const BAD_WORDS_EN = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "bastard",
  "cunt", "nigger", "faggot", "retard", "whore", "slut",
];

// Türkçe karakterleri de destekleyen kelime sınırı ile eşleştirme
// JS \b Türkçe harfleri (ş,ç,ğ,ü,ö,ı,İ) tanımaz → Unicode-aware lookbehind/lookahead
const turkishWordChar = "[a-zA-ZçÇğĞıİöÖşŞüÜâÂ0-9]";
const wordBoundaryBefore = `(?<!${turkishWordChar})`;
const wordBoundaryAfter = `(?!${turkishWordChar})`;

const allWords = [...BAD_WORDS_TR, ...BAD_WORDS_EN];
const pattern = new RegExp(
  wordBoundaryBefore + "(" + allWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")" + wordBoundaryAfter,
  "gi"
);

/**
 * Metni kontrol eder, küfür içeriyorsa true döner.
 */
export function containsProfanity(text: string): boolean {
  return pattern.test(text);
}

/**
 * Metindeki küfürleri yıldızla maskeler.
 * Örn: "orospu" → "o****u"
 */
export function censorText(text: string): string {
  return text.replace(pattern, (match) => {
    if (match.length <= 2) return "*".repeat(match.length);
    return match[0] + "*".repeat(match.length - 2) + match[match.length - 1];
  });
}
