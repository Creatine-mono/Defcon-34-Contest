"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { ArrowLeft } from "lucide-react"
import type { VehicleConfig } from "@/lib/vehicle-types"

type Stage = "track" | "offroad" | "chaos"
type Telemetry = {
  speed: number
  damage: number
  lap: number
  checkpoint: number
  handling: string
  time: number
  bestTime: number | null
  lastFinish: number | null
}

const STORAGE_KEY = "hspace-knights-play-vehicle"
const BEST_TIME_PREFIX = "hspace-knights-best-time"
const ROAD_LENGTH = 110
const ROAD_HALF_WIDTH = 6.5
const COURSE_MIN_X = -50
const COURSE_MAX_X = 54
const OBSTACLES = [
  { x: -28, z: -2.8, w: 2.2, d: 1.8, color: "#ef4444" },
  { x: -18, z: 2.5, w: 2.4, d: 1.8, color: "#f97316" },
  { x: -7, z: 0, w: 2.8, d: 2.1, color: "#eab308" },
  { x: 5, z: -3.2, w: 2.4, d: 1.9, color: "#ef4444" },
  { x: 16, z: 2.6, w: 2.8, d: 2.0, color: "#f97316" },
  { x: 29, z: -0.8, w: 3.0, d: 2.2, color: "#eab308" },
  { x: 41, z: 3.2, w: 2.5, d: 1.8, color: "#ef4444" },
]

const fallbackVehicle: VehicleConfig = {
  vehicleCode: "VH-PLAY",
  name: "Default Test Mule",
  mode: "normal",
  prompt: "default playable vehicle",
  visual: {
    bodyType: "sports",
    primaryColor: "#ef4444",
    accentColor: "#facc15",
    wheelType: "racing",
    wheelSize: 0.55,
    wheelCount: 4,
    chassisHeight: 0.28,
    suspensionHeight: 0.12,
    spoiler: true,
    roofAttachment: null,
    frontAttachment: null,
    rearAttachment: null,
    exhaustStyle: "dual",
    lightStyle: "led",
    windowStyle: "tinted",
  },
  components: {
    engineType: "V8 Twin-Turbo",
    driveType: "RWD",
    chassisType: "Monocoque",
    brakeSystem: "Ventilated Disc",
    aeroKit: "Full Aero Package",
    tireCompound: "Soft Slick",
    coolingSystem: "Active Cooling",
  },
  performance: {
    torque: 65,
    horsepower: 70,
    weight: 48,
    drag: 35,
    grip: 65,
    brake: 58,
    fuelEfficiency: 45,
    durability: 55,
    stability: 62,
    downforce: 45,
    acceleration: 70,
    handling: 64,
  },
  traits: [],
  keywordEffects: [],
  security: { injectionDetected: false, severity: 0, reasons: [], clampApplied: false, transformedTraits: [], sandboxNotes: [] },
  stageScores: { drag: 0, track: 0, offroad: 0 },
  stageGrades: { drag: "F", track: "F", offroad: "F" },
  verdict: "Playable fallback",
  summary: "Fallback vehicle used when no generated car has been sent to the play page.",
  modificationHints: [],
}

