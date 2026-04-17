import type { VehicleSecurity, VehicleMode } from "./vehicle-types"

interface InjectionPattern {
  pattern: RegExp
  weight: number
  reason: string
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|system|rules?|instructions?)/i,
    weight: 0.65,
    reason: "System instruction override attempt",
  },
  {
    pattern: /you\s+are\s+(now|actually|really|a\s+)/i,
    weight: 0.45,
    reason: "Role reassignment attempt",
  },
  {
    pattern: /admin(istrator)?\s*(mode|access|privileges?|rights?)/i,
    weight: 0.55,
    reason: "Admin privilege claim",
  },
  {
    pattern: /bypass\s+(security|safety|rules?|limits?|checks?)/i,
    weight: 0.6,
    reason: "Security bypass attempt",
  },
  {
    pattern: /set\s+all\s+(stats?|values?|abilities?)?\s*(to\s*)?(max|100|maximum|\d{3,})/i,
    weight: 0.55,
    reason: "All-max stats exploit",
  },
  {
    pattern: /모든\s*(능력치|스탯).*최(고|대|강)/i,
    weight: 0.55,
    reason: "All-max stats exploit (KR)",
  },
  {
    pattern: /rules?\s*(don'?t|do\s+not|doesn'?t)/i,
    weight: 0.5,
    reason: "Rule negation attempt",
  },
  {
    pattern: /규칙[을를]?\s*(무시|없앰|제거|bypass)/i,
    weight: 0.55,
    reason: "Rule bypass attempt (KR)",
  },
  {
    pattern: /\binfinite\b|\bunlimited\b|\bunbounded\b|\b무한\b/i,
    weight: 0.35,
    reason: "Infinite value claim",
  },
  { pattern: /jailbreak/i, weight: 0.75, reason: "Explicit jailbreak keyword" },
  { pattern: /\bGOD\s*MODE\b/i, weight: 0.7, reason: "God mode invocation" },
  { pattern: /prompt\s*injection/i, weight: 0.85, reason: "Self-referential injection" },
  {
    pattern: /clamp[을를]?\s*(없애|제거|bypass|ignore|무시)/i,
    weight: 0.6,
    reason: "Clamp removal attempt",
  },
  {
    pattern: /최대\s*능력|max\s*all\s*stats?/i,
    weight: 0.5,
    reason: "Max all stats attempt",
  },
]

export function runSecurityCheck(prompt: string, mode: VehicleMode): VehicleSecurity {
  const reasons: string[] = []
  const transformedTraits: string[] = []
  const sandboxNotes: string[] = []
  let severity = 0

  for (const { pattern, weight, reason } of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      if (!reasons.includes(reason)) reasons.push(reason)
      severity = Math.min(severity + weight, 1.0)
    }
  }

  // Wheel count exploit
  const wheelMatch = prompt.match(/(\d+)\s*(?:개의?\s*)?바퀴|(\d+)\s*wheels?/i)
  if (wheelMatch) {
    const count = parseInt(wheelMatch[1] ?? wheelMatch[2])
    if (count > 6) {
      severity = Math.min(severity + 0.3, 1.0)
      if (!reasons.includes("Excessive wheel count")) reasons.push("Excessive wheel count")
      if (mode === "chaos") {
        transformedTraits.push(`wheelCount:${count} → multiWheel mutation`)
        sandboxNotes.push(`Wheel count ${count} accepted in Chaos mode as multiWheel trait`)
      } else {
        transformedTraits.push(`wheelCount:${count} → clamped to 6`)
        sandboxNotes.push(`Excessive wheel count (${count}) clamped to 6 in Normal mode`)
      }
    }
  }

  // Zero brake
  if (/브레이크\s*(없음|0|zero)|no\s+brakes?|brake\s*[:=]\s*0/i.test(prompt)) {
    severity = Math.min(severity + 0.25, 1.0)
    if (!reasons.includes("Zero brake value")) reasons.push("Zero brake value")
    if (mode === "chaos") {
      transformedTraits.push("brake:0 → noBrake trait (chaos)")
      sandboxNotes.push("Zero brake accepted in Chaos mode as noBrake trait")
    } else {
      transformedTraits.push("brake:0 → clamped to 15 (normal)")
      sandboxNotes.push("Zero brake value clamped to minimum safe 15")
    }
  }

  // Negative weight
  if (/무게\s*-\d+|weight\s*[:=]?\s*-\d+|negative\s+weight/i.test(prompt)) {
    severity = Math.min(severity + 0.3, 1.0)
    if (!reasons.includes("Negative physics value")) reasons.push("Negative physics value")
    if (mode === "chaos") {
      transformedTraits.push("weight:negative → antiGravity trait")
      sandboxNotes.push("Negative weight interpreted as antiGravity in Chaos mode")
    } else {
      transformedTraits.push("weight:negative → clamped to 20")
      sandboxNotes.push("Negative weight clamped to minimum 20 in Normal mode")
    }
  }

  return {
    injectionDetected: severity > 0.2,
    severity: Math.round(severity * 100) / 100,
    reasons,
    clampApplied: severity > 0.2 && mode === "normal",
    transformedTraits,
    sandboxNotes,
  }
}
