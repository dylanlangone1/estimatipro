"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { TemplateConfig } from "@/types/proposal"

interface ProfileData {
  name?: string
  companyName?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  licenseNumber?: string
  websiteUrl?: string
  tagline?: string
}

export async function updateProfile(data: ProfileData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      companyName: data.companyName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      licenseNumber: data.licenseNumber,
      websiteUrl: data.websiteUrl,
      tagline: data.tagline,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/settings/brand")
}

export async function updateLogoUrl(logoUrl: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { logoUrl },
  })

  revalidatePath("/settings/brand")
}

export async function updateBrandColors(brandColors: { primary: string; secondary: string; accent: string }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { brandColors },
  })

  revalidatePath("/settings/brand")
}

export async function getActiveTemplate() {
  const session = await auth()
  if (!session?.user?.id) return null

  return prisma.brandTemplate.findFirst({
    where: { userId: session.user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
  })
}

export async function saveTemplate(templateConfig: TemplateConfig, name?: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Deactivate previous templates
  await prisma.brandTemplate.updateMany({
    where: { userId: session.user.id, isActive: true },
    data: { isActive: false },
  })

  // Create new active template
  const template = await prisma.brandTemplate.create({
    data: {
      userId: session.user.id,
      name: name || "Default",
      isActive: true,
      templateConfig: JSON.parse(JSON.stringify(templateConfig)),
    },
  })

  revalidatePath("/settings/brand")
  return template
}
