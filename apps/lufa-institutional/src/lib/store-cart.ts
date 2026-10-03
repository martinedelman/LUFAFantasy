"use client";

import { useCallback, useEffect, useState } from "react";

export type StoreCartLine = { itemId: string; variantId: string | null; quantity: number };
export type StorePaymentMode = "cash" | "installments";

type CheckoutAttempt = { cartSignature: string; paymentMode: StorePaymentMode; idempotencyKey: string; orderId?: string };

const CART_KEY = "lufa-store-cart:v1";
const ATTEMPT_KEY = "lufa-store-checkout-attempt:v1";
const CHANGE_EVENT = "lufa-store-cart-change";

export function cartLineKey(line: Pick<StoreCartLine, "itemId" | "variantId">) { return `${line.itemId}:${line.variantId || "base"}`; }

export function normalizeCart(value: unknown): StoreCartLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: StoreCartLine[] = [];
  for (const valueLine of value) {
    if (!valueLine || typeof valueLine !== "object") continue;
    const line = valueLine as Record<string, unknown>;
    const itemId = typeof line.itemId === "string" ? line.itemId : "";
    const variantId = typeof line.variantId === "string" && line.variantId ? line.variantId : null;
    const quantity = typeof line.quantity === "number" ? line.quantity : Number(line.quantity);
    const key = cartLineKey({ itemId, variantId });
    if (!itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || seen.has(key)) continue;
    seen.add(key); normalized.push({ itemId, variantId, quantity });
    if (normalized.length === 10) break;
  }
  return normalized;
}

export function cartSignature(lines: StoreCartLine[]) {
  return JSON.stringify(normalizeCart(lines).sort((a, b) => cartLineKey(a).localeCompare(cartLineKey(b))));
}

function readStorage(key: string) {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function readStoreCart() {
  const stored = readStorage(CART_KEY);
  if (!stored) return [];
  try { return normalizeCart(JSON.parse(stored)); } catch { return []; }
}

function writeStoreCart(lines: StoreCartLine[]) {
  if (typeof window === "undefined") return;
  const next = normalizeCart(lines);
  try { window.localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch { return; }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useStoreCart() {
  const [cart, setCartState] = useState<StoreCartLine[]>([]);
  useEffect(() => {
    const sync = () => setCartState(readStoreCart());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(CHANGE_EVENT, sync); };
  }, []);
  const setCart = useCallback((update: StoreCartLine[] | ((current: StoreCartLine[]) => StoreCartLine[])) => {
    const current = readStoreCart();
    const next = normalizeCart(typeof update === "function" ? update(current) : update);
    writeStoreCart(next); setCartState(next);
  }, []);
  return { cart, setCart };
}

function readAttempt(): CheckoutAttempt | null {
  const stored = readStorage(ATTEMPT_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<CheckoutAttempt>;
    return typeof value.cartSignature === "string" && (value.paymentMode === "cash" || value.paymentMode === "installments") && typeof value.idempotencyKey === "string"
      ? { cartSignature: value.cartSignature, paymentMode: value.paymentMode, idempotencyKey: value.idempotencyKey, ...(typeof value.orderId === "string" ? { orderId: value.orderId } : {}) }
      : null;
  } catch { return null; }
}

function writeAttempt(value: CheckoutAttempt | null) {
  if (typeof window === "undefined") return;
  try { if (value) window.localStorage.setItem(ATTEMPT_KEY, JSON.stringify(value)); else window.localStorage.removeItem(ATTEMPT_KEY); } catch { /* Storage is optional. */ }
}

export function checkoutAttempt(lines: StoreCartLine[], paymentMode: StorePaymentMode) {
  const signature = cartSignature(lines); const current = readAttempt();
  if (current?.cartSignature === signature && current.paymentMode === paymentMode) return current;
  const next: CheckoutAttempt = { cartSignature: signature, paymentMode, idempotencyKey: crypto.randomUUID() };
  writeAttempt(next); return next;
}

export function rememberCheckoutOrder(lines: StoreCartLine[], paymentMode: StorePaymentMode, orderId: string) {
  const current = checkoutAttempt(lines, paymentMode);
  writeAttempt({ ...current, orderId });
}

export function clearConfirmedCheckout(orderId: string) {
  const current = readAttempt();
  if (!current || current.orderId !== orderId) return;
  if (cartSignature(readStoreCart()) === current.cartSignature) writeStoreCart([]);
  writeAttempt(null);
}

export function discardCheckoutAttempt(orderId: string) {
  if (readAttempt()?.orderId === orderId) writeAttempt(null);
}

/** A definitively rejected provider attempt can use a fresh idempotency key. */
export function discardRejectedCheckoutAttempt(lines: StoreCartLine[], paymentMode: StorePaymentMode) {
  const current = readAttempt();
  if (current?.cartSignature === cartSignature(lines) && current.paymentMode === paymentMode && !current.orderId) writeAttempt(null);
}
