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

  // Returns a random valid word starting with `letter`, length >= minLen,
  // that hasn't been used yet, optionally also:
  //   - containing `requiredLetter` (Required Letter mode)
  //   - containing none of `bannedLetters` (Banned Letters mode)
  //   - ending with `preferredEndLetter`, if one is set (falls back to
  //     normal selection if no word satisfies it, so it never stalls)
  // Prefers shorter/common-length words first so it doesn't burn long/rare
  // words immediately, but shuffles within each length bucket.
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

    const filterCandidates = (len, requireEndLetter) => {
      let candidates = byLength[len].filter((w) => !this.used.has(w));
      if (requiredLetter) {
        candidates = candidates.filter((w) => w.includes(requiredLetter.toLowerCase()));
      }
      if (bannedSet.size > 0) {
        candidates = candidates.filter((w) => ![...w].some((c) => bannedSet.has(c)));
      }
      if (requireEndLetter && endLetter) {
        candidates = candidates.filter((w) => w.endsWith(endLetter));
      }
      return candidates;
    };

    // Pass 1: try to honor the end-letter preference, if any.
    if (endLetter) {
      for (const len of lengths) {
        const candidates = filterCandidates(len, true);
        if (candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
      // No word satisfies the preference — fall through to normal pick
      // rather than stalling the turn.
    }

    // Pass 2: normal pick (also the only pass when no preference is set).
    for (const len of lengths) {
      const candidates = filterCandidates(len, false);
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    return null; // No valid word left at all — genuinely stuck
  }
}

module.exports = WordPicker;
