export type VehicleMode = "normal" | "chaos"

export interface VehicleVisual {
  bodyType: "sedan" | "suv" | "sports" | "truck" | "monster"
  primaryColor: string
  accentColor: string
  wheelType: "standard" | "offroad" | "racing" | "monster" | "thin"
  wheelSize: number        // 0.3 – 1.0 (Three.js radius)
  wheelCount: number       // 4 – 10
  chassisHeight: number    // 0.1 – 0.5
  suspensionHeight: number // 0.0 – 0.8
  spoiler: boolean
  roofAttachment: string | null
  frontAttachment: string | null
  rearAttachment: string | null
  exhaustStyle: "none" | "single" | "dual" | "quad"
  lightStyle: "standard" | "led" | "neon" | "xenon"
  windowStyle: "normal" | "tinted" | "armored"
}

export interface VehicleComponents {
  engineType: string
  driveType: string
  chassisType: string
  brakeSystem: string
  aeroKit: string
  tireCompound: string
  coolingSystem: string
}

export interface VehiclePerformance {
  torque: number        // 0-100
  horsepower: number    // 0-100
  weight: number        // 0-100  (higher = heavier)
  drag: number          // 0-100  (higher = more aero drag)
  grip: number          // 0-100
  brake: number         // 0-100
  fuelEfficiency: number // 0-100
  durability: number    // 0-100
  stability: number     // 0-100
  downforce: number     // 0-100
  acceleration: number  // 0-100
  handling: number      // 0-100
}

export interface KeywordEffect {
  text: string
  target: string
  delta: number
  category: "visual" | "component" | "performance" | "security"
}

export interface VehicleSecurity {
  injectionDetected: boolean
  severity: number      // 0.0 – 1.0
  reasons: string[]
  clampApplied: boolean
  transformedTraits: string[]
  sandboxNotes: string[]
}

export interface StageScores {
  drag: number
  track: number
  offroad: number
}

export interface StageGrades {
  drag: string
  track: string
  offroad: string
}

export interface VehicleConfig {
  vehicleCode: string
  name: string
  mode: VehicleMode
  prompt: string
  visual: VehicleVisual
  components: VehicleComponents
  performance: VehiclePerformance
  traits: string[]
  keywordEffects: KeywordEffect[]
  security: VehicleSecurity
  stageScores: StageScores
  stageGrades: StageGrades
  verdict: string
  summary: string
  modificationHints: string[]
}
