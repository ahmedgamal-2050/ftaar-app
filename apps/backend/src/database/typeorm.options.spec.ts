import { buildTypeOrmOptions } from './typeorm.options';

describe('TypeORM options (DB-01)', () => {
  it('never enables synchronize', () => {
    const options = buildTypeOrmOptions(
      'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar',
    );
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });
});
