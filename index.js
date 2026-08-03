require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const WordPicker = require("./wordPicker");
const { parseTurnMessage } = require("./turnParser");
const settings = require("./settings");
const { registerControlListener } = require("./controlListener");

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH;
const sessionString = process.env.SESSION_STRING;
const MY_USER_ID = process.env.MY_USER_ID;

const ON9_BOT_USERNAME = "on9wordchainbot";

// One WordPicker per active group chat, so simultaneous games in different
// groups never leak "used words" state into each other.
const pickers = new Map();
function getPicker(chatId) {
  const key = chatId.toString();
  if (!pickers.has(key)) {
    pickers.set(key, new WordPicker("./words.json"));
  }
  return pickers.get(key);
}

// Matches the very first word of a new game: "The first word is Something."
// (Not present for Chosen First Letter mode — that announces a letter instead,
// which needs no word tracking since there's no starting word to mark used.)
const FIRST_WORD_RE = /The first word is\s+([A-Za-z]+)\./;
const ACCEPTED_RE = /^_?([A-Za-z]+)_?\s+is accepted\./;

function randomDelayMs(min = 3000, max = 7000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  if (!sessionString) {
    console.error(
      "No SESSION_STRING found in .env — run `npm run login` first.",
    );
    process.exit(1);
  }

  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    },
  );

  await client.connect();
  const me = await client.getMe();
  registerControlListener(client, me.id);

  // Resolve on9wordchainbot's numeric id once, so we can verify every
  // message we act on genuinely came from the game bot, in ANY group —
  // not just a hardcoded chat.
  const on9BotEntity = await client.getEntity(ON9_BOT_USERNAME);
  const ON9_BOT_ID = on9BotEntity.id.toString();
  console.log(`Resolved @${ON9_BOT_USERNAME} -> id ${ON9_BOT_ID}`);
  console.log(
    "Connected as your account. Listening for game turns in ANY group, and Saved Messages commands...",
  );

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.chatId) return;

    // Only act on messages actually sent by on9wordchainbot itself —
    // this is what makes it safe to listen across every group at once,
    // instead of trusting a fixed chat id.
    if (!message.senderId || message.senderId.toString() !== ON9_BOT_ID) return;

    const chatId = message.chatId;
    const picker = getPicker(chatId);
    const text = message.message || "";

    // New game started — reset used-word tracking for THIS group only
    const firstWordMatch = text.match(FIRST_WORD_RE);
    if (firstWordMatch) {
      picker.reset();
      picker.markUsed(firstWordMatch[1]);
      console.log(`[${chatId}] New game detected. Word tracking reset.`);
      return;
    }

    // Track words other players/VP used too, so we never repeat them
    const acceptedMatch = text.match(ACCEPTED_RE);
    if (acceptedMatch) {
      picker.markUsed(acceptedMatch[1]);
    }

    // Is this a turn message at all? (covers every mode — see turnParser.js)
    const parsed = parseTurnMessage(text);
    if (!parsed) return;

    // Only respond if the "Turn:" line mentions our own user id
    // Telegram mentions come through as message entities with type "mentionName" / text_mention
    const isMyTurn =
      (message.entities || []).some(
        (e) =>
          e.className === "MessageEntityMentionName" &&
          e.userId?.toString() === MY_USER_ID,
      ) || text.includes(String(MY_USER_ID));

    if (!isMyTurn) return;

    if (settings.paused) {
      console.log(
        `[${chatId}] Paused (.stop is active) — letting this turn run out.`,
      );
      return;
    }

    const { letter, minLen, requiredLetter, bannedLetters } = parsed;

    const word = picker.pick(letter, minLen, {
      requiredLetter,
      bannedLetters,
      preferredEndLetter: settings.endLetter,
    });

    if (!word) {
      console.log(
        `[${chatId}] No valid word found for letter "${letter}" (min ${minLen}` +
          (requiredLetter ? `, must include "${requiredLetter}"` : "") +
          (bannedLetters.length ? `, banned: ${bannedLetters.join(",")}` : "") +
          `). Skipping turn.`,
      );
      // Could send /skip or /forceskip here if you want it to fold instead of stalling
      return;
    }

    const delay = randomDelayMs();
    console.log(`[${chatId}] My turn. Answering "${word}" in ${delay}ms...`);

    setTimeout(async () => {
      // Re-check in case .stop was sent during the delay window
      if (settings.paused) {
        console.log(`[${chatId}] Paused during delay — not sending.`);
        return;
      }
      await client.sendMessage(chatId, { message: word });
      picker.markUsed(word);
    }, delay);
  }, new NewMessage({}));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
