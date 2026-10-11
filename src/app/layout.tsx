import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import Link from "next/link";
import { GeistMono } from "geist/font/mono";
import { SiteFooter } from "@/components/site/site-footer";
import { PostHogIdentify } from "@/components/site/posthog-identify";
import { SiteHeader } from "@/components/site/site-header";
import { Shell } from "@/components/ui/shell";
import { Toaster } from "@/components/ui/toaster";
import { site } from "@/config/site";
import "./globals.css";
import "./clerk-theme.css";

// Fonts are bundled locally so builds never depend on Google Fonts being reachable.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-Variable.woff2",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: site.themeColor },
    { media: "(prefers-color-scheme: dark)", color: site.themeColorDark },
  ],
  width: "device-width",
  initialScale: 1,
};

// Type and color come from the header's nav slot. Buttons reset text-transform, so restate uppercase.
const navLink = "uppercase hover:text-ink";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/* dynamic: renders per request so Clerk can tag its own <script> with
            the CSP nonce (src/lib/clerk-csp.ts). Without it, a strict CSP blocks clerk-js. */}
        <ClerkProvider dynamic appearance={{ theme: shadcn, variables: { borderRadius: "0px" } }}>
          <SiteHeader
            right={
              <>
                <Link href="/splits" className={navLink}>
                  My splits
                </Link>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button type="button" className={navLink}>
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button type="button" className="uppercase text-ink hover:text-mute">
                      Sign up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            }
          />
          <Shell width="wide">
            <main className="flex flex-1 flex-col py-8">{children}</main>
            <SiteFooter />
          </Shell>
          <Toaster />
          <PostHogIdentify />
        </ClerkProvider>
      </body>
    </html>
  );
}
