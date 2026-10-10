"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import posthog from "posthog-js"

function PostHogUserIdentification() {
  const { isLoaded, user } = useUser()
  const identifiedUserId = useRef<string | null>(null)
  const userId = user?.id
  const email = user?.primaryEmailAddress?.emailAddress

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      if (identifiedUserId.current) {
        posthog.reset()
        identifiedUserId.current = null
      }
      return
    }

    if (identifiedUserId.current && identifiedUserId.current !== userId) {
      posthog.reset()
    }

    posthog.identify(userId, email ? { email } : undefined)
    identifiedUserId.current = userId
  }, [email, isLoaded, userId])

  return null
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <PostHogUserIdentification />
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        icons={{
          success: (
            <CircleCheckIcon className="size-4" />
          ),
          info: (
            <InfoIcon className="size-4" />
          ),
          warning: (
            <TriangleAlertIcon className="size-4" />
          ),
          error: (
            <OctagonXIcon className="size-4" />
          ),
          loading: (
            <Loader2Icon className="size-4 animate-spin" />
          ),
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
          } as React.CSSProperties
        }
        toastOptions={{
          classNames: {
            toast: "cn-toast",
          },
        }}
        {...props}
      />
    </>
  )
}

export { Toaster }