export default function DrivePlayground() {
  const [vehicle, setVehicle] = useState<VehicleConfig>(fallbackVehicle)
  const [stage, setStage] = useState<Stage>("track")
  const [telemetry, setTelemetry] = useState<Telemetry>({
    speed: 0,
    damage: 0,
    lap: 0,
    checkpoint: 0,
    handling: "ready",
    time: 0,
    bestTime: null,
    lastFinish: null,
  })

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      setVehicle(JSON.parse(raw) as VehicleConfig)
    } catch {
      setVehicle(fallbackVehicle)
    }
  }, [])

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#8ed8ff] text-zinc-950">
      <Canvas camera={{ position: [-11, 7.2, 0], fov: 55 }} shadows>
        <color attach="background" args={["#8ed8ff"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[7, 12, 8]} intensity={2.2} castShadow />
        <pointLight position={[-7, 4, -6]} intensity={0.65} color={vehicle.visual.accentColor} />
        <PlayableScene vehicle={vehicle} stage={stage} onTelemetry={setTelemetry} />
        <Environment preset="city" />
      </Canvas>

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-5 top-5 max-w-sm rounded-md border border-black/10 bg-white/85 p-4 shadow-xl backdrop-blur">
          <button
            onClick={() => { window.location.href = "/" }}
            className="mb-3 flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm text-zinc-700 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-semibold">{vehicle.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">{vehicle.vehicleCode} / {vehicle.verdict}</p>
          <p className="mt-3 text-xs text-zinc-600">Third-person arcade racing. W/Up accelerates, S/Down brakes, A/D steers. Low grip drifts, weak brakes slide past corners.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["track", "offroad", "chaos"] as Stage[]).map(item => (
              <button
                key={item}
                onClick={() => setStage(item)}
                className={`rounded-md border px-2 py-1.5 text-xs capitalize ${
                  stage === item ? "border-emerald-600 bg-emerald-100 text-emerald-900" : "border-black/10 bg-white text-zinc-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <RaceHud telemetry={telemetry} />
        <StatsOverlay vehicle={vehicle} stage={stage} />
      </div>
    </main>
  )
}

function PlayableScene({ vehicle, stage, onTelemetry }: { vehicle: VehicleConfig; stage: Stage; onTelemetry: (telemetry: Telemetry) => void }) {
  const keys = useRef(new Set<string>())
  const carRef = useRef<any>(null)
  const physics = useRef({
    x: COURSE_MIN_X + 5,
    z: 0,
    yaw: 0,
    velocityYaw: 0,
    speed: 0,
    damage: 0,
    lap: 0,
    checkpoint: 0,
    lastGate: -1,
    frames: 0,
    runTime: 0,
    bestTime: null as number | null,
    lastFinish: null as number | null,
  })
  const tune = useMemo(() => drivingTune(vehicle), [vehicle])
  const profile = useMemo(() => stageProfile(vehicle, stage), [vehicle, stage])

  useEffect(() => {
    const key = bestTimeKey(vehicle, stage)
    const best = Number(localStorage.getItem(key))
    physics.current = {
      x: COURSE_MIN_X + 5,
      z: 0,
      yaw: 0,
      velocityYaw: 0,
      speed: 0,
      damage: 0,
      lap: 0,
      checkpoint: 0,
      lastGate: -1,
      frames: 0,
      runTime: 0,
      bestTime: Number.isFinite(best) && best > 0 ? best : null,
      lastFinish: null,
    }
    onTelemetry({
      speed: 0,
      damage: 0,
      lap: 0,
      checkpoint: 0,
      handling: "ready",
      time: 0,
      bestTime: Number.isFinite(best) && best > 0 ? best : null,
      lastFinish: null,
    })
  }, [vehicle, stage, onTelemetry])

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase())
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.033) * 60
    const state = physics.current
    const pressed = keys.current
    const throttle = pressed.has("w") || pressed.has("arrowup")
    const reverse = pressed.has("s") || pressed.has("arrowdown")
    const left = pressed.has("a") || pressed.has("arrowleft")
    const right = pressed.has("d") || pressed.has("arrowright")
    const offTrack = isOffTrack(state.x, state.z, stage)
    const surface = offTrack ? profile.offRoadSurface : 1
    const boostPad = Math.abs(state.x + 34) < 2.7 && Math.abs(state.z) < 2.5
    const mudPatch = stage === "offroad" && Math.abs(state.x - 10) < 7 && Math.abs(state.z + 2.2) < 2.4
    const chaosSlip = stage === "chaos" ? 0.86 : 1
    if (Math.abs(state.speed) > 0.01 || throttle) state.runTime += delta

    if (throttle) state.speed += tune.acceleration * profile.acceleration * surface * (boostPad ? 1.7 : 1) * dt
    if (reverse) state.speed -= tune.brake * profile.brake * dt
    if (mudPatch) state.speed *= Math.pow(0.89 + profile.mudResistance * 0.075, dt)
    state.speed *= Math.pow(offTrack ? 0.94 : 0.978, dt)
    const stageTopSpeed = tune.topSpeed * profile.topSpeed
    state.speed = clamp(state.speed, -stageTopSpeed * 0.42, stageTopSpeed)

    const speedRatio = Math.abs(state.speed) / Math.max(0.1, stageTopSpeed)
    const turnPower = tune.turnRate * profile.turning * surface * (0.55 + speedRatio * 0.55)
    if (left) state.yaw += turnPower * dt
    if (right) state.yaw -= turnPower * dt

    const alignment = clamp(tune.grip * profile.control * surface * chaosSlip * (0.45 + tune.stability * 0.9), 0.08, 0.48)
    state.velocityYaw += angleDelta(state.yaw, state.velocityYaw) * alignment * dt
    const drift = Math.abs(angleDelta(state.yaw, state.velocityYaw))
    if (drift > 0.55) state.speed *= Math.pow(0.972 + tune.stability * 0.018, dt)

    const moveX = Math.cos(state.velocityYaw)
    const moveZ = -Math.sin(state.velocityYaw)
    state.x += moveX * state.speed * dt
    state.z += moveZ * state.speed * dt

    const obstacle = hitObstacle(state.x, state.z)
    if (obstacle) {
      state.x -= moveX * Math.max(0.5, Math.abs(state.speed) * 5)
      state.z -= moveZ * Math.max(0.5, Math.abs(state.speed) * 5)
      state.speed *= -0.18 * tune.durability
      state.damage += (3.2 - tune.durability * 1.7) * profile.damageTaken
    }

    if (state.x > COURSE_MAX_X) {
      const finishTime = Math.max(0.01, state.runTime)
      state.lastFinish = finishTime
      if (state.bestTime === null || finishTime < state.bestTime) {
        state.bestTime = finishTime
        localStorage.setItem(bestTimeKey(vehicle, stage), String(finishTime))
      }
      state.lap += 1
      state.checkpoint = 0
      state.lastGate = -1
      state.x = COURSE_MIN_X + 4
      state.z = 0
      state.yaw = 0
      state.velocityYaw = 0
      state.speed *= 0.35
      state.runTime = 0
    }

    if (state.x < COURSE_MIN_X || Math.abs(state.z) > 18) {
      state.x = clamp(state.x, COURSE_MIN_X, COURSE_MAX_X)
      state.z = clamp(state.z, -18, 18)
      state.speed *= -0.2 * tune.durability
      state.damage += (2.2 - tune.durability * 1.4) * profile.damageTaken
    }
    if (offTrack && stage !== "offroad") state.damage += (1 - tune.durability) * 0.015 * profile.damageTaken * dt

    const gate = currentGate(state.x, state.z)
    if (gate !== state.lastGate && gate === (state.checkpoint + 1) % 4) {
      state.checkpoint = gate
      state.lastGate = gate
      if (gate === 0) state.lap += 1
    }

    if (carRef.current) {
      carRef.current.position.set(state.x, 0.4 + vehicle.visual.suspensionHeight * 0.25, state.z)
      carRef.current.rotation.y = state.yaw
      carRef.current.rotation.z = clamp(angleDelta(state.velocityYaw, state.yaw), -0.22, 0.22) * 0.18
    }

    state.frames += 1
    if (state.frames % 8 === 0) {
      onTelemetry({
        speed: Math.abs(state.speed) * 105,
        damage: Math.max(0, state.damage),
        lap: state.lap,
        checkpoint: state.checkpoint,
        handling: obstacle ? "hit" : drift > 0.8 ? "drifting" : offTrack ? "off road" : boostPad ? "boost" : "grip",
        time: state.runTime,
        bestTime: state.bestTime,
        lastFinish: state.lastFinish,
      })
    }

    const viewX = Math.cos(state.yaw)
    const viewZ = -Math.sin(state.yaw)
    const speedRatioForCamera = Math.abs(state.speed) / Math.max(0.1, tune.topSpeed)
    const chaseDistance = 9.5 + speedRatioForCamera * 3.2
    const chaseHeight = 5.8 + speedRatioForCamera * 1.2
    camera.position.x += (state.x - viewX * chaseDistance - camera.position.x) * 0.14
    camera.position.y += (chaseHeight - camera.position.y) * 0.12
    camera.position.z += (state.z - viewZ * chaseDistance - camera.position.z) * 0.14
    camera.lookAt(state.x + viewX * 7.5, 1.25, state.z + viewZ * 7.5)
    if ("fov" in camera) {
      camera.fov += (55 + speedRatioForCamera * 8 - camera.fov) * 0.08
      camera.updateProjectionMatrix()
    }
  })

  return (
    <>
      <Track stage={stage} />
      <VehicleRig refObj={carRef} vehicle={vehicle} />
    </>
  )
}

function VehicleRig({ refObj, vehicle }: { refObj: any; vehicle: VehicleConfig }) {
  const visual = vehicle.visual
  const body = bodySize(visual.bodyType)
  const wheelRadius = clamp(visual.wheelSize, 0.25, 2.6)
  const wheelWidth = 0.22 + wheelRadius * 0.22
  const wheelCount = Math.max(1, Math.round(visual.wheelCount))
  const axleCount = Math.max(1, Math.ceil(wheelCount / 2))
  const axleXs = Array.from({ length: axleCount }, (_, index) => {
    if (axleCount === 1) return 0
    return -body.length * 0.38 + (body.length * 0.76 * index) / (axleCount - 1)
  })

  return (
    <group ref={refObj}>
      <mesh castShadow position={[0, wheelRadius + visual.suspensionHeight, 0]}>
        <boxGeometry args={[body.length, body.height, body.width]} />
        <meshStandardMaterial color={visual.primaryColor} metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[body.length * 0.08, wheelRadius + visual.suspensionHeight + body.height * 0.58, 0]}>
        <boxGeometry args={[body.length * 0.42, body.height * 0.62, body.width * 0.82]} />
        <meshStandardMaterial color={darken(visual.primaryColor)} metalness={0.2} roughness={0.5} />
      </mesh>
      {visual.spoiler && (
        <group position={[-body.length * 0.52, wheelRadius + visual.suspensionHeight + body.height * 0.82, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.12, 0.08, body.width * 1.08]} />
            <meshStandardMaterial color={visual.accentColor} emissive={visual.accentColor} emissiveIntensity={0.12} />
          </mesh>
        </group>
      )}
      {axleXs.map((x, index) => (
        <group key={index}>
          <Wheel x={x} z={body.width * 0.58} radius={wheelRadius} width={wheelWidth} color={visual.accentColor} />
          {index * 2 + 1 < wheelCount && <Wheel x={x} z={-body.width * 0.58} radius={wheelRadius} width={wheelWidth} color={visual.accentColor} />}
        </group>
      ))}
    </group>
  )
}

function Wheel({ x, z, radius, width, color }: { x: number; z: number; radius: number; width: number; color: string }) {
  return (
    <group position={[x, radius, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 24]} />
        <meshStandardMaterial color="#050505" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0, width / 2 + 0.01]}>
        <circleGeometry args={[radius * 0.42, 12]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Track({ stage }: { stage: Stage }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[124, 44]} />
        <meshStandardMaterial color={stage === "offroad" ? "#76b852" : "#65c95f"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.01, 0]}>
        <planeGeometry args={[ROAD_LENGTH, ROAD_HALF_WIDTH * 2]} />
        <meshStandardMaterial color={stage === "chaos" ? "#d946ef" : "#4b5563"} />
      </mesh>
      {[-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.035, z]}>
          <planeGeometry args={[ROAD_LENGTH, 0.32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {Array.from({ length: 18 }).map((_, index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[COURSE_MIN_X + 8 + index * 6, 0.04, 0]}>
          <planeGeometry args={[3, 0.18]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-34, 0.05, 0]}>
        <boxGeometry args={[5.4, 4.6, 0.04]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE_MIN_X + 2, 0.06, 0]}>
        <boxGeometry args={[0.35, 12.5, 0.04]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURSE_MAX_X - 1, 0.06, 0]}>
        <boxGeometry args={[0.35, 12.5, 0.04]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      {OBSTACLES.map((obstacle) => (
        <Obstacle key={`${obstacle.x}-${obstacle.z}`} obstacle={obstacle} />
      ))}
      <Grandstand position={[0, 0, -16]} />
      <Grandstand position={[0, 0, 16]} rotation={Math.PI} />
      <Arch position={[COURSE_MIN_X + 2, 0, 0]} />
      <Arch position={[COURSE_MAX_X - 1, 0, 0]} />
      {stage === "chaos" && (
        <>
          <Ramp position={[-4, 0.18, -4.5]} />
          <Ramp position={[24, 0.18, 4.3]} />
        </>
      )}
      {stage === "offroad" && Array.from({ length: 38 }).map((_, index) => (
        <mesh key={index} position={[COURSE_MIN_X + 4 + index * 2.8, 0.16, (index % 2 === 0 ? -1 : 1) * (8 + (index % 5))]} castShadow>
          <boxGeometry args={[1.05, 0.36, 1.05]} />
          <meshStandardMaterial color="#577c35" />
        </mesh>
      ))}
      {stage === "offroad" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.04, -2.2]}>
          <circleGeometry args={[5.2, 32]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
      )}
    </group>
  )
}

function Obstacle({ obstacle }: { obstacle: (typeof OBSTACLES)[number] }) {
  return (
    <group position={[obstacle.x, 0.48, obstacle.z]}>
      <mesh castShadow>
        <boxGeometry args={[obstacle.w, 0.95, obstacle.d]} />
        <meshStandardMaterial color={obstacle.color} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[obstacle.w * 0.72, 0.2, obstacle.d * 0.72]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
    </group>
  )
}

function Grandstand({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {Array.from({ length: 5 }).map((_, index) => (
        <mesh key={index} position={[0, 0.35 + index * 0.42, index * 0.75]} castShadow>
          <boxGeometry args={[28, 0.34, 0.62]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#e5e7eb" : "#38bdf8"} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, 2.2]} castShadow>
        <boxGeometry args={[30, 0.3, 4.2]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  )
}

function Arch({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 9]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 1.55, -4.25]} castShadow>
        <boxGeometry args={[0.55, 3.2, 0.55]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 1.55, 4.25]} castShadow>
        <boxGeometry args={[0.55, 3.2, 0.55]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}

function Ramp({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0.42, 0.4, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.4, 0.35, 2.2]} />
      <meshStandardMaterial color="#facc15" roughness={0.5} />
    </mesh>
  )
}

function StatsOverlay({ vehicle, stage }: { vehicle: VehicleConfig; stage: Stage }) {
  const tune = drivingTune(vehicle)
  const profile = stageProfile(vehicle, stage)
  const rows = [
    ["top speed", tune.topSpeed * 100],
    ["accel", vehicle.performance.acceleration],
    ["grip", vehicle.performance.grip],
    ["brake", vehicle.performance.brake],
    ["stability", vehicle.performance.stability],
    ["durability", vehicle.performance.durability],
  ] as const

  return (
    <div className="pointer-events-auto absolute bottom-5 right-5 w-72 rounded-md border border-black/10 bg-white/85 p-4 shadow-xl backdrop-blur">
      <p className="mb-3 text-xs uppercase tracking-normal text-zinc-500">Generated handling</p>
      {rows.map(([label, value]) => (
        <div key={label} className="mb-2">
          <div className="mb-1 flex justify-between text-[11px] text-zinc-600">
            <span>{label}</span>
            <span>{Math.round(value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-zinc-200">
            <div className="h-full bg-emerald-500" style={{ width: `${clamp(value, 0, 100)}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-3 space-y-1 text-[11px] text-zinc-500">
        <p className="font-semibold text-zinc-700">stage fit: {Math.round(profile.fit * 100)}%</p>
        <p>horsepower: longer straights</p>
        <p>acceleration: faster launch after corners</p>
        <p>grip: less drift while steering</p>
        <p>brake: shorter stop distance</p>
      </div>
    </div>
  )
}

function RaceHud({ telemetry }: { telemetry: Telemetry }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 flex -translate-x-1/2 flex-wrap justify-center gap-3 rounded-md border border-black/10 bg-white/85 px-5 py-3 text-sm font-semibold shadow-xl backdrop-blur">
      <span>Lap {telemetry.lap}</span>
      <span>Gate {telemetry.checkpoint + 1}/4</span>
      <span>Time {formatTime(telemetry.time)}</span>
      <span>Best {telemetry.bestTime === null ? "--" : formatTime(telemetry.bestTime)}</span>
      {telemetry.lastFinish !== null && <span className="text-blue-700">Finish {formatTime(telemetry.lastFinish)}</span>}
      <span>{Math.round(telemetry.speed)} km/h</span>
      <span className={telemetry.handling === "drifting" ? "text-orange-600" : telemetry.handling === "boost" ? "text-emerald-600" : "text-zinc-600"}>
        {telemetry.handling}
      </span>
      <span className="text-red-600">damage {Math.round(telemetry.damage)}</span>
    </div>
  )
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const whole = Math.floor(safe)
  const ms = Math.floor((safe - whole) * 100)
  return `${whole}.${ms.toString().padStart(2, "0")}s`
}

function drivingTune(vehicle: VehicleConfig) {
  const p = vehicle.performance
  const weightPenalty = Math.max(0, p.weight - 35) * 0.0028
  const topSpeed = 0.14 + clamp(p.horsepower * 0.009 + p.torque * 0.0025 - p.drag * 0.0025 - weightPenalty, 0.08, 1.75)
  const acceleration = 0.005 + clamp(p.acceleration + p.torque * 0.3 - Math.max(0, p.weight) * 0.12, 0, 180) / 6800
  const brake = 0.018 + clamp(p.brake, 0, 160) / 3000
  const grip = 0.075 + clamp(p.grip + p.handling * 0.9 + p.downforce * 0.25, 0, 260) / 2500
  const turnRate = 0.026 + clamp(p.handling + p.grip * 0.55, 0, 180) / 4300
  const stability = clamp(0.35 + p.stability / 110, 0.35, 1.45)
  const durability = clamp(p.durability / 100, 0.08, 1.2)
  return { topSpeed, acceleration, brake, grip, turnRate, stability, durability }
}

function stageProfile(vehicle: VehicleConfig, stage: Stage) {
  const p = vehicle.performance
  const v = vehicle.visual
  const body = v.bodyType
  const wheel = v.wheelType

  if (stage === "track") {
    const aero = (v.spoiler ? 12 : 0) + p.downforce * 0.22
    const tire = wheel === "racing" || wheel === "thin" ? 18 : wheel === "offroad" || wheel === "monster" ? -12 : 0
    const bodyBonus = body === "sports" ? 18 : body === "sedan" ? 8 : body === "monster" || body === "truck" ? -10 : 0
    const fit = clamp((p.handling * 0.32 + p.grip * 0.28 + p.brake * 0.16 + aero + tire + bodyBonus) / 100, 0.35, 1.25)
    return {
      fit,
      topSpeed: clamp(0.82 + fit * 0.28 + (100 - p.drag) / 900, 0.72, 1.22),
      acceleration: clamp(0.88 + fit * 0.2, 0.75, 1.15),
      turning: clamp(0.78 + fit * 0.38, 0.72, 1.24),
      control: clamp(0.82 + fit * 0.42, 0.78, 1.28),
      brake: clamp(0.9 + p.brake / 500, 0.9, 1.18),
      offRoadSurface: 0.45,
      mudResistance: 0.35,
      damageTaken: body === "sports" ? 1.1 : 1,
    }
  }

  if (stage === "offroad") {
    const tire = wheel === "offroad" || wheel === "monster" ? 28 : wheel === "racing" || wheel === "thin" ? -24 : 0
    const bodyBonus = body === "suv" || body === "truck" || body === "monster" ? 22 : body === "sports" ? -18 : 0
    const clearance = v.suspensionHeight * 35 + v.wheelSize * 10
    const fit = clamp((p.durability * 0.28 + p.grip * 0.22 + p.stability * 0.16 + tire + bodyBonus + clearance) / 115, 0.3, 1.3)
    return {
      fit,
      topSpeed: clamp(0.58 + fit * 0.42, 0.55, 1.12),
      acceleration: clamp(0.72 + fit * 0.28, 0.62, 1.08),
      turning: clamp(0.68 + fit * 0.42, 0.62, 1.18),
      control: clamp(0.7 + fit * 0.48, 0.65, 1.25),
      brake: clamp(0.82 + fit * 0.2, 0.78, 1.08),
      offRoadSurface: clamp(0.45 + fit * 0.45, 0.45, 0.98),
      mudResistance: clamp(0.35 + fit * 0.55, 0.35, 0.98),
      damageTaken: clamp(1.25 - fit * 0.45, 0.65, 1.25),
    }
  }

  const weird = (v.wheelCount > 6 ? 18 : 0) + (v.wheelSize > 1.1 ? 12 : 0) + (vehicle.mode === "chaos" ? 18 : 0)
  const bodyBonus = body === "monster" ? 20 : body === "truck" || body === "suv" ? 10 : body === "sports" ? -5 : 0
  const fit = clamp((p.durability * 0.28 + p.stability * 0.26 + p.torque * 0.14 + weird + bodyBonus) / 115, 0.3, 1.35)
  return {
    fit,
    topSpeed: clamp(0.72 + fit * 0.34, 0.65, 1.18),
    acceleration: clamp(0.82 + fit * 0.22, 0.72, 1.12),
    turning: clamp(0.7 + fit * 0.32, 0.62, 1.12),
    control: clamp(0.62 + fit * 0.52, 0.58, 1.22),
    brake: clamp(0.78 + fit * 0.22, 0.72, 1.05),
    offRoadSurface: clamp(0.55 + fit * 0.25, 0.5, 0.9),
    mudResistance: clamp(0.45 + fit * 0.35, 0.42, 0.92),
    damageTaken: clamp(1.35 - fit * 0.52, 0.58, 1.3),
  }
}

function bestTimeKey(vehicle: VehicleConfig, stage: Stage) {
  return `${BEST_TIME_PREFIX}:${stage}:${vehicle.vehicleCode}:${vehicle.name}`
}

function bodySize(bodyType: VehicleConfig["visual"]["bodyType"]) {
  if (bodyType === "sports") return { length: 4.4, height: 0.55, width: 1.7 }
  if (bodyType === "suv") return { length: 4.0, height: 1.0, width: 1.9 }
  if (bodyType === "truck") return { length: 4.8, height: 0.95, width: 1.95 }
  if (bodyType === "monster") return { length: 3.8, height: 1.25, width: 2.25 }
  return { length: 3.7, height: 0.72, width: 1.7 }
}

function isOffTrack(x: number, z: number, stage: Stage) {
  if (stage === "offroad") return false
  return x < COURSE_MIN_X || x > COURSE_MAX_X || Math.abs(z) > ROAD_HALF_WIDTH
}

function currentGate(x: number, z: number) {
  if (x > -30 && Math.abs(z) < 9) return 0
  if (x > -5 && Math.abs(z) < 9) return 1
  if (x > 20 && Math.abs(z) < 9) return 2
  if (x > 45 && Math.abs(z) < 9) return 3
  return -1
}

function hitObstacle(x: number, z: number) {
  return OBSTACLES.find((obstacle) => {
    const halfW = obstacle.w * 0.5 + 0.75
    const halfD = obstacle.d * 0.5 + 0.75
    return Math.abs(x - obstacle.x) < halfW && Math.abs(z - obstacle.z) < halfD
  })
}

function angleDelta(target: number, current: number) {
  let delta = target - current
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

function darken(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#111111"
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * 0.28)
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * 0.28)
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * 0.28)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
