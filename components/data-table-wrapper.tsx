"use client"

import { cn } from "@/lib/utils"

interface DataTableWrapperProps {
  isFetching?: boolean
  children: React.ReactNode
}

export function DataTableWrapper({ isFetching, children }: DataTableWrapperProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white overflow-hidden transition-opacity duration-200",
        isFetching && "opacity-50"
      )}
    >
      {children}
    </div>
  )
}
