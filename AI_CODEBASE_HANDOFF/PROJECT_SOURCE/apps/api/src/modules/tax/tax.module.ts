import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TaxService } from './tax.service';

@Module({
  imports: [PrismaModule],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
