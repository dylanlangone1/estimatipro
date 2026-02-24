import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft } from "lucide-react"

const plans = [
  {
    name: "Standard",
    price: 99,
    annualPrice: 79,
    description: "For contractors getting started with AI estimating",
    features: [
      "Unlimited AI estimates",
      "Natural language editing",
      "Document uploads (50/mo)",
      "Pricing DNA learning",
      "Deviation alerts",
      "PDF export (unbranded)",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    price: 249,
    annualPrice: 199,
    description: "For growing contractors who want branded output",
    popular: true,
    features: [
      "Everything in Standard",
      "Branded PDF estimates",
      "Company logo on PDFs",
      "Client management",
      "Win/loss tracking",
      "Unlimited uploads",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Max",
    price: 499,
    annualPrice: 399,
    description: "For established contractors who want it all",
    features: [
      "Everything in Pro",
      "Full branded proposals",
      "Plan & photo uploads",
      "Website integration",
      "Change order prediction",
      "Priority support",
    ],
    cta: "Start Free Trial",
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-brand-charcoal">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 py-4">
        <Link href="/">
          <span className="font-bold text-xl tracking-tight">
            <span className="text-white">ESTIM</span>
            <span className="text-brand-orange">AI</span>
            <span className="text-white"> PRO</span>
          </span>
        </Link>
        <Link href="/login">
          <Button size="sm">Get Started</Button>
        </Link>
      </nav>

      <div className="px-6 sm:px-12 py-16 max-w-5xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-white/50 hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Every plan includes a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-8 ${
                plan.popular
                  ? "border-brand-orange bg-brand-orange/10 relative"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              <p className="text-white/50 text-sm mt-1 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-white/50">/mo</span>
                <p className="text-sm text-white/40 mt-1">
                  or ${plan.annualPrice}/mo billed annually
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block">
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  size="lg"
                  className={`w-full ${!plan.popular ? "bg-transparent border-white/20 text-white hover:bg-white/10" : ""}`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
