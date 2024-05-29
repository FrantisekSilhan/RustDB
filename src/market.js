const axios = require("axios");
const logger = require("./logger");

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

const load_last_params = async () => {
  logger.debug("Loading last params");
  const { db } = require("./db");
  const params_save = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM render_save", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });

  if (!params_save) {
    db.run("INSERT INTO render_save (start, total_count) VALUES (?, ?)", [0, 0]);
  } else {
    set_params(params_save.start, params_save.total_count);
  }
  logger.debug("Loaded last params");
}

const fetch_market_data = async () => {
  logger.debug("Fetching market data");
  try {
    const response = await axios.get(url, { params });
    const { data } = response;

    if (data && data.success !== true) {
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
        const item_id = await new Promise((resolve, reject) => {
          db.run("INSERT INTO items (name) VALUES (?)",
            [item.name],
            function(err) {
              err ? reject(err) : resolve(this.lastID)
            }
          );
        });

        db.run("INSERT INTO item_listings (id, sell_price, sell_listings) VALUES (?, ?, ?)", [item_id, item.sell_price, item.sell_listings]);
      } else {
        db.run("UPDATE item_listings SET sell_price = ?, sell_listings = ? WHERE id = ?", [item.sell_price, item.sell_listings, dbItem.id]);
      }
    }

    const new_start = data.start + data.pagesize;
    params.start = new_start > total_count ? 0 : new_start;

    db.run("UPDATE render_save SET start = ?, total_count = ?", [params.start, total_count]);
  } catch (error) {
    logger.error("Failed to fetch market data", error);
  }
};

module.exports = { fetch_market_data, set_params, load_last_params };