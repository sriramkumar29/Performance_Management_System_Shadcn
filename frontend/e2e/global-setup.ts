import type { FullConfig } from '@playwright/test'
import TestDataManager from './utils/test-data-manager'

async function waitForBackend(url: string, timeoutMs: number) {
  const start = Date.now()
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  let lastErr: unknown = null

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
      lastErr = new Error(`Backend responded with status ${res.status}`)
    } catch (e) {
      lastErr = e
    }
    await sleep(500)
  }

  const err = lastErr instanceof Error ? lastErr.message : String(lastErr)
  throw new Error(
    `Backend at ${url} is not reachable. Ensure FastAPI is running on port 7000 and DB is available.\n` +
      `Tips:\n` +
      `  1) Activate Python venv in backend and run: uvicorn main:app --host 0.0.0.0 --port 7000\n` +
      `  2) Seed DB (once): python seed_data.py\n` +
      `Last error: ${err}`
  )
}

export default async function globalSetup(_config: FullConfig) {
  const backendBase = process.env.BACKEND_URL || 'http://localhost:7000'
  
  console.log('🔍 Checking backend availability...')
  
  // Use the public root endpoint that doesn't require auth
  await waitForBackend(`${backendBase}/`, 30000)
  
  console.log('✅ Backend is available')

  // Setup test data for consistent E2E testing
  console.log('🛠️ Setting up test environment...')
  try {
    const testDataManager = new TestDataManager(backendBase)
    await testDataManager.setupTestEnvironment()
    console.log('✅ Test environment ready')
  } catch (error) {
    console.warn('⚠️ Test data setup failed, continuing with existing data:', error)
  }
}
