import {LogUploaderHttpModule} from '../http/http.module';
import type {LogUploaderModuleAsyncOptions, LogUploaderModuleOptions} from '../config/log-uploader.options';
import {LogUploaderCoreModule} from '../core/core.module';
import {LogUploaderModule} from './log-uploader.module';

describe('LogUploaderModule', () => {
  it('forRoot composes the core and http modules', () => {
    const options: LogUploaderModuleOptions = {
      appName: 'demo-app',
    };

    const moduleDef = LogUploaderModule.forRoot(options);
    const coreImport = moduleDef.imports?.[0] as ReturnType<typeof LogUploaderCoreModule.forRoot>;

    expect(moduleDef.module).toBe(LogUploaderModule);
    expect(coreImport.module).toBe(LogUploaderCoreModule);
    expect(coreImport.exports).toEqual(
      expect.arrayContaining([LogUploaderCoreModule.forRoot(options).exports?.[0], LogUploaderCoreModule.forRoot(options).exports?.[1]]),
    );
    expect(moduleDef.imports?.[1]).toBe(LogUploaderHttpModule);
    expect(moduleDef.exports).toEqual([LogUploaderCoreModule, LogUploaderHttpModule]);
  });

  it('forRootAsync composes the async core module and http module', () => {
    const options: LogUploaderModuleAsyncOptions = {
      inject: ['CONFIG'],
      useFactory: () => ({
        appName: 'demo-app',
      }),
    };

    const moduleDef = LogUploaderModule.forRootAsync(options);
    const coreImport = moduleDef.imports?.[0] as ReturnType<typeof LogUploaderCoreModule.forRootAsync>;

    expect(moduleDef.module).toBe(LogUploaderModule);
    expect(coreImport.module).toBe(LogUploaderCoreModule);
    expect(coreImport.imports).toEqual([]);
    expect(coreImport.exports).toEqual(
      expect.arrayContaining([LogUploaderCoreModule.forRootAsync(options).exports?.[0], LogUploaderCoreModule.forRootAsync(options).exports?.[1]]),
    );
    expect(moduleDef.imports?.[1]).toBe(LogUploaderHttpModule);
    expect(moduleDef.exports).toEqual([LogUploaderCoreModule, LogUploaderHttpModule]);
  });
});
