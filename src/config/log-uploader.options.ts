import {ModuleMetadata, Type} from '@nestjs/common';
import {LogLevel, StorageAdapter} from '../common/interfaces';

export interface LogUploaderModuleOptions {
  appName: string;
  authToken?: string;
  enableBatch?: boolean;
  maxBatchSize?: number;
  redactFields?: string[];
  allowedLevels?: LogLevel[];
  storage?: {
    type: 'file' | 'custom';
    baseDir?: string;
    adapter?: StorageAdapter;
    splitByLogType?: boolean;
  };
}

export interface LogUploaderModuleOptionsFactory {
  createLogUploaderOptions: (() => Promise<LogUploaderModuleOptions>) | (() => LogUploaderModuleOptions);
}

export interface LogUploaderModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<LogUploaderModuleOptionsFactory>;
  useClass?: Type<LogUploaderModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<LogUploaderModuleOptions> | LogUploaderModuleOptions;
  inject?: any[];
}
