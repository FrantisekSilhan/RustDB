CREATE TABLE "histogram_priority_queue" (
	"item_internal_id" bigint NOT NULL,
	CONSTRAINT "histogram_priority_queue_item_internal_id_unique" UNIQUE("item_internal_id")
);
--> statement-breakpoint
ALTER TABLE "histogram_priority_queue" ADD CONSTRAINT "histogram_priority_queue_item_internal_id_items_internal_id_fk" FOREIGN KEY ("item_internal_id") REFERENCES "public"."items"("internal_id") ON DELETE no action ON UPDATE no action;