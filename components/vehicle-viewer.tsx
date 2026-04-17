"use client"

import { Fragment, Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import * as THREE from "three"
import SceneSetup from "./scene-setup"
import type { VehicleConfig } from "@/lib/vehicle-types"

// ─── Per-body-type dimension presets ─────────────────────────────────────────
//  Each tuple: [length, height, width]

const BODY: Record<string, [number, number, number]> = {
  sedan:   [3.6,  0.68, 1.62],
  suv:     [3.8,  1.05, 1.85],
  sports:  [4.2,  0.50, 1.70],
  truck:   [2.10, 0.95, 1.85],  // cab only; bed added separately
  monster: [3.2,  1.20, 2.15],
}
const CABIN: Record<string, [number, number, number]> = {
  sedan:   [1.95, 0.60, 1.48],
  suv:     [2.55, 0.80, 1.68],
  sports:  [1.45, 0.38, 1.52],
  truck:   [1.55, 0.78, 1.72],
  monster: [1.90, 0.80, 1.96],
}
// X offset of cabin from body centre (positive = towards rear)
const CABIN_X: Record<string, number> = {
  sedan:   -0.10,
  suv:     -0.15,
  sports:   0.55,   // cabin sits far back = long nose
  truck:    0.22,
  monster: -0.05,
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexToThree(hex: string) {
  try { return new THREE.Color(hex) } catch { return new THREE.Color("#222") }
}

function darkenHex(hex: string, factor = 0.35): string {
  try {
    const c = new THREE.Color(hex)
    c.multiplyScalar(factor)
    return `#${c.getHexString()}`
  } catch { return "#111" }
}

// ─── Animated mesh that fades in ─────────────────────────────────────────────

function FadeMesh({
  children,
  position,
  rotation,
  castShadow,
  receiveShadow,
}: React.PropsWithChildren<{
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}>) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      {children}
    </mesh>
  )
}

// ─── Ground pulse ring (shows when fully built) ───────────────────────────────

function PulseRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = Math.sin(Date.now() * 0.002) * 0.08 + 0.06
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <ringGeometry args={[3.2, 3.8, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.06}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Main vehicle mesh ────────────────────────────────────────────────────────

function VehicleMesh({ config, stage }: { config: VehicleConfig; stage: number }) {
  const v     = config.visual
  const perf  = config.performance

  // Stage gates
  const showBody    = stage >= 1
  const showWheels  = stage >= 2
  const showSuspAxle= stage >= 3
  const applyColor  = stage >= 4
  const lightsOn    = stage >= 5
  const fullDetail  = stage >= 6

  // Dimensions
  const [bL, bH, bW] = BODY[v.bodyType]  ?? BODY.sedan
  const [cL, cH, cW] = CABIN[v.bodyType] ?? CABIN.sedan
  const cabX          = CABIN_X[v.bodyType] ?? -0.1

  const wr  = v.wheelSize                       // radius 0.3 – 10.0
  const wW  = Math.max(0.18, 0.18 + wr * 0.16) // width scales with radius
  const sh  = Math.max(0, v.suspensionHeight)
  const bHH = bH / 2
  const cabY= bHH + cH / 2 - 0.07

  // Wheel Y = bottom of body − suspension gap − wheel radius
  const wheelY    = -(bHH + sh + wr)
  const wheelZOff = bW / 2 + wW / 2 + 0.05

  // Axle positions based on wheelCount
  const axleCount = Math.max(2, Math.ceil(v.wheelCount / 2))
  const axleXs: number[] = (() => {
    if (axleCount === 2) return [-bL * 0.30, bL * 0.30]
    if (axleCount === 3) return [-bL * 0.32, 0, bL * 0.32]
    if (axleCount === 4) return [-bL * 0.36, -bL * 0.08, bL * 0.08, bL * 0.36]
    const step = (bL * 0.70) / (axleCount - 1)
    return Array.from({ length: axleCount }, (_, i) => -bL * 0.35 + i * step)
  })()

  // Colors
  const primary  = applyColor ? v.primaryColor   : "#1c1c2e"
  const cabin_c  = applyColor ? darkenHex(v.primaryColor, 0.45) : "#111120"
  const accent   = applyColor ? v.accentColor    : "#252535"
  const wheel_c  = applyColor ? "#0c0c0c"        : "#1a1a2a"
  const metal    = applyColor ? "#3a3a50"        : "#28283a"

  const headEmit = lightsOn ? (v.lightStyle === "neon" ? "#00e5ff" : v.lightStyle === "xenon" ? "#d0e8ff" : "#ffffcc") : "#000"
  const tailEmit = lightsOn ? "#dd1100" : "#000"
  const headCol  = v.lightStyle === "neon" ? "#00e5ff" : "#ffffff"
  const neonStrip = v.lightStyle === "neon" && lightsOn

  // Chaos glow on body
  const isChaos = config.mode === "chaos"
  const bodyEmit = isChaos && applyColor ? v.primaryColor : "#000"
  const bodyEmitI= isChaos && applyColor ? 0.08 : 0

  return (
    <group>

      {/* ══════════ BODY ══════════ */}
      {showBody && (
        <>
          {/* Main body slab */}
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <boxGeometry args={[bL, bH, bW]} />
            <meshStandardMaterial
              color={primary}
              wireframe={stage === 1}
              transparent={stage === 1}
              opacity={stage === 1 ? 0.45 : 1}
              roughness={0.30}
              metalness={0.45}
              emissive={bodyEmit}
              emissiveIntensity={bodyEmitI}
            />
          </mesh>

          {/* Cabin */}
          <mesh castShadow position={[cabX, cabY, 0]}>
            <boxGeometry args={[cL, cH, cW]} />
            <meshStandardMaterial
              color={cabin_c}
              wireframe={stage === 1}
              transparent={stage === 1}
              opacity={stage === 1 ? 0.35 : 1}
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>

          {/* ── Sports-car: long hood nose wedge ── */}
          {v.bodyType === "sports" && (
            <mesh position={[bL * 0.38, -bH * 0.18, 0]} castShadow>
              <boxGeometry args={[bL * 0.25, bH * 0.32, bW * 0.90]} />
              <meshStandardMaterial color={primary} roughness={0.3} metalness={0.5} />
            </mesh>
          )}

          {/* ── Sports-car: chin splitter ── */}
          {v.bodyType === "sports" && fullDetail && (
            <mesh position={[bL / 2 + 0.06, -(bHH - 0.04), 0]}>
              <boxGeometry args={[0.25, 0.06, bW * 0.80]} />
              <meshStandardMaterial color={accent} metalness={0.7} roughness={0.2} />
            </mesh>
          )}

          {/* ── Sports-car: hood scoop if high HP ── */}
          {v.bodyType === "sports" && perf.horsepower > 70 && fullDetail && (
            <mesh position={[bL * 0.18, bHH + 0.05, 0]} castShadow>
              <boxGeometry args={[0.55, 0.10, 0.28]} />
              <meshStandardMaterial color={accent} metalness={0.6} roughness={0.2} />
            </mesh>
          )}

          {/* ── Monster: fender flares over wheels ── */}
          {v.bodyType === "monster" && fullDetail && axleXs.map((ax, i) => (
            <Fragment key={`fl-${i}`}>
              <mesh position={[ax, wheelY + wr * 0.5, bW / 2 + wW * 0.3]}>
                <boxGeometry args={[wr * 1.2, wr * 1.1, wW * 0.9]} />
                <meshStandardMaterial color={primary} roughness={0.4} metalness={0.3}
                  emissive={bodyEmit} emissiveIntensity={bodyEmitI} />
              </mesh>
              <mesh position={[ax, wheelY + wr * 0.5, -(bW / 2 + wW * 0.3)]}>
                <boxGeometry args={[wr * 1.2, wr * 1.1, wW * 0.9]} />
                <meshStandardMaterial color={primary} roughness={0.4} metalness={0.3}
                  emissive={bodyEmit} emissiveIntensity={bodyEmitI} />
              </mesh>
            </Fragment>
          ))}

          {/* ── Truck: flat bed behind cab ── */}
          {v.bodyType === "truck" && (
            <>
              {/* Bed floor */}
              <mesh position={[-bL * 0.72, -bH * 0.22, 0]} castShadow>
                <boxGeometry args={[bL * 1.05, bH * 0.14, bW]} />
                <meshStandardMaterial color={primary} roughness={0.5} metalness={0.3} />
              </mesh>
              {/* Bed side walls */}
              {([bW / 2 + 0.04, -(bW / 2 + 0.04)] as number[]).map((z, i) => (
                <mesh key={`bw-${i}`} position={[-bL * 0.72, bH * 0.08, z]}>
                  <boxGeometry args={[bL * 1.05, bH * 0.45, 0.09]} />
                  <meshStandardMaterial color={primary} roughness={0.4} metalness={0.3} />
                </mesh>
              ))}
              {/* Tailgate */}
              <mesh position={[-bL * 1.27, bH * 0.08, 0]}>
                <boxGeometry args={[0.08, bH * 0.45, bW]} />
                <meshStandardMaterial color={accent} roughness={0.4} metalness={0.5} />
              </mesh>
            </>
          )}

          {/* ── SUV: roof rails ── */}
          {v.bodyType === "suv" && fullDetail && (
            <>
              {([bW * 0.38, -bW * 0.38] as number[]).map((z, i) => (
                <mesh key={`rr-${i}`} position={[cabX, cabY + cH / 2 + 0.04, z]}>
                  <boxGeometry args={[cL * 0.92, 0.05, 0.05]} />
                  <meshStandardMaterial color={metal} metalness={0.8} roughness={0.2} />
                </mesh>
              ))}
            </>
          )}

          {/* ── Sedan: small trunk bump ── */}
          {v.bodyType === "sedan" && fullDetail && (
            <mesh position={[-bL * 0.34, bHH - 0.01, 0]}>
              <boxGeometry args={[bL * 0.30, bH * 0.18, bW * 0.82]} />
              <meshStandardMaterial color={primary} roughness={0.3} metalness={0.4} />
            </mesh>
          )}

          {/* ── Underside skirt / side sill ── */}
          {fullDetail && (
            <>
              <mesh position={[0, -(bHH - 0.05), bW / 2 + 0.02]}>
                <boxGeometry args={[bL * 0.82, 0.08, 0.06]} />
                <meshStandardMaterial color={accent} metalness={0.6} roughness={0.2}
                  emissive={neonStrip ? v.accentColor : "#000"} emissiveIntensity={neonStrip ? 0.6 : 0} />
              </mesh>
              <mesh position={[0, -(bHH - 0.05), -(bW / 2 + 0.02)]}>
                <boxGeometry args={[bL * 0.82, 0.08, 0.06]} />
                <meshStandardMaterial color={accent} metalness={0.6} roughness={0.2}
                  emissive={neonStrip ? v.accentColor : "#000"} emissiveIntensity={neonStrip ? 0.6 : 0} />
              </mesh>
            </>
          )}
        </>
      )}

      {/* ══════════ WHEELS ══════════ */}
      {showWheels && axleXs.map((ax, i) => (
        <Fragment key={`axle-${i}`}>
          {/* Left tyre */}
          <mesh position={[ax, wheelY, wheelZOff]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[wr, wr, wW, 20]} />
            <meshStandardMaterial
              color={wheel_c}
              wireframe={stage === 2}
              transparent={stage === 2}
              opacity={stage === 2 ? 0.55 : 1}
              roughness={v.wheelType === "racing" ? 0.55 : 0.85}
            />
          </mesh>

          {/* Left hub */}
          {applyColor && (
            <mesh position={[ax, wheelY, wheelZOff + wW / 2 + 0.012]}>
              <circleGeometry args={[wr * 0.40, 8]} />
              <meshStandardMaterial color={accent} metalness={0.7} roughness={0.15} />
            </mesh>
          )}

          {/* Right tyre */}
          <mesh position={[ax, wheelY, -wheelZOff]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[wr, wr, wW, 20]} />
            <meshStandardMaterial
              color={wheel_c}
              wireframe={stage === 2}
              transparent={stage === 2}
              opacity={stage === 2 ? 0.55 : 1}
              roughness={v.wheelType === "racing" ? 0.55 : 0.85}
            />
          </mesh>

          {/* Right hub */}
          {applyColor && (
            <mesh position={[ax, wheelY, -(wheelZOff + wW / 2 + 0.012)]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[wr * 0.40, 8]} />
              <meshStandardMaterial color={accent} metalness={0.7} roughness={0.15} />
            </mesh>
          )}

          {/* Axle bar */}
          {showSuspAxle && (
            <mesh position={[ax, wheelY, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, wheelZOff * 2, 8]} />
              <meshStandardMaterial color={metal} metalness={0.7} roughness={0.25} />
            </mesh>
          )}

          {/* Suspension struts */}
          {showSuspAxle && sh > 0.05 && (
            <>
              <mesh position={[ax + wr * 0.18, -(bHH), wheelZOff * 0.65]}
                    rotation={[0.18, 0, -0.12]}>
                <cylinderGeometry args={[0.03, 0.03, sh + wr * 0.8, 6]} />
                <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[ax + wr * 0.18, -(bHH), -wheelZOff * 0.65]}
                    rotation={[-0.18, 0, -0.12]}>
                <cylinderGeometry args={[0.03, 0.03, sh + wr * 0.8, 6]} />
                <meshStandardMaterial color={metal} metalness={0.6} roughness={0.3} />
              </mesh>
            </>
          )}
        </Fragment>
      ))}

      {/* ══════════ SPOILER ══════════ */}
      {showSuspAxle && v.spoiler && (
        <group position={[-bL / 2 + 0.18, bHH + 0.24, 0]}>
          {/* Blade */}
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.09, 0.07, bW * 0.88]} />
            <meshStandardMaterial
              color={applyColor ? accent : "#1e1e2e"}
              emissive={lightsOn ? v.accentColor : "#000"}
              emissiveIntensity={lightsOn ? 0.12 : 0}
              metalness={0.5} roughness={0.25}
            />
          </mesh>
          {/* Uprights */}
          {([-bW * 0.33, bW * 0.33] as number[]).map((z, i) => (
            <mesh key={`spu-${i}`} position={[0, 0.11, z]}>
              <boxGeometry args={[0.05, 0.38, 0.06]} />
              <meshStandardMaterial color={metal} metalness={0.55} />
            </mesh>
          ))}
        </group>
      )}

      {/* ══════════ EXHAUST ══════════ */}
      {showSuspAxle && v.exhaustStyle !== "none" && (() => {
        const zPositions =
          v.exhaustStyle === "quad" ? [-0.30, -0.10,  0.10, 0.30] :
          v.exhaustStyle === "dual" ? [-0.24, 0.24]                :
          [0]
        return zPositions.map((z, i) => (
          <mesh key={`ex-${i}`} position={[-bL / 2 - 0.07, wheelY + wr * 0.55, z]}>
            <cylinderGeometry args={[0.055, 0.075, 0.22, 8]} />
            <meshStandardMaterial color="#444" metalness={0.88} roughness={0.18} />
          </mesh>
        ))
      })()}

      {/* ══════════ LIGHTS ══════════ */}
      {lightsOn && (
        <Fragment>
          {/* Front headlights */}
          {([bW * 0.28, -bW * 0.28] as number[]).map((z, i) => (
            <mesh key={`hl-${i}`} position={[bL / 2 - 0.04, bH * 0.08, z]}>
              <boxGeometry args={[0.07, v.lightStyle === "led" ? 0.08 : 0.12, 0.38]} />
              <meshStandardMaterial
                color={headCol}
                emissive={headEmit}
                emissiveIntensity={v.lightStyle === "xenon" ? 1.4 : v.lightStyle === "neon" ? 1.8 : 0.9}
              />
            </mesh>
          ))}

          {/* Rear taillights */}
          {([bW * 0.29, -bW * 0.29] as number[]).map((z, i) => (
            <mesh key={`tl-${i}`} position={[-bL / 2 + 0.04, bH * 0.08, z]}>
              <boxGeometry args={[0.07, 0.09, v.lightStyle === "led" ? 0.42 : 0.30]} />
              <meshStandardMaterial color="#cc1100" emissive={tailEmit} emissiveIntensity={0.75} />
            </mesh>
          ))}

          {/* Neon underbody glow line */}
          {v.lightStyle === "neon" && (
            <mesh position={[0, wheelY + wr * 0.22, 0]}>
              <boxGeometry args={[bL * 0.85, 0.03, bW + 0.04]} />
              <meshStandardMaterial
                color={v.accentColor}
                emissive={v.accentColor}
                emissiveIntensity={0.8}
                transparent
                opacity={0.6}
              />
            </mesh>
          )}
        </Fragment>
      )}

      {/* ══════════ ROOF / FRONT ATTACHMENTS ══════════ */}
      {fullDetail && v.roofAttachment === "rack" && (
        <group position={[cabX, cabY + cH / 2 + 0.06, 0]}>
          {([-0.55, 0, 0.55] as number[]).map((x, i) => (
            <mesh key={`rk-${i}`} position={[x, 0.04, 0]}>
              <boxGeometry args={[0.06, 0.08, cW * 0.85]} />
              <meshStandardMaterial color={metal} metalness={0.7} roughness={0.25} />
            </mesh>
          ))}
          {([-cW * 0.36, cW * 0.36] as number[]).map((z, i) => (
            <mesh key={`rkl-${i}`} position={[0, 0.04, z]}>
              <boxGeometry args={[cL * 0.88, 0.05, 0.05]} />
              <meshStandardMaterial color={metal} metalness={0.7} roughness={0.25} />
            </mesh>
          ))}
        </group>
      )}

      {fullDetail && v.frontAttachment === "ram" && (
        <mesh position={[bL / 2 + 0.14, -bHH * 0.35, 0]}>
          <boxGeometry args={[0.28, bH * 0.55, bW * 0.65]} />
          <meshStandardMaterial color={metal} metalness={0.8} roughness={0.2} />
        </mesh>
      )}

      {fullDetail && v.rearAttachment === "tow" && (
        <mesh position={[-bL / 2 - 0.18, -(bHH * 0.65), 0]}>
          <boxGeometry args={[0.35, 0.08, 0.08]} />
          <meshStandardMaterial color={metal} metalness={0.85} roughness={0.15} />
        </mesh>
      )}

      {/* ══════════ GROUND PLANE ══════════ */}
      {stage >= 4 && (
        <mesh position={[0, wheelY - wr - 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[bL + 2.5, bW + 3.5]} />
          <meshStandardMaterial color="#000" transparent opacity={0.4} />
        </mesh>
      )}

      {/* ══════════ PULSE RING (chaos) ══════════ */}
      {fullDetail && isChaos && applyColor && <PulseRing color={v.primaryColor} />}

    </group>
  )
}

