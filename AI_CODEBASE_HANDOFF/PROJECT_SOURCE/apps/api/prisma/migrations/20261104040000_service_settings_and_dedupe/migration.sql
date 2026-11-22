-- CreateTable ServiceSettings
CREATE TABLE IF NOT EXISTS "ServiceSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "includedWork" JSONB NOT NULL,
  "windowMonthsOutright" INTEGER NOT NULL DEFAULT 6,
  "leaseCadenceMonths" INTEGER NOT NULL DEFAULT 1,
  "serviceAreaPincodes" JSONB NOT NULL,
  "slotWindows" JSONB NOT NULL,
  "serviceTermsText" TEXT NOT NULL,
  "dataBackupDisclaimerText" TEXT NOT NULL,
  "reminderLeadDays" JSONB NOT NULL,
  "warrantyReminderLeadDays" INTEGER NOT NULL DEFAULT 30,
  "freeServiceEnabledDefault" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ServiceSettings_pkey" PRIMARY KEY ("id")
);

-- ForeignKeys for ServiceSettings
ALTER TABLE "ServiceSettings" DROP CONSTRAINT IF EXISTS "ServiceSettings_updatedById_fkey";
ALTER TABLE "ServiceSettings" ADD CONSTRAINT "ServiceSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default ServiceSettings record if not exists
INSERT INTO "ServiceSettings" (
  "id",
  "includedWork",
  "windowMonthsOutright",
  "leaseCadenceMonths",
  "serviceAreaPincodes",
  "slotWindows",
  "serviceTermsText",
  "dataBackupDisclaimerText",
  "reminderLeadDays",
  "warrantyReminderLeadDays",
  "freeServiceEnabledDefault",
  "updatedAt"
) VALUES (
  'default',
  '["Internal dust cleaning", "Thermal paste re-application", "Software diagnostics", "Battery health test"]'::jsonb,
  6,
  1,
  '["560", "110", "400", "500", "600", "700"]'::jsonb,
  '["10:00 AM - 01:00 PM", "02:00 PM - 06:00 PM"]'::jsonb,
  'Complimentary in-house general maintenance service provided by LaptopMitra certified technicians.',
  'Please ensure all critical personal and work data is safely backed up before pickup. LaptopMitra is not liable for data loss during operating system checks.',
  '[30, 7]'::jsonb,
  30,
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- CreateTable NotificationDedupeLog
CREATE TABLE IF NOT EXISTS "NotificationDedupeLog" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "NotificationDedupeLog_pkey" PRIMARY KEY ("id")
);

-- Indexes and Unique Keys for NotificationDedupeLog
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDedupeLog_templateKey_dedupeKey_key" 
  ON "NotificationDedupeLog"("templateKey", "dedupeKey");
CREATE INDEX IF NOT EXISTS "NotificationDedupeLog_sentAt_idx" 
  ON "NotificationDedupeLog"("sentAt");

