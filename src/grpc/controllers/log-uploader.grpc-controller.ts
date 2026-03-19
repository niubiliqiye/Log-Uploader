import {Injectable, Logger} from '@nestjs/common';

@Injectable()
export class LogUploaderGrpcController {
  private readonly logger = new Logger(LogUploaderGrpcController.name);

  onModuleInit() {
    this.logger.log('LogUploaderGrpcModule initialized');
  }
}
