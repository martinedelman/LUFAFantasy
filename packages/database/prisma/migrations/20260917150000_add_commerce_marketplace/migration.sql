CREATE TABLE "commerce_sellers" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'partner',
  "status" TEXT NOT NULL DEFAULT 'active', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "commerce_sellers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "commerce_seller_members" (
  "id" TEXT NOT NULL, "seller_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'manager',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "commerce_seller_members_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "commerce_items" (
  "id" TEXT NOT NULL, "seller_id" TEXT NOT NULL, "tournament_id" TEXT, "slug" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "image_url" TEXT, "price_minor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UYU', "credential_discount_bps" INTEGER NOT NULL DEFAULT 0, "stock_quantity" INTEGER,
  "entitlement_months" INTEGER, "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "commerce_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_items_price_check" CHECK ("price_minor" > 0),
  CONSTRAINT "commerce_items_currency_check" CHECK ("currency" = 'UYU'),
  CONSTRAINT "commerce_items_discount_check" CHECK ("credential_discount_bps" BETWEEN 0 AND 9000),
  CONSTRAINT "commerce_items_stock_check" CHECK ("stock_quantity" IS NULL OR "stock_quantity" >= 0),
  CONSTRAINT "commerce_items_entitlement_check" CHECK ("entitlement_months" IS NULL OR "entitlement_months" IN (6, 12))
);
CREATE TABLE "commerce_orders" (
  "id" TEXT NOT NULL, "buyer_user_id" TEXT NOT NULL, "seller_id" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'creating',
  "fulfillment_status" TEXT NOT NULL DEFAULT 'unfulfilled', "currency" TEXT NOT NULL DEFAULT 'UYU', "subtotal_minor" INTEGER NOT NULL,
  "discount_minor" INTEGER NOT NULL DEFAULT 0, "total_minor" INTEGER NOT NULL, "idempotency_key" TEXT NOT NULL,
  "payload_fingerprint" TEXT NOT NULL, "provider_order_id" TEXT, "provider_status" TEXT, "checkout_url" TEXT,
  "live_mode" BOOLEAN NOT NULL, "reservation_expires_at" TIMESTAMP(3) NOT NULL, "paid_at" TIMESTAMP(3),
  "fulfilled_at" TIMESTAMP(3), "cancelled_at" TIMESTAMP(3), "refunded_minor" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_orders_amounts_check" CHECK ("subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "total_minor" > 0 AND "refunded_minor" >= 0)
);
CREATE TABLE "commerce_order_items" (
  "id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "item_id" TEXT NOT NULL, "title" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "unit_price_minor" INTEGER NOT NULL, "unit_discount_minor" INTEGER NOT NULL DEFAULT 0,
  "entitlement_months" INTEGER, CONSTRAINT "commerce_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_order_items_amounts_check" CHECK ("quantity" > 0 AND "unit_price_minor" > 0 AND "unit_discount_minor" >= 0)
);
CREATE TABLE "commerce_webhook_events" (
  "id" TEXT NOT NULL, "delivery_key" TEXT NOT NULL, "provider_resource_id" TEXT NOT NULL, "action" TEXT NOT NULL,
  "live_mode" BOOLEAN NOT NULL, "status" TEXT NOT NULL DEFAULT 'received', "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT, "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processed_at" TIMESTAMP(3),
  CONSTRAINT "commerce_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "commerce_tournament_registrations" (
  "id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "item_id" TEXT NOT NULL, "tournament_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_tournament_registrations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "commerce_refund_requests" (
  "id" TEXT NOT NULL, "order_id" TEXT NOT NULL, "requested_by_id" TEXT NOT NULL, "amount_minor" INTEGER NOT NULL,
  "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'requested', "provider_refund_id" TEXT, "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commerce_refund_requests_pkey" PRIMARY KEY ("id"), CONSTRAINT "commerce_refund_requests_amount_check" CHECK ("amount_minor" > 0)
);

CREATE UNIQUE INDEX "commerce_sellers_slug_key" ON "commerce_sellers"("slug");
CREATE INDEX "commerce_sellers_status_name_idx" ON "commerce_sellers"("status", "name");
CREATE UNIQUE INDEX "commerce_seller_members_seller_id_user_id_key" ON "commerce_seller_members"("seller_id", "user_id");
CREATE INDEX "commerce_seller_members_user_id_idx" ON "commerce_seller_members"("user_id");
CREATE UNIQUE INDEX "commerce_items_slug_key" ON "commerce_items"("slug");
CREATE INDEX "commerce_items_seller_id_active_idx" ON "commerce_items"("seller_id", "active");
CREATE INDEX "commerce_items_kind_active_idx" ON "commerce_items"("kind", "active");
CREATE UNIQUE INDEX "commerce_orders_idempotency_key_key" ON "commerce_orders"("idempotency_key");
CREATE UNIQUE INDEX "commerce_orders_provider_order_id_key" ON "commerce_orders"("provider_order_id");
CREATE INDEX "commerce_orders_buyer_user_id_created_at_idx" ON "commerce_orders"("buyer_user_id", "created_at");
CREATE INDEX "commerce_orders_seller_id_created_at_idx" ON "commerce_orders"("seller_id", "created_at");
CREATE INDEX "commerce_orders_status_reservation_expires_at_idx" ON "commerce_orders"("status", "reservation_expires_at");
CREATE UNIQUE INDEX "commerce_order_items_order_id_item_id_key" ON "commerce_order_items"("order_id", "item_id");
CREATE INDEX "commerce_order_items_item_id_idx" ON "commerce_order_items"("item_id");
CREATE UNIQUE INDEX "commerce_webhook_events_delivery_key_key" ON "commerce_webhook_events"("delivery_key");
CREATE INDEX "commerce_webhook_events_status_received_at_idx" ON "commerce_webhook_events"("status", "received_at");
CREATE INDEX "commerce_webhook_events_provider_resource_id_received_at_idx" ON "commerce_webhook_events"("provider_resource_id", "received_at");
CREATE UNIQUE INDEX "commerce_tournament_registrations_item_id_user_id_key" ON "commerce_tournament_registrations"("item_id", "user_id");
CREATE INDEX "commerce_tournament_registrations_tournament_id_created_at_idx" ON "commerce_tournament_registrations"("tournament_id", "created_at");
CREATE UNIQUE INDEX "commerce_refund_requests_provider_refund_id_key" ON "commerce_refund_requests"("provider_refund_id");
CREATE INDEX "commerce_refund_requests_order_id_created_at_idx" ON "commerce_refund_requests"("order_id", "created_at");
CREATE INDEX "commerce_refund_requests_status_created_at_idx" ON "commerce_refund_requests"("status", "created_at");

ALTER TABLE "commerce_seller_members" ADD CONSTRAINT "commerce_seller_members_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "commerce_sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_seller_members" ADD CONSTRAINT "commerce_seller_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "commerce_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_items" ADD CONSTRAINT "commerce_items_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "commerce_sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "commerce_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_tournament_registrations" ADD CONSTRAINT "commerce_tournament_registrations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_tournament_registrations" ADD CONSTRAINT "commerce_tournament_registrations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "commerce_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_tournament_registrations" ADD CONSTRAINT "commerce_tournament_registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_tournament_registrations" ADD CONSTRAINT "commerce_tournament_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_refund_requests" ADD CONSTRAINT "commerce_refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commerce_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "commerce_sellers" ("id", "slug", "name", "kind", "status", "created_at", "updated_at")
VALUES ('seller_lufa', 'lufa', 'LUFA', 'lufa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
