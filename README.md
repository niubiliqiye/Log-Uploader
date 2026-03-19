# log-uploader

NestJS 通用日志上传模块，适用于团队内部统一接入：

- 前端异常日志
- 埋点/事件日志
- 轻量审计日志
- 管理端日志查询

支持分层模块化设计：

- `Core`：公共处理逻辑
- `Http`：日志上传接口
- `Admin`：日志查询接口
- `Kafka`：消息接入（骨架）
- `Grpc`：RPC 接入（骨架）

---

## 功能特性

### Core

- 日志标准化
- 脱敏处理
- 日志级别限制
- 单条 / 批量写入
- 本地文件存储
- 自定义存储适配器
- `forRoot / forRootAsync`

### Http

- 健康检查接口
- 鉴权检查接口
- 单条日志上传
- 批量日志上传

### Admin

- 查询最近日志
- 按 `traceId` 查询
- 条件搜索
- 日志统计
- cursor 分页
- `days` 限制扫描最近几天日志文件

---

## 一、 目录结构

```bash
src/
  common/
  config/
  core/
  http/
  admin/
  kafka/
  grpc/
  module/
  dto/
  index.ts
```

## 二、安装

```
pnpm add @your-org/nest-log-uploader
```

宿主项目通常还需要：

```
pnpm add class-validator class-transformer
pnpm add @nestjs/swagger
```

如需类型支持：

```
pnpm add -D typescript @types/node @types/express
```

---

## 三、快速开始

### 1. 默认接入 Core + Http

```
import { Module } from '@nestjs/common';
import { LogUploaderModule } from '@your-org/nest-log-uploader';

@Module({
  imports: [
    LogUploaderModule.forRoot({
      appName: 'ai-novel-backend',
      authToken: 'your-log-token',
      allowedLevels: ['warn', 'error'],
      storage: {
        type: 'file',
        baseDir: './storage/logs',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. 只接入 Core，不暴露默认上传接口

```
import { Module } from '@nestjs/common';
import { LogUploaderCoreModule } from '@your-org/nest-log-uploader';

@Module({
  imports: [
    LogUploaderCoreModule.forRoot({
      appName: 'ai-novel-backend',
      storage: {
        type: 'file',
        baseDir: './storage/logs',
        splitByLogType: true,// 是否启用按照logType分目录
      },
    }),
  ],
})
export class AppModule {}
```

### 3. 接入 Core + Http + Admin

```
import { Module } from '@nestjs/common';
import {
  LogUploaderModule,
  LogUploaderAdminModule,
} from '@your-org/nest-log-uploader';

