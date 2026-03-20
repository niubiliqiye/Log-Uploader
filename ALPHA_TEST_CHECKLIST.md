# ALPHA_TEST_CHECKLIST

> 当前文档用于把 `ALPHA_TEST_PLAN.md` 落地为可执行测试清单，适用于 `log-uploader` 当前 Alpha 阶段。

---

## 1. 使用方式

- 状态建议使用：`[ ]` 未执行、`[x]` 已通过、`[-]` 已执行未通过、`[~]` 风险接受/延期
- 执行顺序建议按 `alpha.1 -> alpha.6` 推进
- 每一项都建议补充：
  - 执行人
  - 执行日期
  - 结果
  - 缺陷编号
  - 备注

---

## 2. Alpha Tag 对应执行清单

## 当前状态（2026-03-20）

- 当前仓库验收结论：建议标记为 `v0.1.0-alpha.4`
- 自动化验证结果：`pnpm exec jest --runInBand` 通过，`13` 个 test suites、`66` 个 tests 全部通过
- 当前已完成阶段：`alpha.1`、`alpha.2`、`alpha.3`、`alpha.4`
- 当前未完成阶段：`alpha.5` 宿主联调、`alpha.6` 文档与发布收口

## 2.1 `v0.1.0-alpha.1` Core 基线可用

### 配置加载

- [x] `forRoot` 可正常启动模块
- [x] `forRootAsync` 可正常启动模块
- [x] 未显式传入 `enableBatch` 时默认值为 `true`
- [x] 未显式传入 `maxBatchSize` 时默认值为 `200`
- [x] 未显式传入 `storage.type` 时默认识别为 `file`
- [x] `allowedLevels` 自定义后可正确生效

### 单条写入

- [x] 传入最小合法日志时可成功写入
- [x] 未传 `logType` 时默认写为 `frontend`
- [x] 未传 `timestamp` 时自动补齐当前时间
- [x] `serverReceiveTime` 自动生成
- [x] `request` 存在时可写入 `ip`
- [x] `request` 存在时可写入 `ua`

### 业务规则

- [x] `logType=event` 且提供 `eventName` 时写入成功
- [x] `logType=event` 且缺少 `eventName` 时返回 4xx
- [x] `level` 不在允许列表时返回 4xx
- [x] 自定义 `redactFields` 后敏感字段可正确脱敏
- [x] 默认敏感字段如 `token`、`password`、`authorization` 可被脱敏

### 文件落盘

- [x] 按 `baseDir/appName/YYYY-MM-DD.log` 生成文件
- [x] 开启 `splitByLogType` 后按 `baseDir/appName/logType/YYYY-MM-DD.log` 生成文件
- [x] 单条写入采用 JSON Line 格式
- [x] 连续多次写入不会破坏文件结构

---

## 2.2 `v0.1.0-alpha.2` Core 测试闭环

### 批量写入

- [x] `uploadBatch` 写入 1 条日志成功
- [x] `uploadBatch` 写入多条日志成功
- [x] `uploadBatch` 保持每条日志标准化结果正确
- [x] `enableBatch=false` 时批量上传返回 4xx
- [x] 批量数量超过 `maxBatchSize` 时返回 4xx
- [x] 批量中任意一条不合法时整体失败

### 自定义存储适配器

- [x] 可注入自定义 `StorageAdapter`
- [~] 自定义 `save` 被正确调用
- [~] 自定义 `saveBatch` 被正确调用
- [x] 适配器抛错时服务层返回 5xx

### 边界与稳定性

- [x] `UploadLogDto.message` 超长时校验失败
- [~] `traceId`、`module`、`page` 等超长时校验失败
- [x] `properties` 非对象时校验失败
- [x] `extra` 非对象时校验失败
- [x] 批量最小值 `logs.length=1` 可通过
- [x] 批量空数组时校验失败
- [~] 并发多次写入后文件内容仍可逐行解析

---

## 2.3 `v0.1.0-alpha.3` HTTP 上传可用

### health / check

- [x] `GET /internal/logs/health` 无需鉴权可访问
- [x] `health` 返回 `status/appName/enableBatch/maxBatchSize/storageType/allowedLevels/timestamp`
- [~] 已配置 `authToken` 时，`GET /internal/logs/check` 携带正确 token 可访问
- [~] 已配置 `authToken` 时，`GET /internal/logs/check` 缺少 token 返回 401
- [~] 已配置 `authToken` 时，`GET /internal/logs/check` 错误 token 返回 401
- [~] 未配置 `authToken` 时，`GET /internal/logs/check` 可直接访问

### 单条上传

- [x] `POST /internal/logs/upload` 最小合法请求成功
- [~] `POST /internal/logs/upload` 包含完整字段请求成功
- [~] 上传成功后文件中可看到对应日志
- [x] 上传成功返回统一成功结构
- [x] 非法 `level` 返回 4xx
- [x] 非法 `timestamp` 返回 4xx
- [x] `event` 缺少 `eventName` 返回 4xx

### 批量上传

- [x] `POST /internal/logs/batch` 传入 2 条合法日志成功
- [x] 批量成功返回 `count`
- [~] 批量写入后文件中可看到对应条数
- [x] `logs` 为空数组返回 4xx
- [x] `logs` 超过 200 条返回 4xx
- [x] 单条非法混入批次时整体返回 4xx

### 统一异常返回

- [x] 业务校验失败返回统一异常结构
- [~] 鉴权失败返回统一异常结构
- [x] 内部存储异常返回统一异常结构
- [x] 异常返回中包含 `code/message/data/path/timestamp`

---

## 2.4 `v0.1.0-alpha.4` Admin 查询可用

### recent

