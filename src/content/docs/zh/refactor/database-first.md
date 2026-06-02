---
summary: "迁移计划：将 SQLite 作为主要持久化状态和缓存层，同时保留配置文件支持"
title: "数据库优先状态重构"
read_when:
  - Moving OpenClaw runtime data, cache, transcripts, task state, or scratch files into SQLite
  - Designing doctor migrations from legacy JSON or JSONL files
  - Changing backup, restore, VFS, or worker storage behavior
  - Removing session locks, pruning, truncation, or JSON compatibility paths
---

# 数据库优先状态重构

## 决策

使用两层 SQLite 布局：

- 全局数据库：`~/.openclaw/state/openclaw.sqlite`
- 代理数据库：每个代理一个 SQLite 数据库，用于代理拥有的工作空间、
  转录、VFS、产物以及大型代理运行时状态
- 配置保持文件支持：`openclaw.json` 保留在数据库
  之外。运行时身份验证配置文件迁移到 SQLite；外部提供商或 CLI
  凭证文件仍由所有者在 OpenClaw 数据库之外管理。

全局数据库是控制面数据库。它拥有代理发现、共享网关状态、配对、设备/节点状态、任务和流程账本、插件状态、调度器运行时状态、备份元数据和迁移状态。

代理数据库是数据面数据库。它拥有代理的会话元数据、逐字稿事件流、VFS 工作区或临时命名空间、工具产物、运行产物以及可搜索/可索引的代理本地缓存数据。

这提供了一个持久的全局视图，而无需将大型代理工作区、逐字稿和二进制临时数据强制推入共享网关写入通道。

## 硬约束

此次迁移具有一种规范的运行时形态：

- Session 行仅持久化会话元数据。它们绝不能持久化 `transcriptLocator`、逐字稿文件路径、同级 JSONL 路径、锁路径、修剪元数据或文件时代兼容性指针。
- Transcript 身份始终是 SQLite 身份：`{agentId, sessionId}` 加上协议需要的可选主题元数据。
- `sqlite-transcript://...` 不是运行时或协议身份。新代码绝不能派生、持久化、传递、解析或迁移 transcript 定位符。运行时和测试根本不应包含伪定位符；文档提及该字符串仅是为了禁止它。
- 旧的 `sessions.json`、transcript JSONL、`.jsonl.lock`、修剪、截断和旧的会话路径逻辑仅属于 doctor 迁移/导入路径。
- 旧的会话配置别名仅属于 doctor 迁移。运行时不解释 `session.idleMinutes`、`session.resetByType.dm` 或跨代理 `agent:main:*` 主会话别名（针对另一个已配置的代理）。
- 会话路由标识是类型化的关系状态。热运行时和 UI 路径应读取 `sessions.session_scope`、`sessions.account_id`、`sessions.primary_conversation_id`、`conversations` 和 `session_conversations`；除了在删除旧调用站点时作为兼容性影子外，它们绝不能解析 `session_key` 或从 `session_entries.entry_json` 中挖掘提供商标识。
- 通道级别的直接消息标记（如 `dm` 与 `direct`）是路由词汇，而不是转录定位符或文件存储兼容性句柄。
- 旧版挂钩处理程序配置仅属于医生警告/迁移层面。运行时绝不能加载 `hooks.internal.handlers`；挂钩仅通过发现的挂钩目录和 `HOOK.md` 元数据运行。
- 运行时启动、热回复路径、压缩、重置、恢复、诊断、TTS、内存钩子、子代理、插件命令路由、协议边界和钩子必须通过运行时传递 `{agentId, sessionId}`。
- 测试应通过 `{agentId, sessionId}` 填充和断言 SQLite 转录行。仅证明 JSONL 路径转发、调用方提供的定位器保留或转录文件兼容性的测试应被删除，除非它们涵盖 doctor 导入、非会话支持/调试具体化或协议形状。
- `runEmbeddedPiAgent(...)`、准备好的 worker 运行和内部嵌入式尝试不得接受转录定位器。它们通过 `{agentId, sessionId}` 打开 SQLite 转录管理器，并将该管理器传递给内部化的 PI 兼容代理会话，以便陈旧的调用方无法让运行器编写 JSON/JSONL 转录。
- Runner 诊断必须在 SQLite 中存储运行时/缓存/负载跟踪记录。
  运行时诊断不得暴露 JSONL 文件覆盖旋钮或通用
  转录 JSONL 导出助手；面向用户的导出可以从数据库行实现显式
  工件，而无需将文件名反馈回运行时。
- 原始流日志记录使用 `OPENCLAW_RAW_STREAM=1` 加上 SQLite 诊断行。
  旧的 pi-mono `PI_RAW_STREAM`、`PI_RAW_STREAM_PATH` 和
  `raw-openai-completions.jsonl` 文件记录器合约不是 OpenClaw
  运行时或测试的一部分。
- QMD 内存索引不得将 SQLite 转录导出为 markdown 文件。
  QMD 仅索引配置的内存文件；会话转录搜索保持
  由 SQLite 支持。
- 对于新代码，QMD SDK 子路径仅供 QMD 使用。SQLite 会话记录索引辅助函数位于 `memory-core-host-engine-session-transcripts`；任何 QMD 重新导出仅用于兼容性，且不得被运行时代码使用。
- 内置内存索引位于所属代理的数据库中。运行时配置和已解析的运行时合约不得暴露 `memorySearch.store.path`；doctor 会删除该旧版配置键，且当前代码会在内部传递代理 `databasePath`。

实施工作应继续删除代码，直到在 doctor/import/export/debug 边界之外无例外地满足这些陈述。

## 目标状态和进度

### 硬性目标

- 一个全局 SQLite 数据库拥有控制平面状态：
  `state/openclaw.sqlite`。
- 每个代理一个 SQLite 数据库拥有数据平面状态：
  `agents/<agentId>/agent/openclaw-agent.sqlite`。
- Config 仍然是文件支持的。`openclaw.json` 不属于此数据库重构的一部分。
- 旧版文件仅作为 doctor 迁移的输入。
- 运行时永远不会写入或读取会话或 transcript JSONL 作为活动状态。

### 目标状态

- `not-started`: 文件时代的运行时代码仍然写入活动状态。
- `migrating`: doctor/import 代码可以将文件数据移动到 SQLite。
- `dual-read`: 临时桥接读取 SQLite 和旧版文件。除非明确记录为仅限 doctor，否则此状态对于此重构是禁止的。
- `sqlite-runtime`: 运行时仅读取和写入 SQLite。
- `clean`: 旧的运行时 API 和测试已删除，并且守卫防止回归。
- `done`: 文档、测试、备份、doctor 迁移和更改检查证明了清洁状态。

### 当前状态

- 会话：`clean` 用于运行时。会话行位于每个代理的数据库中，运行时 API 使用 `{agentId, sessionId}` 或 `{agentId, sessionKey}`，而 `sessions.json` 是仅限 doctor 使用的传统输入。
- 转录：`clean` 用于运行时。转录事件、身份、快照和轨迹运行时事件位于每个代理的数据库中。运行时不再接受转录定位器或 JSONL 转录路径。
- PI 嵌入式运行器：`clean`。嵌入式 PI 运行、已准备的工作器、压缩和重试循环使用 SQLite 会话作用域并拒绝过期的转录句柄。
- Cron: `clean` 用于运行时。运行时使用 `cron_jobs` 和 `cron_run_logs`；
  运行时测试使用 SQLite `storeKey` 命名，且文件时代的 cron 路径仅保留在
  doctor 遗留迁移测试中。
- 任务注册表: `clean`。任务和任务流运行时行位于
  `state/openclaw.sqlite` 中；未交付的附属 SQLite 导入器已被删除。
- 插件状态: `clean`。插件状态/数据块行位于共享全局
  数据库中；旧的插件状态附属 SQLite 辅助程序已被防护。
- 内存: `sqlite-runtime` 用于内置内存和会话记录索引。
  内存索引表位于每个代理的数据库中，插件内存状态使用
  共享的插件状态行，而遗留内存文件是 doctor 迁移输入
  或用户工作区内容。
- 备份：`sqlite-runtime`。备份阶段压缩 SQLite 快照，省略实时
  WAL/SHM 附属文件，验证 SQLite 完整性，并在全局数据库中记录备份运行。
- Doctor 迁移：`migrating`，有意为之。Doctor 将旧版 JSON、
  JSONL 和已弃用的附属存储导入 SQLite，记录迁移运行/来源，
  并移除成功的来源。
- E2E 脚本：`clean` 用于运行时覆盖。Docker MCP 种子写入 SQLite
  行。runtime-context Docker 脚本仅在 doctor 迁移种子内部创建旧版 JSONL，
  并显式命名旧版会话索引路径。

### 剩余工作

- [x] 将 cron runtime-test 存储变量从 `storePath` 重命名，除非它们是 doctor 遗留输入。
      文件：`src/cron/service.test-harness.ts`、
      `src/cron/service.runs-one-shot-main-job-disables-it.test.ts`、
      `src/cron/service/timer.regression.test.ts`、
      `src/cron/service/ops.test.ts`、`src/cron/service/store.test.ts`、
      `src/cron/service.heartbeat-ok-summary-suppressed.test.ts`、
      `src/cron/service.main-job-passes-heartbeat-target-last.test.ts`、
      `src/cron/store.test.ts`。
      证明：`pnpm check:database-first-legacy-stores`；`rg -n 'storePath' src/cron --glob '!**/commands/doctor/**'`。
- [x] 移除或重命名过时的文件时代导出测试 mock。
      文件：`src/auto-reply/reply/commands-export-test-mocks.ts`。
      证明：`rg -n 'resolveSessionFilePath|sessionFile|storePath|transcriptLocator' src/auto-reply/reply`。
- [x] 使 Docker 运行时上下文遗留 JSONL 种子显然仅限 doctor 使用。
      文件：`scripts/e2e/session-runtime-context-docker-client.ts`。
      证明：`rg -n 'sessions\\.json|sessionFile|\\.jsonl' scripts/e2e/session-runtime-context-docker-client.ts` 显示仅有
      `seedBrokenLegacySessionForDoctorMigration`。
- [x] 在任何架构变更后保持 Kysely 生成的类型一致。
      文件：`src/state/openclaw-state-schema.sql`、
      `src/state/openclaw-agent-schema.sql`、
      `src/state/*generated*`。
      证明：本轮无架构变更；`pnpm db:kysely:check`；
      `pnpm lint:kysely`。
- [x] 针对受影响的存储、命令和脚本重新运行专注测试。
      证明：`pnpm test src/cron/service/store.test.ts src/cron/store.test.ts src/cron/service.heartbeat-ok-summary-suppressed.test.ts src/cron/service.main-job-passes-heartbeat-target-last.test.ts src/cron/service.every-jobs-fire.test.ts src/cron/service.persists-delivered-status.test.ts src/cron/service.runs-one-shot-main-job-disables-it.test.ts src/cron/service/ops.test.ts src/cron/service/timer.regression.test.ts src/auto-reply/reply/commands-export-trajectory.test.ts extensions/telegram/src/thread-bindings.test.ts extensions/slack/src/monitor/message-handler/prepare.test.ts src/acp/translator.session-lineage-meta.test.ts`；`git diff --check`。
- [x] 在声明 `done` 之前，运行变更后的网关或远程广泛证明。
      证明：`pnpm check:changed --timed -- <changed extension paths>`Hetzner 在临时 Node 24/pnpm 设置以及为同步的非 `.git` 工作区进行显式路径路由后，于 Hetzner Crabbox 运行 `run_3f1cabf6b25c` 中通过。

### 不要退化

- 无转录定位器。
- 无活跃会话文件。
- 除 doctor 遗留迁移测试外，无虚假 JSONL 测试装置。
- 在期望使用 Kysely 的地方不得进行原始 SQLite 访问。
- 不要添加新的旧版数据库迁移。此布局尚未发布；除非有充分理由，否则将架构版本保持在 `1`。

## 代码阅读假设

没有后续的产品决策会阻碍此计划。实施应基于以下假设进行：

- 直接使用 `node:sqlite`，并针对此存储路径要求 Node 22+ 运行时。
- 仅保留一个正常的配置文件。在此重构中，不要将配置、插件清单或 Git 工作区移动到 SQLite 中。
- 不需要运行时兼容性文件。旧版 JSON 和 JSONL 文件仅作为迁移输入。分支本地的 SQLite 副载文件从未发布，因此将其删除而不是导入。
- `openclaw doctor --fix` 负责遗留文件到数据库的迁移步骤。
  运行时启动和 `openclaw migrate` 不应保留遗留 OpenClaw
  数据库升级路径。
- 凭据兼容性遵循相同的规则：运行时凭据存储在
  SQLite 中。旧的 `auth-profiles.json`、每个代理的 `auth.json` 和共享
  `credentials/oauth.json` 文件是 doctor 迁移的输入，然后在导入后
  删除。
- 生成的模型目录状态由数据库支持。运行时代码绝不能写入
  `agents/<agentId>/agent/models.json`；现有的 `models.json` 文件是遗留
  doctor 输入，并在导入到 `agent_model_catalogs` 后删除。
- 运行时不得迁移、规范化或桥接记录定位符。活动的记录标识是 SQLite 中的 `{agentId, sessionId}`。文件路径仅作为遗留的 doctor 输入，并且 `sqlite-transcript://...` 必须从运行时、协议、hook 和插件界面中消失，而不是被视为边界句柄。
- 运行时 SQLite 记录读取不会运行旧的 JSONL 条目形状迁移或为了兼容性而重写整个记录。遗留条目规范化保留在显式的 doctor/import 工具中。Doctor 在插入 SQLite 行之前规范化遗留 JSONL 记录文件；当前的运行时行已经按照当前的记录架构写入。轨迹/会话导出按原样读取这些行，并且不得执行导出时的遗留迁移。
- 旧版转录 JSONL 解析/迁移辅助程序仅限 doctor 使用。运行时
  转录格式代码仅构建当前的 SQLite 转录上下文；doctor
  拥有在插入行之前对旧版 JSONL 条目进行升级的所有权。
- 旧的运行时拥有的 JSONL 转录流辅助程序已被删除。Doctor
  导入代码拥有显式的旧版文件读取权限；运行时会话历史记录
  读取 SQLite 行。
- Codex 应用服务器绑定使用 OpenClaw OpenClaw`sessionId` 作为 Codex 插件状态命名空间中的规范
  键。`sessionKey` 是用于
  路由/显示的元数据，不得替换持久会话 ID 或复活
  转录文件身份。
- 上下文引擎直接接收当前的运行时契约。注册表不得用删除 `sessionKey`、`transcriptScope` 或 `prompt` 的重试填充来包装引擎；无法接受当前数据库优先参数的引擎应该明确报错，而不是被桥接。
- 备份输出应保持为一个归档文件。数据库内容应作为压缩的 SQLite 快照进入该归档，而不是原始的实时 WAL 副本。
- 转录搜索很有用，但在第一个数据库优先版本中并非必需。设计架构时请考虑以后可以添加 FTS。
- 随着数据库边界的稳定，工作线程执行应在设置后保持实验性状态。

## 代码阅读发现

当前分支已经过了概念验证阶段。共享数据库已存在，Node `node:sqlite` 通过一个小的运行时助手连接，以前的存储现在写入 `state/openclaw.sqlite` 或所属的 `openclaw-agent.sqlite` 数据库。

剩余的工作不是选择 SQLite；而是保持新的边界整洁，并删除任何看起来仍像旧文件世界的兼容性接口：

- Session `storePath` 不再是运行时标识、测试夹具形状或状态负载字段。运行时和桥接测试不再包含 `storePath` 契约名称；doctor/migration 代码拥有该遗留词汇。
- Session 写入不再通过旧的进程内 `store-writer.ts` 队列。SQLite 补丁写入使用冲突检测和有界重试来代替。
- Legacy path discovery still has valid migration uses, but runtime code should
  stop treating `sessions.json` and transcript JSONL files as possible write
  targets.
- Agent-owned tables live in per-agent SQLite databases. The global DB keeps
  registry/control-plane rows; transcript identity is `{agentId, sessionId}` in
  the per-agent transcript rows. Runtime code must not persist transcript file
  paths or migrate transcript locators.
- Doctor already imports several legacy files. The cleanup is to make that a
  single explicit migration implementation that doctor calls, with a durable
  migration report.

No additional product questions are blocking implementation.

## Current Code Shape

The branch already has a real shared SQLite base:

- 运行时最低版本现在是 Node 22+：`package.json`CLImacOS，CLI 运行时守护程序、安装程序默认值、macOS 运行时定位器、CI 和公共安装文档都达成一致。旧的 Node 22 兼容通道已被移除。
- `src/state/openclaw-state-db.ts` 打开 `openclaw.sqlite`，设置 WAL，`synchronous=NORMAL`，`busy_timeout=30000`，`foreign_keys=ON`，并应用从 `src/state/openclaw-state-schema.sql` 派生的生成的架构模块。
- Kysely 表类型和运行时架构模块是从提交的 `.sql` 文件创建的一次性 SQLite 数据库生成的；运行时代码不再保留用于全局、per-agent 或代理捕获数据库的复制粘贴架构字符串。
- 运行时存储从生成的 Kysely `DB` 接口派生选择和插入的行类型，而不是手动复制 SQLite 行形状。原始 SQL 仍限于模式应用、编译指示（pragmas）和仅用于迁移的 DDL。
- SQLite 模式已折叠为 `user_version = 1`，因为该数据库布局尚未发布。运行时开启器仅创建当前模式；文件到数据库的导入仍保留在 doctor 代码中，且特定分支的数据库升级辅助工具已被删除。
- 在所有权边界为规范的地方强制执行关系所有权：源迁移行从 `migration_runs` 级联删除，任务交付状态从 `task_runs` 级联删除，而脚本标识行从脚本事件级联删除。
- 当前共享表包括 `agent_databases`，
  `auth_profile_stores`、`auth_profile_state`、
  `plugin_state_entries`、`plugin_blob_entries`、`media_blobs`、
  `skill_uploads`、`capture_sessions`、`capture_events`、`capture_blobs`、
  `sandbox_registry_entries`、`cron_run_logs`、`cron_jobs`、`commitments`、
  `delivery_queue_entries`、`model_capability_cache`、
  `workspace_setup_state`、`native_hook_relay_bridges`、
  `current_conversation_bindings`、`plugin_binding_approvals`、
  `tui_last_sessions`、`task_runs`、`task_delivery_state`、`flow_runs`、
  `subagent_runs`、`migration_runs` 和 `backup_runs`。
