import {IsIn, IsOptional} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {LogLevel} from '../../common/interfaces';
import {QueryLogPaginationDto} from './query-log-pagination.dto';

export class QueryRecentLogsDto extends QueryLogPaginationDto {
  @ApiPropertyOptional({
    description: '按日志级别过滤',
    enum: ['debug', 'info', 'warn', 'error'],
    example: 'error',
  })
  @IsOptional()
  @IsIn(['debug', 'info', 'warn', 'error'])
  level?: LogLevel;
}
