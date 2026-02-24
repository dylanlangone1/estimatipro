# EstimAI Pro 2.0 — Complete Patent Portfolio Analysis

**Prepared for:** Cowork (Patent Counsel)
**Date:** February 24, 2026
**Platform:** EstimAI Pro 2.0 — AI-Powered Construction Estimating SaaS
**Stack:** Next.js 16, React 19, TypeScript, PostgreSQL, Claude AI (Anthropic), Stripe
**URL:** estimaipro.com

---

## TABLE OF CONTENTS

1. [Existing Patents (Already Drafted)](#existing-patents)
2. [New Patent Candidates](#new-patent-candidates)
   - Patent 6: Context Rule Engine + Synonym Intelligence
   - Patent 7: Multi-Source Dynamic Context Injection Pipeline
   - Patent 8: Automatic Correction-to-Rule Promotion
   - Patent 9: AI Logo Analysis & Auto Brand Theming
   - Patent 10: Multi-Mode Input Enrichment System
   - Patent 11: Contract Mode Language Switching
   - Patent 12: Hierarchical Terms Resolution Chain
   - Patent 13: Location-Aware Permit Intelligence
   - Patent 14: Data-Anchored Category Narratives
   - Patent 15: Contextual AI Estimate Advisor
   - Patent 16: PDF Design Token + Style Factory System
3. [Portfolio Summary & Priority Matrix](#portfolio-summary)
4. [Defensive Strategy: The Estimation Intelligence Loop](#defensive-strategy)

---

## EXISTING PATENTS (Already Drafted) {#existing-patents}

These 5 patents have already been drafted and exist as .docx files. They should be reviewed alongside this analysis to ensure alignment and no gaps.

| # | Title | File | Core Innovation |
|---|-------|------|-----------------|
| 1 | **Persistent Training System** | `Patent_1_Persistent_Training_System.docx` | Auto-learns from user corrections, creates training rules, priority-based injection into AI prompts |
| 2 | **Supplier Invoice Intelligence** | `Patent_2_Supplier_Invoice_Intelligence.docx` | Multi-format document parsing, brand extraction, material price normalization, supplier ranking |
| 3 | **AI Branded Templates** | `Patent_3_AI_Branded_Templates.docx` | Dynamic PDF styling via TemplateConfig, logo-based color theming, base64 embedding |
| 4 | **Proposal Engine** | `Patent_4_Proposal_Engine.docx` | 6-section proposal generation, per-section regeneration, client-aware defaults |
| 5 | **Intelligence Center (Pricing DNA)** | `Patent_5_Intelligence_Center.docx` | Multi-source pricing profile aggregation, confidence-weighted category patterns |

---

## NEW PATENT CANDIDATES (Not Yet Drafted) {#new-patent-candidates}

---

### Patent 6: Context Rule Engine with Construction-Domain Synonym Intelligence

**What it does:** A rule engine that automatically modifies AI-generated construction estimates by matching project descriptions against trigger conditions (keywords, categories, project types) and injecting constraints — using a 45+ group construction synonym dictionary for fuzzy matching.

**Key claims:**

1. **Trigger-based constraint injection** — Rules fire on KEYWORD, CATEGORY, PROJECT_TYPE, or ALWAYS triggers, injecting `mustInclude`, `mustExclude`, `mustAssume`, `neverAssume` constraints into the AI generation prompt

2. **Construction-specific synonym matching** — 45+ synonym groups enable fuzzy matching even when users describe projects in different terminology:
   - "tear-off" ↔ tearoff / remove existing / strip existing / demo existing
   - "railing" ↔ guardrail / handrail / baluster
   - "flashing" ↔ flash / step flash / counter flash
   - "decking" ↔ deck boards / composite decking / treated decking
   - ...and 40+ more groups

3. **Post-generation coherence validation** — After AI generates an estimate, a validation pass checks every matched rule's constraints against the output, generating warnings for missing required items or accidentally included forbidden items

4. **Confidence-based severity scoring** — Word-level overlap analysis determines match confidence and warning severity

**Source files:** `src/lib/ai/context-rule-engine.ts`, `src/lib/ai/coherence-engine.ts`

**Why it's novel:** No existing estimation system combines triggered constraint injection with construction-domain fuzzy synonym matching and post-generation validation. The synonym dictionary alone is a domain-specific innovation that prevents AI errors due to terminology variation.

**Patent strength: HIGH**

---

### Patent 7: Multi-Source Dynamic Context Injection Pipeline for AI Estimation

**What it does:** A pipeline that dynamically enriches a single AI estimation call with 7+ independent data sources, each loaded and formatted in parallel, then injected as structured context into the AI system prompt.

**Key claims:**

1. **7-source context assembly** in a single AI call:
   - Training rules (user-defined patterns, priority-ordered)
   - Context rules (triggered constraints with fuzzy matching)
   - Recent correction logs (learned patterns from edits)
   - Pricing DNA (category-level historical pricing patterns with confidence scores)
   - Material Price Library (top 20 most-used materials with supplier pricing)
   - Brand context (preferred material brands ranked by usage frequency)
   - Location-based permit intelligence (jurisdiction-specific permit costs)

2. **Ephemeral prompt caching** — The massive assembled system prompt (6,000+ characters of base prompt + dynamic context) uses Claude's cache_control to avoid re-processing on subsequent calls, reducing latency and cost

3. **Fire-and-forget analytics** — Rule application is tracked asynchronously (incrementing `timesApplied` counters) without blocking the user response

4. **Server-side markup computation** — Markup is calculated server-side after AI generation to prevent AI hallucination of financial totals

5. **Context-aware prompt construction** — Each data source is formatted specifically for AI comprehension (e.g., Pricing DNA formatted as "For [category]: avg unit cost $X, avg labor rate $Y, confidence Z%")

**Source files:** `src/app/api/ai/generate/route.ts`, `src/lib/ai/estimate-generator.ts`, `src/lib/ai/training-context-loader.ts`, `src/lib/ai/pricing-dna-engine.ts`, `src/lib/ai/material-library-engine.ts`, `src/lib/ai/brand-extraction-engine.ts`

**Why it's novel:** No existing system assembles this many heterogeneous user-specific data sources into a single AI estimation call. The combination of historical pricing patterns + learned corrections + triggered rules + supplier data + brand preferences creates a "digital twin" of the contractor's pricing brain.

**Patent strength: HIGH**

---

### Patent 8: Automatic Correction-to-Rule Promotion System

**What it does:** A self-improving estimation system that automatically detects when a user makes the same type of correction 3+ times, extracts a generalizable rule from those corrections using AI, and promotes it to a permanent training rule — all without any explicit user action.

**Key claims:**

1. **Correction detection** — Compares estimate before/after edits to identify 4 correction types: PRICE_CHANGE, QUANTITY_CHANGE, ITEM_ADDED, ITEM_REMOVED

2. **AI-powered rule extraction** — For each correction, AI analyzes the change context (what changed, why the user likely changed it) and extracts a generalizable rule with a confidence score

3. **Semantic similarity matching** — Identifies similar corrections using prefix matching (first 50 characters) with case-insensitive substring analysis across the user's correction history

4. **Auto-promotion threshold** — When 3+ similar corrections are detected, the system automatically creates a permanent TrainingRule with source=CORRECTION, without requiring any user action

5. **Confidence filtering** — Only rules with AI-assigned confidence > 0.5 are saved, preventing noisy or one-off corrections from polluting the rule set

6. **Correction analytics** — Each log includes: previous/new values, extracted rule, category, confidence score, promotion status, and similar correction count

**Source files:** `src/lib/ai/correction-learning-engine.ts`

**Why it's novel:** This is implicit machine learning from natural user behavior. The user never creates a rule — they just fix estimates as they normally would, and the system learns. The 3-correction threshold prevents one-off corrections from creating bad rules. No competing estimation tool has this self-improving capability.

**Patent strength: HIGH**

---

### Patent 9: AI-Powered Logo Analysis & Automatic Brand Theming System

**What it does:** Uses computer vision AI to analyze a company's logo image, extract dominant brand colors, generate complementary color harmonies, and automatically apply the extracted palette across all document templates — without any manual color entry.

**Key claims:**

1. **Vision-based color extraction** — Sends logo image (including base64 data URIs) to Claude's vision API for dominant color identification

2. **Automatic color harmony generation** — When logo has limited colors (e.g., monochrome), AI generates complementary secondary and accent colors that form a professional, harmonious palette

3. **Base64 data URI processing** — Handles both external URLs and inline base64-encoded images, solving CORS issues in server-side PDF rendering

4. **Cascade application** — Extracted colors automatically populate the TemplateConfig structure, which drives styling across all PDF types:
   - Header backgrounds
   - Accent bars and dividers
   - Table header colors
   - Category row borders
   - Totals highlighting
   - Section title colors

**Source files:** `src/app/api/settings/brand/detect-colors/route.ts`, `src/components/pdf/pdf-design-system.ts`

**Why it's novel:** Existing tools require users to manually pick colors with a color picker. This system extracts colors from existing brand assets and automatically generates a full multi-document design system — closing the gap between "I uploaded my logo" and "all my documents are professionally branded."

**Patent strength: MEDIUM**

---

### Patent 10: Multi-Mode Construction Estimate Input Enrichment System

**What it does:** Three distinct input modes (AI freeform, Guided wizard, Manual checklist) that each apply different enrichment strategies — injecting expert guidance, cost benchmarks, scope recommendations, and quality-level context — before AI processes the input into a full estimate.

**Key claims:**

1. **AI Mode enrichment** — Freeform text enhanced with quality-level multipliers (Budget 0.7x → Luxury 2.5x) and project-type detection

2. **Guided Mode enrichment** — Simple wizard answers (project type + sqft + trades + quality) expanded with:
   - Typical scope items for that project type
   - Project-specific expert guidance (e.g., "for kitchen remodels, consider plumbing stub relocation, electrical sub-panel upgrade")
   - Cost benchmarks per quality level ($/SF ranges by project type)
   - Project category context (new build vs renovation vs replacement vs repair)

3. **Manual Mode enrichment** — User-selected scope items augmented with:
   - Explicit exclusion list (items NOT selected are told to AI as "do not include")
   - Category context for selected items
   - Quality-level multipliers applied to selected items

4. **Preference persistence** — User's mode preferences, project type selections, trade selections, and quality levels saved to `user.estimatePreferences` JSON for auto-population on next estimate

**Source files:** `src/lib/ai/description-builder.ts`, `src/components/estimates/estimate-form.tsx`

**Why it's novel:** No estimation tool offers three parallel input modes with distinct enrichment pipelines. The guided mode's expert guidance injection transforms simple 4-question wizard answers into expert-level project descriptions that produce significantly more accurate estimates.

**Patent strength: MEDIUM**

---

### Patent 11: Dynamic Legal Document Language Switching via Contract Mode Toggle

**What it does:** A single boolean toggle (`isContract`) that transforms an entire estimate document's language, tone, and legal standing across all PDF types — changing headings, adding binding clauses, modifying signature blocks, and inserting legal preambles — without regenerating the underlying estimate data.

**Key claims:**

1. **Single-toggle transformation** — One PATCH API request changes document presentation across 4 PDF types simultaneously

2. **Language substitutions include:**
   - "Project Estimate" → "Construction Agreement"
   - "Estimated Investment" → "Contract Amount"
   - Signature page: adds "THIS IS A BINDING AGREEMENT" notice
   - Terms page: prepends legal preamble ("This Construction Agreement ('Agreement') is entered into...")
   - Adds governing law clause based on user's registered state

3. **Data-independent** — Same line items, totals, and terms render in either estimate or contract mode — only the presentation language changes

4. **Tier-gated** — Contract mode available only to PRO+ subscribers ($99/mo+), providing premium value without additional data entry

5. **Reversible** — Toggle can be switched back to estimate mode at any time, preserving all underlying data

**Source files:** `src/app/api/estimates/[id]/contract/route.ts`, `src/components/pdf/client-estimate-pdf.tsx`, `src/components/pdf/proposal-pdf.tsx`

**Why it's novel:** Converting an estimate to a contract traditionally requires re-creating the document in a different tool. This system reuses 100% of the estimate data and changes only the presentation layer, making the transition instant and error-free.

**Patent strength: MEDIUM**

---

### Patent 12: Hierarchical Terms Resolution with Three-Level Priority Chain

**What it does:** A cascading resolution system for legal terms and conditions that checks three levels — per-estimate overrides, user-level defaults, and system-wide fallbacks — enabling project-specific customization while maintaining consistent defaults.

**Key claims:**

1. **Three-level priority chain:**
   - **Level 1 (highest):** Per-estimate override (`estimate.proposalData.termsStructured`) — project-specific terms customized for a particular client or job
   - **Level 2:** User defaults (`user.defaultTerms`) — company-wide standard terms set once in Settings
   - **Level 3 (fallback):** System defaults (`DEFAULT_TERMS`) — hardcoded 6-section industry-standard terms (Payment, Timeline, Changes, Warranty, Exclusions, Insurance)

2. **Structured section format** — Each level uses identical `TermsSection[]` schema (`id`, `title`, `content`, `enabled` boolean) enabling seamless fallback without format conversion

3. **Per-section enable/disable** — Individual sections can be toggled on/off without deletion, preserved across all resolution levels

4. **AI-generated terms** — Users can generate industry-appropriate terms based on their registered trades and state, which populate the user-defaults level

5. **Resolution function** — Server-side `resolveTerms()` checks each level in order, returning the first non-empty result

**Source files:** `src/app/api/pdf/[id]/route.ts` (`resolveTerms` function), `src/app/api/settings/terms/route.ts`, `src/types/proposal.ts`

**Why it's novel:** Most systems have either hardcoded terms or fully custom terms. The three-level cascade allows contractors to set company-wide defaults once, then override specific sections for individual projects — a workflow that mirrors how legal terms actually work in construction.

**Patent strength: MEDIUM**

---

### Patent 13: Location-Aware Permit Cost Intelligence System

**What it does:** Automatically researches and injects jurisdiction-specific permit costs (building permits, trade permits, impact fees) into AI-generated estimates based on the project's physical location, falling back to percentage-based estimates when specific data isn't available.

**Key claims:**

1. **Geographic permit lookup** — When project location is provided, AI is instructed to research actual local permit fees for that specific jurisdiction

2. **Multi-permit-type coverage** — Building permits, electrical permits, plumbing permits, mechanical permits, impact fees, plan review fees

3. **Tiered fallback:**
   - Location provided → research actual fee schedules for that jurisdiction
   - No location → use 1-3% of project cost with $500 minimum

4. **Specific dollar amounts** — Uses actual fee schedules when available rather than generic percentages

5. **Integrated into line items** — Permit costs appear as standard line items in the estimate (not separate surcharges), maintaining consistency with the rest of the estimate structure

**Source files:** `src/app/api/ai/generate/route.ts` (permit intelligence injection), `src/lib/ai/prompts.ts`

**Why it's novel:** Existing tools either ignore permits entirely or add a flat percentage. Injecting jurisdiction-specific research into AI generation produces more accurate estimates — permit costs can vary from $500 to $50,000+ depending on location and project scope.

**Patent strength: MEDIUM**

---

### Patent 14: Data-Anchored Category Narrative Generation

**What it does:** AI generates professional, client-facing scope descriptions for each work category that are anchored to actual line item data (specific materials, quantities, methods) rather than generic template text — while explicitly excluding dollar amounts to protect the contractor's cost structure.

**Key claims:**

1. **Line-item-referenced narratives** — AI must reference specific materials (e.g., "LVL beam", "James Hardie fiber cement siding") and methods from the actual estimate data

2. **Cost obfuscation** — Narratives describe scope and methodology without revealing individual cost breakdowns, protecting the contractor's pricing structure

3. **Per-category generation** — Each work category gets an independent 2-3 sentence professional narrative

4. **Caching with regeneration** — Narratives stored in `proposalData.categoryNarratives` JSON, regenerated on demand when estimate changes

5. **Client-facing markup integration** — Category totals displayed alongside narratives include the contractor's markup, hiding the internal cost structure from the client

**Source files:** `src/app/api/ai/category-narratives/route.ts`, `src/components/pdf/pdf-shared-components.tsx` (PDFCategoryBlock)

**Why it's novel:** Template-based systems produce generic scope descriptions ("We will perform framing work"). This system generates descriptions factually grounded in actual estimate data ("Install engineered LVL beams at all load-bearing points with Simpson Strong-Tie connectors"), making proposals more credible and professional.

**Patent strength: MEDIUM**

---

### Patent 15: Contextual AI Estimate Advisor (Wizard)

**What it does:** A conversational AI system that answers user questions about their specific estimate by injecting the complete estimate data (line items, categories, financial breakdowns, labor/material splits) as context, providing actionable advice rather than generic information.

**Key claims:**

1. **Estimate-scoped context injection** — Full financial summary (subtotal, markup, tax, total), category breakdown with subtotals, labor/material splits, client info, and project metadata injected into each query

2. **Constrained response format** — System prompt forces 2-4 paragraph direct advice (no bullet lists), must reference actual numbers from the estimate

3. **Actionable suggestions** — Responses suggest specific changes (e.g., "Your framing labor at $85/hr is 15% above your historical average of $74/hr — consider adjusting line items 4-7") rather than general guidance

4. **Integrated UI** — Chat interface embedded directly within the estimate view for immediate context — no switching between tools

5. **Conversational refinement** — Users can ask follow-up questions about specific line items, categories, or pricing decisions

**Source files:** `src/app/api/ai/wizard/route.ts`, `src/components/estimates/ai-wizard.tsx`

**Why it's novel:** Generic AI chat has no project context. This system converts a static estimate into an interactive consultation — the AI "knows" every line item, every cost, and can give specific, numbers-backed advice tailored to that exact project.

**Patent strength: MEDIUM-HIGH**

---

### Patent 16: Shared PDF Design Token System with Style Factory Architecture

**What it does:** A centralized design system that defines typography scales, spacing grids, color palettes, and border radii as tokens, then provides factory functions that generate complete PDF stylesheets from brand color inputs — enabling consistent professional output across 4 different PDF document types.

**Key claims:**

1. **Design token architecture:**
   - 13-level font size scale (7pt to 36pt)
   - 4 font weights (Regular 400, Medium 500, SemiBold 600, Bold 700)
   - 4 line heights (tight, normal, relaxed, loose)
   - 13-level spacing grid (4px base unit: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64)
   - 6 border radii (0 to 12px)
   - 13 neutral gray values

2. **Style factory functions** — `createPageStyles()`, `createTableStyles()`, `createTotalsStyles()`, `createTermsStyles()`, `createSectionStyles()`, `createSignatureStyles()`, `createNotesStyles()` — each accepts a brand color object and returns a complete stylesheet

3. **Reusable PDF sub-components** — `PDFPageHeader`, `PDFPageFooter` (with automatic page numbering), `PDFAccentBar`, `PDFTotalsBlock`, `PDFSectionTitle`, `PDFCategoryBlock` shared across all 4 PDF types

4. **Brand color override system** — Default colors merged with user overrides via `getColors()`, automatically propagated through all factory functions

**Source files:** `src/components/pdf/pdf-design-system.ts`, `src/components/pdf/pdf-shared-components.tsx`

**Why it's novel:** PDF generation libraries produce unstyled output. This token-based design system brings web design system thinking to server-side PDF rendering, ensuring professional consistency across document types while allowing per-user brand customization.

**Patent strength: LOW-MEDIUM** (may be better as trade secret)

---

## COMPLETE PATENT PORTFOLIO SUMMARY {#portfolio-summary}

| # | Patent Title | Status | Strength | Priority |
|---|-------------|--------|----------|----------|
| 1 | Persistent Training System | **DRAFTED** | HIGH | — |
| 2 | Supplier Invoice Intelligence | **DRAFTED** | HIGH | — |
| 3 | AI Branded Templates | **DRAFTED** | MEDIUM-HIGH | — |
| 4 | Proposal Engine | **DRAFTED** | MEDIUM-HIGH | — |
| 5 | Intelligence Center (Pricing DNA) | **DRAFTED** | HIGH | — |
| 6 | Context Rule Engine + Synonym Intelligence | **NEW** | HIGH | File First |
| 7 | Multi-Source Dynamic Context Injection Pipeline | **NEW** | HIGH | File First |
| 8 | Correction-to-Rule Auto-Promotion | **NEW** | HIGH | File First |
| 9 | AI Logo Analysis & Auto Brand Theming | **NEW** | MEDIUM | File Second |
| 10 | Multi-Mode Input Enrichment | **NEW** | MEDIUM | Consider Bundling |
| 11 | Contract Mode Language Switching | **NEW** | MEDIUM | File Second |
| 12 | Hierarchical Terms Resolution Chain | **NEW** | MEDIUM | Consider Bundling |
| 13 | Location-Aware Permit Intelligence | **NEW** | MEDIUM | File Second |
| 14 | Data-Anchored Category Narratives | **NEW** | MEDIUM | Consider Bundling |
| 15 | Contextual AI Estimate Advisor | **NEW** | MEDIUM-HIGH | File Second |
| 16 | PDF Design Token + Style Factory | **NEW** | LOW-MEDIUM | Trade Secret |

### Filing Priority Recommendations

**File first (highest novelty + defensibility):**
- **Patent 6** (Context Rules + Synonyms) — Unique domain-specific NLP with no comparable prior art
- **Patent 7** (Multi-Source Pipeline) — Core competitive moat, extremely difficult to replicate
- **Patent 8** (Auto-Promotion) — Novel implicit learning mechanism, highly defensible

**File second (strong but potentially broader prior art):**
- **Patent 15** (AI Advisor) — Contextual Q&A is growing, but estimate-specific is novel
- **Patent 9** (Logo Color Extraction) — Unique in construction SaaS vertical
- **Patent 11** (Contract Mode) — Simple but defensible workflow innovation
- **Patent 13** (Permit Intelligence) — Location-aware cost estimation is valuable

**Consider bundling:**
- Patents 12 + 14 → "Intelligent Document Content Resolution System" (terms cascade + data-anchored narratives)
- Patent 10 → could fold into Patent 7 as "multi-mode input enrichment as part of the pipeline"
- Patent 16 → likely better protected as trade secret (design systems are hard to enforce via patent)

---

## DEFENSIVE STRATEGY: The Estimation Intelligence Loop {#defensive-strategy}

The combination of Patents 1 + 5 + 6 + 7 + 8 creates a **self-reinforcing estimation intelligence loop** that no competitor can replicate without infringing multiple patents:

```
Step 1: User creates estimates
    → Pricing DNA learns category patterns (Patent 5)

Step 2: User corrects estimates
    → Rules auto-generate from corrections (Patent 8)

Step 3: Next estimate generation
    → Training rules + Pricing DNA + context rules + material library +
      brand preferences + permit intelligence all injected (Patent 7)

Step 4: Post-generation validation
    → Context rules with synonym matching validate output (Patent 6)

Step 5: System gets smarter with every use
    → Training persists across all future estimates (Patent 1)

→ LOOP REPEATS — each estimate makes the system more accurate
```

**This loop is the core competitive moat of EstimAI Pro.** A competitor would need to independently develop:
- A correction learning engine (Patent 1 + 8)
- A multi-source pricing profile (Patent 5)
- A context rule engine with domain synonyms (Patent 6)
- A pipeline that assembles all sources (Patent 7)

Infringing any single patent breaks the loop. Together, they create a defensible ecosystem that improves with scale — the more a contractor uses EstimAI Pro, the more accurate and valuable it becomes, creating natural lock-in reinforced by IP protection.

---

*Document generated from comprehensive codebase analysis of EstimAI Pro 2.0*
*Total innovations identified: 16 (5 drafted + 11 new)*
