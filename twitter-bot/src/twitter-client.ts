import { TwitterApi, type TweetV2 } from "twitter-api-v2"

import { config } from "./config.js"
import type { ThreadMessage } from "./types.js"

// Cliente con OAuth 1.0a (user context) para leer y escribir
const userClient = new TwitterApi({
  appKey: config.twitter.apiKey,
  appSecret: config.twitter.apiSecret,
  accessToken: config.twitter.accessToken,
  accessSecret: config.twitter.accessSecret,
})

// Cliente con Bearer Token para endpoints app-only (search, etc.)
const appClient = new TwitterApi(config.twitter.bearerToken)

const v2User = userClient.v2
const v2App = appClient.v2

let _botUserId: string | null = null
let _bandUserId: string | null = null

// --- Cache de usernames para evitar llamadas redundantes a la API ---
const usernameCache = new Map<string, string>()

// --- Cache de lista de cuentas seguidas (cambia poco, no pedir cada ciclo) ---
const FOLLOWING_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas
let _followingCache: Array<{ id: string; username: string }> | null = null
let _followingCacheTime = 0

// --- Inicializacion ---

export async function initTwitter(): Promise<void> {
  const me = await v2User.me({ "user.fields": ["id", "username"] })
  _botUserId = me.data.id
  console.log(`[Twitter] Bot autenticado como @${me.data.username} (${_botUserId})`)

  // Resolver ID de la cuenta de la banda
  const band = await v2App.userByUsername(config.twitter.bandUsername)
  if (band.data) {
    _bandUserId = band.data.id
    console.log(`[Twitter] Cuenta banda @${config.twitter.bandUsername} (${_bandUserId})`)
  } else {
    console.warn(`[Twitter] No se encontro @${config.twitter.bandUsername}`)
  }
}

export function getBotUserId(): string {
  if (!_botUserId) throw new Error("Twitter no inicializado. Llama initTwitter() primero")
  return _botUserId
}

export function getBandUserId(): string | null {
  return _bandUserId
}

// --- Menciones ---

export async function fetchMentions(sinceId: string | null): Promise<TweetV2[]> {
  const botId = getBotUserId()
  try {
    const params: Record<string, unknown> = {
      max_results: 100,
      "tweet.fields": ["conversation_id", "in_reply_to_user_id", "author_id", "created_at", "referenced_tweets"],
      expansions: ["author_id"],
      "user.fields": ["username"],
    }
    if (sinceId) params.since_id = sinceId
    // Limitar a las ultimas 24h para no gastar API en tweets viejos
    if (!sinceId) params.start_time = get24hAgoISO()

    const response = await withRateLimitRetry(
      () => v2User.userMentionTimeline(botId, params),
      "mentions-bot"
    )
    const tweets = response.data?.data ?? []
    cacheUsersFromExpansions(response.includes?.users)

    // Si tambien queremos menciones a @somosbesmaya, buscar tambien ahi
    if (_bandUserId && _bandUserId !== botId) {
      const bandParams = { ...params }
      const bandResponse = await withRateLimitRetry(
        () => v2User.userMentionTimeline(_bandUserId!, bandParams),
        "mentions-band"
      )
      const bandTweets = bandResponse.data?.data ?? []
      cacheUsersFromExpansions(bandResponse.includes?.users)

      // Combinar y deduplicar
      const allIds = new Set(tweets.map(t => t.id))
      for (const t of bandTweets) {
        if (!allIds.has(t.id)) tweets.push(t)
      }
    }

    console.log(`[Twitter] ${tweets.length} menciones nuevas encontradas`)
    return tweets
  } catch (err) {
    console.error("[Twitter] Error fetching mentions:", err)
    return []
  }
}

// --- Busqueda de menciones indirectas ---

export async function searchIndirectMentions(sinceId: string | null): Promise<TweetV2[]> {
  try {
    // Filtrar por idioma espanol y excluir cuentas propias para evitar
    // falsos positivos (base militar Besmaya en Irak, localizaciones, etc.)
    const query = `"besmaya" lang:es -from:${config.twitter.botUsername} -from:${config.twitter.bandUsername} -is:retweet`
    const params: Record<string, unknown> = {
      max_results: 50,
      "tweet.fields": ["conversation_id", "in_reply_to_user_id", "author_id", "created_at"],
      expansions: ["author_id"],
      "user.fields": ["username"],
    }
    if (sinceId) params.since_id = sinceId
    if (!sinceId) params.start_time = get24hAgoISO()

    const response = await withRateLimitRetry(
      () => v2App.search(query, params),
      "search-indirect"
    )
    const tweets = response.data?.data ?? []
    cacheUsersFromExpansions(response.includes?.users)
    console.log(`[Twitter] ${tweets.length} menciones indirectas de "besmaya"`)
    return tweets
  } catch (err) {
    console.error("[Twitter] Error searching indirect mentions:", err)
    return []
  }
}

// --- Tweets de bandas seguidas ---

