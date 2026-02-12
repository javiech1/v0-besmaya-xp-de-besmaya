import { TwitterApi, type TweetV2 } from "twitter-api-v2"

interface DMEvent {
  id: string
  event_type: string
  text?: string
  sender_id?: string
  dm_conversation_id?: string
  created_at?: string
}
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

    const response = await v2User.userMentionTimeline(botId, params)
    const tweets = response.data?.data ?? []

    // Si tambien queremos menciones a @somosbesmaya, buscar tambien ahi
    if (_bandUserId && _bandUserId !== botId) {
      const bandParams = { ...params }
      if (sinceId) bandParams.since_id = sinceId
      const bandResponse = await v2User.userMentionTimeline(_bandUserId, bandParams)
      const bandTweets = bandResponse.data?.data ?? []

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

    const response = await v2App.search(query, params)
    const tweets = response.data?.data ?? []
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
    // Obtener cuentas que seguimos
    const following = await v2User.following(botId, {
      max_results: 1000,
      "user.fields": ["username"],
    })
    const followedUsers = following.data ?? []
    console.log(`[Twitter] Siguiendo ${followedUsers.length} cuentas`)

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
        if (since) params.start_time = since

        const timeline = await v2App.userTimeline(user.id, params)
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

// --- DMs ---

export async function fetchNewDMs(sinceId: string | null): Promise<DMEvent[]> {
  try {
    const params: Record<string, unknown> = {
      max_results: 100,
      "dm_event.fields": ["dm_conversation_id", "sender_id", "text", "created_at"],
      event_types: "MessageCreate",
    }
    if (sinceId) params.since_id = sinceId

    const response = await v2User.listDmEvents(params)
    const events: DMEvent[] = response.events ?? []

    // Filtrar solo DMs de otros (no los nuestros)
    const botId = getBotUserId()
    const incoming = events.filter(e => e.sender_id !== botId)
    console.log(`[Twitter] ${incoming.length} DMs nuevos`)
    return incoming
  } catch (err) {
    console.error("[Twitter] Error fetching DMs:", err)
    return []
  }
}

// --- Contexto de hilos ---

export async function fetchThreadContext(conversationId: string, maxTweets = 20): Promise<ThreadMessage[]> {
  try {
    // Buscar todos los tweets de esta conversacion
    const query = `conversation_id:${conversationId}`
    const response = await v2App.search(query, {
      max_results: Math.min(maxTweets, 100),
      "tweet.fields": ["in_reply_to_user_id", "author_id", "created_at", "conversation_id"],
      expansions: ["author_id"],
      "user.fields": ["username"],
      sort_order: "recency",
    })

    const tweets = response.data?.data ?? []
    const users = response.includes?.users ?? []
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

// --- Acciones: enviar DM ---

export async function sendDM(conversationId: string, text: string): Promise<boolean> {
  if (config.bot.dryRun) {
    console.log(`[DRY RUN] Enviaria DM a conversacion ${conversationId}: "${text}"`)
    return true
  }
  try {
    await v2User.sendDmInConversation(conversationId, { text })
    console.log(`[Twitter] DM enviado a conversacion ${conversationId}`)
    return true
  } catch (err) {
    console.error(`[Twitter] Error enviando DM a ${conversationId}:`, err)
    return false
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

// --- Resolver username por author_id ---

export async function resolveUsername(authorId: string): Promise<string> {
  try {
    const user = await v2App.user(authorId, { "user.fields": ["username"] })
    return user.data?.username ?? "desconocido"
  } catch {
    return "desconocido"
  }
}
