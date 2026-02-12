import { TwitterApi } from "twitter-api-v2"
import { config } from "./config.js"

const userClient = new TwitterApi({
  appKey: config.twitter.apiKey,
  appSecret: config.twitter.apiSecret,
  accessToken: config.twitter.accessToken,
  accessSecret: config.twitter.accessSecret,
})

const v2User = userClient.v2

const MAX_TWEET_AGE_MS = 24 * 60 * 60 * 1000 // 24h

async function cleanup() {
  // Obtener info del bot
  const me = await v2User.me()
  const botId = me.data.id
  console.log(`Bot: @${me.data.username} (${botId})`)

  // Obtener tweets recientes del bot
  const timeline = await v2User.userTimeline(botId, {
    max_results: 100,
    "tweet.fields": ["created_at", "referenced_tweets", "in_reply_to_user_id"],
    exclude: ["retweets"],
  })

  const tweets = timeline.data?.data ?? []
  console.log(`Tweets recientes encontrados: ${tweets.length}`)

  // Filtrar: solo replies a tweets viejos (>24h)
  const now = Date.now()
  const toDelete: Array<{ id: string; text: string; createdAt: string }> = []

  for (const tweet of tweets) {
    const createdAt = (tweet as any).created_at
    const isReply = tweet.referenced_tweets?.some(r => r.type === "replied_to")

    // Solo borrar replies (no tweets originales del bot)
    if (!isReply) continue

    // Todos los replies del bot de hoy son del batch erroneo
    toDelete.push({ id: tweet.id, text: tweet.text.slice(0, 60), createdAt })
  }

  console.log(`\nTweets a borrar: ${toDelete.length}`)

  if (toDelete.length === 0) {
    console.log("Nada que borrar.")
    return
  }

  // Mostrar los tweets que se van a borrar
  for (const t of toDelete) {
    console.log(`  [${t.createdAt}] ${t.id}: "${t.text}..."`)
  }

  // Borrar
  console.log(`\nBorrando ${toDelete.length} tweets...`)
  let deleted = 0
  let errors = 0

  for (const t of toDelete) {
    try {
      await v2User.deleteTweet(t.id)
      deleted++
      console.log(`  Borrado: ${t.id}`)
      // Pausa para no exceder rate limit
      await new Promise(r => setTimeout(r, 1000))
    } catch (err: any) {
      errors++
      console.error(`  Error borrando ${t.id}: ${err.message ?? err}`)
    }
  }

  console.log(`\nResultado: ${deleted} borrados, ${errors} errores`)
}

cleanup().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
