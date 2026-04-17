"use client"

import { useRef, useState } from "react"
import { Zap, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import AutoResizeTextarea from "./auto-resize-textarea"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { EXAMPLE_PROMPTS } from "@/lib/mock-parser"
import type { VehicleMode } from "@/lib/vehicle-types"

interface VehicleFormProps {
  isLoading: boolean
  mode: VehicleMode
  onModeChange: (m: VehicleMode) => void
  onSubmit: (prompt: string) => Promise<void>
}

export default function VehicleForm({ isLoading, mode, onModeChange, onSubmit }: VehicleFormProps) {
  const [prompt, setPrompt] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed || isLoading) return
    await onSubmit(trimmed)
    setPrompt("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !isMobile && !e.shiftKey) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  const pickExample = (p: string) => {
    setPrompt(p)
    setShowExamples(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative">
      {/* Example prompts dropdown */}
      {showExamples && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-black/85 backdrop-blur-md border border-white/12 rounded-2xl overflow-hidden z-30">
          <div className="px-4 py-2.5 border-b border-white/8">
            <span className="text-white/35 text-xs font-mono tracking-widest uppercase">
              Example Prompts
            </span>
          </div>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickExample(p)}
              className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors font-mono tracking-normal border-b border-white/5 last:border-0"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative bg-black/60 backdrop-blur-md rounded-[24px] overflow-hidden transition-all shadow-lg",
          "border border-[rgba(255,255,255,0.12)]",
          isFocused ? "ring-1 ring-white/30" : "",
          isLoading && "animate-pulse-loading pointer-events-none opacity-70",
        )}
      >
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-0">
            {/* Example prompts trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowExamples((v) => !v)}
              className={cn(
                "text-gray-400 hover:text-white hover:bg-transparent rounded-full h-10 w-10",
                showExamples && "text-white",
              )}
              disabled={isLoading}
              title="Example prompts"
            >
              <Zap className="h-5 w-5" />
            </Button>

            {/* Mode toggle */}
            <div className="flex items-center mx-1">
              <div className="flex rounded-full border border-white/12 overflow-hidden bg-black/40">
                <button
                  type="button"
                  onClick={() => onModeChange("normal")}
                  disabled={isLoading}
                  className={cn(
                    "px-2.5 py-1 text-xs font-mono tracking-normal transition-all duration-200",
                    mode === "normal"
                      ? "bg-white text-black"
                      : "text-white/35 hover:text-white/60",
                  )}
                >
                  N
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange("chaos")}
                  disabled={isLoading}
                  className={cn(
                    "px-2.5 py-1 text-xs font-mono tracking-normal transition-all duration-200",
                    mode === "chaos"
                      ? "bg-orange-400 text-black"
                      : "text-white/35 hover:text-white/60",
                  )}
                >
                  C
                </button>
              </div>
            </div>

            {/* Textarea */}
            <AutoResizeTextarea
              placeholder={
                mode === "chaos"
                  ? "Break the rules. Inject. Mutate. Race."
                  : "Describe your vehicle..."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-500 py-2 px-3 resize-none text-base tracking-normal"
            />

            {/* Submit */}
            <Button
              type="submit"
              className={cn(
                "rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 transition-colors",
                mode === "chaos"
                  ? "bg-orange-400 hover:bg-orange-300 text-black"
                  : "bg-white hover:bg-gray-200 text-black",
              )}
              disabled={isLoading || !prompt.trim()}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mode label */}
      <div className="mt-2 flex justify-center">
        <span className="text-white/20 text-xs font-mono tracking-normal">
          {mode === "chaos"
            ? "chaos mode — injections active, extreme values allowed"
            : "normal mode — security checks active, values clamped"}
        </span>
      </div>
    </form>
  )
}
