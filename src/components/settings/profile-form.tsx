"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { updateProfile } from "@/actions/settings-actions"
import { User, Building, Save } from "lucide-react"

interface ProfileFormProps {
  user: {
    name: string | null
    email: string
    companyName: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    licenseNumber: string | null
    websiteUrl: string | null
    tagline: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: user.name || "",
    companyName: user.companyName || "",
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    zip: user.zip || "",
    licenseNumber: user.licenseNumber || "",
    websiteUrl: user.websiteUrl || "",
    tagline: user.tagline || "",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateProfile(form)
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand-orange" />
            <h2 className="font-semibold text-foreground">Personal Info</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              label="Full Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="John Smith"
            />
            <Input
              id="email"
              label="Email"
              value={user.email}
              disabled
              className="opacity-60"
            />
            <Input
              id="phone"
              label="Phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
            <Input
              id="licenseNumber"
              label="License Number"
              value={form.licenseNumber}
              onChange={(e) => update("licenseNumber", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-brand-blue" />
            <h2 className="font-semibold text-foreground">Company</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="companyName"
              label="Company Name"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Acme Construction LLC"
            />
            <Input
              id="tagline"
              label="Tagline"
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Quality you can count on"
            />
            <Input
              id="websiteUrl"
              label="Website"
              value={form.websiteUrl}
              onChange={(e) => update("websiteUrl", e.target.value)}
              placeholder="https://example.com"
            />
            <Input
              id="address"
              label="Street Address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St"
            />
            <Input
              id="city"
              label="City"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Springfield"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="state"
                label="State"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder="IL"
              />
              <Input
                id="zip"
                label="ZIP"
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="62701"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="h-4 w-4 mr-1.5" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
