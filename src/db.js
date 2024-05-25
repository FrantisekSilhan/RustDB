const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "app.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log("Connected to the database.");
});

const serialize = () => {
  db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS items (name TEXT, sell_price INTEGER, sell_listings INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS save (start INTEGER, total_count INTEGER)")
  });
}

module.exports = { db, serialize };