import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { FinanceService } from './finance.service';

@Controller('api/admin/finance')
@UseGuards(AdminGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('payment-records')
  paymentRecords() {
    return this.finance.listPaymentRecords();
  }

  @Get('transactions')
  transactions() {
    return this.finance.listBalanceTransactions();
  }

  @Get('withdrawals')
  withdrawals() {
    return this.finance.listWithdrawalRecords();
  }
}
