process.env['NODE_ENV'] ??= 'test';
process.env['PORT'] ??= '3000';
process.env['LOG_LEVEL'] ??= 'silent';
process.env['DATABASE_URL'] ??= 'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar';
process.env['JWT_SECRET'] ??= 'test-jwt-secret-16';
process.env['CORS_ORIGINS'] ??= 'http://localhost:3000';
process.env['BODY_LIMIT'] ??= '256kb';
process.env['SKIP_DB'] ??= 'true';
process.env['JWT_SECRET'] ??=
  'test-jwt-secret-must-be-at-least-32-characters!!';
process.env['EMAIL_OTP_SECRET'] ??=
  'test-email-otp-secret-must-be-at-least-32chars!!';
