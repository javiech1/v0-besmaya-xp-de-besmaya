import { config } from "./config.js"
import {
  initTwitter,
  fetchMentions,
  searchIndirectMentions,
  fetchFollowedAccountsTweets,
  fetchNewDMs,
  fetchThreadContext,
  replyToTweet,
  sendDM,
  resolveUsername,
  getBotUserId,
} from "./twitter-client.js"
import { createBatch, waitForBatch, getBatchResults } from "./claude-batch.js"
import { formatThreadContext, buildUserPrompt, NADIE_FALLBACKS } from "./nadie-prompt.js"
import {
  loadState,
  getState,
  saveState,
  hasRepliedToTweet,
  hasRepliedToDm,
  markTweetReplied,
  markDmReplied,
  setLastMentionId,
  setLastIndirectSearchId,
  setLastDmEventId,
  setLastFollowedTweetTime,
  addActiveThread,
  canReplyToday,
  getDailyReplyCount,
  addPendingBatch,
  removePendingBatch,
} from "./store.js"
import type { PendingReply, ThreadMessage } from "./types.js"
import type { TweetV2 } from "twitter-api-v2"

// Ultimas respuestas generadas (para evitar repetir muletillas)
const recentNadieReplies: string[] = []
const MAX_RECENT_REPLIES = 5

const RUN_ONCE = process.env.RUN_ONCE === "true"

async function main(): Promise<void> {
  console.log("=== Nadie Twitter Bot ===")
  console.log(`Modo: ${RUN_ONCE ? "single run (GitHub Actions)" : `loop (cada ${config.bot.pollingIntervalMs / 1000}s)`}`)
  console.log(`Max respuestas/dia: ${config.bot.maxDailyReplies}`)
  console.log(`Dry run: ${config.bot.dryRun}`)
  console.log("")

  // Cargar estado persistido
  loadState()

  // Inicializar Twitter
  await initTwitter()

  // Procesar batches pendientes de ciclos anteriores
  await processPendingBatches()

  // Ejecutar un ciclo
  await pollCycle()

  // Si es modo single run (GitHub Actions), salir
  if (RUN_ONCE) {
    console.log("[Main] Modo single run completado. Saliendo.")
    return
  }

  // Si no, loop cada 30 min (modo VM)
  setInterval(async () => {
    try {
      await pollCycle()
    } catch (err) {
      console.error("[Main] Error en ciclo de polling:", err)
    }
  }, config.bot.pollingIntervalMs)

  console.log("[Main] Bot en marcha. Ctrl+C para parar.")
}

