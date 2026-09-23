import { SiteNav } from "@/components/SiteNav";
import Image from "next/image";
import Link from "next/link";
import homeStyles from "../page.module.css";


const flagUrl = process.env.NEXT_PUBLIC_FLAG_URL || "https://flag.lufa.com.uy";

export function StoreHeader() {
  return <div className={`${homeStyles.portal} page-shell`}>
    <header className={`header ${homeStyles.header}`}>
      <Link className="brand" href="/" aria-label="Inicio LUFA">
        <Image src="/lufa_icon.png" alt="" width={78} height={78} priority />
        <span>Liga Uruguaya de Football Americano</span>
      </Link>
      <SiteNav flagUrl={flagUrl} store />
    </header>
  </div>;
}
