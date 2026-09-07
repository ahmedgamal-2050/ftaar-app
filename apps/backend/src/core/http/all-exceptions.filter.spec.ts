import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../errors/app-error';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ValidationException } from '../validation';

function hostWithMocks() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url: '/api/test', header: () => undefined };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  const appConfig = { isProduction: false } as AppConfigService;
  const filter = new AllExceptionsFilter(appConfig);

  it('renders AppError in the envelope', () => {
    const { host, json, status } = hostWithMocks();
    filter.catch(new AppError('NOT_FOUND', 'missing'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'missing',
        }),
      }),
    );
  });

  it('renders HttpException in the same envelope', () => {
    const { host, json, status } = hostWithMocks();
    filter.catch(new HttpException('nope', HttpStatus.FORBIDDEN), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json.mock.calls[0]?.[0]).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN', message: 'nope' },
    });
  });

  it('renders validation errors as 422 with errors array', () => {
    const { host, json, status } = hostWithMocks();
    filter.catch(
      new ValidationException([
        {
          path: 'name',
          code: 'REQUIRED',
          message: 'Name is required',
        },
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: [
        {
          path: 'name',
          code: 'REQUIRED',
          message: 'Name is required',
        },
      ],
    });
  });

  it('renders unknown throws as INTERNAL_ERROR', () => {
    const { host, json, status } = hostWithMocks();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.mock.calls[0]?.[0]).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'boom' },
    });
  });
});
