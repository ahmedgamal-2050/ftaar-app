import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentBoardYouDto {
  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  amountOwed!: string;

  @ApiProperty({ enum: ['unpaid', 'pending', 'paid', 'failed'] })
  paymentStatus!: string;

  @ApiProperty()
  isAdmin!: boolean;
}

export class PaymentBoardMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  role!: string;

  @ApiProperty()
  total!: string;

  @ApiProperty({ enum: ['unpaid', 'pending', 'paid', 'failed'] })
  paymentStatus!: string;

  @ApiPropertyOptional({ nullable: true })
  pendingClaimId!: string | null;
}

export class PaymentBoardDto {
  @ApiProperty()
  lobbyId!: string;

  @ApiProperty({ enum: ['billed', 'settled'] })
  status!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  instaPayHandle!: string | null;

  @ApiProperty()
  collected!: string;

  @ApiProperty()
  grandTotal!: string;

  @ApiProperty({ type: PaymentBoardYouDto })
  you!: PaymentBoardYouDto;

  @ApiProperty({ type: [PaymentBoardMemberDto] })
  members!: PaymentBoardMemberDto[];

  @ApiProperty({ type: [String] })
  waitingOn!: string[];
}

export class PaymentBoardSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PaymentBoardDto })
  data!: PaymentBoardDto;
}
