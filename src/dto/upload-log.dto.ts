import {IsIn, IsISO8601, IsObject, IsOptional, IsString, MaxLength} from 'class-validator';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {LogLevel, LogType} from '../common/interfaces';

export class UploadLogDto {
  @ApiProperty({
    example: 'info',
    enum: ['debug', 'info', 'warn', 'error'],
  })
  @IsIn(['debug', 'info', 'warn', 'error'])
  level!: LogLevel;

  @ApiPropertyOptional({
    example: 'event',
    enum: ['frontend', 'event', 'audit'],
    description: '日志类型，默认 frontend',
  })
  @IsOptional()
  @IsIn(['frontend', 'event', 'audit'])
  logType?: LogType;

  @ApiProperty({
    example: 'user clicked generate button',
    maxLength: 5000,
  })
  @IsString()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({
    example: 'generate_button_click',
    description: '埋点事件名',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventName?: string;

  @ApiPropertyOptional({
    example: 'session_001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'editor_toolbar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({
    example: 'wechat',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  channel?: string;

  @ApiPropertyOptional({
    example: '1.0.3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional({
    example: 'wechat-miniapp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({
    example: '2026-03-19T08:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @ApiPropertyOptional({example: 'frontend'})
  @IsOptional()
  @IsString()
  @MaxLength(100)
  module?: string;

  @ApiPropertyOptional({example: 'trace_001'})
  @IsOptional()
  @IsString()
  @MaxLength(100)
  traceId?: string;

  @ApiPropertyOptional({example: 'u_001'})
  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;

  @ApiPropertyOptional({example: 'device_001'})
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;

  @ApiPropertyOptional({example: '/pages/home/index'})
  @IsOptional()
  @IsString()
  @MaxLength(500)
  page?: string;

  @ApiPropertyOptional({
    example: {
      buttonName: '一键生成',
      novelId: 'n001',
      chapterId: 'c003',
    },
    description: '埋点属性',
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      status: 500,
      reason: 'timeout',
    },
    description: '额外扩展字段',
  })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}
