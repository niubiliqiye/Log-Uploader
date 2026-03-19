import {LogUploaderGrpcController} from './log-uploader.grpc-controller';

describe('LogUploaderGrpcController', () => {
  it('logs module initialization', () => {
    const controller = new LogUploaderGrpcController();
    const logger = (controller as any).logger as {log: jest.Mock};
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);

    controller.onModuleInit();

    expect(logSpy).toHaveBeenCalledWith('LogUploaderGrpcModule initialized');
  });
});
