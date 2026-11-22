import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';
import { isFallbackResponse } from '../fallback';

@Injectable()
export class DataSourceHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      tap((data) => {
        if (isFallbackResponse(data) && res && typeof res.setHeader === 'function') {
          res.setHeader('X-Data-Source', 'fallback');
        }
      }),
    );
  }
}