async function pollCycle(): Promise<void> {
  const cycleStart = Date.now()
  console.log(`\n${"=".repeat(60)}`)
  console.log(`[Ciclo] ${new Date().toISOString()} - Respuestas hoy: ${getDailyReplyCount()}/${config.bot.maxDailyReplies}`)
  console.log("=".repeat(60))

  if (!canReplyToday()) {
    console.log("[Ciclo] Limite diario alcanzado, saltando ciclo")
    return
  }

  const state = getState()
  const pendingReplies: PendingReply[] = []
  const seenTargetIds = new Set<string>() // Dedup global dentro del ciclo
  let counter = 0

  // 1. Menciones directas (@nadiedebesmaya y @somosbesmaya)
  console.log("\n--- Buscando menciones directas ---")
  const mentions = await fetchMentions(state.lastMentionId)
  if (mentions.length > 0) {
    setLastMentionId(mentions[0].id) // El mas reciente
  }

  for (const tweet of mentions) {
    if (hasRepliedToTweet(tweet.id)) continue
    if (!canReplyToday()) break

    const authorUsername = await resolveAuthor(tweet)
    // No respondernos a nosotros mismos
    if (tweet.author_id === getBotUserId()) continue

    const threadContext = await getThreadContextForTweet(tweet)

    const customId = `mention-${counter++}`
    seenTargetIds.add(tweet.id)
    pendingReplies.push({
      customId,
      type: "mention",
      targetId: tweet.id,
      conversationId: tweet.conversation_id,
      authorUsername,
      text: tweet.text,
      threadContext,
      userPrompt: buildUserPrompt({
        type: "mention",
        authorUsername,
        text: tweet.text,
        threadContext,
        recentReplies: recentNadieReplies.slice(-MAX_RECENT_REPLIES),
      }),
    })
  }

  // 2. Menciones indirectas (busqueda de "besmaya")
  console.log("\n--- Buscando menciones indirectas ---")
  const indirectMentions = await searchIndirectMentions(state.lastIndirectSearchId)
  if (indirectMentions.length > 0) {
    setLastIndirectSearchId(indirectMentions[0].id)
  }

  for (const tweet of indirectMentions) {
    if (hasRepliedToTweet(tweet.id)) continue
    if (!canReplyToday()) break
    // Dedup global: evitar duplicados con menciones directas u otros tipos
    if (seenTargetIds.has(tweet.id)) continue

    const authorUsername = await resolveAuthor(tweet)
    if (tweet.author_id === getBotUserId()) continue

    const threadContext = await getThreadContextForTweet(tweet)

    const customId = `indirect-${counter++}`
    seenTargetIds.add(tweet.id)
    pendingReplies.push({
      customId,
      type: "indirect_mention",
      targetId: tweet.id,
      conversationId: tweet.conversation_id,
      authorUsername,
      text: tweet.text,
      threadContext,
      userPrompt: buildUserPrompt({
        type: "indirect_mention",
        authorUsername,
        text: tweet.text,
        threadContext,
        recentReplies: recentNadieReplies.slice(-MAX_RECENT_REPLIES),
      }),
    })
  }

  // 3. Tweets de bandas seguidas
  console.log("\n--- Buscando tweets de bandas seguidas ---")
  const followedTweets = await fetchFollowedAccountsTweets(state.lastFollowedTweetTime)
  if (followedTweets.length > 0) {
    // Guardar el timestamp mas reciente
    const mostRecent = followedTweets
      .map(t => (t as TweetV2 & { created_at?: string }).created_at)
      .filter(Boolean)
      .sort()
      .pop()
    if (mostRecent) setLastFollowedTweetTime(mostRecent)
  }

  for (const tweet of followedTweets) {
    if (hasRepliedToTweet(tweet.id)) continue
    if (!canReplyToday()) break
    // Dedup global: un tweet de banda seguida podria contener "besmaya"
    if (seenTargetIds.has(tweet.id)) continue

    const authorUsername = (tweet as TweetV2 & { author_username?: string }).author_username
      ?? await resolveAuthor(tweet)
    if (tweet.author_id === getBotUserId()) continue

    const customId = `band-${counter++}`
    seenTargetIds.add(tweet.id)
    pendingReplies.push({
      customId,
      type: "followed_band",
      targetId: tweet.id,
      conversationId: tweet.conversation_id,
      authorUsername,
      text: tweet.text,
      threadContext: "", // No necesitamos hilo para tweets nuevos de bandas
      userPrompt: buildUserPrompt({
        type: "followed_band",
        authorUsername,
        text: tweet.text,
        threadContext: "",
        recentReplies: recentNadieReplies.slice(-MAX_RECENT_REPLIES),
      }),
    })
  }

  // 4. DMs
  console.log("\n--- Buscando DMs nuevos ---")
  const dms = await fetchNewDMs(state.lastDmEventId)
  if (dms.length > 0) {
    setLastDmEventId(dms[0].id)
  }

  for (const dm of dms) {
    if (hasRepliedToDm(dm.id)) continue
    if (!canReplyToday()) break

    const senderUsername = await resolveUsername(dm.sender_id ?? "")

    const customId = `dm-${counter++}`
    pendingReplies.push({
      customId,
      type: "dm",
      targetId: dm.dm_conversation_id ?? dm.id,
      authorUsername: senderUsername,
      text: dm.text ?? "",
      threadContext: "",
      userPrompt: buildUserPrompt({
        type: "dm",
        authorUsername: senderUsername,
        text: dm.text ?? "",
        threadContext: "",
        recentReplies: recentNadieReplies.slice(-MAX_RECENT_REPLIES),
      }),
    })
  }

  // 5. Enviar batch a Claude
  if (pendingReplies.length === 0) {
    console.log("\n[Ciclo] Nada que responder este ciclo")
    logCycleDuration(cycleStart)
    return
  }

  console.log(`\n--- Enviando ${pendingReplies.length} prompts a Claude Batches API ---`)
  const batchId = await createBatch(pendingReplies)

  if (!batchId) {
    console.error("[Ciclo] Error creando batch, saltando ciclo")
    logCycleDuration(cycleStart)
    return
  }

  // 6. Esperar resultados
  const completed = await waitForBatch(batchId)

  if (!completed) {
    console.log(`[Ciclo] Batch ${batchId} no completo, guardando para siguiente ciclo`)
    addPendingBatch(batchId)
    // Guardar la info de pending replies para poder mapear cuando termine
    savePendingRepliesMap(batchId, pendingReplies)
    logCycleDuration(cycleStart)
    return
  }

  // 7. Procesar resultados
  await processResults(batchId, pendingReplies)
  logCycleDuration(cycleStart)
}

