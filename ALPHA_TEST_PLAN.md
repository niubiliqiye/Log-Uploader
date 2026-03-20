# ALPHA_TEST_PLAN

> 当前文档用于规划 `Log-Uploader` 在 Alpha 阶段的测试目标、阶段划分、Tag 节点、验收标准、测试范围与缺陷记录方式。

配套执行清单见：`ALPHA_TEST_CHECKLIST.md`

## 当前验收结论（2026-03-20）

- 当前仓库已完成 `阶段 0 ~ 阶段 5` 的核心实现、自动化测试与宿主联调收口
- 当前建议版本标记为 `v0.1.0-alpha.5`
- 已验证范围：Core 配置与写入、文件存储、HTTP 上传、Admin 查询、宿主真实联调
- 已完成联调验证：一体化接入、Core-only 接入、Admin-only 查询模式均已通过 e2e 验证
- 待验证范围：README 最终一致性收口、Alpha 测试结论整理
- 下一阶段目标：推进 `v0.1.0-alpha.6` Alpha 收口

---

## 1. 文档目标

Alpha 阶段的目标不是追求功能越多越好，而是验证下面这条最小闭环是否成立：

**NestJS 宿主接入 → HTTP 上传 / 内部写入 → 文件落盘 → Admin 查询 → 宿主项目联调**

只要这条链路稳定成立，就说明项目已经具备进入 Beta 前继续打磨的基础。

---

## 2. Alpha 阶段范围

Alpha 重点验证以下能力是否可用且稳定：

- Core 配置与写入能力
- HTTP 上传能力
- 文件落盘能力
- Admin 查询能力
- 宿主项目接入能力
- 关键异常场景处理能力

Alpha 阶段暂不以“扩展更多后端存储能力”为核心目标，优先把当前主链路跑稳。

---

## 3. 当前阶段测试目标

结合当前仓库能力与 Alpha 定位，当前阶段建议将测试目标从“功能能跑通”升级为“主链路稳定、关键异常可控、宿主可接入、文档可指导使用”。

### 3.1 总体目标

- 验证 `Core -> HTTP -> 文件存储 -> Admin 查询 -> 宿主接入` 最小闭环稳定成立
- 验证当前对外公开的 HTTP / Admin 接口与 README 描述一致
- 验证 file storage 方案在当前 Alpha 阶段下可作为默认可用实现
- 验证主要错误输入、配置错误、鉴权失败、批量边界值等异常场景具备可预期返回
- 验证当前版本已具备进入 Beta 前继续补强测试和联调的基础

### 3.2 当前阶段必须覆盖的测试维度

#### 1. Core 能力验证

- `forRoot` / `forRootAsync` 配置可正常加载
- `appName`、`baseDir`、`splitByLogType`、`enableBatch`、`maxBatchSize` 等关键配置生效
- 单条写入与批量写入均可正确标准化日志结构
- `serverReceiveTime`、默认 `logType`、默认时间字段等自动补全行为正确
- `event` 类型日志缺少 `eventName` 时可正确拦截
- 自定义 `StorageAdapter` 注入逻辑可正常工作

#### 2. HTTP 接口验证

- `GET /internal/logs/health` 可稳定返回模块状态
- `GET /internal/logs/check` 在开启鉴权和关闭鉴权两种模式下行为正确
- `POST /internal/logs/upload` 可写入合法日志
- `POST /internal/logs/batch` 在开启批量时可写入多条日志
- 接口统一返回结构符合约定
- DTO 校验、非法字段过滤、参数类型转换行为符合预期

#### 3. 文件存储验证

- 日志目录按 `appName` 正确生成
- 按日期生成日志文件名
- 开启 `splitByLogType` 后目录拆分正确
- 单条追加写入与批量写入不会破坏 JSON Line 格式
- 空批次、超大批次、并发追加等边界场景结果可接受

#### 4. Admin 查询验证

- `recent`、`by-trace-id`、`search`、`stats` 四类查询可用
- `limit`、`days`、`cursor` 等分页与扫描参数正确生效
- `keyword`、`level`、`traceId`、`logType`、`startTime`、`endTime` 等过滤条件正确生效
- 返回结果按预期排序，`hasMore` 与 `nextCursor` 逻辑正确
- 无结果、非法参数、空文件、坏数据行等场景能够稳定处理

#### 5. 鉴权与异常处理验证

- `Authorization: Bearer <token>` 校验通过与失败行为明确
- 未配置 `authToken` 时接口按文档约定不做鉴权
- 业务校验错误返回 4xx
- 存储失败、读取失败等内部错误返回 5xx
- 异常过滤器输出结构与 README 中的统一异常格式保持一致

#### 6. 宿主接入验证

- 在一个最小 NestJS demo 宿主项目中可直接接入
- 宿主项目启用 `ValidationPipe` 后接口行为正常
- 宿主项目启用 Swagger 后接口文档可正常暴露
- 宿主项目可以同时接入 `LogUploaderModule`、`LogUploaderCoreModule`、`LogUploaderAdminModule` 中至少一种典型模式

#### 7. 文档一致性验证

- README 中的安装方式、模块引入方式、接口清单与当前实现一致
- 示例请求参数、返回体字段、默认值、限制说明与实际一致
- 已知限制与当前真实能力保持一致，避免过度承诺

### 3.3 当前阶段验收标准

