CREATE TABLE "buy_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_snapshot_id" bigint NOT NULL,
	"price" bigint NOT NULL,
	"quantity" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buy_order_graphs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_snapshot_id" bigint NOT NULL,
	"price" bigint NOT NULL,
	"quantity" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"internal_id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"item_id" bigint,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_name_unique" UNIQUE("name"),
	CONSTRAINT "items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "item_metadata" (
	"item_internal_id" bigint PRIMARY KEY NOT NULL,
	"class_id" bigint NOT NULL,
	"background_color" text DEFAULT '000000' NOT NULL,
	"icon_url" text NOT NULL,
	CONSTRAINT "item_metadata_class_id_unique" UNIQUE("class_id")
);
--> statement-breakpoint
CREATE TABLE "item_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_internal_id" bigint NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"total_sell_requests" bigint DEFAULT 0 NOT NULL,
	"total_buy_requests" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_queue" (
	"item_internal_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_histogram_data" (
	"item_internal_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_market_data" (
	"start" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sell_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_snapshot_id" bigint NOT NULL,
	"price" bigint NOT NULL,
	"quantity" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sell_order_graphs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_snapshot_id" bigint NOT NULL,
	"price" bigint NOT NULL,
	"quantity" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buy_orders" ADD CONSTRAINT "buy_orders_item_snapshot_id_item_snapshots_id_fk" FOREIGN KEY ("item_snapshot_id") REFERENCES "public"."item_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buy_order_graphs" ADD CONSTRAINT "buy_order_graphs_item_snapshot_id_item_snapshots_id_fk" FOREIGN KEY ("item_snapshot_id") REFERENCES "public"."item_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_metadata" ADD CONSTRAINT "item_metadata_item_internal_id_items_internal_id_fk" FOREIGN KEY ("item_internal_id") REFERENCES "public"."items"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_snapshots" ADD CONSTRAINT "item_snapshots_item_internal_id_items_internal_id_fk" FOREIGN KEY ("item_internal_id") REFERENCES "public"."items"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_queue" ADD CONSTRAINT "priority_queue_item_internal_id_items_internal_id_fk" FOREIGN KEY ("item_internal_id") REFERENCES "public"."items"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_histogram_data" ADD CONSTRAINT "runtime_histogram_data_item_internal_id_items_internal_id_fk" FOREIGN KEY ("item_internal_id") REFERENCES "public"."items"("internal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell_orders" ADD CONSTRAINT "sell_orders_item_snapshot_id_item_snapshots_id_fk" FOREIGN KEY ("item_snapshot_id") REFERENCES "public"."item_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sell_order_graphs" ADD CONSTRAINT "sell_order_graphs_item_snapshot_id_item_snapshots_id_fk" FOREIGN KEY ("item_snapshot_id") REFERENCES "public"."item_snapshots"("id") ON DELETE no action ON UPDATE no action;