import {deepRedact, maskValue} from './utils';

describe('maskValue', () => {
  it('masks long strings with prefix and suffix preserved', () => {
    expect(maskValue('abcdefghi')).toBe('abc***hi');
  });

  it('masks short strings as fully redacted', () => {
    expect(maskValue('abcdef')).toBe('***');
  });

  it('returns redacted placeholder for non-string values', () => {
    expect(maskValue(123456)).toBe('***');
  });
});

describe('deepRedact', () => {
  it('returns nullish values as-is', () => {
    expect(deepRedact(null, ['token'])).toBeNull();
    expect(deepRedact(undefined, ['token'])).toBeUndefined();
  });

  it('returns primitive values unchanged', () => {
    expect(deepRedact('plain-text', ['token'])).toBe('plain-text');
    expect(deepRedact(42, ['token'])).toBe(42);
    expect(deepRedact(true, ['token'])).toBe(true);
  });

  it('redacts nested objects and arrays with case-insensitive field matching', () => {
    const input = {
      token: 'abcdefghi',
      nested: {
        PassWord: 'mypassword',
        keep: 'visible',
      },
      list: [
        {
          authorization: 'Bearer abcdefghi',
          keep: 'item',
        },
        'plain',
      ],
    };

    expect(deepRedact(input, ['password', 'TOKEN', 'Authorization'])).toEqual({
      token: 'abc***hi',
      nested: {
        PassWord: 'myp***rd',
        keep: 'visible',
      },
      list: [
        {
          authorization: 'Bea***hi',
          keep: 'item',
        },
        'plain',
      ],
    });
  });

  it('keeps non-targeted fields unchanged in mixed nested structures', () => {
    const input = {
      profile: {
        name: 'tester',
        meta: [{id: 1}, {id: 2}],
      },
      tags: ['a', 'b'],
    };

    expect(deepRedact(input, ['password'])).toEqual(input);
  });
});
