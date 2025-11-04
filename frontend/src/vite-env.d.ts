/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MICROSOFT_CLIENT_ID: string
    readonly VITE_MICROSOFT_TENANT_ID: string
    readonly VITE_MICROSOFT_REDIRECT_URI: string
    // Add other env variables as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
