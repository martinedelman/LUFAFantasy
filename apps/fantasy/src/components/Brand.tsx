import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/" aria-label="Fantasy Flag Uruguay, inicio"><span className="brand-mark"><i /><i /><i /></span>{compact ? null : <strong>fantasy flag</strong>}<em>beta</em></Link>;
}
