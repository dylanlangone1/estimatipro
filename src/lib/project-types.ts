export const PROJECT_TYPES = [
  { key: "kitchen_remodel", label: "Kitchen Remodel" },
  { key: "bathroom_remodel", label: "Bathroom Remodel" },
  { key: "full_home_renovation", label: "Full Home Renovation" },
  { key: "room_addition", label: "Room Addition" },
  { key: "deck_patio", label: "Deck / Patio" },
  { key: "basement_finish", label: "Basement Finish" },
  { key: "new_construction", label: "New Construction" },
  { key: "commercial_ti", label: "Commercial TI" },
  { key: "roof_replacement", label: "Roof Replacement" },
  { key: "window_replacement", label: "Window Replacement" },
  { key: "siding_replacement", label: "Siding Replacement" },
  { key: "electrical_panel_upgrade", label: "Electrical Panel Upgrade" },
  { key: "hvac_replacement", label: "HVAC Replacement" },
  { key: "custom_other", label: "Custom / Other" },
] as const

export type ProjectTypeKey = (typeof PROJECT_TYPES)[number]["key"]
