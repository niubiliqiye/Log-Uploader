import {Type} from 'class-transformer';
import {IsIn, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {LogLevel, LogType} from '../../common/interfaces';

export class SearchLogsDto {
  @ApiPropertyOptional({
    description: '关键词，匹配 message/module/page/traceId/userId/deviceId/eventName/properties/extra',
    example: 'timeout',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({
    description: '按日志级别过滤',
    enum: ['debug', 'info', 'warn', 'error'],
    example: 'error',
  })
  @IsOptional()
  @IsIn(['debug', 'info', 'warn', 'error'])
  level?: LogLevel;

  @ApiPropertyOptional({
    description: '按日志类型过滤',
    enum: ['frontend', 'event', 'audit'],
    example: 'event',
  })
  @IsOptional()
  @IsIn(['frontend', 'event', 'audit'])
  logType?: LogType;

  @ApiPropertyOptional({
    description: '按 traceId 精确过滤',
    example: 'trace_001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  traceId?: string;

  @ApiPropertyOptional({
    description: '按 eventName 精确过滤',
    example: 'button_click',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventName?: string;

  @ApiPropertyOptional({
    description: '按 sessionId 精确过滤',
    example: 'session_001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @ApiPropertyOptional({
    description: '按 channel 精确过滤',
    example: 'wechat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channel?: string;

  @ApiPropertyOptional({
    description: '按 platform 精确过滤',
    example: 'wechat-miniapp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({
    description: '开始时间（ISO 8601）',
    example: '2026-03-19T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间（ISO 8601）',
    example: '2026-03-19T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @ApiPropertyOptional({
    description: '返回条数，默认 50，最大 200',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: '仅扫描最近 N 天日志文件，最小 1，最大 30',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  @ApiPropertyOptional({
    description: '游标时间，只返回比该时间更早的日志',
    example: '2026-03-19T06:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  cursor?: string;
}
