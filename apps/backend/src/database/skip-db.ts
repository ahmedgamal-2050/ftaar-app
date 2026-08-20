export function shouldSkipDatabase(): boolean {
  return (
    process.argv.includes('--export-openapi') ||
    process.env['SKIP_DB'] === 'true'
  );
}