@Module({
  imports: [
    LogUploaderModule.forRoot({
      appName: 'ai-novel-backend',
      authToken: 'your-log-token',
      storage: {
        type: 'file',
        baseDir: './storage/logs',
      },
    }),
    LogUploaderAdminModule,
  ],
})
export class AppModule {}
```

---

## 四、配置说明

### 1. 配置接口

```
interface LogUploaderModuleOptions {
  appName: string;
  authToken?: string;
  enableBatch?: boolean;
  maxBatchSize?: number;
  redactFields?: string[];
  allowedLevels?: Array<'debug' | 'info' | 'warn' | 'error'>;
  storage?: {
    type: 'file' | 'custom';
    baseDir?: string;
    adapter?: StorageAdapter;
  };
}
```

### 2. 配置项说明

• appName：应用名，用于区分日志目录
• authToken：接口鉴权 token
• enableBatch：是否允许批量上传
• maxBatchSize：批量上传最大条数
• redactFields：额外需要脱敏的字段
• allowedLevels：允许接收的日志级别
• storage.type：存储类型，当前支持 file / custom
• storage.baseDir：本地日志目录
• storage.adapter：自定义存储适配器实例

---

## 五、日志落盘规则

默认文件路径：

```
./logs/{appName}/YYYY-MM-DD.log
```

示例：

```
./storage/logs/ai-novel-backend/2026-03-19.log
```

单行日志示例：

```
{"appName":"ai-novel-backend","level":"error","message":"request failed","timestamp":"2026-03-19T06:30:00.000Z","serverReceiveTime":"2026-03-19T06:30:01.000Z","module":"frontend","traceId":"trace_001","page":"/pages/home/index","ip":"127.0.0.1","ua":"Mozilla/5.0","extra":{"reason":"timeout"}}
```

---

## 六、鉴权方式

当前默认使用：

```
Authorization: Bearer your-log-token
```

## 当未配置 authToken 时，接口不校验鉴权。

## 七、HTTP 接口

### 1. 健康检查

#### 路径

```
GET /internal/logs/health
```

#### 说明

无鉴权，用于探活。

#### 响应示例

```
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "up",
    "appName": "ai-novel-backend",
    "enableBatch": true,
    "maxBatchSize": 200,
    "storageType": "file",
    "allowedLevels": ["debug", "info", "warn", "error"],
    "timestamp": "2026-03-19T08:00:00.000Z"
  }
}
```

### 2. 鉴权检查

#### 路径

```
GET /internal/logs/check
```

#### 请求头

```
Authorization: Bearer your-log-token
```

### 3. 单条日志上传

#### 路径

```
POST /internal/logs/upload
```

#### 请求头

```
Content-Type: application/json
Authorization: Bearer your-log-token
```

#### 请求体

```
{
  "level": "error",
  "message": "request failed",
  "module": "frontend",
  "traceId": "trace_001",
  "page": "/pages/home/index",
  "extra": {
    "status": 500,
    "reason": "timeout"
  }
}
```

### 4. 批量日志上传

#### 路径

```
POST /internal/logs/batch
```

#### 请求体

```
{
  "logs": [
    {
      "level": "info",
      "message": "page open",
      "page": "/pages/home"
    },
    {
      "level": "error",
      "message": "generate failed",
      "traceId": "trace_002"
    }
  ]
}
```

---

## 八、Admin 查询接口

> 当前仅支持 file storage

### 1. 查询最近日志

#### 路径

```
GET /internal/logs/admin/recent
```

#### 参数

• limit：返回条数，默认 50，最大 200
• level：日志级别过滤
• days：仅扫描最近 N 天日志文件
• cursor：游标时间，只返回比该时间更早的日志

#### 示例

```
curl "http://localhost:3000/internal/logs/admin/recent?limit=20&days=7" \
  -H "Authorization: Bearer your-log-token"
```

### 2. 按 traceId 查询

#### 路径

```
GET /internal/logs/admin/by-trace-id
```

####参数
• traceId
• limit
• days
• cursor

#### 示例

```
curl "http://localhost:3000/internal/logs/admin/by-trace-id?traceId=trace_001&limit=20&days=7" \
  -H "Authorization: Bearer your-log-token"
```

### 3. 条件搜索

#### 路径

```
GET /internal/logs/admin/search
```

#### 参数

• keyword
• level
• traceId
• startTime
• endTime
• limit
• days
• cursor

#### 关键词匹配范围

• message
• module
• page
• traceId
• userId
• deviceId
• extra

#### 示例

```
curl "http://localhost:3000/internal/logs/admin/search?keyword=timeout&level=error&days=3&limit=20" \
  -H "Authorization: Bearer your-log-token"
```

### 4. 日志统计

#### 路径

```
GET /internal/logs/admin/stats
```

#### 参数

• days：默认 7，最大 30

#### 返回

• total
• byLevel
• byDate

#### 示例

```
curl "http://localhost:3000/internal/logs/admin/stats?days=7" \
  -H "Authorization: Bearer your-log-token"
```

---

## 九、Admin 分页返回格式

recent / by-trace-id / search 返回统一分页结构：

```
{
  "code": 0,
  "message": "ok",
  "data": {
    "total": 20,
    "hasMore": true,
    "nextCursor": "2026-03-19T06:15:22.000Z",
    "items": []
  }
}
```

说明：
• total：当前页数量
• hasMore：是否还有下一页
• nextCursor：下一页游标
• items：当前页数据

下一页请求示例：

```
curl "http://localhost:3000/internal/logs/admin/recent?limit=20&days=7&cursor=2026-03-19T06:15:22.000Z" \
  -H "Authorization: Bearer your-log-token"
```

---

## 十、自定义存储适配器

```
import { StorageAdapter, NormalizedLog } from '@your-org/nest-log-uploader';

class CustomStorageAdapter implements StorageAdapter {
  async save(log: NormalizedLog): Promise<void> {
    // save one
  }

