"use client"

import { useState, useCallback, Suspense } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

type PromoStatus = "idle" | "checking" | "valid" | "invalid"

function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [promoCode, setPromoCode] = useState("")
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle")
  const [promoMessage, setPromoMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Live promo code validation on blur
  const validatePromoCode = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      setPromoStatus("idle")
      setPromoMessage("")
      return
    }
    setPromoStatus("checking")
    try {
      const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      setPromoStatus(data.valid ? "valid" : "invalid")
      setPromoMessage(data.message ?? "")
    } catch {
      setPromoStatus("idle")
      setPromoMessage("")
    }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !name) return

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Call the register API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, promoCode: promoCode.trim() || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.")
        setLoading(false)
        return
      }

      // Auto-sign in after registration.
      // In NextAuth v5 beta, signIn with redirect:false may return an opaque
      // redirect (result?.ok is falsy even on success). We navigate forward
      // any time there is no explicit error — session cookie is already set.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      })

      if (result?.error) {
        // Auth failed despite just creating the account — send to login
        setError("Account created! Please sign in to continue.")
        setLoading(false)
        window.location.href = "/login?registered=true"
        return
      }

      // No error → session was set; navigate regardless of result?.ok value
      const redirect = data.trialActivated ? "/dashboard?welcome=trial" : "/dashboard"
      window.location.href = redirect
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-charcoal flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <span className="font-bold text-2xl tracking-tight">
              <span className="text-brand-charcoal">ESTIM</span>
              <span className="text-brand-orange">AI</span>
              <span className="text-brand-charcoal"> PRO</span>
            </span>
            <p className="text-muted text-sm mt-2">
              Create your account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google sign up */}
          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            size="lg"
            className="w-full flex items-center justify-center gap-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-card-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted">or register with email</span>
            </div>
          </div>

          {/* Registration form */}
          <form onSubmit={handleRegister} className="space-y-3">
            <Input
              id="name"
              label="Full name"
              type="text"
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              id="email"
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Promo code field */}
            <div>
              <Input
                id="promoCode"
                label="Promo code"
                type="text"
                placeholder="Optional — enter code for free trial"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value)
                  setPromoStatus("idle")
                  setPromoMessage("")
                }}
                onBlur={(e) => validatePromoCode(e.target.value)}
                autoComplete="off"
              />
              {promoStatus === "checking" && (
                <p className="text-xs text-muted mt-1 pl-1">Checking code…</p>
              )}
              {promoStatus === "valid" && (
                <p className="text-xs text-green-600 mt-1 pl-1 font-medium">✓ {promoMessage}</p>
              )}
              {promoStatus === "invalid" && (
                <p className="text-xs text-red-500 mt-1 pl-1">✗ {promoMessage}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={loading || !email || !password || !name}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-orange hover:underline font-medium">
              Sign In
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-sm text-muted mt-6">
            <Link href="/" className="text-brand-orange hover:underline font-medium">
              &larr; Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
