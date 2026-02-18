"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface FilterState {
  year?: number
  owner?: string
  minSDS?: number
  maxSDS?: number
  minRank?: number
  maxRank?: number
}

interface SDSPlusFiltersProps {
  availableYears: number[]
  uniqueOwners: string[]
  onFilterChange: (filters: FilterState) => void
}

export function SDSPlusFilters({ availableYears, uniqueOwners, onFilterChange }: SDSPlusFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({})

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearAll = () => {
    setFilters({})
    onFilterChange({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Year Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-year" className="text-xs">Year</Label>
          <div className="flex gap-2">
            <Select
              value={filters.year?.toString() || "all"}
              onValueChange={(value) => updateFilter('year', value === "all" ? undefined : parseInt(value))}
            >
              <SelectTrigger id="filter-year" className="h-9">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.year && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => clearFilter('year')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Owner Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-owner" className="text-xs">Owner</Label>
          <div className="flex gap-2">
            <Select
              value={filters.owner || "all"}
              onValueChange={(value) => updateFilter('owner', value === "all" ? undefined : value)}
            >
              <SelectTrigger id="filter-owner" className="h-9">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {uniqueOwners.map(owner => (
                  <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filters.owner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => clearFilter('owner')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* SDS+ Range */}
        <div className="space-y-2">
          <Label className="text-xs">SDS+ Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minSDS || ""}
              onChange={(e) => updateFilter('minSDS', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-9"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxSDS || ""}
              onChange={(e) => updateFilter('maxSDS', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-9"
            />
          </div>
        </div>

        {/* Rank Range */}
        <div className="space-y-2">
          <Label className="text-xs">Rank Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minRank || ""}
              onChange={(e) => updateFilter('minRank', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-9"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxRank || ""}
              onChange={(e) => updateFilter('maxRank', e.target.value ? parseInt(e.target.value) : undefined)}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
