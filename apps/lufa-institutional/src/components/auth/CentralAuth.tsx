"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { getLufaAppUrl, normalizeAuthReturnTo } from "@lufa/api-client/authUrls";
import styles from "./CentralAuth.module.css";

type Mode = "login" | "signup" | "verify" | "forgot-password";
type Feedback = { tone: "error" | "success"; message: string } | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeClientReturnTo(value: string | null) {
  return normalizeAuthReturnTo(value) || (typeof window === "undefined" ? getLufaAppUrl() : window.location.origin);
}

function authHref(page: "login" | "signup" | "forgot-password", returnTo: string) {
  const params = new URLSearchParams({ returnTo });
  return `/auth/${page}?${params.toString()}`;
}

function validateEmail(value: string) {
  if (!value.trim()) return "Ingresá tu email.";
  return emailPattern.test(value.trim()) ? "" : "Ingresá un email válido.";
}

async function authFetch(input: RequestInfo | URL, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function requestFailureMessage() {
  return "La solicitud está tardando más de lo esperado. Revisá tu conexión y probá nuevamente.";
}

function useRequestFeedback(pending: boolean, action: string) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      setStep(0);
      return;
    }

    const reveal = window.setTimeout(() => setVisible(true), 700);
    const advance = window.setInterval(() => setStep((current) => Math.min(current + 1, 3)), 2_400);
    return () => {
      window.clearTimeout(reveal);
      window.clearInterval(advance);
    };
  }, [pending]);

  const messages = [
    `${action}…`,
    "Confirmando una conexión segura…",
    "Casi listo…",
    "Seguimos esperando una respuesta. Podés permanecer en esta pantalla.",
  ];
  return visible ? messages[step] : null;
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {error ? <small className={styles.fieldError} role="alert">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Status({ feedback, requestMessage }: { feedback: Feedback; requestMessage: string | null }) {
  if (feedback) return <p className={feedback.tone === "error" ? styles.error : styles.success} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p>;
  return requestMessage ? <p className={styles.progress} aria-live="polite">{requestMessage}</p> : null;
}

function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="auth-title">
        <Link href="/" className={styles.brand} aria-label="Volver al inicio de LUFA">
          <span className={styles.brandMark}>LUFA</span>
          <span>Liga Uruguaya de Football Americano</span>
        </Link>
        <div className={styles.card}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
        </div>
      </section>
      <aside className={styles.art} aria-hidden="true">
        <div className={styles.artCopy}>
          <span>LUFA</span>
          <strong>Una cuenta.<br />Toda la cancha.</strong>
          <p>Accedé a los espacios institucionales y a Flag Football con una única sesión.</p>
        </div>
      </aside>
    </main>
  );
}

function Login({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const requestMessage = useRequestFeedback(pending, "Ingresando a tu cuenta");

  const errors = { email: validateEmail(email), password: password ? "" : "Ingresá tu contraseña." };
  const ready = !errors.email && !errors.password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!ready) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        setFeedback({ tone: "error", message: payload.message || "No pudimos iniciar sesión. Probá nuevamente." });
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setFeedback({ tone: "error", message: requestFailureMessage() });
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame eyebrow="Cuenta LUFA" title="Qué bueno verte." description="Ingresá una vez y continuá donde estabas.">
      <form className={styles.form} onSubmit={submit} noValidate>
        <Status feedback={feedback} requestMessage={requestMessage} />
        <Field label="Email" error={touched.email ? errors.email : ""}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, email: true }))} type="email" autoComplete="email" maxLength={100} aria-invalid={Boolean(touched.email && errors.email)} />
        </Field>
        <Field label="Contraseña" error={touched.password ? errors.password : ""}>
          <input value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, password: true }))} type="password" autoComplete="current-password" maxLength={128} aria-invalid={Boolean(touched.password && errors.password)} />
        </Field>
        <Link href={authHref("forgot-password", returnTo)} className={styles.textLink}>¿Olvidaste tu contraseña?</Link>
        <button className={styles.primaryAction} disabled={pending} type="submit">{pending ? "Ingresando…" : "Iniciar sesión"}</button>
      </form>
      <p className={styles.switcher}>¿Todavía no tenés cuenta? <Link href={authHref("signup", returnTo)}>Crear una cuenta</Link></p>
    </AuthFrame>
  );
}

function Signup({ returnTo }: { returnTo: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const requestMessage = useRequestFeedback(pending, "Preparando tu cuenta");
  const errors = {
    name: name.trim().length >= 2 ? "" : "Ingresá al menos dos caracteres.",
    email: validateEmail(email),
    password: password.length >= 6 ? "" : "Usá al menos 6 caracteres.",
    confirmPassword: password === confirmPassword && confirmPassword ? "" : "Las contraseñas deben coincidir.",
  };
  const ready = Object.values(errors).every((error) => !error);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!ready) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await authFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, returnTo }),
      });
      const payload = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        setFeedback({ tone: "error", message: payload.message || "No pudimos crear la cuenta. Probá nuevamente." });
        return;
      }
      setFeedback({ tone: "success", message: "Revisá tu email: te enviamos un link y un código para verificar tu cuenta." });
    } catch {
      setFeedback({ tone: "error", message: requestFailureMessage() });
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame eyebrow="Nueva cuenta" title="Sumate a LUFA." description="Creá tu cuenta y verificá tu email para continuar.">
      <form className={styles.form} onSubmit={submit} noValidate>
        <Status feedback={feedback} requestMessage={requestMessage} />
        <Field label="Nombre" error={touched.name ? errors.name : ""} hint={`${name.length}/80 caracteres`}>
          <input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, name: true }))} autoComplete="name" maxLength={80} aria-invalid={Boolean(touched.name && errors.name)} />
        </Field>
        <Field label="Email" error={touched.email ? errors.email : ""}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, email: true }))} type="email" autoComplete="email" maxLength={100} aria-invalid={Boolean(touched.email && errors.email)} />
        </Field>
        <Field label="Contraseña" error={touched.password ? errors.password : ""} hint="Mínimo 6 caracteres.">
          <input value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, password: true }))} type="password" autoComplete="new-password" maxLength={128} aria-invalid={Boolean(touched.password && errors.password)} />
        </Field>
        <Field label="Confirmar contraseña" error={touched.confirmPassword ? errors.confirmPassword : ""}>
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onBlur={() => setTouched((value) => ({ ...value, confirmPassword: true }))} type="password" autoComplete="new-password" maxLength={128} aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)} />
        </Field>
        <button className={styles.primaryAction} disabled={pending} type="submit">{pending ? "Creando cuenta…" : "Crear cuenta"}</button>
      </form>
      <p className={styles.switcher}>¿Ya tenés una cuenta? <Link href={authHref("login", returnTo)}>Iniciar sesión</Link></p>
    </AuthFrame>
  );
}

