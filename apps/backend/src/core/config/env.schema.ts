import Joi from 'joi';
import { hydrateSecretsFromStore } from './hydrate-secrets';

export const NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface EnvVars {
  NODE_ENV: NodeEnv;
  PORT: number;
  LOG_LEVEL: LogLevel;
  DATABASE_URL: string;
  JWT_SECRET: string;
  CORS_ORIGINS: string;
  BODY_LIMIT: string;
}

export class ConfigValidationError extends Error {
  constructor(public readonly names: string[]) {
    super(`Missing or invalid environment variable(s): ${names.join(', ')}`);
    this.name = 'ConfigValidationError';
  }
}

export const envSchema = Joi.object<EnvVars>({
  NODE_ENV: Joi.string()
    .valid(...NODE_ENVS)
    .required(),
  PORT: Joi.number().port().required(),
  LOG_LEVEL: Joi.string()
    .valid(...LOG_LEVELS)
    .default('info'),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000')
    .custom((value: string, helpers) => {
      const origins = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (origins.length === 0) {
        return helpers.error('any.invalid');
      }
      return origins.join(',');
    }, 'cors origins'),
  BODY_LIMIT: Joi.string().default('256kb'),
});

function missingNames(error: Joi.ValidationError): string[] {
  return [
    ...new Set(
      error.details.map((detail) =>
        String(
          detail.context?.['key'] ?? detail.path.join('.') ?? detail.message,
        ),
      ),
    ),
  ];
}

/** Throws with the env var names; used by tests. */
export function parseEnv(config: Record<string, unknown>): EnvVars {
  const { error, value } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });
  if (error) {
    throw new ConfigValidationError(missingNames(error));
  }
  return value;
}

/**
 * Nest ConfigModule validate hook.
 * Missing/invalid vars are printed by name and the process exits non-zero.
 */
export function validateEnv(config: Record<string, unknown>): EnvVars {
  hydrateSecretsFromStore();
  try {
    return parseEnv({ ...process.env, ...config });
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}
