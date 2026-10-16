import { createBrowserClient } from '@supabase/ssr'

let browserClient

export function createClient() {
  const create = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )

  if (typeof window === 'undefined') {
    return create()
  }

  if (!browserClient) {
    browserClient = create()
  }

  return browserClient
}
