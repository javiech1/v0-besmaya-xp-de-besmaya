import { TwitterApi } from "twitter-api-v2"
import { config } from "./config.js"

const userClient = new TwitterApi({
  appKey: config.twitter.apiKey,
  appSecret: config.twitter.apiSecret,
  accessToken: config.twitter.accessToken,
  accessSecret: config.twitter.accessSecret,
})

const v2User = userClient.v2

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function deleteTweetWithRetry(tweetId: string, maxRetries = 3): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await v2User.deleteTweet(tweetId)
      return true
    } catch (err: any) {
      if (err?.code === 429 || err?.data?.status === 429) {
        // Rate limit: esperar segun el header o 60s por defecto
        const resetTime = err?.rateLimit?.reset
        let waitMs = 60_000
        if (resetTime) {
          waitMs = Math.max((resetTime * 1000) - Date.now() + 1000, 5000)
        }
        console.log(`  Rate limit! Esperando ${Math.round(waitMs / 1000)}s...`)
        await sleep(waitMs)
        continue
      }
      throw err
    }
  }
  return false
}

async function cleanup() {
  const me = await v2User.me()
  const botId = me.data.id
  console.log(`Bot: @${me.data.username} (${botId})`)

  let totalDeleted = 0
  let totalErrors = 0
  let paginationToken: string | undefined
  let page = 0

  do {
    page++
    console.log(`\n--- Pagina ${page} ---`)

    const params: Record<string, unknown> = {
      max_results: 100,
      "tweet.fields": ["created_at", "referenced_tweets"],
      exclude: ["retweets"],
    }
    if (paginationToken) params.pagination_token = paginationToken

    const timeline = await v2User.userTimeline(botId, params)
    const tweets = timeline.data?.data ?? []
    paginationToken = timeline.meta?.next_token

    console.log(`Tweets encontrados: ${tweets.length}`)

    if (tweets.length === 0) break

    for (const tweet of tweets) {
      const createdAt = (tweet as any).created_at ?? "?"
      try {
        const ok = await deleteTweetWithRetry(tweet.id)
        if (ok) {
          totalDeleted++
          console.log(`  Borrado: ${tweet.id} [${createdAt}] "${tweet.text.slice(0, 50)}..."`)
        } else {
          totalErrors++
          console.error(`  Fallo tras reintentos: ${tweet.id}`)
        }
        // Pausa de 2s entre borrados para evitar rate limit
        await sleep(2000)
      } catch (err: any) {
        totalErrors++
        console.error(`  Error borrando ${tweet.id}: ${err.message ?? err}`)
      }
    }
  } while (paginationToken)

  console.log(`\nTotal borrados: ${totalDeleted}, errores: ${totalErrors}`)
}

cleanup().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
