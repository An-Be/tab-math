import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import Link from "next/link";
import { GeistMono } from "geist/font/mono";
import { SiteFooter } from "@/components/site/site-footer";
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
  title: site.name,
  description: site.description,
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  width: "device-width",
  initialScale: 1,
};

const navLink = "label text-mute hover:text-ink";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        {/* dynamic: renders per request so Clerk can tag its own <script> with
            the CSP nonce (src/lib/clerk-csp.ts). Without it, a strict CSP blocks clerk-js. */}
        <ClerkProvider dynamic appearance={{ theme: shadcn, variables: { borderRadius: "0px" } }}>
          <Shell width="wide">
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
                      <button type="button" className="label text-ink hover:text-mute">
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
            <main className="flex flex-1 flex-col py-8">{children}</main>
            <SiteFooter />
          </Shell>
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
