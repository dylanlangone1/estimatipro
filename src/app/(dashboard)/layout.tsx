import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Sidebar } from "@/components/layout/sidebar"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

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
    select: { onboardingComplete: true, tier: true },
  })

  if (user && !user.onboardingComplete) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userTier={user?.tier ?? "FREE"} />
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <PWAInstallPrompt />
          {children}
        </div>
      </main>
    </div>
  )
}
