import { SetMetadata } from '@nestjs/common';

export const CHECK_FIREBASE_REVOCATION_KEY = 'checkFirebaseRevocation';

export const CheckFirebaseRevocation = () =>
  SetMetadata(CHECK_FIREBASE_REVOCATION_KEY, true);
