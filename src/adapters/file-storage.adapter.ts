import {promises as fs} from 'fs';
import {dirname, join} from 'path';
import {NormalizedLog, StorageAdapter} from '../common/interfaces';

export class FileStorageAdapter implements StorageAdapter {
  constructor(
    private readonly appName: string,
    private readonly baseDir = './logs',
  ) {}

  async save(log: NormalizedLog): Promise<void> {
    const filePath = this.getFilePath(log.timestamp);
    await fs.mkdir(dirname(filePath), {recursive: true});
    await fs.appendFile(filePath, `${JSON.stringify(log)}\n`, 'utf8');
  }

  async saveBatch(logs: NormalizedLog[]): Promise<void> {
    if (!logs.length) return;

    const grouped = new Map<string, string[]>();

    for (const log of logs) {
      const filePath = this.getFilePath(log.timestamp);
      const lines = grouped.get(filePath) ?? [];
      lines.push(JSON.stringify(log));
      grouped.set(filePath, lines);
    }

    for (const [filePath, lines] of grouped.entries()) {
      await fs.mkdir(dirname(filePath), {recursive: true});
      await fs.appendFile(filePath, `${lines.join('\n')}\n`, 'utf8');
    }
  }

  private getFilePath(timestamp: string): string {
    const date = new Date(timestamp);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return join(this.baseDir, this.appName, `${yyyy}-${mm}-${dd}.log`);
  }
}
