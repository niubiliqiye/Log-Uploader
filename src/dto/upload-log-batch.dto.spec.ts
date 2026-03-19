import 'reflect-metadata';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {UploadLogBatchDto} from './upload-log-batch.dto';

describe('UploadLogBatchDto', () => {
  it('passes validation for a single valid log', async () => {
    const dto = plainToInstance(UploadLogBatchDto, {
      logs: [
        {
          level: 'info',
          message: 'hello world',
        },
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('fails validation for an empty array', async () => {
    const dto = plainToInstance(UploadLogBatchDto, {
      logs: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'logs')).toBe(true);
  });

  it('fails validation when the batch exceeds 200 items', async () => {
    const dto = plainToInstance(UploadLogBatchDto, {
      logs: Array.from({length: 201}, () => ({
        level: 'info',
        message: 'hello world',
      })),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'logs')).toBe(true);
  });

  it('fails validation when a nested log item is invalid', async () => {
    const dto = plainToInstance(UploadLogBatchDto, {
      logs: [
        {
          level: 'invalid-level',
          message: 'hello world',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors[0]?.property).toBe('logs');
    expect(errors[0]?.children?.[0]?.children?.[0]?.property).toBe('level');
  });
});
