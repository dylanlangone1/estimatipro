import { auth } from "@/lib/auth"
import { tierAtLeast } from "@/lib/tiers"
import { prisma } from "@/lib/prisma"
import { TermsSettings } from "@/components/settings/terms-settings"
import { Card, CardContent } from "@/components/ui/card"
import { Lock } from "lucide-react"
import Link from "next/link"

export default async function TermsSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  })

  const userTier = user?.tier ?? "FREE"
  const hasAccess = tierAtLeast(userTier, "STANDARD")

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Lock className="h-10 w-10 text-muted mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Editable Terms &amp; Conditions
            </h3>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              Customize the terms and conditions that appear on your client-facing
              PDFs. Available on Standard plans and above.
            </p>
          </div>
          <Link
            href="/settings/subscription"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white text-sm font-medium rounded-lg hover:bg-brand-orange/90 transition-colors"
          >
            Upgrade to Standard
          </Link>
        </CardContent>
      </Card>
    )
  }

  return <TermsSettings />
}
