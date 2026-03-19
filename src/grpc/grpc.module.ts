import {Module} from '@nestjs/common';
import {LogUploaderGrpcController} from './controllers/log-uploader.grpc-controller';

@Module({
  providers: [LogUploaderGrpcController],
  exports: [LogUploaderGrpcController],
})
export class LogUploaderGrpcModule {}