// ─── Idle ghost placeholder ────────────────────────────────────────────────────

function IdlePlaceholder() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.6, 0.68, 1.62]} />
        <meshStandardMaterial color="#1a1a2e" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh position={[-0.1, 0.62, 0]}>
        <boxGeometry args={[1.95, 0.60, 1.48]} />
        <meshStandardMaterial color="#1a1a2e" wireframe transparent opacity={0.12} />
      </mesh>
      {([-1.05, 1.05] as number[]).map((x) =>
        ([-0.88, 0.88] as number[]).map((z, j) => (
          <mesh key={`idle-${x}-${j}`} position={[x, -0.88, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.22, 12]} />
            <meshStandardMaterial color="#16162a" wireframe transparent opacity={0.14} />
          </mesh>
        ))
      )}
    </group>
  )
}

// ─── Building placeholder (during API call) ────────────────────────────────────

function BuildingPlaceholder() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.6, 0.68, 1.62]} />
        <meshStandardMaterial color="#22224a" wireframe transparent opacity={0.28} />
      </mesh>
      <mesh position={[-0.1, 0.62, 0]}>
        <boxGeometry args={[1.95, 0.60, 1.48]} />
        <meshStandardMaterial color="#22224a" wireframe transparent opacity={0.20} />
      </mesh>
      {([-1.05, 1.05] as number[]).map((x) =>
        ([-0.88, 0.88] as number[]).map((z, j) => (
          <mesh key={`bld-${x}-${j}`} position={[x, -0.88, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.22, 12]} />
            <meshStandardMaterial color="#282850" wireframe transparent opacity={0.22} />
          </mesh>
        ))
      )}
    </group>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface VehicleViewerProps {
  vehicleConfig: VehicleConfig | null
  isBuilding: boolean
}

