import { Module, Global } from '@nestjs/common';
import { QrStorageService } from './qr-storage.service';
import { StorageModule } from './storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [QrStorageService],
  exports: [QrStorageService, StorageModule],
})
export class QrStorageModule {}
