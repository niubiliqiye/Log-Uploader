import {LogUploaderAdminController} from './log-uploader-admin.controller';
import {LogUploaderAdminQueryService} from '../services/log-uploader-admin-query.service';

describe('LogUploaderAdminController', () => {
  let service: jest.Mocked<
    Pick<LogUploaderAdminQueryService, 'getRecentLogs' | 'getLogsByTraceId' | 'searchLogs' | 'getLogStats'>
  >;
  let controller: LogUploaderAdminController;

  beforeEach(() => {
    service = {
      getRecentLogs: jest.fn(),
      getLogsByTraceId: jest.fn(),
      searchLogs: jest.fn(),
      getLogStats: jest.fn(),
    };

    controller = new LogUploaderAdminController(service as unknown as LogUploaderAdminQueryService);
  });

  it('getRecentLogs forwards query params and wraps the paged response', async () => {
    service.getRecentLogs.mockResolvedValue({
      items: [{message: 'one'} as any, {message: 'two'} as any],
      hasMore: true,
      nextCursor: '2026-03-19T09:00:00.000Z',
    });

    await expect(
      controller.getRecentLogs({
        limit: 10,
        level: 'error',
        days: 7,
        cursor: '2026-03-19T10:00:00.000Z',
      }),
    ).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        total: 2,
        hasMore: true,
        nextCursor: '2026-03-19T09:00:00.000Z',
        items: [{message: 'one'}, {message: 'two'}],
      },
    });

    expect(service.getRecentLogs).toHaveBeenCalledWith({
      limit: 10,
      level: 'error',
      days: 7,
      cursor: '2026-03-19T10:00:00.000Z',
    });
  });

  it('getLogsByTraceId forwards query params and includes traceId in the response payload', async () => {
    service.getLogsByTraceId.mockResolvedValue({
      items: [{traceId: 'trace-1'} as any],
      hasMore: false,
      nextCursor: null,
    });

    await expect(
      controller.getLogsByTraceId({
        traceId: 'trace-1',
        limit: 20,
        days: 3,
        cursor: '2026-03-19T08:00:00.000Z',
      }),
    ).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        traceId: 'trace-1',
        total: 1,
        hasMore: false,
        nextCursor: null,
        items: [{traceId: 'trace-1'}],
      },
    });

    expect(service.getLogsByTraceId).toHaveBeenCalledWith({
      traceId: 'trace-1',
      limit: 20,
      days: 3,
      cursor: '2026-03-19T08:00:00.000Z',
    });
  });

  it('searchLogs forwards all search filters and wraps the paged result', async () => {
    service.searchLogs.mockResolvedValue({
      items: [{message: 'matched'} as any],
      hasMore: false,
      nextCursor: null,
    });

    await expect(
      controller.searchLogs({
        keyword: 'timeout',
        level: 'warn',
        logType: 'event',
        traceId: 'trace-1',
        eventName: 'button_click',
        sessionId: 'session-1',
        channel: 'wechat',
        platform: 'miniapp',
        startTime: '2026-03-19T00:00:00.000Z',
        endTime: '2026-03-19T23:59:59.999Z',
        limit: 5,
        days: 2,
        cursor: '2026-03-19T08:00:00.000Z',
      }),
    ).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        total: 1,
        hasMore: false,
        nextCursor: null,
        items: [{message: 'matched'}],
      },
    });

    expect(service.searchLogs).toHaveBeenCalledWith({
      keyword: 'timeout',
      level: 'warn',
      logType: 'event',
      traceId: 'trace-1',
      eventName: 'button_click',
      sessionId: 'session-1',
      channel: 'wechat',
      platform: 'miniapp',
      startTime: '2026-03-19T00:00:00.000Z',
      endTime: '2026-03-19T23:59:59.999Z',
      limit: 5,
      days: 2,
      cursor: '2026-03-19T08:00:00.000Z',
    });
  });

  it('getLogStats forwards stats filters and wraps the service result', async () => {
    service.getLogStats.mockResolvedValue({
      days: 7,
      total: 3,
      byLevel: {
        debug: 0,
        info: 1,
        warn: 1,
        error: 1,
      },
      byLogType: {
        frontend: 1,
        event: 2,
        audit: 0,
      },
      byEventName: [{eventName: 'user.signup', count: 2}],
      byDate: [{date: '2026-03-19', count: 3}],
    });

    await expect(
      controller.getLogStats({
        days: 7,
        logType: 'event',
        eventName: 'user.signup',
      }),
    ).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        days: 7,
        total: 3,
        byLevel: {
          debug: 0,
          info: 1,
          warn: 1,
          error: 1,
        },
        byLogType: {
          frontend: 1,
          event: 2,
          audit: 0,
        },
        byEventName: [{eventName: 'user.signup', count: 2}],
        byDate: [{date: '2026-03-19', count: 3}],
      },
    });

    expect(service.getLogStats).toHaveBeenCalledWith({
      days: 7,
      logType: 'event',
      eventName: 'user.signup',
    });
  });
});
