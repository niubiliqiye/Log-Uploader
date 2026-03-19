import {Module} from '@nestjs/common';
import {LogUploaderAdminController} from './controllers/log-uploader-admin.controller';
import {LogUploaderAdminQueryService} from './services/log-uploader-admin-query.service';
import {LogUploaderCoreModule} from '../core/core.module';

@Module({
  imports: [LogUploaderCoreModule],
  controllers: [LogUploaderAdminController],
  providers: [LogUploaderAdminQueryService],
  exports: [LogUploaderAdminQueryService],
})
export class LogUploaderAdminModule {}
