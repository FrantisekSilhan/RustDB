const axios = require("axios");
const fs = require("fs");
const path = require("path");

const params = {
  "search_descriptions": 0,
  "sort_column": "name",
  "sort_dir": "desc",
  "appid": 252490,
  "norender": 1,
  "count": 100,
  "start": 0,
};

const url = "https://steamcommunity.com/market/search/render/";

let total_count = 0;

const set_params = (start, totalCount) => {
  params.start = start;
  total_count = totalCount;
}

const fetch_market_data = async () => {
  try {
    const response = await axios.get(url, { params });
    const { data } = response;

    if (data.success !== true) {
      throw new Error("Steam returned success false");
    }

    total_count = data.total_count;

    const items = Object.values(data.results).filter((item) => item.name && item.sell_price && item.sell_listings).map((item) => {
      return {
        name: item.name,
        sell_price: item.sell_price,
        sell_listings: item.sell_listings,
      };
    });

    const { db } = require("./db");

    for (const item of items) {
      const dbItem = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM items WHERE name = ?", [item.name], (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(row);
        });
      });

      if (!dbItem) {
        db.run("INSERT INTO items (name, sell_price, sell_listings) VALUES (?, ?, ?)", [item.name, item.sell_price, item.sell_listings]);
      } else {
        db.run("UPDATE items SET sell_price = ?, sell_listings = ? WHERE name = ?", [item.sell_price, item.sell_listings, item.name]);
      }
    }

    const new_start = data.start + data.pagesize;
    params.start = new_start > total_count ? 0 : new_start;

    db.run("UPDATE save SET start = ?, total_count = ?", [params.start, total_count]);
    db.close();
  } catch (error) {
    const error_time = new Date().toLocaleString();
    const error_message = `Error fetching market data at ${error_time}: ${error}\n`;
    console.error(error_message);
    fs.appendFileSync(path.join(__dirname, "..", "logs", "error.log"), error_message);
  }
};

module.exports = { fetch_market_data, set_params };