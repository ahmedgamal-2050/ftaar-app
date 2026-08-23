import { Injectable, PipeTransform } from '@nestjs/common';
import { Money } from '../money/money';

@Injectable()
export class MoneyPipe implements PipeTransform<unknown, Money> {
  transform(value: unknown): Money {
    if (value instanceof Money) {
      return value;
    }
    return Money.fromEgpString(value);
  }
}
