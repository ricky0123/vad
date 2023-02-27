/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx,njk}"],
  theme: {
    extend: {
      typography: (theme) => {
        const hTags = ["h1", "h2", "h3", "h4", "h5", "h6"]
        const hTagOverrides = Object.fromEntries(
          hTags.map((tag) => [
            tag,
            {
              color: theme("colors.rose.600"),
              fontWeight: "inherit",
            },
          ])
        )
        return {
          DEFAULT: {
            css: hTagOverrides,
          },
        }
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
