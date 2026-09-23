"use client";
import type { CommerceOrderDto, CommerceOrderStatus } from "@lufa/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../store.module.css";

const statusLabels: Record<CommerceOrderStatus, string> = {
  creating: "Preparando pago", payment_pending: "Pago pendiente", payment_review: "Pago en revisión",
  paid: "Pagada", cancelled: "Cancelada", refunded: "Reembolsada", charged_back: "Pago revertido",
};
const money = (minor: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(minor / 100);

export function PurchaseHistory() {
  const [orders, setOrders] = useState<CommerceOrderDto[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/commerce/orders", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { data?: CommerceOrderDto[]; message?: string };
      if (!response.ok) throw new Error(response.status === 401 ? "Iniciá sesión para ver tus compras." : body.message || "No pudimos cargar tus compras.");
      if (active) setOrders(body.data ?? []);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar tus compras."); });
    return () => { active = false; };
  }, []);
  if (error) return <p className={styles.historyState} role="alert">{error} {error.startsWith("Iniciá") ? <Link href="/auth/login">Iniciar sesión</Link> : null}</p>;
  if (!orders) return <p className={styles.historyState}>Cargando compras…</p>;
  if (!orders.length) return <p className={styles.historyState}>Todavía no tenés compras. <Link href="/tienda">Explorar tienda</Link></p>;
  return <div className={styles.historyList}>{orders.map((order) => <article className={styles.historyOrder} key={order.id}>
    <div className={styles.historyOrderHead}><div><small>{new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(order.createdAt))} · Orden {order.id.slice(-8).toUpperCase()}</small><h2>{order.items.map((item) => item.title).join(", ")}</h2></div><span>{statusLabels[order.status] ?? order.status}</span></div>
    <p>{order.items.map((item) => `${item.quantity} × ${item.title}`).join(" · ")}</p>
    <div className={styles.historyOrderFoot}><strong>{money(order.totalMinor)}</strong><Link href={`/tienda/resultado?order=${encodeURIComponent(order.id)}`}>Ver detalle</Link></div>
  </article>)}</div>;
}
