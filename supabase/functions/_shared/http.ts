export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // nanti dipersempit ke domain deploy FE
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Format error sesuai kontrak Bagian 2.1
export function errorResponse(
  status: number,
  code: string,
  message: string,
  retryAfterSeconds?: number,
) {
  return json(
    {
      error: {
        code,
        message,
        ...(retryAfterSeconds ? { retry_after_seconds: retryAfterSeconds } : {}),
      },
    },
    status,
  )
}