- 任意插件拥有的状态不会获得宿主拥有的类型化表。已安装的插件使用 `plugin_state_entries` 来存储带版本的 JSON 载荷，并使用 `plugin_blob_entries` 来存储字节数据，这些数据具有命名空间/键所有权、TTL 清理、备份和插件迁移记录。当宿主拥有查询契约时，宿主拥有的插件编排状态仍可以具有类型化表，例如 `plugin_binding_approvals`。
- 插件迁移是针对插件拥有的命名空间的数据迁移，而非宿主模式迁移。插件可以通过迁移提供商迁移其自己的带版本状态/blob 条目，而宿主会在常规迁移账本中记录源/运行状态。新的插件安装不需要更改 `openclaw-state-schema.sql`，除非宿主本身正在接管一个新的跨插件契约。
- `src/state/openclaw-agent-db.ts` 打开
  `agents/<agentId>/agent/openclaw-agent.sqlite`，在全局 DB 中注册该数据库，并拥有代理本地的会话、转录、VFS、工件、缓存
  和内存索引表。共享运行时发现现在读取生成的类型化
  `agent_databases` 注册表，而不是在每个调用
  站点重新实现该查询。
- 全局和每个代理的数据库都记录一条 `schema_meta` 行，其中包含数据库角色、
  架构版本、时间戳以及代理数据库的代理 ID。该布局仍
  保持在 `user_version = 1`，因为此 SQLite 架构尚未发布。
- 现在，每个代理的会话身份都有一个以 `session_id` 为键的规范 `sessions` 根表，其中包含 `session_key`、`session_scope`、`account_id`、`primary_conversation_id`、时间戳、显示字段、模型元数据、harness ID 以及父/生成链接，作为可查询的列。`session_routes` 是从 `session_key` 到当前 `session_id` 的唯一活动路由索引，因此路由键可以移动到新的持久化会话，而无需让热读取在重复的 `sessions.session_key` 行之间进行选择。旧的 `session_entries.entry_json` 兼容性负载通过外键挂载在持久化 `session_id` 根上；它不再是会话唯一的模式级表示。
- Per-agent external conversation identity is relational too:
  `conversations` stores normalized 提供商/account/conversation identity, and
  `session_conversations`OpenClaw links one OpenClaw 会话 to one or more external
  conversations. This covers shared-main 私信 sessions where multiple peers can
  intentionally map to one 会话 without lying in `session_key`. SQLite also
  enforces uniqueness for the natural 提供商 identity so the same
  渠道/account/kind/peer/thread tuple cannot fork across conversation ids.
  Shared-main direct peers are linked with a `participant`OpenClaw role, so one
  OpenClaw 会话 can represent multiple external 私信 peers without demoting
  older peers into vague related rows. `sessions.primary_conversation_id` still
  points at the current typed delivery target. Closed routing/status columns
  are enforced with SQLite `CHECK` constraints instead of relying only on
  TypeScript unions.
  Runtime 会话 projection clears compatibility routing shadows from
  `session_entries.entry_json` before applying typed 会话/conversation
  columns, so stale JSON payloads cannot resurrect delivery targets.
  Subagent announce routing likewise requires the typed SQLite delivery context;
  it no longer falls back to compatibility `SessionEntry`Gateway(网关) route fields.
  Gateway `chat.send` explicit delivery inheritance reads the typed SQLite
  delivery context instead of `origin`/`last*` compatibility fields.
  `tools.effective` likewise derives 提供商/account/thread context from typed
  SQLite delivery/routing rows, not stale `last*` 会话-entry shadows.
  System-event prompt context rebuilds 渠道/to/account/thread fields from
  typed delivery fields instead of `origin` shadows.
  The shared `deliveryContextFromSession` helper and 会话-to-conversation
  mapper now ignore `SessionEntry.origin` entirely; only typed delivery fields
  and relational conversation rows can create hot route identity.
  Runtime 会话 entry normalization strips `origin` before persisting or
  projecting `entry_json`, and inbound metadata writes typed 渠道/chat
  fields plus relational conversation rows instead of creating new origin
  shadows.
- 转录事件、转录快照和轨迹运行时事件现在
  引用规范的每个代理 `sessions` 根目录，并在
  会话删除时级联。转录身份/幂等性行继续从
  确切的转录事件行级联。
- Memory-core 索引现在使用显式的 agent-database 表 `memory_index_meta`、`memory_index_sources`、`memory_index_chunks` 和 `memory_embedding_cache`；可选的 FTS/向量辅助索引使用相同的 `memory_index_*` 前缀，而不是通用的 `meta`、`files`、`chunks` 或 `chunks_vec` 表。`memory_index_sources` 以 `(source_kind, source_key)` 为键，并携带可选的 `session_id` 所有权，因此当会话被删除时，源自会话的源和块会级联删除。缓存的块嵌入存储为 Float32 SQLite BLOB，而不是 JSON 文本数组。这些表是派生/搜索缓存，而不是规范的记录存储；可以从 `sessions`、`transcript_events` 和内存工作区文件中删除并重建它们。
- 子代理运行恢复状态现在位于类型化的共享 `subagent_runs` 行中，并带有索引化的子代理、请求者和控制器会话键。旧的 `subagents/runs.json` 文件仅作为医生迁移的输入。
- 当前的对话绑定现在位于类型化的共享 `current_conversation_bindings` 行中，由规范化对话 ID 键控，包含目标代理/会话列、对话类型、状态、过期时间和元数据，这些作为关系列存储，而不是重复的不透明绑定记录。持久绑定键包含规范化对话类型，以便直接/群组/渠道引用不会冲突，并且 SQLite 会拒绝无效的绑定类型/状态值。旧的 `bindings/current-conversations.json` 文件仅作为医生迁移的输入。
- Delivery queue recovery 现在将用于 渠道、target、account、会话、retry、error、platform-send 和 recovery state 的类型化队列列叠加到 replay JSON 上。`entry_json` 保留 replay payloads、hooks 和 formatting payload，但类型化列对于热队列路由/状态具有权威性。
- TUI last-会话 恢复指针现在位于以 TUI connection/会话 scope 的哈希为键的类型化共享 TUI`tui_last_sessions`TUITUI 行中。旧的 TUI JSON 文件仅作为 doctor 迁移输入。
- 默认的 TTS 偏好设置现在存储在共享插件状态的 SQLite 行中，其键位于 `speech-core` 插件下。旧的 `settings/tts.json` 文件仅作为 doctor 迁移的输入；运行时不再读取或写入 TTS 偏好设置 JSON 文件，且旧版路径解析器位于 doctor 迁移模块中。
- Secret 目标元数据现在讨论的是存储，而不是假装每个凭证目标都是配置文件。`openclaw.json` 仍然是配置存储；auth-profile 目标使用类型化的 SQLite `auth_profile_stores` 行，其中提供商形状的凭证保留为 JSON 载荷。
- Secret 审计不再扫描已废弃的每个代理 `auth.json` 文件。Doctor 负责警告、导入和移除该旧版文件。
- 传统的身份配置文件路径辅助函数现在位于 doctor 遗留代码中。核心身份配置文件路径辅助函数公开 SQLite auth-store 身份和显示位置，而不是 `auth-profiles.json` 或 `auth-state.json` 运行时路径。
- 子代理运行恢复和 OpenRouter 模型能力缓存运行时模块现在将 SQLite 快照读取器/写入器与仅限 doctor 的遗留 JSON 导入辅助函数分离开来。OpenRouter 能力使用 `provider_id = "openrouter"` 下的类型化通用 `model_capability_cache` 行，而不是一个不透明的缓存块或特定于提供商的主机表。子代理运行 `taskName` 存储在类型化的 `subagent_runs.task_name` 列中；`payload_json` 副本是重放/调试数据，而不是热显示或查找字段的来源。
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` 在代理数据库的 `vfs_entries` 表之上实现了一个 SQLite VFS。目录读取、递归导出、删除和重命名操作使用索引化的 `(namespace, path)` 前缀范围，而不是扫描整个命名空间或依赖 `LIKE` 路径匹配。
- `src/agents/runtime-worker.entry.ts` 为每次运行创建 SQLite VFS、工具产物、运行产物以及作用域缓存存储，供 workers 使用。
- 工作区引导完成标记现在位于按已解析工作区路径键入的共享 `workspace_setup_state` 行中，而不是 `.openclaw/workspace-state.json` 中；运行时不再读取或重写遗留的工作区标记，辅助 API 也不再仅为了派生存储标识而传递虚假的 `.openclaw/setup-state` 路径。
- Exec 审批现在位于类型化的共享 SQLite `exec_approvals_config`
  单例行中。Doctor 会导入旧的 `~/.openclaw/exec-approvals.json`；
  运行时写入操作不再创建、重写或报告该文件为其活动
  存储位置。macOS macOS 伴侣读取并写入相同的
  `state/openclaw.sqlite`IPC 表行；它仅在磁盘上保留 Unix 提示套接字，
  因为那是 IPC，而不是持久的运行时状态。
- 设备身份、设备身份验证和 bootstrap 运行时模块现在将其
  SQLite 快照读取器/写入器与仅限 doctor 的旧版 JSON 导入
  助手分开。设备身份使用类型化的 `device_identities` 行，设备身份验证
  令牌使用类型化的 `device_auth_tokens` 行。设备身份验证写入通过设备/角色
  协调行，而不是截断令牌表，并且运行时不再通过旧的
  整个存储适配器路由单令牌更新。旧版 version-1 JSON 载荷仅作为
  doctor 导入/导出形式存在。
- GitHub Copilot 令牌交换缓存使用共享的 SQLite plugin-state 表
  位于 `github-copilot/token-cache/default` 下。它是提供商拥有的缓存状态，
  因此有意不添加主机架构表。
- 共享的 Swift 运行时 (`OpenClawKit`) 对设备身份和设备认证使用相同的 `state/openclaw.sqlite` 行。macOS 应用程序助手导入共享的 SQLite 助手，而不是拥有第二个 JSON 或 SQLite 路径。一个遗留的 `identity/device.json` 会阻止身份创建，直到 doctor 将其导入 SQLite，这与 TypeScript 和 Android 启动闸门相匹配。
- Android 设备身份使用存储在类型化 `state/openclaw.sqlite#table/device_identities` 行中的相同 TypeScript 兼容密钥材料。它从不读取或写入 `openclaw/identity/device.json`；一个遗留文件会阻止启动，直到 doctor 将其导入 SQLite。
- Android 缓存的设备身份验证令牌也使用类型化的 Android`state/openclaw.sqlite#table/device_auth_tokens` 行，并与 TypeScript 和 Swift 共享相同的 version-1 令牌语义。运行时不再读取 `SecurePrefs` `gateway.deviceToken*` 兼容性键；这些仅属于迁移/doctor 逻辑。
- Android 通知的最近软件包历史记录使用类型化的 Android`android_notification_recent_packages` 行。运行时不再迁移或读取旧的 SharedPreferences CSV 键。
- 当存在遗留的 `identity/device.json`、SQLite 身份行无效或无法打开 SQLite 身份存储时，设备身份创建将以失败告终。Doctor 会先导入并删除该文件，因此运行时启动无法在迁移前静默轮换配对身份。
- 设备身份选择是一个 SQLite 行键，而不是 JSON 文件定位器。测试和网关辅助程序传递显式的身份键；只有 doctor 迁移和故障关闭启动门才知道已弃用的 `identity/device.json` 文件名。
- 会话重置兼容性现在位于 doctor 配置迁移中：`session.idleMinutes` 已移至 `session.reset.idleMinutes`，`session.resetByType.dm` 已移至 `session.resetByType.direct`，并且运行时重置策略仅读取规范重置键。
- Legacy config compatibility now lives under `src/commands/doctor/`. Normal
  `readConfigFileSnapshot()` validation does not import doctor legacy detectors
  or annotate legacy issues; `runDoctorConfigPreflight()` adds those issues for
  doctor repair/reporting. The doctor config flow imports
  `src/commands/doctor/legacy-config.ts`OAuth, and old OAuth profile-id repair lives
  under
  `src/commands/doctor/legacy/oauth-profile-ids.ts`.
- Non-doctor commands do not auto-run legacy config repair. For example,
  `openclaw update --channel` now fails on invalid legacy config and asks the
  user to run doctor, rather than silently importing doctor migration code.
- Web 推送、APNs、语音唤醒、更新检查和配置运行状况现在使用类型化的共享 SQLite 表来存储订阅、VAPID 密钥、节点注册、触发器行、路由行、更新通知状态和配置运行状况条目，而不是使用整个不透明的 JSON 数据块。Web 推送和 APNs 快照写入现在通过主键协调订阅/注册，而不是清空它们的表；配置运行状况同样通过配置路径执行此操作。它们的运行时模块将 SQLite 快照读取器/写入器与仅限 doctor 使用的旧版 JSON 导入辅助工具分离开来。
- 节点主机配置现在使用共享 SQLite 数据库中的类型化单例行；在正常运行时使用之前，doctor 会导入旧的 `node.json` 文件。
- 设备/节点配对、渠道配对、渠道允许列表和引导状态现在使用类型化的 SQLite 行，而不是整个不透明的 JSON 块。插件绑定批准和 cron 任务状态遵循相同的划分：运行时模块公开支持 SQLite 的操作和中性的快照助手，配对/引导以及插件绑定批准快照写入通过主键协调行，而不是截断表，而 doctor 通过 `src/commands/doctor/legacy/*` 模块导入/删除旧的 JSON 文件。
- 已安装的插件记录现在位于 SQLite 已安装插件索引中。运行时配置读/写不再迁移或保留旧的 `plugins.installs` 编写配置数据；doctor 在正常运行时使用之前将该旧配置形状导入 SQLite。
- QQBot 凭据恢复快照现在位于 SQLite 插件状态下的 `qqbot/credential-backups` 中。运行时不再写入 `qqbot/data/credential-backup*.json`；doctor 会与其他 QQBot 状态输入一起导入并删除这些旧的备份文件。
- Gateway(网关) 重载规划会在内部的 Gateway(网关)`installedPluginIndex.installRecords.*` diff 命名空间下比较 SQLite 已安装插件索引快照。运行时重载决策不再将这些行包装在虚假的 `plugins.installs` 配置对象中。
- Matrix 命名账户凭据升级不再在运行时读取期间发生。当可以解析单个/默认 Matrix 账户时，由 doctor 负责旧顶级 Matrix`credentials/matrix/credentials.json`Matrix 的重命名。
- Core pairing 和 cron 运行时模块不再导出传统的 JSON 路径构建器。Doctor 拥有的传统模块为导入测试和迁移构建 `pending.json`、`paired.json`、`bootstrap.json` 和 `cron/jobs.json` 源路径。传统的 cron 作业形状规范化和 cron 运行日志导入位于 `src/commands/doctor/legacy/cron*.ts` 下。
- `src/commands/doctor/legacy/runtime-state.ts` 将传统的 JSON 状态文件（包括节点主机配置）从 doctor 导入 SQLite。新的传统文件导入器保留在 `src/commands/doctor/legacy/` 下。
- `src/commands/doctor/state-migrations.ts` 将遗留的 `sessions.json` 和
  `*.jsonl` 会话记录直接导入 SQLite，并移除成功的源文件。它
  不再通过 `agents/<agentId>/sessions/*.jsonl` 暂存根遗留会话记录，也
  不在导入前创建规范的 JSONL 目标。
- 状态完整性医生检查不再扫描遗留会话目录或
  提供删除孤立 JSONL 文件的选项。遗留会话记录文件仅作为迁移输入，
  并且迁移步骤负责导入及源文件移除。
- 遗留沙箱注册表导入位于
  `src/commands/doctor/legacy/sandbox-registry.ts` 之下；活动的沙箱注册表
  读写操作仍仅限于 SQLite。
- 遗留会话记录健康/导入修复功能位于
  `src/commands/doctor/legacy/session-transcript-health.ts` 之下；运行时命令
  模块不再包含 JSONL 会话记录解析或活动分支修复代码。

合并/删除重点：

- 插件状态现在使用共享的 `state/openclaw.sqlite` 数据库。旧的
  分支本地 `plugin-state/state.sqlite` 附属导入器已被移除，因为
  该 SQLite 布局从未发布。探测/测试助手现在报告共享的
  `databasePath`，而不是公开特定于插件状态的 SQLite 路径。
- 任务和任务流运行时表现在位于共享的
  `state/openclaw.sqlite` 数据库中，而不是 `tasks/runs.sqlite` 和
  `tasks/flows/registry.sqlite` 中；由于同样的未发布布局原因，旧的附属导入器已被移除。
- `src/config/sessions/store.ts` 不再需要 `storePath` 用于入站
  元数据、路由更新或更新时间读取。命令持久化、CLI
  会话清理、子代理深度、身份验证覆盖和记录会话
  身份使用代理/会话行 API。写入作为 SQLite 行补丁应用，
  并进行乐观冲突重试。