function Verify({ returnTo, token }: { returnTo: string; token: string }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const requestMessage = useRequestFeedback(pending, "Verificando tu cuenta");
  const codeError = code.length === 6 ? "" : "Ingresá los 6 números del código.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setFeedback({ tone: "error", message: "El link de verificación no es válido. Pedí uno nuevo creando tu cuenta nuevamente." });
      return;
    }
    if (codeError) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await authFetch("/api/auth/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code }),
      });
      const payload = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        setFeedback({ tone: "error", message: payload.message || "No pudimos verificar la cuenta." });
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setFeedback({ tone: "error", message: requestFailureMessage() });
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame eyebrow="Un último paso" title="Verificá tu email." description="Ingresá el código de seis números que recibiste.">
      <form className={styles.form} onSubmit={submit} noValidate>
        <Status feedback={feedback} requestMessage={requestMessage} />
        <Field label="Código de verificación" error={code && codeError ? codeError : ""} hint={token ? "El código vence en 15 minutos." : "Falta el link de verificación."}>
          <input className={styles.code} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={Boolean(code && codeError)} />
        </Field>
        <button className={styles.primaryAction} disabled={pending || !token} type="submit">{pending ? "Verificando…" : "Verificar cuenta"}</button>
      </form>
      <p className={styles.switcher}><Link href={authHref("login", returnTo)}>Volver a iniciar sesión</Link></p>
    </AuthFrame>
  );
}

function ForgotPassword({ returnTo }: { returnTo: string }) {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const requestMessage = useRequestFeedback(pending, step === "request" ? "Solicitando tu código" : "Actualizando tu contraseña");
  const emailError = validateEmail(email);
  const resetError = password.length >= 6 && password === confirmPassword && /^\d{6}$/.test(code) ? "" : "Revisá el código y las contraseñas.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "request" && emailError) return;
    if (step === "confirm" && resetError) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await authFetch(`/api/auth/password-reset/${step === "request" ? "request" : "confirm"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === "request" ? { email: email.trim() } : { email: email.trim(), code, password }),
      });
      const payload = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        setFeedback({ tone: "error", message: payload.message || "No pudimos continuar. Probá nuevamente." });
        return;
      }
      if (step === "request") {
        setStep("confirm");
        setFeedback({ tone: "success", message: payload.message || "Revisá tu email: te enviamos un código de recuperación." });
      } else {
        setFeedback({ tone: "success", message: "Contraseña actualizada. Ya podés iniciar sesión." });
      }
    } catch {
      setFeedback({ tone: "error", message: requestFailureMessage() });
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame eyebrow="Recuperar acceso" title={step === "request" ? "Volvamos a empezar." : "Elegí una nueva contraseña."} description={step === "request" ? "Te enviaremos un código para recuperar tu cuenta." : "Usá el código enviado a tu email."}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <Status feedback={feedback} requestMessage={requestMessage} />
        <Field label="Email" error={email && emailError ? emailError : ""}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={100} disabled={step === "confirm"} aria-invalid={Boolean(email && emailError)} />
        </Field>
        {step === "confirm" ? <>
          <Field label="Código de recuperación" hint="Seis números enviados por email.">
            <input className={styles.code} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          </Field>
          <Field label="Nueva contraseña" hint="Mínimo 6 caracteres.">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" maxLength={128} />
          </Field>
          <Field label="Confirmar contraseña" error={confirmPassword && password !== confirmPassword ? "Las contraseñas deben coincidir." : ""}>
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" maxLength={128} />
          </Field>
        </> : null}
        <button className={styles.primaryAction} disabled={pending} type="submit">{pending ? "Un momento…" : step === "request" ? "Enviar código" : "Actualizar contraseña"}</button>
      </form>
      <p className={styles.switcher}><Link href={authHref("login", returnTo)}>Volver a iniciar sesión</Link></p>
    </AuthFrame>
  );
}

export function CentralAuth({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => safeClientReturnTo(searchParams.get("returnTo")), [searchParams]);
  const token = searchParams.get("token") || "";
  const router = useRouter();

  useEffect(() => {
    if (mode !== "forgot-password") return;
    router.prefetch(authHref("login", returnTo));
  }, [mode, returnTo, router]);

  if (mode === "login") return <Login returnTo={returnTo} />;
  if (mode === "signup") return <Signup returnTo={returnTo} />;
  if (mode === "verify") return <Verify returnTo={returnTo} token={token} />;
  return <ForgotPassword returnTo={returnTo} />;
}
