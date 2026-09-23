import { StoreHeader } from "../store-header";
import { PurchaseHistory } from "./purchase-history";
import styles from "../store.module.css";

export const metadata = { title: "Mis compras | Tienda LUFA" };
export default function PurchasesPage() {
  return <main className={styles.shell}>
    <StoreHeader />
    <section className={styles.history}><p className={styles.historyEyebrow}>Tienda LUFA</p><h1>Mis compras</h1><p>Consultá el estado de tus pedidos y pagos.</p><PurchaseHistory /></section>
  </main>;
}