- 会话目标解析现在公开每个代理的数据库目标，而不是遗留的
  `sessions.json` 路径。共享网关、ACP 元数据、Doctor 路由修复和
  `openclaw sessions` 枚举 `agent_databases` 加上配置的代理。
- Gateway(网关) 会话路由现在使用 `resolveGatewaySessionDatabaseTarget`；
  返回的目标携带 `databasePath` 和候选 SQLite 行键，
  而不是遗留的会话存储文件路径。
- Channel 会话运行时类型现在公开 `{agentId, sessionKey}` 用于
  读取更新时间、入站元数据和最后路由更新。旧的
  `saveSessionStore(storePath, store)` 兼容类型已移除。
- 插件运行时、扩展 API 和 API`config/sessions` 桶导出现在将
  插件代码引导至 SQLite 支持的会话行辅助程序。根库兼容性
  导出（`loadSessionStore`、`saveSessionStore`、`resolveStorePath`）保留为
  现有消费者的已弃用填充程序。旧的
  `resolveLegacySessionStorePath` 辅助程序已消失；旧的 `sessions.json` 路径
  构建现在仅在迁移和测试装置中本地存在。
- `src/config/sessions/session-entries.sqlite.ts` 现在将规范化会话条目存储在每个代理的数据库中，并支持行级别的读取/更新/删除补丁。运行时的更新/补丁/删除操作不再扫描大小写变体或修剪旧版别名键；规范化由 doctor 负责。独立的 JSON 导入辅助器已被移除，迁移操作会合并更新较新的行，而不是替换整个会话表。公共读取/列表/加载辅助器从类型化的 `sessions` 和 `conversations` 行中投影热会话元数据；`entry_json` 是一个兼容性/调试影子，可能过时或无效，但不会丢失类型化会话标识或传递上下文。
- `src/config/sessions/delivery-info.ts` 现在从类型化的按代理 `sessions` + `conversations` + `session_conversations` 行解析交付上下文。
  它不再从 `session_entries.entry_json` 重建运行时交付标识；缺失的类型化对话行是 doctor
  迁移/修复问题，而不是运行时回退。
- 存储会话（Stored-会话）重置决策现在优先使用类型化的 `sessions.session_scope`、
  `sessions.chat_type` 和 `sessions.channel` 元数据。`sessionKey` 解析
  仅用于命令目标上的显式线程/主题后缀；组与直接重置的分类不再来自键形状。
- 会话列表/状态显示分类现在使用类型化的聊天元数据和网关会话种类。它不再将 `session_key` 内的 `:group:` 或 `:channel:` 子字符串视为持久的群组/直接事实。
- 静默回复策略选择现在仅使用显式的对话类型或 Surface 元数据。它不再从 `session_key` 子字符串猜测直接/群组策略。
- 会话显示模型解析现在直接从 SQLite 会话数据库目标获取代理 ID，而不是从 `session_key` 中将其解析出来。
- 代理到代理的公告目标填充现在仅使用类型化的 `sessions.list`
  `deliveryContext`。它不再从遗留的 `origin`、镜像的 `last*` 字段或 `session_key` 形状中恢复渠道/账户/会话路由。
- `sessions_send` 会话目标拒绝现在读取类型化的 SQLite 路由元数据。它不再通过从目标键中解析会话后缀来拒绝或接受目标。
- 组范围工具策略验证现在为当前或生成的会话读取类型化的 SQLite 会话路由。它不再通过解码 `sessionKey` 来信任组/渠道身份；当没有类型化的会话记录为调用方提供的组 ID 担保时，这些 ID 将被丢弃。
- 渠道模型覆盖匹配现在使用显式组和父对话元数据。它不再从 `parentSessionKey` 解码父对话 ID。
- 存储的模型覆盖继承现在需要来自类型化会话上下文的显式父会话密钥。它不再从 `sessionKey` 中的 `:thread:` 或 `:topic:` 后缀派生父覆盖。
- 旧的会话线程信息包装器和已加载插件线程解析器已消失；没有运行时代码导入 `config/sessions/thread-info`。
- 渠道对话辅助器不再暴露完整会话密钥解析桥梁。核心仍然通过 `resolveSessionConversation(...)` 规范化提供商拥有的原始对话 ID，但它不会从 `sessionKey` 重建路由事实。
- 完成交付、发送策略和任务维护不再从 `session_key` 形状派生聊天类型。旧的聊天类型键解析器已被删除；这些路径需要类型化的会话元数据、类型化的交付上下文或显式的交付目标词汇。
- 会话列表/状态、诊断、审批账户绑定、TUI 心跳过滤和使用摘要不再挖掘 TUI`SessionEntry.origin` 以进行提供商/账户/线程/显示路由。仅剩余的运行时 `origin` 读取是非会话概念或当前轮次交付对象。
- 审批请求原生对话查找现在读取类型化的每代理会话路由行。它不再从 `sessionKey` 解析渠道/组/线程对话标识；缺少类型化元数据属于迁移/修复问题。
- Gateway(网关)会话已更改/聊天/会话事件负载不再回显Gateway(网关)`SessionEntry.origin`或`last*`路由影子；客户端接收类型化的`channel`、`chatType`和`deliveryContext`。
- 心跳传递解析现在可以直接接收类型化的SQLite`deliveryContext`，心跳运行时传递每个代理会话传递行，而不是依赖当前路由的兼容性`session_entries`影子。
- Cron独立代理传递目标解析也会在回退到兼容性条目负载之前，从类型化的每个代理会话传递行中填充其当前路由。
- Subagent 公告源解析现在将类型化的 requester-会话 传递上下文通过 `loadRequesterSessionEntry` 穿透，并且优先使用该行而非兼容性 `last*`/`deliveryContext` 影子。
- 入站会话元数据更新现在首先与类型化的每代理传递行合并；旧的 `SessionEntry` 传递字段仅当不存在类型化会话行时才作为回退。
- 重启/更新传递提取现在让类型化的 SQLite 传递 `threadId` 优先于从 `sessionKey` 解析的主题/线程片段；解析仅是遗留线程形状键的回退。
- Hook 代理上下文渠道 ID 现在优先使用类型化的 SQLite 会话标识，其次是显式消息元数据。它们不再从 `sessionKey` 解析提供商/组/渠道片段。
- Gateway(网关) Gateway(网关)`chat.send` 外部路由继承现在读取类型化的 SQLite 会话路由元数据，而不是从 `sessionKey`CLI 片段推断渠道/直接/组作用域。仅当类型化会话渠道和聊天类型与存储的传递上下文匹配时，渠道作用域会话才会继承；共享主会话保留其更严格的 CLI/no-client-metadata 规则。
- 重启哨兵唤醒和延续路由现在在排队心跳唤醒或路由代理轮次延续之前读取类型化的 SQLite 传递/路由行。它不再从会话条目 JSON 影子重建传递上下文。
- Gateway(网关) Gateway(网关)`tools.effective` 上下文解析现在会为提供商、账户、目标、线程和回复模式输入读取类型化的 SQLite 传递/路由行。它不再从过时的 `session_entries.entry_json` 原始副本中恢复那些热路由字段。
- 实时语音咨询路由现在从每个代理的类型化 SQLite 会话行中解析父/调用传递。在选择嵌入式代理消息路由时，它不再回退到兼容性 `SessionEntry.deliveryContext` 副本。
- ACP 生成心跳中继和父流路由现在从类型化 SQLite 会话行中读取父传递。它们不再从兼容性会话条目副本重建父传递上下文。
- 现在，会话投递路由的保留遵循类型化的聊天元数据和持久化的投递列。它不再从 `sessionKey` 中提取渠道提示、直接/主要标记或线程形状；仅当 SQLite 已具有该会话的类型化/持久化投递身份时，内部 Web 聊天路由才会继承外部目标。
- 通用会话投递提取现在仅读取确切的类型化 SQLite 会话投递行。它不再解析线程/主题后缀，也不会从线程形状的键回退到基本会话键。
- 回复调度、重启哨兵恢复和实时语音咨询路由现在使用确切的类型化 SQLite 会话/对话行进行线程路由。它们不再通过解析线程形状的会话键来恢复线程 ID 或基本会话投递上下文。
- 嵌入式 PI 历史记录限制现在使用类型化的 SQLite 会话路由
  投影（`sessions` + 主 `conversations`）来匹配提供商、聊天类型
  和对等身份。它不再从 `sessionKey` 中解析提供商、私信、群组或会话串的
  结构。
- Cron 工具传递推断现在仅使用显式传递或当前类型化的
  传递上下文。它不再从 `agentSessionKey` 中解码渠道、对等、账户或会话串
  目标。
- 运行时会话行不再携带旧的 `lastProvider` 路由别名。
  辅助函数和测试使用类型化的 `lastChannel` 和 `deliveryContext` 字段；
  doctor 迁移是唯一应该翻译旧路由别名
  或持久化 `origin` 影子的地方。
- Transcript 事件、VFS 行和 工具 工件行现在写入到 per-agent 数据库中。未发布的全局 transcript 文件映射表已消失；doctor 改为在持久化的迁移行中记录遗留源路径。
- 运行时 transcript 查找不再扫描 JSONL 字节偏移量或探测遗留 transcript 文件。Gateway(网关) 聊天/媒体/历史路径从 SQLite 读取 transcript 行；会话 JSONL 现在仅是 doctor 的遗留输入，而非运行时状态或导出格式。
- Transcript 父级和分支关系使用 SQLite transcript 头部中的结构化 `parentTranscriptScope: {agentId, sessionId}` 元数据，而不是类似路径的 `agent-db:...transcript_events...` 定位符字符串。
- 转录管理器协定不再暴露隐式的持久化 `create(cwd)` 或 `continueRecent(cwd)` 构造函数。持久化转录管理器通过显式的 `{agentId, sessionId}` 作用域打开；仅内存管理器在测试和纯转录转换中保持无作用域。
- 运行时转录存储 API 解析 SQLite 作用域，而非文件系统路径。旧的 `resolve...ForPath` 辅助函数和未使用的 `transcriptPath` 写入选项已从运行时调用者中移除。
- 运行时会话解析现在使用 `{agentId, sessionId}`，并且绝不能为外部边界派生 `sqlite-transcript://<agent>/<session>` 字符串。传统的绝对 JSONL 路径仅限作为 doctor 迁移的输入。
- Native hook relay direct-bridge records 现在驻留在以 relay id 为键的 `native_hook_relay_bridges` 行中。Runtime 不再为这些短期 bridge 记录写入 `/tmp` JSON 注册表或不透明的通用记录。
- `runEmbeddedPiAgent(...)` 不再具有 transcript-locator 参数。Prepared worker 描述符也省略了 transcript 定位符。Runtime 会话状态和排队的后续运行携带 `{agentId, sessionId}`，而不是派生的 transcript 句柄。
- 嵌入式压缩现在从 `agentId` 和 `sessionId`CLI 获取 SQLite 范围。
  压缩钩子、context-engine 调用、CLI 委托和协议回复
  不得接收派生的 `sqlite-transcript://...` 句柄。导出/调试代码
  可以从行中实现显式的用户工件，但它不提供
  通用的会话 JSONL 导出路径或将文件名反馈到运行时
  身份中。
- `/export-session` 从 SQLite 读取记录行，并仅写入请求的
  独立 HTML 视图。嵌入式查看器不再从这些行
  重建或下载会话 JSONL。
- Context-engine 委托不再解析记录定位器来恢复
  代理身份。准备好的运行时上下文将解析后的 `agentId`
  带入内置压缩适配器。
- 转录重写和实时工具结果截断现在通过 `{agentId, sessionId}` 读取并持久化转录状态，并且不会为转录更新事件负载派生临时定位符。
- 转录状态辅助接口不再具有基于定位符的 `readTranscriptState`、`replaceTranscriptStateEvents` 或 `persistTranscriptStateMutation` 变体。运行时调用者必须使用 `{agentId, sessionId}` API。Doctor 导入通过显式文件路径读取旧文件并写入 SQLite 行；它不会迁移定位符字符串。
- 运行时会话管理器合约不再暴露 `open(locator)`、
  `forkFrom(locator)` 或 `setTranscriptLocator(...)`。持久化会话
  管理器仅通过 `{agentId, sessionId}` 打开；列表/分叉辅助工具位于
  面向行的会话和检查点 API 上，而不是转录管理器
  外观上。
- Gateway(网关) 转录读取器 API 优先考虑作用域。它们接受
  `{agentId, sessionId}`，并且不接受可能意外成为运行时标识的位置转录定位器。活动转录定位器解析
  已消失；旧版源路径仅由 doctor 导入代码读取。
- 转录更新事件也是优先考虑作用域的。`emitSessionTranscriptUpdate`
  不再接受裸定位器字符串，并且侦听器通过
  `{agentId, sessionId}` 进行路由，而无需解析句柄。
- Gateway(网关) 会话消息广播从代理/会话作用域解析会话密钥，而不是从转录定位器解析。旧的转录定位器到会话密钥解析器/缓存已消失。
- Gateway(网关) 会话历史 SSE 按代理/会话作用域过滤实时更新。它不再对转录定位器候选项、真实路径或文件形式的转录身份进行规范化处理，以决定流是否应接收更新。
- 会话生命周期挂钩不再在 `session_end` 上派生或暴露转录定位器。挂钩使用者获得 `sessionId`、`sessionKey`、下一个会话 ID 和代理上下文；转录文件不属于生命周期契约的一部分。
- Reset hooks 也不再派生或暴露 transcript 定位器。`before_reset` payload 携带恢复的 SQLite 消息以及重置原因，而会话身份则保留在 hook 上下文中。
- Agent harness 重置不再接受 transcript 定位器。重置分发通过 `sessionId`/`sessionKey` 加上原因来确定作用域。
- Agent extension 会话类型不再暴露 `transcriptLocator`；扩展应使用会话上下文和运行时 API，而不是获取文件形式的 transcript 身份。
- Plugin compaction hooks 不再暴露 transcript 定位器。Hook 上下文已携带会话身份，且 transcript 读取必须通过 SQLite 作用域感知的 API 进行，而不是使用文件形式的句柄。
- `before_agent_finalize` hooks 不再公开 `transcriptPath`，包括
  原生 hook 中继 payload。Finalization hooks 仅使用会话上下文。
- Gateway(网关) 重置响应不再在返回的条目上合成记录定位器。重置会创建 SQLite 记录行，返回干净的
  会话条目，并将记录访问留给 scope-aware readers。
- 嵌入式运行和压缩结果不再为
  会话计算显示记录定位器。自动压缩仅更新活动的 `sessionId`、
  压缩计数器和 token 元数据。
- 嵌入式尝试结果不再返回 `transcriptLocatorUsed`，且
  context-engine `compact()` 结果不再返回记录定位器。
  运行时重试循环仅接受后继 `sessionId`。
- Delivery-mirror 副本追加结果不再返回副本定位符。调用者获取追加的 `messageId`；副本更新信号使用 SQLite 作用域。
- 父会话 fork 辅助函数仅返回 fork 的 `sessionId`。子代理准备将子代理/会话作用域传递给引擎。
- CLI 运行器参数和历史记录重播不再接受副本定位符。CLI 历史记录读取从 `{agentId, sessionId}` 和会话键上下文中解析 SQLite 副本作用域。
- CLI 和嵌入式运行器测试装置现在按会话 ID 种子和读取 SQLite 副本行，而不是假装活动会话是 `*.jsonl` 文件或通过运行时参数传递 `sqlite-transcript://...` 字符串。
- 会话 工具 结果保护事件从已知的会话作用域发出，即使内存管理器没有派生的定位器。其测试不再伪造活动的 `/tmp/*.jsonl` 副本文件。
- BTW 和压缩检查点辅助函数现在按 SQLite 作用域读取和派生副本行。检查点元数据现在仅存储会话 ID 和叶子/条目 ID；派生的定位器不再写入检查点负载中。
- Gateway(网关) 副本键查找在协议边界使用 SQLite 副本作用域，不再对副本文件名执行 realpath 或 stat 操作。
- 自动压缩副本轮换直接通过 SQLite 副本存储写入后继副本行。会话行仅保留后继会话标识，而不是持久的 JSONL 路径或持久化的定位器。
- 嵌入式上下文引擎压缩使用 SQLite 命名的轮换助手。轮换测试不再构建 JSONL 后继路径或将活动会话模型化为文件。
- 托管传出图像保留功能根据 SQLite 转录统计信息（而非文件系统 stat 调用）对其转录消息缓存进行键控。
- 运行时会话锁和独立的旧版 `.jsonl.lock` doctor 通道已被移除。
- Microsoft Teams 运行时模块和公共插件 SDK 不再重新导出旧文件锁助手；持久化插件状态路径由 SQLite 支持。
- 会话年龄/计数修剪和显式会话清理已被移除。Doctor 负责旧版导入；过时会话会被显式重置或删除。
- Doctor 完整性检查不再将旧版 JSONL 文件视为 SQLite 会话行的有效活动
  转录。活动转录的健康检查仅针对 SQLite；
  旧版 JSONL 文件被报告为迁移/孤立清理的输入。
- Doctor 不再将 `agents/<agent>/sessions/` 视为必需的运行时
  状态。它仅在该目录已存在时进行扫描，作为旧版导入
  或孤立清理的输入。
- Gateway Gateway(网关)TUI`sessions.resolve`，会话修补/重置/压缩路径，子代理
  生成，快速中止，ACP 元数据，心跳隔离会话，以及 TUI
  修补不再作为正常运行时工作的副作用迁移或修剪旧版会话密钥。
