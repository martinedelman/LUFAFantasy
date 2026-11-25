"use client";
import type { CommerceOrderDto } from "@lufa/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearConfirmedCheckout, discardCheckoutAttempt } from "@/lib/store-cart";
import styles from "../store.module.css";
const messages: Record<string, [string, string]> = { paid: ["Pago confirmado", "Tu compra quedó confirmada y los beneficios asociados ya fueron aplicados."], payment_pending: ["Estamos confirmando el pago", "Handy todavía está procesando la operación. Esta página se actualizará sola."], creating: ["Estamos recuperando la operación", "No cierres esta página mientras confirmamos el checkout."], cancelled: ["Pago no completado", "La compra fue cancelada y el stock reservado quedó liberado."], refunded: ["Compra reembolsada", "Handy devolvió el importe a la tarjeta con la que pagaste. Puede demorar unos días en verse en tu estado de cuenta."], charged_back: ["Pago revertido", "La operación fue marcada como contracargo. Contactá a LUFA si necesitás ayuda."] };
export function OrderResult() {
  const id = useSearchParams().get("order"); const [order, setOrder] = useState<CommerceOrderDto | null>(null); const [error, setError] = useState("");
  useEffect(() => { if (!id) { setError("Falta el identificador de la compra."); return; } let active = true; let timer: ReturnType<typeof setTimeout>;
    const load = async () => { try { const response = await fetch(`/api/commerce/orders/${encodeURIComponent(id)}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.message); if (!active) return; setOrder(body.data); if (body.data.status === "paid") clearConfirmedCheckout(body.data.id); if (body.data.status === "cancelled") discardCheckoutAttempt(body.data.id); if (["creating", "payment_pending", "payment_review"].includes(body.data.status)) timer = setTimeout(load, 4000); } catch (e) { if (active) setError(e instanceof Error ? e.message : "No pudimos consultar la compra."); } }; void load(); return () => { active = false; clearTimeout(timer); }; }, [id]);
  if (error) return <section className={styles.resultCard}><h1>No pudimos consultar la compra</h1><p>{error}</p></section>;
  if (!order) return <section className={styles.resultCard}><h1>Consultando tu pago…</h1></section>;
  const copy = messages[order.status] || ["Pago en revisión", "Recibimos el pago después de que venció la reserva. LUFA lo está revisando y te va a contactar."];
  const dueAt = order.status === "payment_pending" && order.paymentDueAt ? new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.paymentDueAt)) : null;
  const paymentNote = dueAt ? `Pagá en Redpagos antes del ${dueAt}. Guardamos tu reserva hasta entonces.` : order.paymentMethodId ? `Pagado con ${order.paymentMethodId}` : "Pago con Handy";
  const tournamentPaid = order.status === "paid" && order.items.some((item) => item.kind === "tournament");
  return <section className={styles.resultCard}><span className={styles.resultIcon}>{order.status === "paid" ? "✓" : "…"}</span><p>Orden {order.id.slice(-8).toUpperCase()}</p><h1>{copy[0]}</h1><p>{tournamentPaid ? "Tu inscripción quedó preaprobada. Tu ID Digital LUFA ya está disponible en tu perfil." : copy[1]}</p><strong>{new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(order.totalMinor / 100)}</strong><small>{paymentNote}</small>{tournamentPaid ? <Link className={styles.resultAction} href="/mi-id">Ver mi ID Digital</Link> : null}</section>;
}
