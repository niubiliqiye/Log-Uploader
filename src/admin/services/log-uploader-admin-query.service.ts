import {BadRequestException, Inject, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import {promises as fs} from 'fs';
import {join} from 'path';
import {LOG_UPLOADER_OPTIONS} from '../../common/constants';
import {LogLevel, LogType, NormalizedLog} from '../../common/interfaces';
import {LogUploaderModuleOptions} from '../../config/log-uploader.options';

interface LogQueryPageResult {
  items: NormalizedLog[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class LogUploaderAdminQueryService {
  private readonly logger = new Logger(LogUploaderAdminQueryService.name);

  constructor(
    @Inject(LOG_UPLOADER_OPTIONS)
    private readonly options: LogUploaderModuleOptions,
  ) {}

  async getRecentLogs(params?: {
    limit?: number;
    level?: LogLevel;
    days?: number;
    cursor?: string;
  }): Promise<LogQueryPageResult> {
    return this.queryLogs(
      {
        limit: params?.limit,
        days: params?.days,
        cursor: params?.cursor,
      },
      (log) => {
        if (params?.level && log.level !== params.level) {
          return false;
        }
        return true;
      },
    );
  }

  async getLogsByTraceId(params: {
    traceId: string;
    limit?: number;
    days?: number;
    cursor?: string;
  }): Promise<LogQueryPageResult> {
    const traceId = params.traceId.trim();
    if (!traceId) {
      throw new BadRequestException('traceId is required');
    }

    return this.queryLogs(
      {
        limit: params.limit,
        days: params.days,
        cursor: params.cursor,
      },
      (log) => log.traceId === traceId,
    );
  }

  async searchLogs(params?: {
    keyword?: string;
    level?: LogLevel;
    logType?: LogType;
    traceId?: string;
    eventName?: string;
    sessionId?: string;
    channel?: string;
    platform?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    days?: number;
    cursor?: string;
  }): Promise<LogQueryPageResult> {
    const keyword = params?.keyword?.trim().toLowerCase();
    const level = params?.level;
    const logType = params?.logType;
    const traceId = params?.traceId?.trim();
    const eventName = params?.eventName?.trim();
    const sessionId = params?.sessionId?.trim();
    const channel = params?.channel?.trim();
    const platform = params?.platform?.trim();
    const startTime = params?.startTime ? new Date(params.startTime).getTime() : undefined;
    const endTime = params?.endTime ? new Date(params.endTime).getTime() : undefined;

    if (startTime !== undefined && endTime !== undefined && startTime > endTime) {
      throw new BadRequestException('startTime cannot be greater than endTime');
    }

    return this.queryLogs(
      {
        limit: params?.limit,
        days: params?.days,
        cursor: params?.cursor,
        logType,
      },
      (log) =>
        this.matchesFilters(log, {
          keyword,
          level,
          logType,
          traceId,
          eventName,
          sessionId,
          channel,
          platform,
          startTime,
          endTime,
        }),
    );
  }

  async getLogStats(params?: {days?: number; logType?: LogType; eventName?: string}): Promise<{
    days: number;
    total: number;
    byLevel: Record<LogLevel, number>;
    byLogType: Record<LogType, number>;
    byEventName: Array<{eventName: string; count: number}>;
    byDate: Array<{date: string; count: number}>;
  }> {
    const days = this.normalizeDays(params?.days) ?? 7;
    const logType = params?.logType;
    const eventName = params?.eventName?.trim();

    const logFiles = await this.getSortedLogFiles({
      days,
      logType,
    });

    try {
      const byLevel: Record<LogLevel, number> = {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
      };

      const byLogType: Record<LogType, number> = {
        frontend: 0,
        event: 0,
        audit: 0,
      };

      const byDateMap = new Map<string, number>();
      const byEventNameMap = new Map<string, number>();
      let total = 0;

      for (const filePath of logFiles) {
        const lines = await this.readLogFileLines(filePath);

        for (const line of lines) {
          const parsed = this.safeParseLog(line);
          if (!parsed) continue;

          if (logType && parsed.logType !== logType) {
            continue;
          }

          if (eventName && parsed.eventName !== eventName) {
            continue;
          }

          total += 1;
          byLevel[parsed.level] += 1;
          byLogType[parsed.logType] += 1;

          const date = this.extractDate(parsed.timestamp);
          if (date) {
            byDateMap.set(date, (byDateMap.get(date) ?? 0) + 1);
          }

          if (parsed.logType === 'event' && parsed.eventName) {
            byEventNameMap.set(parsed.eventName, (byEventNameMap.get(parsed.eventName) ?? 0) + 1);
          }
        }
      }

      const byDate = Array.from(byDateMap.entries())
        .map(([date, count]) => ({date, count}))
        .sort((a, b) => b.date.localeCompare(a.date));

      const byEventName = Array.from(byEventNameMap.entries())
        .map(([name, count]) => ({eventName: name, count}))
        .sort((a, b) => b.count - a.count);

      return {
        days,
        total,
        byLevel,
        byLogType,
        byEventName,
        byDate,
      };
    } catch (error) {
      this.logger.error('Failed to get log stats', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to get log stats');
    }
  }

  private async queryLogs(
    params: {
      limit?: number;
      days?: number;
      cursor?: string;
      logType?: LogType;
    },
    matcher: (log: NormalizedLog) => boolean,
  ): Promise<LogQueryPageResult> {
    const limit = this.normalizeLimit(params.limit);
    const days = this.normalizeDays(params.days);
    const cursorTime = params.cursor ? new Date(params.cursor).getTime() : undefined;

    const logFiles = await this.getSortedLogFiles({
      days,
      logType: params.logType,
    });

    try {
      const collected: NormalizedLog[] = [];
      let hasMore = false;

      for (const filePath of logFiles) {
        if (collected.length > limit) break;

        const lines = await this.readLogFileLines(filePath);

        for (let i = lines.length - 1; i >= 0; i -= 1) {
          const parsed = this.safeParseLog(lines[i]);
          if (!parsed) continue;

          const parsedTime = new Date(parsed.timestamp).getTime();

          if (cursorTime !== undefined && Number.isFinite(parsedTime) && parsedTime >= cursorTime) {
            continue;
          }

          if (!matcher(parsed)) {
            continue;
          }

          collected.push(parsed);

          if (collected.length > limit) {
            hasMore = true;
            break;
          }
        }
      }

      const sorted = this.sortLogsDesc(collected).slice(0, limit);
      const nextCursor = hasMore && sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null;

      return {
        items: sorted,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Failed to query logs', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to query logs');
    }
  }

  private matchesFilters(
    log: NormalizedLog,
    filters: {
      keyword?: string;
      level?: LogLevel;
      logType?: LogType;
      traceId?: string;
      eventName?: string;
      sessionId?: string;
      channel?: string;
      platform?: string;
      startTime?: number;
      endTime?: number;
    },
  ): boolean {
    if (filters.level && log.level !== filters.level) {
      return false;
    }

    if (filters.logType && log.logType !== filters.logType) {
      return false;
    }

    if (filters.traceId && log.traceId !== filters.traceId) {
      return false;
    }

    if (filters.eventName && log.eventName !== filters.eventName) {
      return false;
    }

    if (filters.sessionId && log.sessionId !== filters.sessionId) {
      return false;
    }

    if (filters.channel && log.channel !== filters.channel) {
      return false;
    }

    if (filters.platform && log.platform !== filters.platform) {
      return false;
    }

    const logTime = new Date(log.timestamp).getTime();

    if (filters.startTime !== undefined && Number.isFinite(logTime) && logTime < filters.startTime) {
      return false;
    }

    if (filters.endTime !== undefined && Number.isFinite(logTime) && logTime > filters.endTime) {
      return false;
    }

    if (filters.keyword) {
      const haystack = this.buildSearchText(log);
      if (!haystack.includes(filters.keyword)) {
        return false;
      }
    }

    return true;
  }

  private buildSearchText(log: NormalizedLog): string {
    return [
      log.message,
      log.module,
      log.page,
      log.traceId,
      log.userId,
      log.deviceId,
      log.eventName,
      log.sessionId,
      log.channel,
      log.platform,
      this.safeStringify(log.properties),
      this.safeStringify(log.extra),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  private safeStringify(value: unknown): string {
    try {
      return value ? JSON.stringify(value) : '';
    } catch {
      return '';
    }
  }

  private async getSortedLogFiles(params?: {days?: number; logType?: LogType}): Promise<string[]> {
    const storageType = this.options.storage?.type ?? 'file';

    if (storageType !== 'file') {
      throw new BadRequestException('Admin log query currently supports file storage only');
    }

    const baseDir = this.options.storage?.baseDir ?? './logs';
    const appDir = join(baseDir, this.options.appName);
    const splitByLogType = this.options.storage?.splitByLogType ?? false;
    const days = params?.days;
    const logType = params?.logType;

    try {
      const allowedNames = days !== undefined ? new Set(this.buildRecentLogFileNames(days)) : null;

      if (!splitByLogType) {
        const dirEntries = await fs.readdir(appDir, {
          withFileTypes: true,
        });

        let fileNames = dirEntries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a));

        if (allowedNames) {
          fileNames = fileNames.filter((name) => allowedNames.has(name));
        }

        return fileNames.map((name) => join(appDir, name));
      }

      const targetLogTypes: LogType[] = logType ? [logType] : ['frontend', 'event', 'audit'];
      const collectedPaths: string[] = [];

      for (const type of targetLogTypes) {
        const typeDir = join(appDir, type);

        let dirEntries: import('fs').Dirent<string>[];
        try {
          dirEntries = await fs.readdir(typeDir, {
            withFileTypes: true,
            encoding: 'utf8',
          });
        } catch {
          continue;
        }

        let fileNames = dirEntries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a));

        if (allowedNames) {
          fileNames = fileNames.filter((name) => allowedNames.has(name));
        }

        for (const name of fileNames) {
          collectedPaths.push(join(typeDir, name));
        }
      }

      return collectedPaths.sort((a, b) => b.localeCompare(a));
    } catch (error) {
      this.logger.error('Failed to read log directory', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to read log directory');
    }
  }

  private buildRecentLogFileNames(days: number): string[] {
    const names: string[] = [];
    const now = new Date();

    for (let i = 0; i < days; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      names.push(`${yyyy}-${mm}-${dd}.log`);
    }

    return names;
  }

  private extractDate(timestamp: string): string | null {
    const time = new Date(timestamp).getTime();
    if (!Number.isFinite(time)) {
      return null;
    }

    return timestamp.slice(0, 10);
  }

  private async readLogFileLines(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, 'utf8');

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private safeParseLog(line: string): NormalizedLog | null {
    try {
      return JSON.parse(line) as NormalizedLog;
    } catch {
      return null;
    }
  }

  private normalizeLimit(limit?: number): number {
    return Math.min(Math.max(limit ?? 50, 1), 200);
  }

  private normalizeDays(days?: number): number | undefined {
    if (days === undefined) {
      return undefined;
    }

    return Math.min(Math.max(days, 1), 30);
  }

  private sortLogsDesc(logs: NormalizedLog[]): NormalizedLog[] {
    return logs.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });
  }
}
