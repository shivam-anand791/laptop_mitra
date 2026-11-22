import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaseService } from './lease.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { GetUser } from '../../decorators/get-user.decorator';

@ApiTags('lease')
@Controller('lease')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get('contracts')
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Get all lease contracts for authenticated user' })
  async getMyContracts(@GetUser('id') userId: string) {
    return this.leaseService.getCustomerContracts(userId);
  }

  @Get('contracts/:id')
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Get single lease contract detail' })
  async getContract(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.leaseService.getContractById(id, userId, role);
  }

  @Post('contracts/:id/buyout-request')
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Request lease buyout quote' })
  async requestBuyout(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    return this.leaseService.requestBuyout(id, userId);
  }
}

