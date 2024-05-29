const express = require("express");
const app = express();
const port = 6978;

const fs = require("fs");
const path = require("path");
const logger = require("./logger");
logger.setLevel("INFO");

app.use(express.urlencoded({ extended: true }));

app.get("/api/item", async (req, res) => {
  const item = req.query.item;
  const { db } = require("./db");

  try {
    const dbItem = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM items WHERE LOWER(name) = ?", [item.toLowerCase()], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
  
        resolve(row);
      });
    });

    if (!dbItem) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    return res.json({ success: true, data: dbItem });
  } catch (err) {
    fs.appendFileSync(path.join(__dirname, "..", "logs", "error.log"), `Error fetching item ${item}: ${err}\n`);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.use((_, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.listen(port, async () => {
  const paths = [
    path.join(__dirname, "..", "data"),
    path.join(__dirname, "..", "logs"),
  ];
  
  paths.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  });
  
  require("./db").serialize();

  logger.debug(`Server is running on port ${port}\nhttp://localhost:${port}`);

  const { fetch_market_data, load_last_params } = require("./market"); 
  const { fetch_histogram_data, load_last_items_save } = require("./histogram");
  load_last_params();
  load_last_items_save();
  setInterval(fetch_market_data, 30000);
  setTimeout(() => {
    fetch_histogram_data();
    setInterval(fetch_histogram_data, 15000);
  }, 40000);
});