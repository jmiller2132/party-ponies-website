"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { ReactNode } from "react"
import { ThemeScript } from "@/components/theme-script"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeScript />
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
