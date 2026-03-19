import {IsIn, IsOptional, IsString, MaxLength} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, Max, Min} from 'class-validator';
import {LogType} from '../../common/interfaces';

export class QueryLogStatsDto {
  @ApiPropertyOptional({
    description: '仅统计最近 N 天日志文件，最小 1，最大 30，默认 7',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number = 7;

  @ApiPropertyOptional({
    description: '按日志类型过滤',
    enum: ['frontend', 'event', 'audit'],
    example: 'event',
  })
  @IsOptional()
  @IsIn(['frontend', 'event', 'audit'])
  logType?: LogType;

  @ApiPropertyOptional({
    description: '按埋点事件名过滤，仅对 event 类型有意义',
    example: 'button_click',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventName?: string;
}
