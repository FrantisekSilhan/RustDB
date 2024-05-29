const fs = require("fs");
const path = require("path");

class Logger {
  constructor(level = "INFO") {
    this.levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    this.level = level;
  }

  log(level, message, error = null) {
    const levelIndex = this.levels.indexOf(level);
    if (levelIndex >= this.level) {
      const error_time = new Date().toISOString();
      const error_message = `[${error_time}] [${level.toUpperCase()}] ${message}${error === null ? "" : `:${error}`}\n`;
      console.log(error_message);
      fs.appendFileSync(path.join(__dirname, "..", "logs", "error.log"), error_message);
    }
  }

  debug(message) {
    this.log("DEBUG", message);
  }

  info(message) {
    this.log("INFO", message);
  }

  warn(message) {
    this.log("WARN", message);
  }

  error(message, error) {
    this.log("ERROR", message, error);
  }

  setLevel(level) {
    if (this.levels.includes(level)) {
      this.level = this.levels.indexOf(level);
    } else {
      console.error(`Invalid log level: ${level}`);
    }
  }
}

global.logger = new Logger("INFO");

module.exports = global.logger;