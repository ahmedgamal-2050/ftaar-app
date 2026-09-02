import { PaymentsController } from './payments.controller';
import { PaymentsService } from '../services/payments.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LOBBY_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';

describe('PaymentsController', () => {
  let service: jest.Mocked<
    Pick<
      PaymentsService,
      'getBoard' | 'claim' | 'confirm' | 'reject' | 'settle'
    >
  >;
  let controller: PaymentsController;

  beforeEach(() => {
    service = {
      getBoard: jest.fn(),
      claim: jest.fn(),
      confirm: jest.fn(),
      reject: jest.fn(),
      settle: jest.fn(),
    };
    controller = new PaymentsController(service as unknown as PaymentsService);
  });

  it('delegates getBoard to the service', async () => {
    await controller.getBoard(LOBBY_ID, USER_ID);
    expect(service.getBoard).toHaveBeenCalledWith(LOBBY_ID, USER_ID);
  });

  it('delegates claim with body and Idempotency-Key header', async () => {
    const dto = { note: 'sent', idempotencyKey: 'body-key' };
    await controller.claim(LOBBY_ID, USER_ID, dto, 'header-key');
    expect(service.claim).toHaveBeenCalledWith(
      LOBBY_ID,
      USER_ID,
      dto,
      'header-key',
    );
  });

  it('delegates confirm, reject, and settle to the service', async () => {
    const dto = { note: 'ok' };
    await controller.confirm(LOBBY_ID, MEMBER_ID, USER_ID, dto);
    await controller.reject(LOBBY_ID, MEMBER_ID, USER_ID, dto);
    await controller.settle(LOBBY_ID, USER_ID);

    expect(service.confirm).toHaveBeenCalledWith(
      LOBBY_ID,
      MEMBER_ID,
      USER_ID,
      dto,
    );
    expect(service.reject).toHaveBeenCalledWith(
      LOBBY_ID,
      MEMBER_ID,
      USER_ID,
      dto,
    );
    expect(service.settle).toHaveBeenCalledWith(LOBBY_ID, USER_ID);
  });
});
