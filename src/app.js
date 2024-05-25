const express = require("express");
const app = express();
const port = 6978;

const fs = require("fs");
const path = require("path");

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
  
  const { serialize, db } = require("./db");

  serialize();

  const params_save = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM save", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });

  if (!params_save) {
    db.run("INSERT INTO save (start, total_count) VALUES (?, ?)", [0, 0]);
  } else {
    const { set_params } = require("./market");
    set_params(params_save.start, params_save.total_count);
  }

  console.log(`Server is running on port ${port}\nhttp://localhost:${port}`);

  const { fetch_market_data } = require("./market"); 
  setInterval(fetch_market_data, 30000);
});