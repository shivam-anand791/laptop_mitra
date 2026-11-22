-- Create Sequences for Ticket and Return Numbers (application generates via nextval, formatted LM-T- and LM-R-)
CREATE SEQUENCE IF NOT EXISTS "ticket_number_seq" START 1001;
CREATE SEQUENCE IF NOT EXISTS "return_number_seq" START 1001;

-- CreateTable: SupportTicket
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "issueType" TEXT,
    "type" TEXT NOT NULL DEFAULT 'QUERY',
    "source" TEXT NOT NULL DEFAULT 'web',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "callbackPhone" TEXT,
    "callbackSlot" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaBreachReason" TEXT,
    "assigneeId" TEXT,
    "mergedIntoId" TEXT,
    "customerLastReadAt" TIMESTAMP(3),
    "staffLastReadAt" TIMESTAMP(3),
    "csatScore" INTEGER,
    "csatComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportTicket_csatScore_check" CHECK ("csatScore" IS NULL OR ("csatScore" >= 1 AND "csatScore" <= 5)),
    CONSTRAINT "SupportTicket_type_check" CHECK ("type" IN ('QUERY', 'COMPLAINT', 'CALLBACK', 'RETURN', 'WARRANTY')),
    CONSTRAINT "SupportTicket_source_check" CHECK ("source" IN ('web', 'mobile')),
    CONSTRAINT "SupportTicket_priority_check" CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT "SupportTicket_status_check" CHECK ("status" IN ('NEW', 'OPEN', 'WAITING_ON_CUSTOMER', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'MERGED'))
);

-- CreateTable: TicketMessage
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketMessage_authorRole_check" CHECK ("authorRole" IN ('CUSTOMER', 'SUPPORT', 'ADMIN', 'SYSTEM'))
);

-- CreateTable: TicketAttachment
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT,
    "returnRequestId" TEXT,
    "messageId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'TICKET',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'IMAGE',
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketAttachment_parent_check" CHECK (("ticketId" IS NOT NULL AND "returnRequestId" IS NULL) OR ("ticketId" IS NULL AND "returnRequestId" IS NOT NULL)),
    CONSTRAINT "TicketAttachment_purpose_check" CHECK ("purpose" IN ('CUSTOMER_EVIDENCE', 'INSPECTION', 'TICKET')),
    CONSTRAINT "TicketAttachment_fileType_check" CHECK ("fileType" IN ('IMAGE', 'VIDEO')),
    CONSTRAINT "TicketAttachment_fileSize_check" CHECK ("fileSize" > 0 AND "fileSize" <= 52428800)
);

-- CreateTable: TicketEvent
CREATE TABLE "TicketEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "eventType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketEvent_actorRole_check" CHECK ("actorRole" IN ('CUSTOMER', 'SUPPORT', 'ADMIN', 'SYSTEM')),
    CONSTRAINT "TicketEvent_eventType_check" CHECK ("eventType" IN ('CREATED', 'MESSAGE', 'STATUS_CHANGE', 'ASSIGNED', 'PRIORITY_CHANGE', 'NOTE_ADDED', 'MERGE', 'REOPEN', 'CSAT_RATING', 'SLA_BREACH', 'AUTO_CLOSE', 'CATEGORY_CHANGE', 'ATTACHMENT', 'RETURN_LINKED', 'FIRST_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED'))
);

-- CreateTable: ReturnRequest
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'REFUND',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "refundAmount" DECIMAL(10,2),
    "refundMethod" TEXT NOT NULL DEFAULT 'SOURCE',
    "encryptedRefundDetails" TEXT,
    "refundDetailsKeyId" TEXT,
    "refundAccountMasked" TEXT,
    "refundIfscMasked" TEXT,
    "refundUpiMasked" TEXT,
    "refundDetailsUpdatedAt" TIMESTAMP(3),
    "razorpayRefundId" TEXT,
    "manualRefundReference" TEXT,
    "pickupAddress" JSONB,
    "pickupTrackingNumber" TEXT,
    "pickupScheduledAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "inspectionNotes" TEXT,
    "inspectionPassed" BOOLEAN,
    "deadlineAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReturnRequest_type_check" CHECK ("type" IN ('REFUND', 'REPLACEMENT')),
    CONSTRAINT "ReturnRequest_refundMethod_check" CHECK ("refundMethod" IN ('SOURCE', 'BANK', 'UPI')),
    CONSTRAINT "ReturnRequest_status_check" CHECK ("status" IN ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'INSPECTING', 'INSPECTION_PASSED', 'INSPECTION_FAILED', 'REFUND_PENDING', 'REFUNDED', 'REPLACED', 'CANCELLED', 'CLOSED'))
);

