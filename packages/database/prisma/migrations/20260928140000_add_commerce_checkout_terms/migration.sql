ALTER TABLE "commerce_orders"
  ADD COLUMN "payment_mode" TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN "max_installments" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "payment_method_id" TEXT,
  ADD COLUMN "payment_method_type" TEXT,
  ADD COLUMN "payment_installments" INTEGER,
  ADD COLUMN "payment_installment_amount_minor" INTEGER;
