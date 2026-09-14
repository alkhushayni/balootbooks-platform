import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd2fe",
          300: "#93b3fd",
          400: "#6089fa",
          500: "#3b63f5",
          600: "#2743e9",
          700: "#2033d4",
          800: "#212bac",
          900: "#202988",
          950: "#171b57",
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
