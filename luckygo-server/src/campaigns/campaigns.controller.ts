import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { CampaignsService } from './campaigns.service';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  findForHome(@Query('categoryId') categoryId?: string) {
    const parsed =
      categoryId != null && categoryId !== '' && categoryId !== 'all'
        ? Number(categoryId)
        : undefined;
    const safeId =
      parsed != null && Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
    return this.campaigns.findPublicForHome(safeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.findOnePublic(id);
  }
}

@Controller('api/admin/campaigns')
@UseGuards(AdminGuard)
export class AdminCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('roundNo') roundNo?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.campaigns.findAllAdmin({
      productId: productId ? Number(productId) : undefined,
      status,
      roundNo,
      createdFrom,
      createdTo,
    });
  }

  @Get(':id/numbers/summary')
  numbersSummary(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.getNumbersSummary(id);
  }

  @Get(':id/numbers')
  listNumbers(
    @Param('id', ParseIntPipe) id: number,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.campaigns.listNumbers(id, {
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Get(':id/lookup')
  lookup(
    @Param('id', ParseIntPipe) id: number,
    @Query('number') number: string,
  ) {
    return this.campaigns.lookupNumber(id, number);
  }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.findOneAdmin(id);
  }

  @Post()
  create(
    @Body()
    body: {
      productId: number;
      roundNo?: number;
      totalShares?: number;
      pricePerShare?: number;
      autoDrawOnSellout?: boolean;
      autoDrawCountdownSeconds?: number;
      saleStartAt?: string | null;
      saleEndAt?: string | null;
    },
  ) {
    return this.campaigns.create(body.productId, body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      autoDrawOnSellout?: boolean;
      autoDrawCountdownSeconds?: number;
      saleStartAt?: string | null;
      saleEndAt?: string | null;
    },
  ) {
    return this.campaigns.update(id, body);
  }

  @Put(':id/designate')
  designate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { designatedWinningNumber?: string | null },
  ) {
    return this.campaigns.setDesignatedWinningNumber(id, body.designatedWinningNumber ?? null);
  }

  @Post(':id/generate-numbers')
  generateNumbers(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.generateNumbers(id);
  }

  @Post(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.publish(id);
  }

  @Post(':id/draw')
  draw(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.draw(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.campaigns.cancel(id);
  }

}
