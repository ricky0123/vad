/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx,njk}"],
  theme: {
    extend: {
      typography: (theme) => {
        return {
          DEFAULT: {
            css: {
              h1: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              h2: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              h3: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              h4: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              h5: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              h6: {
                color: theme("colors.rose.600"),
                fontWeight: "inherit",
              },
              "code::before": {
                content: '""',
              },
              "code::after": {
                content: '""',
              },
            },
          },
        }
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
