import {BadRequestException, InternalServerErrorException} from '@nestjs/common';
import type {Request} from 'express';
import type {StorageAdapter} from '../../common/interfaces';
import type {LogUploaderModuleOptions} from '../../config/log-uploader.options';
import {LogUploaderService} from './log-uploader.service';

describe('LogUploaderService', () => {
  const fixedNow = new Date('2026-03-19T08:00:00.000Z');

  let storageAdapter: jest.Mocked<StorageAdapter>;
  let options: LogUploaderModuleOptions;
  let service: LogUploaderService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);

    storageAdapter = {
      save: jest.fn().mockResolvedValue(undefined),
      saveBatch: jest.fn().mockResolvedValue(undefined),
    };

    options = {
      appName: 'log-uploader',
    };

    service = new LogUploaderService(options, storageAdapter);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns default status values when optional config is omitted', () => {
    expect(service.getStatus()).toEqual({
      status: 'up',
      appName: 'log-uploader',
      enableBatch: true,
      maxBatchSize: 200,
      storageType: 'file',
      allowedLevels: ['debug', 'info', 'warn', 'error'],
      supportedLogTypes: ['frontend', 'event', 'audit'],
      timestamp: fixedNow.toISOString(),
    });
  });

  it('returns configured status values when options override defaults', () => {
    const customService = new LogUploaderService(
      {
        appName: 'custom-app',
        enableBatch: false,
        maxBatchSize: 20,
        allowedLevels: ['info', 'error'],
        storage: {
          type: 'custom',
        },
      },
      storageAdapter,
    );

    expect(customService.getStatus()).toEqual({
      status: 'up',
      appName: 'custom-app',
      enableBatch: false,
      maxBatchSize: 20,
      storageType: 'custom',
      allowedLevels: ['info', 'error'],
      supportedLogTypes: ['frontend', 'event', 'audit'],
      timestamp: fixedNow.toISOString(),
    });
  });

  it('normalizes and saves a single log with request metadata and redaction', async () => {
    options.redactFields = ['secretCode'];
    service = new LogUploaderService(options, storageAdapter);

    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.7, 10.0.0.2',
        'user-agent': 'jest-agent',
      },
      socket: {
        remoteAddress: '198.51.100.2',
      },
    } as unknown as Request;

    await service.upload(
      {
        level: 'info',
        message: 'user logged in',
        properties: {
          password: 'supersecret',
          nested: {
            secretCode: 'ZXCASD1234',
          },
        },
        extra: {
          authorization: 'Bearer abcdefghi',
        },
      },
      request,
    );

    expect(storageAdapter.save).toHaveBeenCalledWith({
      appName: 'log-uploader',
      level: 'info',
      logType: 'frontend',
      message: 'user logged in',
      timestamp: fixedNow.toISOString(),
      serverReceiveTime: fixedNow.toISOString(),
      eventName: undefined,
      sessionId: undefined,
      source: undefined,
      channel: undefined,
      appVersion: undefined,
      platform: undefined,
      module: undefined,
      traceId: undefined,
      userId: undefined,
      deviceId: undefined,
      page: undefined,
      ip: '203.0.113.7',
      ua: 'jest-agent',
      properties: {
        password: 'sup***et',
        nested: {
          secretCode: 'ZXC***34',
        },
      },
      extra: {
        authorization: 'Bea***hi',
      },
    });
  });

  it('falls back to socket remoteAddress when x-forwarded-for is absent', async () => {
    const request = {
      headers: {
        'user-agent': 'jest-agent',
      },
      socket: {
        remoteAddress: '198.51.100.2',
      },
    } as unknown as Request;

    await service.upload(
      {
        level: 'warn',
        logType: 'audit',
        message: 'audit entry',
      },
      request,
    );

    expect(storageAdapter.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '198.51.100.2',
        ua: 'jest-agent',
      }),
    );
  });

  it('rejects event logs without eventName', async () => {
    await expect(
      service.upload({
        level: 'info',
        logType: 'event',
        message: 'missing event name',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(storageAdapter.save).not.toHaveBeenCalled();
  });

  it('rejects disallowed log levels', async () => {
    options.allowedLevels = ['error'];
    service = new LogUploaderService(options, storageAdapter);

    await expect(
      service.upload({
        level: 'warn',
        message: 'should fail',
      }),
    ).rejects.toThrow('Log level "warn" is not allowed. Allowed levels: error');

    expect(storageAdapter.save).not.toHaveBeenCalled();
  });

  it('converts storage failures in upload into internal errors', async () => {
    storageAdapter.save.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      service.upload({
        level: 'info',
        message: 'save me',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('saves normalized batch logs when batch upload is enabled', async () => {
    const request = {
      headers: {
        'user-agent': 'jest-agent',
      },
      socket: {
        remoteAddress: '198.51.100.3',
      },
    } as unknown as Request;

    await service.uploadBatch(
      [
        {
          level: 'debug',
          message: 'first',
        },
        {
          level: 'error',
          logType: 'event',
          eventName: 'job_failed',
          message: 'second',
        },
      ],
      request,
    );

    expect(storageAdapter.saveBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        appName: 'log-uploader',
        level: 'debug',
        logType: 'frontend',
        timestamp: fixedNow.toISOString(),
        serverReceiveTime: fixedNow.toISOString(),
        ip: '198.51.100.3',
        ua: 'jest-agent',
      }),
      expect.objectContaining({
        appName: 'log-uploader',
        level: 'error',
        logType: 'event',
        eventName: 'job_failed',
        timestamp: fixedNow.toISOString(),
        serverReceiveTime: fixedNow.toISOString(),
        ip: '198.51.100.3',
        ua: 'jest-agent',
      }),
    ]);
  });

  it('rejects batch upload when disabled', async () => {
    options.enableBatch = false;
    service = new LogUploaderService(options, storageAdapter);

    await expect(
      service.uploadBatch([
        {
          level: 'info',
          message: 'batch',
        },
      ]),
    ).rejects.toThrow('Batch upload is disabled');

    expect(storageAdapter.saveBatch).not.toHaveBeenCalled();
  });

  it('rejects batch upload when it exceeds the configured size', async () => {
    options.maxBatchSize = 1;
    service = new LogUploaderService(options, storageAdapter);

    await expect(
      service.uploadBatch([
        {
          level: 'info',
          message: 'first',
        },
        {
          level: 'info',
          message: 'second',
        },
      ]),
    ).rejects.toThrow('Batch size exceeds limit: 1');

    expect(storageAdapter.saveBatch).not.toHaveBeenCalled();
  });

  it('fails the whole batch when one item breaks business rules', async () => {
    await expect(
      service.uploadBatch([
        {
          level: 'info',
          message: 'valid',
        },
        {
          level: 'info',
          logType: 'event',
          message: 'invalid',
        },
      ]),
    ).rejects.toThrow(BadRequestException);

    expect(storageAdapter.saveBatch).not.toHaveBeenCalled();
  });

  it('converts storage failures in uploadBatch into internal errors', async () => {
    storageAdapter.saveBatch.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      service.uploadBatch([
        {
          level: 'info',
          message: 'save me',
        },
      ]),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
