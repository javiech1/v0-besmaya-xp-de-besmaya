import { config } from "./config.js"
import { NADIE_TWITTER_SYSTEM_PROMPT } from "./nadie-prompt.js"
import type { BatchRequest, BatchResult, PendingReply } from "./types.js"

const API_BASE = "https://api.anthropic.com/v1"
const ANTHROPIC_VERSION = "2023-06-01"
const BATCH_BETA_HEADER = "message-batches-2024-09-24"

function headers(): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": config.anthropic.apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-beta": BATCH_BETA_HEADER,
  }
}

/**
 * Crea un batch de mensajes a partir de las respuestas pendientes.
 * Devuelve el batch_id para hacer polling despues.
 */
export async function createBatch(pendingReplies: PendingReply[]): Promise<string | null> {
  if (pendingReplies.length === 0) return null

  const requests: BatchRequest[] = pendingReplies.map(reply => ({
    custom_id: reply.customId,
    params: {
      model: config.anthropic.model,
      max_tokens: 200,
      system: [
        {
          type: "text",
          text: NADIE_TWITTER_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: reply.userPrompt,
        },
      ],
    },
  }))

  console.log(`[Claude] Creando batch con ${requests.length} requests...`)

  try {
    const res = await fetch(`${API_BASE}/messages/batches`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ requests }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Claude] Error creando batch: ${res.status}`, errorText)
      return null
    }

    const data = await res.json()
    console.log(`[Claude] Batch creado: ${data.id}, estado: ${data.processing_status}`)
    return data.id
  } catch (err) {
    console.error("[Claude] Error de red creando batch:", err)
    return null
  }
}

/**
 * Comprueba el estado de un batch.
 * Devuelve el estado: "in_progress", "ended", "canceling", "canceled", "expired", "failed"
 */
export async function checkBatchStatus(batchId: string): Promise<{
  status: string
  requestCounts?: { succeeded: number; errored: number; expired: number; canceled: number }
}> {
  try {
    const res = await fetch(`${API_BASE}/messages/batches/${batchId}`, {
      headers: headers(),
    })

    if (!res.ok) {
      console.error(`[Claude] Error checking batch ${batchId}: ${res.status}`)
      return { status: "error" }
    }

    const data = await res.json()
    return {
      status: data.processing_status,
      requestCounts: data.request_counts,
    }
  } catch (err) {
    console.error(`[Claude] Error de red checking batch ${batchId}:`, err)
    return { status: "error" }
  }
}

/**
 * Obtiene los resultados de un batch completado.
 * Devuelve un array de resultados mapeados por custom_id.
 */
export async function getBatchResults(batchId: string): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()

  try {
    const res = await fetch(`${API_BASE}/messages/batches/${batchId}/results`, {
      headers: headers(),
    })

    if (!res.ok) {
      console.error(`[Claude] Error getting batch results ${batchId}: ${res.status}`)
      return results
    }

    // Los resultados vienen como JSONL (una linea JSON por resultado)
    const text = await res.text()
    const lines = text.trim().split("\n").filter(Boolean)

    let totalInput = 0
    let totalOutput = 0
    let cacheRead = 0

    for (const line of lines) {
      try {
        const result: BatchResult = JSON.parse(line)
        if (result.result.type === "succeeded" && result.result.message) {
          const textBlock = result.result.message.content.find(b => b.type === "text")
          const responseText = textBlock?.text?.trim() ?? null

          // Tracking de uso
          const usage = result.result.message.usage
          if (usage) {
            totalInput += usage.input_tokens
            totalOutput += usage.output_tokens
            cacheRead += usage.cache_read_input_tokens ?? 0
          }

          results.set(result.custom_id, responseText)
        } else {
          console.warn(`[Claude] Resultado fallido para ${result.custom_id}:`, result.result.type, result.result.error)
          results.set(result.custom_id, null)
        }
      } catch {
        console.error("[Claude] Error parseando linea de resultado:", line.slice(0, 100))
      }
    }

    console.log(`[Claude] Batch ${batchId} resultados: ${results.size} respuestas`)
    console.log(`[Claude] Uso total: input=${totalInput} output=${totalOutput} cache_read=${cacheRead}`)

    return results
  } catch (err) {
    console.error(`[Claude] Error de red getting batch results ${batchId}:`, err)
    return results
  }
}

/**
 * Espera a que un batch termine, con polling y backoff.
 * Devuelve true si termino, false si se agoto el tiempo.
 */
export async function waitForBatch(batchId: string, maxWaitMs = 20 * 60 * 1000): Promise<boolean> {
  const startTime = Date.now()
  let pollInterval = 5_000 // Empezar con 5s
  const maxPollInterval = 60_000 // Max 60s

  while (Date.now() - startTime < maxWaitMs) {
    const { status, requestCounts } = await checkBatchStatus(batchId)

    if (status === "ended") {
      console.log(`[Claude] Batch ${batchId} completado.`, requestCounts)
      return true
    }

    if (status === "failed" || status === "expired" || status === "canceled" || status === "error") {
      console.error(`[Claude] Batch ${batchId} termino con estado: ${status}`)
      return false
    }

    console.log(`[Claude] Batch ${batchId} en progreso... esperando ${pollInterval / 1000}s`)
    await sleep(pollInterval)
    pollInterval = Math.min(pollInterval * 1.5, maxPollInterval)
  }

  console.warn(`[Claude] Timeout esperando batch ${batchId}`)
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
