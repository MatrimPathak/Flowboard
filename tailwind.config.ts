import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        panel: "hsl(var(--panel))",
        surface: {
          DEFAULT: "hsl(var(--surface-1))",
          "2": "hsl(var(--surface-2))",
          elevated: "hsl(var(--surface-elevated))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        purple: "hsl(var(--purple))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        /* Chronicle radius tokens */
        card: "18px",
        btn: "12px",
        panel: "24px",
        /* keep shadcn defaults */
        lg: "20px",
        md: "12px",
        sm: "8px",
        pill: "9999px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        chronicle: "0 0 0 1px rgba(255,255,255,.04), 0 8px 30px rgba(0,0,0,.25)",
        "chronicle-sm": "0 0 0 1px rgba(255,255,255,.04), 0 4px 16px rgba(0,0,0,.2)",
        "chronicle-lg": "0 0 0 1px rgba(255,255,255,.06), 0 16px 48px rgba(0,0,0,.35)",
        "glow-primary": "0 0 0 1px rgba(79,124,255,.2), 0 0 20px rgba(79,124,255,.08)",
      },
      maxWidth: {
        chronicle: "1800px",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