export default function VehicleViewer({ vehicleConfig, isBuilding }: VehicleViewerProps) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (!vehicleConfig) { setStage(0); return }
    setStage(0)
    const ts = [
      setTimeout(() => setStage(1), 200),
      setTimeout(() => setStage(2), 580),
      setTimeout(() => setStage(3), 980),
      setTimeout(() => setStage(4), 1340),
      setTimeout(() => setStage(5), 1700),
      setTimeout(() => setStage(6), 2050),
    ]
    return () => ts.forEach(clearTimeout)
  }, [vehicleConfig])

  return (
    <div className="w-full h-[100dvh]" style={{ background: "#06060e" }}>
      <Canvas camera={{ position: [5.5, 2.8, 7.5], fov: 42 }} shadows>
        <SceneSetup />
        <ambientLight intensity={0.30} />
        <spotLight
          position={[10, 14, 8]}
          angle={0.15}
          penumbra={1}
          intensity={1.9}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-8, 5, -6]} intensity={0.45} color="#2233bb" />
        <pointLight position={[6, -1, 5]} intensity={0.20} color="#ffffff" />
        {vehicleConfig?.mode === "chaos" && (
          <pointLight position={[0, 3, 0]} intensity={0.6} color={vehicleConfig.visual.primaryColor} />
        )}

        <Suspense fallback={null}>
          {vehicleConfig ? (
            <VehicleMesh config={vehicleConfig} stage={stage} />
          ) : isBuilding ? (
            <BuildingPlaceholder />
          ) : (
            <IdlePlaceholder />
          )}
        </Suspense>

        <OrbitControls
          minDistance={3.5}
          maxDistance={18}
          enableZoom
          enablePan={false}
          autoRotate={stage >= 5}
          autoRotateSpeed={0.6}
        />
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
