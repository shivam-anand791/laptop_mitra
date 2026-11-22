import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DiscountService } from '../discount/discount.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import {
  BulkGenerateCouponsDto,
  CouponStatus,
  CreateCouponDto,
  UpdateCouponDto,
} from '../discount/dto/coupon.dto';
import { RequiresSchema } from '../../common/guards/schema-gate.guard';

@ApiTags('admin-coupons')
@RequiresSchema('coupons')
@Controller('admin/coupons')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminCouponController {
  constructor(private readonly discountService: DiscountService) {}

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all discount coupons with filtering & search' })
  @ApiResponse({ status: 200, description: 'Paginated coupons list' })
  async listCoupons(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountService.listAdminCoupons({ status, search, page, limit });
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  async createCoupon(@GetUser() user: any, @Body() dto: CreateCouponDto) {
    return this.discountService.createCoupon(user.id, dto);
  }

  @Get('export')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export coupons to CSV format' })
  async exportCsv(@Res() res: Response) {
    const csvData = await this.discountService.exportCouponsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="laptopmitra-coupons-${Date.now()}.csv"`);
    return res.status(200).send(csvData);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get details of a specific coupon' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  async getCoupon(@Param('id') id: string) {
    return this.discountService.getAdminCoupon(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an existing coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  async updateCoupon(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.discountService.updateCoupon(user.id, id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Pause, activate, or archive a coupon' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body('status') status: CouponStatus,
  ) {
    return this.discountService.updateCouponStatus(user.id, id, status);
  }

  @Post('bulk-generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk generate single-use coupon codes' })
  @ApiResponse({ status: 201, description: 'Coupons generated' })
  async bulkGenerate(@GetUser() user: any, @Body() dto: BulkGenerateCouponsDto) {
    return this.discountService.bulkGenerateCoupons(user.id, dto);
  }

  @Get(':id/redemptions')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get redemption log for a coupon with masked user data' })
  @ApiResponse({ status: 200, description: 'Redemption log' })
  async getRedemptions(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discountService.getCouponRedemptions(id, page, limit);
  }
}

