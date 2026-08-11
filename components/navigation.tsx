"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Trophy, Users, BarChart3, Target, Home as HomeIcon, Sparkles, Award, Menu } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/seasons", label: "Seasons", icon: Trophy },
  { href: "/seasons/compare", label: "Compare", icon: Sparkles },
  { href: "/managers", label: "Managers", icon: Users },
  { href: "/records", label: "Records", icon: Award },
  { href: "/rivalry", label: "Rivalry", icon: Target },
]

export function Navigation() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 font-display text-xl font-black hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/logo-nav.svg"
              alt="Party Ponies"
              width={30}
              height={40}
              className="h-10 w-[30px] shrink-0 dark:invert"
              fetchPriority="high"
            />
            <span className="uppercase">PARTY PONIES</span>
            <span className="text-xs font-normal text-muted-foreground hidden sm:inline">Est. 2013</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant={isActive ? "default" : "ghost"} size="sm" className="gap-1.5">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {/* Drawer header */}
                <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/logo-nav.svg"
                    alt=""
                    width={20}
                    height={28}
                    className="h-7 w-auto dark:invert"
                  />
                  <span className="font-display font-black text-sm uppercase tracking-wide">Party Ponies</span>
                </div>

                {/* Nav links */}
                <div className="flex flex-col py-2">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
                  Est. 2013
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
