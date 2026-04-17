"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export type BuildPhase = "idle" | "connecting" | "streaming" | "assembling" | "testing" | "done"

export interface DisplayLine {
  id: string
  type: "header" | "system" | "param" | "injection" | "clamp" | "trait" | "assemble" | "stage" | "clean" | "dim"
  text: string
  barValue?: number
}

const PHASE_LABELS: Partial<Record<BuildPhase, string>> = {
  connecting: "PHASE 1/4  ·  CONNECTING TO API",
  streaming:  "PHASE 2/4  ·  PARSING RESPONSE",
  assembling: "PHASE 3/4  ·  ASSEMBLING VEHICLE",
  testing:    "PHASE 4/4  ·  RUNNING STAGE TESTS",
}

const DOT_COLORS: Partial<Record<BuildPhase, string>> = {
  connecting: "bg-blue-400",
  streaming:  "bg-emerald-400",
  assembling: "bg-cyan-400",
  testing:    "bg-yellow-400",
}

const LINE_STYLE: Record<DisplayLine["type"], string> = {
  header:    "text-white/35 tracking-widest text-[10px] pt-1.5 pb-0.5",
  system:    "text-blue-300/80",
  param:     "text-emerald-300/85",
  injection: "text-red-400 font-semibold",
  clamp:     "text-orange-300/90",
  trait:     "text-purple-300/90",
  assemble:  "text-cyan-300/80",
  stage:     "text-yellow-300 font-semibold",
  clean:     "text-emerald-400",
  dim:       "text-white/30",
}

const LINE_PREFIX: Partial<Record<DisplayLine["type"], string>> = {
  system:    "·",
  param:     "›",
  injection: "⚠",
  clamp:     "⚡",
  trait:     "★",
  assemble:  "▸",
  stage:     "◈",
  clean:     "✓",
  dim:       "·",
}

function BarChart({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(10, Math.round(value / 10)))
  const empty  = 10 - filled
  return (
    <span className="shrink-0 font-mono text-[10px] tracking-tighter ml-2 select-none">
      <span className="text-white/55">{"█".repeat(filled)}</span>
      <span className="text-white/12">{"░".repeat(empty)}</span>
      <span className="text-white/35 ml-1.5">{value}</span>
    </span>
  )
}

interface BuildDisplayProps {
  phase: BuildPhase
  lines: DisplayLine[]
}

export default function BuildDisplay({ phase, lines }: BuildDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  if (phase === "idle" || phase === "done") return null

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="w-full max-w-[440px] mx-4 rounded-2xl overflow-hidden shadow-[0_8px_80px_rgba(0,0,0,0.9)] border border-white/8"
           style={{ background: "rgba(6,6,14,0.92)", backdropFilter: "blur(20px)" }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/6">
          <div className={cn("w-2 h-2 rounded-full animate-pulse shrink-0", DOT_COLORS[phase] ?? "bg-white/30")} />
          <span className="font-mono text-[10px] text-white/40 tracking-[0.18em] truncate">
            {PHASE_LABELS[phase] ?? ""}
          </span>
          <div className="ml-auto flex gap-1">
            {["bg-white/6", "bg-white/6", "bg-white/6"].map((c, i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full", c)} />
            ))}
          </div>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          className="px-4 py-3 h-60 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="space-y-[3px]">
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  "flex items-baseline gap-1.5 font-mono text-[11px] leading-[1.65]",
                  LINE_STYLE[line.type],
                )}
              >
                {line.type !== "header" && (
                  <span className="opacity-45 shrink-0 w-3 text-center text-[10px]">
                    {LINE_PREFIX[line.type] ?? " "}
                  </span>
                )}
                <span className="flex-1 break-all">{line.text}</span>
                {line.barValue !== undefined && <BarChart value={line.barValue} />}
              </div>
            ))}

            {/* Blinking cursor */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] mt-1">
              <span className="opacity-40 shrink-0 w-3 text-center text-[10px]">›</span>
              <span className="w-[7px] h-[12px] bg-white/40 animate-pulse inline-block rounded-sm" />
            </div>
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="h-[2px] bg-white/5">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              phase === "connecting" ? "bg-blue-400/60 w-1/4" :
              phase === "streaming"  ? "bg-emerald-400/60 w-2/4" :
              phase === "assembling" ? "bg-cyan-400/60 w-3/4" :
              phase === "testing"    ? "bg-yellow-400/60 w-full" :
              "w-0"
            )}
          />
        </div>
      </div>
    </div>
  )
}
