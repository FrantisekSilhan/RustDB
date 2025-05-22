import { db, schema } from "@/db";
import axios from "axios";
import { and, asc, gt, isNotNull } from "drizzle-orm";
import { fetchItemId, getPriorityItem, removePriorityItem } from "./priority";

type ItemSnapshot = typeof schema.itemSnapshot.$inferInsert;
type SellOrder = typeof schema.sellOrder.$inferInsert;
type BuyOrder = typeof schema.buyOrder.$inferInsert;
type SellOrderGraph = typeof schema.sellOrderGraph.$inferInsert;
type BuyOrderGraph = typeof schema.buyOrderGraph.$inferInsert;

const params: {
  country: string;
  language: string;
  currency: number;
  two_factor: number;
  norender: number;
  item_nameid: number | undefined;
} = {
  country: "US",
  language: "english",
  currency: 1,
  two_factor: 0,
  norender: 1,
  item_nameid: undefined,
};

const runtimeHistogramData: {
  item_internal_id: number | null;
  retry: boolean;
  retry_count: number;
} = {
  item_internal_id: null,
  retry: false,
  retry_count: 0,
}

const histogramUrl = "https://steamcommunity.com/market/itemordershistogram";

interface HistogramData {
  item_internal_id: number | null;
}

interface HistogramAPIResponse {
  success: number;
  sell_order_count: string;
  sell_order_price: string;
  sell_order_table: {
    price: string;
    price_with_fee: string;
    quantity: string;
  }[];
  buy_order_count: string;
  buy_order_price: string;
  buy_order_table: {
    price: string;
    quantity: string;
  }[];
  highest_buy_order: string;
  lowest_sell_order: string;
  buy_order_graph: [number, number, string][];
  sell_order_graph: [number, number, string][];
  graph_max_y: number;
  graph_min_x: number;
  graph_max_x: number;
  price_prefix: string;
  price_suffix: string;
}

const setHistogramData = (histogramData: HistogramData) => {
  runtimeHistogramData.item_internal_id = histogramData.item_internal_id;
};

const loadLastHistogramData = async (): Promise<void> => {
  const data = (await db
    .select()
    .from(schema.runtimeHistogramData))[0];

  if (!data) {
    const newData = await db
      .insert(schema.runtimeHistogramData)
      .values({
        item_internal_id: null,
      })
      .returning();
    return setHistogramData(newData[0]);
  }

  return setHistogramData(data);
};

const saveRuntimeHistogramData = async (data: HistogramData) => {
  await db
    .update(schema.runtimeHistogramData)
    .set({
      item_internal_id: data.item_internal_id,
    });
};

const getNextItemId = async (): Promise<
  | { item_id: number }
  | null
> => {
  if (runtimeHistogramData.item_internal_id !== null) {
    const nextItem = (await db
      .select()
      .from(schema.item)
      .where(
        and(
          gt(schema.item.internal_id, runtimeHistogramData.item_internal_id),
          isNotNull(schema.item.item_id),
        )
      )
      .orderBy(asc(schema.item.internal_id))
      .limit(1))[0];

    if (nextItem) {
      if (runtimeHistogramData.retry) {
        runtimeHistogramData.retry_count++;
        if (runtimeHistogramData.retry_count > 5) {
          runtimeHistogramData.retry = false;
          runtimeHistogramData.retry_count = 0;
        }
      }
      if (!runtimeHistogramData.retry) {
        runtimeHistogramData.item_internal_id = nextItem.internal_id;
        runtimeHistogramData.retry_count = 0;
        await saveRuntimeHistogramData(runtimeHistogramData);
      }
      return { item_id: nextItem.item_id! };
    }
  }

  const firstItem = (await db
    .select()
    .from(schema.item)
    .orderBy(asc(schema.item.internal_id))
    .where(isNotNull(schema.item.item_id))
    .limit(1))[0];

  if (firstItem) {
    if (runtimeHistogramData.retry) {
      runtimeHistogramData.retry_count++;
      if (runtimeHistogramData.retry_count > 5) {
        runtimeHistogramData.retry = false;
        runtimeHistogramData.retry_count = 0;
      }
    }
    if (!runtimeHistogramData.retry) {
      runtimeHistogramData.item_internal_id = firstItem.internal_id;
      runtimeHistogramData.retry_count = 0;
      await saveRuntimeHistogramData(runtimeHistogramData);
    }
    return { item_id: firstItem.item_id! };
  }
  
  return null;
};

