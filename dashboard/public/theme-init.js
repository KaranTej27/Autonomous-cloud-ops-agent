// Applies the saved theme before first paint. Kept as a file, not inline, so the CSP can stay script-src 'self'.
;(function () {
  var theme = 'dark'
  try {
    var saved = window.localStorage.getItem('cloudops-soc.theme')
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch (e) {
    // Storage can be blocked; dark is the default.
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
