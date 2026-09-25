import Link from "next/link";
import { CommerceAdminWorkspace } from "./workspace";
import styles from "./admin-store.module.css";
export const metadata = { title: "Administración de tienda | LUFA" };
export default function AdminStorePage() { return <main className={styles.shell}><header><Link href="/tienda">← Tienda LUFA</Link><p>Operación central</p><h1>Administración de tienda</h1><span>Ventas, retiros, catálogo y vendedores en un solo lugar.</span></header><CommerceAdminWorkspace /></main>; }
