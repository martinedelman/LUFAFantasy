import Link from "next/link";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return <Link className="brand" href={href} aria-label="Fantasy Flag Uruguay, inicio"><span className="brand-mark"><i /><i /><i /></span>{compact ? null : <strong>fantasy flag</strong>}<em>beta</em></Link>;
}
