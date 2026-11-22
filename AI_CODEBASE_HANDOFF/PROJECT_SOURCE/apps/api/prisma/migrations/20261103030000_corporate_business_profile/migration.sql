-- CreateTable
CREATE TABLE "BusinessProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "gstin" TEXT NOT NULL,
  "billingAddress" JSONB NOT NULL,
  "contactPerson" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "priorityEnabled" BOOLEAN NOT NULL DEFAULT true,
  "accountManager" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint for GSTIN format
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_gstin_format_check"
  CHECK ("gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

-- CreateIndexes
CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");
CREATE INDEX "BusinessProfile_priorityEnabled_idx" ON "BusinessProfile"("priorityEnabled");
CREATE INDEX "BusinessProfile_gstin_idx" ON "BusinessProfile"("gstin");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable ClientNote
CREATE TABLE "ClientNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "ClientNote_userId_createdAt_idx" ON "ClientNote"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only trigger for ClientNote
CREATE OR REPLACE FUNCTION reject_clientnote_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ClientNote is append-only: updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientnote_immutable ON "ClientNote";
CREATE TRIGGER trg_clientnote_immutable
  BEFORE UPDATE OR DELETE ON "ClientNote"
  FOR EACH ROW EXECUTE FUNCTION reject_clientnote_mutation();

