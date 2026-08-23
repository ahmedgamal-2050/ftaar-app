import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_FILES: Record<string, string> = {
  DATABASE_URL: 'database_url',
  JWT_SECRET: 'jwt_secret',
};

/**
 * Load DB and JWT secrets from a secret store (Docker /run/secrets or *_FILE)
 * rather than committed env files. Existing env vars win only when no secret file exists.
 */
export function hydrateSecretsFromStore(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const secretsDir = env['SECRETS_DIR'] ?? '/run/secrets';
  for (const [name, fileName] of Object.entries(SECRET_FILES)) {
    const explicitFile = env[`${name}_FILE`];
    const filePath = explicitFile ?? join(secretsDir, fileName);
    if (existsSync(filePath)) {
      env[name] = readFileSync(filePath, 'utf8').trim();
    }
  }
}
