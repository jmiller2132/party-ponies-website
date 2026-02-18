"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

export function ThemeScript() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const root = document.documentElement
    // Remove any existing theme classes
    root.classList.remove("light", "dark")
    
    // Apply the resolved theme (or default to dark)
    if (resolvedTheme) {
      root.classList.add(resolvedTheme)
    } else {
      // If no resolved theme yet, default to dark
      root.classList.add("dark")
    }
  }, [resolvedTheme])

  return null
}
