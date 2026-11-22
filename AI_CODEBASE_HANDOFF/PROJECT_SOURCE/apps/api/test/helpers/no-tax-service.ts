import { PrismaService } from '../../src/prisma/prisma.service';
import { TaxService } from '../../src/modules/tax/tax.service';

export function createNoTaxService() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
  return new TaxService(prisma);
}