满足以下条件，才建议认为当前 Alpha 阶段具备收口基础：

- 主链路测试全部通过，无阻塞性缺陷
- 关键接口手动联调通过，且至少覆盖一次真实文件落盘验证
- 单元测试、集成测试、宿主联调测试三类验证至少各自覆盖核心场景
- README 中列出的 Alpha 范围能力均已被测试验证，而不仅是“代码存在”
- 无 P0 / P1 未处理问题

### 3.4 当前阶段缺陷分级建议

| 等级 | 定义 | 示例 |
| ---- | ---- | ---- |
| P0 | 主链路不可用，阻塞 Alpha 继续推进 | upload 无法写入、Admin 无法读取、宿主无法启动 |
| P1 | 核心功能可用但结果错误，影响联调或数据可信度 | traceId 查询错误、stats 统计错误、批量写入丢日志 |
| P2 | 非核心能力问题或边界场景异常 | cursor 边界重复、错误提示不清晰、参数校验不完整 |
| P3 | 体验、文档、命名或可维护性问题 | README 示例不准确、日志字段说明遗漏 |

---

## 4. Alpha 阶段版本与 Tag 规划

建议将当前 Alpha 拆为更清晰的 7 个节点，而不是只按模块粗分 4 个节点。这样更适合边开发、边测试、边联调推进。

| 阶段 | 目标 | 核心结果 | 建议 Tag |
| ---- | ---- | ---- | ---- |
| 阶段 0 | Alpha 起点 | 基础目录、依赖、模块骨架、README 初版完成 | `v0.1.0-alpha.0` |
| 阶段 1 | Core 基线可用 | 配置加载、标准化写入、文件落盘、基础异常处理可用 | `v0.1.0-alpha.1` |
| 阶段 2 | Core 测试闭环 | Core 单元测试和存储相关集成测试补齐，基础边界值通过 | `v0.1.0-alpha.2` |
| 阶段 3 | HTTP 上传可用 | `health` / `check` / `upload` / `batch` 跑通，鉴权与 DTO 校验可验证 | `v0.1.0-alpha.3` |
| 阶段 4 | Admin 查询可用 | `recent` / `by-trace-id` / `search` / `stats` / `cursor` 可用 | `v0.1.0-alpha.4` |
| 阶段 5 | 宿主联调通过 | 在最小 NestJS 宿主项目中真实接入，主链路联调通过 | `v0.1.0-alpha.5` |
| 阶段 6 | Alpha 收口 | 文档对齐、缺陷收敛、测试报告整理，可进入 Beta 准备 | `v0.1.0-alpha.6` |

### 4.1 每个 Tag 的准入条件

#### `v0.1.0-alpha.1`

- 可以通过模块配置完成基础启动
- 单条日志可以完成标准化并写入文件
- 文件路径与命名规则符合预期

#### `v0.1.0-alpha.2`

- Core 层关键单元测试通过
- 文件写入、批量写入、配置边界值有基本测试覆盖
- 至少验证 1 个自定义适配器接入场景

#### `v0.1.0-alpha.3`

- 所有 HTTP 接口均可访问
- 鉴权通过 / 失败场景可验证
- DTO 参数校验、批量开关、批量上限逻辑可验证

#### `v0.1.0-alpha.4`

- Admin 四类查询接口可稳定返回结果
- 游标翻页与过滤条件逻辑通过基本验证
- 无结果与非法参数场景返回稳定

#### `v0.1.0-alpha.5`

- 宿主项目引入后可直接运行
- 宿主发起真实上传并能在 Admin 中查到对应日志
- README 中最小接入示例经实测可行

#### `v0.1.0-alpha.6`

- 无 P0 / P1 遗留问题
- README 与当前实现一致
- Alpha 缺陷清单、测试结论、Beta 风险项已整理

### 4.2 当前最推荐的“测试推进顺序”

如果当前项目还处在 Alpha 中段，推荐按下面顺序推进：

1. `alpha.1 ~ alpha.2`：先把 Core 写入与文件落盘测稳
2. `alpha.3`：再验证 HTTP 上传入口与鉴权
3. `alpha.4`：补齐 Admin 查询与分页过滤逻辑
4. `alpha.5`：最后做真实宿主联调
5. `alpha.6`：集中清缺陷、对齐文档、准备 Beta

### 4.3 Tag 命名建议

- Git Tag 建议统一使用 `v0.1.0-alpha.x`
- 如果需要区分测试补丁，可使用 `v0.1.0-alpha.4-hotfix.1` 一类临时命名，但不建议长期保留
- 每个 Tag 发布时建议同步记录：
  - 当前测试范围
  - 已通过项
  - 未通过项
  - 已知风险
  - 是否允许进入下一阶段

---

## 5. 分支策略

建议在 Alpha 阶段采用以下分支策略：

- `main`：稳定分支，不直接承载日常试验性开发
- `alpha`：Alpha 测试主线分支
- `feat/*`：功能开发分支
- `fix/*`：缺陷修复分支
- `refactor/*`：重构分支
- `test/*`：测试与联调分支
- `docs/*`：文档分支

### 示例

```bash
git checkout -b alpha
git checkout -b feat/core-alpha
git checkout -b feat/http-alpha
git checkout -b feat/admin-alpha
git checkout -b test/starter-integration
git checkout -b fix/batch-limit
git checkout -b refactor/query-backend
```
