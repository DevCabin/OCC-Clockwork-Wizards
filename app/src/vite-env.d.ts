/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AMAZON_ACCESS_KEY: string
  readonly VITE_AMAZON_SECRET_KEY: string
  readonly VITE_AMAZON_ASSOCIATE_TAG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