  async saveBatch(logs: NormalizedLog[]): Promise<void> {
    // save batch
  }
}
```

使用方式：

```
LogUploaderCoreModule.forRoot({
  appName: 'ai-novel-backend',
  storage: {
    type: 'custom',
    adapter: new CustomStorageAdapter(),
  },
})
```

---

## 十一、Swagger 开启示例

宿主项目 main.ts：

```
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Docs')
    .setDescription('Project API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

---

## 十二、统一返回格式

### 1. 成功返回

```
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 2. 异常返回

```
{
  "code": 400,
  "message": "Bad Request",
  "data": null,
  "path": "/internal/logs/admin/search",
  "timestamp": "2026-03-19T08:00:00.000Z"
}
```

---

## 十三、接口清单总表

### 1. Http 接口

| 方法 | 路径                    | 鉴权 | 说明         |
| ---- | ----------------------- | ---: | ------------ |
| GET  | `/internal/logs/health` |   否 | 健康检查     |
| GET  | `/internal/logs/check`  |   是 | 鉴权检查     |
| POST | `/internal/logs/upload` |   是 | 单条日志上传 |
| POST | `/internal/logs/batch`  |   是 | 批量日志上传 |

---

### 2. Admin 接口

| 方法 | 路径                               | 鉴权 | 说明            |
| ---- | ---------------------------------- | ---: | --------------- |
| GET  | `/internal/logs/admin/recent`      |   是 | 查询最近日志    |
| GET  | `/internal/logs/admin/by-trace-id` |   是 | 按 traceId 查询 |
| GET  | `/internal/logs/admin/search`      |   是 | 条件搜索        |
| GET  | `/internal/logs/admin/stats`       |   是 | 日志统计        |

---

### 3. recent 参数

| 参数   | 类型   | 必填 | 说明                  |
| ------ | ------ | ---: | --------------------- |
| limit  | number |   否 | 默认 50，最大 200     |
| level  | string |   否 | debug/info/warn/error |
| days   | number |   否 | 最近 N 天，1~30       |
| cursor | string |   否 | 游标时间，ISO 8601    |

---

### 4. by-trace-id 参数

| 参数    | 类型   | 必填 | 说明               |
| ------- | ------ | ---: | ------------------ |
| traceId | string |   是 | 链路 ID            |
| limit   | number |   否 | 默认 50，最大 200  |
| days    | number |   否 | 最近 N 天，1~30    |
| cursor  | string |   否 | 游标时间，ISO 8601 |

---

### 5. search 参数

| 参数      | 类型   | 必填 | 说明              |
| --------- | ------ | ---: | ----------------- |
| keyword   | string |   否 | 关键词搜索        |
| level     | string |   否 | 日志级别          |
| traceId   | string |   否 | traceId 精确匹配  |
| startTime | string |   否 | 开始时间          |
| endTime   | string |   否 | 结束时间          |
| limit     | number |   否 | 默认 50，最大 200 |
| days      | number |   否 | 最近 N 天，1~30   |
| cursor    | string |   否 | 游标时间          |

---

### 6. stats 参数

| 参数 | 类型   | 必填 | 说明            |
| ---- | ------ | ---: | --------------- |
| days | number |   否 | 默认 7，最大 30 |

---

### 7. 统一成功返回

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

---

## 十四、推荐接入方式

• 只要上传能力：LogUploaderModule
• 要自定义上传入口：LogUploaderCoreModule
• 要管理查询能力：LogUploaderAdminModule
• 未来接 Kafka / Grpc：按模块单独接入

---

## 十五、已知限制

• Admin 查询当前仅支持 file storage
• 当前 cursor 为轻量版，基于 timestamp
• 当多条日志拥有相同 timestamp 时，翻页理论上可能少量重复或漏数据
• 当前 Admin 查询适合中小规模本地日志，不适合超大规模检索
• 当前 Admin 接口调用为对使用者的权限进行校验

---

## 十六、后续规划

• 更严格的复合游标分页
• 按 userId / deviceId / module 查询
• 按时间范围聚合统计
• Elasticsearch / Kafka / DB 查询适配
• Admin 查询服务进一步拆分
• Kafka / Grpc 真正接入实现
