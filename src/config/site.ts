// Everything user-facing that names the tool reads from here.
export const site = {
  name: "TabMath",
  /** Browser tab and search result title: brand first, then the plain-language promise. Under 60 chars. */
  title: "TabMath: Split the Restaurant Bill in 60 Seconds",
  /** Search result snippet and link previews. Under 160 chars. */
  description: "Snap the receipt, tap who had what, send everyone a link. TabMath splits the restaurant bill with tax and tip. No app, no login for friends.",
  tagline: "Tiny tools for getting paid fairly.",
  author: { name: "Andrea", url: "https://andreaberrocal.com" },
  themeColor: "#ffffff",
  /** Browser UI color in dark mode; matches --color-paper there. */
  themeColorDark: "#0b0b0b",
  /** The landing page is public; organizer and payer pages send noindex headers. */
  indexable: true,
} as const;
