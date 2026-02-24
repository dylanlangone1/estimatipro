"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface TabItem {
  value: string
  label: string
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

interface TabsProps {
  value: string
  onChange: (value: string) => void
  tabs: TabItem[]
  className?: string
}

export function Tabs({ value, onChange, tabs, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-card-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => !tab.disabled && onChange(tab.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
            value === tab.value
              ? "border-brand-orange text-brand-orange"
              : "border-transparent text-muted hover:text-foreground hover:border-card-border",
            tab.disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={tab.disabled}
        >
          {tab.icon}
          {tab.label}
          {tab.badge}
        </button>
      ))}
    </div>
  )
}

interface TabPanelProps {
  value: string
  activeValue: string
  children: ReactNode
  className?: string
}

export function TabPanel({ value, activeValue, children, className }: TabPanelProps) {
  if (value !== activeValue) return null
  return <div className={className}>{children}</div>
}
