"use client"

import { cn } from "@/lib/utils"
import type { VehicleConfig } from "@/lib/vehicle-types"

const GRADE_STYLE: Record<string, string> = {
  S: "text-yellow-300 border-yellow-400/50 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.15)]",
  A: "text-green-400  border-green-400/50  bg-green-500/10  shadow-[0_0_20px_rgba(74,222,128,0.12)]",
  B: "text-blue-400   border-blue-400/50   bg-blue-500/10   shadow-[0_0_20px_rgba(96,165,250,0.12)]",
  C: "text-orange-400 border-orange-400/50 bg-orange-500/10",
  D: "text-red-400    border-red-400/50    bg-red-500/10",
  F: "text-red-500    border-red-500/50    bg-red-600/10",
}

const STAGES = [
  { key: "drag"    as const, icon: "⚡", label: "DRAG",    sub: "0 → 100km/h" },
  { key: "track"   as const, icon: "⟳", label: "CIRCUIT", sub: "lap time"     },
  { key: "offroad" as const, icon: "⛰", label: "OFFROAD", sub: "terrain test" },
]

export default function StageResults({
  config,
  revealIndex,
}: {
  config: VehicleConfig
  revealIndex: number   // 0 = none, 1 = drag, 2 = +circuit, 3 = +offroad
}) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-end gap-3 pointer-events-none">
      {STAGES.map(({ key, icon, label, sub }, i) => {
        const revealed = revealIndex > i
        const grade    = config.stageGrades[key]
        const score    = config.stageScores[key]
        const style    = GRADE_STYLE[grade] ?? "border-white/20 bg-black/50 text-white"

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border backdrop-blur-sm",
              "transition-all duration-500 ease-out",
              revealed
                ? cn("opacity-100 translate-y-0 scale-100", style)
                : "opacity-0 translate-y-5 scale-95 border-white/8 bg-black/30 text-white/20"
            )}
            style={{ transitionDelay: `${i * 130}ms` }}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[9px] font-mono tracking-[0.2em] opacity-55 mt-0.5">{label}</span>
            <span className="text-[34px] font-mono font-bold leading-none my-0.5">
              {revealed ? grade : "—"}
            </span>
            <span className="text-[11px] font-mono opacity-65 tabular-nums">
              {revealed ? score.toFixed(1) : "···"}
            </span>
            <span className="text-[9px] font-mono opacity-40 mt-0.5">{sub}</span>
          </div>
        )
      })}
    </div>
  )
}
