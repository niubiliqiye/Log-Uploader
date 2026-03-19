import {UnauthorizedException} from '@nestjs/common';
import type {ExecutionContext} from '@nestjs/common';
import {LogUploadAuthGuard} from './log-upload-auth.guard';

describe('LogUploadAuthGuard', () => {
  const createContext = (authorization?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization,
          },
        }),
      }),
    }) as ExecutionContext;

  it('allows requests when authToken is not configured', () => {
    const guard = new LogUploadAuthGuard({appName: 'log-uploader'});

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows requests with the matching bearer token', () => {
    const guard = new LogUploadAuthGuard({
      appName: 'log-uploader',
      authToken: 'secret-token',
    });

    expect(guard.canActivate(createContext('Bearer secret-token'))).toBe(true);
  });

  it('rejects requests with a missing token', () => {
    const guard = new LogUploadAuthGuard({
      appName: 'log-uploader',
      authToken: 'secret-token',
    });

    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedException);
  });

  it('rejects requests with the wrong token', () => {
    const guard = new LogUploadAuthGuard({
      appName: 'log-uploader',
      authToken: 'secret-token',
    });

    expect(() => guard.canActivate(createContext('Bearer wrong-token'))).toThrow('Invalid log upload token');
  });
});
