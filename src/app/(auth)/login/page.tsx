"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

const errorMessages: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please try again.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in method.",
  Default: "Something went wrong. Please try again.",
  Callback: "Sign-in callback error. Please try again.",
  AccessDenied: "Access denied. Please try again.",
  Configuration: "Server configuration error. Please contact support.",
}

const successMessages: Record<string, string> = {
  registered: "Account created! Sign in below to get started.",
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(errorMessages[errorParam] || errorMessages.Default)
    }
    const successParam = searchParams.get("registered")
    if (successParam) {
      setSuccess(successMessages.registered)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError(errorMessages[result.error] || "Invalid email or password.")
        setLoading(false)
      } else if (result?.ok) {
        window.location.href = "/dashboard"
      }
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
              Your Pricing Brain. Powered by AI.
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google sign in */}
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
            Continue with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-card-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted">or sign in with email</span>
            </div>
          </div>

          {/* Email + Password login */}
          <form onSubmit={handleLogin} className="space-y-3">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand-orange hover:underline font-medium">
              Create Account
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
