import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('support')
@Controller('support')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('CUSTOMER', 'ADMIN')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Get all support tickets for current user' })
  @ApiResponse({ status: 200, description: 'Tickets list' })
  async getTickets(@GetUser() user: any) {
    return this.supportService.getUserTickets(user.id);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get support ticket details and thread' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  async getTicket(@GetUser() user: any, @Param('id') id: string) {
    return this.supportService.getTicketById(id, user.id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Support ticket created' })
  async createTicket(
    @GetUser() user: any,
    @Body()
    body: {
      subject: string;
      orderId?: string;
      message: string;
      category?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    },
  ) {
    return this.supportService.createTicket(user.id, body);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message / reply to ticket thread' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async addMessage(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() body: { message: string; attachments?: string[] },
  ) {
    return this.supportService.addMessage(id, user.id, body.message, body.attachments);
  }

  @Get('warranty/:orderItemId')
  @ApiOperation({ summary: 'Get warranty status for an order item' })
  @ApiResponse({ status: 200, description: 'Warranty details' })
  async getWarrantyStatus(@GetUser() user: any, @Param('orderItemId') orderItemId: string) {
    return this.supportService.getWarrantyStatus(user.id, orderItemId);
  }
}
