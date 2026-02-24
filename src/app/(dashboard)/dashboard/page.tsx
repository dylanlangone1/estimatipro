import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Upload, FileText, Brain, ArrowRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) return null
  const firstName = session.user.name?.split(" ")[0] || "there"

  // Fetch stats
  const [estimateCount, docCount, totalEstimated, recentEstimates] =
    await Promise.all([
      prisma.estimate.count({ where: { userId: session.user.id } }),
      prisma.uploadedDocument.count({ where: { userId: session.user.id } }),
      prisma.estimate.aggregate({
        where: { userId: session.user.id },
        _sum: { totalAmount: true },
      }),
      prisma.estimate.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

  const profile = await prisma.pricingProfile.findFirst({
    where: { userId: session.user.id },
    select: { totalEstimatesAnalyzed: true, totalDocumentsProcessed: true },
  })

  const dnaDataPoints =
    (profile?.totalEstimatesAnalyzed || 0) +
    (profile?.totalDocumentsProcessed || 0)
  const dnaStrength = Math.min(Math.round((dnaDataPoints / 100) * 100), 100)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted mt-1">
          What would you like to estimate today?
        </p>
      </div>

      {/* Quick Action */}
      <Link href="/estimate/new">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-brand-orange/20 bg-gradient-to-r from-brand-orange/5 to-transparent">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-brand-orange flex items-center justify-center shrink-0">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                New Estimate
              </h2>
              <p className="text-sm text-muted">
                Describe the job and let AI generate a detailed estimate
              </p>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-orange" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {estimateCount}
                </p>
                <p className="text-sm text-muted">Estimates Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-brand-blue" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {docCount}
                </p>
                <p className="text-sm text-muted">Documents Uploaded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-brand-orange" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {dnaStrength}%
                </p>
                <p className="text-sm text-muted">Intelligence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalEstimated._sum.totalAmount ?? 0)}
                </p>
                <p className="text-sm text-muted">Total Estimated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Estimates */}
      {recentEstimates.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                Recent Estimates
              </h3>
              <Link
                href="/estimates"
                className="text-sm text-brand-orange hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentEstimates.map((est) => (
                <Link
                  key={est.id}
                  href={`/estimate/${est.id}`}
                  className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {est.title}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDate(est.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge
                      variant={
                        est.status === "WON"
                          ? "success"
                          : est.status === "LOST"
                            ? "error"
                            : "default"
                      }
                    >
                      {est.status}
                    </Badge>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(est.totalAmount)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/upload">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <Upload className="h-8 w-8 text-brand-blue" />
              <div>
                <h3 className="font-semibold text-foreground">
                  Upload Past Estimates
                </h3>
                <p className="text-sm text-muted">
                  Teach your AI how you price
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/intelligence">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <Brain className="h-8 w-8 text-brand-orange" />
              <div>
                <h3 className="font-semibold text-foreground">Intelligence Center</h3>
                <p className="text-sm text-muted">
                  See what your AI has learned
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
