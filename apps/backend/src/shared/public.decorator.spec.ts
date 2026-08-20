import { Get, Controller } from '@nestjs/common';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('@Public()', () => {
  it('sets isPublic metadata on a handler', () => {
    @Controller()
    class DemoController {
      @Public()
      @Get()
      ping(): string {
        return 'ok';
      }
    }

    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      DemoController.prototype.ping,
    );
    expect(metadata).toBe(true);
  });
});
