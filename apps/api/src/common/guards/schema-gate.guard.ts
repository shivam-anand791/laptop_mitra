import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SchemaCompatibilityService,
  SchemaFeature,
} from '../../prisma/schema-compatibility.service';

export const REQUIRES_SCHEMA_KEY = 'requires_schema_features';

export const RequiresSchema = (...features: SchemaFeature[]) =>
  SetMetadata(REQUIRES_SCHEMA_KEY, features);

@Injectable()
export class SchemaGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly schemaCompatibility?: SchemaCompatibilityService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.schemaCompatibility) {
      return true;
    }

    const features = this.reflector.getAllAndOverride<SchemaFeature[]>(REQUIRES_SCHEMA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!features || features.length === 0) {
      return true;
    }

    for (const feature of features) {
      this.schemaCompatibility.assertFeatureReady(feature);
    }
    return true;
  }
}

