import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand
        "electric-purple": "#8B5CF6",
        "electric-purple-hover": "#9F7AEA",
        "electric-purple-active": "#7C3AED",
        "purple-glow": "#C084FC",

        // Accent / Status
        "emerald-success": "#22C55E",
        "emerald-soft": "#86EFAC",
        "warning-amber": "#FCD34D",
        "danger-red": "#EF4444",
        "rose-pink": "#FCA5A5",
        "sky-blue": "#93C5FD",

        // Surface
        "surface-base": "#0A0A0F",
        "surface-elevated": "#111118",
        "surface-glass": "rgba(255, 255, 255, 0.03)",
        "surface-glass-hover": "rgba(255, 255, 255, 0.05)",

        // Borders
        "border-light": "rgba(255, 255, 255, 0.08)",
        "border-medium": "rgba(255, 255, 255, 0.12)",
        "border-strong": "rgba(255, 255, 255, 0.16)",

        // Text
        "text-primary": "#F0F0F5",
        "text-secondary": "#9CA3AF",
        "text-tertiary": "#6B7280",
        "text-disabled": "rgba(240, 240, 245, 0.5)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "display-1": ["72px", { lineHeight: "1.1", fontWeight: "900", letterSpacing: "0px" }],
        "display-2": ["44px", { lineHeight: "1.2", fontWeight: "800", letterSpacing: "0px" }],
        "h1": ["28px", { lineHeight: "1.6", fontWeight: "800", letterSpacing: "0px" }],
        "h2": ["18px", { lineHeight: "1.6", fontWeight: "700", letterSpacing: "0px" }],
        "h3": ["16px", { lineHeight: "1.6", fontWeight: "600", letterSpacing: "0px" }],
        "h4": ["13px", { lineHeight: "1.6", fontWeight: "700", letterSpacing: "0px" }],
        "body": ["20px", { lineHeight: "1.7", fontWeight: "400", letterSpacing: "0px" }],
        "body-compact": ["16px", { lineHeight: "1.6", fontWeight: "400", letterSpacing: "0px" }],
        "body-small": ["14px", { lineHeight: "1.6", fontWeight: "400", letterSpacing: "0px" }],
        "code": ["13px", { lineHeight: "1.8", fontWeight: "400", letterSpacing: "0px" }]
      },
      borderRadius: {
        "subtle": "4px",
        "standard": "12px",
        "generous": "16px",
        "pill": "100px"
      },
      boxShadow: {
        "level-1": "rgba(139, 92, 246, 0.1) 0px 4px 12px 0px",
        "level-2": "rgba(124, 58, 237, 0.3) 0px 4px 16px 0px",
        "level-3": "rgba(139, 92, 246, 0.2) 0px 6px 20px 0px",
        "level-4": "rgba(0, 0, 0, 0.6) 0px 20px 40px 0px, rgba(139, 92, 246, 0.15) 0px 0px 30px 0px",
        "level-5": "rgba(0, 0, 0, 0.8) 0px 30px 60px 0px, rgba(139, 92, 246, 0.2) 0px 0px 40px 0px"
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "typing": "typing 1.4s infinite"
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(139, 92, 246, 0.6)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
