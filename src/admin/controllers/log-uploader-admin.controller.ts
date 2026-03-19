import {Controller, Get, Query, UseFilters, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import {LogUploaderExceptionFilter} from '../../common/filters/log-uploader-exception.filter';
import {successResponse} from '../../common/response';
import {LogUploadAuthGuard} from '../../core/guards/log-upload-auth.guard';
import {QueryLogsByTraceIdDto} from '../dto/query-logs-by-trace-id.dto';
import {QueryLogStatsDto} from '../dto/query-log-stats.dto';
import {QueryRecentLogsDto} from '../dto/query-recent-logs.dto';
import {SearchLogsDto} from '../dto/search-logs.dto';
import {LogUploaderAdminQueryService} from '../services/log-uploader-admin-query.service';

@ApiTags('Log Uploader Admin')
@Controller('internal/logs/admin')
@UseFilters(LogUploaderExceptionFilter)
@UseGuards(LogUploadAuthGuard)
@ApiBearerAuth()
export class LogUploaderAdminController {
  constructor(private readonly adminQueryService: LogUploaderAdminQueryService) {}

  @Get('recent')
  @ApiOperation({summary: '查询最近日志'})
  @ApiOkResponse({description: '查询成功'})
  @ApiUnauthorizedResponse({description: '鉴权失败'})
  async getRecentLogs(@Query() query: QueryRecentLogsDto) {
    const result = await this.adminQueryService.getRecentLogs({
      limit: query.limit,
      level: query.level,
      days: query.days,
      cursor: query.cursor,
    });

    return successResponse({
      total: result.items.length,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      items: result.items,
    });
  }

  @Get('by-trace-id')
  @ApiOperation({summary: '按 traceId 查询日志'})
  @ApiOkResponse({description: '查询成功'})
  @ApiUnauthorizedResponse({description: '鉴权失败'})
  async getLogsByTraceId(@Query() query: QueryLogsByTraceIdDto) {
    const result = await this.adminQueryService.getLogsByTraceId({
      traceId: query.traceId,
      limit: query.limit,
      days: query.days,
      cursor: query.cursor,
    });

    return successResponse({
      traceId: query.traceId,
      total: result.items.length,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      items: result.items,
    });
  }

  @Get('search')
  @ApiOperation({summary: '按条件搜索日志/埋点'})
  @ApiOkResponse({description: '查询成功'})
  @ApiUnauthorizedResponse({description: '鉴权失败'})
  async searchLogs(@Query() query: SearchLogsDto) {
    const result = await this.adminQueryService.searchLogs({
      keyword: query.keyword,
      level: query.level,
      logType: query.logType,
      traceId: query.traceId,
      eventName: query.eventName,
      sessionId: query.sessionId,
      channel: query.channel,
      platform: query.platform,
      startTime: query.startTime,
      endTime: query.endTime,
      limit: query.limit,
      days: query.days,
      cursor: query.cursor,
    });

    return successResponse({
      total: result.items.length,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      items: result.items,
    });
  }

  @Get('stats')
  @ApiOperation({summary: '获取日志/埋点统计信息'})
  @ApiOkResponse({description: '统计成功'})
  @ApiUnauthorizedResponse({description: '鉴权失败'})
  async getLogStats(@Query() query: QueryLogStatsDto) {
    const stats = await this.adminQueryService.getLogStats({
      days: query.days,
      logType: query.logType,
      eventName: query.eventName,
    });

    return successResponse(stats);
  }
}
