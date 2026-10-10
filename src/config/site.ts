// Everything user-facing that names the tool reads from here.
export const site = {
  name: "TabMath",
  description: "Split the bill in 60 seconds.",
  tagline: "Tiny tools for getting paid fairly.",
  author: { name: "Andrea", url: "https://andreaberrocal.com" },
  themeColor: "#ffffff",
  /** The landing page is public; organizer and payer pages send noindex headers. */
  indexable: true,
} as const;
