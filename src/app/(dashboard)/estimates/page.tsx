import { getEstimates } from "@/actions/estimate-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, FileText } from "lucide-react"
import Link from "next/link"

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  WON: "success",
  LOST: "error",
  EXPIRED: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
}

export default async function EstimatesPage() {
  const estimates = await getEstimates()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Estimates</h1>
          <p className="text-muted mt-1">
            {estimates.length} estimate{estimates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/estimate/new">
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            New Estimate
          </Button>
        </Link>
      </div>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No estimates yet
            </h2>
            <p className="text-muted mb-6">
              Create your first AI-powered estimate in seconds.
            </p>
            <Link href="/estimate/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Estimate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {estimates.map((estimate) => (
            <Link key={estimate.id} href={`/estimate/${estimate.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {estimate.title}
                        </h3>
                        <Badge
                          variant={statusVariant[estimate.status] || "default"}
                        >
                          {estimate.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>{formatDate(estimate.createdAt)}</span>
                        <span>
                          {estimate._count.lineItems} line items
                        </span>
                        {estimate.client && (
                          <span>Client: {estimate.client.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        {formatCurrency(estimate.totalAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
