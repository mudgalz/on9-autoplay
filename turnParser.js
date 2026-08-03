// Parses on9wordchainbot's "Turn:" message across every game mode.
//
// Message shapes seen in the source (models/game/*.py):
//
// Classic / Chaos / Chosen First Letter:
//   "Your word must start with X and include at least N letters."
//
// Required Letter:
//   "Your word must start with X, include Y and at least N letters."
//
// Banned Letters:
//   "Your word must start with X, exclude A, B and include at least N letters."
//
// Elimination (no min-length phrase at all — hardcoded to 1 in the game):
//   "Your word must start with X."
//
// Mixed Elimination (elimination-style short phrasing, one extra clause
// depending on which sub-mode was randomly picked that round):
//   "Your word must start with X and exclude A, B."
//   "Your word must start with X and include Y."
//   "Your word must start with X."   (classic/CFL sub-round)
//
// Returns null if `text` isn't a turn message at all. Otherwise returns:
//   { letter, minLen, requiredLetter, bannedLetters }
function parseTurnMessage(text) {
  const startMatch = text.match(/must start with\s+([A-Za-z])/i);
  if (!startMatch) return null;

  const letter = startMatch[1].toLowerCase();

  // Min length — absent in Elimination/Mixed Elimination, defaults to 1
  // which matches the game's own hardcoded min_letters_limit there.
  let minLen = 1;
  const minLenMatch = text.match(/at least\s+(\d+)\s+letters?/i);
  if (minLenMatch) minLen = parseInt(minLenMatch[1], 10);

  // Required letter — either ", include Y and" (Required Letter mode)
  // or "and include Y." (Mixed Elimination sub-round)
  let requiredLetter = null;
  let reqMatch = text.match(/,\s*include\s+([A-Za-z])\s+and/i);
  if (!reqMatch) reqMatch = text.match(/and include\s+([A-Za-z])\s*\./i);
  if (reqMatch) requiredLetter = reqMatch[1].toLowerCase();

  // Banned letters — either "exclude A, B and include" (Banned Letters mode)
  // or "and exclude A, B." (Mixed Elimination sub-round)
  let bannedLetters = [];
  let banMatch = text.match(/exclude\s+([A-Za-z,\s]+?)\s+and\s+include/i);
  if (!banMatch) banMatch = text.match(/exclude\s+([A-Za-z,\s]+?)\s*\./i);
  if (banMatch) {
    bannedLetters = banMatch[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  return { letter, minLen, requiredLetter, bannedLetters };
}

module.exports = { parseTurnMessage };
