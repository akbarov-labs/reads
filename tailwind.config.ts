import type { Config } from "tailwindcss";

/**
 * Kitoblarim's palette, the same one the bot and its landing page use.
 *
 * The neutrals are tinted toward the brand green (ink #141A16, muted #626B65,
 * Bone Paper #F6F7F4) and replace Tailwind's stone and zinc scales under
 * their own names, so every existing `text-zinc-*` / `bg-stone-*` class picks
 * up the brand without a rename. Step 400 is dark enough for small text on
 * the page ground and on stone-100 (5:1 or better); it used to be a
 * decorative grey that failed contrast.
 *
 * `forest` is the one accent: 700 is Deep Forest Green, the colour of the
 * logo tile and of every link, button and active state. `star` is only for
 * readers' star ratings.
 */
const ink = {
  50: "#F6F7F4",
  100: "#EEF1EC",
  200: "#E1E5DF",
  300: "#CBD2C9",
  400: "#5F6862",
  500: "#535B56",
  600: "#444B47",
  700: "#343A36",
  800: "#252B27",
  900: "#141A16",
  950: "#0B0F0C",
};

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: ink,
        zinc: ink,
        forest: {
          50: "#F1F5F0",
          100: "#E3ECE2",
          200: "#C9DBC8",
          300: "#A3C2A5",
          400: "#6F9C77",
          500: "#4A7D57",
          600: "#2F6440",
          700: "#1F4D2E",
          800: "#163A22",
          900: "#0F2A18",
        },
        star: "#D0951A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-book)", "Georgia", "Times New Roman", "serif"],
      },
      maxWidth: {
        content: "72rem",
      },
      // The landing page's easing: a quick start that settles softly.
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(.32,.72,0,1)",
        out: "cubic-bezier(.32,.72,0,1)",
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
};

export default config;
