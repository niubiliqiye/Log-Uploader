import type {Request} from 'express';
import {LogUploaderController} from './log-uploader.controller';
import {LogUploaderService} from '../../core/services/log-uploader.service';

describe('LogUploaderController', () => {
  let service: jest.Mocked<Pick<LogUploaderService, 'getStatus' | 'upload' | 'uploadBatch'>>;
  let controller: LogUploaderController;

  beforeEach(() => {
    service = {
      getStatus: jest.fn(),
      upload: jest.fn(),
      uploadBatch: jest.fn(),
    };

    controller = new LogUploaderController(service as unknown as LogUploaderService);
  });

  it('health returns the wrapped module status', () => {
    service.getStatus.mockReturnValue({
      status: 'up',
      appName: 'demo-app',
    } as ReturnType<LogUploaderService['getStatus']>);

    expect(controller.health()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        status: 'up',
        appName: 'demo-app',
      },
    });
  });

  it('check returns the wrapped module status with authorized message', () => {
    service.getStatus.mockReturnValue({
      status: 'up',
      appName: 'demo-app',
    } as ReturnType<LogUploaderService['getStatus']>);

    expect(controller.check()).toEqual({
      code: 0,
      message: 'authorized',
      data: {
        status: 'up',
        appName: 'demo-app',
      },
    });
  });

  it('upload forwards dto and request to the service and returns a success response', async () => {
    const dto = {
      level: 'info' as const,
      message: 'single upload',
    };
    const request = {
      headers: {
        authorization: 'Bearer token',
      },
    } as Request;

    await expect(controller.upload(dto, request)).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: null,
    });
    expect(service.upload).toHaveBeenCalledWith(dto, request);
  });

  it('batch forwards logs and request to the service and returns the uploaded count', async () => {
    const dto = {
      logs: [
        {
          level: 'info' as const,
          message: 'first',
        },
        {
          level: 'error' as const,
          message: 'second',
        },
      ],
    };
    const request = {
      headers: {
        authorization: 'Bearer token',
      },
    } as Request;

    await expect(controller.batch(dto, request)).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {count: 2},
    });
    expect(service.uploadBatch).toHaveBeenCalledWith(dto.logs, request);
  });
});
