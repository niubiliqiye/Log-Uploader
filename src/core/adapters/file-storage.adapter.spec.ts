jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    appendFile: jest.fn(),
  },
}));

import {promises as fs} from 'fs';
import type {NormalizedLog} from '../../common/interfaces';
import {FileStorageAdapter} from './file-storage.adapter';

describe('FileStorageAdapter', () => {
  const mkdirMock = jest.mocked(fs.mkdir);
  const appendFileMock = jest.mocked(fs.appendFile);

  const createLog = (overrides: Partial<NormalizedLog> = {}): NormalizedLog => ({
    appName: 'log-uploader',
    level: 'info',
    logType: 'frontend',
    message: 'hello',
    timestamp: '2026-03-19T08:00:00.000Z',
    serverReceiveTime: '2026-03-19T08:00:01.000Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    appendFileMock.mockResolvedValue(undefined);
  });

  it('writes a single log to the date-based file path', async () => {
    const adapter = new FileStorageAdapter('demo-app', '/tmp/logs');
    const log = createLog();

    await adapter.save(log);

    expect(mkdirMock).toHaveBeenCalledWith('/tmp/logs/demo-app', {recursive: true});
    expect(appendFileMock).toHaveBeenCalledWith(
      '/tmp/logs/demo-app/2026-03-19.log',
      `${JSON.stringify(log)}\n`,
      'utf8',
    );
  });

  it('writes split-by-log-type paths when enabled', async () => {
    const adapter = new FileStorageAdapter('demo-app', '/tmp/logs', true);
    const log = createLog({logType: 'event'});

    await adapter.save(log);

    expect(mkdirMock).toHaveBeenCalledWith('/tmp/logs/demo-app/event', {recursive: true});
    expect(appendFileMock).toHaveBeenCalledWith(
      '/tmp/logs/demo-app/event/2026-03-19.log',
      `${JSON.stringify(log)}\n`,
      'utf8',
    );
  });

  it('does nothing for empty batches', async () => {
    const adapter = new FileStorageAdapter('demo-app', '/tmp/logs');

    await adapter.saveBatch([]);

    expect(mkdirMock).not.toHaveBeenCalled();
    expect(appendFileMock).not.toHaveBeenCalled();
  });

  it('groups batch writes by destination file', async () => {
    const adapter = new FileStorageAdapter('demo-app', '/tmp/logs', true);
    const frontendLog = createLog({
      message: 'frontend',
      logType: 'frontend',
      timestamp: '2026-03-19T08:00:00.000Z',
    });
    const eventLog = createLog({
      message: 'event',
      logType: 'event',
      timestamp: '2026-03-19T09:00:00.000Z',
    });
    const nextDayFrontendLog = createLog({
      message: 'frontend-2',
      logType: 'frontend',
      timestamp: '2026-03-20T08:00:00.000Z',
    });

    await adapter.saveBatch([frontendLog, eventLog, nextDayFrontendLog]);

    expect(mkdirMock).toHaveBeenCalledTimes(3);
    expect(appendFileMock).toHaveBeenCalledTimes(3);
    expect(appendFileMock).toHaveBeenNthCalledWith(
      1,
      '/tmp/logs/demo-app/frontend/2026-03-19.log',
      `${JSON.stringify(frontendLog)}\n`,
      'utf8',
    );
    expect(appendFileMock).toHaveBeenNthCalledWith(
      2,
      '/tmp/logs/demo-app/event/2026-03-19.log',
      `${JSON.stringify(eventLog)}\n`,
      'utf8',
    );
    expect(appendFileMock).toHaveBeenNthCalledWith(
      3,
      '/tmp/logs/demo-app/frontend/2026-03-20.log',
      `${JSON.stringify(nextDayFrontendLog)}\n`,
      'utf8',
    );
  });
});
