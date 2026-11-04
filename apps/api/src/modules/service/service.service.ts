import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { BookServiceDto } from './dto/book-service.dto';
import { RescheduleServiceDto } from './dto/reschedule-service.dto';
import { CancelServiceDto } from './dto/cancel-service.dto';
import { UpdateServiceJobDto } from './dto/update-service-job.dto';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Helper: Generate unique human-readable job number using Postgres sequence
   */
  private async getNextJobNumber(tx: any): Promise<string> {
    const [result]: any = await tx.$queryRaw`SELECT nextval('service_job_seq') as seq`;
    const seqNum = Number(result.seq);
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `SRV-${yyyymm}-${String(seqNum).padStart(5, '0')}`;
  }

  /**
   * Helper: Generate unique human-readable receipt number using Postgres sequence
   */
  private async getNextReceiptNumber(tx: any): Promise<string> {
    const [result]: any = await tx.$queryRaw`SELECT nextval('service_receipt_seq') as seq`;
    const seqNum = Number(result.seq);
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `RCP-${yyyymm}-${String(seqNum).padStart(5, '0')}`;
  }

  /**
   * Helper: Append immutable audit event to ServiceEvent ledger
   */
  private async createEvent(
    tx: any,
    params: {
      jobId: string;
      actorId: string;
      actorRole: string;
      eventType: string;
      oldStatus?: string | null;
      newStatus?: string | null;
      notes?: string | null;
      metadata?: any;
    },
  ) {
    return tx.serviceEvent.create({
      data: {
        jobId: params.jobId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        eventType: params.eventType,
        oldStatus: params.oldStatus || null,
        newStatus: params.newStatus || null,
        notes: params.notes || null,
        metadata: params.metadata || undefined,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Customer Account Queries
  // -------------------------------------------------------------------------

  /**
   * Get all laptops owned by user with warranty coverage, entitlement, and active jobs
   */
  async getUserLaptops(userId: string) {
    const units = await this.prisma.soldUnit.findMany({
      where: {
        userId,
        status: { notIn: ['REFUNDED', 'RETURNED'] },
      },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        warrantyCoverage: true,
        entitlements: {
          orderBy: { periodEnd: 'desc' },
        },
        serviceJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return units.map((unit) => {
      // Find active or available entitlement (outright or active lease monthly)
      const entitlement =
        unit.entitlements.find(
          (e) => (e.kind === 'OUTRIGHT_FREE' || e.kind === 'LEASE_MONTHLY') && e.status === 'AVAILABLE',
        ) ||
        unit.entitlements.find(
          (e) => e.kind === 'OUTRIGHT_FREE' || e.kind === 'LEASE_MONTHLY',
        );

      let serviceStatus = 'NOT_ELIGIBLE';
      if (entitlement) {
        if (entitlement.status === 'AVAILABLE') {
          serviceStatus =
            new Date(entitlement.periodEnd) > now ? 'AVAILABLE' : 'EXPIRED';
        } else if (entitlement.status === 'BOOKED') {
          serviceStatus = 'BOOKED';
        } else if (entitlement.status === 'USED') {
          serviceStatus = 'USED';
        } else {
          serviceStatus = entitlement.status;
        }
      }

      const activeJob = unit.serviceJobs.find(
        (j) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(j.status),
      );

      return {
        id: unit.id,
        serialNumber: unit.serialNumber,
        brand: unit.brandSnapshot,
        model: unit.modelSnapshot,
        productName: unit.product?.name || unit.modelSnapshot,
        image: unit.product?.images?.[0]?.url || null,
        orderId: unit.orderItem?.order?.id,
        orderNumber: unit.orderItem?.order?.orderNumber,
        dispatchedAt: unit.dispatchedAt,
        unitStatus: unit.status,
        warrantyCoverage: unit.warrantyCoverage,
        serviceEntitlement: entitlement || null,
        serviceStatus,
        activeJob: activeJob || null,
      };
    });
  }

  /**
   * Get 360 view for a customer's specific laptop unit
   */
  async getLaptopDetails(userId: string, unitId: string, userRole?: string) {
    const unit = await this.prisma.soldUnit.findUnique({
      where: { id: unitId },
      include: {
        product: {
          include: {
            images: true,
          },
        },
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                createdAt: true,
              },
            },
          },
        },
        warrantyCoverage: true,
        entitlements: {
          orderBy: { periodEnd: 'desc' },
        },
        serviceJobs: {
          include: {
            events: {
              orderBy: { createdAt: 'asc' },
            },
            technician: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Laptop unit not found');
    }

    if (userRole !== 'ADMIN' && unit.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this laptop unit');
    }

    const now = new Date();
    const outrightEntitlement = unit.entitlements.find(
      (e) => e.kind === 'OUTRIGHT_FREE',
    );

    let serviceStatus = 'NOT_ELIGIBLE';
    if (outrightEntitlement) {
      if (outrightEntitlement.status === 'AVAILABLE') {
        serviceStatus =
          new Date(outrightEntitlement.periodEnd) > now
            ? 'AVAILABLE'
            : 'EXPIRED';
      } else if (outrightEntitlement.status === 'BOOKED') {
        serviceStatus = 'BOOKED';
      } else if (outrightEntitlement.status === 'USED') {
        serviceStatus = 'USED';
      } else {
        serviceStatus = outrightEntitlement.status;
      }
    }

    return {
      ...unit,
      serviceStatus,
      outrightEntitlement: outrightEntitlement || null,
    };
  }

  // -------------------------------------------------------------------------
  // Booking Lifecycle State Machine
  // -------------------------------------------------------------------------

  /**
   * Book a free general service with PostgreSQL row lock protection
   */
  async bookService(
    userId: string,
    userRole: string,
    unitId: string,
    dto: BookServiceDto,
  ) {
    const result: any = await this.prisma.$transaction(async (tx) => {
      // 1. Verify Unit
      const unit = await tx.soldUnit.findUnique({
        where: { id: unitId },
        include: {
          product: true,
        },
      });

      if (!unit) {
        throw new NotFoundException('Laptop unit not found');
      }

      if (userRole !== 'ADMIN' && unit.userId !== userId) {
        throw new ForbiddenException('You do not own this laptop unit');
      }

      // 2. Concurrency-safe lock on AVAILABLE entitlement
      const [lockedEntitlement]: any = await tx.$queryRaw`
        SELECT * FROM "ServiceEntitlement"
        WHERE "soldUnitId" = ${unitId}
          AND "status" = 'AVAILABLE'
          AND "periodEnd" > NOW()
        ORDER BY "periodEnd" ASC
        LIMIT 1
        FOR UPDATE
      `;

      if (!lockedEntitlement) {
        throw new BadRequestException(
          'No available free service entitlement for this laptop. The 6-month entitlement may have expired or already been booked.',
        );
      }

      // 3. Ensure no concurrent active service job for this unit
      const existingActiveJob = await tx.serviceJob.findFirst({
        where: {
          soldUnitId: unitId,
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'REJECTED'],
          },
        },
      });

      if (existingActiveJob) {
        throw new ConflictException(
          `There is already an active service booking (${existingActiveJob.jobNumber}) for this laptop.`,
        );
      }

      // 4. Validate coverage pincode (supports exact 6-digit or regional prefixes e.g. '560', '110')
      const settings = await tx.serviceSettings.findUnique({ where: { id: 'default' } });
      const allowedPincodes: string[] = (settings?.serviceAreaPincodes as string[]) || [];
      const isAllowedPincode =
        allowedPincodes.length === 0 ||
        !dto.pickupPincode ||
        allowedPincodes.some(
          (p) => dto.pickupPincode === p || dto.pickupPincode.startsWith(p),
        );

      if (!isAllowedPincode) {
        throw new BadRequestException(
          `Free doorstep service is currently operational in select areas. Pincode ${dto.pickupPincode} is outside current coverage. Please contact support.`,
        );
      }

      // 5. Sequence-based reference number
      const jobNumber = await this.getNextJobNumber(tx);

      // 6. Transition entitlement status to BOOKED
      await tx.serviceEntitlement.update({
        where: { id: lockedEntitlement.id },
        data: {
          status: 'BOOKED',
          consumedAt: new Date(),
        },
      });

      // 7. Create ServiceJob
      const serviceJob = await tx.serviceJob.create({
        data: {
          jobNumber,
          soldUnitId: unitId,
          entitlementId: lockedEntitlement.id,
          userId: unit.userId,
          status: 'REQUESTED',
          pickupAddress: dto.pickupAddress,
          pickupPincode: dto.pickupPincode,
          preferredSlot: dto.preferredSlot,
          scheduledPickupAt: new Date(dto.preferredDate),
          customerNotes: dto.customerNotes || null,
          backupAcknowledged: dto.backupAcknowledged ?? true,
        },
      });

      // 8. Record audit event
      await this.createEvent(tx, {
        jobId: serviceJob.id,
        actorId: userId,
        actorRole: userRole,
        eventType: 'STATUS_CHANGE',
        oldStatus: null,
        newStatus: 'REQUESTED',
        notes: 'Service booking created by customer',
      });

      this.logger.log(
        `[AUDIT] ServiceJob created: jobNumber=${serviceJob.jobNumber}, unitId=${unitId}, userId=${userId}, entitlementId=${lockedEntitlement.id}`,
      );

      return serviceJob;
    });

    if (this.notificationService) {
      this.notificationService
        .sendServiceNotification({
          userId,
          type: 'BOOKED',
          job: result,
        })
        .catch((e) => this.logger.warn(`Failed to dispatch booking notification: ${e?.message}`));
    }

    return result;
  }

  /**
   * Reschedule an existing service pickup
   */
  async rescheduleService(
    userId: string,
    userRole: string,
    jobId: string,
    dto: RescheduleServiceDto,
  ) {
    const result: any = await this.prisma.$transaction(async (tx) => {
      const [lockedJob]: any = await tx.$queryRaw`
        SELECT * FROM "ServiceJob"
        WHERE "id" = ${jobId}
        FOR UPDATE
      `;

      if (!lockedJob) {
        throw new NotFoundException('Service job not found');
      }

      if (userRole !== 'ADMIN' && lockedJob.userId !== userId) {
        throw new ForbiddenException('You do not have permission to modify this service booking');
      }

      if (!['REQUESTED', 'SCHEDULED', 'RESCHEDULED'].includes(lockedJob.status)) {
        throw new BadRequestException(
          `Cannot reschedule a service job in ${lockedJob.status} status. Modifications are only permitted before technician dispatch.`,
        );
      }

      const updatedJob = await tx.serviceJob.update({
        where: { id: jobId },
        data: {
          status: 'RESCHEDULED',
          scheduledPickupAt: new Date(dto.preferredDate),
          preferredSlot: dto.preferredSlot,
          rescheduledCount: { increment: 1 },
        },
      });

      await this.createEvent(tx, {
        jobId: lockedJob.id,
        actorId: userId,
        actorRole: userRole,
        eventType: 'RESCHEDULED',
        oldStatus: lockedJob.status,
        newStatus: 'RESCHEDULED',
        notes: dto.reason || 'Rescheduled by customer',
        metadata: {
          newDate: dto.preferredDate,
          newSlot: dto.preferredSlot,
        },
      });

      this.logger.log(
        `[AUDIT] ServiceJob rescheduled: jobId=${jobId}, actorId=${userId}, newDate=${dto.preferredDate}`,
      );

      return updatedJob;
    });

    if (this.notificationService) {
      this.notificationService
        .sendServiceNotification({
          userId: result.userId,
          type: 'RESCHEDULED',
          job: result,
        })
        .catch((e) => this.logger.warn(`Failed to dispatch reschedule notification: ${e?.message}`));
    }

    return result;
  }

  /**
   * Cancel service booking with automatic entitlement restoration
   */
  async cancelService(
    userId: string,
    userRole: string,
    jobId: string,
    dto: CancelServiceDto,
  ) {
    const result: any = await this.prisma.$transaction(async (tx) => {
      const [lockedJob]: any = await tx.$queryRaw`
        SELECT * FROM "ServiceJob"
        WHERE "id" = ${jobId}
        FOR UPDATE
      `;

      if (!lockedJob) {
        throw new NotFoundException('Service job not found');
      }

      if (userRole !== 'ADMIN' && lockedJob.userId !== userId) {
        throw new ForbiddenException('You do not have permission to cancel this service booking');
      }

      if (!['REQUESTED', 'SCHEDULED', 'RESCHEDULED'].includes(lockedJob.status)) {
        throw new BadRequestException(
          `Cannot cancel service job in ${lockedJob.status} status. Contact support if the laptop is already picked up.`,
        );
      }

      const updatedJob = await tx.serviceJob.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.reason,
          cancelledBy: userId,
        },
      });

      // Restore ServiceEntitlement (Owner approved decision: automatic restoration if within 6-month validity)
      const entitlement = await tx.serviceEntitlement.findUnique({
        where: { id: lockedJob.entitlementId },
      });

      let entitlementRestored = false;
      if (entitlement && new Date(entitlement.periodEnd) > new Date()) {
        // Mark the old entitlement linked to the cancelled job as CANCELLED to preserve 1:1 job audit
        await tx.serviceEntitlement.update({
          where: { id: entitlement.id },
          data: {
            status: 'CANCELLED',
          },
        });

        // Re-issue a fresh AVAILABLE entitlement for the remaining validity window
        await tx.serviceEntitlement.create({
          data: {
            soldUnitId: entitlement.soldUnitId,
            userId: entitlement.userId,
            kind: entitlement.kind,
            cycleMonth: entitlement.cycleMonth,
            periodStart: entitlement.periodStart,
            periodEnd: entitlement.periodEnd,
            status: 'AVAILABLE',
          },
        });

        entitlementRestored = true;
      }

      await this.createEvent(tx, {
        jobId: lockedJob.id,
        actorId: userId,
        actorRole: userRole,
        eventType: 'CANCELLED',
        oldStatus: lockedJob.status,
        newStatus: 'CANCELLED',
        notes: dto.reason,
        metadata: {
          entitlementRestored,
        },
      });

      this.logger.log(
        `[AUDIT] ServiceJob cancelled: jobId=${jobId}, actorId=${userId}, entitlementRestored=${entitlementRestored}`,
      );

      return updatedJob;
    });

    if (this.notificationService) {
      this.notificationService
        .sendServiceNotification({
          userId: result.userId,
          type: 'CANCELLED',
          job: result,
        })
        .catch((e) => this.logger.warn(`Failed to dispatch cancel notification: ${e?.message}`));
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Customer & Admin Job Queries
  // -------------------------------------------------------------------------

  /**
   * List customer service bookings
   */
  async getUserServiceJobs(userId: string) {
    return this.prisma.serviceJob.findMany({
      where: { userId },
      include: {
        soldUnit: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        technician: {
          select: {
            name: true,
            phone: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single service job details with events timeline
   */
  async getServiceJobById(userId: string, userRole: string, jobId: string) {
    const job = await this.prisma.serviceJob.findUnique({
      where: { id: jobId },
      include: {
        soldUnit: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            warrantyCoverage: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        events: {
          include: {
            actor: {
              select: {
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Service job not found');
    }

    // Role boundary: Customer can only view own jobs. Technician only assigned jobs. Admin all.
    if (userRole === 'CUSTOMER' && job.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (userRole === 'TECHNICIAN' && job.technicianId !== userId) {
      throw new ForbiddenException('Access denied: You are not assigned to this service job');
    }

    return job;
  }

  // -------------------------------------------------------------------------
  // Admin & Technician Operations
  // -------------------------------------------------------------------------

  /**
   * List all service jobs with filters (Admin & Technician)
   */
  async getAdminServiceJobs(query?: {
    status?: string;
    technicianId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query?.technicianId && query.technicianId !== 'ALL') {
      where.technicianId = query.technicianId;
    }

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { pickupPincode: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
        { soldUnit: { serialNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.serviceJob.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          technician: {
            select: {
              id: true,
              name: true,
            },
          },
          soldUnit: {
            select: {
              id: true,
              serialNumber: true,
              brandSnapshot: true,
              modelSnapshot: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceJob.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update service job status, checklist, or assign technician
   */
  async updateServiceJobStatus(
    staffId: string,
    staffRole: string,
    jobId: string,
    dto: UpdateServiceJobDto,
  ) {
    const result: any = await this.prisma.$transaction(async (tx) => {
      const [job]: any = await tx.$queryRaw`
        SELECT * FROM "ServiceJob"
        WHERE "id" = ${jobId}
        FOR UPDATE
      `;

      if (!job) {
        throw new NotFoundException('Service job not found');
      }

      // If completing, enforce mandatory 4-point checklist
      let receiptNumber = job.receiptNumber;
      if (dto.status === 'COMPLETED' && job.status !== 'COMPLETED') {
        const c1 = dto.checklistCleaning ?? job.checklistCleaning;
        const c2 = dto.checklistThermalPaste ?? job.checklistThermalPaste;
        const c3 = dto.checklistSoftware ?? job.checklistSoftware;
        const c4 = dto.checklistBattery ?? job.checklistBattery;

        if (!c1 || !c2 || !c3 || !c4) {
          throw new BadRequestException(
            'Cannot complete service job. All 4 quality checklist items must be verified: Internal Cleaning, Thermal Paste, Software Diagnostics, and Battery Health Check.',
          );
        }

        if (!receiptNumber) {
          receiptNumber = await this.getNextReceiptNumber(tx);
        }

        // Mark entitlement as USED
        await tx.serviceEntitlement.update({
          where: { id: job.entitlementId },
          data: {
            status: 'USED',
          },
        });
      }

      const updateData: any = {};
      if (dto.status) updateData.status = dto.status;
      if (dto.technicianId !== undefined) updateData.technicianId = dto.technicianId;
      if (dto.scheduledDropAt) updateData.scheduledDropAt = new Date(dto.scheduledDropAt);
      if (dto.checklistCleaning !== undefined) updateData.checklistCleaning = dto.checklistCleaning;
      if (dto.checklistThermalPaste !== undefined) updateData.checklistThermalPaste = dto.checklistThermalPaste;
      if (dto.checklistSoftware !== undefined) updateData.checklistSoftware = dto.checklistSoftware;
      if (dto.checklistBattery !== undefined) updateData.checklistBattery = dto.checklistBattery;
      if (dto.batteryHealthPercent !== undefined) updateData.batteryHealthPercent = dto.batteryHealthPercent;
      if (dto.partsReplaced !== undefined) updateData.partsReplaced = dto.partsReplaced;
      if (dto.internalNotes !== undefined) updateData.internalNotes = dto.internalNotes;
      if (dto.cancellationReason !== undefined) updateData.cancellationReason = dto.cancellationReason;
      if (receiptNumber) updateData.receiptNumber = receiptNumber;

      if (dto.status === 'PICKED_UP' && !job.actualPickedUpAt) {
        updateData.actualPickedUpAt = new Date();
      }
      if (dto.status === 'COMPLETED' && !job.actualDeliveredAt) {
        updateData.actualDeliveredAt = new Date();
      }

      const updatedJob = await tx.serviceJob.update({
        where: { id: jobId },
        data: updateData,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          technician: { select: { id: true, name: true } },
          soldUnit: true,
        },
      });

      // Record event if status changed or notes provided
      if (dto.status && dto.status !== job.status) {
        await this.createEvent(tx, {
          jobId: job.id,
          actorId: staffId,
          actorRole: staffRole,
          eventType: 'STATUS_CHANGE',
          oldStatus: job.status,
          newStatus: dto.status,
          notes: dto.internalNotes || `Status updated to ${dto.status} by ${staffRole}`,
        });
      }

      this.logger.log(
        `[AUDIT] ServiceJob updated: jobId=${jobId}, staffId=${staffId}, status=${dto.status || job.status}`,
      );

      return updatedJob;
    });

    if (this.notificationService && result.status === 'COMPLETED') {
      this.notificationService
        .sendServiceNotification({
          userId: result.userId,
          type: 'COMPLETED',
          job: result,
        })
        .catch((e) => this.logger.warn(`Failed to dispatch completion notification: ${e?.message}`));
    }

    return result;
  }

  /**
   * Get all registered technicians for assignment dropdown
   */
  async getTechnicians() {
    return this.prisma.user.findMany({
      where: { role: 'TECHNICIAN', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  /**
   * Get service configuration settings
   */
  async getSettings() {
    let settings = await this.prisma.serviceSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.serviceSettings.create({
        data: {
          id: 'default',
          includedWork: [
            { id: 'cleaning', title: 'Internal Cleaning', description: 'High-pressure dust removal from fan bays and heatsink.' },
            { id: 'thermal_paste', title: 'Thermal Paste Repasting', description: 'Fresh thermal compound for CPU/GPU dies.' },
            { id: 'diagnostics', title: 'Diagnostics Stress Test', description: 'Hardware benchmark and memory stability run.' },
            { id: 'battery', title: 'Battery Health Inspection', description: 'Design capacity vs full-charge capacity report.' },
          ],
          windowMonthsOutright: 6,
          leaseCadenceMonths: 1,
          reminderLeadDays: [30, 7, 1],
          serviceAreaPincodes: ['560001', '560002', '560003', '560038', '560076'],
          slotWindows: [
            { id: 'MORNING_10_TO_1', label: 'Morning (10:00 AM - 1:00 PM)' },
            { id: 'AFTERNOON_2_TO_5', label: 'Afternoon (2:00 PM - 5:00 PM)' },
            { id: 'EVENING_5_TO_8', label: 'Evening (5:00 PM - 8:00 PM)' },
          ],
          serviceTermsText: 'Includes 1 free general service within 6 months of delivery for outright purchased laptops.',
          dataBackupDisclaimerText: 'Please ensure all important personal and work data is backed up prior to device pickup.',
        },
      });
    }

    return settings;
  }

  /**
   * Update service configuration settings (Admin)
   */
  async updateSettings(dto: Partial<{
    serviceAreaPincodes: string[];
    turnaroundHoursTarget: number;
    reminderLeadDays: number[];
    serviceTermsText: string;
    dataBackupDisclaimerText: string;
    includedWork: any;
    slotWindows: any;
  }>) {
    return this.prisma.serviceSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(dto.serviceAreaPincodes ? { serviceAreaPincodes: dto.serviceAreaPincodes } : {}),
        ...(dto.reminderLeadDays ? { reminderLeadDays: dto.reminderLeadDays } : {}),
        ...(dto.serviceTermsText !== undefined ? { serviceTermsText: dto.serviceTermsText } : {}),
        ...(dto.dataBackupDisclaimerText !== undefined ? { dataBackupDisclaimerText: dto.dataBackupDisclaimerText } : {}),
        ...(dto.includedWork ? { includedWork: dto.includedWork } : {}),
        ...(dto.slotWindows ? { slotWindows: dto.slotWindows } : {}),
      },
      create: {
        id: 'default',
        serviceAreaPincodes: dto.serviceAreaPincodes || ['560001'],
        reminderLeadDays: dto.reminderLeadDays || [30, 7, 1],
        serviceTermsText: dto.serviceTermsText || '',
        dataBackupDisclaimerText: dto.dataBackupDisclaimerText || '',
        includedWork: dto.includedWork || [],
        slotWindows: dto.slotWindows || [],
      },
    });
  }

  /**
   * Daily / Scheduled Expiry Reminders with Deduplication Protection
   */
  async processServiceReminders() {
    const settings = await this.getSettings();
    const rawLead: any = settings.reminderLeadDays;
    const leadDays: number[] = Array.isArray(rawLead) ? rawLead : [30, 7, 1];
    const now = new Date();

    const entitlements = await this.prisma.serviceEntitlement.findMany({
      where: {
        status: 'AVAILABLE',
        periodEnd: { gt: now },
      },
      include: {
        soldUnit: {
          include: {
            product: true,
          },
        },
      },
    });

    let sentCount = 0;
    for (const ent of entitlements) {
      const msLeft = new Date(ent.periodEnd).getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      const matchedLead = leadDays.find((d: number) => d === daysLeft);
      if (matchedLead) {
        const dedupeKey = `${ent.id}_${matchedLead}d`;
        const templateKey = 'SERVICE_EXPIRY_REMINDER';

        const alreadySent = await this.prisma.notificationDedupeLog.findUnique({
          where: {
            templateKey_dedupeKey: {
              templateKey,
              dedupeKey,
            },
          },
        });

        if (!alreadySent) {
          await this.prisma.notificationDedupeLog.create({
            data: {
              channel: 'EMAIL',
              recipient: ent.userId,
              templateKey,
              dedupeKey,
              metadata: {
                entitlementId: ent.id,
                daysLeft,
                leadDay: matchedLead,
              },
            },
          });

          if (this.notificationService) {
            await this.notificationService.sendServiceNotification({
              userId: ent.userId,
              type: 'REMINDER',
              entitlement: ent,
              leadDays: matchedLead,
              unit: ent.soldUnit,
            });
          }
          sentCount++;
        }
      }
    }

    this.logger.log(
      `[CRON] Service expiry reminders processed: totalAvailable=${entitlements.length}, sent=${sentCount}`,
    );

    return {
      processedEntitlements: entitlements.length,
      remindersSent: sentCount,
    };
  }
}
