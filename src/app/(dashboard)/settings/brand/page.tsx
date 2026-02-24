import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TierGate } from "@/components/ui/tier-gate"
import { BrandSettings } from "@/components/settings/brand-settings"
import type { BrandColors, TemplateConfig } from "@/types/proposal"

export default async function BrandSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      tier: true,
      logoUrl: true,
      brandColors: true,
      companyName: true,
      tagline: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      trades: true,
    },
  })

  if (!user) return null

  const activeTemplate = await prisma.brandTemplate.findFirst({
    where: { userId: session.user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <TierGate feature="brandedPdf" userTier={user.tier} fallback="upgrade">
      <BrandSettings
        user={{
          logoUrl: user.logoUrl,
          brandColors: user.brandColors as BrandColors | null,
          companyName: user.companyName,
          tagline: user.tagline,
          phone: user.phone,
          address: [user.address, user.city, user.state, user.zip]
            .filter(Boolean)
            .join(", ") || null,
          trades: user.trades,
        }}
        activeTemplate={
          activeTemplate
            ? {
                id: activeTemplate.id,
                name: activeTemplate.name,
                templateConfig: activeTemplate.templateConfig as unknown as TemplateConfig,
              }
            : null
        }
      />
    </TierGate>
  )
}
