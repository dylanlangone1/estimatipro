import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ErrorBoundary } from "@/components/error-boundary"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch user for onboarding check + tier for sidebar
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true, tier: true, email: true },
  })

  if (user && !user.onboardingComplete) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar userTier={user?.tier ?? "FREE"} userEmail={user?.email ?? ""} />
      <main className="lg:pl-64 flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <PWAInstallPrompt />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
      <footer className="lg:pl-64 border-t border-border/40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} EstimAI Pro. All rights reserved.</span>
          <span>Patent Pending</span>
        </div>
      </footer>
    </div>
  )
}
