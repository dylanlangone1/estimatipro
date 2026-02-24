"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Palette, CreditCard, Lock, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SubscriptionTier } from "@/generated/prisma/client"

const tabs = [
  { name: "Profile", href: "/settings", icon: User },
  { name: "Terms & Conditions", href: "/settings/terms", icon: FileText, requiredTier: "STANDARD" as const },
  { name: "Brand & Templates", href: "/settings/brand", icon: Palette, requiredTier: "PRO" as const },
  { name: "Subscription", href: "/settings/subscription", icon: CreditCard },
]

function tierAtLeastClient(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const order: SubscriptionTier[] = ["FREE", "STANDARD", "PRO", "MAX"]
  return order.indexOf(userTier) >= order.indexOf(requiredTier)
}

interface SettingsTabsProps {
  userTier: SubscriptionTier
}

export function SettingsTabs({ userTier }: SettingsTabsProps) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-card-border pb-0">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(tab.href)
        const isLocked = tab.requiredTier && !tierAtLeastClient(userTier, tab.requiredTier)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors whitespace-nowrap",
              isActive
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-muted hover:text-foreground hover:border-card-border"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.name}</span>
            <span className="sm:hidden">{tab.name.split(" ")[0]}</span>
            {isLocked && (
              <Lock className="h-3 w-3 text-muted" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
