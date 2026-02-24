import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">
          Manage your account, branding, and subscription.
        </p>
      </div>
      <SettingsTabs userTier={user?.tier ?? "FREE"} />
      {children}
    </div>
  )
}
