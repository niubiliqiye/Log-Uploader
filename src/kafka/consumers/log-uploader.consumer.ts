import {Injectable, Logger} from '@nestjs/common';

@Injectable()
export class LogUploaderConsumer {
  private readonly logger = new Logger(LogUploaderConsumer.name);

  onModuleInit() {
    this.logger.log('LogUploaderKafkaModule initialized');
  }
}
