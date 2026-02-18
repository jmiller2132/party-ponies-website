"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SeasonSelectorProps {
  availableYears: number[]
  defaultYears: number[]
}

export function SeasonSelector({ availableYears, defaultYears }: SeasonSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedYears, setSelectedYears] = useState<number[]>(defaultYears)

  useEffect(() => {
    const yearsParam = searchParams.get("years")
    if (yearsParam) {
      const years = yearsParam.split(",").map(y => parseInt(y.trim())).filter(y => !isNaN(y))
      if (years.length > 0) {
        setSelectedYears(years)
      }
    } else {
      // Default to all years if no param
      setSelectedYears(defaultYears)
    }
  }, [searchParams, defaultYears])

  const toggleYear = (year: number) => {
    const newYears = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears.filter(y => y !== year), year]
    
    setSelectedYears(newYears)
    
    // Update URL
    if (newYears.length > 0) {
      router.push(`/seasons/compare?years=${newYears.join(",")}`)
    } else {
      router.push("/seasons/compare")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Seasons</CardTitle>
        <CardDescription>
          Select seasons to compare. Click to toggle selection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {availableYears.map(year => (
            <Button
              key={year}
              variant={selectedYears.includes(year) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
        {selectedYears.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Comparing: {selectedYears.sort((a, b) => b - a).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
