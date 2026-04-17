"use client"

import { useState, useCallback, useEffect } from "react"
import { ExternalLink, ArrowLeft, RotateCcw, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import VehicleViewer from "./vehicle-viewer"
import VehicleForm from "./form"
import BuildDisplay, { type BuildPhase, type DisplayLine } from "./build-display"
import StageResults from "./stage-results"
import SecurityPanel from "./security-panel"
import SpecsPanel from "./specs-panel"
import ApiKeyDialog from "./api-key-dialog"
import PromptEffects from "./prompt-effects"
import { parseWithGPT } from "@/lib/gpt-parser"
import type { VehicleConfig, VehicleMode } from "@/lib/vehicle-types"

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export default function Rodin() {
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [mode,         setMode]         = useState<VehicleMode>("normal")
  const [apiKey,       setApiKey]       = useState<string | null>(null)
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig | null>(null)
  const [buildPhase,   setBuildPhase]   = useState<BuildPhase>("idle")
  const [displayLines, setDisplayLines] = useState<DisplayLine[]>([])
  const [testReveal,   setTestReveal]   = useState(0)
  const [showPrompt,   setShowPrompt]   = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)
  const [isBuilding,   setIsBuilding]   = useState(false)

  // Mobile overflow lock
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
        document.documentElement.style.overflow = ""
      }
    }
  }, [isMobile])

  const handleSubmit = useCallback(async (prompt: string) => {
    let seq = 0
    const add = (line: Omit<DisplayLine, "id">) =>
      setDisplayLines(prev => [...prev, { ...line, id: `${Date.now()}-${seq++}` }])
    const reset = () => { setDisplayLines([]); seq = 0 }

    // ── Initial reset ──────────────────────────────────────────────
    setVehicleConfig(null)
    reset()
    setTestReveal(0)
    setError(null)
    setSetupRequired(false)
    setShowPrompt(false)
    setIsBuilding(true)

    // ── Phase 1: Connecting ────────────────────────────────────────
    setBuildPhase("connecting")
    const configPromise = parseWithGPT(prompt, mode, apiKey)

    await delay(180)
    add({ type: "system", text: "POST /v1/chat/completions" })
    await delay(210)
    add({ type: "dim",    text: `model: gpt-4o-mini   mode: ${mode}` })
    await delay(300)
    add({ type: "dim",    text: `prompt: "${prompt.length > 50 ? prompt.slice(0, 50) + "…" : prompt}"` })
    await delay(650)
    add({ type: "dim",    text: "awaiting response..." })

    let config: VehicleConfig
    try {
      config = await configPromise
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed"
      if (msg.includes("API 키") || msg.includes("setupRequired") || msg.includes("503")) {
        setSetupRequired(true)
      }
      setError(msg)
      setShowPrompt(true)
      setBuildPhase("idle")
      setIsBuilding(false)
      return
    }

    // ── Phase 2: Stream parameters ─────────────────────────────────
    setBuildPhase("streaming")
    reset()

    add({ type: "header", text: "── vehicle config ──" })
    await delay(130)
    add({ type: "param", text: `name: "${config.name}"` })
    await delay(90)
    add({ type: "param", text: `body: ${config.visual.bodyType}` })
    await delay(80)
    add({ type: "param", text: `color: ${config.visual.primaryColor}  accent: ${config.visual.accentColor}` })
    await delay(90)
    add({ type: "param", text: `wheels: ${config.visual.wheelCount}× ${config.visual.wheelType}  Ø${config.visual.wheelSize.toFixed(2)}m` })
    await delay(80)
    add({ type: "param", text: `suspension: ${config.visual.suspensionHeight.toFixed(2)}m  chassis: ${config.visual.chassisHeight.toFixed(2)}m` })
    await delay(80)

    const extras = [
      config.visual.spoiler                           && "spoiler",
      config.visual.exhaustStyle !== "none"           && `${config.visual.exhaustStyle} exhaust`,
      config.visual.roofAttachment                    && `roof: ${config.visual.roofAttachment}`,
      config.visual.frontAttachment                   && `front: ${config.visual.frontAttachment}`,
      config.visual.rearAttachment                    && `rear: ${config.visual.rearAttachment}`,
    ].filter(Boolean).join("  ")
    add({ type: "param", text: `extras: ${extras || "stock"}` })

    await delay(160)
    add({ type: "header", text: "── performance ──" })

    const perfEntries: Array<[string, number]> = [
      ["horsepower",   config.performance.horsepower],
      ["torque",       config.performance.torque],
      ["weight",       config.performance.weight],
      ["acceleration", config.performance.acceleration],
      ["grip",         config.performance.grip],
      ["handling",     config.performance.handling],
      ["brake",        config.performance.brake],
      ["downforce",    config.performance.downforce],
      ["stability",    config.performance.stability],
      ["durability",   config.performance.durability],
      ["fuel eff.",    config.performance.fuelEfficiency],
      ["drag coeff.",  config.performance.drag],
    ]
    for (const [key, val] of perfEntries) {
      await delay(80)
      add({ type: "param", text: key, barValue: Math.max(0, Math.min(100, val)) })
    }

    if (config.traits.length > 0) {
      await delay(150)
      add({ type: "header", text: "── special traits ──" })
      for (const t of config.traits) {
        await delay(90)
        add({ type: "trait", text: t })
      }
    }

    await delay(180)
    add({ type: "header", text: "── security scan ──" })
    await delay(380)

    if (config.security.injectionDetected) {
      add({ type: "injection", text: `INJECTION DETECTED  severity: ${Math.round(config.security.severity * 100)}%` })
      for (const r of config.security.reasons.slice(0, 4)) {
        await delay(130)
        add({ type: "clamp", text: r })
      }
      if (config.security.clampApplied) {
        await delay(150)
        add({ type: "clamp", text: "values sandboxed to safe limits" })
      }
      for (const t of config.security.transformedTraits) {
        await delay(110)
        add({ type: "trait", text: `chaos trait unlocked: ${t}` })
      }
      for (const n of config.security.sandboxNotes.slice(0, 2)) {
        await delay(100)
        add({ type: "dim", text: n })
      }
    } else {
      add({ type: "clean", text: "no injection patterns detected" })
    }

    await delay(320)

    // ── Phase 3: Assembly ──────────────────────────────────────────
    setBuildPhase("assembling")
    reset()
    setVehicleConfig(config)   // ← triggers 3D build animation

    const assemblyLog = [
      `chassis frame  (${config.visual.bodyType})`,
      `mounting ${config.visual.wheelCount} wheels  ${config.visual.wheelType}  Ø${config.visual.wheelSize.toFixed(2)}m`,
      `suspension ride height: ${config.visual.suspensionHeight.toFixed(2)}m`,
      `paint: ${config.visual.primaryColor}  accent: ${config.visual.accentColor}`,
      extras ? extras : "no optional parts",
      `lighting: ${config.visual.lightStyle}  glass: ${config.visual.windowStyle}`,
      "assembly complete ✓",
    ]
    for (const step of assemblyLog) {
      await delay(315)
      add({
        type: step.endsWith("✓") ? "clean" : "assemble",
        text: step,
      })
    }

    await delay(550)

    // ── Phase 4: Testing ───────────────────────────────────────────
    setBuildPhase("testing")
    reset()

    add({ type: "header", text: "── stage tests ──" })

    const testStages = [
      { label: "DRAG RACE", grade: config.stageGrades.drag,    score: config.stageScores.drag },
      { label: "CIRCUIT  ", grade: config.stageGrades.track,   score: config.stageScores.track },
      { label: "OFFROAD  ", grade: config.stageGrades.offroad, score: config.stageScores.offroad },
    ]

    for (let i = 0; i < testStages.length; i++) {
      const st = testStages[i]
      await delay(230)
      add({ type: "dim", text: `${st.label}  simulating...` })
      await delay(800)
      setDisplayLines(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = {
          ...last,
          type: "stage",
          text: `${st.label}  ${st.grade}  (${st.score.toFixed(1)})`,
        }
        return next
      })
      setTestReveal(i + 1)
    }

    await delay(350)
    add({ type: "clean", text: `verdict: ${config.verdict}` })
    await delay(750)

    setBuildPhase("done")
    setIsBuilding(false)
  }, [mode, apiKey])

  const handleBack = () => {
    setShowPrompt(true)
    setVehicleConfig(null)
    setDisplayLines([])
    setTestReveal(0)
    setError(null)
    setSetupRequired(false)
    setBuildPhase("idle")
  }

  const handleReset = () => {
    handleBack()
    setMode("normal")
  }

  const handlePlay = () => {
    if (!vehicleConfig) return
    localStorage.setItem("hspace-knights-play-vehicle", JSON.stringify(vehicleConfig))
    window.location.href = "/play"
  }

  const isGenerating = buildPhase !== "idle" && buildPhase !== "done"
  const showResult   = buildPhase === "done"
  const showStages   = buildPhase === "testing" || buildPhase === "done"

  const ExternalLinks = () => (
    <div className="flex items-center space-x-4">
      {[
        { label: "Demo",     href: "#" },
        { label: "Security", href: "#" },
        { label: "Docs",     href: "#" },
      ].map(({ label, href }) => (
        <a
          key={label}
          href={href}
          className="flex items-center text-white/40 hover:text-white transition-colors text-sm"
        >
          <span className="mr-1">{label}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  )

  return (
    <div className="relative h-[100dvh] w-full">
      {/* ── 3D canvas ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <VehicleViewer vehicleConfig={vehicleConfig} isBuilding={isBuilding} />
      </div>

      {/* ── Overlay UI ─────────────────────────────────── */}
      <div className="absolute inset-0 z-10 pointer-events-none">

        {/* Title */}
        <div className="absolute top-6 left-6 pointer-events-auto">
          <h1 className="text-3xl text-white font-normal tracking-normal">AI Vehicle Lab</h1>
          <p className="text-white/35 text-sm mt-0.5 tracking-normal">Prompt, inject, mutate, race.</p>
        </div>

        {/* Top-right: API key + links */}
        {!isMobile && (
          <div className="absolute top-6 right-6 pointer-events-auto flex items-center gap-5">
            {vehicleConfig && (
              <span className="text-white/20 text-xs font-mono tracking-widest">
                {vehicleConfig.vehicleCode}
                {apiKey && <span className="ml-2 text-emerald-400/60">· GPT</span>}
              </span>
            )}
            <ApiKeyDialog onKeyChange={setApiKey} />
            <ExternalLinks />
          </div>
        )}
        {isMobile && (
          <div className="absolute top-6 right-4 pointer-events-auto">
            <ApiKeyDialog onKeyChange={setApiKey} />
          </div>
        )}

        {/* Mode badge */}
        {mode === "chaos" && !isGenerating && (
          <div className="absolute top-[74px] left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full border border-red-500/40 text-red-300/70 bg-red-500/8 tracking-[0.2em]">
              CHAOS MODE · NO LIMITS
            </span>
          </div>
        )}

        {/* Errors */}
        {error && !setupRequired && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/70 text-red-200 px-4 py-2 rounded-xl text-sm font-mono max-w-sm text-center">
            {error}
          </div>
        )}
        {setupRequired && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/88 border border-red-500/40 text-red-300 px-5 py-4 rounded-2xl text-sm font-mono max-w-md pointer-events-auto">
            <p className="font-bold mb-1.5">API Key Required</p>
            <p className="text-red-300/60 text-xs mb-2">
              Click the <span className="text-white/60 font-semibold">API Key</span> button (top-right) and enter your OpenAI key.
            </p>
            <p className="text-red-300/40 text-xs">
              Or add <code className="bg-white/10 px-1 rounded">OPENAI_API_KEY</code> to <code className="bg-white/10 px-1 rounded">.env.local</code>
            </p>
          </div>
        )}

        {/* ── Build display (phases 1–4) ──────────────── */}
        <BuildDisplay phase={buildPhase} lines={displayLines} />

        {/* ── Stage result cards ──────────────────────── */}
        {vehicleConfig && showStages && (
          <StageResults config={vehicleConfig} revealIndex={testReveal} />
        )}

        {/* ── Security panel ──────────────────────────── */}
        {showResult && vehicleConfig && (
          <SecurityPanel config={vehicleConfig} />
        )}

        {/* ── Specs panel ─────────────────────────────── */}
        {showResult && vehicleConfig && (
          <SpecsPanel config={vehicleConfig} />
        )}

        {/* ── Post-generation controls ─────────────────── */}
        {showResult && vehicleConfig && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
            <Button
              onClick={handleBack}
              className="bg-black/70 hover:bg-black/90 text-white border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="tracking-normal">New Prompt</span>
            </Button>
            <Button
              onClick={handleReset}
              className="bg-black/70 hover:bg-black/90 text-white/40 hover:text-white border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="tracking-normal">Reset</span>
            </Button>
            <Button
              onClick={handlePlay}
              className="bg-white hover:bg-gray-200 text-black border border-white/30 rounded-full px-4 py-2 flex items-center gap-2 backdrop-blur-sm"
            >
              <Play className="h-4 w-4" />
              <span className="tracking-normal">Play</span>
            </Button>
          </div>
        )}

        {/* ── Prompt form ──────────────────────────────── */}
        {showPrompt && !isGenerating && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 sm:px-0 pointer-events-auto">
            <VehicleForm
              isLoading={isBuilding}
              mode={mode}
              onModeChange={setMode}
              onSubmit={handleSubmit}
            />
            {isMobile && (
              <div className="mt-4 flex justify-center">
                <ExternalLinks />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
