import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.options';

loadEnv({ path: join(__dirname, '../../.env') });
loadEnv({ path: join(__dirname, '../../../.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('Missing or invalid environment variable(s): DATABASE_URL');
  process.exit(1);
}

export default new DataSource(buildTypeOrmOptions(databaseUrl));
