import 'reflect-metadata';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {UploadLogDto} from './upload-log.dto';

describe('UploadLogDto', () => {
  const createValidDto = () =>
    plainToInstance(UploadLogDto, {
      level: 'info',
      logType: 'frontend',
      message: 'hello world',
      timestamp: '2026-03-19T08:00:00.000Z',
      traceId: 'trace-1',
      properties: {
        key: 'value',
      },
      extra: {
        code: 500,
      },
    });

  it('passes validation with a minimal valid payload', async () => {
    const dto = plainToInstance(UploadLogDto, {
      level: 'info',
      message: 'hello world',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('fails when message exceeds the max length', async () => {
    const dto = createValidDto();
    dto.message = 'a'.repeat(5001);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'message')).toBe(true);
  });

  it('fails when traceId exceeds the max length', async () => {
    const dto = createValidDto();
    dto.traceId = 't'.repeat(101);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'traceId')).toBe(true);
  });

  it('fails when timestamp is not a valid ISO8601 string', async () => {
    const dto = createValidDto();
    dto.timestamp = 'not-a-date';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'timestamp')).toBe(true);
  });

  it('fails when properties is not an object', async () => {
    const dto = plainToInstance(UploadLogDto, {
      level: 'info',
      message: 'hello world',
      properties: 'bad-value',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'properties')).toBe(true);
  });

  it('fails when extra is not an object', async () => {
    const dto = plainToInstance(UploadLogDto, {
      level: 'info',
      message: 'hello world',
      extra: 'bad-value',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'extra')).toBe(true);
  });
});
