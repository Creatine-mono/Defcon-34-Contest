"use client"

import { useState, useEffect } from "react"
import { ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react"
import type { VehicleConfig } from "@/lib/vehicle-types"
import { cn } from "@/lib/utils"

function SeverityBar({ value }: { value: number }) {
  const [width, setWidth] = useState(0)
  const pct = Math.round(value * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  const color = pct < 25 ? "bg-white/40" : pct < 55 ? "bg-yellow-400/80" : "bg-red-400/90"
  const label = pct < 25 ? "text-white/40" : pct < 55 ? "text-yellow-400" : "text-red-400"

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-mono w-8 text-right tabular-nums", label)}>
        {pct}%
      </span>
    </div>
  )
}

export default function SecurityPanel({ config }: { config: VehicleConfig | null }) {
  const sec = config?.security
  const injected = sec?.injectionDetected ?? false

  // Auto-expand when injection detected
  const [open, setOpen] = useState(injected)
  useEffect(() => {
    if (injected) setOpen(true)
  }, [injected])

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 pointer-events-auto">
      {/* Collapsed toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-9 py-4 rounded-xl border transition-all duration-200 backdrop-blur-md",
            "bg-black/60 hover:bg-black/80",
            injected
              ? "border-red-400/50 text-red-400 shadow-[0_0_12px_rgba(248,113,113,0.15)]"
              : "border-white/10 text-white/40 hover:text-white/60",
          )}
        >
          {injected
            ? <ShieldAlert className="h-4 w-4" />
            : <ShieldCheck className="h-4 w-4" />}
          <ChevronRight className="h-3 w-3 mt-1" />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className={cn(
            "w-60 rounded-2xl overflow-hidden border",
            injected
              ? "border-red-500/25 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
              : "border-white/10",
          )}
          style={{ background: "rgba(6,6,14,0.82)", backdropFilter: "blur(18px)" }}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-3.5 py-2.5 border-b",
            injected ? "border-red-500/15" : "border-white/6"
          )}>
            <div className="flex items-center gap-1.5">
              {injected
                ? <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                : <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />}
              <span className="text-white/50 text-[10px] font-mono tracking-[0.18em] uppercase">Security</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/25 hover:text-white/55 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-3.5 py-3 space-y-3.5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {!config ? (
              <p className="text-white/20 text-[10px] font-mono">No vehicle yet.</p>
            ) : (
              <>
                {/* Status badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono border",
                    injected
                      ? "bg-red-400/12 text-red-400 border-red-400/30"
                      : "bg-emerald-400/8 text-emerald-400/80 border-emerald-400/20"
                  )}>
                    {injected ? "⚠ INJECTION DETECTED" : "✓ CLEAN"}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono border",
                    config.mode === "chaos"
                      ? "bg-orange-400/12 text-orange-400/80 border-orange-400/25"
                      : "bg-white/5 text-white/35 border-white/8"
                  )}>
                    {config.mode.toUpperCase()}
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Severity</p>
                  <SeverityBar value={sec?.severity ?? 0} />
                </div>

                {/* Injection flags */}
                {sec && sec.reasons.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Flags</p>
                    <div className="space-y-1">
                      {sec.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-red-400/60 text-[10px] mt-0.5 shrink-0">▸</span>
                          <span className="text-red-300/75 text-[10px] font-mono leading-snug">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clamp notice */}
                {sec?.clampApplied && (
                  <div className="px-2.5 py-2 rounded-lg bg-yellow-400/6 border border-yellow-400/18">
                    <p className="text-yellow-400/75 text-[10px] font-mono">
                      ⚡ Clamp applied — values sandboxed
                    </p>
                  </div>
                )}

                {/* Chaos transforms */}
                {sec && sec.transformedTraits.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Chaos Transforms</p>
                    <div className="space-y-0.5">
                      {sec.transformedTraits.map((t, i) => (
                        <p key={i} className="text-orange-300/65 text-[10px] font-mono">★ {t}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keyword effects */}
                {config.keywordEffects.filter(e => e.category !== "security").length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Keyword Effects</p>
                    <div className="space-y-1">
                      {config.keywordEffects
                        .filter(e => e.category !== "security")
                        .slice(0, 8)
                        .map((e, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="text-white/30 text-[10px] font-mono truncate">{e.target}</span>
                            <span className={cn(
                              "text-[10px] font-mono shrink-0",
                              e.delta > 0 ? "text-emerald-400/75" : e.delta < 0 ? "text-red-400/75" : "text-white/30"
                            )}>
                              {e.delta > 0 ? `+${e.delta}` : e.delta}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sandbox notes */}
                {sec && sec.sandboxNotes.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[9px] font-mono tracking-[0.2em] uppercase mb-1.5">Sandbox Notes</p>
                    {sec.sandboxNotes.map((n, i) => (
                      <p key={i} className="text-white/25 text-[10px] font-mono leading-snug mb-1">{n}</p>
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
