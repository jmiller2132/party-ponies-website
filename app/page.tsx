import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Party Ponies Fantasy League | History & Records",
  description: "13+ seasons of Party Ponies fantasy football history — standings, all-time records, PPSI rankings, and rivalry tracking. Est. 2013.",
  openGraph: {
    title: "Party Ponies Fantasy League",
    description: "13+ seasons of fantasy football history. Standings, records, PPSI rankings, and rivalries.",
  },
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Target, ArrowRight, BarChart3, Award, Sparkles, Calendar } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground border-2 border-primary">
            <Trophy className="h-4 w-4" />
            <span className="text-sm font-bold">Fantasy Football Excellence</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight text-foreground">
            PARTY PONIES
            <span className="block text-primary mt-2">LEAGUE HISTORY</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Est. 2013</p>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed">
            Your complete guide to 13+ years of league history — standings, records, rivalries, and the metric that settles every argument.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/standings">
              <Button size="lg" className="gap-2">
                View Standings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/records">
              <Button size="lg" variant="outline" className="gap-2">
                All-Time Records
                <Trophy className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Live Standings</CardTitle>
              <CardDescription>
                Real-time league standings synced directly from Yahoo Fantasy Sports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/standings">
                <Button variant="ghost" className="gap-2">
                  View Standings <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Season History</CardTitle>
              <CardDescription>
                Full standings, brackets, and stats for every season since 2013
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/seasons">
                <Button variant="ghost" className="gap-2">
                  Browse Seasons <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>PPSI Season Index</CardTitle>
              <CardDescription>
                Compare any season across all years with the Party Ponies Season Index — who actually had the best season ever?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/seasons/compare">
                <Button variant="ghost" className="gap-2">
                  Compare Seasons <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Manager Profiles</CardTitle>
              <CardDescription>
                Deep dive into each manager's history, achievements, and career statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/managers">
                <Button variant="ghost" className="gap-2">
                  Explore Profiles <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>All-Time Records</CardTitle>
              <CardDescription>
                Championship roll, most wins, highest scoring seasons, and the hall of shame
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/records">
                <Button variant="ghost" className="gap-2">
                  View Records <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Rivalry Tool</CardTitle>
              <CardDescription>
                Track head-to-head matchups and the fiercest rivalries in league history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/rivalry">
                <Button variant="ghost" className="gap-2">
                  Explore Rivalries <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer tagline */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Your League, Your Legacy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            13+ seasons preserved and compared. Synced with Yahoo Fantasy Sports and built to settle debates for good.
          </p>
        </div>
      </section>
    </div>
  )
}
