const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight")
const markdownIt = require("markdown-it")
const markdownItAnchor = require("markdown-it-anchor")

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight)

  const markdownItOptions = {
    html: true,
  }

  // Options for the `markdown-it-anchor` library
  const markdownItAnchorOptions = {
    permalink: markdownItAnchor.permalink.headerLink(),
  }

  const markdownLib = markdownIt(markdownItOptions).use(
    markdownItAnchor,
    markdownItAnchorOptions
  )

  eleventyConfig.setLibrary("md", markdownLib)

  eleventyConfig.addCollection("sidebarItems", function (collectionApi) {
    return collectionApi.getFilteredByTag("docs").sort(function (a, b) {
      return a.data.sidebarPosition - b.data.sidebarPosition
    })
  })
}
