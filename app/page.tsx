import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Target, ArrowRight, BarChart3, ClipboardList } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero Section */}
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
            Your complete guide to league standings, historical records, and the rivalries that define our league.
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
                  View Standings
                  <ArrowRight className="h-4 w-4" />
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
                Deep dive into each manager's history, achievements, and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/managers">
                <Button variant="ghost" className="gap-2">
                  Explore Profiles
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>All-Time Records</CardTitle>
              <CardDescription>
                Historical records and achievements preserved forever in our database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/records">
                <Button variant="ghost" className="gap-2">
                  View Records
                  <ArrowRight className="h-4 w-4" />
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
                  Explore Rivalries
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>
                Complete archive of past seasons that Yahoo no longer provides access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/records">
                <Button variant="ghost" className="gap-2">
                  Browse History
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors opacity-75">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Draft Score</CardTitle>
              <CardDescription>
                Analyze draft performance by comparing draft position to season finish
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/draft">
                <Button variant="ghost" className="gap-2">
                  Coming Soon
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Your League, Your Legacy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built with premium technology to preserve and celebrate your fantasy football journey.
            Synced with Yahoo Fantasy Sports API and powered by Supabase for permanent historical records.
          </p>
        </div>
      </section>
    </div>
  )
}
