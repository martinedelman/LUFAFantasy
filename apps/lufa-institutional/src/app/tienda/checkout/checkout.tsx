"use client";

import type { CommerceCheckoutQuoteDto } from "@lufa/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cartLineKey, checkoutAttempt, discardRejectedCheckoutAttempt, rememberCheckoutOrder, type StorePaymentMode, useStoreCart } from "@/lib/store-cart";
import styles from "../store.module.css";

const money = (minor: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(minor / 100);

export function StoreCheckout() {
  const { cart, setCart } = useStoreCart();
  const [quote, setQuote] = useState<CommerceCheckoutQuoteDto | null>(null);
  const [paymentMode, setPaymentMode] = useState<StorePaymentMode>("cash");
  const [error, setError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQuote = useCallback(async () => {
    if (!cart.length) { setQuote(null); return; }
    setLoadingQuote(true);
    try {
      const response = await fetch("/api/commerce/checkouts/quote", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart }),
      });
      const body = await response.json() as { data?: CommerceCheckoutQuoteDto; message?: string };
      if (!response.ok || !body.data) throw new Error(body.message || "No pudimos actualizar el checkout.");
      setQuote(body.data); setError("");
    } catch (cause) {
      setQuote(null); setError(cause instanceof Error ? cause.message : "No pudimos actualizar el checkout.");
    } finally { setLoadingQuote(false); }
  }, [cart]);

  useEffect(() => { void loadQuote(); }, [loadQuote]);

  function changeQuantity(itemId: string, variantId: string | null, quantity: number) {
    setCart((current) => current.map((line) => cartLineKey(line) === cartLineKey({ itemId, variantId }) ? { ...line, quantity } : line));
  }

  async function continueToPayment() {
    if (!quote || submitting) return;
    setSubmitting(true); setError("");
    try {
      const attempt = checkoutAttempt(cart, paymentMode);
      const response = await fetch("/api/commerce/checkouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: attempt.idempotencyKey, paymentMode, items: cart }),
      });
      const body = await response.json() as { data?: { id: string; checkoutUrl: string | null }; message?: string };
      if (!response.ok || !body.data?.checkoutUrl) {
        if (response.status === 422) discardRejectedCheckoutAttempt(cart, paymentMode);
        throw new Error(body.message || "No pudimos iniciar el pago.");
      }
      rememberCheckoutOrder(cart, paymentMode, body.data.id);
      window.location.assign(body.data.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos iniciar el pago.");
      setSubmitting(false);
    }
  }

  if (!cart.length) return <section className={styles.checkoutEmpty}><p>Tu compra</p><h1>Tu carrito está vacío</h1><span>Elegí productos, cursos o inscripciones para continuar.</span><Link href="/tienda">Ver catálogo</Link></section>;

  return <section className={styles.checkoutPage}>
    <div className={styles.checkoutTitle}><p>Tu compra</p><h1>Revisá y elegí cómo pagar</h1><span>El precio se confirma con el catálogo de LUFA antes de enviarte a Mercado Pago.</span></div>
    <div className={styles.checkoutLayout}>
      <section className={styles.checkoutPanel} aria-busy={loadingQuote}>
        <div className={styles.checkoutPanelHead}><h2>Productos</h2><Link href="/tienda">Seguir comprando</Link></div>
        {quote?.items.map((item) => <article className={styles.checkoutLine} key={`${item.itemId}:${item.variantId || "base"}`}>
          <div><strong>{item.title}{item.variantLabel ? ` · ${item.variantLabel}` : ""}</strong><span>{money(item.unitPriceMinor - item.unitDiscountMinor)} cada uno</span></div>
          <div className={styles.quantity}><button aria-label={`Restar ${item.title}`} onClick={() => item.quantity === 1 ? setCart((current) => current.filter((line) => cartLineKey(line) !== cartLineKey(item))) : changeQuantity(item.itemId, item.variantId, item.quantity - 1)}>−</button><b>{item.quantity}</b><button aria-label={`Sumar ${item.title}`} disabled={item.quantity >= 10} onClick={() => changeQuantity(item.itemId, item.variantId, item.quantity + 1)}>+</button></div>
          <strong>{money((item.unitPriceMinor - item.unitDiscountMinor) * item.quantity)}</strong>
        </article>) || <p className={styles.quoteLoading}>Actualizando los precios del checkout…</p>}
      </section>
      <aside className={styles.checkoutSummary}>
        <p>Resumen</p><h2>{quote?.seller.name || "Tienda LUFA"}</h2>
        {quote ? <><div className={styles.summaryRow}><span>Subtotal</span><strong>{money(quote.subtotalMinor)}</strong></div>{quote.discountMinor ? <div className={styles.summaryRow}><span>Descuento Mi ID</span><strong>− {money(quote.discountMinor)}</strong></div> : null}<div className={styles.summaryTotal}><span>Total comercial</span><strong>{money(quote.totalMinor)}</strong></div></> : null}
        <fieldset className={styles.paymentModes}><legend>Forma de pago</legend><label className={paymentMode === "cash" ? styles.paymentModeActive : styles.paymentMode}><input type="radio" name="payment-mode" value="cash" checked={paymentMode === "cash"} onChange={() => setPaymentMode("cash")} /><span><b>Al contado</b><small>Un pago.</small></span></label><label className={paymentMode === "installments" ? styles.paymentModeActive : styles.paymentMode}><input type="radio" name="payment-mode" value="installments" checked={paymentMode === "installments"} onChange={() => setPaymentMode("installments")} /><span><b>En cuotas</b><small>Hasta 12 cuotas con tarjeta de crédito.</small></span></label></fieldset>
        <p className={styles.financingNote}>Mercado Pago calcula y muestra el costo financiero y el total definitivo antes de que confirmes. LUFA no agrega una comisión propia.</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.payButton} disabled={!quote || loadingQuote || submitting} onClick={() => void continueToPayment()}>{submitting ? "Abriendo Mercado Pago…" : "Ir a Mercado Pago"}</button>
      </aside>
    </div>
  </section>;
}
