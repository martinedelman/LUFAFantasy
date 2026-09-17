import Link from "next/link";
import { Suspense } from "react";
import { OrderResult } from "./result";
import styles from "../store.module.css";
export default function CheckoutResultPage() { return <main className={styles.resultPage}><Link href="/tienda">← Volver a la tienda</Link><Suspense fallback={<section className={styles.resultCard}><h1>Consultando tu pago…</h1></section>}><OrderResult /></Suspense></main>; }
