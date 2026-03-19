import {DynamicModule, Module, Global, Provider} from '@nestjs/common';
import {FileStorageAdapter} from './adapters/file-storage.adapter';
import {LOG_STORAGE_ADAPTER, LOG_UPLOADER_OPTIONS} from '../common/constants';
import {
  LogUploaderModuleAsyncOptions,
  LogUploaderModuleOptions,
  LogUploaderModuleOptionsFactory,
} from '../config/log-uploader.options';
import {LogUploadAuthGuard} from './guards/log-upload-auth.guard';
import {LogUploaderService} from './services/log-uploader.service';

@Global()
@Module({})
export class LogUploaderCoreModule {
  static forRoot(options: LogUploaderModuleOptions): DynamicModule {
    const resolvedOptions = this.withDefaultOptions(options);

    const optionsProvider: Provider = {
      provide: LOG_UPLOADER_OPTIONS,
      useValue: resolvedOptions,
    };

    const storageProvider: Provider = {
      provide: LOG_STORAGE_ADAPTER,
      useFactory: (moduleOptions: LogUploaderModuleOptions) => {
        return this.createStorageAdapter(moduleOptions);
      },
      inject: [LOG_UPLOADER_OPTIONS],
    };

    return {
      module: LogUploaderCoreModule,
      providers: [optionsProvider, storageProvider, LogUploaderService, LogUploadAuthGuard],
      exports: [LOG_UPLOADER_OPTIONS, LOG_STORAGE_ADAPTER, LogUploaderService, LogUploadAuthGuard],
    };
  }

  static forRootAsync(options: LogUploaderModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider = this.createAsyncOptionsProvider(options);

    const storageProvider: Provider = {
      provide: LOG_STORAGE_ADAPTER,
      useFactory: (resolvedOptions: LogUploaderModuleOptions) => {
        return this.createStorageAdapter(resolvedOptions);
      },
      inject: [LOG_UPLOADER_OPTIONS],
    };

    const providers: Provider[] = [asyncOptionsProvider, storageProvider, LogUploaderService, LogUploadAuthGuard];

    if (options.useClass) {
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    return {
      module: LogUploaderCoreModule,
      imports: options.imports ?? [],
      providers,
      exports: [LOG_UPLOADER_OPTIONS, LOG_STORAGE_ADAPTER, LogUploaderService, LogUploadAuthGuard],
    };
  }

  private static createAsyncOptionsProvider(options: LogUploaderModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: LOG_UPLOADER_OPTIONS,
        useFactory: async (...args: any[]) => {
          const result = await options.useFactory!(...args);
          return this.withDefaultOptions(result);
        },
        inject: options.inject ?? [],
      };
    }

    if (options.useExisting) {
      return {
        provide: LOG_UPLOADER_OPTIONS,
        useFactory: async (factory: LogUploaderModuleOptionsFactory) => {
          const result = await factory.createLogUploaderOptions();
          return this.withDefaultOptions(result);
        },
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: LOG_UPLOADER_OPTIONS,
        useFactory: async (factory: LogUploaderModuleOptionsFactory) => {
          const result = await factory.createLogUploaderOptions();
          return this.withDefaultOptions(result);
        },
        inject: [options.useClass],
      };
    }

    throw new Error('Invalid async options: one of useFactory, useExisting, or useClass must be provided');
  }

  private static withDefaultOptions(options: LogUploaderModuleOptions): LogUploaderModuleOptions {
    return {
      enableBatch: true,
      maxBatchSize: 200,
      redactFields: [],
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      storage: {
        type: 'file',
        baseDir: './logs',
        splitByLogType: false,
        ...options.storage,
      },
      ...options,
    };
  }

  private static createStorageAdapter(options: LogUploaderModuleOptions) {
    if (options.storage?.type === 'custom') {
      if (!options.storage.adapter) {
        throw new Error('Custom storage selected but no adapter provided');
      }
      return options.storage.adapter;
    }

    return new FileStorageAdapter(
      options.appName,
      options.storage?.baseDir ?? './logs',
      options.storage?.splitByLogType ?? false,
    );
  }
}
