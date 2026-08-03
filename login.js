// One-time script: logs into YOUR Telegram account and prints a session string.
// Run once with: npm run login
// Then paste the printed string into .env as SESSION_STRING=...
require("dotenv").config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH;

(async () => {
  console.log("Logging in...");
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Your phone number (with country code): "),
    password: async () => await input.text("Your 2FA password (leave blank if none): "),
    phoneCode: async () => await input.text("Code you received in Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\nLogin successful. Add this to your .env as SESSION_STRING:\n");
  console.log(client.session.save());
  console.log("\nKeep this string secret — it's equivalent to a password for your account.");

  await client.disconnect();
  process.exit(0);
})();
