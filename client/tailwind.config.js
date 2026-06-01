/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        surface: {
          DEFAULT: "#0f1520",
          raised: "#131c2e",
          overlay: "#1a2540",
        },
        border: {
          DEFAULT: "#1a2235",
          muted: "#111827",
          strong: "#2a3a55",
        },
      },
      keyframes: {
        fadeIn:        { from: { opacity: "0" },                      to: { opacity: "1" } },
        slideUp:       { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        slideInRight:  { from: { transform: "translateX(100%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideInLeft:   { from: { transform: "translateX(-100%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        scaleIn:       { from: { transform: "scale(0.95)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
        pulseGlow:     { "0%,100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0)" }, "50%": { boxShadow: "0 0 16px 4px rgba(59,130,246,0.3)" } },
        shimmer:       { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        countUp:       { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in":       "fadeIn 0.25s ease-out",
        "slide-up":      "slideUp 0.3s ease-out",
        "slide-in-right":"slideInRight 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "scale-in":      "scaleIn 0.2s ease-out",
        "pulse-glow":    "pulseGlow 2s ease-in-out infinite",
        "shimmer":       "shimmer 2s linear infinite",
        "count-up":      "countUp 0.4s ease-out",
      },
      backgroundImage: {
        "shimmer-gradient": "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.04) 50%, transparent 75%)",
        "hero-gradient":    "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.08) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};
