"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Plus,
  FileText,
  Upload,
  Brain,
  GraduationCap,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
  Lock,
  Palette,
  ArrowUpCircle,
  BarChart2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { TIER_FEATURES, TIER_ORDER, type TierName } from "@/lib/constants"
import type { SubscriptionTier } from "@/generated/prisma/client"

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  requiredTier?: TierName
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Estimate", href: "/estimate/new", icon: Plus },
  { name: "My Estimates", href: "/estimates", icon: FileText },
  { name: "Upload History", href: "/upload", icon: Upload, requiredTier: "STANDARD" },
  { name: "Intelligence", href: "/intelligence", icon: Brain, requiredTier: "STANDARD" },
  { name: "AI Training", href: "/admin/training", icon: GraduationCap, requiredTier: "STANDARD" },
  { name: "Clients", href: "/clients", icon: Users, requiredTier: "PRO" },
  { name: "Brand & Templates", href: "/settings/brand", icon: Palette, requiredTier: "PRO" },
  { name: "Settings", href: "/settings", icon: Settings },
]

function tierAtLeast(userTier: SubscriptionTier, required: TierName): boolean {
  return TIER_ORDER.indexOf(userTier as TierName) >= TIER_ORDER.indexOf(required)
}

const TIER_BADGE_STYLES: Record<TierName, string> = {
  FREE: "bg-white/10 text-white/60",
  STANDARD: "bg-blue-500/20 text-blue-300",
  PRO: "bg-brand-orange/20 text-brand-orange",
  MAX: "bg-gradient-to-r from-brand-orange/30 to-red-500/30 text-brand-orange",
}

interface SidebarProps {
  userTier?: SubscriptionTier
  userEmail?: string
}

export function Sidebar({ userTier = "FREE", userEmail = "" }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const tierInfo = TIER_FEATURES[userTier as TierName] || TIER_FEATURES.FREE
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(userTier as TierName) + 1] as TierName | undefined
  const showUpgradeCTA = userTier !== "MAX"
  const isAdmin = !!process.env.NEXT_PUBLIC_ADMIN_EMAIL && userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-md border border-card-border"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-brand-charcoal flex flex-col transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <span className="font-bold text-xl tracking-tight">
                <span className="text-white">ESTIM</span>
                <span className="text-brand-orange">AI</span>
                <span className="text-white"> PRO</span>
              </span>
            </Link>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tier Badge */}
        <div className="px-6 py-2">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              TIER_BADGE_STYLES[userTier as TierName] || TIER_BADGE_STYLES.FREE
            )}
          >
            {tierInfo.name}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === "/settings"
                ? pathname === "/settings"
                : pathname === item.href ||
                  (item.href !== "/dashboard" && item.href !== "/settings" && pathname.startsWith(item.href))
            const isLocked = item.requiredTier && !tierAtLeast(userTier, item.requiredTier)

            if (isLocked) {
              return (
                <Link
                  key={item.name}
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:bg-white/5 transition-colors"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-medium">
                    {item.requiredTier}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-orange text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}

          {/* Admin link — only visible to admin email */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-brand-orange text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <BarChart2 className="h-5 w-5 shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        {/* Upgrade CTA */}
        {showUpgradeCTA && nextTier && (
          <div className="px-3 py-3 border-t border-white/10">
            <Link href="/pricing" onClick={() => setMobileOpen(false)}>
              <div className="px-4 py-3 rounded-lg bg-gradient-to-r from-brand-orange/10 to-brand-orange/5 border border-brand-orange/20 hover:border-brand-orange/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircle className="h-4 w-4 text-brand-orange" />
                  <span className="text-sm font-medium text-white">
                    Upgrade to {TIER_FEATURES[nextTier].name}
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  {nextTier === "STANDARD"
                    ? "Unlock Pricing DNA, uploads & more"
                    : nextTier === "PRO"
                      ? "Branded PDFs, client management"
                      : "Invoices, payments & premium proposals"}
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
