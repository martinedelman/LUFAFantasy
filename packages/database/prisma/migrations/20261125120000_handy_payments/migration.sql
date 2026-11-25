-- Reemplaza Mercado Pago por el Botón de Pago Handy.
-- Handy no admite configurar cuotas: se eliminan las columnas de financiación.
ALTER TABLE "commerce_orders"
  DROP COLUMN "payment_mode",
  DROP COLUMN "max_installments",
  DROP COLUMN "payment_installments",
  DROP COLUMN "payment_installment_amount_minor",
  ADD COLUMN "payment_due_at" TIMESTAMP(3),
  ADD COLUMN "invoice_number" SERIAL NOT NULL;

CREATE UNIQUE INDEX "commerce_orders_invoice_number_key" ON "commerce_orders"("invoice_number");

-- IVA incluido en el precio, por ítem (puntos básicos) y copiado en cada línea de la orden.
ALTER TABLE "commerce_items" ADD COLUMN "vat_rate_bps" INTEGER NOT NULL DEFAULT 2200;
ALTER TABLE "commerce_order_items" ADD COLUMN "vat_rate_bps" INTEGER NOT NULL DEFAULT 2200;

ALTER TABLE "commerce_refund_requests" ADD COLUMN "provider_message" TEXT;
