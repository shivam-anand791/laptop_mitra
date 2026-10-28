import { Module, Global } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Global()
@Module({
  providers: [
    LocalStorageService,
    SupabaseStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (
        localService: LocalStorageService,
        supabaseService: SupabaseStorageService,
      ) => {
        const driver = process.env.STORAGE_DRIVER?.toLowerCase();
        const isProduction = process.env.NODE_ENV === 'production';

        if (driver === 'supabase' || (isProduction && driver !== 'local')) {
          supabaseService.validateProductionConfig();
          return supabaseService;
        }

        return localService;
      },
      inject: [LocalStorageService, SupabaseStorageService],
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, SupabaseStorageService],
})
export class StorageModule {}
