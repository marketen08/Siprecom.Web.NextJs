"use client"

import { useIsFetching } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

export function FetchingBar() {
  const isFetching = useIsFetching()

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-0.5 z-[60] transition-opacity duration-300",
        isFetching > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="h-full bg-blue-500 animate-[fetching_1.2s_ease-in-out_infinite]" />
      <style>{`
        @keyframes fetching {
          0%   { width: 0%;   margin-left: 0%; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