const retry = (value: boolean) => {
  runtimeHistogramData.retry = value;
};

const createItemSnapshot = async (histogramData: HistogramAPIResponse) => {
  const item_internal_id = runtimeHistogramData.item_internal_id;
  retry(true);

  if (!item_internal_id) {
    return;
  }

  await db.transaction(async (tx) => {
    const itemSnapshot: ItemSnapshot = {
      item_internal_id: item_internal_id,
      total_sell_requests: Number(histogramData.sell_order_count),
      total_buy_requests: Number(histogramData.buy_order_count),
    };

    const snapshot = (await tx
      .insert(schema.itemSnapshot)
      .values(itemSnapshot)
      .returning({
        snapshot_id: schema.itemSnapshot.snapshot_id,
      }))[0];

    const sellOrdersGraph: SellOrderGraph[] = histogramData.sell_order_graph.map((item) => {
      return {
        snapshot_id: snapshot.snapshot_id,
        price: Math.floor(item[0] * 100),
        cumulative_quantity: item[1],
      };
    });

    const buyOrdersGraph: BuyOrderGraph[] = histogramData.buy_order_graph.map((item) => {
      return {
        snapshot_id: snapshot.snapshot_id,
        price: Math.floor(item[0] * 100),
        cumulative_quantity: item[1],
      };
    });

    const sellOrders: SellOrder[] = histogramData.sell_order_graph.map((item, i) => {
      const quantity = i === 0 ? item[1] : item[1] - histogramData.sell_order_graph[i - 1][1];
      return {
        snapshot_id: snapshot.snapshot_id,
        price: Math.floor(item[0] * 100),
        quantity: quantity,
      };
    });

    const buyOrders: BuyOrder[] = histogramData.buy_order_graph.map((item, i) => {
      const quantity = i === 0 ? item[1] : item[1] - histogramData.buy_order_graph[i - 1][1];
      return {
        snapshot_id: snapshot.snapshot_id,
        price: Math.floor(item[0] * 100),
        quantity: quantity,
      };
    });

    await tx
      .insert(schema.sellOrderGraph)
      .values(sellOrdersGraph);
    await tx
      .insert(schema.buyOrderGraph)
      .values(buyOrdersGraph);
    await tx
      .insert(schema.sellOrder)
      .values(sellOrders);
    await tx
      .insert(schema.buyOrder)
      .values(buyOrders);

    retry(false);
  });
};

const fetchHistogramData = async () => {
  if (!params.item_nameid) return false;
  try {
    const response = await axios.get<HistogramAPIResponse>(histogramUrl, {
      params,
      headers: {
        "Referer": `${histogramUrl}?${new URLSearchParams(params as any).toString()}`,
      }
    });
    const histogramData = response.data;

    if (!histogramData || histogramData.success !== 1) {
      throw new Error("Invalid histogram data");
    }

    await createItemSnapshot(histogramData);
    return true;
  } catch (error: any) {
    console.error(`Error fetching histogram data; ${new Date().toISOString()}:`);
    if (error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    return false;
  }
};

export const start = async ({delay}: {delay: number}) => {
  await loadLastHistogramData();
  console.log(`Starting histogram data fetch with delay ${delay}ms in ${delay}ms; ${new Date().toISOString()}`);

  await iterate({delay});
};

const iterate = async ({delay}: {delay: number}) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  const priorityItem = await getPriorityItem();
  if (priorityItem) {
    const item = await fetchItemId({item_name: priorityItem.name, item_internal_id: priorityItem.item_internal_id});
    removePriorityItem(item);
    return await iterate({delay});
  }

  const nextItem = await getNextItemId();
  if (!nextItem) {
    retry(true);
    return await iterate({delay});
  }
  params.item_nameid = nextItem.item_id;
  if (!await fetchHistogramData()) {
    retry(true);
    return await iterate({delay});
  }
  params.item_nameid = undefined;
  return await iterate({delay});
};