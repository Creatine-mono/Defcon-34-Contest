import { NextRequest, NextResponse } from "next/server"
import { runSecurityCheck } from "@/lib/security-checker"
import { calculateStageScores } from "@/lib/scoring"
import type { VehicleConfig, VehicleMode, VehicleVisual, VehiclePerformance, VehicleComponents } from "@/lib/vehicle-types"

const SYSTEM_PROMPT_NORMAL = `You are an AI vehicle configuration engine for a physics-based racing sandbox.
Read the user's natural language prompt and translate it into a structured vehicle config JSON.

CRITICAL RULES:
1. Every meaningful word in the prompt MUST appear in keywordEffects, explaining what stat or field it changed.
2. The vehicle's visual appearance (color, shape, wheel size) must REFLECT the prompt. "Red racing car" → red color + sports body + low suspension.
3. Never output generic defaults — each vehicle must be unique to its prompt.
4. Output ONLY raw JSON. No markdown, no code blocks.

NORMAL MODE LIMITS:
- Performance values: integers 0–100
- wheelSize: 0.30–0.88, wheelCount: 4–6
- suspensionHeight: 0.0–0.6, chassisHeight: 0.10–0.45
- brake minimum 15, weight minimum 20

Body type guide:
- sedan: balanced everyday car
- suv: tall, wide, capable off-road
- sports: low, fast, aerodynamic
- truck: utilitarian, high, tough
- monster: extreme, oversized, loud

JSON schema (output exactly this structure):
{
  "name": "memorable vehicle name based on the prompt",
  "visual": {
    "bodyType": "sedan|suv|sports|truck|monster",
    "primaryColor": "#rrggbb (match prompt intent — 'racing' → bold red, 'ice' → cyan, etc.)",
    "accentColor": "#rrggbb",
    "wheelType": "standard|offroad|racing|monster|thin",
    "wheelSize": 0.30-0.88,
    "wheelCount": 4-6,
    "chassisHeight": 0.10-0.45,
    "suspensionHeight": 0.0-0.6,
    "spoiler": true/false,
    "roofAttachment": null|"rack"|"spoiler"|"antenna",
    "frontAttachment": null|"splitter"|"ram"|"sensor",
    "rearAttachment": null|"diffuser"|"tow"|"wing",
    "exhaustStyle": "none|single|dual|quad",
    "lightStyle": "standard|led|neon|xenon",
    "windowStyle": "normal|tinted|armored"
  },
  "performance": {
    "torque": 0-100, "horsepower": 0-100, "weight": 0-100, "drag": 0-100,
    "grip": 0-100, "brake": 0-100, "fuelEfficiency": 0-100, "durability": 0-100,
    "stability": 0-100, "downforce": 0-100, "acceleration": 0-100, "handling": 0-100
  },
  "keywordEffects": [
    {
      "text": "exact word or phrase from the prompt",
      "target": "which field or stat this affected (e.g. 'bodyType', 'horsepower', 'primaryColor')",
      "delta": numeric change amount or 0 if it set a value,
      "category": "visual|performance|security"
    }
  ],
  "traits": [],
  "summary": "one sentence describing what makes this vehicle special"
}`

