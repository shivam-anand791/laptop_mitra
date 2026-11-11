import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SchemaCompatibilityService } from './schema-compatibility.service';

@Global()
@Module({
  providers: [PrismaService, SchemaCompatibilityService],
  exports: [PrismaService, SchemaCompatibilityService],
})
export class PrismaModule {}