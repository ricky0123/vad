const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight")

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight)

  eleventyConfig.addCollection("sidebarItems", function (collectionApi) {
    return collectionApi.getFilteredByTag("docs").sort(function (a, b) {
      return a.data.sidebarPosition - b.data.sidebarPosition
    })
  })
}
