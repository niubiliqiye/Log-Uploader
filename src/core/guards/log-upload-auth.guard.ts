import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {Request} from 'express';
import {LOG_UPLOADER_OPTIONS} from '../../common/constants';
import {LogUploaderModuleOptions} from '../../config/log-uploader.options';

@Injectable()
export class LogUploadAuthGuard implements CanActivate {
  constructor(
    @Inject(LOG_UPLOADER_OPTIONS)
    private readonly options: LogUploaderModuleOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.options.authToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (authHeader !== `Bearer ${this.options.authToken}`) {
      throw new UnauthorizedException('Invalid log upload token');
    }

    return true;
  }
}
