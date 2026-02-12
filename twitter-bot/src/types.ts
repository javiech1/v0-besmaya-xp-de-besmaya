// --- Twitter types ---

export interface PendingReply {
  /** ID unico para mapear resultado del batch */
  customId: string
  /** Tipo de interaccion */
  type: "mention" | "followed_band" | "indirect_mention" | "besma_tweet"
  /** ID del tweet al que responder */
  targetId: string
  /** Conversation ID del hilo de Twitter */
  conversationId?: string
  /** ID del autor del tweet */
  authorId?: string
  /** Username del autor del tweet */
  authorUsername: string
  /** Texto del tweet original */
  text: string
  /** Contexto del hilo formateado */
  threadContext: string
  /** Prompt completo que se enviara a Claude */
  userPrompt: string
}

export interface BatchRequest {
  custom_id: string
  params: {
    model: string
    max_tokens: number
    system: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>
    messages: Array<{ role: "user" | "assistant"; content: string }>
  }
}

export interface BatchResult {
  custom_id: string
  result: {
    type: "succeeded" | "errored" | "expired"
    message?: {
      content: Array<{ type: string; text?: string }>
      usage?: {
        input_tokens: number
        output_tokens: number
        cache_read_input_tokens?: number
        cache_creation_input_tokens?: number
      }
    }
    error?: { type: string; message: string }
  }
}

export interface BotState {
  /** Ultimo ID de mencion procesada (para paginacion) */
  lastMentionId: string | null
  /** Ultimo ID de busqueda indirecta procesada (cursor independiente) */
  lastIndirectSearchId: string | null
  /** Ultimo timestamp de tweet de banda seguida procesado */
  lastFollowedTweetTime: string | null
  /** IDs de tweets a los que ya hemos respondido */
  repliedTweetIds: string[]
  /** Hilos en los que participamos: conversation_id -> nuestros tweet IDs */
  activeThreads: Record<string, string[]>
  /** Contador de respuestas hoy */
  dailyReplyCount: number
  /** Fecha del contador (YYYY-MM-DD) */
  dailyReplyDate: string
  /** IDs de batches pendientes de ciclos anteriores */
  pendingBatchIds: string[]
  /** Respuestas a cuentas seguidas hoy: author_id -> fecha YYYY-MM-DD de ultima respuesta */
  dailyFollowedReplies: Record<string, string>
}

export interface ThreadMessage {
  id: string
  authorUsername: string
  text: string
  createdAt: string
  inReplyToId?: string
}
