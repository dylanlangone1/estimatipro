import { forwardRef, ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-brand-orange text-white hover:bg-brand-orange-hover focus:ring-brand-orange":
              variant === "primary",
            "bg-brand-charcoal text-white hover:bg-brand-charcoal-light focus:ring-brand-charcoal":
              variant === "secondary",
            "border border-card-border bg-white text-foreground hover:bg-gray-50 focus:ring-brand-orange":
              variant === "outline",
            "text-foreground hover:bg-gray-100 focus:ring-brand-orange":
              variant === "ghost",
            "bg-error text-white hover:bg-red-600 focus:ring-error":
              variant === "danger",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, type ButtonProps }
