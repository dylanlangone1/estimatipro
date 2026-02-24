import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "shimmer"
}

export function Skeleton({ className, variant = "pulse", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "pulse" && "animate-pulse bg-gray-200",
        variant === "shimmer" &&
          "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      style={
        variant === "shimmer"
          ? { animation: "shimmer 1.5s ease-in-out infinite" }
          : undefined
      }
      {...props}
    />
  )
}
