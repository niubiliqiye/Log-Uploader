import {Type} from 'class-transformer';
import {ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {UploadLogDto} from './upload-log.dto';

export class UploadLogBatchDto {
  @ApiProperty({
    type: [UploadLogDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({each: true})
  @Type(() => UploadLogDto)
  logs!: UploadLogDto[];
}