-- CreateTable: ReturnItem
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "condition" TEXT,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReturnItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "ReturnItem_unitPrice_check" CHECK ("unitPrice" >= 0)
);

-- CreateTable: SavedReply
CREATE TABLE "SavedReply" (
    "id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HelpCategory
CREATE TABLE "HelpCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HelpArticle
CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", ''))) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

-- GIN Index on HelpArticle tsv
CREATE INDEX IF NOT EXISTS "HelpArticle_tsv_idx" ON "HelpArticle" USING GIN ("tsv");

-- CreateTable: SupportSettings
CREATE TABLE "SupportSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "firstResponseSlaMinutes" INTEGER NOT NULL DEFAULT 1440,
    "autoCloseDays" INTEGER NOT NULL DEFAULT 7,
    "reopenWindowDays" INTEGER NOT NULL DEFAULT 7,
    "supportHoursText" TEXT NOT NULL DEFAULT '',
    "supportReturnApprovalLimit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxAttachmentImages" INTEGER NOT NULL DEFAULT 5,
    "maxAttachmentVideos" INTEGER NOT NULL DEFAULT 1,
    "maxVideoDurationSec" INTEGER NOT NULL DEFAULT 30,
    "maxImageSizeBytes" INTEGER NOT NULL DEFAULT 10485760,
    "maxVideoSizeBytes" INTEGER NOT NULL DEFAULT 52428800,
    "standardWarrantyDays" INTEGER NOT NULL DEFAULT 180,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "resolutionSlaMinutes" INTEGER,
    "urgentFirstResponseSlaMinutes" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSettings_pkey" PRIMARY KEY ("id")
);

-- Insert Default SupportSettings Row
INSERT INTO "SupportSettings" (
    "id",
    "firstResponseSlaMinutes",
    "autoCloseDays",
    "reopenWindowDays",
    "supportHoursText",
    "supportReturnApprovalLimit",
    "maxAttachmentImages",
    "maxAttachmentVideos",
    "maxVideoDurationSec",
    "maxImageSizeBytes",
    "maxVideoSizeBytes",
    "standardWarrantyDays",
    "returnWindowDays",
    "updatedAt"
)
VALUES (
    'default',
    1440,
    7,
    7,
    '',
    0,
    5,
    1,
    30,
    10485760,
    52428800,
    180,
    7,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Indexes for SupportTicket
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE INDEX "SupportTicket_userId_status_idx" ON "SupportTicket"("userId", "status");
CREATE INDEX "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");
CREATE INDEX "SupportTicket_assigneeId_status_idx" ON "SupportTicket"("assigneeId", "status");
CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");
CREATE INDEX "SupportTicket_firstResponseDueAt_status_idx" ON "SupportTicket"("firstResponseDueAt", "status");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- Indexes for TicketMessage
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX "TicketMessage_authorUserId_idx" ON "TicketMessage"("authorUserId");

-- Indexes for TicketAttachment
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");
CREATE INDEX "TicketAttachment_returnRequestId_idx" ON "TicketAttachment"("returnRequestId");
CREATE INDEX "TicketAttachment_storageKey_idx" ON "TicketAttachment"("storageKey");
CREATE INDEX "TicketAttachment_confirmed_createdAt_idx" ON "TicketAttachment"("confirmed", "createdAt");

-- Indexes for TicketEvent
CREATE INDEX "TicketEvent_ticketId_createdAt_idx" ON "TicketEvent"("ticketId", "createdAt");
CREATE INDEX "TicketEvent_eventType_idx" ON "TicketEvent"("eventType");

-- Indexes for ReturnRequest
CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key" ON "ReturnRequest"("returnNumber");
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX "ReturnRequest_userId_status_idx" ON "ReturnRequest"("userId", "status");
CREATE INDEX "ReturnRequest_ticketId_idx" ON "ReturnRequest"("ticketId");
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");

-- Indexes for ReturnItem
CREATE INDEX "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");

-- Indexes for SavedReply
CREATE UNIQUE INDEX "SavedReply_shortcut_key" ON "SavedReply"("shortcut");
CREATE INDEX "SavedReply_category_idx" ON "SavedReply"("category");

-- Indexes for HelpCategory
CREATE UNIQUE INDEX "HelpCategory_slug_key" ON "HelpCategory"("slug");
CREATE INDEX "HelpCategory_order_isActive_idx" ON "HelpCategory"("order", "isActive");

-- Indexes for HelpArticle
CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");
CREATE INDEX "HelpArticle_categoryId_isPublished_idx" ON "HelpArticle"("categoryId", "isPublished");
CREATE INDEX "HelpArticle_order_idx" ON "HelpArticle"("order");
CREATE INDEX "HelpArticle_locale_idx" ON "HelpArticle"("locale");

-- Foreign Keys
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
