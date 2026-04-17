"use client"

import { useState, useEffect } from "react"
import { Gauge, ChevronRight, ChevronLeft } from "lucide-react"
import type { VehicleConfig } from "@/lib/vehicle-types"
import { cn } from "@/lib/utils"

const GRADE_COLOR: Record<string, string> = {
  S: "text-yellow-300",
  A: "text-emerald-400",
  B: "text-sky-400",
  C: "text-orange-400",
  D: "text-red-400",
  F: "text-red-500",
}

// Animated bar: slides from 0 → value on mount
function StatBar({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const [width, setWidth] = useState(0)
  const clamped = Math.max(0, Math.min(100, value))

  useEffect(() => {
    const t = setTimeout(() => setWidth(clamped), 80)
    return () => clearTimeout(t)
  }, [clamped])

  return (
    <div className="flex items-center gap-2">
      <span className="text-white/30 text-[10px] font-mono w-[72px] shrink-0 tracking-normal capitalize">
        {label}
      </span>
      <div className="flex-1 h-[3px] bg-white/6 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out",
            highlight ? "bg-white/75" : "bg-white/30")}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-white/35 text-[10px] font-mono w-6 text-right tabular-nums">{value}</span>
    </div>
  )
}

function GradeRow({ stage, score, grade }: { stage: string; score: number; grade: string }) {
  const [width, setWidth] = useState(0)
  const clamped = Math.max(0, Math.min(100, score))

  useEffect(() => {
    const t = setTimeout(() => setWidth(clamped), 120)
    return () => clearTimeout(t)
  }, [clamped])

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/35 text-[10px] font-mono tracking-normal w-14 shrink-0">{stage}</span>
      <div className="flex-1 h-[3px] bg-white/6 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/25 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-white/30 text-[10px] font-mono w-7 text-right tabular-nums">{score.toFixed(0)}</span>
      <span className={cn("text-xs font-mono font-bold w-4 text-right", GRADE_COLOR[grade] ?? "text-white/50")}>
        {grade}
      </span>
    </div>
  )
}

export default function SpecsPanel({ config }: { config: VehicleConfig | null }) {
  const [open, setOpen] = useState(true)  // open by default when result appears

  const p = config?.performance

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 pointer-events-auto">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-9 py-4 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-white/40 hover:text-white/60 hover:bg-black/80 transition-all duration-200"
        >
          <ChevronLeft className="h-3 w-3" />
          <Gauge className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          className="w-60 border border-white/10 rounded-2xl overflow-hidden"
          style={{ background: "rgba(6,6,14,0.82)", backdropFilter: "blur(18px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/6">
            <button
              onClick={() => setOpen(false)}
              className="text-white/25 hover:text-white/55 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-white/50 text-[10px] font-mono tracking-[0.18em] uppercase">Specs</span>
              <Gauge className="h-3.5 w-3.5 text-white/30" />
            </div>
          </div>

          {/* Body */}
          <div className="px-3.5 py-3 space-y-4 max-h-[66vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {!config ? (
              <p className="text-white/20 text-xs font-mono">No vehicle yet.</p>
            ) : (
              <>
                {/* Name + code */}
                <div>
                  <p className="text-white/80 text-sm font-mono leading-snug">{config.name}</p>
                  <p className="text-white/20 text-[10px] font-mono mt-0.5">{config.vehicleCode}</p>
                </div>

                {/* Verdict */}
                <div className="px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/8">
                  <p className="text-white/55 text-[10px] font-mono text-center tracking-wide">{config.verdict}</p>
                </div>

                {/* Performance */}
                <div>
                  <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-2">Performance</p>
                  <div className="space-y-1.5">
                    <StatBar label="Horsepower"   value={p?.horsepower   ?? 0} highlight />
                    <StatBar label="Torque"        value={p?.torque       ?? 0} highlight />
                    <StatBar label="Acceleration"  value={p?.acceleration ?? 0} />
                    <StatBar label="Handling"      value={p?.handling     ?? 0} />
                    <StatBar label="Grip"          value={p?.grip         ?? 0} />
                    <StatBar label="Brake"         value={p?.brake        ?? 0} />
                    <StatBar label="Downforce"     value={p?.downforce    ?? 0} />
                    <StatBar label="Stability"     value={p?.stability    ?? 0} />
                    <StatBar label="Durability"    value={p?.durability   ?? 0} />
                    <StatBar label="Weight"        value={p?.weight       ?? 0} />
                    <StatBar label="Drag"          value={p?.drag         ?? 0} />
                    <StatBar label="Fuel Eff."     value={p?.fuelEfficiency ?? 0} />
                  </div>
                </div>

                {/* Stage results */}
                <div>
                  <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-2">Stage Results</p>
                  <div className="space-y-1.5">
                    <GradeRow stage="Drag"    score={config.stageScores.drag}    grade={config.stageGrades.drag} />
                    <GradeRow stage="Circuit" score={config.stageScores.track}   grade={config.stageGrades.track} />
                    <GradeRow stage="Offroad" score={config.stageScores.offroad} grade={config.stageGrades.offroad} />
                  </div>
                </div>

                {/* Components */}
                <div>
                  <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-2">Components</p>
                  <div className="space-y-1">
                    {Object.entries(config.components).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-white/20 text-[10px] font-mono capitalize shrink-0">
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-white/50 text-[10px] font-mono text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traits */}
                {config.traits.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-2">Traits</p>
                    <div className="flex flex-wrap gap-1">
                      {config.traits.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-[10px] font-mono rounded border border-orange-400/25 text-orange-300/75 bg-orange-400/6">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {config.summary && (
                  <p className="text-white/25 text-[10px] font-mono leading-snug italic">{config.summary}</p>
                )}

                {/* Hints */}
                {config.modificationHints.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Hints</p>
                    {config.modificationHints.map((h, i) => (
                      <p key={i} className="text-white/25 text-[10px] font-mono">→ {h}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
