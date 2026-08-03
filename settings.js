const fs = require("fs");

const SETTINGS_PATH = "./settings.json";

const DEFAULTS = {
  endLetter: null, // null = random (default). Otherwise a single lowercase letter.
  paused: false,
};

class Settings {
  constructor() {
    this.data = { ...DEFAULTS };
    this.load();
  }

  load() {
    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
        this.data = { ...DEFAULTS, ...raw };
      } catch (e) {
        console.error("Failed to read settings.json, using defaults:", e.message);
      }
    }
  }

  save() {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(this.data, null, 2));
  }

  get endLetter() {
    return this.data.endLetter;
  }

  setEndLetter(letter) {
    this.data.endLetter = letter; // null for random
    this.save();
  }

  get paused() {
    return this.data.paused;
  }

  setPaused(paused) {
    this.data.paused = paused;
    this.save();
  }
}

// Singleton — both the game listener and the control listener import this
// same instance, so changes made via Saved Messages take effect immediately
// on the very next turn evaluation, mid-game included.
module.exports = new Settings();
