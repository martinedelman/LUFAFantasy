import { StoreHeader } from "../store-header";
import { StoreCheckout } from "./checkout";
import styles from "../store.module.css";

export const metadata = { title: "Checkout | Tienda LUFA" };

export default function StoreCheckoutPage() {
  return <main className={styles.shell}>
    <StoreHeader />
    <StoreCheckout />
  </main>;
}
