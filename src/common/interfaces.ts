export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogType = 'frontend' | 'event' | 'audit';

export interface NormalizedLog {
  appName: string;
  level: LogLevel;
  logType: LogType;
  message: string;
  timestamp: string;
  serverReceiveTime: string;

  eventName?: string;
  sessionId?: string;
  source?: string;
  channel?: string;
  appVersion?: string;
  platform?: string;

  module?: string;
  traceId?: string;
  userId?: string;
  deviceId?: string;
  page?: string;
  ip?: string;
  ua?: string;

  properties?: Record<string, any>;
  extra?: Record<string, any>;
}

export interface StorageAdapter {
  save(log: NormalizedLog): Promise<void>;
  saveBatch(logs: NormalizedLog[]): Promise<void>;
}
