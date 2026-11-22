import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaseService } from './lease.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { GetUser } from '../../decorators/get-user.decorator';

@ApiTags('admin-lease')
@Controller('admin/lease')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class AdminLeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get('contracts')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Admin list all lease contracts' })
  async getContracts(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaseService.getAdminContracts({ status, search, page, limit });
  }

  @Get('contracts/:id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Admin get lease contract detail' })
  async getContract(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.leaseService.getContractById(id, userId, role);
  }

  @Put('contracts/:id/buyout-quote')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin issue manual buyout quote' })
  async setBuyoutQuote(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() body: { quoteAmount: number; validityDays?: number },
  ) {
    return this.leaseService.setBuyoutQuote(id, adminId, body);
  }

  @Post('contracts/:id/buyout-complete')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin complete lease buyout' })
  async completeBuyout(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() body: { paymentReference: string; finalAmount?: number },
  ) {
    return this.leaseService.completeBuyout(id, adminId, body);
  }

  @Post('contracts/:id/terminate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin terminate lease contract' })
  async terminateContract(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.leaseService.terminateContract(id, adminId, body.reason || 'Terminated by staff');
  }
}

