import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';
import { BillingService } from './billing.service';
import { CurrentUserId, USER_ID_HEADER } from './current-user';
import { PatchBillLinesDto, PreviewBillDto } from './dto/billing.dto';

@ApiTags('billing')
@ApiHeader({ name: USER_ID_HEADER, required: true })
@Controller('lobbies/:lobbyId/bill')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('draft')
  @ApiOperation({ summary: 'Admin draft: lines grouped by menu item' })
  draft(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.billing.draft(lobbyId, userId);
  }

  @Patch('lines')
  @ApiOperation({ summary: 'Admin batch-save prices and delivery flags' })
  patchLines(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
    @Body() dto: PatchBillLinesDto,
  ) {
    return this.billing.patchLines(lobbyId, userId, dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Admin totals preview (no writes)' })
  preview(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
    @Body() dto: PreviewBillDto,
  ) {
    return this.billing.preview(lobbyId, userId, dto);
  }

  @Post('finalise')
  @ApiOperation({ summary: 'Admin finalise bill and move to payment' })
  finalise(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
    @Body() dto: PreviewBillDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.billing.finalise(lobbyId, userId, dto, idempotencyKey);
  }

  @Post('reopen')
  @ApiOperation({ summary: 'Admin reopen bill back to arrived' })
  reopen(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.billing.reopen(lobbyId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Member-visible bill (full transparency)' })
  getBill(
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.billing.getBill(lobbyId, userId);
  }
}
