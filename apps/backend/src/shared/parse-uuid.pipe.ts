import { Injectable, PipeTransform } from '@nestjs/common';
import { AppError } from '../core/errors/app-error';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseUuidPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID_V4.test(value)) {
      throw new AppError('VALIDATION_ERROR', 'Expected a UUID v4', {
        value,
      });
    }
    return value.toLowerCase();
  }
}