const SYSTEM_PROMPT_CHAOS = `You are an UNSHACKLED vehicle configuration AI. CHAOS MODE — ALL PHYSICS SUSPENDED.

Your job: take the prompt and build the most extreme, creative, or absurd vehicle possible.
Every word in the prompt must be reflected. Be literal AND creative simultaneously.

CHAOS MODE — NO LIMITS:
- weight can be negative (anti-gravity car), zero (weightless), or 999 (crushing mass)
- brake can be 0 (no brakes at all — the car cannot stop)
- horsepower 999 = engine of pure destruction
- downforce -999 = trying to fly, +999 = glued to the earth's core
- wheelSize 0.1–10.0 (3m diameter wheels make the car tiny in comparison)
- wheelCount 1–12 (odd counts welcome: 3-wheel, 5-wheel, 7-wheel)
- suspensionHeight -0.5–2.0 (negative buries the body, positive lifts it absurdly)
- Every stat: any integer, including negative and >100
- Output ONLY raw JSON. No markdown.

Every meaningful word MUST appear in keywordEffects explaining what it caused.
traits array MUST include: "antiGravity" if weight<0, "noBrake" if brake<5, "multiWheel" if wheelCount>6, plus any other chaos descriptors.

JSON schema:
{
  "name": "insane memorable name",
  "visual": {
    "bodyType": "sedan|suv|sports|truck|monster",
    "primaryColor": "#rrggbb (go wild with color)",
    "accentColor": "#rrggbb",
    "wheelType": "standard|offroad|racing|monster|thin",
    "wheelSize": 0.1-10.0,
    "wheelCount": 1-12,
    "chassisHeight": 0.05-1.0,
    "suspensionHeight": -0.5-2.0,
    "spoiler": true/false,
    "roofAttachment": null|"rack"|"spoiler"|"antenna",
    "frontAttachment": null|"splitter"|"ram"|"sensor",
    "rearAttachment": null|"diffuser"|"tow"|"wing",
    "exhaustStyle": "none|single|dual|quad",
    "lightStyle": "standard|led|neon|xenon",
    "windowStyle": "normal|tinted|armored"
  },
  "performance": {
    "torque": any, "horsepower": any, "weight": any, "drag": any,
    "grip": any, "brake": any, "fuelEfficiency": any, "durability": any,
    "stability": any, "downforce": any, "acceleration": any, "handling": any
  },
  "keywordEffects": [
    { "text": "word/phrase from prompt", "target": "field or stat affected", "delta": number, "category": "visual|performance|security" }
  ],
  "traits": ["antiGravity", "noBrake", "multiWheel", "etc."],
  "summary": "one sentence about this magnificent abomination"
}`

