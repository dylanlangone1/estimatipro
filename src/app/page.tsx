import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Upload, Brain, FileText, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-charcoal">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 py-4">
        <span className="font-bold text-xl tracking-tight">
          <span className="text-white">ESTIM</span>
          <span className="text-brand-orange">AI</span>
          <span className="text-white"> PRO</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-white/70 hover:text-white text-sm hidden sm:block">
            Pricing
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-12 py-20 sm:py-32 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-orange/10 rounded-full mb-6">
          <Sparkles className="h-4 w-4 text-brand-orange" />
          <span className="text-brand-orange text-sm font-medium">AI-Powered Construction Estimating</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6">
          Stop Guessing.<br />
          <span className="text-brand-orange">Start Knowing.</span>
        </h1>
        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
          The AI that learns YOUR pricing and makes you better at every estimate. Describe a job, get a detailed estimate in seconds. Upload your history, and the AI learns your style.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="text-base px-8">
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="text-base px-8 bg-transparent border-white/20 text-white hover:bg-white/10">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 sm:px-12 py-20 bg-brand-charcoal-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            How It Works
          </h2>
          <p className="text-white/50 text-center mb-12 max-w-xl mx-auto">
            Three simple steps to faster, smarter estimates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                step: "1",
                title: "Describe the Job",
                desc: "Type what the project is in plain English. The AI generates a detailed estimate in seconds.",
              },
              {
                icon: Upload,
                step: "2",
                title: "Upload Your History",
                desc: "Feed it your past estimates. The AI learns your pricing, your markups, your style.",
              },
              {
                icon: Brain,
                step: "3",
                title: "Get Smarter Every Time",
                desc: "Every estimate you create, every edit you make — the AI learns and gets better.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-orange/10 mb-4">
                  <item.icon className="h-7 w-7 text-brand-orange" />
                </div>
                <div className="text-brand-orange text-sm font-bold mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-12 py-20 bg-brand-charcoal">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Sparkles, title: "AI Estimate Generation", desc: "Describe any project and get a detailed, categorized estimate with realistic pricing." },
              { icon: Brain, title: "Pricing DNA", desc: "Your AI builds a personal pricing model from your historical data. Every estimate gets smarter." },
              { icon: FileText, title: "Professional PDFs", desc: "Export branded proposals and estimates as beautiful PDF documents." },
              { icon: Upload, title: "Document Upload", desc: "Upload past estimates in any format. PDF, Excel, Word, CSV — the AI extracts pricing data." },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <feature.icon className="h-8 w-8 text-brand-orange mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-white/50 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="px-6 sm:px-12 py-20 bg-brand-charcoal-light">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-white/50 mb-12 max-w-xl mx-auto">
            Start with a free trial. Upgrade when you're ready.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Standard", price: "$99", features: ["Unlimited AI estimates", "Document uploads", "Pricing DNA", "PDF export"] },
              { name: "Pro", price: "$249", popular: true, features: ["Everything in Standard", "Branded PDFs", "Client management", "Win/loss tracking"] },
              { name: "Max", price: "$499", features: ["Everything in Pro", "Full proposals", "Plan uploads", "Priority support"] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
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
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/50">/mo</span>
                </div>
                <ul className="space-y-2 text-left mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-brand-orange shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className={`w-full ${!plan.popular ? "bg-transparent border-white/20 text-white hover:bg-white/10" : ""}`}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 sm:px-12 py-16 bg-brand-charcoal">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/40 text-lg italic">
            &ldquo;Built by a contractor who was tired of spreadsheets and $500/month software that doesn&apos;t learn a damn thing.&rdquo;
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 sm:px-12 py-20 text-center bg-brand-charcoal">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to estimate smarter?
        </h2>
        <p className="text-white/50 mb-8 max-w-md mx-auto">
          Join contractors who are saving hours on every estimate.
        </p>
        <Link href="/login">
          <Button size="lg" className="text-base px-8">
            Start Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 sm:px-12 py-8 bg-brand-charcoal">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">ESTIM</span>
            <span className="text-brand-orange">AI</span>
            <span className="text-white"> PRO</span>
          </span>
          <p className="text-white/30 text-sm">
            &copy; {new Date().getFullYear()} EstimAI Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
