import { sql, type SQL } from "drizzle-orm";
import { bigint, bigserial, integer, pgTable, text, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";

export const lower = (column: AnyPgColumn): SQL => {
  return sql`LOWER(${column})`;
};

export const item = pgTable("items", {
  internal_id: bigserial("internal_id", { mode: "number" })
    .primaryKey(),
  name: text("name")
    .notNull()
    .unique(),
  item_id: bigint("item_id", { mode: "number" }) // Item ID, has to be scraped from market listings
    .unique(),
  added_at: timestamp("added_at")
    .notNull()
    .defaultNow(),
  });
  
export const itemMetadata = pgTable("item_metadata", {
  item_internal_id: bigint("item_internal_id", { mode: "number" })
    .notNull()
    .primaryKey()
    .references(() => item.internal_id),
  class_id: bigint("class_id", { mode: "number" })
    .notNull()
    .unique(),
  background_color: text("background_color")
    .notNull()
    .default("000000"),
  icon_url: text("icon_url")
    .notNull(),
});

export const itemSnapshot = pgTable("item_snapshots", {
  snapshot_id: bigserial("id", { mode: "number" })
    .primaryKey(),
  item_internal_id: bigint("item_internal_id", { mode: "number" })
    .notNull()
    .references(() => item.internal_id),
  fetched_at: timestamp("fetched_at")
    .notNull()
    .defaultNow(),
  total_sell_requests: bigint("total_sell_requests", { mode: "number" })
    .notNull()
    .default(0),
  total_buy_requests: bigint("total_buy_requests", { mode: "number" })
    .notNull()
    .default(0),
});

export const sellOrder = pgTable("sell_orders", {
  sell_order_id: bigserial("id", { mode: "number" })
    .primaryKey(),
  snapshot_id: bigint("item_snapshot_id", { mode: "number" })
    .notNull()
    .references(() => itemSnapshot.snapshot_id),
  price: bigint("price", { mode: "number" })
    .notNull(),
  quantity: bigint("quantity", { mode: "number" })
    .notNull(),
});

export const buyOrder = pgTable("buy_orders", {
  buy_order_id: bigserial("id", { mode: "number" })
    .primaryKey(),
  snapshot_id: bigint("item_snapshot_id", { mode: "number" })
    .notNull()
    .references(() => itemSnapshot.snapshot_id),
  price: bigint("price", { mode: "number" })
    .notNull(),
  quantity: bigint("quantity", { mode: "number" })
    .notNull(),
});

export const sellOrderGraph = pgTable("sell_order_graphs", {
  sell_order_graph_id: bigserial("id", { mode: "number" })
    .primaryKey(),
  snapshot_id: bigint("item_snapshot_id", { mode: "number" })
    .notNull()
    .references(() => itemSnapshot.snapshot_id),
  price: bigint("price", { mode: "number" })
    .notNull(),
  cumulative_quantity: bigint("quantity", { mode: "number" })
    .notNull(),
});

export const buyOrderGraph = pgTable("buy_order_graphs", {
  buy_order_graph_id: bigserial("id", { mode: "number" })
    .primaryKey(),
  snapshot_id: bigint("item_snapshot_id", { mode: "number" })
    .notNull()
    .references(() => itemSnapshot.snapshot_id),
  price: bigint("price", { mode: "number" })
    .notNull(),
  cumulative_quantity: bigint("quantity", { mode: "number" })
    .notNull(),
});

export const runtimeMarketData = pgTable("runtime_market_data", {
  start: integer("start")
    .notNull()
    .default(0),
  total_count: integer("total_count")
    .notNull()
    .default(0),
});

export const runtimeHistogramData = pgTable("runtime_histogram_data", {
  item_internal_id: bigint("item_internal_id", { mode: "number" })
    .references(() => item.internal_id),
});

export const priorityQueue = pgTable("priority_queue", {
  item_internal_id: bigint("item_internal_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => item.internal_id),
});

export const histogramPriorityQueue = pgTable("histogram_priority_queue", {
  item_internal_id: bigint("item_internal_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => item.internal_id),
});