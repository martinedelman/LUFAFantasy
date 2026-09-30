"use client";
import type { CommerceCatalogDto, CommerceItemDto, CommerceItemVariantDto } from "@lufa/contracts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartLineKey, useStoreCart } from "@/lib/store-cart";
import styles from "./store.module.css";

const money = (minor: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(minor / 100);
const labels = { product: "Equipamiento", service: "Curso y servicio", tournament: "Inscripción" } as const;
function available(item: CommerceItemDto, variant: CommerceItemVariantDto | undefined) { return variant?.stockQuantity ?? item.stockQuantity; }

export function Storefront() {
  const [catalog, setCatalog] = useState<CommerceCatalogDto | null>(null);
  const { cart, setCart } = useStoreCart();
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/commerce/catalog", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message); setCatalog(body.data); }).catch(() => setMessage("No pudimos cargar la tienda.")); }, []);
  const selected = useMemo(() => cart.flatMap((line) => { const item = catalog?.items.find((candidate) => candidate.id === line.itemId); return item ? [{ ...line, item, variant: line.variantId ? item.variants.find((candidate) => candidate.id === line.variantId) : undefined }] : []; }), [cart, catalog]);
  const total = selected.reduce((sum, line) => sum + ((line.variant?.priceMinor ?? line.item.effectivePriceMinor) - (line.item.hasCredentialDiscount ? Math.floor((line.variant?.priceMinor ?? line.item.priceMinor) * line.item.credentialDiscountBps / 10_000) : 0)) * line.quantity, 0);
  function displayPrice(item: CommerceItemDto, variant?: CommerceItemVariantDto) { const base = variant?.priceMinor ?? item.priceMinor; return base - (item.hasCredentialDiscount ? Math.floor(base * item.credentialDiscountBps / 10_000) : 0); }
  function add(item: CommerceItemDto) {
    const variantId = variants[item.id] || null; const variant = variantId ? item.variants.find((candidate) => candidate.id === variantId) : undefined;
    if (item.variants.length && !variant) { setMessage("Elegí talle, color u opción antes de agregar."); return; }
    if (selected.length && selected[0]!.item.seller.id !== item.seller.id) { setMessage("Finalizá primero la compra del vendedor actual. Cada checkout pertenece a un solo vendedor."); return; }
    if (available(item, variant) === 0) { setMessage("La opción elegida ya no tiene stock."); return; }
    const line = { itemId: item.id, variantId, quantity: 1 }; const key = cartLineKey(line); setMessage(""); setCart((current) => { const existing = current.find((candidate) => cartLineKey(candidate) === key); const maximum = Math.min(available(item, variant) ?? 10, 10); return existing ? current.map((candidate) => cartLineKey(candidate) === key ? { ...candidate, quantity: Math.min(candidate.quantity + 1, maximum) } : candidate) : [...current, line]; });
  }
  if (!catalog && !message) return <p className={styles.state}>Cargando catálogo…</p>;
  return <div className={styles.market}>
    <section className={styles.catalog} aria-label="Catálogo">
      <div className={styles.catalogHeading}><div><p>Catálogo LUFA</p><h2>Productos con propósito</h2></div>{catalog?.hasActiveCredential ? <span className={styles.member}>Descuento Mi ID activo</span> : null}</div>
      {catalog?.items.length ? <div className={styles.grid}>{catalog.items.map((item) => {
        const variant = item.variants.find((candidate) => candidate.id === variants[item.id]); const stock = available(item, variant);
        return <article className={styles.card} key={item.id}><div className={styles.cardVisual}>{item.imageUrl ? <div className={styles.productImage} style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl).slice(1, -1)})` }} role="img" aria-label={item.title} /> : <span>{item.kind === "product" ? "🏈" : item.kind === "tournament" ? "🏆" : "📋"}</span>}<small>{labels[item.kind]}</small></div><div className={styles.cardBody}><p className={styles.seller}>{item.seller.name}{item.details.brand ? ` · ${item.details.brand}` : ""}</p><h3>{item.title}</h3><p>{item.description}</p>{item.kind === "service" && item.details.startsAt ? <strong className={styles.entitlement}>Comienza {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(item.details.startsAt))}</strong> : null}{item.entitlementMonths ? <strong className={styles.entitlement}>Incluye Mi ID por {item.entitlementMonths} meses</strong> : null}{item.variants.length ? <label className={styles.variantSelect}>Elegí {item.variants[0]?.optionName}<select value={variants[item.id] || ""} onChange={(event) => setVariants((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Seleccionar</option>{item.variants.map((candidate) => <option value={candidate.id} disabled={candidate.stockQuantity === 0} key={candidate.id}>{candidate.label}{candidate.stockQuantity !== null ? ` · ${candidate.stockQuantity} disponibles` : ""}</option>)}</select></label> : null}<div className={styles.price}>{item.hasCredentialDiscount ? <s>{money(variant?.priceMinor ?? item.priceMinor)}</s> : null}<strong>{money(displayPrice(item, variant))}</strong></div><button onClick={() => add(item)} disabled={stock === 0}>{stock === 0 ? "Sin stock" : "Agregar"}</button></div></article>;
      })}</div> : <p className={styles.state}>Todavía no hay publicaciones activas.</p>}
    </section>
    <aside className={styles.cart}><p>Tu compra</p><h2>Carrito</h2>{selected.length ? <>{selected.map((line) => <div className={styles.line} key={cartLineKey(line)}><span>{line.item.title}{line.variant ? ` · ${line.variant.label}` : ""}<small>{line.quantity} × {money(displayPrice(line.item, line.variant))}</small></span><button aria-label={`Quitar ${line.item.title}`} onClick={() => setCart((current) => current.filter((candidate) => cartLineKey(candidate) !== cartLineKey(line)))}>×</button></div>)}<div className={styles.total}><span>Total estimado</span><strong>{money(total)}</strong></div><Link className={styles.checkout} href="/tienda/checkout">Continuar al checkout</Link><small className={styles.secure}>Confirmaremos precios, descuentos y disponibilidad antes de enviarte a Mercado Pago.</small></> : <p className={styles.empty}>Agregá un producto, curso o inscripción.</p>}{message ? <p className={styles.error} role="alert">{message}</p> : null}</aside>
  </div>;
}
