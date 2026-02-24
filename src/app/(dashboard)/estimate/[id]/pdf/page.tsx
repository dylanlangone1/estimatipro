import { notFound } from "next/navigation"
import { getEstimateById } from "@/actions/estimate-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"

export default async function PDFPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const estimate = await getEstimateById(id)

  if (!estimate) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/estimate/${id}`}
            className="inline-flex items-center text-sm text-muted hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Estimate
          </Link>
          <h1 className="text-2xl font-bold text-foreground">PDF Preview</h1>
          <p className="text-sm text-muted mt-1">{estimate.title}</p>
        </div>
        <a href={`/api/pdf/${id}`} download>
          <Button>
            <Download className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
        </a>
      </div>

      <Card>
        <CardContent className="p-0">
          <iframe
            src={`/api/pdf/${id}`}
            className="w-full h-[800px] rounded-xl"
            title="PDF Preview"
          />
        </CardContent>
      </Card>
    </div>
  )
}
