"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export default function SignInPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign in to Party Ponies League</CardTitle>
            <CardDescription>
              Connect with your Yahoo Fantasy Sports account to access league data and historical records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signIn("yahoo", { callbackUrl: "/standings" })}
              className="w-full"
              size="lg"
            >
              Sign in with Yahoo
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              By signing in, you grant access to your Yahoo Fantasy Sports data.
              Your tokens will be securely stored for automatic data synchronization.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
