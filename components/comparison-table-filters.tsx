"use client"

import { useState } from "react"
import { SDSPlusTable } from "@/components/sds-plus-table"
import { SDSPlusFilters } from "@/components/sds-plus-filters"

interface ComparisonTableWithFiltersProps {
  scores: any[]
  availableYears: number[]
  uniqueOwners: string[]
}

export function ComparisonTableWithFilters({ 
  scores, 
  availableYears, 
  uniqueOwners 
}: ComparisonTableWithFiltersProps) {
  const [filters, setFilters] = useState<any>({})

  return (
    <>
      <SDSPlusFilters
        availableYears={availableYears}
        uniqueOwners={uniqueOwners}
        onFilterChange={setFilters}
      />
      <SDSPlusTable 
        scores={scores} 
        defaultSort="finalRank" 
        defaultDirection="asc" 
        showYear={true}
        filters={filters}
        hasWeeklyScores={false}
      />
    </>
  )
}
