const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const logger = require("./logger");

const dbPath = path.join(__dirname, "..", "data", "app.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error("Failed to connect to the database", err);
    return;
  }
  logger.info("Connected to the database.");
});

const serialize = () => {
  db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS item_identifiers (id INTEGER UNIQUE, item_id INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS item_listings (id INTEGER UNIQUE, sell_price INTEGER, sell_listings INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS item_instant_listings (id INTEGER UNIQUE, insta_sell_price INTEGER, insta_buy_price INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS render_save (start INTEGER, total_count INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS items_save (previous_id INTEGER)");
  });
}

module.exports = { db, serialize };