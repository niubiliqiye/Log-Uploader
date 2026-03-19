import {DynamicModule, Module} from '@nestjs/common';
import {LogUploaderModuleAsyncOptions, LogUploaderModuleOptions} from '../config/log-uploader.options';
import {LogUploaderCoreModule} from '../core/core.module';
import {LogUploaderHttpModule} from '../http/http.module';

@Module({})
export class LogUploaderModule {
  static forRoot(options: LogUploaderModuleOptions): DynamicModule {
    return {
      module: LogUploaderModule,
      imports: [LogUploaderCoreModule.forRoot(options), LogUploaderHttpModule],
      exports: [LogUploaderCoreModule, LogUploaderHttpModule],
    };
  }

  static forRootAsync(options: LogUploaderModuleAsyncOptions): DynamicModule {
    return {
      module: LogUploaderModule,
      imports: [LogUploaderCoreModule.forRootAsync(options), LogUploaderHttpModule],
      exports: [LogUploaderCoreModule, LogUploaderHttpModule],
    };
  }
}
