import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"

export default async function ClientsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { estimates: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <p className="text-muted mt-1">Manage your client contacts.</p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No clients yet</h2>
            <p className="text-muted">
              Clients will appear here as you create estimates and assign them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    <p className="text-sm text-muted">
                      {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact info"}
                    </p>
                  </div>
                  <span className="text-sm text-muted">
                    {client._count.estimates} estimate{client._count.estimates !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
