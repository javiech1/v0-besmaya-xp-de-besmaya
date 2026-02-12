function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (!val) throw new Error(`Falta variable de entorno: ${key}`)
  return val
}

export const config = {
  twitter: {
    apiKey: env("TWITTER_API_KEY"),
    apiSecret: env("TWITTER_API_SECRET"),
    accessToken: env("TWITTER_ACCESS_TOKEN"),
    accessSecret: env("TWITTER_ACCESS_SECRET"),
    bearerToken: env("TWITTER_BEARER_TOKEN"),
    botUsername: env("TWITTER_BOT_USERNAME", "nadiedebesmaya"),
    bandUsername: env("TWITTER_BAND_USERNAME", "somosbesmaya"),
  },
  anthropic: {
    apiKey: env("ANTHROPIC_API_KEY"),
    model: "claude-sonnet-4-5-20250929",
  },
  bot: {
    pollingIntervalMs: parseInt(env("POLLING_INTERVAL_MS", "1800000"), 10),
    maxDailyReplies: parseInt(env("MAX_DAILY_REPLIES", "100"), 10),
    dryRun: env("DRY_RUN", "false") === "true",
    stateFile: env("STATE_FILE", "./bot-state.json"),
  },
} as const
