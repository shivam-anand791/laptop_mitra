import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNLINKED_FIREBASE_USER_KEY = 'allowUnlinkedFirebaseUser';
export const AllowUnlinkedFirebaseUser = () =>
  SetMetadata(ALLOW_UNLINKED_FIREBASE_USER_KEY, true);