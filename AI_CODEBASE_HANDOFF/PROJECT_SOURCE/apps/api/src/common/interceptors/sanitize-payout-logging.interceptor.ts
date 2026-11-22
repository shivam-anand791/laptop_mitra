import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SanitizePayoutLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req && req.body && typeof req.body === 'object') {
      const url = req.originalUrl || req.url || '';
      if (url.includes('payout') || url.includes('withdraw')) {
        // Redact in a non-destructive clone for logs if loggers read req.body
        const sensitiveKeys = [
          'accountNumber',
          'ifscCode',
          'upiId',
          'paymentMethodSnapshot',
          'paymentDetails',
        ];
        for (const key of sensitiveKeys) {
          if (key in req.body) {
            // Keep actual value for handler, but attach sanitized property for loggers
            req.sanitizedBody = {
              ...(req.sanitizedBody || req.body),
              [key]: '[REDACTED]',
            };
          }
        }
      }
    }
    return next.handle();
  }
}
