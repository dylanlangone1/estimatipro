import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BlueprintTakeoff } from "@/components/blueprint/blueprint-takeoff"
import { getUserTier, hasFeature } from "@/lib/tiers"

export const metadata = {
  title: "Blueprint Takeoff — EstimAI Pro",
  description: "AI-powered material takeoff from blueprint images and PDFs",
}

export default async function BlueprintPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const tier = await getUserTier(session.user.id)
  if (!hasFeature(tier, "blueprintTakeoff")) {
    redirect("/settings/subscription?upgrade=blueprintTakeoff")
  }

  return (
    <div className="py-4">
      <BlueprintTakeoff />
    </div>
  )
}