- CLI 命令会话解析现在返回所属的 CLI`agentId` 而不是
  `storePath`，并且在正常的
  `--to` 或 `--session-id` 解析期间不再复制旧的主会话行。旧的主行规范化仅属于 doctor。
- 运行时子代理深度解析不再读取 `sessions.json` 或 JSON5
  会话存储。它按代理 ID 读取 SQLite `session_entries`，旧的深度/会话元数据只能通过 doctor 导入路径进入。
- Auth 配置文件会话覆盖通过直接 `{agentId, sessionKey}`
  行插入来持久化，而不是延迟加载文件形式的会话存储运行时。
- 自动回复详细门控和会话更新助手现在通过会话身份读取/更新 SQLite
  会话行，并且在接触持久化行状态之前不再需要旧的存储路径。
- 命令运行的会话元数据助手现在使用面向条目的名称和模块
  路径；旧的 `session-store` 命令助手表面已被移除。
- 引导头种子植入和手动压缩边界加固现在直接修改
  SQLite 转录行。运行时调用者传递会话身份，而不是
  可写的 `.jsonl` 路径。
- 静默会话轮换重放通过 `{agentId, sessionId}` 从 SQLite 转录行复制最近的用户/助手轮次。它不再接受
  源或目标转录定位器。
- 新的运行时会话行不再存储转录本定位器。调用者直接使用
  `{agentId, sessionId}`；导出/调试命令可以在具体化行时选择输出文件
  名称。
- 启动一个新的持久化转录本会话现在总是按作用域打开 SQLite 行。会话管理器不再重用以前的文件时代转录本
  路径或定位器作为新会话的身份。
- 持久化转录本会话使用显式的
  `openTranscriptSessionManagerForSession({agentId, sessionId})` API。旧的
  静态 `SessionManager.create/openForSession/list/forkFromSession` 外观已
  消失，因此测试和运行时代码无法意外地重新创建文件时代的会话
  发现机制。
- 插件运行时不再暴露 `api.runtime.agent.session.resolveTranscriptLocatorPath`；
  插件代码使用 SQLite 行辅助程序和作用域值。
- 公共 `session-store-runtime` SDK 表面现在仅导出会话行和转录行辅助函数。原始的 SQLite 数据库打开/路径以及关闭/重置辅助函数位于专用的 `sqlite-runtime` SDK 表面中，因此插件测试不再引入已弃用的广泛测试桶来进行数据库清理。
- 传统的 `.jsonl` 轨迹/检查点文件名分类器现在位于 doctor 传统会话文件模块中。核心会话验证不再引入文件产物辅助函数来决定正常的 SQLite 会话 ID。
- 主动内存阻塞型子代理运行使用 SQLite 转录行，而不是在插件状态下创建临时或持久化的 `session.jsonl` 文件。旧的 `transcriptDir` 选项已被移除。
- 一次性 slug 生成和 Crestodian 规划器运行使用 SQLite 转录行，而不是创建临时的 `session.jsonl` 文件。
- `llm-task` 辅助运行和隐藏承诺提取也使用 SQLite 转录行，因此这些仅模型的辅助会话不再创建临时的 JSON/JSONL 转录文件。
- `TranscriptSessionManager` 现在只是一个打开的 SQLite 转录作用域。运行时代码通过 `openTranscriptSessionManagerForSession({agentId, sessionId})` 打开它；创建、分支、继续、列表和分叉流程位于其所属的 SQLite 行辅助程序中，而不是静态管理器外观。Doctor/导入/调试代码在运行时会话管理器之外处理显式的遗留源文件。
- 过时的 `SessionManager.newSession()` 和
  `SessionManager.createBranchedSession()` 门面方法已被移除。新的
  会话和转录子代由其所属的 SQLite
  工作流创建，而不是将已打开的管理器更改为不同的持久化会话。
- 父转录分支决策和分支创建不再接受
  `storePath` 或 `sessionsDir`；它们使用 `{agentId, sessionId}` SQLite
  转录作用域，而不是保留的文件系统路径元数据。
- Memory-host 不再导出空操作的会话目录转录
  分类辅助器；转录筛选现在在条目构建期间从 SQLite 行
  元数据派生。
- Memory-host 和 QMD 会话导出测试使用 SQLite 转录作用域。旧的 `agents/<agentId>/sessions/*.jsonl` 路径仅在测试旨在验证 doctor/import/export 兼容性时保持覆盖。
- QA-lab 原始会话检查现在通过网关使用 `sessions.list` 而不是读取 `agents/qa/sessions/sessions.json`；MSteams 反馈直接追加到 SQLite 转录中，而无需伪造 JSONL 路径。
- 共享入站渠道轮次现在携带 `{agentId, sessionKey}` 而不是旧的 `storePath`。LINE、WhatsApp、Slack、Discord、Telegram、Matrix、Signal、iMessage、BlueBubbles、Feishu、Google Chat、IRC、Nextcloud Talk、Zalo、Zalo Personal、QA Channel、Microsoft Teams、Mattermost、Synology Chat、Tlon、Twitch 和 QQBot 记录路径现在通过 SQLite 身份读取更新元数据并记录入站会话行。
- Transcript 定位符持久性已从活动会话行中移除。
  `resolveSessionTranscriptTarget` 返回 `agentId`、`sessionId` 和可选
  的主题元数据；doctor 是唯一导入旧版 transcript 文件
  名称的代码。
- 运行时 transcript 标头始于 SQLite 版本 `1`。旧的 JSONL V1/V2/V3
  形状升级仅存在于 doctor 导入中，并在存储行之前将导入的标头标准化为
  当前的 SQLite transcript 版本。
- 数据库优先防护机制现在禁止 `SessionManager.listAll` 和
  `SessionManager.forkFromSession`；会话列出和 fork/restore 工作流
  必须保持使用行/作用域 SQLite API。
- 该防护机制还在 doctor/import 代码之外禁止旧版 transcript JSONL 解析/活动分支修复辅助
  名称，因此运行时无法产生第二条旧版
  transcript 迁移路径。
- 嵌入式 PI 运行拒绝传入的转录句柄。它们在工作器启动前使用 SQLite
  `{agentId, sessionId}` 标识，并在尝试触及转录状态之前再次使用。过时的 `/tmp/*.jsonl` 输入无法选择
  运行时写入目标。
- 缓存跟踪、Anthropic 负载、原始流和诊断时间线记录
  现在写入类型化的 SQLite Anthropic`diagnostic_events`Gateway(网关) 行。Gateway(网关) 稳定性包
  现在写入类型化的 SQLite `diagnostic_stability_bundles` 行。旧的
  `diagnostics.cacheTrace.filePath`、`OPENCLAW_CACHE_TRACE_FILE`、
  `OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` 和
  `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` JSONL 覆盖路径已被移除，
  且常规稳定性捕获不再写入 `logs/stability/*.json` 文件。
- Cron 持久化现在协调 SQLite `cron_jobs` 行，而不是在每次保存时删除/重新插入整个作业表。插件目标回写直接更新匹配的 cron 行，并将运行时 cron 状态保持在同一状态数据库事务中。
- Cron 运行时调用者现在使用稳定的 SQLite cron 存储键。遗留 `cron.store`Telegram 路径仅作为 doctor 导入输入；生产网关、任务维护、状态、运行日志和 Telegram 目标回写路径使用 `resolveCronStoreKey`，不再对键进行路径规范化。Cron 状态现在报告 `storeKey`，而不是旧的文件形式 `storePath` 字段。
- Cron 运行时加载和调度不再规范化遗留的持久化作业形状，例如 `jobId`、`schedule.cron`、数字 `atMs`、字符串布尔值或缺失的 `sessionTarget`。Doctor 遗留导入负责在行插入 SQLite 之前进行这些修复。
- ACP 生成不再解析或持久化脚本 JSONL 文件路径。生成和线程绑定设置直接持久化 SQLite 会话行，并将会话 ID 作为保留的脚本标识。
- ACP 会话元数据 API 现在通过 `agentId` 读取/列表/更新插入 SQLite 行，并且不再将 `storePath` 作为 ACP 会话条目契约的一部分公开。
- 会话使用核算和Gateway(网关)使用聚合现在仅通过 `{agentId, sessionId}` 解析记录。成本/使用缓存和已发现会话摘要不再合成或返回记录定位器字符串。
- Gateway(网关)聊天追加、中止部分持久化、Gateway(网关)`/sessions.send` 和 webchat 媒体记录写入直接通过 SQLite 记录范围追加。Gateway(网关)记录注入辅助函数不再接受 `transcriptLocator` 参数。
- SQLite 记录发现现在仅列出记录范围和统计信息：`{agentId, sessionId, updatedAt, eventCount}`。已过时的 `listSqliteSessionTranscriptLocators` 兼容性辅助函数和每行 `locator` 字段已被移除。
- Transcript 修复运行时现在仅公开
  `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`。旧的
  基于定位符的修复助手已被删除；doctor/debug 代码读取显式
  源文件路径，并且从不迁移定位符字符串。
- ACP 重放账本运行时现在将会话级别的重放行存储在共享
  SQLite 状态数据库中，而不是 `acp/event-ledger.json`；doctor 会导入并
  删除旧文件。
- Gateway(网关) transcript 读取器助手现在位于
  `src/gateway/session-transcript-readers.ts` 而不是旧的
  `session-utils.fs` 模块名称中。后备重试历史检查现在以
  SQLite transcript 内容命名，而不是旧的文件助手表面。
- Gateway(网关) 注入聊天和压缩助手现在通过内部助手 API 传递 SQLite transcript 范围，
  而不是将值命名为 transcript 路径或
  源文件。
- 引导继续检测现在通过 `hasCompletedBootstrapTranscriptTurn` 检查 SQLite 转录行；它不再公开一个文件形状的辅助名称。
- 嵌入式运行器测试现在使用 SQLite 转录标识，并且打开一个新的转录管理器总是需要显式的 `sessionId`。
- 内存索引辅助现在端到端地使用 SQLite 转录术语：主机导出 `listSessionTranscriptScopesForAgent` 和 `sessionTranscriptKeyForScope`，目标同步队列 `sessionTranscripts`，公共会话搜索命中公开不透明的 `transcript:<agent>:<session>` 路径，并且内部 DB 源键是 `session:<session>` 在 `source_kind='sessions'` 下，而不是假文件路径。
- 通用插件 SDK 持久去重辅助器不再公开文件形状的选项。调用者提供 SQLite 范围键，持久去重行位于共享插件状态中。
- Microsoft Teams SSO 和委派的 OAuth 令牌已从锁定的 JSON 文件移动到 SQLite 插件状态。Doctor 导入 Microsoft TeamsOAuth`msteams-sso-tokens.json` 和 `msteams-delegated.json`，从负载重建规范 SSO 令牌键，并删除源文件。
- Matrix 同步缓存状态已从 Matrix`bot-storage.json`MatrixMatrix 移动到 SQLite 插件状态。Doctor 导入旧的原始或包装同步负载并删除源文件。活跃的 Matrix 和 QA Matrix 客户端传递 SQLite 同步存储根目录，而不是伪造的 `sync-store.json` 或 `bot-storage.json` 路径。
- Matrix 旧版加密迁移状态已从 Matrix`legacy-crypto-migration.json`Matrix 移至 SQLite 插件状态。Doctor 会导入旧的状态文件；Matrix SDK IndexedDB 快照已从 `crypto-idb-snapshot.json`Matrix 移至 SQLite 插件 blob。Matrix 恢复密钥和凭据是 SQLite 插件状态行；其旧 JSON 文件仅作为 Doctor 迁移输入。
- Memory Wiki 活动日志现在使用 SQLite 插件状态代替 `.openclaw-wiki/log.jsonl`。Memory Wiki 迁移提供商会导入旧的 JSONL 日志；wiki markdown 和用户 vault 内容作为工作区内容保持文件支持。
- Memory Wiki 不再创建 `.openclaw-wiki/state.json` 或未使用的 `.openclaw-wiki/locks` 目录。如果较旧的 vault 中仍有这些已停用的插件元数据文件，迁移提供商会将其删除。
- Crestodian 审计条目现在使用核心 SQLite 插件状态，而不是
  `audit/crestodian.jsonl`。Doctor 会导入旧版 JSONL 审计日志，并在成功导入后将其删除。
- 配置写入/观察审计条目现在使用核心 SQLite 插件状态，而不是
  `logs/config-audit.jsonl`。Doctor 会导入旧版 JSONL 审计日志，并在成功导入后将其删除。
- macOS 伴侣在编辑 `openclaw.json`macOS 时，不再写入应用本地 Gateway(网关)`logs/config-audit.jsonl` 或
  `logs/config-health.json` 副本。配置文件保持文件支持，恢复快照保留在配置文件旁边，持久的配置审计/健康状态属于 Gateway(网关) SQLite 存储。
- Crestodian 救援待批准项现在使用核心 SQLite 插件状态，而不是 `crestodian/rescue-pending/*.json`。Doctor 会导入旧的待批准文件，并在成功导入后将其删除。
- Phone Control 临时布防状态现在使用 SQLite 插件状态，而不是 `plugins/phone-control/armed.json`。Doctor 将旧的布防状态文件导入到 `phone-control/arm-state` 命名空间并删除该文件。
- Doctor 不再就地修复 JSONL 转录文件或创建备份 JSONL 文件。它会将活动分支导入 SQLite 并删除旧源。
- 会话内存挂钩转录查找使用 `{agentId, sessionId}` 作用域仅限的 SQLite 读取。其辅助函数不再接受或推导转录定位符、旧文件读取或文件重写选项。
- Codex 应用服务器对话绑定现在通过 OpenClaw 会话键或显式的 OpenClaw`{agentId, sessionId}` 作用域来键控 SQLite 插件状态。它们绝不能保留 transcript-path 回退绑定。
- Codex 应用服务器镜像历史记录读取仅使用 SQLite transcript 作用域；绝不能从 transcript 文件路径恢复标识。
- 角色排序和压缩重置路径不再取消链接旧的 transcript 文件；重置仅轮换 SQLite 会话行和 transcript 标识。
- Gateway(网关) 重置和检查点响应返回干净的会话行以及会话 ID。它们不再为客户端合成 SQLite transcript 定位器。
- Memory-core dreaming 不再通过探测缺失的 JSONL 文件来清理会话行。Subagent 清理通过会话运行时 API 进行，而不是检查文件系统是否存在。其脚本摄取测试直接种子化 SQLite 行，而不是创建 `agents/<id>/sessions` fixtures 或定位符占位符。
- Memory 脚本索引可能会将 `transcript:<agentId>:<sessionId>` 作为引用/读取助手的虚拟搜索命中路径公开。持久化索引源是关系型的（`source_kind='sessions'`、`source_key='session:<sessionId>'`、`session_id=<sessionId>`），因此该值不是运行时脚本定位符，不是文件系统路径，并且绝不能传回给会话运行时 API。
- Gateway(网关) doctor 内存状态从 SQLite plugin-state 行读取短期回溯和相位信号计数，而不是 Gateway(网关)`memory/.dreams/*.json`CLI；CLI 和 doctor 输出现在将该存储标记为 SQLite 存储而非路径。
- Memory-core 运行时、CLI 状态、Gateway(网关) doctor 方法和插件 SDK 外观不再审计或归档遗留的 CLIGateway(网关)`.dreams/session-corpus` 文件。这些文件仅作为迁移输入；doctor 将它们导入 SQLite 并在验证后删除源文件。活动的会话摄取证据行现在使用虚拟 SQLite 路径 `memory/session-ingestion/<day>.txt`；运行时永远不会写入或从 `.dreams/session-corpus` 推导状态。
- Memory-core 公共构件将 SQLite 主机事件暴露为虚拟 JSON 构件 `memory/events/memory-host-events.json`；它们不再重用旧版 `.dreams/events.jsonl` 源路径。
- 沙箱容器/浏览器注册表现在使用共享的 `sandbox_registry_entries` SQLite 表，其中包含类型化的会话、镜像、时间戳、后端/配置和浏览器端口列。Doctor 会导入旧版单体和分片 JSON 注册表文件，并移除成功的源。运行时读取使用类型化行列作为事实来源；`entry_json` 仅用于重放/调试副本。
- 承诺现在使用类型化的共享 `commitments` 表，而不是整个存储的 JSON 块。快照保存按承诺 ID 进行 upsert，并仅删除缺失的行，而不是清空并重新插入该表。运行时从类型化的作用域、交付窗口、状态、尝试和文本列加载承诺；`record_json` 仅用于重放/调试副本。Doctor 导入旧的 `commitments.json` 并在成功导入后将其删除。
- Cron 任务定义、调度状态和运行历史不再拥有运行时 JSON 写入器或读取器。运行时使用带有类型化 schedule、payload、delivery、failure-alert、会话、status 和 runtime-state 列的 `cron_jobs` 行，加上用于 status、diagnostics summary、delivery status/error、会话/run、模型 和 token 总计的类型化 `cron_run_logs` 元数据。`job_json` 仅仅是一个重放/调试副本；`state_json` 保留尚未拥有热查询字段的嵌套运行时诊断信息，而运行时从类型化列中重新注入热状态字段。Doctor 会导入遗留的 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件并删除已导入的源文件。插件目标回写会更新匹配的 `cron_jobs` 行，而不是加载和替换整个 cron 存储区。
- 如果 doctor 无法在不替换显式传递目标的情况下安全地翻译遗留的 `notify: true` webhook 回退，它会记录一条警告并保留遗留源，而不是发布有损的 SQLite 行。
- 出站和会话传递队列现在将队列状态、条目类型、会话密钥、渠道、目标、账户 ID、重试次数、上次尝试/错误、恢复状态和平台发送标记作为类型化列存储在共享的 `delivery_queue_entries` 表中。运行时恢复从类型化列中读取这些热字段，重试/恢复变更直接更新这些列，而无需重写重放 JSON。完整的 JSON 负载仅作为消息正文和其他冷重放数据的重放/调试 Blob 保留。
- 托管发出的图像记录现在使用类型化共享的
  `managed_outgoing_image_records` 行，媒体字节仍存储在
  `media_blobs` 中。JSON 记录仅作为重放/调试副本保留。
