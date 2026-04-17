"use client"

import { useEffect, useRef } from "react"

interface BuildLogProps {
  messages: string[]
  isBuilding: boolean
}

export default function BuildLog({ messages, isBuilding }: BuildLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!isBuilding && messages.length === 0) return null

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-loading" />
          <span className="text-white/50 text-xs tracking-widest uppercase font-mono">
            Building Vehicle
          </span>
        </div>

        <div className="space-y-1 max-h-48 overflow-hidden">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs font-mono tracking-normal"
              style={{
                opacity: i === messages.length - 1 ? 1 : 0.45,
                color: i === messages.length - 1 ? "#ffffff" : "#666666",
              }}
            >
              <span className="text-white/30 select-none shrink-0">
                {i === messages.length - 1 && isBuilding ? "›" : "✓"}
              </span>
              <span>{msg}</span>
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
