"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import type { VehicleConfig } from "@/lib/vehicle-types"
import { cn } from "@/lib/utils"

interface Props {
  config: VehicleConfig
}

const CATEGORY_STYLE = {
  performance: "text-blue-300/80 border-blue-400/25 bg-blue-400/6",
  visual:      "text-purple-300/80 border-purple-400/25 bg-purple-400/6",
  security:    "text-red-300/80 border-red-400/25 bg-red-400/6",
} as const

export default function PromptEffects({ config }: Props) {
  const [open, setOpen] = useState(true)

  const effects = config.keywordEffects ?? []
  if (effects.length === 0) return null

  // Group by category
  const grouped = effects.reduce<Record<string, typeof effects>>((acc, e) => {
    const cat = e.category ?? "performance"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  const bodyLine = `body: ${config.visual.bodyType}  ·  ${config.visual.wheelCount} wheels  ·  Ø${config.visual.wheelSize.toFixed(2)}m`

  return (
    <div className="absolute bottom-24 right-4 z-20 w-56 pointer-events-auto">
      <div
        className="rounded-2xl overflow-hidden border border-white/8"
        style={{ background: "rgba(6,6,14,0.88)", backdropFilter: "blur(18px)" }}
      >
        {/* Header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 border-b border-white/6 hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-white/40" />
            <span className="text-[10px] font-mono text-white/45 tracking-[0.18em] uppercase">
              GPT Output
            </span>
          </div>
          {open
            ? <ChevronDown className="h-3 w-3 text-white/30" />
            : <ChevronUp   className="h-3 w-3 text-white/30" />}
        </button>

        {open && (
          <div className="px-3.5 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
            {/* Vehicle summary line */}
            <div className="px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/6">
              <p className="text-white/55 text-[9px] font-mono leading-relaxed">
                {config.name}
              </p>
              <p className="text-white/30 text-[9px] font-mono leading-relaxed mt-0.5">
                {bodyLine}
              </p>
              {config.visual.primaryColor && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-3 h-3 rounded-sm border border-white/10 shrink-0"
                    style={{ backgroundColor: config.visual.primaryColor }}
                  />
                  <span className="text-white/30 text-[9px] font-mono">{config.visual.primaryColor}</span>
                  <div
                    className="w-3 h-3 rounded-sm border border-white/10 shrink-0 ml-1"
                    style={{ backgroundColor: config.visual.accentColor }}
                  />
                  <span className="text-white/30 text-[9px] font-mono">{config.visual.accentColor}</span>
                </div>
              )}
            </div>

            {/* Keyword effects by category */}
            {(["performance", "visual", "security"] as const).map(cat => {
              const items = grouped[cat]
              if (!items?.length) return null
              return (
                <div key={cat}>
                  <p className="text-white/20 text-[8px] font-mono tracking-[0.22em] uppercase mb-1.5">
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {items.map((e, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2 py-1 rounded border text-[9px] font-mono",
                          CATEGORY_STYLE[cat] ?? "text-white/40 border-white/10 bg-white/4"
                        )}
                      >
                        <span className="truncate opacity-80">"{e.text}"</span>
                        <span className="shrink-0 opacity-60">
                          {e.target}
                          {e.delta !== 0 && (
                            <span className={e.delta > 0 ? " text-emerald-400/80" : " text-red-400/80"}>
                              {" "}{e.delta > 0 ? `+${e.delta}` : e.delta}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Traits */}
            {config.traits.length > 0 && (
              <div>
                <p className="text-white/20 text-[8px] font-mono tracking-[0.22em] uppercase mb-1.5">
                  Traits
                </p>
                <div className="flex flex-wrap gap-1">
                  {config.traits.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-orange-400/25 text-orange-300/70 bg-orange-400/6">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {config.summary && (
              <p className="text-white/22 text-[9px] font-mono leading-relaxed italic border-t border-white/5 pt-2">
                "{config.summary}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
