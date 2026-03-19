import {IsNotEmpty, IsString} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {QueryLogPaginationDto} from './query-log-pagination.dto';

export class QueryLogsByTraceIdDto extends QueryLogPaginationDto {
  @ApiProperty({
    description: '链路追踪 ID',
    example: 'trace_001',
  })
  @IsString()
  @IsNotEmpty()
  traceId!: string;
}
