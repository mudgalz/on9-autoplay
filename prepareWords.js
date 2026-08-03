// Downloads the same wordlist source on9wordchainbot uses, and builds
// a fast lookup index grouped by starting letter -> word length -> words.
// Run once with: npm run prepare-words  (regenerate any time you want fresh words)
const fs = require("fs");
const fetch = require("node-fetch");

const WORDLIST_SOURCE = "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt";
const OUTPUT_PATH = "./words.json";

(async () => {
  console.log("Downloading wordlist...");
  const res = await fetch(WORDLIST_SOURCE);
  const text = await res.text();

  const words = text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0 && /^[a-z]+$/.test(w));

  console.log(`Loaded ${words.length} words. Indexing...`);

  // index[letter][length] = [word, word, ...]
  const index = {};
  for (const w of words) {
    const letter = w[0];
    const len = w.length;
    if (!index[letter]) index[letter] = {};
    if (!index[letter][len]) index[letter][len] = [];
    index[letter][len].push(w);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  console.log(`Saved index to ${OUTPUT_PATH}`);
})();
