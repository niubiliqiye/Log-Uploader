import {Body, Controller, Get, Post, Req, UseFilters, UseGuards} from '@nestjs/common';
import {Request} from 'express';
import {ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse} from '@nestjs/swagger';
import {LogUploaderExceptionFilter} from '../../common/filters/log-uploader-exception.filter';
import {successResponse} from '../../common/response';
import {UploadLogBatchDto} from '../../dto/upload-log-batch.dto';
import {UploadLogDto} from '../../dto/upload-log.dto';
import {LogUploadAuthGuard} from '../../core/guards/log-upload-auth.guard';
import {LogUploaderService} from '../../core/services/log-uploader.service';

@ApiTags('Log Uploader')
@Controller('internal/logs')
@UseFilters(LogUploaderExceptionFilter)
export class LogUploaderController {
  constructor(private readonly logUploaderService: LogUploaderService) {}

  @Get('health')
  @ApiOperation({summary: '日志模块健康检查'})
  @ApiOkResponse({description: '服务正常'})
  health() {
    return successResponse(this.logUploaderService.getStatus());
  }

  @Get('check')
  @UseGuards(LogUploadAuthGuard)
  @ApiOperation({summary: '检查日志接口鉴权是否正常'})
  @ApiBearerAuth()
  @ApiOkResponse({description: '鉴权成功'})
  @ApiUnauthorizedResponse({description: '鉴权失败'})
  check() {
    return successResponse(this.logUploaderService.getStatus(), 'authorized');
  }

  @Post('upload')
  @UseGuards(LogUploadAuthGuard)
  @ApiOperation({summary: '单条日志/埋点上传'})
  @ApiBearerAuth()
  @ApiBody({type: UploadLogDto})
  @ApiOkResponse({description: '上传成功'})
  async upload(@Body() dto: UploadLogDto, @Req() request: Request) {
    await this.logUploaderService.upload(dto, request);
    return successResponse(null);
  }

  @Post('batch')
  @UseGuards(LogUploadAuthGuard)
  @ApiOperation({summary: '批量日志/埋点上传'})
  @ApiBearerAuth()
  @ApiBody({type: UploadLogBatchDto})
  @ApiOkResponse({description: '批量上传成功'})
  async batch(@Body() dto: UploadLogBatchDto, @Req() request: Request) {
    await this.logUploaderService.uploadBatch(dto.logs, request);
    return successResponse({count: dto.logs.length});
  }
}
