// Foul-language filter for visitor postcards. Deliberately simple and strict:
// text is lower-cased, common character swaps are undone (4 -> a, $ -> s, ...),
// and repeated letters are squeezed, then whole words are checked against the
// list. A few unambiguous words are also caught when hidden inside others.
// Add words to BLOCKED (lowercase) to block more.

const BLOCKED = new Set([
  // English
  'fuck', 'fucker', 'fucking', 'fucked', 'fuk', 'fck', 'fuq', 'motherfucker', 'mf', 'wtf', 'stfu',
  'shit', 'shitty', 'bullshit', 'shite', 'crap',
  'bitch', 'bitches', 'biatch', 'bastard', 'asshole', 'arsehole', 'ass', 'arse', 'jackass', 'dumbass',
  'cunt', 'dick', 'dickhead', 'cock', 'cocks', 'prick', 'pussy', 'twat', 'wanker', 'tosser', 'bollocks',
  'slut', 'whore', 'hoe', 'skank', 'tits', 'boobs', 'porn', 'porno', 'nude', 'nudes', 'sex', 'sexy', 'horny',
  'cum', 'jizz', 'dildo', 'blowjob', 'handjob', 'rape', 'rapist',
  'retard', 'retarded', 'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny', 'chink', 'spic', 'kike', 'paki',
  'kys', 'killyourself', 'stupid', 'idiot', 'moron',
  // Hindi / Kannada (romanised)
  'chutiya', 'chutia', 'chootiya', 'madarchod', 'mc', 'bhenchod', 'behenchod', 'bc', 'bsdk', 'bhosdike', 'bhosdi',
  'gandu', 'gaandu', 'gand', 'lund', 'loda', 'lauda', 'lavda', 'randi', 'harami', 'haramkhor', 'kutta',
  'kamina', 'kamine', 'tatti', 'jhatu', 'bolimaga', 'soole', 'sulemaga', 'thullu', 'ninamma', 'ninnamma', 'ninakkan',
]);
// Caught even inside other words (only words that never appear innocently).
const EMBEDDED = ['fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'madarchod', 'bhenchod', 'behenchod', 'chutiya', 'bhosd', 'motherf'];

const SWAPS = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };

function normalise(text) {
  return text
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // é -> e
    .toLowerCase()
    .replace(/[0-9!|@$+]/g, (c) => SWAPS[c] || c)
    .replace(/(.)\1{2,}/g, '$1$1'); // "fuuuuck" -> "fuuck"
}
const squeeze = (w) => w.replace(/(.)\1+/g, '$1');

export function hasFoulLanguage(text) {
  // "f u c k" / "f.u.c.k": join runs of single letters into one word first
  const norm = normalise(String(text || '')).replace(/\b([a-z])[^a-z]+(?=[a-z]\b)/g, '$1');
  for (const w of norm.split(/[^a-z]+/)) {
    if (!w) continue;
    const sq = squeeze(w);
    if (BLOCKED.has(w) || BLOCKED.has(sq)) return true;
    if (EMBEDDED.some((e) => w.includes(e) || sq.includes(squeeze(e)))) return true;
  }
  return false;
}

// Links and email addresses are refused: they are almost always spam.
export function hasLink(text) {
  return /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|in|io|xyz|ru|co|info|biz|link|site|online|app|me|ly)\b|@[a-z0-9-]+\.[a-z])/i.test(String(text || ''));
}
