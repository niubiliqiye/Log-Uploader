import {Module} from '@nestjs/common';
import {LogUploaderConsumer} from './consumers/log-uploader.consumer';

@Module({
  providers: [LogUploaderConsumer],
  exports: [LogUploaderConsumer],
})
export class LogUploaderKafkaModule {}
