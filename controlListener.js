const { NewMessage } = require("telegram/events");
const settings = require("./settings");

// Registers a listener on the client's own Saved Messages chat.
// Only messages sent there (by you, to yourself) are ever read as commands —
// this can never collide with a group, another bot, or a real contact.
function registerControlListener(client, myId) {
  client.addEventHandler(async (event) => {
    const message = event.message;

    if (!message) return;
    if (message.chatId.toString() !== myId.toString()) return; // only in Saved Messages

    const text = (message.message || "").trim();
    if (!text.startsWith(".")) return;

    const [cmd, ...args] = text.slice(1).split(/\s+/);
    let reply = null;

    switch (cmd.toLowerCase()) {
      case "endletter": {
        const arg = (args[0] || "").toLowerCase();
        if (!arg) {
          reply = `Current end-letter preference: ${settings.endLetter || "random"}`;
        } else if (arg === "random" || arg === "off") {
          settings.setEndLetter(null);
          reply = "End-letter preference cleared. Back to random.";
        } else if (/^[a-z]$/.test(arg)) {
          settings.setEndLetter(arg);
          reply = `End-letter preference set to "${arg}". Applies immediately, including your current turn if you haven't answered yet.`;
        } else {
          reply = "Usage: .endletter <a-z>  or  .endletter random";
        }
        break;
      }

      case "stop": {
        settings.setPaused(true);
        reply =
          "Paused. I will not answer any turns until you send .start — your current turn will just run out of time.";
        break;
      }

      case "start": {
        settings.setPaused(false);
        reply = "Resumed. Auto-answering is back on.";
        break;
      }

      default:
        return; // Not a recognized command — ignore silently
    }

    if (reply) {
      await client.sendMessage("me", { message: reply });
    }
  }, new NewMessage({}));
}

module.exports = { registerControlListener };