- Discord 模型选择器偏好设置、命令部署哈希和线程绑定
  现在使用共享 SQLite 插件状态。其遗留 JSON 导入方案位于
  Discord 插件设置/doctor 迁移表面中，而非核心迁移代码中。
- 插件遗留导入检测器使用 doctor 命名的模块，例如
  `doctor-legacy-state.ts` 或 `doctor-state-imports.ts`；普通渠道运行时
  模块绝不能导入遗留 JSON 检测器。
- BlueBubbles 追赶游标和入站去重标记现在使用共享的 SQLite 插件状态。其旧版 JSON 导入方案位于 BlueBubbles 插件设置/医生迁移界面中，而非核心迁移代码中。
- Telegram 更新偏移量、贴纸缓存行、已发送消息缓存行、主题名称缓存行和线程绑定现在使用共享的 SQLite 插件状态。其旧版 JSON 导入方案位于 Telegram 插件设置/医生迁移界面中，而非核心迁移代码中。
- iMessage 追赶游标、回复短 ID 映射和发送回显去重行现在使用共享的 SQLite 插件状态。旧的 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl` 文件仅作为医生输入使用。
- Feishu 消息去重行现在使用共享的 SQLite 插件状态，而不是 `feishu/dedup/*.json` 文件。其遗留 JSON 导入方案位于 Feishu 插件 setup/doctor 迁移界面中，而不是核心迁移代码中。
- Microsoft Teams 对话、投票、待上传缓冲区和反馈学习现在使用共享的 SQLite 插件状态/blob 表。待上传路径使用 `plugin_blob_entries`，因此媒体缓冲区作为 SQLite BLOB 存储而不是 base64 JSON。运行时辅助名称现在使用 SQLite/状态命名，而不是 `*-fs` 文件存储命名，并且旧的 `storePath` 垫片已从这些存储中移除。其遗留 JSON 导入方案位于 Microsoft Teams 插件 setup/doctor 迁移界面中。
- Zalo 托管的出站媒体现在使用共享 SQLite Zalo`plugin_blob_entries`
  代替 `openclaw-zalo-outbound-media` JSON/bin 临时侧车文件。
- Diffs 查看器 HTML 和元数据现在使用共享 SQLite `plugin_blob_entries`
  代替 `meta.json`/`viewer.html` 临时文件。渲染的 PNG/PDF 输出保持
  临时物化形式，因为渠道交付仍然需要文件路径。
- Canvas 托管文档现在使用共享 SQLite Canvas`plugin_blob_entries` 代替
  默认的 `state/canvas/documents`Canvas 目录。Canvas 主机直接
  提供这些 blob；仅当需要显式的 `host.root`
  操作员内容或下游媒体读取器需要路径进行临时物化时，才创建本地文件。
- 文件传输审计决策现在使用共享的 SQLite `plugin_state_entries`
  而不是无限制的 `audit/file-transfer.jsonl` 运行时日志。Doctor
  会将旧的 JSONL 审计文件导入到插件状态中，并在成功导入后移除源文件。
- ACPX 进程租约和网关实例标识现在使用共享的 SQLite 插件
  状态。Doctor 会将旧的 `gateway-instance-id` 文件导入到插件状态中
  并移除源文件。
- ACPX 生成的包装脚本和隔离的 Codex 主目录是位于 OpenClaw 临时根目录下的临时
  具体化文件，而非持久的 OpenClaw 状态。
  持久的 ACPX 运行时记录是 SQLite 租约和网关实例行；
  旧的 ACPX `stateDir` 配置界面已被移除，因为不再有运行时状态写入其中。
- Gateway(网关) 媒体附件现在使用共享的 Gateway(网关)`media_blobs` SQLite 表作为
  规范字节存储。返回到渠道和沙盒
  兼容层的本地路径是数据库行的临时物化，而不是
  持久化媒体存储。运行时媒体允许列表不再包含传统
  `$OPENCLAW_STATE_DIR/media` 或 config-dir `media` 根目录；这些目录
  仅是 doctor 导入源。
- Shell 补全不再写入 `$OPENCLAW_STATE_DIR/completions/*` 缓存
  文件。安装、doctor、更新和发布冒烟路径使用生成的
  补全输出或配置文件加载，而不是持久的补全缓存
  文件。
- Gateway(网关) skill-upload staging 现在使用共享的 Gateway(网关)`skill_uploads` 行。上传元数据、幂等键和归档字节存储在 SQLite 中；安装程序仅在安装运行期间接收一个临时的物化归档路径。
- 子代理内联附件不再在工作区 `.openclaw/attachments/*` 下进行物化。生成路径准备 SQLite VFS 种子条目，内联运行将这些种子条目注入到每个代理运行时临时命名空间中，而磁盘支持的工具将 SQLite 临时层叠加在附件路径上。旧的子代理运行附件目录注册表列和清理钩子已被移除。
- CLI 映像填充不再维护稳定的 CLI`openclaw-cli-images`CLI 缓存文件。外部 CLI 后端仍接收文件路径，但这些路径是每次运行都会清理的临时具体化文件。
- 缓存跟踪诊断、Anthropic 负载诊断、原始模型流诊断、诊断时间轴事件以及 Gateway(网关) 稳定性包现在写入 SQLite 行，而不是 AnthropicGateway(网关)`logs/*.jsonl` 或 `logs/stability/*.json` 文件。运行时路径覆盖标志和环境变量已被移除；导出/调试命令可以从数据库行显式具体化文件。
- macOS 伴侣应用不再拥有滚动 macOS`diagnostics.jsonl`Gateway(网关) 写入器。应用程序日志进入统一日志，持久的 Gateway 诊断信息仍保留在 SQLite 支持下。
- macOS port-guardian 记录列表现在使用类型化的共享 SQLite macOS`macos_port_guardian_records` 行，而不是 Application Support JSON 文件或不透明的单例 blob。
- Gateway 单例锁现在在 `gateway_locks`Gateway(网关) 范围下使用类型化的共享 SQLite OAuth`state_leases` 行，而不是临时目录锁文件。Fly 和 OAuth 故障排除文档现在指向 SQLite 租约/身份验证刷新锁，而不是过时的文件锁清理。
- Gateway(网关) 重启哨兵状态现在使用类型化共享 SQLite Gateway(网关)`gateway_restart_sentinel` 行而不是 `restart-sentinel.json`；运行时从类型化列中读取哨兵类型、状态、路由、消息、延续和统计信息。`payload_json` 仅作为重放/调试副本。运行时代码直接清除 SQLite 行，不再携带文件清理管道。
- Gateway(网关) 重启意图和主管交接状态现在使用类型化共享 SQLite Gateway(网关)`gateway_restart_intent` 和 `gateway_restart_handoff` 行，而不是 `gateway-restart-intent.json` 和 `gateway-supervisor-restart-handoff.json` 侧车。
- Gateway(网关) 单例协调现在使用 `gateway_locks` 下的类型化 Gateway(网关)`state_leases` 行，而不是写入 `gateway.<hash>.lock` 文件。租约行拥有锁所有者、过期时间、心跳和调试负载；SQLite 拥有原子获取/释放边界。已废弃的文件锁目录选项已消失；测试直接使用 SQLite 行标识。
- 旧的未被引用的扫描 `cron/runs/*.jsonl` 文件的 cron 使用情况报告辅助程序已被删除。Cron 运行历史报告应读取类型化的 `cron_run_logs` SQLite 行。
- 主会话重启恢复现在通过 SQLite `agent_databases` 注册表发现候选代理，而不是扫描 `agents/*/sessions` 目录。
- Gemini 会话损坏恢复现在仅删除 SQLite 会话行；它不再需要传统的 `storePath` 门控，也不会尝试取消链接派生的转录 JSONL 路径。
- 路径覆盖处理现在将字面量 `undefined`/`null` 环境值视为未设置，以防止在测试或 Shell 交接期间意外出现仓库根目录 `undefined/state/*.sqlite` 数据库。
- 配置健康指纹现在使用类型化的共享 SQLite `config_health_entries` 行而不是 `logs/config-health.json`macOS，从而保持普通配置文件作为唯一的非凭据配置文档。macOS 伴侣仅保留进程本地健康状态，不会重新创建旧的 JSON 副车。
- Auth profile 运行时不再导入或写入凭据 JSON 文件。
  规范的凭据存储是 SQLite；`auth-profiles.json`、每个代理的
  `auth.json` 和共享的 `credentials/oauth.json` 是 doctor 迁移输入，
  在导入后会被删除。
- Auth profile 保存/状态测试现在直接断言类型化的 SQLite auth 表，
  并且仅将旧版 auth-profile 文件名用于 doctor 迁移输入。
- `openclaw secrets apply` 仅清理配置文件、环境文件和 SQLite
  auth-profile 存储。它不再包含编辑已退役的每个代理 `auth.json` 的兼容逻辑；
  doctor 负责导入和删除该文件。
- Hermes 密钥迁移计划并直接将导入的 API 密钥配置文件应用到 SQLite auth-profile 存储中。它不再写入或验证 API`auth-profiles.json` 作为中间目标。
- 面向用户的身份验证文档现在描述 `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>`，而不是告诉用户检查或复制 `auth-profiles.json`OAuth；传统的 OAuth/auth JSON 名称仅作为 doctor-import 输入保留在文档中。
- 核心状态路径辅助函数不再暴露已退役的 `credentials/oauth.json` 文件。该传统文件名仅限于 doctor auth 导入路径。
- 安装、安全、新手引导、模型身份验证和 SecretRef 文档现在描述 SQLite auth-profile 行和全状态备份/迁移，而不是每个代理的 auth-profile JSON 文件。
- PI 模型发现现在会将规范凭据传递到内存中的 `pi-coding-agent` 认证存储中。它不再在发现期间创建、清理或写入每个代理的 `auth.json`。
- Voice Wake 触发和路由设置现在使用类型化的共享 SQLite 表，而不是 `settings/voicewake.json`、`settings/voicewake-routing.json` 或不透明的通用行；doctor 会导入旧的 JSON 文件，并在成功迁移后将其删除。
- 更新检查状态现在使用类型化的共享 `update_check_state` 行，而不是 `update-check.json` 或不透明的通用块；doctor 会导入旧的 JSON 文件，并在成功迁移后将其删除。
- 配置健康状态现在使用类型化的共享 `config_health_entries` 行，而不是 `logs/config-health.json` 或不透明的通用 blob；doctor 会导入旧的 JSON 文件，并在迁移成功后将其删除。
- 插件对话绑定批准现在使用类型化的 `plugin_binding_approvals` 行，而不是不透明的共享 SQLite 状态或 `plugin-binding-approvals.json`；旧文件是 doctor 迁移的输入。
- 通用当前对话绑定现在存储类型化的 `current_conversation_bindings` 行，而不是重写 `bindings/current-conversations.json`；doctor 会导入旧的 JSON 文件，并在迁移成功后将其删除。
- Memory Wiki 导入源同步账本现在为每个保管库/源键存储一个 SQLite 插件状态行，而不是重写 `.openclaw-wiki/source-sync.json`；迁移提供商会导入并删除旧的 JSON 账本。
- Memory Wiki ChatGPT 导入运行记录现在为每个库/运行 ID 存储一个 SQLite 插件状态行，而不是写入 `.openclaw-wiki/import-runs/*.json`。回滚快照在导入运行快照归档移动到 blob 存储之前，仍然是显式的库文件。
- Memory Wiki 编译摘要现在存储 SQLite 插件 blob 行，而不是写入 `.openclaw-wiki/cache/agent-digest.json` 和 `.openclaw-wiki/cache/claims.jsonl`。迁移提供商会导入旧的缓存文件，并在缓存目录变空时将其删除。
- ClawHub 技能安装跟踪现在为每个工作区/技能存储一个 SQLite plugin-state 行，而不是在运行时写入或读取 ClawHub`.clawhub/lock.json` 和 `.clawhub/origin.json` 侧车文件。运行时代码使用 tracked-install 状态对象，而不是基于文件形状的 lockfile/origin 抽象。Doctor 会从配置的代理工作区导入旧版侧车文件，并在干净导入后将其移除。
- 已安装的插件索引现在读取并写入类型化的共享 SQLite `installed_plugin_index` 单例行，而不是 `plugins/installs.json`；旧的 JSON 文件仅作为 doctor 迁移输入，并在导入后被移除。
- 旧的 `plugins/installs.json` 路径助手现在位于 doctor 旧版代码中。运行时插件索引模块仅公开基于 SQLite 的持久化选项，而非 JSON 文件路径。
- Gateway(网关) 重启标记、重启意图和主管交接状态现在使用类型化的共享 SQLite 行（Gateway(网关)`gateway_restart_sentinel`、`gateway_restart_intent` 和 `gateway_restart_handoff`），而不是通用的不透明块。运行时重启代码不再具有文件形状的标记/意图/交接约定。
- Matrix 同步缓存、存储元数据、线程绑定、入站去重标记、启动验证冷却状态、SDK IndexedDB 加密快照、凭据和恢复密钥现在使用共享 SQLite 插件状态/块表。运行时路径结构体不再公开 Matrix`storage-meta.json`Matrix 元数据路径；该文件名仅作为旧版迁移的输入。其旧版 JSON 导入计划位于 Matrix 插件设置/doctor 迁移表面。
- Matrix 启动不再扫描、报告或完成旧的 Matrix 文件状态。Matrix 文件检测、旧加密快照创建、房间密钥恢复迁移状态、导入和源移除均由 doctor 拥有。
- Matrix 运行时迁移桶已被移除。旧状态/加密检测和变更助手由 Matrix doctor 直接导入，而不再是运行时 API 表面的一部分。
- Matrix 迁移快照重用标记现在位于 SQLite 插件状态中，而不是 `matrix/migration-snapshot.json` 中；doctor 仍然可以重用相同的经过验证的迁移前归档，而无需写入附属状态文件。
- Nostr 总线游标和配置文件发布状态现在使用共享的 SQLite 插件状态。其遗留 JSON 导入计划位于 Nostr 插件 setup/doctor 迁移界面中。
- Active Memory 会话切换现在使用共享的 SQLite 插件状态，而不是 `session-toggles.json`；重新打开内存会删除该行，而不是重写 JSON 对象。
- Skill Workshop 提案和审查计数器现在使用共享的 SQLite 插件状态，而不是每个工作区的 `skill-workshop/<workspace>.json` 存储。每个提案是 `skill-workshop/proposals` 下的一行，审查计数器是 `skill-workshop/reviews` 下的一行。
- Skill Workshop 审查者子代理运行现在使用运行时会话记录解析器，而不是创建 `skill-workshop/<sessionId>.json` 侧车会话路径。
- ACPX 进程租约现在使用 `acpx/process-leases` 下的共享 SQLite 插件状态，而不是全文件的 `process-leases.json` 注册表。每个租约作为单独的一行存储，在启动时保留了陈旧进程的清理，而无需运行时 JSON 重写路径。
- ACPX 包装脚本和隔离的 Codex 主目录是在 OpenClaw 临时根目录中生成的。它们按需重新创建，并且不是备份或迁移的输入。
- 子代理运行注册表持久化使用类型化的共享 `subagent_runs` 行。旧的 `subagents/runs.json` 路径现在仅作为 doctor 迁移输入，并且运行时辅助名称不再将状态层描述为磁盘支持。运行时测试不再创建无效或空的 `runs.json` 固定装置来证明注册表行为；它们直接种子化/读取 SQLite 行。
- Backup 在归档之前暂存状态目录，复制非数据库文件，使用 `VACUUM INTO` 对 `*.sqlite` 数据库进行快照，省略实时的 WAL/SHM 附加文件，在归档清单中记录快照元数据，并在 SQLite 中使用归档清单记录已完成的备份运行。`openclaw backup
create` validates the written archive by default; `--no-verify` 是
  显式的快速路径。
- `openclaw backup restore` 在提取之前验证归档，复用验证器的标准化清单，并将经过验证的清单资源恢复到其记录的源路径。它需要 `--yes` 进行写入，并支持 `--dry-run`
  作为恢复计划。
- 旧的备份可变路径过滤器已被删除。备份不再需要针对传统会话或 cron JSON/JSONL 文件的 live-tar 跳过列表，因为 SQLite 快照是在创建存档之前暂存的。
- 常规设置和新手引导工作区准备不再创建 `agents/<agentId>/sessions/` 目录。它们仅创建 config/workspace；SQLite 会话行和记录行会根据需要在每个代理的数据库中创建。
- 安全权限修复现在针对全局和每个代理的 SQLite 数据库以及 WAL/SHM 副本，而不是 `sessions.json` 和记录 JSONL 文件。
- 沙箱注册表运行时名称现在直接描述 SQLite 注册表类型，而不是在活动存储中沿用传统 JSON 注册表术语。
- `openclaw reset --scope config+creds+sessions` 移除了每个代理的
  `openclaw-agent.sqlite` 数据库以及 WAL/SHM 副本文件，而不仅仅是遗留的
  `sessions/` 目录。
- Gateway(网关) 聚合会话助手现在使用面向条目的名称：
  Gateway(网关)`loadCombinedSessionEntriesForGateway` 返回 `{ databasePath, entries }`。
  旧的组合存储命名已从运行时调用者中移除。
- Docker MCP 渠道种子现在将会话主行和转录事件
  写入每个代理的 SQLite 数据库，而不是创建
  Docker`sessions.json` 和 JSONL 转录文件。
- 捆绑的会话内存钩子现在通过 `{agentId, sessionId}` 从 SQLite 解析先前会话的上下文。
  它不再扫描、存储或合成转录路径或 `workspace/sessions` 目录。
- 捆绑的 command-logger hook 现在将命令审计行写入共享的
  SQLite `command_log_entries` 表，而不是追加到
  `logs/commands.log`。
- 通道配对允许列表现在在运行时和插件 SDK 中仅公开基于 SQLite 的读/写助手。旧的 `*-allowFrom.json` 路径解析器和
  文件读取器仅存在于 doctor 遗留导入代码中。
- `migration_runs` 记录遗留状态迁移执行情况，包含状态、
  时间戳和 JSON 报告。
- `migration_sources` 记录每个导入的遗留文件源，包含哈希、大小、
  记录数、目标表、运行 ID、状态和源移除状态。
- `backup_runs` 记录备份存档路径、状态和 JSON 清单。
- 全局模式不保留未使用的 `agents` 注册表。在运行时拥有真正的代理记录所有者之前，代理数据库发现是规范的 `agent_databases` 注册表。
- 生成的模型目录配置存储在以代理目录为键的类型化全局 SQLite `agent_model_catalogs` 行中。运行时调用者使用 `ensureOpenClawModelCatalog`；运行时代码中没有 `models.json` 兼容 API。该实现写入 SQLite，并且嵌入式 PI 注册表从该存储的有效负载中填充，而无需创建 `models.json` 文件。
- QMD 会话记录 Markdown 导出和 `memory.qmd.sessions` 配置已被移除。没有 QMD 记录集合，没有 `qmd/sessions*` 运行时路径，也没有文件支持的会话内存桥。
- Memory-core runtime 从 `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts` 导入 SQLite 转录索引辅助程序，而不是从 QMD SDK 子路径导入。QMD 子路径仅保留兼容性重新导出，供外部调用者使用，直到一次主要的 SDK 清理将其移除。
- QMD 自己的 `index.sqlite` 现在是一个临时运行时具体化实现，由主 SQLite `plugin_blob_entries` 表支持。Runtime 不再创建持久的 `~/.openclaw/agents/<agentId>/qmd` 伴随文件。
- 可选的 `memory-lancedb` 插件不再将 `~/.openclaw/memory/lancedb` 创建为隐式的由 OpenClaw 管理的存储。它是一个外部 LanceDB 后端，在操作员配置显式的 `dbPath` 之前保持禁用状态。
- `check:database-first-legacy-stores` 会阻断新的运行时源代码，这些代码将旧版存储名称与写入式文件系统 API 配对使用。它还会阻断重新引入转录桥接契约（如 `transcriptLocator`、`sqlite-transcript://...`、`sessionFile` 或 `storePath`）的运行时源代码，并扫描测试中是否包含这些桥接契约名称。它还禁止 `SessionManager.open(...)` 和旧的静态 SessionManager 外观，以便运行时和测试无法静默重新创建文件支持的会话打开器或文件时代的会话发现。它还禁止从导出 UI 使用旧的会话 JSONL 下载器 hook/class。它还禁止 sidecar 形状的 plugin-state/task SQLite 辅助名称；测试应该断言 `databasePath` 和共享的 `state/openclaw.sqlite` 位置，而不是假装这些功能拥有单独的 SQLite 文件。它还禁止在运行时源代码中使用旧的通用内存索引 SQL 表名称（`meta`、`files`、`chunks`、`chunks_vec`、`chunks_fts`、`embedding_cache`），以便代理数据库保持其显式的 `memory_index_*` 模式。它还禁止嵌入 TEXT 模式和嵌入 JSON 数组写入，以便向量保持紧凑的 SQLite BLOB。迁移、doctor、导入和显式的非会话导出代码仍然允许。防护现在还涵盖运行时 `cache/*.json` 存储、通用 `thread-bindings.json` sidecars、cron 状态/运行日志 JSON、配置健康 JSON、重启和锁定 sidecars、语音唤醒设置、插件绑定批准、已安装插件索引 JSON、文件传输审计 JSONL、Memory Wiki 活动日志、旧的捆绑 `command-logger` 文本日志以及 pi-mono 原始流 JSONL 诊断开关。它还禁止旧的根级 doctor 遗留模块名称，以便兼容性代码保留在 `src/commands/doctor/` 下。Android 调试处理程序也使用 logcat/内存输出，而不是暂存 `camera_debug.log` 或 `debug_logs.txt` 缓存文件。

## 目标架构形态

保持架构显式化。宿主拥有的运行时状态使用类型化表。插件拥有的
不透明状态使用 `plugin_state_entries` / `plugin_blob_entries`；不存在
通用的宿主 `kv` 表。

全局数据库：

```text
state_leases(scope, lease_key, owner, expires_at, heartbeat_at, payload_json, created_at, updated_at)
exec_approvals_config(config_key, raw_json, socket_path, has_socket_token, default_security, default_ask, default_ask_fallback, auto_allow_skills, agent_count, allowlist_count, updated_at_ms)
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
agent_databases(agent_id, path, schema_version, last_seen_at, size_bytes)
task_runs(...)
task_delivery_state(...)
flow_runs(...)
subagent_runs(run_id, child_session_key, requester_session_key, controller_session_key, created_at, ended_at, cleanup_handled, payload_json)
current_conversation_bindings(binding_key, binding_id, target_agent_id, target_session_id, target_session_key, channel, account_id, conversation_kind, parent_conversation_id, conversation_id, target_kind, status, bound_at, expires_at, metadata_json, updated_at)
plugin_binding_approvals(plugin_root, channel, account_id, plugin_id, plugin_name, approved_at)
tui_last_sessions(scope_key, session_key, updated_at)
plugin_state_entries(plugin_id, namespace, entry_key, value_json, created_at, expires_at)
plugin_blob_entries(plugin_id, namespace, entry_key, metadata_json, blob, created_at, expires_at)
media_blobs(subdir, id, content_type, size_bytes, blob, created_at, updated_at)
skill_uploads(upload_id, kind, slug, force, size_bytes, sha256, actual_sha256, received_bytes, archive_blob, created_at, expires_at, committed, committed_at, idempotency_key_hash)
web_push_subscriptions(endpoint_hash, subscription_id, endpoint, p256dh, auth, created_at_ms, updated_at_ms)
web_push_vapid_keys(key_id, public_key, private_key, subject, updated_at_ms)
apns_registrations(node_id, transport, token, relay_handle, send_grant, installation_id, topic, environment, distribution, token_debug_suffix, updated_at_ms)
node_host_config(config_key, version, node_id, token, display_name, gateway_host, gateway_port, gateway_tls, gateway_tls_fingerprint, updated_at_ms)
device_identities(identity_key, device_id, public_key_pem, private_key_pem, created_at_ms, updated_at_ms)
device_auth_tokens(device_id, role, token, scopes_json, updated_at_ms)
macos_port_guardian_records(pid, port, command, mode, timestamp)
workspace_setup_state(workspace_key, workspace_path, version, bootstrap_seeded_at, setup_completed_at, updated_at)
native_hook_relay_bridges(relay_id, pid, hostname, port, token, expires_at_ms, updated_at_ms)
model_capability_cache(provider_id, model_id, name, input_text, input_image, reasoning, supports_tools, context_window, max_tokens, cost_input, cost_output, cost_cache_read, cost_cache_write, updated_at_ms)
agent_model_catalogs(catalog_key, agent_dir, raw_json, updated_at)
managed_outgoing_image_records(attachment_id, session_key, message_id, created_at, updated_at, retention_class, alt, original_media_id, original_media_subdir, original_content_type, original_width, original_height, original_size_bytes, original_filename, record_json)
gateway_restart_sentinel(sentinel_key, version, kind, status, ts, session_key, thread_id, delivery_channel, delivery_to, delivery_account_id, message, continuation_json, doctor_hint, stats_json, payload_json, updated_at_ms)
channel_pairing_requests(channel_key, account_id, request_id, code, created_at, last_seen_at, meta_json)
channel_pairing_allow_entries(channel_key, account_id, entry, sort_order, updated_at)
voicewake_triggers(config_key, position, trigger, updated_at_ms)
voicewake_routing_config(config_key, version, default_target_mode, default_target_agent_id, default_target_session_key, updated_at_ms)
voicewake_routing_routes(config_key, position, trigger, target_mode, target_agent_id, target_session_key, updated_at_ms)
update_check_state(state_key, last_checked_at, last_notified_version, last_notified_tag, last_available_version, last_available_tag, auto_install_id, auto_first_seen_version, auto_first_seen_tag, auto_first_seen_at, auto_last_attempt_version, auto_last_attempt_at, auto_last_success_version, auto_last_success_at, updated_at_ms)
config_health_entries(config_path, last_known_good_json, last_promoted_good_json, last_observed_suspicious_signature, updated_at_ms)
sandbox_registry_entries(registry_kind, container_name, session_key, backend_id, runtime_label, image, created_at_ms, last_used_at_ms, config_label_kind, config_hash, cdp_port, no_vnc_port, entry_json, updated_at)
cron_run_logs(store_key, job_id, seq, ts, status, error, summary, diagnostics_summary, delivery_status, delivery_error, delivered, session_id, session_key, run_id, run_at_ms, duration_ms, next_run_at_ms, model, provider, total_tokens, entry_json, created_at)
cron_jobs(store_key, job_id, name, description, enabled, delete_after_run, created_at_ms, agent_id, session_key, schedule_kind, schedule_expr, schedule_tz, every_ms, anchor_ms, at, stagger_ms, session_target, wake_mode, payload_kind, payload_message, payload_model, payload_fallbacks_json, payload_thinking, payload_timeout_seconds, payload_allow_unsafe_external_content, payload_external_content_source_json, payload_light_context, payload_tools_allow_json, delivery_mode, delivery_channel, delivery_to, delivery_thread_id, delivery_account_id, delivery_best_effort, failure_delivery_mode, failure_delivery_channel, failure_delivery_to, failure_delivery_account_id, failure_alert_disabled, failure_alert_after, failure_alert_channel, failure_alert_to, failure_alert_cooldown_ms, failure_alert_include_skipped, failure_alert_mode, failure_alert_account_id, next_run_at_ms, running_at_ms, last_run_at_ms, last_run_status, last_error, last_duration_ms, consecutive_errors, consecutive_skipped, schedule_error_count, last_delivery_status, last_delivery_error, last_delivered, last_failure_alert_at_ms, job_json, state_json, runtime_updated_at_ms, schedule_identity, sort_order, updated_at)
delivery_queue_entries(queue_name, id, status, entry_kind, session_key, channel, target, account_id, retry_count, last_attempt_at, last_error, recovery_state, platform_send_started_at, entry_json, enqueued_at, updated_at, failed_at)
commitments(id, agent_id, session_key, channel, account_id, recipient_id, thread_id, sender_id, kind, sensitivity, source, status, reason, suggested_text, dedupe_key, confidence, due_earliest_ms, due_latest_ms, due_timezone, source_message_id, source_run_id, created_at_ms, updated_at_ms, attempts, last_attempt_at_ms, sent_at_ms, dismissed_at_ms, snoozed_until_ms, expired_at_ms, record_json)
migration_runs(id, started_at, finished_at, status, report_json)
migration_sources(source_key, migration_kind, source_path, target_table, source_sha256, source_size_bytes, source_record_count, last_run_id, status, imported_at, removed_source, report_json)
backup_runs(id, created_at, archive_path, status, manifest_json)
```

Agent 数据库：

```text
schema_meta(meta_key, role, schema_version, agent_id, app_version, created_at, updated_at)
sessions(session_id, session_key, session_scope, created_at, updated_at, started_at, ended_at, status, chat_type, channel, account_id, primary_conversation_id, model_provider, model, agent_harness_id, parent_session_key, spawned_by, display_name)
conversations(conversation_id, channel, account_id, kind, peer_id, parent_conversation_id, thread_id, native_channel_id, native_direct_user_id, label, metadata_json, created_at, updated_at)
session_conversations(session_id, conversation_id, role, first_seen_at, last_seen_at)
session_routes(session_key, session_id, updated_at)
session_entries(session_id, session_key, entry_json, updated_at)
transcript_events(session_id, seq, event_json, created_at)
transcript_event_identities(session_id, event_id, seq, event_type, has_parent, parent_id, message_idempotency_key, created_at)
transcript_snapshots(session_id, snapshot_id, reason, event_count, created_at, metadata_json)
vfs_entries(namespace, path, kind, content_blob, metadata_json, updated_at)
tool_artifacts(run_id, artifact_id, kind, metadata_json, blob, created_at)
run_artifacts(run_id, path, kind, metadata_json, blob, created_at)
trajectory_runtime_events(session_id, run_id, seq, event_json, created_at)
memory_index_meta(meta_key, schema_version, provider, model, provider_key, sources_json, scope_hash, chunk_tokens, chunk_overlap, vector_dims, fts_tokenizer, config_hash, updated_at)
memory_index_sources(source_kind, source_key, path, session_id, hash, mtime, size)
memory_index_chunks(id, source_kind, source_key, path, session_id, start_line, end_line, hash, model, text, embedding, embedding_dims, updated_at)
memory_embedding_cache(provider, model, provider_key, hash, embedding, dims, updated_at)
cache_entries(scope, key, value_json, blob, expires_at, updated_at)
```

未来的搜索功能可以添加 FTS 表而无需更改规范事件表：

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

大值应使用 `blob` 列，而非 JSON 字符串编码。请将
`value_json` 用于必须能够使用普通 SQLite 工具进行检查的
小型结构化数据。

`agent_databases` 是此分支的规范注册表。在存在真正的代理记录所有者之前，
不要添加 `agents` 表；代理配置保留在
`openclaw.json` 中。

## Doctor 迁移形态

Doctor 应调用一个明确的迁移步骤，该步骤是可报告的且可安全地重新运行：

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` 在常规配置预检后调用状态迁移实现，并在导入前创建已验证的备份。Runtime 启动和 `openclaw migrate` 不得导入旧的 OpenClaw 状态文件。

迁移属性：

- 一次迁移遍历会发现所有旧文件源，并在更改任何内容之前生成一个计划。
- Doctor 在导入旧文件之前会创建一个已验证的预迁移备份归档。
- 导入是幂等的，并由源路径、mtime、大小、哈希和目标表作为键。
- 成功的源文件在目标数据库提交后会被移除或归档。
- 导入失败会保持源文件不变，并在 `migration_runs` 中记录警告。
- Runtime 代码仅在迁移存在后读取 SQLite。
- 不需要降级/导出到运行时文件的路径。

## 迁移清单

将以下内容移入全局数据库：

- 任务注册表运行时写入现在使用共享数据库；未发布的
  `tasks/runs.sqlite` 附属导入器已被删除。快照保存按任务
  id 进行 upsert，并且仅删除缺失的任务/交付行。
- 任务流运行时写入现在使用共享数据库；未发布的
  `tasks/flows/registry.sqlite` 附属导入器已被删除。快照保存
  按流 id 进行 upsert，并且仅删除缺失的流行。
- 插件状态运行时写入现在使用共享数据库；未发布的
  `plugin-state/state.sqlite` 附属导入器已被删除。
- 内置内存搜索不再默认为 `memory/<agentId>.sqlite`；其
  索引表驻留在所属代理数据库中，显式的
  `memorySearch.store.path` 附属选择加入已移至 doctor 配置
  迁移。
- 内置的内存重新索引仅重置代理数据库中内存拥有的表。
  它不得替换整个 SQLite 文件，因为同一个数据库拥有
  会话、转录、VFS 行、工件和运行时缓存。
- 来自单体和分片 JSON 的沙箱容器/浏览器注册表。运行时
  写入现在使用共享数据库；保留了旧版 JSON 导入。
- Cron 作业定义、调度状态和运行历史现在使用共享 SQLite；
  doctor 导入/删除旧版 `jobs.json`、`jobs-state.json` 和
  `cron/runs/*.jsonl` 文件
- 设备身份/认证、推送、更新检查、承诺、OpenRouter 模型
  缓存、已安装插件索引和应用服务器绑定
- 设备/节点配对和引导记录现在使用类型化的 SQLite 表
- 设备配对通知订阅者和已投递请求标记现在使用
  共享的 SQLite plugin-state 表，而不是 `device-pair-notify.json`。
- 语音通话记录现在使用共享的 SQLite plugin-state 表，位于
  `voice-call` / `calls` 命名空间下，而不是 `calls.jsonl`；插件 CLI
  监控并汇总 SQLite 支持的通话历史。
- QQBot 网关会话、已知用户记录和引用索引引用缓存现在使用
  `qqbot` 命名空间下的 SQLite 插件状态（`sessions`、`known-users`、
  `ref-index`），而不是 `session-*.json`、`known-users.json` 和
  `ref-index.jsonl`；QQBot doctor/setup 迁移会导入并删除
  旧文件。
- Discord 模型选择器首选项、命令部署哈希和线程绑定现在使用 Discord`discord` 命名空间下的 SQLite 插件状态（`model-picker-preferences`、`command-deploy-hashes`、`thread-bindings`）来代替 `model-picker-preferences.json`、`command-deploy-cache.json` 和 `thread-bindings.json`Discord；Discord 的 doctor/setup 迁移会导入并删除这些旧文件。
- BlueBubbles 追赶游标和入站去重标记现在使用 SQLite 插件状态在 BlueBubbles`bluebubbles` 命名空间 (`catchup-cursors`, `inbound-dedupe`) 下，而不是 `bluebubbles/catchup/*.json` 和 `bluebubbles/inbound-dedupe/*.json`BlueBubbles；BlueBubbles doctor/setup 迁移会导入并删除旧文件。
- Telegram 更新偏移量、贴纸缓存条目、回复链消息缓存条目、已发送消息缓存条目、主题名称缓存条目和线程绑定现在在 `telegram` 命名空间（`update-offsets`、`sticker-cache`、`message-cache`、`sent-messages`、`topic-names`、`thread-bindings`）下使用 SQLite 插件状态，而不是 `update-offset-*.json`、`sticker-cache.json`、`*.telegram-messages.json`、`*.telegram-sent-messages.json`、`*.telegram-topic-names.json` 和 `thread-bindings-*.json`；Telegram doctor/setup 迁移会导入并删除旧文件。
- iMessage 追赶游标、回复短 ID 映射和发送回显去重行现在使用 `imessage` 命名空间（`catchup-cursors`、`reply-cache`、`sent-echoes`）下的 SQLite 插件状态，而不是 `imessage/catchup/*.json`、`imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl`；iMessage doctor/setup 迁移会导入并删除旧文件。
- Microsoft Teams 的对话、投票、委托令牌、待处理上传和反馈学习现在使用 SQLite 插件状态/blob 命名空间 (Microsoft Teams`conversations`, `polls`, `delegated-tokens`, `pending-uploads`, `feedback-learnings`) 代替 `msteams-conversations.json`, `msteams-polls.json`, `msteams-delegated.json`, `msteams-pending-uploads.json` 和 `*.learnings.json`Microsoft Teams；Microsoft Teams 的 doctor/setup 迁移会导入并删除旧文件。
- Matrix 同步缓存、存储元数据、线程绑定、入站去重标记、启动验证冷却状态、凭据、恢复密钥和 SDK IndexedDB 加密快照现在使用 Matrix`matrix` 下的 SQLite 插件状态/ blob 命名空间（`sync-store`、`storage-meta`、`thread-bindings`、`inbound-dedupe`、`startup-verification`、`credentials`、`recovery-key`、`idb-snapshots`），而不是 `bot-storage.json`、`storage-meta.json`、`thread-bindings.json`、`inbound-dedupe.json`、`startup-verification.json`、`credentials.json`、`recovery-key.json` 和 `crypto-idb-snapshot.json`MatrixMatrix；Matrix 医生/设置迁移会从账户范围的 Matrix 存储根目录中导入并删除这些旧文件。
- Nostr 总线游标和资料发布状态现在使用 Nostr`nostr` 命名空间（`bus-state`，`profile-state`）下的 SQLite 插件状态，而不是 `bus-state-*.json` 和 `profile-state-*.json`Nostr；Nostr 医生/设置迁移会导入并删除旧文件。
- Active Memory 会话切换现在使用 `active-memory/session-toggles` 下的 SQLite 插件状态，而不是 `session-toggles.json`。
- Skill Workshop 提案队列和审查计数器现在使用 `skill-workshop/proposals` 和 `skill-workshop/reviews` 下的 SQLite 插件状态，而不是每个工作区的 `skill-workshop/<workspace>.json` 文件。
- 出站传递和会话传递队列现在在单独的队列名称（`outbound-delivery`、`session-delivery`）下共享全局 SQLite `delivery_queue_entries` 表，而不是使用持久的 `delivery-queue/*.json`、`delivery-queue/failed/*.json` 和 `session-delivery-queue/*.json` 文件。doctor legacy-state 步骤导入待处理和失败的行，移除陈旧的已传递标记，并在导入后删除旧的 JSON 文件。热路由和重试字段是类型化列；JSON 载荷仅保留用于重放/调试。
- ACPX 进程租约现在在 `acpx/process-leases` 下使用 SQLite 插件状态，而不是 `process-leases.json`。
- 备份和迁移运行元数据

将这些移动到代理数据库中：

- Agent 会话根目录和兼容性会话条目负载。运行时写入已完成：热会话元数据可在 `sessions` 中查询，而旧形状的完整 `SessionEntry` 负载保留在 `session_entries` 中。
- Agent 脚本事件。运行时写入已完成。
- 压缩检查点和脚本快照。运行时写入已完成：检查点脚本副本是 SQLite 脚本行，检查点元数据记录在 `transcript_snapshots` 中。Gateway(网关) 检查点辅助程序现在将这些值命名为脚本快照而不是源文件。
- Agent VFS scratch/工作区命名空间。运行时 VFS 写入已完成。
- Subagent 附件负载。运行时写入已完成：它们是 SQLite VFS 种子条目，从来不是持久的工作区文件。
- 工具工件。运行时写入已完成。
- 运行产物。已通过每个代理的
  `run_artifacts` 表完成运行时写入。
- 代理本地运行时缓存。已通过每个代理的 `cache_entries` 表完成运行时范围的缓存写入。
  Gateway(网关) 范围的模型缓存保留在全局数据库中，除非它们变为代理特定的。
- ACP 父流日志。已针对运行时写入完成。
- ACP 重放账本会话。已通过
  `acp_replay_sessions` 和 `acp_replay_events` 完成运行时写入；遗留的 `acp/event-ledger.json`
  仅保留作为医生输入。
- 当它们不是显式导出文件时的轨迹侧车。运行时写入已完成：轨迹捕获写入 agent-database `trajectory_runtime_events`
  行并将运行范围的工件镜像到 SQLite。旧的侧车仅作为 doctor 导入输入；导出可以生成新的 JSONL 支持包输出
  但不会在运行时读取或迁移旧的轨迹/转录侧车。
  运行时轨迹捕获公开 SQLite 范围；JSONL 路径辅助函数
  隔离在导出/调试支持中，并且不会从运行时模块重新导出。
  嵌入式运行器轨迹元数据记录 `{agentId, sessionId, sessionKey}`
  标识，而不是持久化转录定位符。

暂时保持这些文件为文件后备：

- `openclaw.json`
- 提供商或 CLI 凭证文件
- 插件/包清单
- 选择磁盘模式时的用户工作区和 Git 仓库
- 除非特定的日志界面被移动，否则用于操作员跟踪的日志

## 迁移计划

### 阶段 0：冻结边界

在移动更多行之前，明确持久化状态的边界：

- 向全局数据库添加一个 `migration_runs` 表。
  已完成，用于遗留状态迁移执行报告。
- 为文件到数据库的导入添加一个单一的所有权归 doctor 的状态迁移服务。
  已完成：`openclaw doctor --fix` 使用遗留状态迁移实现。
- 使 `plan` 变为只读，并使 `apply` 创建备份、导入、验证，
  然后删除或隔离旧文件。
  已完成：doctor 创建一个验证过的迁移前备份，将备份路径传递
  给 `migration_runs`，并复用导入器/移除路径。
- 添加静态禁令，以便新的运行时代码无法写入旧版状态文件，同时迁移代码和测试仍可以填充/读取它们。
  目前已针对已迁移的旧版存储完成此操作；该守卫还会扫描嵌套测试以查找禁止的运行时转录定位器合约。

### 阶段 1：完成全局控制平面

将共享协调状态保留在 `state/openclaw.sqlite` 中：

- 代理和代理数据库注册表
- 任务和任务流账本
- 插件状态
- 沙箱容器/浏览器注册表
- Cron/调度器运行历史
- 配对、设备、推送、更新检查、TUI、OpenRouter/模型缓存以及其他
  小型网关范围的运行时状态
- 备份和迁移元数据
- Gateway(网关) 媒体附件字节。运行时写入已完成；直接文件路径是为了与渠道发送器和沙盒暂存区兼容而临时实现的。运行时允许列表接受 SQLite 物化路径，而不是旧的状态/配置媒体根目录。Doctor 会将旧媒体文件导入 Gateway(网关)`media_blobs`，并在成功写入行后删除源文件。
- 调试代理捕获会话、事件和负载 Blob。已完成：通过共享状态 DB 引导、schema、WAL 和 busy-timeout 设置，在共享状态 DB 中实时捕获并打开。不存在调试代理运行时 sidecar DB 覆盖、blob 目录或仅代理捕获生成的 schema/codegen 目标。

此阶段还从这些子系统中删除重复的 sidecar 打开器、权限助手、WAL 设置、文件系统修剪和兼容性写入器。

### 阶段 2：引入 Per-Agent 数据库

为每个代理创建一个数据库，并从全局数据库注册它：

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

全局 `agent_databases` 行存储路径、架构版本、最后出现的时间戳以及基本的大小/完整性元数据。运行时代码向注册表请求代理数据库，而不是直接推导文件路径。

代理数据库拥有：

- `sessions` 作为规范的会话根，`session_entries` 作为附加到该根的兼容性负载表，以及
  `session_routes` 作为唯一的活跃 `session_key` 查找
- `conversations` 和 `session_conversations` 作为附加到会话的规范化提供商
  路由身份
- `transcript_events`
- 转录快照和压缩检查点。运行时写入已完成。
- `vfs_entries`
- `tool_artifacts` 和运行产物
- 代理本地的运行时/缓存行。已完成 worker 作用域缓存。
- ACP 父流事件
- 非显式导出产物时的轨迹运行时事件

### 阶段 3：替换会话存储 API

运行时已完成。文件形式的会话存储表面不是活动的运行时契约：

- 运行时不再调用 `loadSessionStore(storePath)` 或将 `storePath` 视为
  会话身份。
- 运行时行操作为 `getSessionEntry`、`upsertSessionEntry`、
  `patchSessionEntry`、`deleteSessionEntry` 和 `listSessionEntries`。
- 全存储重写助手、文件写入器、队列测试、别名修剪和
  旧键删除参数已从运行时中移除。
- 已弃用的根包兼容性导出仍将规范 `sessions.json` 路径适配到 SQLite 行 API。
- `sessions.json` 解析仅保留在 doctor 迁移/导入代码和 doctor 测试中。
- 运行时生命周期回退读取的是 SQLite 转录头，而不是 JSONL 首行。

继续删除任何重新引入文件锁参数、修剪/截断即文件维护术语、存储路径标识或其唯一断言是 JSON 持久性的测试的内容。

### 阶段 4：迁移转录、ACP 流、轨迹和 VFS

使每个代理数据流都基于数据库：

- Transcript 追加写入通过一个 SQLite 事务进行，该事务确保
  会话标头，检查消息幂等性，选择父尾部，插入到
  `transcript_events`，并在 `transcript_event_identities` 中
  记录可查询的身份元数据。这适用于直接的 transcript 消息追加和
  普通的持久化 `TranscriptSessionManager` 追加；显式分支
  操作保留其显式父选择，并仍然写入 SQLite 行
  而不派生任何文件定位符。
- ACP 父流日志变为行，而不是 `.acp-stream.jsonl` 文件。完成。
- ACP 生成设置不再持久化 transcript JSONL 路径。完成。
- 运行时轨迹捕获直接写入事件行/工件。显式
  支持/导出命令仍然可以生成支持包 JSONL 工件作为
  导出格式，但会话导出不会重新创建会话 JSONL。完成。
- 配置为磁盘模式时，磁盘工作区保留在磁盘上。
- VFS 草稿和仅限 VFS 的实验性工作区模式使用代理数据库。

迁移将一次导入旧的 JSONL 文件，在 `migration_runs` 中记录计数/哈希值，并在完整性检查后删除已导入的文件。

### 第 5 阶段：备份、恢复、压缩和验证

备份保持为一个归档文件：

- 对每个全局和代理数据库执行检查点操作。
- 使用 SQLite 备份语义或 `VACUUM INTO` 对每个数据库进行快照。
- 将压缩后的数据库快照、配置、外部凭据和请求的工作区导出内容进行归档。
- 省略原始的实时 `*.sqlite-wal` 和 `*.sqlite-shm` 文件。
- 通过打开每个数据库快照并运行 `PRAGMA integrity_check` 来进行验证。
  `openclaw backup create` 默认执行此存档验证；
  `--no-verify` 仅跳过写入后存档过程，而不跳过快照
  创建完整性检查。
- Restore 会将快照复制回其目标路径。此分支将
  未发布的 SQLite 布局重置为 `user_version = 1`；未来的已发布架构更改
  可以在需要时添加显式迁移。

### 第 6 阶段：Worker 运行时

在数据库拆分落地期间，将 Worker 模式保持为实验性：

- Workers 接收代理 ID、运行 ID、文件系统模式和 DB 注册表标识。
- 每个 Worker 打开自己的 SQLite 连接。
- 父进程保留渠道投递、审批、配置和取消权限。
- 首先从每个活动运行一个 Worker 开始；仅在生命周期和 DB
  连接所有权稳定后再添加池化。

### 阶段 7：删除旧世界

运行时会话管理已完成。旧世界仅允许作为明确的医生输入或支持/导出输出使用：

- 没有运行时 `sessions.json`、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite 写入。
- 没有 JSON/会话文件修剪、文件转录截断、会话文件锁定或锁形式的会话测试。
- 没有以保持旧会话文件为最新为目的的运行时兼容性导出。
- 明确的支持导出保留为用户请求的归档/物化格式，且不得将文件名反馈给运行时标识。

## 备份与恢复

备份应该是一个归档文件，但数据库捕获应该是原生的 SQLite 格式：

1. 停止长时间运行的写入活动或进入简短的备份屏障。
2. 对于每个全局和代理数据库，运行一个检查点。
3. 使用 SQLite 备份语义或 `VACUUM INTO` 将每个数据库快照到
   临时备份目录。
4. 归档压缩后的数据库快照、配置文件、凭据目录、
   选定的工作区以及清单文件。
5. 通过打开每个包含的 SQLite 快照并运行
   `PRAGMA integrity_check` 来验证归档。
   `openclaw backup create` 默认执行此操作；`--no-verify` 仅用于
   故意跳过写入后归档传递。

不要依赖原始的实时 `*.sqlite`、`*.sqlite-wal` 和 `*.sqlite-shm` 副本作为
主要备份格式。归档清单应记录数据库角色、
代理 ID、架构版本、源路径、快照路径、字节大小和完整性
状态。

还原应从归档快照重建全局数据库和代理数据库文件。由于 SQLite 布局尚未发布，此重构仅保留 version-1 架构以及 doctor 文件到数据库的导入。还原命令首先验证归档，然后从验证后的提取负载中替换每个清单资源。

## 运行时重构计划

1. 添加数据库注册表 API。
   - 解析全局数据库和每个代理数据库的路径。
   - 将未发布的架构保留在 `user_version = 1`；直到已发布的架构需要时，再添加架构迁移运行器代码。
   - 添加测试、备份和 doctor 使用的关闭/检查点/完整性辅助工具。

2. 合并附属 SQLite 存储。
   - 将插件状态表移至全局数据库。运行时写入已完成；未发布的遗留附属导入器已删除。
   - 将任务注册表移动到全局数据库中。运行时写入已完成；未发布的旧版 sidecar 导入器已删除。
   - 将任务流 (Task Flow) 表移动到全局数据库中。运行时写入已完成；未发布的旧版 sidecar 导入器已删除。
   - 将内置内存搜索表移动到每个代理数据库中。已完成；显式自定义 `memorySearch.store.path` 现已通过 doctor 配置迁移删除。完整的重新索引直接针对内存表运行；旧的整文件交换路径和 sidecar 索引交换辅助程序已删除。
   - 从这些子系统中删除重复的数据库打开器、WAL 设置、权限辅助程序和关闭路径。

3. 将代理拥有的表移动到每个代理的数据库中。
   - 通过全局数据库注册表按需创建代理数据库。已完成。
   - 将运行时会话条目、记录事件、VFS 行和工具工件移动到代理数据库。已完成。
   - 不要迁移分支本地共享数据库会话条目、转录事件、
     VFS 行或工具工件；该布局从未发布。仅在 doctor 中保留
     传统的文件到数据库导入。

4. 替换会话存储 API。
   - 移除 `storePath` 作为运行时身份。此变更已在运行时完成并由 `check:database-first-legacy-stores` 守护：会话元数据、路由更新、命令持久化、CLI 会话清理、飞书推理预览、转录状态持久化、子代理深度、认证配置文件会话覆盖、父分支逻辑以及 QA 实验室检查现在都通过规范的代理/会话键来解析数据库。Gateway(网关)/TUI/UI/macOS 会话列表响应现在公开 `databasePath` 而非旧版 `path`；macOS 调试表面将每个代理的数据库显示为只读状态，而不是写入 `session.store` 配置。`/status`、聊天驱动的轨迹导出和 CLI 依赖代理不再传播旧版存储路径；转录使用回退通过代理/会话身份读取 SQLite。运行时和桥接测试不再公开 `storePath`；doctor/migration 输入拥有该旧版字段名称。Gateway(网关) 组合会话加载不再为非模板化的 `session.store` 值拥有特殊的运行时分支；它聚合每个代理的 SQLite 行。旧版会话锁 doctor 车道及其 `.jsonl.lock` 清理助手已被移除；SQLite 现在是会话并发边界。热点运行时调用站点使用面向行的辅助名称，例如 `resolveSessionRowEntry`；旧的 `resolveSessionStoreEntry` 兼容别名已从运行时和插件 SDK 导出中移除。

- 使用 `{ agentId, sessionKey }` 行操作。
  已完成：`getSessionEntry`、`upsertSessionEntry`、`deleteSessionEntry`、
  `patchSessionEntry` 和 `listSessionEntries` 是 SQLite 优先的 API，不
  需要会话存储路径。状态摘要、本地代理状态、健康状况
  和 `openclaw sessions` 列出命令现在直接读取每个代理的行，
  并显示每个代理的 SQLite 数据库路径，而不是 `sessions.json` 路径。
- 用 `upsertSessionEntry`、
  `deleteSessionEntry`、`listSessionEntries` 和 SQL 清理查询替换全存储的删除/插入操作。
  运行时已完成：热路径现在使用行 API 和冲突重试的行补丁；
  剩余的全存储导入/替换辅助函数仅限于迁移导入
  代码和 SQLite 后端测试。
  - 删除 `store-writer.ts` 和 writer-queue 测试。已完成。
  - 从会话行 upserts/patches 中删除运行时 legacy-key pruning 和 alias-delete 参数。已完成。

5. 删除运行时 JSON 注册表行为。
   - 使沙箱注册表读写仅限 SQLite。已完成。
   - 仅从迁移步骤导入整体和分片 JSON。已完成。
   - 移除分片注册表锁和 JSON 写入。已完成。

- 如果结构保持为热路径操作状态，则保留一个类型化注册表表，而不是将注册表行存储为通用不透明 JSON。已完成。

6. 删除文件锁形式的会话变更。
   - 运行时锁创建和运行时锁 API 已完成。
   - 独立的旧版 `.jsonl.lock` doctor 清理通道已移除。
   - `session.writeLock` 是经过 doctor 迁移的旧版配置，而不是类型化的运行时设置。
   - 状态完整性不再具有单独的孤立转录文件修剪路径；doctor 迁移在一处导入/移除旧的 JSONL 源。
   - Gateway(网关) 单例协调在 `gateway_locks` 下使用类型化的 SQLite Gateway(网关)`state_leases` 行，并且不再暴露文件锁目录接缝。
   - 通用插件 SDK 去重持久化不再使用文件锁或 JSON 文件；它写入共享的 SQLite 插件状态行。完成。
   - QMD 嵌入协调使用 SQLite 状态租约而不是 `qmd/embed.lock`。完成。

7. 让 worker 具备数据库感知能力。
   - Worker 打开它们自己的 SQLite 连接。
   - Parent 拥有传递、渠道回调和配置。
   - Worker 接收代理 ID、运行 ID、文件系统模式和 DB 注册表标识，而不是实时句柄。
   - `vfs-only` 保持实验性，并使用代理数据库作为其存储根。
   - 首先保持每个活动运行一个工作线程。连接池可以等到数据库连接
     生命周期和取消行为变得不再复杂时再考虑。

8. 备份集成。
   - 通过 SQLite 备份或 `VACUUM INTO` 教会备份程序对全局和代理数据库进行快照。
     对于状态资源下发现的 `*.sqlite` 文件已完成。
   - 添加针对 SQLite 完整性和架构版本的备份验证。对于
     备份创建和默认存档验证完整性检查已完成。
   - 在 SQLite 中记录备份运行元数据。通过共享的 `backup_runs`
     表完成，包含存档路径、状态和清单 JSON。
   - 添加从已验证的存档快照恢复的功能。已完成：`openclaw backup
restore` 在提取前进行验证，使用验证器的标准化
     清单，支持 `--dry-run`，并且在替换
     记录的源路径之前需要 `--yes`。
   - 仅在请求时包含 VFS/工作区导出；不要将会话内部导出为 JSON 或 JSONL。

9. 删除过时的测试和代码。对于已知的运行时会话接口已完成。

- 移除断言运行时创建 `sessions.json` 或转录 JSONL 文件的测试。核心会话存储、聊天、Gateway（网关）转录事件、预览、生命周期、命令会话条目更新、自动回复重置/跟踪以及 memory-core dreaming fixtures、审批目标路由、会话转录修复、安全权限修复、轨迹导出和会话导出均已完成此操作。Active-memory 转录测试现在断言 SQLite 范围，并且不创建临时或持久化的 JSONL 文件。旧的 heartbeat transcript-pruning 回归测试已被移除，因为运行时不再截断 JSONL 转录。Agent 会话-list 工具测试不再将旧的 `sessions.json` 路径建模为 Gateway（网关）响应形状；app/UI/macOS 测试使用 `databasePath`。`/status` 转录使用测试现在直接植入 SQLite 转录行，而不是写入 JSONL 文件。Gateway(网关) 会话生命周期测试现在直接使用 SQLite 转录植入助手；旧的单行会话文件 fixture 形状已从重置和删除覆盖范围中消失。`sessions.delete` 不再返回文件时代的 `archived: []` 字段；删除操作仅报告行变更结果。旧的 `deleteTranscript` 选项也已消失：删除会话会移除规范的 `sessions` 根，并让 SQLite 级联删除会话拥有的转录、快照和轨迹行，因此调用者不会留下转录孤立行或忘记清理分支。Context-engine 轨迹捕获测试现在从独立的代理数据库读取 `trajectory_runtime_events` 行，而不是读取 `session.trajectory.jsonl`。Docker MCP 渠道种子脚本现在直接植入 SQLite 行。直接的 `sessions.json`Gateway(网关) 写入仅限于 doctor fixtures。工具搜索 Gateway（网关） E2E 从 SQLite 转录行读取工具调用证据，而不是扫描 `agents/<agentId>/sessions/*.jsonl` 文件。Memory-core 主机事件和会话语料库临时行现在存在于共享的 SQLite 插件状态中；`events.jsonl` 和 `session-corpus/*.txt` 仅作为旧版 doctor 迁移输入。活动行使用 `memory/session-ingestion/` 虚拟路径，而不是 `.dreams/session-corpus`。旧的 memory-core dreaming 修复模块及其 CLI/Gateway(网关) 测试已被移除，因为运行时不再拥有该语料库的文件归档修复功能。Memory-core bridge/public-artifact 测试不再显示 `.dreams/events.jsonl`；它们使用 SQLite 支持的虚拟 JSON 工件名称。公共 SDK/Codex 测试文档现在说的是 SQLite 会话状态而不是会话文件，并且 渠道-turn 示例不再暴露 `storePath` 参数。Matrix 同步状态现在直接使用 SQLite 插件状态存储。活动客户端/运行时合约传递帐户存储根，而不是 `bot-storage.json` 路径，并且 doctor 在删除源之前将旧的 `bot-storage.json` 导入 SQLite。QA Matrix 重启/破坏性场景现在直接变更 SQLite 同步行，而不是创建或删除假的 `bot-storage.json` 文件，并且 E2EE 基板传递同步存储根而不是假的 `sync-store.json` 路径。Matrix 存储根选择不再通过旧版同步/线程 JSON 文件对根进行评分；它使用持久根元数据和真实的加密状态。运行时 SQLite 会话后端测试套件不再伪造 `sessions.json`；旧的源 fixtures 现在位于导入它们的 doctor 测试中。Gateway(网关) 会话测试不再暴露 `createSessionStoreDir` 助手或未使用的临时会话存储路径设置；fixture 目录是显式的，直接行设置使用 SQLite 会话行命名。仅限 Doctor 的 JSON5 会话存储解析器覆盖范围已从基础结构测试移至 doctor 迁移测试，因此运行时测试套件不再拥有旧版会话文件解析。Microsoft Teams 运行时 SSO/待定上传测试不再携带 JSON sidecar fixtures 或解析器；旧的 SSO 令牌解析仅存在于插件迁移模块中。Telegram 测试不再植入假的 `/tmp/*.json` 存储路径；它们直接重置 SQLite 支持的消息缓存。通用 OpenClaw 测试状态助手不再暴露旧的 `auth-profiles.json` 写入器；doctor 身份迁移测试在本地拥有该 fixture。TUI 上次会话指针、执行审批、active-memory 切换、Matrix 去重/启动验证、Memory Wiki 源同步、当前对话绑定、新手引导身份验证和 Hermes 密钥导入的运行时测试不再制造旧的 sidecar 文件或断言旧文件名不存在。它们通过 SQLite 行和公共存储 API 证明行为；doctor/迁移测试是旧版源文件名唯一存在的地方。设备/节点配对、渠道 allowFrom、重启意图、重启切换、会话传递队列条目、配置运行状况、iMessage 缓存、cron 作业、PI 转录头、子代理注册表和托管图像附件的运行时测试也不再创建已退役的 JSON/JSONL 文件只是为了证明它们被忽略或不存在。PI 溢出恢复不再具有 SessionManager 重写/截断回退：工具结果截断和 context-engine 转录重写变更 SQLite 转录行，然后从数据库刷新活动提示状态。持久化的 SessionManager 消息追加委托给原子 SQLite 转录追加助手以进行父选择和幂等性。常规元数据/自定义条目追加也在 SQLite 内部选择当前父级，因此过时的管理器实例不会复活 pre-SQLite 父链竞争。用于中间轮预检查和 `sessions_yield` 的合成 PI 尾部清理现在直接修剪 SQLite 转录状态；旧的 SessionManager 尾部移除桥接及其测试已被删除。压缩检查点捕获也仅从 SQLite 获取快照；调用者不再传递活动的 SessionManager 作为备用转录源。
- 保留仅为迁移而填充遗留文件的测试。
- 活跃运行时表面的 JSON 文件证明已替换为 SQL 行证明。

- 为向遗留会话/缓存 JSON 路径进行运行时写入添加静态禁止。仓库守卫已完成。

10. 使迁移报告可审计。
    - 在 SQLite 中记录迁移运行，包括开始/完成时间戳、源路径、源哈希、计数、警告和备份路径。完成：遗留状态迁移执行现在会持久化一个 `migration_runs` 报告，其中包含源路径/表清单、源文件 SHA-256、大小、记录计数、警告和备份路径。完成：遗留状态迁移执行还会持久化 `migration_sources` 行，用于源级审计以及未来的跳过/回填决策。
    - 使应用具有幂等性。在部分导入后重新运行应跳过
      已导入的源或通过稳定键进行合并。
      完成：会话索引、transcripts、传递队列、插件状态、任务
      分类账和 agent 拥有的全局 SQLite 行通过稳定键或
      upsert/replace 语义导入，因此重新运行会合并而不会重复持久化
      行。
    - 导入失败必须保持原始源文件原封不动。
      完成：失败的 transcripts 导入现在会将原始 JSONL 源保留在
      其检测到的路径，并且 `migration_sources` 将源记录为
      `warning` 并带有 `removed_source=0` 以供下一次 doctor 运行使用。

## 性能规则

- 每个线程/进程使用一个连接是可以的；不要跨
  workers 共享句柄。
- 使用 WAL、`foreign_keys=ON`、30 秒的忙超时以及简短的 `BEGIN IMMEDIATE`
  写入事务。
- 保持写入事务辅助函数同步，除非异步事务 API 添加了显式的互斥/背压语义。
- 保持父级交付写入小规模且事务性。
- 避免全存储重写；使用行级 upsert/delete。
- 在移动热代码之前，为按代理列表、按会话列表、更新时间、运行 ID 和过期路径添加索引。
- 将大型工件、媒体和向量存储为 BLOB 或分块 BLOB 行，而不是 base64 或数字数组 JSON。
- 保持不透明的插件状态条目小规模且作用域限定。
- 添加 SQL 清理以处理 TTL/过期，而不是文件系统修剪。
  对于数据库拥有的运行时存储已完成：媒体、插件状态、插件 blob、
  持久去重和代理缓存均通过 SQLite 行过期。剩余的
  文件系统清理仅限于临时具体化或显式移除命令。

## 静态禁止项

添加一个仓库检查，禁止向旧版状态路径进行新的运行时写入：

- `sessions.json`
- `*.trajectory.jsonl`，具体化的 support-bundle 输出除外
- `.acp-stream.jsonl`
- `acp/event-ledger.json`
- `cache/*.json` 运行时缓存文件
- `agents/<agentId>/agent/auth.json`
- `agents/<agentId>/agent/models.json`
- `credentials/oauth.json`
- `github-copilot.token.json`
- `openrouter-models.json`
- `auth-profiles.json`
- `auth-state.json`
- `exec-approvals.json`
- `workspace-state.json`
- Matrix Matrix`credentials*.json` 和 `recovery-key.json`
- `cron/runs/*.jsonl`
- `cron/jobs.json`
- `jobs-state.json`
- `device-pair-notify.json`
- `devices/pending.json`
- `devices/paired.json`
- `devices/bootstrap.json`
- `nodes/pending.json`
- `nodes/paired.json`
- `identity/device.json`
- `identity/device-auth.json`
- `push/web-push-subscriptions.json`
- `push/vapid-keys.json`
- `push/apns-registrations.json`
- `process-leases.json`
- `gateway-instance-id`
- `session-toggles.json`
- 核心内存 `.dreams/events.jsonl`
- 核心内存 `.dreams/session-corpus/`
- 核心内存 `.dreams/daily-ingestion.json`
- 核心内存 `.dreams/session-ingestion.json`
- 核心内存 `.dreams/short-term-recall.json`
- 核心内存 `.dreams/phase-signals.json`
- 核心内存 `.dreams/short-term-promotion.lock`
- 技能工坊 `skill-workshop/<workspace>.json`
- 技能工作坊 `skill-workshop/skill-workshop-review-*.json`
- Nostr Nostr`bus-state-*.json`
- Nostr Nostr`profile-state-*.json`
- `calls.jsonl`
- `known-users.json`
- `ref-index.jsonl`
- QQBot `session-*.json`
- BlueBubbles BlueBubbles`bluebubbles/catchup/*.json`
- BlueBubbles BlueBubbles`bluebubbles/inbound-dedupe/*.json`
- Telegram Telegram`update-offset-*.json`
- Telegram Telegram`sticker-cache.json`
- Telegram Telegram`*.telegram-messages.json`
- Telegram Telegram`*.telegram-sent-messages.json`
- Telegram Telegram`*.telegram-topic-names.json`
- Telegram Telegram`thread-bindings-*.json`
- iMessage iMessage`catchup/*.json`
- iMessage iMessage`reply-cache.jsonl`
- iMessage iMessage`sent-echoes.jsonl`
- Microsoft Teams Microsoft Teams`msteams-conversations.json`
- Microsoft Teams Microsoft Teams`msteams-polls.json`
- Microsoft Teams Microsoft Teams`msteams-sso-tokens.json`
- Microsoft Teams Microsoft Teams`msteams-delegated.json`
- Microsoft Teams Microsoft Teams`msteams-pending-uploads.json`
- Microsoft Teams Microsoft Teams`*.learnings.json`
- Matrix Matrix`bot-storage.json`
- Matrix Matrix`sync-store.json`
- Matrix Matrix`thread-bindings.json`
- Matrix Matrix`inbound-dedupe.json`
- Matrix Matrix`startup-verification.json`
- Matrix Matrix`storage-meta.json`
- Matrix Matrix`crypto-idb-snapshot.json`
- Discord Discord`model-picker-preferences.json`
- Discord Discord`command-deploy-cache.json`
- 沙箱注册表分片 JSON 文件
- 原生 hook 中继 `/tmp` 网桥 JSON 文件
- `plugin-state/state.sqlite`
- 临时的 `openclaw-state.sqlite` 运行时边车
- `tasks/runs.sqlite`
- `tasks/flows/registry.sqlite`
- `bindings/current-conversations.json`
- `restart-sentinel.json`
- `gateway-restart-intent.json`
- `gateway-supervisor-restart-handoff.json`
- `gateway.<hash>.lock`
- `qmd/embed.lock`
- `commands.log`
- `config-health.json`
- `port-guard.json`
- `settings/voicewake.json`
- `settings/voicewake-routing.json`
- `plugin-binding-approvals.json`
- `plugins/installs.json`
- `audit/file-transfer.jsonl`
- `audit/crestodian.jsonl`
- `crestodian/rescue-pending/*.json`
- `plugins/phone-control/armed.json`
- 记忆百科 `.openclaw-wiki/log.jsonl`
- 记忆百科 `.openclaw-wiki/state.json`
- 记忆百科 `.openclaw-wiki/locks/`
- 记忆百科 `.openclaw-wiki/source-sync.json`
- 记忆百科 `.openclaw-wiki/import-runs/*.json`
- 记忆百科 `.openclaw-wiki/cache/agent-digest.json`
- 记忆百科 `.openclaw-wiki/cache/claims.jsonl`
- ClawHub ClawHub`.clawhub/lock.json`
- ClawHub ClawHub`.clawhub/origin.json`
- 浏览器配置文件装饰 `.openclaw-profile-decorated`
- `SessionManager.open(...)` 文件支持的会话打开器
- `SessionManager.listAll(...)` 和 `TranscriptSessionManager.listAll(...)`
  副本列表外观
- `SessionManager.forkFromSession(...)` 和
  `TranscriptSessionManager.forkFromSession(...)` 副本分叉外观
- `SessionManager.newSession(...)` 和 `TranscriptSessionManager.newSession(...)`
  可变会话替换外观
- `SessionManager.createBranchedSession(...)` 和
  `TranscriptSessionManager.createBranchedSession(...)` 分支会话外观

该禁令应允许测试创建遗留装置，并允许迁移代码
读取/导入/删除遗留文件源。未发布的 SQLite 副表仍保持禁用状态
且不获得 doctor 导入许可。

## 完成标准

- 运行时数据和缓存写入到全局或代理 SQLite 数据库。
- Runtime 不再写入会话索引、transcript JSONL、sandbox registry JSON、task sidecar SQLite 或 plugin-state sidecar SQLite。未交付的 task 和 plugin-state sidecar SQLite 导入器已被删除。
- 旧版文件导入仅限 doctor 使用。
- 备份会生成一个包含紧凑 SQLite 快照和完整性证明的归档文件。
- Agent workers 可以使用磁盘、VFS scratch 或实验性 VFS-only 存储运行。
- 配置和显式凭证文件仍然是唯一预期的持久化非数据库控制文件。
- 仓库检查可防止重新引入旧的运行时文件存储。
