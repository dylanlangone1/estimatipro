import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileForm } from "@/components/settings/profile-form"
import { FinishLevelsSettings } from "@/components/settings/finish-levels-settings"
import { PaymentSettings } from "@/components/settings/payment-settings"
import { ProposalDefaultsSettings } from "@/components/settings/proposal-defaults-settings"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      companyName: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      licenseNumber: true,
      websiteUrl: true,
      tagline: true,
      tier: true,
    },
  })

  if (!user) return null

  const isMax = user.tier === "MAX"

  return (
    <div className="space-y-6">
      <ProfileForm user={user} />
      <FinishLevelsSettings />
      <PaymentSettings isMax={isMax} />
      <ProposalDefaultsSettings isMax={isMax} />
    </div>
  )
}
