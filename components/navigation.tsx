"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Trophy, Users, BarChart3, Target, Home as HomeIcon, Sparkles, ClipboardList } from "lucide-react"
import Image from "next/image"
import { ThemeToggle } from "./theme-toggle"

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/seasons", label: "Seasons", icon: Trophy },
  { href: "/seasons/compare", label: "Compare", icon: Sparkles },
  { href: "/managers", label: "Manager Profiles", icon: Users },
  { href: "/records", label: "All-Time Records", icon: Trophy },
  { href: "/rivalry", label: "Rivalry Tool", icon: Target },
  { href: "/draft", label: "Draft Score", icon: ClipboardList },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-display text-xl font-black hover:opacity-80 transition-opacity">
            <Image 
              src="/logos/logo-main.svg" 
              alt="Party Ponies Logo" 
              width={40} 
              height={40}
              className="dark:invert"
              priority
            />
            <span className="hidden sm:inline uppercase">PARTY PONIES</span>
            <span className="text-xs font-normal text-muted-foreground hidden md:inline">Est. 2013</span>
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
