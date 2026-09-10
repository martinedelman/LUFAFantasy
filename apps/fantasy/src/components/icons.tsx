import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function ArrowUpRightIcon(props: Props) { return <svg {...base} {...props}><path d="M7 17 17 7M8 7h9v9" /></svg>; }
export function BoltIcon(props: Props) { return <svg {...base} {...props}><path d="m13 2-9 12h7l-1 8 9-12h-7z" /></svg>; }
export function FieldIcon(props: Props) { return <svg {...base} {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M16 5v14M3 12h18" /></svg>; }
export function LiveIcon(props: Props) { return <svg {...base} {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19V2" /></svg>; }
export function SparkIcon(props: Props) { return <svg {...base} {...props}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z" /></svg>; }
export function GridIcon(props: Props) { return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>; }
export function UsersIcon(props: Props) { return <svg {...base} {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
export function MailIcon(props: Props) { return <svg {...base} {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>; }
export function UserIcon(props: Props) { return <svg {...base} {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>; }
export function LogOutIcon(props: Props) { return <svg {...base} {...props}><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/></svg>; }
export function MenuIcon(props: Props) { return <svg {...base} {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>; }
export function CloseIcon(props: Props) { return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>; }