export async function fetchFollowedAccountsTweets(since: string | null): Promise<TweetV2[]> {
  const botId = getBotUserId()
  try {
    // Obtener cuentas que seguimos (con cache de 6h para no gastar API)
    let followedUsers: Array<{ id: string; username: string }>
    const cacheExpired = Date.now() - _followingCacheTime > FOLLOWING_CACHE_TTL_MS

    if (_followingCache && !cacheExpired) {
      followedUsers = _followingCache
      console.log(`[Twitter] Siguiendo ${followedUsers.length} cuentas (cache)`)
    } else {
      const following = await withRateLimitRetry(
        () => v2User.following(botId, { max_results: 1000, "user.fields": ["username"] }),
        "following-list"
      )
      followedUsers = (following.data ?? []).map(u => ({ id: u.id, username: u.username }))
      _followingCache = followedUsers
      _followingCacheTime = Date.now()
      // Cachear usernames de las cuentas seguidas
      for (const u of followedUsers) {
        usernameCache.set(u.id, u.username)
      }
      console.log(`[Twitter] Siguiendo ${followedUsers.length} cuentas (API)`)
    }

    if (followedUsers.length === 0) return []

    const allTweets: TweetV2[] = []
    // Revisar tweets recientes de cada cuenta seguida (limitado a las primeras 50 para no agotar rate limit)
    const usersToCheck = followedUsers.slice(0, 50)

    for (const user of usersToCheck) {
      try {
        const params: Record<string, unknown> = {
          max_results: 5,
          "tweet.fields": ["conversation_id", "author_id", "created_at", "referenced_tweets"],
          exclude: ["retweets", "replies"],
        }
        params.start_time = since ?? get24hAgoISO()

        const timeline = await withRateLimitRetry(
          () => v2App.userTimeline(user.id, params),
          `timeline-${user.username}`
        )
        const tweets = timeline.data?.data ?? []
        for (const t of tweets) {
          // Anadimos el username manualmente ya que no viene en la expansion aqui
          ;(t as TweetV2 & { author_username?: string }).author_username = user.username
          allTweets.push(t)
        }
      } catch {
        // Rate limit o error individual, seguimos con el siguiente
      }
    }

    console.log(`[Twitter] ${allTweets.length} tweets nuevos de cuentas seguidas`)
    return allTweets
  } catch (err) {
    console.error("[Twitter] Error fetching followed accounts tweets:", err)
    return []
  }
}


// --- Contexto de hilos ---

export async function fetchThreadContext(conversationId: string, maxTweets = 20): Promise<ThreadMessage[]> {
  try {
    // Buscar todos los tweets de esta conversacion
    const query = `conversation_id:${conversationId}`
    const response = await withRateLimitRetry(
      () => v2App.search(query, {
        max_results: Math.min(maxTweets, 100),
        "tweet.fields": ["in_reply_to_user_id", "author_id", "created_at", "conversation_id"],
        expansions: ["author_id"],
        "user.fields": ["username"],
        sort_order: "recency",
      }),
      `thread-${conversationId}`
    )

    const tweets = response.data?.data ?? []
    const users = response.includes?.users ?? []
    cacheUsersFromExpansions(users)
    const userMap = new Map(users.map(u => [u.id, u.username]))

    const thread: ThreadMessage[] = tweets
      .map(t => ({
        id: t.id,
        authorUsername: userMap.get(t.author_id ?? "") ?? "desconocido",
        text: t.text,
        createdAt: (t as TweetV2 & { created_at?: string }).created_at ?? "",
        inReplyToId: t.referenced_tweets?.find(r => r.type === "replied_to")?.id,
      }))
      .reverse() // Orden cronologico

    console.log(`[Twitter] Hilo ${conversationId}: ${thread.length} mensajes`)
    return thread
  } catch (err) {
    console.error(`[Twitter] Error fetching thread ${conversationId}:`, err)
    return []
  }
}

// --- Acciones: responder tweet ---

export async function replyToTweet(tweetId: string, text: string): Promise<string | null> {
  if (config.bot.dryRun) {
    console.log(`[DRY RUN] Responderia a tweet ${tweetId}: "${text}"`)
    return "dry-run-" + tweetId
  }
  try {
    const response = await v2User.reply(text, tweetId)
    console.log(`[Twitter] Respondido tweet ${tweetId} -> ${response.data.id}`)
    return response.data.id
  } catch (err) {
    console.error(`[Twitter] Error respondiendo tweet ${tweetId}:`, err)
    return null
  }
}


// --- Acciones: publicar tweet propio ---

export async function postTweet(text: string): Promise<string | null> {
  if (config.bot.dryRun) {
    console.log(`[DRY RUN] Publicaria tweet: "${text}"`)
    return "dry-run-tweet"
  }
  try {
    const response = await v2User.tweet(text)
    console.log(`[Twitter] Tweet publicado: ${response.data.id}`)
    return response.data.id
  } catch (err) {
    console.error("[Twitter] Error publicando tweet:", err)
    return null
  }
}

// --- Helpers ---

function get24hAgoISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

// --- Rate limit: esperar y reintentar si recibimos 429 ---

async function withRateLimitRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const apiErr = err as { code?: number; data?: { status?: number }; rateLimit?: { reset?: number } }
    if (apiErr?.code === 429 || apiErr?.data?.status === 429) {
      const resetEpoch = apiErr?.rateLimit?.reset
      let waitMs = 60_000 // Default: 1 min
      if (resetEpoch) {
        waitMs = Math.max((resetEpoch * 1000) - Date.now() + 1000, 5000)
      }
      console.warn(`[Twitter] Rate limit en ${label}, esperando ${Math.round(waitMs / 1000)}s...`)
      await new Promise(r => setTimeout(r, waitMs))
      return fn() // Un solo reintento
    }
    throw err
  }
}

// --- Cache de usernames: poblar desde expansions ---

function cacheUsersFromExpansions(users: Array<{ id: string; username: string }> | undefined): void {
  if (!users) return
  for (const u of users) {
    usernameCache.set(u.id, u.username)
  }
}

// --- Resolver username por author_id (con cache) ---

export async function resolveUsername(authorId: string): Promise<string> {
  // Primero buscar en cache para evitar llamada API
  const cached = usernameCache.get(authorId)
  if (cached) return cached

  try {
    const user = await v2App.user(authorId, { "user.fields": ["username"] })
    const username = user.data?.username ?? "desconocido"
    if (username !== "desconocido") usernameCache.set(authorId, username)
    return username
  } catch {
    return "desconocido"
  }
}
