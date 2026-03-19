import {BadRequestException, InternalServerErrorException} from '@nestjs/common';
import type {NormalizedLog} from '../../common/interfaces';
import type {LogUploaderModuleOptions} from '../../config/log-uploader.options';
import {LogUploaderAdminQueryService} from './log-uploader-admin-query.service';

describe('LogUploaderAdminQueryService', () => {
  let service: LogUploaderAdminQueryService;

  const createLog = (overrides: Partial<NormalizedLog> = {}): NormalizedLog => ({
    appName: 'log-uploader',
    level: 'info',
    logType: 'frontend',
    message: 'default message',
    timestamp: '2026-03-19T08:00:00.000Z',
    serverReceiveTime: '2026-03-19T08:00:01.000Z',
    ...overrides,
  });

  const serializeLogs = (...logs: Array<NormalizedLog | string>): string[] =>
    logs.map((log) => (typeof log === 'string' ? log : JSON.stringify(log)));

  beforeEach(() => {
    service = new LogUploaderAdminQueryService({
      appName: 'log-uploader',
      storage: {
        type: 'file',
      },
    } as LogUploaderModuleOptions);
  });

  it('rejects blank traceId values', async () => {
    await expect(service.getLogsByTraceId({traceId: '   '})).rejects.toThrow(BadRequestException);
  });

  it('rejects search ranges where startTime is after endTime', async () => {
    await expect(
      service.searchLogs({
        startTime: '2026-03-20T00:00:00.000Z',
        endTime: '2026-03-19T00:00:00.000Z',
      }),
    ).rejects.toThrow('startTime cannot be greater than endTime');
  });

  it('returns recent logs filtered by level, sorted desc, with cursor pagination', async () => {
    jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({
          message: 'older info',
          level: 'info',
          timestamp: '2026-03-19T08:00:00.000Z',
        }),
        createLog({
          message: 'newest info',
          level: 'info',
          timestamp: '2026-03-19T10:00:00.000Z',
        }),
        createLog({
          message: 'ignored warn',
          level: 'warn',
          timestamp: '2026-03-19T09:00:00.000Z',
        }),
        createLog({
          message: 'middle info',
          level: 'info',
          timestamp: '2026-03-19T09:30:00.000Z',
        }),
      ),
    );

    const result = await service.getRecentLogs({
      level: 'info',
      limit: 2,
      cursor: '2026-03-19T10:00:00.000Z',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          message: 'middle info',
          timestamp: '2026-03-19T09:30:00.000Z',
        }),
        expect.objectContaining({
          message: 'older info',
          timestamp: '2026-03-19T08:00:00.000Z',
        }),
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('returns hasMore and nextCursor when more recent logs exist beyond the limit', async () => {
    jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({message: 'first', timestamp: '2026-03-19T08:00:00.000Z'}),
        createLog({message: 'second', timestamp: '2026-03-19T09:00:00.000Z'}),
        createLog({message: 'third', timestamp: '2026-03-19T10:00:00.000Z'}),
      ),
    );

    const result = await service.getRecentLogs({limit: 2});

    expect(result.items.map((item) => item.message)).toEqual(['third', 'second']);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('2026-03-19T09:00:00.000Z');
  });

  it('returns only the requested traceId and respects the cursor', async () => {
    jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({
          message: 'too new',
          traceId: 'trace-1',
          timestamp: '2026-03-19T11:00:00.000Z',
        }),
        createLog({
          message: 'other trace',
          traceId: 'trace-2',
          timestamp: '2026-03-19T10:00:00.000Z',
        }),
        createLog({
          message: 'matched',
          traceId: 'trace-1',
          timestamp: '2026-03-19T09:00:00.000Z',
        }),
      ),
    );

    const result = await service.getLogsByTraceId({
      traceId: ' trace-1 ',
      limit: 5,
      cursor: '2026-03-19T10:30:00.000Z',
    });

    expect(result.items.map((item) => item.message)).toEqual(['matched']);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('searches across message and serialized properties/extra while applying field filters', async () => {
    jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({
          message: 'report generated',
          level: 'error',
          logType: 'event',
          traceId: 'trace-1',
          eventName: 'report.export',
          sessionId: 'session-1',
          channel: 'wechat',
          platform: 'miniapp',
          properties: {
            keyword: 'AlphaBeta',
          },
          extra: {
            note: 'alpha-beta export',
          },
          timestamp: '2026-03-19T09:00:00.000Z',
        }),
        createLog({
          message: 'report generated',
          level: 'error',
          logType: 'event',
          traceId: 'trace-1',
          eventName: 'report.export',
          sessionId: 'session-2',
          channel: 'wechat',
          platform: 'miniapp',
          properties: {
            keyword: 'AlphaBeta',
          },
          timestamp: '2026-03-19T09:30:00.000Z',
        }),
      ),
    );

    const result = await service.searchLogs({
      keyword: 'alpha-beta',
      level: 'error',
      logType: 'event',
      traceId: 'trace-1',
      eventName: 'report.export',
      sessionId: 'session-1',
      channel: 'wechat',
      platform: 'miniapp',
      startTime: '2026-03-19T08:30:00.000Z',
      endTime: '2026-03-19T09:15:00.000Z',
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        message: 'report generated',
        sessionId: 'session-1',
      }),
    );
  });

  it('returns default stats for 7 days and aggregates counts while skipping bad lines', async () => {
    const getSortedLogFilesSpy = jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({
          level: 'info',
          logType: 'frontend',
          message: 'frontend ok',
          timestamp: '2026-03-19T08:00:00.000Z',
        }),
        createLog({
          level: 'error',
          logType: 'event',
          eventName: 'user.signup',
          message: 'event failed',
          timestamp: '2026-03-19T09:00:00.000Z',
        }),
        createLog({
          level: 'warn',
          logType: 'event',
          eventName: 'user.signup',
          message: 'event warn',
          timestamp: '2026-03-18T09:00:00.000Z',
        }),
        'not-json',
      ),
    );

    const result = await service.getLogStats();

    expect(getSortedLogFilesSpy).toHaveBeenCalledWith({
      days: 7,
      logType: undefined,
    });
    expect(result).toEqual({
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
      byDate: [
        {date: '2026-03-19', count: 2},
        {date: '2026-03-18', count: 1},
      ],
    });
  });

  it('normalizes stats filters before loading files', async () => {
    const getSortedLogFilesSpy = jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockResolvedValue(
      serializeLogs(
        createLog({
          level: 'error',
          logType: 'event',
          eventName: 'user.signup',
        }),
        createLog({
          level: 'info',
          logType: 'audit',
          eventName: 'other.event',
        }),
      ),
    );

    const result = await service.getLogStats({
      days: 99,
      logType: 'event',
      eventName: ' user.signup ',
    });

    expect(getSortedLogFilesSpy).toHaveBeenCalledWith({
      days: 30,
      logType: 'event',
    });
    expect(result.days).toBe(30);
    expect(result.total).toBe(1);
    expect(result.byLogType.event).toBe(1);
    expect(result.byEventName).toEqual([{eventName: 'user.signup', count: 1}]);
  });

  it('converts read failures in stats into internal errors', async () => {
    jest.spyOn(service as any, 'getSortedLogFiles').mockResolvedValue(['day-1.log']);
    jest.spyOn(service as any, 'readLogFileLines').mockRejectedValue(new Error('cannot read'));

    await expect(service.getLogStats()).rejects.toThrow(InternalServerErrorException);
  });
});
