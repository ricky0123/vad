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
              },
              h2: {
                color: theme("colors.rose.600"),
                "::before": {
                  content: '"# "',
                },
              },
              h3: {
                color: theme("colors.rose.600"),
                "::before": {
                  content: '"## "',
                },
              },
              h4: {
                color: theme("colors.rose.600"),
                "::before": {
                  content: '"### "',
                },
              },
              h5: {
                color: theme("colors.rose.600"),
                "::before": {
                  content: '"#### "',
                },
              },
              h6: {
                color: theme("colors.rose.600"),
                "::before": {
                  content: '"##### "',
                },
              },
              "blockquote p:first-of-type::before": {
                content: "",
              },
              "blockquote p:last-of-type::after": {
                content: "",
              },
            },
          },
        }
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