- [x] `GET /internal/logs/admin/recent` 可返回最近日志
- [x] `limit` 生效
- [~] `days` 生效
- [x] `level` 过滤生效
- [x] `cursor` 生效
- [x] 返回结果按时间倒序
- [x] 返回 `total/hasMore/nextCursor/items`

### by-trace-id

- [x] `GET /internal/logs/admin/by-trace-id` 可返回指定 `traceId` 日志
- [~] 缺少 `traceId` 时返回 4xx
- [x] `traceId` 为空白字符串时返回 4xx
- [x] `limit`、`days`、`cursor` 生效
- [x] 结果中仅包含目标 `traceId`

### search

- [x] `keyword` 搜索 `message` 命中
- [~] `keyword` 搜索 `module` 命中
- [~] `keyword` 搜索 `page` 命中
- [~] `keyword` 搜索 `traceId` 命中
- [~] `keyword` 搜索 `eventName` 命中
- [x] `keyword` 搜索 `properties` 命中
- [x] `keyword` 搜索 `extra` 命中
- [x] `level` 过滤生效
- [x] `logType` 过滤生效
- [x] `traceId` 过滤生效
- [x] `eventName` 过滤生效
- [x] `sessionId` 过滤生效
- [x] `channel` 过滤生效
- [x] `platform` 过滤生效
- [x] `startTime` 生效
- [x] `endTime` 生效
- [x] `startTime > endTime` 时返回 4xx

### stats

- [x] `GET /internal/logs/admin/stats` 可正常返回统计结果
- [x] 默认 `days=7`
- [x] `days` 上限校验生效
- [x] `logType` 过滤生效
- [x] `eventName` 过滤生效
- [x] 返回 `total`
- [x] 返回 `byLevel`
- [x] 返回 `byLogType`
- [x] 返回 `byEventName`
- [x] 返回 `byDate`

### 查询稳健性

- [~] 空目录下查询返回空结果而非 5xx
- [x] 存在坏数据行时查询过程可跳过坏行
- [~] 同一时间戳多条数据时 cursor 行为可接受
- [~] 查询接口在已配置 `authToken` 时必须鉴权

---

## 2.5 `v0.1.0-alpha.5` 宿主联调通过

### 最小宿主项目

- [ ] 新建最小 NestJS demo 宿主项目
- [ ] 宿主项目可引入 `LogUploaderModule`
- [ ] 宿主项目可正常启动
- [ ] 宿主项目能访问 `health`
- [ ] 宿主项目能完成单条上传
- [ ] 宿主项目能在 Admin 查询到刚写入的数据

### 典型接入模式

- [ ] 验证 `LogUploaderModule` 一体化接入模式
- [ ] 验证仅接 `LogUploaderCoreModule` 的模式
- [ ] 验证仅接 `LogUploaderAdminModule` 的查询模式

### 宿主常见配置兼容性

- [ ] 宿主启用 `ValidationPipe({ whitelist: true, transform: true })` 后行为正常
- [ ] 宿主启用 Swagger 后接口可被扫描
- [ ] 宿主已有全局异常过滤器时不影响核心功能

---

## 2.6 `v0.1.0-alpha.6` Alpha 收口

### 文档与实现一致性

- [ ] README 安装方式与实际一致
- [ ] README 模块引入示例与实际一致
- [ ] README HTTP 接口与当前控制器一致
- [ ] README Admin 接口与当前控制器一致
- [ ] README 参数说明与 DTO 校验规则一致
- [ ] README 已知限制与当前真实能力一致

### 测试资产收口

- [ ] 已整理单元测试覆盖范围
- [ ] 已整理集成测试覆盖范围
- [ ] 已整理宿主联调记录
- [ ] 已整理未修复缺陷清单
- [ ] 已整理 Beta 前风险列表

### 发布前结论

- [ ] 无 P0 遗留问题
- [ ] 无 P1 遗留问题
- [ ] 当前版本允许进入 Beta 准备

---

## 3. 推荐测试类型映射

| 模块 | 单元测试 | 集成测试 | 手工联调 |
| ---- | ---- | ---- | ---- |
| Core Service | 必须 | 建议 | 可选 |
| File Storage | 必须 | 必须 | 建议 |
| HTTP Controller | 建议 | 必须 | 建议 |
| Admin Query | 必须 | 必须 | 建议 |
| 宿主 Demo | 否 | 否 | 必须 |
| README 示例 | 否 | 否 | 必须 |

---

## 4. 当前阶段优先补齐的测试集

如果当前时间有限，建议优先补下面这 12 项，它们最能判断 Alpha 是否已经站稳：

- [ ] Core 单条写入成功
- [ ] Core 批量上限校验成功
- [ ] 文件落盘路径正确
- [ ] health 接口成功
- [ ] check 鉴权成功/失败
- [ ] upload 成功并真实写入文件
- [ ] batch 成功并真实写入文件
- [ ] by-trace-id 查询准确
- [ ] search 多条件过滤准确
- [ ] stats 统计结果准确
- [ ] 宿主项目最小接入成功
- [ ] README 示例至少实测 1 条主链路

---

## 5. 缺陷记录模板

建议每个问题统一记录以下字段：

| 字段 | 说明 |
| ---- | ---- |
| 缺陷编号 | 如 `ALPHA-001` |
| 发现阶段 | 如 `v0.1.0-alpha.3` |
| 缺陷等级 | P0 / P1 / P2 / P3 |
| 发现方式 | 单元测试 / 集成测试 / 手工联调 / 文档核对 |
| 影响范围 | Core / HTTP / Admin / 宿主 / 文档 |
| 复现步骤 | 最小复现路径 |
| 预期结果 | 应该发生什么 |
| 实际结果 | 实际发生什么 |
| 是否阻塞下一 Tag | 是 / 否 |
| 处理状态 | 待修复 / 已修复 / 延期 |
