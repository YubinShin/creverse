import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private base = process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'outputs');
  async save(buf: Buffer, filename: string) {
    await fs.mkdir(this.base, { recursive: true });
    const p = path.join(this.base, filename);
    await fs.writeFile(p, buf);
    return p; // 클라우드로 바꿀 땐 여기서 URL 반환
  }
}
