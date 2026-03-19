import {FileStorageAdapter} from './adapters/file-storage.adapter';
import {LOG_STORAGE_ADAPTER, LOG_UPLOADER_OPTIONS} from '../common/constants';
import type {
  LogUploaderModuleAsyncOptions,
  LogUploaderModuleOptions,
  LogUploaderModuleOptionsFactory,
} from '../config/log-uploader.options';
import {LogUploaderCoreModule} from './core.module';
import {LogUploadAuthGuard} from './guards/log-upload-auth.guard';
import {LogUploaderService} from './services/log-uploader.service';

describe('LogUploaderCoreModule', () => {
  const getProvider = (dynamicModule: ReturnType<typeof LogUploaderCoreModule.forRoot>, token: symbol | Function) =>
    dynamicModule.providers?.find((provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === token);

  it('forRoot wires defaulted options and the default file storage adapter', () => {
    const moduleDef = LogUploaderCoreModule.forRoot({
      appName: 'demo-app',
    });

    expect(moduleDef.module).toBe(LogUploaderCoreModule);
    expect(moduleDef.providers).toEqual(
      expect.arrayContaining([LogUploaderService, LogUploadAuthGuard]),
    );
    expect(moduleDef.exports).toEqual(
      expect.arrayContaining([LOG_UPLOADER_OPTIONS, LOG_STORAGE_ADAPTER, LogUploaderService, LogUploadAuthGuard]),
    );

    const optionsProvider = getProvider(moduleDef, LOG_UPLOADER_OPTIONS) as {useValue: LogUploaderModuleOptions};
    expect(optionsProvider.useValue).toEqual({
      appName: 'demo-app',
      enableBatch: true,
      maxBatchSize: 200,
      redactFields: [],
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      storage: {
        type: 'file',
        baseDir: './logs',
        splitByLogType: false,
      },
    });

    const storageProvider = getProvider(moduleDef, LOG_STORAGE_ADAPTER) as {
      useFactory: (options: LogUploaderModuleOptions) => unknown;
    };
    const adapter = storageProvider.useFactory(optionsProvider.useValue);

    expect(adapter).toBeInstanceOf(FileStorageAdapter);
  });

  it('forRoot returns the custom adapter when custom storage is configured', () => {
    const customAdapter = {
      save: jest.fn(),
      saveBatch: jest.fn(),
    };
    const moduleDef = LogUploaderCoreModule.forRoot({
      appName: 'demo-app',
      storage: {
        type: 'custom',
        adapter: customAdapter,
      },
    });

    const optionsProvider = getProvider(moduleDef, LOG_UPLOADER_OPTIONS) as {useValue: LogUploaderModuleOptions};
    const storageProvider = getProvider(moduleDef, LOG_STORAGE_ADAPTER) as {
      useFactory: (options: LogUploaderModuleOptions) => unknown;
    };

    expect(storageProvider.useFactory(optionsProvider.useValue)).toBe(customAdapter);
  });

  it('forRoot throws from the storage factory when custom storage has no adapter', () => {
    const moduleDef = LogUploaderCoreModule.forRoot({
      appName: 'demo-app',
      storage: {
        type: 'custom',
      },
    });

    const optionsProvider = getProvider(moduleDef, LOG_UPLOADER_OPTIONS) as {useValue: LogUploaderModuleOptions};
    const storageProvider = getProvider(moduleDef, LOG_STORAGE_ADAPTER) as {
      useFactory: (options: LogUploaderModuleOptions) => unknown;
    };

    expect(() => storageProvider.useFactory(optionsProvider.useValue)).toThrow(
      'Custom storage selected but no adapter provided',
    );
  });

  it('forRootAsync with useFactory preserves imports and inject and applies defaults', async () => {
    const asyncOptions: LogUploaderModuleAsyncOptions = {
      imports: ['TestImport' as never],
      inject: ['CONFIG'],
      useFactory: async () => ({
        appName: 'demo-app',
        storage: {
          type: 'file',
          baseDir: '/tmp/logs',
        },
      }),
    };

    const moduleDef = LogUploaderCoreModule.forRootAsync(asyncOptions);
    const optionsProvider = getProvider(moduleDef as ReturnType<typeof LogUploaderCoreModule.forRoot>, LOG_UPLOADER_OPTIONS) as {
      useFactory: (...args: unknown[]) => Promise<LogUploaderModuleOptions>;
      inject: unknown[];
    };

    expect(moduleDef.imports).toEqual(['TestImport']);
    expect(optionsProvider.inject).toEqual(['CONFIG']);
    await expect(optionsProvider.useFactory()).resolves.toEqual({
      appName: 'demo-app',
      enableBatch: true,
      maxBatchSize: 200,
      redactFields: [],
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      storage: {
        type: 'file',
        baseDir: '/tmp/logs',
      },
    });
  });

  it('forRootAsync with useExisting resolves options from the existing factory', async () => {
    class ExistingFactory implements LogUploaderModuleOptionsFactory {
      createLogUploaderOptions() {
        return {
          appName: 'existing-app',
        };
      }
    }

    const moduleDef = LogUploaderCoreModule.forRootAsync({
      useExisting: ExistingFactory,
    });

    const optionsProvider = getProvider(moduleDef as ReturnType<typeof LogUploaderCoreModule.forRoot>, LOG_UPLOADER_OPTIONS) as {
      useFactory: (factory: LogUploaderModuleOptionsFactory) => Promise<LogUploaderModuleOptions>;
      inject: unknown[];
    };

    expect(optionsProvider.inject).toEqual([ExistingFactory]);
    await expect(optionsProvider.useFactory(new ExistingFactory())).resolves.toEqual({
      appName: 'existing-app',
      enableBatch: true,
      maxBatchSize: 200,
      redactFields: [],
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      storage: {
        type: 'file',
        baseDir: './logs',
        splitByLogType: false,
      },
    });
  });

  it('forRootAsync with useClass registers the factory class and resolves options', async () => {
    class ClassFactory implements LogUploaderModuleOptionsFactory {
      createLogUploaderOptions() {
        return {
          appName: 'class-app',
          enableBatch: false,
        };
      }
    }

    const moduleDef = LogUploaderCoreModule.forRootAsync({
      useClass: ClassFactory,
    });

    expect(moduleDef.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provide: ClassFactory,
          useClass: ClassFactory,
        }),
      ]),
    );

    const optionsProvider = getProvider(moduleDef as ReturnType<typeof LogUploaderCoreModule.forRoot>, LOG_UPLOADER_OPTIONS) as {
      useFactory: (factory: LogUploaderModuleOptionsFactory) => Promise<LogUploaderModuleOptions>;
      inject: unknown[];
    };

    expect(optionsProvider.inject).toEqual([ClassFactory]);
    await expect(optionsProvider.useFactory(new ClassFactory())).resolves.toEqual({
      appName: 'class-app',
      enableBatch: false,
      maxBatchSize: 200,
      redactFields: [],
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      storage: {
        type: 'file',
        baseDir: './logs',
        splitByLogType: false,
      },
    });
  });

  it('throws for invalid async configuration without a provider strategy', () => {
    expect(() => LogUploaderCoreModule.forRootAsync({})).toThrow(
      'Invalid async options: one of useFactory, useExisting, or useClass must be provided',
    );
  });
});
