/**
 * Fetch helpers that transparently add Vercel Blob authorization headers
 * for private-store blobs. Falls back to unauthenticated fetch for
 * local dev URLs and other non-blob URLs.
 */

function blobHeaders(url: string): Record<string, string> {
  if (url.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) {
    return { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
  }
  return {}
}

export function resolveUrl(fileUrl: string): string {
  return fileUrl.startsWith("http")
    ? fileUrl
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${fileUrl}`
}

export async function fetchBlobBuffer(fileUrl: string): Promise<Buffer> {
  const url = resolveUrl(fileUrl)
  const response = await fetch(url, { headers: blobHeaders(url) })
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
  return Buffer.from(await response.arrayBuffer())
}

export async function fetchBlobText(fileUrl: string): Promise<string> {
  const url = resolveUrl(fileUrl)
  const response = await fetch(url, { headers: blobHeaders(url) })
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
  return response.text()
}
