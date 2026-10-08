import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-ink py-5">
      <p className="label text-mute">{site.tagline}</p>
      <p className="label text-mute">
        Built by{" "}
        <a href={site.author.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          {site.author.name}
        </a>
      </p>
    </footer>
  );
}
