import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEstimateById } from "@/actions/estimate-actions"
import { EstimateView } from "@/components/estimates/estimate-view"

export default async function EstimatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { id } = await params
  const { new: isNewParam } = await searchParams
  const estimate = await getEstimateById(id)

  if (!estimate) {
    notFound()
  }

  // Fetch user tier + Stripe Connect status
  const session = await auth()
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tier: true, stripeConnectOnboarded: true },
      })
    : null

  return (
    <EstimateView
      estimate={estimate}
      isNew={isNewParam === "true"}
      userTier={user?.tier ?? "FREE"}
      stripeConnected={user?.stripeConnectOnboarded ?? false}
    />
  )
}
