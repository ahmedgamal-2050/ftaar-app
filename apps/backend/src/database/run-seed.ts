import dataSource from './data-source';
import { seedDatabase } from './seed';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedDatabase(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
