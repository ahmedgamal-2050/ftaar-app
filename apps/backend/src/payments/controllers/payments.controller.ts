import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../shared/parse-uuid.pipe';
import { ClaimPaymentDto, ResolveClaimDto } from '../dto/claim-payment.dto';
import { PaymentBoardSuccessResponseDto } from '../dto/payment-board-response.dto';
import { PaymentsService } from '../services/payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@Controller('lobbies/:lobbyId/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Payment board: balances, InstaPay handle, who has paid',
  })
  @ApiOkResponse({ type: PaymentBoardSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby members only' })
  @ApiNotFoundResponse({ description: 'Lobby or bill not found' })
  @ApiConflictResponse({ description: 'Lobby is not billed or settled' })
  getBoard(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.payments.getBoard(lobbyId, userId);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Member claims they paid the host via InstaPay (honor system)',
  })
  @ApiOkResponse({ type: PaymentBoardSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Host cannot claim; members only' })
  @ApiConflictResponse({
    description: 'Not in payment, already paid, or lobby settled',
  })
  @ApiBody({ type: ClaimPaymentDto })
  claim(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ClaimPaymentDto = {},
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.payments.claim(lobbyId, userId, dto ?? {}, idempotencyKey);
  }

  @Post('members/:memberId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin confirms a pending payment claim' })
  @ApiOkResponse({ type: PaymentBoardSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby admin only' })
  @ApiConflictResponse({ description: 'No pending claim, or lobby settled' })
  confirm(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ResolveClaimDto = {},
  ) {
    return this.payments.confirm(lobbyId, memberId, userId, dto ?? {});
  }

  @Post('members/:memberId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin rejects a pending payment claim' })
  @ApiOkResponse({ type: PaymentBoardSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby admin only' })
  @ApiConflictResponse({ description: 'No pending claim, or lobby settled' })
  reject(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Param('memberId', ParseUuidPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ResolveClaimDto = {},
  ) {
    return this.payments.reject(lobbyId, memberId, userId, dto ?? {});
  }

  @Post('settle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin settles the lobby once every owing member is paid',
  })
  @ApiOkResponse({ type: PaymentBoardSuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Lobby admin only' })
  @ApiConflictResponse({
    description: 'Members still unpaid, or already settled',
  })
  settle(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.payments.settle(lobbyId, userId);
  }
}
