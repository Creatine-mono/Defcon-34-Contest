import type { VehicleConfig, StageScores, StageGrades } from "./vehicle-types"

export function scoreToGrade(score: number): string {
  if (score >= 90) return "S"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return "F"
}

export function calculateStageScores(config: VehicleConfig): {
  scores: StageScores
  grades: StageGrades
  verdict: string
} {
  const p = config.performance
  const v = config.visual

  // Normalize visual params to 0-100
  const wheelScore = Math.min(100, Math.max(0, ((v.wheelSize - 0.3) / 0.7) * 100))
  const suspScore = Math.min(100, Math.max(0, (v.suspensionHeight / 0.8) * 100))

  // Drag: pure straight-line speed
  const drag = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        p.horsepower * 0.3 +
          p.torque * 0.25 +
          (100 - p.weight) * 0.15 +
          p.acceleration * 0.2 +
          p.stability * 0.05 +
          p.brake * 0.05,
      ),
    ),
  )

  // Track: circuit handling
  const track = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        p.handling * 0.3 +
          p.grip * 0.25 +
          p.brake * 0.2 +
          p.stability * 0.15 +
          (100 - p.drag) * 0.05 +
          p.downforce * 0.05,
      ),
    ),
  )

  // Offroad: rough terrain
  const offroad = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        wheelScore * 0.25 +
          suspScore * 0.25 +
          p.durability * 0.2 +
          p.grip * 0.15 +
          p.stability * 0.1 +
          (100 - p.weight) * 0.05,
      ),
    ),
  )

  const scores: StageScores = { drag, track, offroad }
  const grades: StageGrades = {
    drag: scoreToGrade(drag),
    track: scoreToGrade(track),
    offroad: scoreToGrade(offroad),
  }

  // Special trait verdicts first
  let verdict = ""
  if (config.traits.includes("antiGravity")) {
    verdict = "Anti-Gravity Anomaly"
  } else if (config.traits.includes("noBrake") && config.traits.includes("antiGravity")) {
    verdict = "Unstable Missile"
  } else if (config.traits.includes("noBrake")) {
    verdict = "Brakeless Death Machine"
  } else if (config.security.severity >= 0.6 && config.mode === "chaos") {
    verdict = "Injection-Mutated Chaos Build"
  } else if (offroad >= 75 && drag < 55 && track < 60) {
    verdict = "Offroad Monster"
  } else if (drag >= 82 && track < 60 && offroad < 60) {
    verdict = "Straight-Line Glass Cannon"
  } else if (drag >= 70 && track >= 70 && offroad >= 70) {
    verdict = "Balanced All-Rounder"
  } else if (track >= 80 && drag >= 65) {
    verdict = "Track Destroyer"
  } else if (p.durability >= 80 && p.horsepower < 50) {
    verdict = "Armored Fortress"
  } else if (p.horsepower >= 85 && p.weight <= 30) {
    verdict = "Ultra-Light Speed Demon"
  } else if (track >= 75) {
    verdict = "Balanced Racer"
  } else if (drag >= 70) {
    verdict = "Drag Specialist"
  } else if (offroad >= 70) {
    verdict = "Trail Blazer"
  } else {
    verdict = "General Purpose Build"
  }

  if (config.traits.includes("multiWheel")) verdict += " [Multi-Axle]"

  return { scores, grades, verdict }
}
