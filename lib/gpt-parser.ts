import type { VehicleConfig, VehicleMode } from "./vehicle-types"

export async function parseWithGPT(
  prompt: string,
  mode: VehicleMode,
  apiKey?: string | null,
): Promise<VehicleConfig> {
  const res = await fetch("/api/generate-vehicle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode, ...(apiKey ? { apiKey } : {}) }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string }
    throw new Error(err.error ?? `API error ${res.status}`)
  }

  const data = await res.json() as { config: VehicleConfig }
  return data.config
}
