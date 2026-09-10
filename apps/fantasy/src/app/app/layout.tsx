import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/components/SessionProvider";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
export default function ProductLayout({children}:{children:React.ReactNode}){return <SessionProvider><OnboardingProvider><AppShell>{children}</AppShell></OnboardingProvider></SessionProvider>}
