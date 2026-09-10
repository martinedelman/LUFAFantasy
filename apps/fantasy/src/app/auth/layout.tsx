import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-panel"><Brand />{children}</section><aside className="auth-side"><div className="auth-quote"><blockquote>Más que mirar el partido: <em>leer el juego.</em></blockquote><p>Tu equipo, tus decisiones y todo el talento del flag uruguayo.</p></div></aside></main>;
}
