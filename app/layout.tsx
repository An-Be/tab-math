import { ClerkProvider, SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TabMath",
  description: "Split the bill in 60 seconds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* dynamic: lets Clerk tag its own <script> with the per-request CSP
            nonce (see lib/csp.ts). Without it, a strict CSP blocks clerk-js. */}
        <ClerkProvider
          dynamic
          appearance={{
            theme: shadcn,
            variables: { borderRadius: "0.125rem" },
          }}
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-sm font-medium tracking-tight uppercase"
            >
              <svg
                viewBox="28 16 44 69"
                width={14}
                height={22}
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="28,16 72,16 72,40 28,56" />
                <polygon points="28,63 72,47 72,80 66.5,85 61,80 55.5,85 50,80 44.5,85 39,80 33.5,85 28,80" />
              </svg>
              TabMath
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/splits"
                className="font-mono text-xs tracking-wide uppercase text-muted-foreground hover:text-foreground"
              >
                My splits
              </Link>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="font-mono text-xs tracking-wide uppercase text-muted-foreground hover:text-foreground">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="font-mono text-xs tracking-wide uppercase hover:text-muted-foreground">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t px-4 py-4 text-center font-mono text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://andreaberrocal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Andrea
            </a>{" "}
            · tiny tools for getting paid fairly
          </footer>
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}