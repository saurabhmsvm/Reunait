"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SmartDateRangePickerProps {
  dateFrom?: Date
  dateTo?: Date
  onDateChange: (dateFrom?: Date, dateTo?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SmartDateRangePicker({
  dateFrom,
  dateTo,
  onDateChange,
  placeholder = "Pick a date or range",
  className,
  disabled = false
}: SmartDateRangePickerProps) {
  // Handle range selection with proper edge case handling
  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      // Ensure proper date handling for cross-year selections
      const fromDate = new Date(range.from)
      const toDate = range.to ? new Date(range.to) : new Date(range.from)
      
      // Validate dates are within reasonable bounds
      const currentYear = new Date().getFullYear()
      const minYear = 1990
      
      if (fromDate.getFullYear() >= minYear && fromDate.getFullYear() <= currentYear &&
          toDate.getFullYear() >= minYear && toDate.getFullYear() <= currentYear) {
        onDateChange(fromDate, toDate)
      } else {
        // If dates are out of bounds, reset to undefined
        onDateChange(undefined, undefined)
      }
    } else {
      onDateChange(undefined, undefined)
    }
  }

  // Determine if it's a single date or range
  const isSingleDate = dateFrom && dateTo && isSameDay(dateFrom, dateTo)
  
  // Format display text with better edge case handling
  const getDisplayText = () => {
    if (!dateFrom && !dateTo) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }
    
    if (isSingleDate) {
      return format(dateFrom!, "PPP")
    }
    
    if (dateFrom && dateTo) {
      // Handle cross-year ranges properly
      const fromYear = dateFrom.getFullYear()
      const toYear = dateTo.getFullYear()
      
      if (fromYear === toYear) {
        // Same year: show "MMM dd - MMM dd, yyyy"
        return `${format(dateFrom, "MMM dd")} - ${format(dateTo, "MMM dd, yyyy")}`
      } else {
        // Different years: show "MMM dd, yyyy - MMM dd, yyyy"
        return `${format(dateFrom, "MMM dd, yyyy")} - ${format(dateTo, "MMM dd, yyyy")}`
      }
    }
    
    if (dateFrom) {
      return `From ${format(dateFrom, "MMM dd, yyyy")}`
    }
    
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-2 border-border bg-background/80 focus:bg-background transition-all duration-300 hover:bg-background/90 rounded-lg text-sm h-9 px-3 py-2 text-foreground",
            !dateFrom && !dateTo && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 sm:w-auto" align="start">
        <Calendar
          mode="range"
          selected={{ from: dateFrom, to: dateTo }}
          onSelect={handleRangeSelect}
          disabled={{ 
            after: new Date(),
            before: new Date(1990, 0, 1)
          }}
          numberOfMonths={1}
          className="rounded-md border"
          captionLayout="dropdown"
          defaultMonth={new Date()}
          formatters={{
            formatYearDropdown: (date) => date.getFullYear().toString(),
            formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
          }}
          fromYear={1990}
          toYear={new Date().getFullYear()}
          showOutsideDays={false}
          classNames={{
            dropdowns: "flex gap-1 max-h-20 overflow-y-auto",
            dropdown: "max-h-10 overflow-y-auto bg-popover border border-border rounded-md shadow-md",
            dropdown_root: "relative",
            caption_label: "hidden", // Hide the default caption label when using dropdowns
            caption: "flex items-center justify-center",
            month_caption: "flex items-center justify-center h-8 w-full px-2",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
