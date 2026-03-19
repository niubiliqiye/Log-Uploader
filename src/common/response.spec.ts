import {successResponse} from './response';

describe('successResponse', () => {
  it('returns the standard success payload with default message', () => {
    expect(successResponse({ok: true})).toEqual({
      code: 0,
      message: 'ok',
      data: {ok: true},
    });
  });

  it('uses a custom message when provided', () => {
    expect(successResponse(['item'], 'created')).toEqual({
      code: 0,
      message: 'created',
      data: ['item'],
    });
  });
});
