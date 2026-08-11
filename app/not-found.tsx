import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trophy, BarChart3, Users, Target, Sparkles, Award, ArrowLeft } from "lucide-react"

const links = [
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/seasons", label: "Seasons", icon: Trophy },
  { href: "/seasons/compare", label: "Compare", icon: Sparkles },
  { href: "/managers", label: "Managers", icon: Users },
  { href: "/records", label: "Records", icon: Award },
  { href: "/rivalry", label: "Rivalry", icon: Target },
]

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-24">
      {/* Big 404 */}
      <div className="relative mb-8 select-none">
        <p className="font-display text-[8rem] md:text-[12rem] font-black leading-none text-muted/30 dark:text-muted/20">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="h-16 w-16 md:h-24 md:w-24 text-primary opacity-80" />
        </div>
      </div>

      {/* Message */}
      <h1 className="font-display text-3xl md:text-4xl font-black mb-3">
        Page Not Found
      </h1>
      <p className="text-muted-foreground text-lg max-w-sm mb-2">
        This page got cut before the playoffs.
      </p>
      <p className="text-muted-foreground text-sm max-w-xs mb-10">
        Whatever you're looking for isn't here — but 13 seasons of history still are.
      </p>

      {/* Primary CTA */}
      <Link href="/">
        <Button size="lg" className="gap-2 mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      {/* Quick links */}
      <div className="flex flex-wrap justify-center gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button variant="outline" size="sm" className="gap-2">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
