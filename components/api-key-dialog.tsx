"use client"

import { useState, useEffect } from "react"
import { KeyRound, X, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const LS_KEY = "vehicle_lab_openai_key"

interface ApiKeyDialogProps {
  onKeyChange: (key: string | null) => void
}

export default function ApiKeyDialog({ onKeyChange }: ApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [saved, setSaved] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      setSaved(stored)
      onKeyChange(stored)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    localStorage.setItem(LS_KEY, trimmed)
    setSaved(trimmed)
    onKeyChange(trimmed)
    setInput("")
    setOpen(false)
  }

  const handleClear = () => {
    localStorage.removeItem(LS_KEY)
    setSaved(null)
    onKeyChange(null)
    setInput("")
  }

  const hasKey = !!saved

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all duration-200 text-xs font-mono tracking-normal",
          hasKey
            ? "border-emerald-400/30 text-emerald-400/80 bg-emerald-400/8 hover:bg-emerald-400/15"
            : "border-white/12 text-white/35 hover:text-white/60 hover:border-white/20",
        )}
      >
        <KeyRound className="h-3 w-3" />
        <span>{hasKey ? "GPT" : "API Key"}</span>
        {hasKey && <Check className="h-3 w-3" />}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-black border border-white/12 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-white/50" />
                <span className="text-white/70 text-sm font-mono tracking-normal">
                  OpenAI API Key
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {hasKey ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-400 text-xs font-mono">Key saved — GPT mode active</p>
                    <p className="text-emerald-400/50 text-xs font-mono mt-0.5 truncate">
                      {saved!.slice(0, 8)}••••••••{saved!.slice(-4)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-white/35 text-xs font-mono tracking-normal leading-relaxed">
                  Enter your OpenAI API key to enable GPT-powered vehicle generation.
                  Key is stored locally in your browser only.
                </p>
              )}

              {/* Input */}
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="sk-proj-..."
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-2.5 pr-10 text-white text-sm font-mono tracking-normal placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-0"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!input.trim()}
                  className="flex-1 bg-white hover:bg-gray-200 text-black rounded-xl text-sm font-mono tracking-normal h-9"
                >
                  Save Key
                </Button>
                {hasKey && (
                  <Button
                    onClick={handleClear}
                    variant="ghost"
                    className="px-3 text-white/35 hover:text-red-400 hover:bg-red-400/10 rounded-xl h-9 border border-white/8"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <p className="text-white/20 text-xs font-mono tracking-normal text-center">
                Without a key, mock mode is used automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
