ALTER TABLE "commerce_items"
  ADD COLUMN "image_urls" JSONB,
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "details" JSONB,
  ADD COLUMN "pickup_instructions" TEXT;

CREATE TABLE "commerce_item_variants" (
  "id" TEXT NOT NULL,
  "item_id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "option_name" TEXT NOT NULL,
  "option_value" TEXT NOT NULL,
  "price_minor" INTEGER,
  "stock_quantity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commerce_item_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_item_variants_price_check" CHECK ("price_minor" IS NULL OR "price_minor" > 0),
  CONSTRAINT "commerce_item_variants_stock_check" CHECK ("stock_quantity" IS NULL OR "stock_quantity" >= 0)
);
CREATE UNIQUE INDEX "commerce_item_variants_item_id_sku_key" ON "commerce_item_variants"("item_id", "sku");
CREATE INDEX "commerce_item_variants_item_id_active_idx" ON "commerce_item_variants"("item_id", "active");
ALTER TABLE "commerce_item_variants" ADD CONSTRAINT "commerce_item_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "commerce_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commerce_orders" ADD COLUMN "pickup_instructions" TEXT;
UPDATE "commerce_orders" SET "fulfillment_status" = CASE WHEN EXISTS (SELECT 1 FROM "commerce_order_items" WHERE "commerce_order_items"."order_id" = "commerce_orders"."id" AND "kind" = 'product') THEN 'pending_fulfillment' ELSE 'not_required' END WHERE "fulfillment_status" = 'unfulfilled';
ALTER TABLE "commerce_orders" ALTER COLUMN "fulfillment_status" SET DEFAULT 'pending_fulfillment';

ALTER TABLE "commerce_order_items"
  ADD COLUMN "variant_id" TEXT,
  ADD COLUMN "variant_sku" TEXT,
  ADD COLUMN "variant_label" TEXT;
DROP INDEX IF EXISTS "commerce_order_items_order_id_item_id_key";
CREATE INDEX "commerce_order_items_variant_id_idx" ON "commerce_order_items"("variant_id");

ALTER TABLE "commerce_tournament_registrations"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "cancelled_at" TIMESTAMP(3);
CREATE INDEX "commerce_tournament_registrations_order_id_status_idx" ON "commerce_tournament_registrations"("order_id", "status");
