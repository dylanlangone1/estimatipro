export interface CategoryNarrative {
  category: string
  narrative: string
}

export interface TermsSection {
  id: string
  title: string
  content: string
  enabled: boolean
}

export interface ProposalData {
  aboutUs: string
  scopeOfWork: { category: string; narrative: string }[]
  timeline: { phase: string; duration: string; description: string }[]
  terms: string
  exclusions?: string
  warranty?: string
  generatedAt: string
  categoryNarratives?: CategoryNarrative[]
  // New fields for premium 10-page proposal
  projectOverview?: string    // executive summary (Page 3)
  investmentSummary?: string  // payment schedule narrative (Page 8)
}

export interface TimelinePhase {
  phase: string
  duration: string
  description: string
}

export interface ProposalDefaults {
  aboutUs?: string
  timelineTemplate?: TimelinePhase[]
  warranty?: string
  exclusions?: string
}

export interface TemplateConfig {
  header: {
    logoPosition: "left" | "center"
    showTagline: boolean
    borderStyle: "solid" | "accent"
    bgColor: string
  }
  body: {
    fontFamily: string
    alternateRowBg: boolean
    categoryStyle: "banner" | "underline"
  }
  totals: {
    style: "boxed" | "minimal"
    highlightColor: string
  }
  footer: {
    showGeneratedBy: boolean
    customText: string
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }
}

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
}
