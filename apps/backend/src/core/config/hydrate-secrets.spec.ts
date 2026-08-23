import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hydrateSecretsFromStore } from './hydrate-secrets';

describe('hydrateSecretsFromStore', () => {
  it('reads DATABASE_URL and JWT_SECRET from a secrets directory', () => {
    const dir = join(tmpdir(), `ftaar-secrets-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'database_url'), 'postgres://from-store/db\n');
    writeFileSync(join(dir, 'jwt_secret'), 'store-jwt\n');
    const env: NodeJS.ProcessEnv = { SECRETS_DIR: dir };
    hydrateSecretsFromStore(env);
    expect(env['DATABASE_URL']).toBe('postgres://from-store/db');
    expect(env['JWT_SECRET']).toBe('store-jwt');
    expect(existsSync(dir)).toBe(true);
  });

  it('prefers *_FILE over the default secrets directory', () => {
    const dir = join(tmpdir(), `ftaar-secrets-file-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const jwtFile = join(dir, 'custom-jwt');
    writeFileSync(jwtFile, 'file-jwt');
    const env: NodeJS.ProcessEnv = { JWT_SECRET_FILE: jwtFile };
    hydrateSecretsFromStore(env);
    expect(env['JWT_SECRET']).toBe('file-jwt');
  });
});
