import {BadRequestException, Inject, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import {Request} from 'express';
import {LOG_STORAGE_ADAPTER, LOG_UPLOADER_OPTIONS} from '../../common/constants';
import {LogLevel, NormalizedLog, StorageAdapter} from '../../common/interfaces';
import {deepRedact} from '../../common/utils';
import {LogUploaderModuleOptions} from '../../config/log-uploader.options';
import {UploadLogDto} from '../../dto/upload-log.dto';

@Injectable()
export class LogUploaderService {
  private readonly logger = new Logger(LogUploaderService.name);

  constructor(
    @Inject(LOG_UPLOADER_OPTIONS)
    private readonly options: LogUploaderModuleOptions,
    @Inject(LOG_STORAGE_ADAPTER)
    private readonly storageAdapter: StorageAdapter,
  ) {}

  getStatus() {
    return {
      status: 'up',
      appName: this.options.appName,
      enableBatch: this.options.enableBatch ?? true,
      maxBatchSize: this.options.maxBatchSize ?? 200,
      storageType: this.options.storage?.type ?? 'file',
      allowedLevels: this.options.allowedLevels ?? ['debug', 'info', 'warn', 'error'],
      supportedLogTypes: ['frontend', 'event', 'audit'],
      timestamp: new Date().toISOString(),
    };
  }

  async upload(dto: UploadLogDto, request?: Request): Promise<void> {
    this.ensureLevelAllowed(dto.level);
    this.validateBusinessRules(dto);

    try {
      const normalized = this.normalize(dto, request);
      await this.storageAdapter.save(normalized);
    } catch (error) {
      this.logger.error('Failed to save log', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to save log');
    }
  }

  async uploadBatch(dtos: UploadLogDto[], request?: Request): Promise<void> {
    const enableBatch = this.options.enableBatch ?? true;
    const maxBatchSize = this.options.maxBatchSize ?? 200;

    if (!enableBatch) {
      throw new BadRequestException('Batch upload is disabled');
    }

    if (dtos.length > maxBatchSize) {
      throw new BadRequestException(`Batch size exceeds limit: ${maxBatchSize}`);
    }

    for (const dto of dtos) {
      this.ensureLevelAllowed(dto.level);
      this.validateBusinessRules(dto);
    }

    try {
      const normalizedLogs = dtos.map((item) => this.normalize(item, request));
      await this.storageAdapter.saveBatch(normalizedLogs);
    } catch (error) {
      this.logger.error('Failed to save batch logs', error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Failed to save batch logs');
    }
  }

  private validateBusinessRules(dto: UploadLogDto): void {
    if (dto.logType === 'event' && !dto.eventName) {
      throw new BadRequestException('eventName is required when logType=event');
    }
  }

  private ensureLevelAllowed(level: LogLevel): void {
    const allowedLevels = this.options.allowedLevels ?? ['debug', 'info', 'warn', 'error'];

    if (!allowedLevels.includes(level)) {
      throw new BadRequestException(`Log level "${level}" is not allowed. Allowed levels: ${allowedLevels.join(', ')}`);
    }
  }

  private normalize(dto: UploadLogDto, request?: Request): NormalizedLog {
    const redactFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'phone',
      'idCard',
      ...(this.options.redactFields ?? []),
    ];

    return {
      appName: this.options.appName,
      level: dto.level,
      logType: dto.logType ?? 'frontend',
      message: dto.message,
      timestamp: dto.timestamp ?? new Date().toISOString(),
      serverReceiveTime: new Date().toISOString(),

      eventName: dto.eventName,
      sessionId: dto.sessionId,
      source: dto.source,
      channel: dto.channel,
      appVersion: dto.appVersion,
      platform: dto.platform,

      module: dto.module,
      traceId: dto.traceId,
      userId: dto.userId,
      deviceId: dto.deviceId,
      page: dto.page,
      ip: this.getIp(request),
      ua: request?.headers?.['user-agent'],

      properties: deepRedact(dto.properties, redactFields) as Record<string, any> | undefined,
      extra: deepRedact(dto.extra, redactFields) as Record<string, any> | undefined,
    };
  }

  private getIp(request?: Request): string | undefined {
    if (!request) return undefined;

    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request.socket?.remoteAddress;
  }
}
