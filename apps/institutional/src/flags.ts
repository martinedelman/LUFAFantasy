import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

const authenticationOptions = [
  { label: "Login central de LUFA", value: false },
  { label: "Login legacy de Flag", value: true },
];

const legacyFlagAuthenticationDefinition = {
  key: "use-legacy-flag-auth",
  defaultValue: true,
  description:
    "Mantiene login, registro, verificación y recuperación dentro de flag.lufa.com.uy. Apagar cuando lufa.com.uy esté habilitado en producción.",
  options: authenticationOptions,
};

export const legacyFlagAuthentication = flag<boolean>({
  ...legacyFlagAuthenticationDefinition,
  adapter: vercelAdapter(),
});
