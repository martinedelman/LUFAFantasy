import Link from "next/link";
import { SellerWorkspace } from "./workspace";
import styles from "./seller.module.css";
export const metadata = { title: "Portal de vendedores | LUFA" };
export default function SellerPage() { return <main className={styles.shell}><header><Link href="/tienda">← Tienda LUFA</Link><h1>Portal de vendedores</h1><p>Administrá únicamente el catálogo y las ventas de tu empresa.</p></header><SellerWorkspace /></main>; }
