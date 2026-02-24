import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EstimateForm } from "@/components/estimates/estimate-form"
import type { EstimatePreferences } from "@/types/estimate-input"

export default async function NewEstimatePage() {
  const session = await auth()
  let trades: string[] = []
  let preferences: EstimatePreferences | undefined

  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { trades: true, estimatePreferences: true },
      })
      trades = user?.trades ?? []
      if (user?.estimatePreferences && typeof user.estimatePreferences === "object") {
        preferences = user.estimatePreferences as EstimatePreferences
      }
    } catch {
      // Fallback: estimatePreferences column may not exist yet (pending migration)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { trades: true },
      })
      trades = user?.trades ?? []
    }
  }

  return (
    <div className="py-4">
      <EstimateForm trades={trades} preferences={preferences} />
    </div>
  )
}
