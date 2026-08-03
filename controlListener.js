const { NewMessage } = require("telegram/events");
const settings = require("./settings");

// Registers a listener on the client's own Saved Messages chat.
// Only messages sent there (by you, to yourself) are ever read as commands —
// this can never collide with a group, another bot, or a real contact.
//
// No confirmation replies are sent. Instead, a successfully-applied command
// simply deletes itself — the message disappearing IS the confirmation.
// If a command is malformed (bad usage) or is just a status query, the
// message is left alone so you still get visible feedback.
function registerControlListener(client, myId) {
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message) return;
    if (message.chatId.toString() !== myId.toString()) return; // only in Saved Messages

    const text = (message.message || "").trim();
    if (!text.startsWith(".")) return;

    const [cmd, ...args] = text.slice(1).split(/\s+/);
    let success = false;

    switch (cmd.toLowerCase()) {
      case "endletter": {
        const arg = (args[0] || "").toLowerCase();
        if (!arg) {
          // Status query — nothing to apply, so leave a visible reply.
          await client.sendMessage("me", {
            message: `Current end-letter preference: ${settings.endLetter || "random"}`,
          });
        } else if (arg === "random" || arg === "off") {
          settings.setEndLetter(null);
          success = true;
        } else if (/^[a-z]$/.test(arg)) {
          settings.setEndLetter(arg);
          success = true;
        } else {
          await client.sendMessage("me", {
            message: "Usage: .endletter <a-z>  or  .endletter random",
          });
        }
        break;
      }

      case "stop": {
        settings.setPaused(true);
        success = true;
        break;
      }

      case "start": {
        settings.setPaused(false);
        success = true;
        break;
      }

      default:
        return; // Not a recognized command — ignore silently
    }

    if (success) {
      await client.deleteMessages("me", [message.id], { revoke: true });
    }
  }, new NewMessage({}));
}

module.exports = { registerControlListener };