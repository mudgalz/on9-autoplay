const fs = require("fs");

class WordPicker {
  constructor(indexPath = "./words.json") {
    this.index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    this.used = new Set();
  }

  reset() {
    this.used.clear();
  }

  markUsed(word) {
    this.used.add(word.toLowerCase());
  }

  // Returns a word starting with `letter`, length >= minLen, that hasn't
  // been used yet, optionally also:
  //   - containing `requiredLetter` (Required Letter mode)
  //   - containing none of `bannedLetters` (Banned Letters mode)
  //   - ending with `preferredEndLetter`, if one is set (falls back to
  //     normal selection if no word satisfies it, so it never stalls)
  //
  // Selection is WEIGHTED toward shorter lengths rather than strictly
  // shortest-first or flat-random across everything — mimics how a real
  // person's vocabulary skews toward common/shorter words, with longer
  // words picked occasionally rather than never or constantly.
  pick(letter, minLen = 1, { requiredLetter = null, bannedLetters = [], preferredEndLetter = null } = {}) {
    letter = letter.toLowerCase();
    const byLength = this.index[letter];
    if (!byLength) return null;

    const bannedSet = new Set(bannedLetters.map((l) => l.toLowerCase()));
    const endLetter = preferredEndLetter ? preferredEndLetter.toLowerCase() : null;

    const lengths = Object.keys(byLength)
      .map(Number)
      .filter((l) => l >= minLen)
      .sort((a, b) => a - b);

    const buildFiltered = (len) => {
      let words = byLength[len].filter((w) => !this.used.has(w));
      if (requiredLetter) {
        words = words.filter((w) => w.includes(requiredLetter.toLowerCase()));
      }
      if (bannedSet.size > 0) {
        words = words.filter((w) => ![...w].some((c) => bannedSet.has(c)));
      }
      return words;
    };

    // Weight each length bucket: shorter = far more likely, longer = rarer.
    // Decay of 0.55 per extra letter beyond the shortest available length.
    // Lower this number for a stronger short-word bias, raise it for more
    // length variety.
    const DECAY = 0.55;

    const pickFromPool = (requireEndLetter) => {
      const buckets = [];
      let totalWeight = 0;

      lengths.forEach((len, i) => {
        let words = buildFiltered(len);
        if (requireEndLetter && endLetter) {
          words = words.filter((w) => w.endsWith(endLetter));
        }
        if (words.length === 0) return;

        const weight = Math.pow(DECAY, i);
        buckets.push({ words, weight });
        totalWeight += weight;
      });

      if (buckets.length === 0) return null;

      let r = Math.random() * totalWeight;
      for (const b of buckets) {
        if (r < b.weight) {
          return b.words[Math.floor(Math.random() * b.words.length)];
        }
        r -= b.weight;
      }
      return buckets[buckets.length - 1].words[0]; // fallback, shouldn't hit
    };

    // Pass 1: try to honor the end-letter preference, if any.
    if (endLetter) {
      const withEndLetter = pickFromPool(true);
      if (withEndLetter) return withEndLetter;
      // No word satisfies the preference — fall through to normal pick
      // rather than stalling the turn.
    }

    // Pass 2: normal weighted pick (also the only pass when no preference is set).
    return pickFromPool(false);
  }
}

module.exports = WordPicker;