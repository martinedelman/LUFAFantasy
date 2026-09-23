import { StoreHeader } from "./store-header";
import { Storefront } from "./storefront";
import styles from "./store.module.css";

export const metadata = { title: "Tienda LUFA", description: "Productos, cursos e inscripciones que apoyan al football americano uruguayo." };
export default function StorePage() {
  return <main className={styles.shell}>
    <StoreHeader />
    <section className={styles.hero}><p>Marketplace oficial</p><h1>Equipate. Competí.<br />Apoyá a Uruguay.</h1><span>Cada compra ayuda a financiar la liga y los viajes de nuestras selecciones.</span></section>
    <Storefront />
  </main>;
}
