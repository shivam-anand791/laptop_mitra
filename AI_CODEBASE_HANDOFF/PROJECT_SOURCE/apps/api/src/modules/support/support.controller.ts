import { Body, Controller, Delete, Get, Header, Param, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { DataSourceHeaderInterceptor } from '../../common/interceptors/data-source-header.interceptor';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';
import { CreateCorporateInquiryDto } from './dto/create-corporate-inquiry.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { UpdateRefundDetailsDto } from './dto/update-refund-details.dto';
import { ChangeRequestTypeEnum, CreateOrderChangeRequestDto, ReviewChangeRequestDto } from './dto/order-change-request.dto';
import {
  CreateBuybackRequestDto,
  SubmitBuybackInspectionDto,
  DispatchBuybackReturnDto,
  ProcessBuybackPayoutDto,
  UpdateBuybackSettingsDto,
  BuybackTierInputDto,
} from './dto/buyback.dto';
import { VoteHelpArticleDto } from './dto/vote-help-article.dto';
import {
  AdminTicketQueryDto,
  UpdateAdminTicketDto,
  AddInternalNoteDto,
  MergeTicketsDto,
  AdminReturnQueryDto,
  ProcessAdminReturnDto,
  ProcessAdminRefundDto,
  SavedReplyDto,
  CreateHelpCategoryDto,
  UpdateHelpCategoryDto,
  CreateHelpArticleDto,
  UpdateHelpArticleDto,
  UpdateSupportSettingsDto,
} from './dto/admin-support.dto';


@ApiTags('support')
@Controller('support')
@UseInterceptors(DataSourceHeaderInterceptor)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ---------------------------------------------------------------------------
  // Public Knowledge Base & Help Center Endpoints
  // ---------------------------------------------------------------------------

  @Post('corporate-inquiry')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit corporate procurement or fleet leasing inquiry' })
  @ApiResponse({ status: 201, description: 'Inquiry submitted successfully' })
  async createCorporateInquiry(@Body() dto: CreateCorporateInquiryDto) {
    return this.supportService.createCorporateInquiry(dto);
  }

  
  @Get('items/:orderItemId/situation')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get situation analysis and dynamic action catalog for an order item' })
  @ApiResponse({ status: 200, description: 'Item situation, eligible actions, and plain-language reasons' })
  async getItemSituation(
    @Param('orderItemId') orderItemId: string,
    @GetUser() user: any,
    @Query('platform') platform?: 'web' | 'mobile',
  ) {
    return this.supportService.getItemSituation(orderItemId, user?.id, user?.role, platform || 'web');
  }

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Get guided support flow categories and configuration' })
  @ApiResponse({ status: 200, description: 'Support flow configuration' })
  async getSupportConfig() {
    return this.supportService.getSupportConfig();
  }

  @Get('help/categories')
  @Public()
  @ApiOperation({ summary: 'Get all active help center categories' })
  @ApiResponse({ status: 200, description: 'List of help categories' })
  async getHelpCategories() {
    return this.supportService.getHelpCategories();
  }

  @Get('help/articles')
  @Public()
  @ApiOperation({ summary: 'Search and filter published help articles' })
  @ApiResponse({ status: 200, description: 'List of help articles' })
  async getHelpArticles(
    @Query('q') query?: string,
    @Query('category') categorySlug?: string,
  ) {
    return this.supportService.getHelpArticles(query, categorySlug);
  }

  @Get('help/articles/:slug')
  @Public()
  @ApiOperation({ summary: 'Get published help article by unique slug' })
  @ApiResponse({ status: 200, description: 'Help article details' })
  async getHelpArticleBySlug(@Param('slug') slug: string) {
    return this.supportService.getHelpArticleBySlug(slug);
  }

  @Post('help/articles/:id/vote')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Vote whether a help article was useful' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  async voteHelpArticle(
    @Param('id') id: string,
    @Body() dto: VoteHelpArticleDto,
  ) {
    return this.supportService.voteHelpArticle(id, dto.helpful);
  }

  // ---------------------------------------------------------------------------
  // Authenticated Customer Support Endpoints
  // ---------------------------------------------------------------------------

  @Get('tickets')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get all support tickets for current user' })
  @ApiResponse({ status: 200, description: 'Tickets list' })
  async getTickets(@GetUser() user: any) {
    return this.supportService.getUserTickets(user.id);
  }

  @Get('tickets/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get support ticket details and thread' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  async getTicket(@GetUser() user: any, @Param('id') id: string) {
    const isStaff = user.role === 'ADMIN' || user.role === 'SUPPORT';
    return this.supportService.getTicketById(id, user.id, isStaff);
  }

  @Post('tickets')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Support ticket created' })
  async createTicket(@GetUser() user: any, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Post('tickets/:id/messages')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Add a message / reply to ticket thread' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async addMessage(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    const role = user.role === 'ADMIN' ? 'ADMIN' : user.role === 'SUPPORT' ? 'SUPPORT' : 'CUSTOMER';
    return this.supportService.addMessage(id, user.id, dto.message, dto.attachments, role);
  }

  @Post('tickets/:id/reopen')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Reopen a resolved ticket within the configured window' })
  @ApiResponse({ status: 200, description: 'Ticket reopened' })
  async reopenTicket(@GetUser() user: any, @Param('id') id: string) {
    return this.supportService.reopenTicket(id, user.id);
  }

  @Post('tickets/:id/rate')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Submit Customer Satisfaction (CSAT) rating' })
  @ApiResponse({ status: 200, description: 'Rating recorded' })
  async rateTicket(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: RateTicketDto,
  ) {
    return this.supportService.rateTicket(id, user.id, dto.score, dto.comment);
  }

  // ---------------------------------------------------------------------------
  // Returns & Refunds Endpoints
  // ---------------------------------------------------------------------------

  @Post('returns')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Submit a return / replacement request' })
  @ApiResponse({ status: 201, description: 'Return request created' })
  async createReturnRequest(
    @GetUser() user: any,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.supportService.createReturnRequest(user.id, dto);
  }

  @Get('returns')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get all return requests for current user' })
  @ApiResponse({ status: 200, description: 'List of returns' })
  async getReturns(@GetUser() user: any) {
    return this.supportService.getUserReturns(user.id);
  }

  @Get('returns/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get return request details, timeline, and status' })
  @ApiResponse({ status: 200, description: 'Return request details' })
  async getReturnRequest(@GetUser() user: any, @Param('id') id: string) {
    const isStaff = user.role === 'ADMIN' || user.role === 'SUPPORT';
    return this.supportService.getReturnRequestById(id, user.id, isStaff);
  }

  @Put('returns/:id/refund-details')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update bank or UPI details for pending refund' })
  @ApiResponse({ status: 200, description: 'Refund details updated' })
  async updateRefundDetails(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRefundDetailsDto,
  ) {
    return this.supportService.updateRefundDetails(id, user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Warranty Status
  // ---------------------------------------------------------------------------

  @Get('warranty/:orderItemId')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get warranty status for an order item' })
  @ApiResponse({ status: 200, description: 'Warranty details' })
  async getWarrantyStatus(@GetUser() user: any, @Param('orderItemId') orderItemId: string) {
    return this.supportService.getWarrantyStatus(user.id, orderItemId);
  }

  // ---------------------------------------------------------------------------
  // Admin & Staff Endpoints
  // ---------------------------------------------------------------------------

  @Get('admin/tickets')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List and filter support tickets for admin/support staff' })
  async getAdminTickets(@Query() query: AdminTicketQueryDto) {
    return this.supportService.getAdminTickets(query);
  }

  @Get('admin/exports/tickets.csv')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="support-tickets.csv"')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Export support tickets as CSV (ADMIN only)' })
  async exportAdminTicketsCsv(@GetUser() admin: any) {
    return this.supportService.exportAdminTicketsCsv(admin.id);
  }

  @Get('admin/exports/returns.csv')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="support-returns.csv"')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Export return requests as CSV (ADMIN only)' })
  async exportAdminReturnsCsv(@GetUser() admin: any) {
    return this.supportService.exportAdminReturnsCsv(admin.id);
  }

  @Get('admin/tickets/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get full ticket details including order context and internal notes' })
  async getAdminTicketById(@Param('id') id: string) {
    return this.supportService.getTicketById(id, '', true);
  }

  @Put('admin/tickets/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update ticket status, priority, assignee, or category' })
  async updateAdminTicket(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAdminTicketDto,
  ) {
    return this.supportService.updateAdminTicket(id, user.id, user.role, dto);
  }

  @Post('admin/tickets/:id/notes')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Add internal staff-only note to ticket' })
  async addAdminInternalNote(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddInternalNoteDto,
  ) {
    return this.supportService.addMessage(id, user.id, dto.note, undefined, user.role, true);
  }

  @Post('admin/tickets/:id/merge')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Merge duplicate ticket into primary target ticket' })
  async mergeAdminTickets(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: MergeTicketsDto,
  ) {
    return this.supportService.mergeAdminTickets(id, dto.targetTicketId, user.id, user.role);
  }

  @Get('admin/staff')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List staff members available for ticket assignment' })
  async getAdminStaffUsers() {
    return this.supportService.getAdminStaffUsers();
  }

  @Get('admin/returns')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List and filter product return requests' })
  async getAdminReturns(@Query() query: AdminReturnQueryDto) {
    return this.supportService.getAdminReturns(query);
  }

  @Get('admin/returns/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get full return request details and inspection status' })
  async getAdminReturnById(@Param('id') id: string) {
    return this.supportService.getAdminReturnById(id);
  }

  @Put('admin/returns/:id/process')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Process return: approve/reject, schedule pickup, record inspection' })
  async processAdminReturn(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: ProcessAdminReturnDto,
  ) {
    return this.supportService.processAdminReturn(id, user.id, user.role, dto);
  }

  @Post('admin/returns/:id/refund')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process refund (Razorpay prepaid or COD manual payout) - ADMIN only' })
  async processAdminRefund(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: ProcessAdminRefundDto,
  ) {
    return this.supportService.processAdminRefund(id, user.id, dto);
  }

  @Get('admin/returns/:id/refund-details/decrypt')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Decrypt customer refund bank or UPI details (audited) - ADMIN only' })
  async decryptAdminRefundDetails(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.supportService.decryptAdminRefundDetails(id, user.id);
  }

  @Get(['admin/saved-replies', 'saved-replies'])
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get templated saved responses' })
  async getSavedReplies(@Query('category') category?: string) {
    return this.supportService.getSavedReplies(category);
  }

  @Post('admin/saved-replies')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Create new saved response template' })
  async createSavedReply(@Body() dto: SavedReplyDto) {
    return this.supportService.createSavedReply(dto);
  }

  @Put('admin/saved-replies/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update saved response template' })
  async updateSavedReply(
    @Param('id') id: string,
    @Body() dto: Partial<SavedReplyDto>,
  ) {
    return this.supportService.updateSavedReply(id, dto);
  }

  @Delete('admin/saved-replies/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Delete saved response template' })
  async deleteSavedReply(@Param('id') id: string) {
    return this.supportService.deleteSavedReply(id);
  }

  @Get('admin/help/categories')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List all help categories for manager' })
  async getAdminHelpCategories() {
    return this.supportService.getAdminHelpCategories();
  }

  @Post('admin/help/categories')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Create new help category' })
  async createAdminHelpCategory(@Body() dto: CreateHelpCategoryDto) {
    return this.supportService.createAdminHelpCategory(dto);
  }

  @Put('admin/help/categories/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update help category' })
  async updateAdminHelpCategory(
    @Param('id') id: string,
    @Body() dto: UpdateHelpCategoryDto,
  ) {
    return this.supportService.updateAdminHelpCategory(id, dto);
  }

  @Put('admin/help/categories/:id/archive')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Archive help category and unpublish its articles' })
  async archiveAdminHelpCategory(@Param('id') id: string) {
    return this.supportService.archiveAdminHelpCategory(id);
  }

  @Get('admin/help/articles')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List all help articles (published and drafts)' })
  async getAdminHelpArticles() {
    return this.supportService.getAdminHelpArticles();
  }

  @Post('admin/help/articles')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Create new help article with markdown content' })
  async createAdminHelpArticle(@Body() dto: CreateHelpArticleDto) {
    return this.supportService.createAdminHelpArticle(dto);
  }

  @Put('admin/help/articles/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update help article' })
  async updateAdminHelpArticle(
    @Param('id') id: string,
    @Body() dto: UpdateHelpArticleDto,
  ) {
    return this.supportService.updateAdminHelpArticle(id, dto);
  }

  @Put('admin/help/articles/:id/archive')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Unpublish and retain help article' })
  async archiveAdminHelpArticle(@Param('id') id: string) {
    return this.supportService.archiveAdminHelpArticle(id);
  }

  @Get(['admin/settings', 'settings'])
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get current support SLA and policy settings' })
  async getAdminSupportSettings() {
    return this.supportService.getAdminSupportSettings();
  }

  @Put(['admin/settings', 'settings'])
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update support SLA and policy settings - ADMIN only' })
  async updateAdminSupportSettings(
    @GetUser() user: any,
    @Body() dto: UpdateSupportSettingsDto,
  ) {
    return this.supportService.updateAdminSupportSettings(user.id, dto);
  }

  @Get('admin/reports')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get support metrics, CSAT scores, and ticket trends' })
  async getAdminSupportReports() {
    return this.supportService.getAdminSupportReports();
  }

  // --- SPRINT NEED HELP ROUTES ---
  // ---------------------------------------------------------------------------
  // Customer Order Change Requests
  // ---------------------------------------------------------------------------
  @Post('change-requests')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Submit order address/phone change request before dispatch' })
  async createChangeRequest(@GetUser() user: any, @Body() dto: CreateOrderChangeRequestDto) {
    return this.supportService.createOrderChangeRequest(user.id, dto);
  }

  @Get('change-requests')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get customer order change requests' })
  async getCustomerChangeRequests(@GetUser() user: any, @Query('orderId') orderId?: string) {
    return this.supportService.getCustomerChangeRequests(user.id, orderId);
  }

  // ---------------------------------------------------------------------------
  // Customer Buyback Requests
  // ---------------------------------------------------------------------------
  @Get('buyback/config')
  @Public()
  @ApiOperation({ summary: 'Get active buyback guarantee tiers and policies' })
  async getBuybackConfig() {
    return this.supportService.getBuybackSettingsAndTiers();
  }

  @Post('buyback/requests')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Submit buyback claim with condition checklist and quote acceptance' })
  async createBuybackRequest(@GetUser() user: any, @Body() dto: CreateBuybackRequestDto) {
    return this.supportService.createBuybackRequest(user.id, dto);
  }

  @Get('buyback/requests')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get customer buyback requests' })
  async getCustomerBuybacks(@GetUser() user: any, @Query('orderId') orderId?: string) {
    return this.supportService.getCustomerBuybacks(user.id, orderId);
  }

  @Get('buyback/requests/:id')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get buyback request details and tracking history' })
  async getBuybackById(@GetUser() user: any, @Param('id') id: string) {
    const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPPORT';
    return this.supportService.getBuybackById(id, user?.id, isStaff);
  }

  @Post('buyback/requests/:id/accept-revised')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Customer accepts revised buyback offer after inspection' })
  async acceptRevisedBuybackOffer(@GetUser() user: any, @Param('id') id: string) {
    return this.supportService.acceptRevisedOffer(id, user.id);
  }

  @Post('buyback/requests/:id/decline-revised')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Customer declines revised offer; laptop returned free of charge' })
  async declineRevisedBuybackOffer(@GetUser() user: any, @Param('id') id: string) {
    return this.supportService.declineRevisedOffer(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Admin Change Requests
  // ---------------------------------------------------------------------------
  @Get('admin/change-requests')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List and filter order change requests' })
  async getAdminChangeRequests(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getAdminChangeRequests({ status, type, page, limit });
  }

  @Put('admin/change-requests/:id/review')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Approve or reject an order change request' })
  async reviewChangeRequest(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewChangeRequestDto,
  ) {
    return this.supportService.reviewChangeRequest(id, admin.id, dto);
  }

  @Post('admin/change-requests/:id/apply')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Apply approved change request to order (idempotent, ADMIN only)' })
  async applyChangeRequest(@GetUser() admin: any, @Param('id') id: string) {
    return this.supportService.applyChangeRequest(id, admin.id);
  }

  // ---------------------------------------------------------------------------
  // Admin Buyback Operations
  // ---------------------------------------------------------------------------
  @Get('admin/buyback')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List and search buyback requests' })
  async getAdminBuybacks(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getAdminBuybacks({ status, search, page, limit });
  }

  @Get('admin/buyback/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get buyback details for staff' })
  async getAdminBuybackById(@Param('id') id: string) {
    return this.supportService.getBuybackById(id, '', true);
  }

  @Put('admin/buyback/:id/status')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Update buyback lifecycle status' })
  async updateAdminBuybackStatus(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.supportService.updateBuybackStatus(id, admin.id, status, notes);
  }

  @Post('admin/buyback/:id/inspect')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Submit warehouse physical inspection results' })
  async submitBuybackInspection(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: SubmitBuybackInspectionDto,
  ) {
    return this.supportService.submitBuybackInspection(id, admin.id, dto);
  }

  @Post('admin/buyback/:id/return-shipment')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Dispatch return shipment back to customer free of charge' })
  async dispatchBuybackReturn(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: DispatchBuybackReturnDto,
  ) {
    return this.supportService.dispatchBuybackReturn(id, admin.id, dto);
  }

  @Post('admin/buyback/:id/payout')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Record buyback payout completion with UTR (ADMIN only)' })
  async processBuybackPayout(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ProcessBuybackPayoutDto,
  ) {
    return this.supportService.processBuybackPayout(id, admin.id, dto);
  }

  @Get('admin/buyback/:id/payout/decrypt')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Decrypt customer bank/UPI payout details (audited, ADMIN only)' })
  async decryptBuybackPayout(@GetUser() admin: any, @Param('id') id: string) {
    return this.supportService.decryptAdminBuybackPayout(id, admin.id);
  }

  @Get('admin/buyback-settings')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get buyback settings and tier matrix' })
  async getAdminBuybackSettings() {
    return this.supportService.getAdminBuybackSettings();
  }

  @Put('admin/buyback-settings')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update buyback policy settings (ADMIN only)' })
  async updateAdminBuybackSettings(
    @GetUser() admin: any,
    @Body() dto: UpdateBuybackSettingsDto,
  ) {
    return this.supportService.updateAdminBuybackSettings(admin.id, dto);
  }

  @Put('admin/buyback-tiers')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update buyback valuation tier matrix (ADMIN only)' })
  async updateAdminBuybackTiers(
    @GetUser() admin: any,
    @Body() tiers: BuybackTierInputDto[],
  ) {
    return this.supportService.updateAdminBuybackTiers(admin.id, tiers);
  }

  // ---------------------------------------------------------------------------
  // Corporate Business Profile & Notes
  // ---------------------------------------------------------------------------
  @Get('business-profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated customer business profile' })
  async getMyBusinessProfile(@GetUser() user: any) {
    return this.supportService.getBusinessProfile(user.id);
  }

  @Get('admin/users/:userId/business-profile')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get business profile for a corporate client' })
  async getBusinessProfile(@Param('userId') userId: string) {
    return this.supportService.getBusinessProfile(userId);
  }

  @Put('admin/users/:userId/business-profile')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Upsert corporate business profile (ADMIN only)' })
  async upsertBusinessProfile(
    @GetUser() admin: any,
    @Param('userId') userId: string,
    @Body() dto: any,
  ) {
    return this.supportService.upsertBusinessProfile(admin.id, userId, dto);
  }

  @Get('admin/users/:userId/notes')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Get immutable staff client notes for a customer' })
  async getClientNotes(@Param('userId') userId: string) {
    return this.supportService.getClientNotes(userId);
  }

  @Post('admin/users/:userId/notes')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Add immutable staff note for a customer' })
  async createClientNote(
    @GetUser() user: any,
    @Param('userId') userId: string,
    @Body('note') note: string,
  ) {
    return this.supportService.createClientNote(user.id, user.name, user.role, userId, note);
  }
}
