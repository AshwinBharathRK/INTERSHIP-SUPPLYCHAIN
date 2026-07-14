{
  "product": {
    "name": "AURORA FORGE",
    "tagline": "Enterprise AI Supply Chain Digital Twin",
    "brand_attributes": [
      "cinematic-premium",
      "mission-control clarity",
      "trustworthy enterprise",
      "spatial depth (VisionOS-inspired)",
      "precision motion (Linear-inspired)",
      "map/3D-first performance aware"
    ]
  },
  "design_personality": {
    "north_star": "Palantir-grade operational clarity with VisionOS-like floating glass panels and ArcGIS spatial confidence. Everything feels physically layered, lit from one direction, and animated with intent.",
    "do_not": [
      "generic dashboard template look",
      "flat monochrome with no depth",
      "over-blur on map/3D pages",
      "purple/pink saturated gradients",
      "text on raw glass without scrim",
      "instant appearance/disappearance (no motion)"
    ],
    "layout_principles": {
      "reading_flow": "Left-rail navigation + top command bar; content uses F-pattern scanning with strong section headers and dense-but-breathable spacing.",
      "depth_model": "Base canvas (solid dark) → aurora atmosphere (subtle) → glass panels (primary surfaces) → strokes/rim lights → content.",
      "light_direction": "Top-left key light; rim highlights on top/left edges; shadows fall down/right. Keep consistent across all panels.",
      "density": "Enterprise-dense but premium: use 2–3x more spacing than typical dashboards; rely on typography + separators instead of heavy borders."
    }
  },
  "typography": {
    "google_fonts": {
      "display": {
        "family": "Space Grotesk",
        "weights": [400, 500, 600, 700]
      },
      "body": {
        "family": "IBM Plex Sans",
        "weights": [400, 500, 600]
      },
      "mono": {
        "family": "IBM Plex Mono",
        "weights": [400, 500]
      }
    },
    "usage": {
      "headings": "Space Grotesk (tight tracking, slightly futuristic)",
      "body": "IBM Plex Sans (enterprise legibility)",
      "numbers_kpis": "IBM Plex Sans 600 with tabular-nums; use mono only for IDs, timestamps, route codes"
    },
    "tailwind_text_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em]",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-lg md:text-xl font-semibold tracking-[-0.01em]",
      "kpi_value": "text-2xl md:text-3xl font-semibold tabular-nums",
      "body": "text-sm md:text-base leading-relaxed",
      "small": "text-xs text-muted-foreground"
    }
  },
  "color_system": {
    "notes": [
      "Dark theme only.",
      "NO transparent app background: base must be solid.",
      "Aurora gradients are decorative overlays only and must not exceed 20% of viewport.",
      "Avoid purple. Use ocean/teal/cyan + ember/orange accents + neutral graphite."
    ],
    "tokens_css": {
      "path": "/app/frontend/src/index.css",
      "instructions": "Replace :root and .dark HSL tokens with the following. Keep Tailwind/shadcn variable names intact. Add extra custom properties under :root for motion/elevation/glass/chart palettes.",
      "css": ":root {\n  /* Base (dark-only product; keep :root aligned to dark to avoid flash) */\n  --background: 222 22% 6%; /* graphite */\n  --foreground: 210 20% 96%;\n\n  --card: 222 22% 8%;\n  --card-foreground: 210 20% 96%;\n\n  --popover: 222 22% 8%;\n  --popover-foreground: 210 20% 96%;\n\n  /* Brand */\n  --primary: 190 92% 52%; /* cyan-teal */\n  --primary-foreground: 222 22% 8%;\n\n  --secondary: 222 18% 14%;\n  --secondary-foreground: 210 20% 96%;\n\n  --muted: 222 16% 12%;\n  --muted-foreground: 215 14% 70%;\n\n  --accent: 204 88% 56%; /* ocean blue */\n  --accent-foreground: 222 22% 8%;\n\n  --destructive: 0 78% 56%;\n  --destructive-foreground: 210 20% 96%;\n\n  --border: 222 16% 18%;\n  --input: 222 16% 18%;\n  --ring: 190 92% 52%;\n\n  --radius: 0.9rem;\n\n  /* Semantic status */\n  --success: 156 72% 44%;\n  --warning: 34 92% 56%;\n  --critical: 0 78% 56%;\n  --info: 204 88% 56%;\n\n  /* Surfaces & strokes */\n  --surface-0: 222 22% 6%;\n  --surface-1: 222 22% 8%;\n  --surface-2: 222 18% 12%;\n  --stroke-soft: 222 16% 18%;\n  --stroke-strong: 215 18% 26%;\n\n  /* Glass recipe (use with bg-[hsl(var(--glass-bg)/...)] via arbitrary values) */\n  --glass-bg: 222 22% 10%;\n  --glass-alpha: 0.55;\n  --glass-border-alpha: 0.22;\n\n  /* Aurora (decorative only) */\n  --aurora-a: 190 92% 52%;\n  --aurora-b: 204 88% 56%;\n  --aurora-c: 156 72% 44%;\n  --aurora-d: 34 92% 56%;\n\n  /* Chart palette (legible on dark) */\n  --chart-1: 190 92% 52%;\n  --chart-2: 156 72% 44%;\n  --chart-3: 34 92% 56%;\n  --chart-4: 204 88% 56%;\n  --chart-5: 215 14% 70%;\n\n  /* Motion tokens */\n  --motion-fast: 150ms;\n  --motion-normal: 250ms;\n  --motion-slow: 400ms;\n  --motion-dramatic: 600ms;\n  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);\n  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);\n  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);\n\n  /* Elevation */\n  --shadow-1: 0 10px 30px rgba(0,0,0,0.35);\n  --shadow-2: 0 18px 60px rgba(0,0,0,0.45);\n  --glow-cyan: 0 0 0 1px rgba(34,211,238,0.18), 0 0 40px rgba(34,211,238,0.10);\n}\n\n.dark {\n  /* Keep identical to :root to avoid theme mismatch */\n  --background: 222 22% 6%;\n  --foreground: 210 20% 96%;\n  --card: 222 22% 8%;\n  --card-foreground: 210 20% 96%;\n  --popover: 222 22% 8%;\n  --popover-foreground: 210 20% 96%;\n  --primary: 190 92% 52%;\n  --primary-foreground: 222 22% 8%;\n  --secondary: 222 18% 14%;\n  --secondary-foreground: 210 20% 96%;\n  --muted: 222 16% 12%;\n  --muted-foreground: 215 14% 70%;\n  --accent: 204 88% 56%;\n  --accent-foreground: 222 22% 8%;\n  --destructive: 0 78% 56%;\n  --destructive-foreground: 210 20% 96%;\n  --border: 222 16% 18%;\n  --input: 222 16% 18%;\n  --ring: 190 92% 52%;\n  --chart-1: 190 92% 52%;\n  --chart-2: 156 72% 44%;\n  --chart-3: 34 92% 56%;\n  --chart-4: 204 88% 56%;\n  --chart-5: 215 14% 70%;\n}"
    },
    "tailwind_usage_examples": {
      "page_base": "bg-background text-foreground",
      "panel_glass": "bg-[hsl(var(--glass-bg)/0.55)] border border-[hsl(var(--stroke-soft)/0.55)] shadow-[var(--shadow-1)] backdrop-blur-md",
      "panel_solid": "bg-card border border-border shadow-[var(--shadow-1)]",
      "rim_light": "before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(34,211,238,0.14),transparent_55%)]",
      "focus_ring": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-0"
    }
  },
  "texture_and_backgrounds": {
    "base_rule": "Solid dark base always. Aurora is an overlay layer only (<=20% viewport). Add subtle noise to avoid flatness.",
    "aurora_recipe": {
      "use_cases": ["Command Center header band", "Empty states hero", "Copilot page header"],
      "tailwind": "relative overflow-hidden bg-background",
      "overlay_div": "pointer-events-none absolute -top-24 left-[-20%] h-[320px] w-[140%] opacity-60 blur-2xl",
      "overlay_bg": "bg-[radial-gradient(900px_circle_at_20%_20%,hsl(var(--aurora-a)/0.22),transparent_55%),radial-gradient(700px_circle_at_55%_10%,hsl(var(--aurora-b)/0.18),transparent_60%),radial-gradient(800px_circle_at_85%_35%,hsl(var(--aurora-c)/0.16),transparent_60%),radial-gradient(700px_circle_at_70%_70%,hsl(var(--aurora-d)/0.10),transparent_65%)]"
    },
    "noise_recipe": {
      "implementation": "Add a fixed pseudo-element on body or app shell with a tiny noise PNG or CSS noise via repeating-radial-gradient.",
      "css_snippet": "body::before {\n  content: \"\";\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  opacity: 0.06;\n  mix-blend-mode: overlay;\n  background-image: url('https://grainy-gradients.vercel.app/noise.svg');\n  background-size: 180px 180px;\n  z-index: 0;\n}\n#root { position: relative; z-index: 1; }"
    }
  },
  "grid_and_spacing": {
    "app_shell": {
      "left_rail": "w-[76px] md:w-[260px] (collapsed/expanded). Use ResizablePanelGroup for power-user resizing.",
      "top_bar": "h-14 md:h-16; sticky; glass panel; contains global search + sim controls + sim clock + copilot trigger",
      "content_padding": "px-4 md:px-6 lg:px-8 py-4 md:py-6",
      "max_width": "Do NOT hard cap globally; only cap dense text pages at max-w-[1200px]. Map/3D pages are full-bleed."
    },
    "section_spacing": {
      "stack": "space-y-4 md:space-y-6",
      "cards_grid": "grid gap-4 md:gap-6; use 12-col mental model; prefer 2/3 + 1/3 splits"
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_these": [
        "button.jsx",
        "card.jsx",
        "badge.jsx",
        "tabs.jsx",
        "table.jsx",
        "tooltip.jsx",
        "hover-card.jsx",
        "sheet.jsx",
        "drawer.jsx",
        "dialog.jsx",
        "command.jsx",
        "select.jsx",
        "popover.jsx",
        "scroll-area.jsx",
        "separator.jsx",
        "skeleton.jsx",
        "progress.jsx",
        "calendar.jsx",
        "sonner.jsx"
      ]
    },
    "recipes": {
      "glass_panel": {
        "description": "Primary floating surface for KPI cards, inspectors, drawers. Not for dense tables.",
        "className": "relative rounded-[var(--radius)] bg-[hsl(var(--glass-bg)/0.55)] border border-[hsl(var(--stroke-soft)/0.55)] shadow-[var(--shadow-1)] backdrop-blur-md overflow-hidden",
        "inner_scrim": "after:absolute after:inset-0 after:pointer-events-none after:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_35%,rgba(0,0,0,0.22))]"
      },
      "kpi_card": {
        "layout": "Top row: label + delta chip; Middle: animated number; Bottom: sparkline + secondary metric.",
        "className": "group relative rounded-[var(--radius)] p-4 md:p-5 bg-[hsl(var(--glass-bg)/0.55)] border border-[hsl(var(--stroke-soft)/0.55)] shadow-[var(--shadow-1)] backdrop-blur-md",
        "hover": "hover:border-[hsl(var(--stroke-strong)/0.55)] hover:shadow-[var(--shadow-2)]",
        "micro_interaction": "On hover: subtle lift translate-y-[-2px] (transition-transform only), rim light intensifies; number ticks up on update.",
        "data_testid": "kpi-card"
      },
      "severity_badges": {
        "use": "Event stream, shipment delays, supplier risk.",
        "classes": {
          "info": "bg-[hsl(var(--info)/0.14)] text-[hsl(var(--info))] border border-[hsl(var(--info)/0.25)]",
          "success": "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.25)]",
          "warning": "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)]",
          "critical": "bg-[hsl(var(--critical)/0.14)] text-[hsl(var(--critical))] border border-[hsl(var(--critical)/0.25)]"
        }
      },
      "command_palette": {
        "component": "command.jsx",
        "behavior": "Cmd/Ctrl+K opens global command palette. Includes navigation, entity search, actions (pause sim, jump to shipment, open copilot).",
        "data_testid": "global-command-palette"
      },
      "copilot_drawer": {
        "component": "sheet.jsx or drawer.jsx",
        "behavior": "Right-side slide-over with streaming messages, suggested prompts, citations to entities. Persistent across pages.",
        "width": "w-[420px] md:w-[520px]",
        "data_testid": "copilot-drawer"
      },
      "data_table": {
        "component": "table.jsx + scroll-area.jsx",
        "rule": "Tables must be solid (bg-card) for readability; avoid glass behind dense rows.",
        "header": "sticky top-0 bg-[hsl(var(--surface-2))]",
        "row_hover": "hover:bg-[hsl(var(--surface-2))]",
        "data_testid": "inventory-table"
      },
      "filters_bar": {
        "components": ["input.jsx", "select.jsx", "tabs.jsx", "button.jsx"],
        "layout": "Sticky under top bar on dense pages; horizontal scroll on mobile.",
        "data_testid": "filters-bar"
      },
      "inspector_panel": {
        "use": "Map click, 3D click, graph click.",
        "component": "sheet.jsx (desktop) / drawer.jsx (mobile)",
        "className": "bg-[hsl(var(--glass-bg)/0.62)] border-l border-[hsl(var(--stroke-soft)/0.55)] backdrop-blur-md",
        "data_testid": "entity-inspector"
      }
    }
  },
  "motion_system": {
    "library": "framer-motion",
    "principles": [
      "Nothing pops in/out: use opacity + y + blur-sm (small) for entrances.",
      "Use semantic durations: fast 150ms, normal 250ms, slow 400ms, dramatic 600ms.",
      "Avoid animating expensive properties on map/3D pages; prefer opacity/transform only.",
      "Count-up numbers for KPIs; animate deltas with color pulse."
    ],
    "tokens": {
      "durations": {
        "fast": "var(--motion-fast)",
        "normal": "var(--motion-normal)",
        "slow": "var(--motion-slow)",
        "dramatic": "var(--motion-dramatic)"
      },
      "easings": {
        "out": "var(--ease-out)",
        "in": "var(--ease-in)",
        "inOut": "var(--ease-in-out)"
      },
      "spring": {
        "stiffness": 380,
        "damping": 34,
        "mass": 0.9
      }
    },
    "patterns": {
      "page_transition": "AnimatePresence with initial={false}. Enter: opacity 0→1, y 10→0 over 400ms ease-out. Exit: opacity 1→0, y 0→-6 over 200ms ease-in.",
      "hover_lift": "whileHover={{ y: -2 }} with transition={{ duration: 0.25, ease: 'easeOut' }} (transform only)",
      "skeleton_shimmer": "Use shadcn Skeleton + custom shimmer gradient background-position animation (no infinite heavy blur).",
      "event_stream": "New events slide in from y:8 with opacity; critical events also pulse border once (not infinite)."
    }
  },
  "visualizations": {
    "charts": {
      "library": "recharts",
      "rules": [
        "Use solid card backgrounds for charts; glass only for summary tiles.",
        "Gridlines: very subtle (stroke with opacity 0.12).",
        "Tooltips: glass panel with scrim; never pure black tooltip.",
        "Confidence bands: fill with 0.12 opacity of chart color."
      ],
      "palette": {
        "primary": "hsl(var(--chart-1))",
        "success": "hsl(var(--chart-2))",
        "warning": "hsl(var(--chart-3))",
        "info": "hsl(var(--chart-4))",
        "neutral": "hsl(var(--chart-5))"
      }
    },
    "graphs": {
      "libraries": ["d3-force", "d3-sankey"],
      "styling": "Nodes use glow on hover; links use gradient stroke (subtle) and animate dashoffset for flow direction. Keep link opacity low until hover/selection.",
      "data_testid": "analytics-graph"
    },
    "maps": {
      "libraries": ["maplibre-gl", "deck.gl"],
      "basemap": "CARTO Dark Matter (or similar dark basemap)",
      "performance_rules": [
        "Avoid backdrop-blur overlays on top of the map canvas.",
        "Inspector panels should be solid/glass but with minimal blur (backdrop-blur-sm).",
        "Animated arcs: limit particle count; throttle updates."
      ],
      "data_testid": "network-map"
    },
    "three_d": {
      "libraries": ["@react-three/fiber", "@react-three/drei"],
      "scene_style": "Warehouse uses soft fog, single key light + rim light, subtle bloom (postprocessing optional). Bins colored by occupancy/risk.",
      "interaction": "Hover highlights rack/bin with outline; click opens inspector sheet.",
      "data_testid": "warehouse-3d-canvas"
    }
  },
  "page_blueprints": {
    "1_command_center": {
      "layout": "Top: aurora header band (<=20% viewport) with title + sim clock. Below: 2-column grid (8/4). Left: KPI grid + charts. Right: live event stream + mini network map + alerts.",
      "must_have": [
        "Animated KPI cards (4–6)",
        "Live event stream with severity badges",
        "Network health panel",
        "Skeleton states for each module"
      ],
      "data_testids": ["command-center-page", "event-stream", "kpi-grid"]
    },
    "2_network_map": {
      "layout": "Full-bleed map canvas. Floating top-left layer controls (chips/toggles). Right inspector sheet on selection.",
      "controls": ["Layer toggles", "Time scrubber", "Mode filters sea/air/road"],
      "data_testids": ["network-map-page", "map-layer-controls", "map-inspector"]
    },
    "3_warehouse_twin": {
      "layout": "Full-bleed R3F canvas. Bottom-left legend (occupancy/risk). Right inspector sheet. Top mini toolbar (camera presets, reset, measure).",
      "data_testids": ["warehouse-page", "warehouse-legend", "warehouse-toolbar"]
    },
    "4_inventory": {
      "layout": "Header with KPIs (on-hand, days of cover, stockout risk). Sticky filters bar. Solid table with row actions + CSV export.",
      "data_testids": ["inventory-page", "inventory-search-input", "inventory-export-button"]
    },
    "5_forecasting": {
      "layout": "Left: selectors (product, warehouse, horizon) + metrics. Right: forecast chart with confidence bands + residuals mini chart.",
      "data_testids": ["forecasting-page", "forecast-product-select", "forecast-chart"]
    },
    "6_suppliers": {
      "layout": "Grid of supplier cards (risk gauge + factors). Table view toggle. Clicking opens inspector with history + mitigations.",
      "data_testids": ["suppliers-page", "supplier-risk-gauge", "supplier-table"]
    },
    "7_shipments": {
      "layout": "Left list with progress bars + ETA chips. Right timeline + selected shipment details. Integrate map mini-view for selected route.",
      "data_testids": ["shipments-page", "shipment-list", "shipment-progress"]
    },
    "8_analytics": {
      "layout": "Tabbed analytics studio: Sankey, Treemap, Heatmap, Graph. Each tab has its own filters and explanation panel.",
      "data_testids": ["analytics-page", "analytics-tabs", "sankey-chart"]
    },
    "9_ai_copilot": {
      "layout": "Dedicated page: left conversation, right context panel (entities, charts, citations). Also accessible as global drawer.",
      "data_testids": ["copilot-page", "copilot-chat-input", "copilot-send-button"]
    }
  },
  "images": {
    "image_urls": [
      {
        "category": "textures",
        "description": "Noise overlay SVG (subtle grain)",
        "url": "https://grainy-gradients.vercel.app/noise.svg"
      }
    ]
  },
  "libraries_and_installation": {
    "required": [
      {
        "name": "framer-motion",
        "use": "page transitions, hover physics, animated KPI updates",
        "install": "npm i framer-motion"
      },
      {
        "name": "recharts",
        "use": "enterprise charts",
        "install": "npm i recharts"
      },
      {
        "name": "maplibre-gl",
        "use": "basemap rendering",
        "install": "npm i maplibre-gl"
      },
      {
        "name": "deck.gl",
        "use": "animated arcs, scatterplot layers, picking",
        "install": "npm i @deck.gl/react @deck.gl/layers @deck.gl/core"
      },
      {
        "name": "@react-three/fiber + drei",
        "use": "3D warehouse twin",
        "install": "npm i @react-three/fiber @react-three/drei"
      },
      {
        "name": "d3-sankey",
        "use": "Sankey flows",
        "install": "npm i d3-sankey"
      }
    ],
    "optional": [
      {
        "name": "@react-three/postprocessing",
        "use": "subtle bloom/SSAO (keep minimal for perf)",
        "install": "npm i @react-three/postprocessing"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global": [
      "Remove CRA starter App.css centering patterns; do not center the app container.",
      "Set dark tokens in index.css as provided; ensure no light-theme flash.",
      "Implement AppShell: left rail + top bar + content outlet; map/3D pages full-bleed.",
      "Use shadcn components from /src/components/ui only for primitives (Button, Sheet, Drawer, Table, Tabs, Tooltip, Skeleton, Sonner).",
      "Every interactive and key informational element MUST include data-testid in kebab-case.",
      "Avoid heavy backdrop blur on map/3D pages; use backdrop-blur-sm or solid panels.",
      "No universal transition: never use transition-all; only transition-[color,background-color,border-color,opacity,box-shadow] and transition-transform separately.",
      "Use framer-motion for all entrances/exits; nothing should appear instantly.",
      "Charts: ensure legibility on dark; use subtle gridlines and glass tooltip.",
      "Copilot drawer must be globally accessible from top bar and Cmd/Ctrl+K actions."
    ],
    "data_testid_examples": {
      "nav": "data-testid=\"left-rail-nav\"",
      "top_search": "data-testid=\"global-search-input\"",
      "sim_play": "data-testid=\"sim-play-toggle\"",
      "sim_speed": "data-testid=\"sim-speed-select\"",
      "sim_clock": "data-testid=\"sim-clock\"",
      "copilot_open": "data-testid=\"open-copilot-button\""
    }
  }
}

---

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
