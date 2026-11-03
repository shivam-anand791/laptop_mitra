-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "priorityWeight" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "isPriorityClient" BOOLEAN NOT NULL DEFAULT false;

-- Backfill priorityWeight based on priority string
UPDATE "SupportTicket" SET "priorityWeight" = CASE "priority"
  WHEN 'URGENT' THEN 4
  WHEN 'HIGH' THEN 3
  WHEN 'MEDIUM' THEN 2
  WHEN 'LOW' THEN 1
  ELSE 2
END;

-- CheckConstraint
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_priorityWeight_check" CHECK ("priorityWeight" BETWEEN 1 AND 4);

-- CreateIndex
CREATE INDEX "SupportTicket_priority_queue_idx" ON "SupportTicket"("priorityWeight" DESC, "isPriorityClient" DESC, "firstResponseDueAt" ASC, "createdAt" ASC);

