-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "OtpAttempt" DROP CONSTRAINT "OtpAttempt_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otp",
DROP COLUMN "otpAttemptCount",
DROP COLUMN "otpExpiresAt",
DROP COLUMN "password",
ADD COLUMN     "authProvider" TEXT,
ADD COLUMN     "firebaseUid" TEXT NOT NULL,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "OtpAttempt";

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");