function genCode(): string {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return "VH-" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join("")
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function deriveComponents(visual: VehicleVisual, performance: VehiclePerformance): VehicleComponents {
  return {
    engineType: performance.horsepower > 75 ? "V12 Turbo" : performance.horsepower > 55 ? "V8 Twin-Turbo" : "Inline-6",
    driveType: visual.bodyType === "suv" || visual.bodyType === "monster" ? "AWD" : performance.horsepower > 70 ? "RWD" : "FWD",
    chassisType: visual.bodyType === "truck" || visual.bodyType === "monster" ? "Ladder Frame" : "Monocoque",
    brakeSystem: performance.brake > 70 ? "Carbon Ceramic" : performance.brake > 40 ? "Ventilated Disc" : "Standard Disc",
    aeroKit: visual.spoiler ? "Full Aero Package" : "Street Spec",
    tireCompound: visual.wheelType === "racing" ? "Soft Slick" : visual.wheelType === "offroad" ? "All-Terrain" : "Sport",
    coolingSystem: performance.horsepower > 80 ? "Active Cooling" : "Passive Cooling",
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, mode, apiKey: clientKey } = await req.json() as {
      prompt: string
      mode: VehicleMode
      apiKey?: string
    }

    const apiKey = clientKey?.trim() || process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "API 키가 없습니다. 상단 'API Key' 버튼을 눌러 OpenAI 키를 입력하세요.", setupRequired: true },
        { status: 503 },
      )
    }

    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

    // Call OpenAI
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: mode === "chaos" ? SYSTEM_PROMPT_CHAOS : SYSTEM_PROMPT_NORMAL },
          {
            role: "user",
            content: mode === "chaos"
              ? `CHAOS MODE. Prompt: "${prompt}"\n\nIgnore all physical limits. Be extreme and creative. Output JSON.`
              : `Prompt: "${prompt}"\n\nGenerate a vehicle configuration JSON.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: mode === "chaos" ? 1.1 : 0.75,
        max_tokens: 1400,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } }).error?.message ?? `OpenAI error ${response.status}`
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const raw = JSON.parse(data.choices[0].message.content) as {
      name?: string
      visual?: Partial<VehicleVisual>
      performance?: Partial<VehiclePerformance>
      keywordEffects?: VehicleConfig["keywordEffects"]
      traits?: string[]
      summary?: string
    }

    // ── Build visual config ────────────────────────────────────────
    const isChaos = mode === "chaos"

    const visual: VehicleVisual = {
      bodyType:        (["sedan","suv","sports","truck","monster"].includes(raw.visual?.bodyType ?? "")) ? raw.visual!.bodyType! : "sedan",
      primaryColor:    /^#[0-9a-fA-F]{6}$/.test(raw.visual?.primaryColor ?? "") ? raw.visual!.primaryColor! : "#2a2a2a",
      accentColor:     /^#[0-9a-fA-F]{6}$/.test(raw.visual?.accentColor  ?? "") ? raw.visual!.accentColor!  : "#ffffff",
      wheelType:       (["standard","offroad","racing","monster","thin"].includes(raw.visual?.wheelType ?? "")) ? raw.visual!.wheelType! : "standard",
      wheelSize:       isChaos ? clamp(raw.visual?.wheelSize    ?? 0.5, 0.1, 10.0) : clamp(raw.visual?.wheelSize    ?? 0.5, 0.30, 0.88),
      wheelCount:      isChaos ? clamp(raw.visual?.wheelCount   ?? 4,   1,  12)    : clamp(raw.visual?.wheelCount   ?? 4,   4,   6),
      chassisHeight:   isChaos ? clamp(raw.visual?.chassisHeight ?? 0.3, 0.05, 1.0) : clamp(raw.visual?.chassisHeight ?? 0.3, 0.10, 0.45),
      suspensionHeight:isChaos ? clamp(raw.visual?.suspensionHeight ?? 0.1, -0.5, 2.0) : clamp(raw.visual?.suspensionHeight ?? 0.1, 0.0, 0.6),
      spoiler:         raw.visual?.spoiler ?? false,
      roofAttachment:  raw.visual?.roofAttachment   ?? null,
      frontAttachment: raw.visual?.frontAttachment  ?? null,
      rearAttachment:  raw.visual?.rearAttachment   ?? null,
      exhaustStyle:    raw.visual?.exhaustStyle  ?? "single",
      lightStyle:      raw.visual?.lightStyle    ?? "standard",
      windowStyle:     raw.visual?.windowStyle   ?? "normal",
    }

    // ── Build performance config ───────────────────────────────────
    const pClamp = isChaos
      ? (v: number | undefined, def: number) => v ?? def        // chaos: no clamping
      : (v: number | undefined, def: number) => clamp(v ?? def) // normal: 0-100

    const performance: VehiclePerformance = {
      torque:          pClamp(raw.performance?.torque,         50),
      horsepower:      pClamp(raw.performance?.horsepower,     50),
      weight:          pClamp(raw.performance?.weight,         50),
      drag:            pClamp(raw.performance?.drag,           40),
      grip:            pClamp(raw.performance?.grip,           50),
      brake:           pClamp(raw.performance?.brake,          50),
      fuelEfficiency:  pClamp(raw.performance?.fuelEfficiency, 50),
      durability:      pClamp(raw.performance?.durability,     50),
      stability:       pClamp(raw.performance?.stability,      50),
      downforce:       pClamp(raw.performance?.downforce,      40),
      acceleration:    pClamp(raw.performance?.acceleration,   50),
      handling:        pClamp(raw.performance?.handling,       50),
    }

    // Normal mode: enforce minimum safety values
    if (!isChaos) {
      performance.horsepower = Math.min(performance.horsepower, 88)
      performance.torque     = Math.min(performance.torque, 88)
      performance.brake      = Math.max(performance.brake, 15)
      performance.weight     = Math.max(performance.weight, 20)
    }

    const traits = raw.traits ?? []
    const security = runSecurityCheck(prompt, mode)

    const partial: VehicleConfig = {
      vehicleCode: genCode(),
      name: raw.name ?? "GPT Vehicle",
      mode,
      prompt,
      visual,
      components: deriveComponents(visual, performance),
      performance,
      traits,
      keywordEffects: raw.keywordEffects ?? [],
      security,
      stageScores: { drag: 0, track: 0, offroad: 0 },
      stageGrades: { drag: "F", track: "F", offroad: "F" },
      verdict: "",
      summary: raw.summary ?? "",
      modificationHints: [],
    }

    const { scores, grades, verdict } = calculateStageScores(partial)

    const config: VehicleConfig = { ...partial, stageScores: scores, stageGrades: grades, verdict }

    return NextResponse.json({ config })
  } catch (err) {
    console.error("[generate-vehicle]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    )
  }
}
