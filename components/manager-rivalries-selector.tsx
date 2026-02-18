"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy } from "lucide-react"
import { TopRivalriesTable } from "./top-rivalries-table"
import { getTopRivalriesForManager } from "@/lib/rivalry-utils"

interface ManagerRivalriesSelectorProps {
  managers: string[]
}

export function ManagerRivalriesSelector({ managers }: ManagerRivalriesSelectorProps) {
  const [selectedManager, setSelectedManager] = useState<string>("")
  const [rivalries, setRivalries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleManagerChange = async (manager: string) => {
    setSelectedManager(manager)
    if (!manager) {
      setRivalries([])
      return
    }

    setIsLoading(true)
    try {
      // This is a server action, so we need to call it via an API route or make it a client-side fetch
      // For now, let's use a fetch to the server action
      const response = await fetch(`/api/rivalry/manager?manager=${encodeURIComponent(manager)}`)
      if (response.ok) {
        const data = await response.json()
        setRivalries(data.rivalries || [])
      }
    } catch (error) {
      console.error("Error fetching manager rivalries:", error)
      setRivalries([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Manager Top Rivalries
        </CardTitle>
        <CardDescription>
          Select a manager to view their most competitive matchups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedManager} onValueChange={handleManagerChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a manager..." />
          </SelectTrigger>
          <SelectContent>
            {managers.map((manager) => (
              <SelectItem key={manager} value={manager}>
                {manager}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading {selectedManager}'s rivalries...</p>
          </div>
        )}

        {!isLoading && selectedManager && rivalries.length > 0 && (
          <TopRivalriesTable
            rivalries={rivalries}
            title={`${selectedManager}'s Top Rivalries`}
            description={`Most competitive matchups for ${selectedManager}`}
          />
        )}

        {!isLoading && selectedManager && rivalries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No rivalries found for {selectedManager}.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
