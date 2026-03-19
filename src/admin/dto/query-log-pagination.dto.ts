import {Type} from 'class-transformer';
import {IsInt, IsISO8601, IsOptional, Max, Min} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class QueryLogPaginationDto {
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
    description: '游标时间，只返回比该时间更早的日志',
    example: '2026-03-19T06:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  cursor?: string;

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
}
