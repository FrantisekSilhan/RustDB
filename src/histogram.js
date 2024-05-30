const axios = require("axios");
const logger = require("./logger");

const items_save = {
  "previous_id": 0,
};

const listings_url = "https://steamcommunity.com/market/listings/252490/";
const histogram_url = "https://steamcommunity.com/market/itemordershistogram?country=US&language=english&currency=1&two_factor=0&item_nameid=";

const set_params = (previous_id) => {
  items_save.previous_id = previous_id;
}

const load_last_items_save = async () => {
  logger.debug("Loading last items save");
  const { db } = require("./db");
  const items_save = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM items_save", (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });

  if (!items_save) {
    db.run("INSERT INTO items_save (previous_id) VALUES (?)", 0);
  } else {
    set_params(items_save.previous_id);
  }
  logger.debug("Loaded last items save");
}

const fetch_histogram_data = async () => {
  logger.debug("Fetching histogram data");
  const { db } = require("./db");

  try {
    let item = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM items WHERE id > ? ORDER BY id ASC LIMIT 1",
        [items_save.previous_id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!item) {
      logger.debug("No new items found, fetching first item");
      item = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM items ORDER BY id ASC LIMIT 1",
          (err, row) => err ? reject(err) : resolve(row)
        );
      });
    }

    let item_id = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM item_identifiers WHERE id = ?",
        [item.id],
        (err, row) => err ? reject(err) : resolve(row ? row.item_id : null)
      );
    });

    if (!item_id) {
      logger.debug("No item id found, fetching item id");
      const item_url = `${listings_url}${encodeURIComponent(item.name)}`;
      logger.debug(`Item URL: ${item_url}`);

      try {
        const response = await axios.get(item_url, { Headers: {
          "Referer": item_url
        } });
    
        const regex = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/g;
        const lines = response.data.match(regex);
        item_id = lines[0].split(" ")[1];
    
        if (!item_id) {
          throw new Error("No item id found");
        }
    
        db.run("INSERT OR REPLACE INTO item_identifiers (id, item_id) VALUES (?, ?)", [item.id, item_id]);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (error) {
        logger.error("Error fetching item id", error);
        return;
      }
    }

    const item_url = `${histogram_url}${item_id}`;
    logger.debug(`Fetching histogram data for ${item.name} (${item.id})`);
    logger.debug(`Item URL: ${item_url}`);

    try {
      const response = await axios.get(item_url, { Headers: {
        "Referer": item_url
      } });

      logger.debug(`Response: ${response.data}`);

      const { data } = response;

      if (data && data.success !== 1) {
        throw new Error("Steam returned success false");
      }

      const histogram = {
        "insta_sell_price": data.highest_buy_order,
        "insta_buy_price": data.lowest_sell_order
      };

      db.run("INSERT OR REPLACE INTO item_instant_listings (id, insta_sell_price, insta_buy_price) VALUES (?, ?, ?)", [item.id, histogram.insta_sell_price, histogram.insta_buy_price]);

      items_save.previous_id = item.id;
      db.run("UPDATE items_save SET previous_id = ?", [items_save.previous_id]);
    } catch (error) {
      logger.error("Error fetching histogram data", error);
      return;
    }
  } catch (error) {
    logger.error("Error fetching histogram data", error);
    return;
  }
};

module.exports = { fetch_histogram_data, set_params, load_last_items_save };