// Runs once when the Next.js server starts (not at build time).
// Validates all required environment variables and fails fast with a clear error.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
}
