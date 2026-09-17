"use client";
import type { CommerceCatalogDto, CommerceItemDto, CommerceOrderDto } from "@lufa/contracts";
import { useEffect, useMemo, useState } from "react";
import styles from "./store.module.css";

const money = (minor: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(minor / 100);
const labels = { product: "Equipamiento", service: "Curso y servicio", tournament: "Inscripción" } as const;

export function Storefront() {
  const [catalog, setCatalog] = useState<CommerceCatalogDto | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { void fetch("/api/commerce/catalog", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message); setCatalog(body.data); }).catch(() => setMessage("No pudimos cargar la tienda.")); }, []);
  const selected = useMemo(() => catalog?.items.filter((item) => cart[item.id]) || [], [catalog, cart]);
  const total = selected.reduce((sum, item) => sum + item.effectivePriceMinor * cart[item.id]!, 0);
  function add(item: CommerceItemDto) {
    if (selected.length && selected[0]!.seller.id !== item.seller.id) { setMessage("Finalizá primero la compra del vendedor actual. Cada checkout pertenece a un solo vendedor."); return; }
    setMessage(""); setCart((value) => ({ ...value, [item.id]: Math.min((value[item.id] || 0) + 1, Math.min(item.stockQuantity ?? 10, 10)) }));
  }
  async function checkout() {
    if (!selected.length) return; setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/commerce/checkouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), items: selected.map((item) => ({ itemId: item.id, quantity: cart[item.id] })) }) });
      const body = await response.json() as { data?: CommerceOrderDto; message?: string };
      if (!response.ok || !body.data?.checkoutUrl) throw new Error(body.message || "No pudimos iniciar el pago.");
      window.location.assign(body.data.checkoutUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos iniciar el pago."); setLoading(false); }
  }
  if (!catalog && !message) return <p className={styles.state}>Cargando catálogo…</p>;
  return <div className={styles.market}>
    <section className={styles.catalog} aria-label="Catálogo">
      <div className={styles.catalogHeading}><div><p>Catálogo LUFA</p><h2>Productos con propósito</h2></div>{catalog?.hasActiveCredential ? <span className={styles.member}>Descuento Mi ID activo</span> : null}</div>
      {catalog?.items.length ? <div className={styles.grid}>{catalog.items.map((item) => <article className={styles.card} key={item.id}>
        <div className={styles.cardVisual}>{item.imageUrl ? <div className={styles.productImage} style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl).slice(1,-1)})` }} role="img" aria-label={item.title} /> : <span>{item.kind === "product" ? "🏈" : item.kind === "tournament" ? "🏆" : "📋"}</span>}<small>{labels[item.kind]}</small></div>
        <div className={styles.cardBody}><p className={styles.seller}>{item.seller.name}</p><h3>{item.title}</h3><p>{item.description}</p>{item.entitlementMonths ? <strong className={styles.entitlement}>Incluye Mi ID por {item.entitlementMonths} meses</strong> : null}
          <div className={styles.price}>{item.hasCredentialDiscount ? <s>{money(item.priceMinor)}</s> : null}<strong>{money(item.effectivePriceMinor)}</strong></div>
          <button onClick={() => add(item)} disabled={item.stockQuantity === 0}>{item.stockQuantity === 0 ? "Sin stock" : "Agregar"}</button>
        </div></article>)}</div> : <p className={styles.state}>Todavía no hay publicaciones activas.</p>}
    </section>
    <aside className={styles.cart}><p>Tu compra</p><h2>Carrito</h2>{selected.length ? <>{selected.map((item) => <div className={styles.line} key={item.id}><span>{item.title}<small>{cart[item.id]} × {money(item.effectivePriceMinor)}</small></span><button aria-label={`Quitar ${item.title}`} onClick={() => setCart((value) => { const next = { ...value }; delete next[item.id]; return next; })}>×</button></div>)}<div className={styles.total}><span>Total</span><strong>{money(total)}</strong></div><button className={styles.checkout} onClick={checkout} disabled={loading}>{loading ? "Preparando pago…" : "Pagar con Mercado Pago"}</button><small className={styles.secure}>Pago seguro en Mercado Pago. El estado se confirma en LUFA.</small></> : <p className={styles.empty}>Agregá un producto, curso o inscripción.</p>}{message ? <p className={styles.error} role="alert">{message}</p> : null}</aside>
  </div>;
}