async function processResults(batchId: string, pendingReplies: PendingReply[]): Promise<void> {
  const results = await getBatchResults(batchId)

  for (const reply of pendingReplies) {
    if (!canReplyToday()) {
      console.log("[Resultados] Limite diario alcanzado, parando")
      break
    }

    let responseText = results.get(reply.customId)

    // Si no hay respuesta de Claude:
    // - Para followed_band e indirect_mention, mejor SKIP que decir algo random
    // - Para mention y dm, usar fallback porque alguien espera respuesta
    if (!responseText) {
      if (reply.type === "followed_band" || reply.type === "indirect_mention") {
        responseText = "SKIP"
      } else {
        responseText = NADIE_FALLBACKS[Math.floor(Math.random() * NADIE_FALLBACKS.length)]
      }
    }

    // Si Claude devolvio "SKIP", no responder
    if (responseText.trim().toUpperCase() === "SKIP") {
      console.log(`[Resultados] SKIP para ${reply.customId} (${reply.type} de @${reply.authorUsername})`)
      // Marcar como procesado para no reintentarlo
      if (reply.type === "dm") {
        markDmReplied(reply.targetId)
      } else {
        markTweetReplied(reply.targetId)
      }
      continue
    }

    // Truncar a 280 chars
    responseText = responseText.replace(/\n+/g, " ").slice(0, 260)

    console.log(`[Resultados] ${reply.customId}: @${reply.authorUsername} -> "${responseText}"`)

    // Publicar respuesta
    if (reply.type === "dm") {
      const sent = await sendDM(reply.targetId, responseText)
      if (sent) {
        markDmReplied(reply.targetId)
        trackRecentReply(responseText)
      }
    } else {
      const tweetId = await replyToTweet(reply.targetId, responseText)
      if (tweetId) {
        markTweetReplied(reply.targetId)
        trackRecentReply(responseText)
        if (reply.conversationId) {
          addActiveThread(reply.conversationId, tweetId)
        }
      }
    }

    // Pequeña pausa entre publicaciones para no parecer spam
    await sleep(2000)
  }
}

async function processPendingBatches(): Promise<void> {
  const state = getState()
  if (state.pendingBatchIds.length === 0) return

  console.log(`[Pendientes] ${state.pendingBatchIds.length} batches pendientes de ciclos anteriores`)

  for (const batchId of [...state.pendingBatchIds]) {
    const completed = await waitForBatch(batchId, 60_000) // Max 1 min por batch pendiente
    if (completed) {
      // Intentar recuperar el mapa de pending replies
      const replies = loadPendingRepliesMap(batchId)
      if (replies) {
        await processResults(batchId, replies)
      } else {
        console.warn(`[Pendientes] No se encontro mapa de replies para batch ${batchId}, solo descartando`)
      }
      removePendingBatch(batchId)
    }
  }
}

// --- Helpers ---

async function resolveAuthor(tweet: TweetV2): Promise<string> {
  return tweet.author_id ? await resolveUsername(tweet.author_id) : "desconocido"
}

async function getThreadContextForTweet(tweet: TweetV2): Promise<string> {
  const conversationId = tweet.conversation_id
  if (!conversationId || conversationId === tweet.id) {
    // Es un tweet raiz, no hay hilo
    return ""
  }

  const thread = await fetchThreadContext(conversationId)
  if (thread.length <= 1) return ""

  return formatThreadContext(
    thread.map(m => ({ authorUsername: m.authorUsername, text: m.text })),
    "hilo en el que te han mencionado"
  )
}

function trackRecentReply(text: string): void {
  recentNadieReplies.push(text)
  if (recentNadieReplies.length > MAX_RECENT_REPLIES * 2) {
    recentNadieReplies.splice(0, recentNadieReplies.length - MAX_RECENT_REPLIES)
  }
}

function logCycleDuration(startTime: number): void {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[Ciclo] Duracion: ${duration}s`)
}

// --- Persistencia temporal de pending replies map ---
// Usamos un fichero JSON separado para no complicar el state principal

import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs"

function pendingRepliesPath(batchId: string): string {
  return `./pending-replies-${batchId}.json`
}

function savePendingRepliesMap(batchId: string, replies: PendingReply[]): void {
  writeFileSync(pendingRepliesPath(batchId), JSON.stringify(replies))
}

function loadPendingRepliesMap(batchId: string): PendingReply[] | null {
  const path = pendingRepliesPath(batchId)
  if (!existsSync(path)) return null
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"))
    unlinkSync(path)
    return data
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Arranque ---

main().catch(err => {
  console.error("[Fatal] Error arrancando bot:", err)
  process.exit(1)
})
