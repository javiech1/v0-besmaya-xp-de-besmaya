import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { config } from "./config.js"
import type { BotState } from "./types.js"

const DEFAULT_STATE: BotState = {
  lastMentionId: null,
  lastIndirectSearchId: null,
  lastFollowedTweetTime: null,
  repliedTweetIds: [],
  activeThreads: {},
  dailyReplyCount: 0,
  dailyReplyDate: new Date().toISOString().slice(0, 10),
  pendingBatchIds: [],
  dailyFollowedReplies: {},
}

const MAX_REPLIED_IDS = 5000

let state: BotState = { ...DEFAULT_STATE }
// Set para lookups O(1) en vez de Array.includes() O(n) con hasta 5000 elementos
let repliedSet = new Set<string>()

export function loadState(): void {
  const path = config.bot.stateFile
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8")
      state = { ...DEFAULT_STATE, ...JSON.parse(raw) }
      repliedSet = new Set(state.repliedTweetIds)
      console.log("[Store] Estado cargado:", {
        lastMentionId: state.lastMentionId,
        repliedCount: state.repliedTweetIds.length,
        dailyReplies: state.dailyReplyCount,
      })
    } catch (err) {
      console.error("[Store] Error cargando estado, usando default:", err)
      state = { ...DEFAULT_STATE }
    }
  } else {
    console.log("[Store] No existe archivo de estado, creando nuevo")
    saveState()
  }
}

export function saveState(): void {
  // Limpiar IDs viejos para que no crezca infinito
  if (state.repliedTweetIds.length > MAX_REPLIED_IDS) {
    state.repliedTweetIds = state.repliedTweetIds.slice(-MAX_REPLIED_IDS)
    repliedSet = new Set(state.repliedTweetIds)
  }
  writeFileSync(config.bot.stateFile, JSON.stringify(state, null, 2))
}

export function getState(): BotState {
  return state
}

export function hasRepliedToTweet(tweetId: string): boolean {
  return repliedSet.has(tweetId)
}

export function markTweetReplied(tweetId: string): void {
  if (!repliedSet.has(tweetId)) {
    state.repliedTweetIds.push(tweetId)
    repliedSet.add(tweetId)
  }
  incrementDailyCount()
  saveState()
}

export function setLastMentionId(id: string): void {
  state.lastMentionId = id
  saveState()
}

export function setLastIndirectSearchId(id: string): void {
  state.lastIndirectSearchId = id
  saveState()
}

export function setLastFollowedTweetTime(time: string): void {
  state.lastFollowedTweetTime = time
  saveState()
}

export function addActiveThread(conversationId: string, ourTweetId: string): void {
  if (!state.activeThreads[conversationId]) {
    state.activeThreads[conversationId] = []
  }
  state.activeThreads[conversationId].push(ourTweetId)
  saveState()
}

export function isInActiveThread(conversationId: string): boolean {
  return !!state.activeThreads[conversationId]?.length
}

export function addPendingBatch(batchId: string): void {
  state.pendingBatchIds.push(batchId)
  saveState()
}

export function removePendingBatch(batchId: string): void {
  state.pendingBatchIds = state.pendingBatchIds.filter(id => id !== batchId)
  saveState()
}

export function canReplyToday(): boolean {
  resetDailyCountIfNeeded()
  return state.dailyReplyCount < config.bot.maxDailyReplies
}

export function getDailyReplyCount(): number {
  resetDailyCountIfNeeded()
  return state.dailyReplyCount
}

export function hasRepliedToFollowedToday(authorId: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return state.dailyFollowedReplies[authorId] === today
}

export function markFollowedRepliedToday(authorId: string): void {
  const today = new Date().toISOString().slice(0, 10)
  state.dailyFollowedReplies[authorId] = today
  saveState()
}

function incrementDailyCount(): void {
  resetDailyCountIfNeeded()
  state.dailyReplyCount++
}

function resetDailyCountIfNeeded(): void {
  const today = new Date().toISOString().slice(0, 10)
  if (state.dailyReplyDate !== today) {
    state.dailyReplyCount = 0
    state.dailyReplyDate = today
    // Limpiar respuestas de dias anteriores
    state.dailyFollowedReplies = {}
  }
}
