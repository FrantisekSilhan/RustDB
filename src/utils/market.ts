import { db, schema } from "@/db";
import axios from "axios";
import { inArray } from "drizzle-orm";

const params = {
  search_descriptions: 0,
  sort_column: "name",
  sort_dir: "desc",
  appid: 252490,
  norender: 1,
  count: 100,
  start: 0,
};

const url = "https://steamcommunity.com/market/search/render/";

interface MarketData {
  total_count: number;
  start: number;
}

interface MarketAPIItem {
  name: string;
  asset_description: {
    classid: string;
    background_color: string;
    icon_url: string;
  };
}

interface MarketAPIResponse {
  success: boolean;
  start: number;
  pagesize: number;
  total_count: number;
  results: MarketAPIItem[];
}

interface MarketItem {
  name: string;
  class_id: number;
  background_color: string;
  icon_url: string;
}

const setMarketData = (marketData: MarketData) => {
  params.start = marketData.start;
};

const loadLastMarketData = async (): Promise<void> => {
  const data = (await db
    .select()
    .from(schema.runtimeMarketData))[0];

  if (!data) {
    const newData = await db
      .insert(schema.runtimeMarketData)
      .values({
        start: 0,
        total_count: 0,
      })
      .returning();
    return setMarketData(newData[0]);
  }

  return setMarketData(data);
};

const fetchMarketDataBatch = async (): Promise<
  | {
      items: MarketItem[];
      total_count: number;
  }
  | null
> => {
  try {
    const response = await axios.get<MarketAPIResponse>(url, { params });
    const marketData = response.data;

    if (!marketData || marketData.success !== true) {
      throw new Error("Failed to fetch market data");
    }

    const items: MarketItem[] = Object.values(marketData.results).filter((item: MarketAPIItem) => {
      return item && item.name && item.asset_description && item.asset_description.classid && item.asset_description.background_color && item.asset_description.icon_url;
    }).map((item: MarketAPIItem) => {
      return {
        name: item.name,
        class_id: Number(item.asset_description.classid),
        background_color: item.asset_description.background_color,
        icon_url: item.asset_description.icon_url,
      }
    });

    return {
      items: items,
      total_count: marketData.total_count,
    }
  } catch (error: any) {
    console.error(`Error fetching market data; ${new Date().toISOString()}:`);
    if (error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    return null;
  }
};

const handleItemsResponse = async (items: MarketItem[]): Promise<null | {internal_id: number; name: string}[]> => {
  const existingItems = new Set((await db
    .select({ class_id: schema.itemMetadata.class_id })
    .from(schema.itemMetadata)
    .where(inArray(
      schema.itemMetadata.class_id,
      items.map((item) => Number(item.class_id)),
    ))).map((item) => item.class_id));

  const newItems = items.filter((item) => !existingItems.has(Number(item.class_id)));

  if (!newItems.length) return null;

  const internalIds = (await db
    .insert(schema.item)
    .values(newItems.map((item) => ({ name: item.name })))
    .returning({
      internal_id: schema.item.internal_id,
      name: schema.item.name,
    })
  ) as {
    internal_id: number;
    name: string;
  }[];

  const itemMetadata: {
    item_internal_id: number;
    class_id: number;
    background_color: string;
    icon_url: string;
  }[] = newItems.map((item, index) => ({
    item_internal_id: internalIds[index].internal_id,
    class_id: Number(item.class_id),
    background_color: item.background_color,
    icon_url: item.icon_url,
  }));

  await db
    .insert(schema.itemMetadata)
    .values(itemMetadata)

  return internalIds;
};

export const start = async ({delay}: {delay: number}) => {
  await loadLastMarketData();
  console.log(`Starting market data fetch with delay ${delay}ms in ${delay}ms; ${new Date().toISOString()}`);

  await iterate({delay});
};

const iterate = async ({delay}: {delay: number}) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  const marketData = await fetchMarketDataBatch();
  if (!marketData) return await iterate({delay}); // Error fetching data, we don't want to update the params

  const newItems = await handleItemsResponse(marketData.items);

  console.log(`Fetched ${marketData.items.length} new items; ${new Date().toISOString()}`);

  if (newItems) {
    await db
      .insert(schema.priorityQueue)
      .values(newItems.map((item) => ({
        item_internal_id: item.internal_id,
      })))
      .onConflictDoNothing();
  }

  params.start += params.count;

  if (params.start >= marketData.total_count) {
    params.start = 0;
  }

  await db.
    update(schema.runtimeMarketData)
    .set({
      start: params.start,
      total_count: marketData.total_count,
    });

  return await iterate({delay});
};