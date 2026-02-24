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
