import Link from "next/link"
import { Trophy, BarChart3, Users, Target, Sparkles, Award } from "lucide-react"

const links = [
  { href: "/standings", label: "Standings", icon: BarChart3 },
  { href: "/seasons", label: "Seasons", icon: Trophy },
  { href: "/seasons/compare", label: "Compare", icon: Sparkles },
  { href: "/managers", label: "Managers", icon: Users },
  { href: "/records", label: "Records", icon: Award },
  { href: "/rivalry", label: "Rivalry", icon: Target },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background/95 mt-16">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/logo-nav.svg"
                alt="Party Ponies"
                width={20}
                height={28}
                className="h-7 w-auto dark:invert"
              />
              <span className="font-display font-black uppercase text-sm tracking-wide">Party Ponies</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              13+ seasons of fantasy football history, records, and the metric that settles every argument.
            </p>
            <p className="text-xs text-muted-foreground">Est. 2013</p>
          </div>

          {/* Nav links */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigate</p>
            <div className="grid grid-cols-2 gap-1.5">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats blurb */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The League</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>🏆 13 seasons of competition</li>
              <li>📊 Powered by Yahoo Fantasy Sports</li>
              <li>📈 PPSI — Party Ponies Season Index</li>
              <li>⚔️ Head-to-head rivalry tracking</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {year} Party Ponies Fantasy League. All rights reserved.</p>
          <p>Data sourced from Yahoo Fantasy Sports API.</p>
        </div>
      </div>
    </footer>
  )
}
