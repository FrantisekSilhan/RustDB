import { db, schema } from "@/db";
import axios from "axios";
import { asc, eq } from "drizzle-orm";

const listingsUrl = "https://steamcommunity.com/market/listings/252490/";

export const getPriorityItem = async (): Promise<
  | { item_internal_id: number; name: string }
  | null
> => {
  const item = (await db
    .select()
    .from(schema.priorityQueue)
    .innerJoin(schema.item, eq(schema.priorityQueue.item_internal_id, schema.item.internal_id))
    .orderBy(asc(schema.item.internal_id))
    .limit(1))[0];

  if (!item || !item.items || !item.priority_queue) {
    return null;
  }

  return { item_internal_id: item.priority_queue.item_internal_id, name: item.items.name };
};

export const removePriorityItem = async (item: { item_internal_id: number; item_id: number; name: string } | null) => {
  if (!item) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.item)
      .set({
        item_id: item.item_id,
      })
      .where(eq(schema.item.internal_id, item.item_internal_id));
      
    await tx
      .delete(schema.priorityQueue)
      .where(eq(schema.priorityQueue.item_internal_id, item.item_internal_id));
  });
};

export const fetchItemId = async ({item_name, item_internal_id}: {item_name: string; item_internal_id: number}): Promise<
  | { item_internal_id: number; item_id: number; name: string }
  | null
> => {
  const itemUrl = `${listingsUrl}${encodeURIComponent(item_name)}`;
  
  try {
    const response = await axios.get(itemUrl, {
      headers: {
        "Referer": itemUrl,
      }
    }); // returns text/html; charset=UTF-8

    if (response.status !== 200) {
      return null;
    }

    const html = response.data as string;

    const regex = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/g;
    const match = html.match(regex);
    const itemId = match ? match[0].split(" ")[1].trim() : null;

    if (!itemId) {
      return null;
    }

    const itemIdNumber = parseInt(itemId, 10);
    if (isNaN(itemIdNumber)) {
      return null;
    }

    return {
      item_internal_id: item_internal_id,
      item_id: itemIdNumber,
      name: item_name,
    };
  } catch (error: any) {
    console.error(`Error fetching item ID for ${item_name}; ${new Date().toISOString()}:`);
    if (error.status === 403) {
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    return null;
  }
};