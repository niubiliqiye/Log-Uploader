import {Module, forwardRef} from '@nestjs/common';
import {LogUploaderCoreModule} from '../core/core.module';
import {LogUploaderController} from './controllers/log-uploader.controller';

@Module({
  imports: [forwardRef(() => LogUploaderCoreModule)],
  controllers: [LogUploaderController],
})
export class LogUploaderHttpModule {}
