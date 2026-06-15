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
- 当前共享表包括 `agent_databases`,
  `auth_profile_stores`, `auth_profile_state`,
  `plugin_state_entries`, `plugin_blob_entries`, `media_blobs`,
  `skill_uploads`, `capture_sessions`, `capture_events`, `capture_blobs`,
  `sandbox_registry_entries`, `cron_run_logs`, `cron_jobs`, `commitments`,
  `delivery_queue_entries`, `model_capability_cache`,
  `workspace_setup_state`, `native_hook_relay_bridges`,
  `current_conversation_bindings`, `plugin_binding_approvals`,
  `tui_last_sessions`, `acp_sessions`, `acp_replay_sessions`,
  `acp_replay_events`, `task_runs`, `task_delivery_state`, `flow_runs`,
  `subagent_runs`, `migration_runs` 和 `backup_runs`。
- 任意的插件拥有的状态不会获得主机拥有的类型化表。已安装的
  插件使用 `plugin_state_entries` 存储版本化的 JSON 负载，并使用
  `plugin_blob_entries` 存储字节数据，支持命名空间/键所有权、TTL 清理、
  备份和插件迁移记录。当主机拥有查询合约时，主机拥有的插件编排状态仍然
  可以拥有类型化表，例如 `plugin_binding_approvals`。
- 插件迁移是对插件拥有的命名空间的数据迁移，而不是主机
  模式迁移。插件可以通过迁移提供商迁移其自己的版本化状态/blob 条目，
  主机在常规迁移账本中记录源/运行状态。新的插件安装不需要更改
  `openclaw-state-schema.sql`，除非主机本身正在接管
  新的跨插件合约的所有权。
- `src/state/openclaw-agent-db.ts` 打开
  `agents/<agentId>/agent/openclaw-agent.sqlite`，将该数据库注册到全局 DB 中，并拥有代理本地会话、记录、VFS、工件、缓存
  和内存索引表。共享运行时发现现在读取生成的类型化
  `agent_databases` 注册表，而不是在每个调用
  站点重新实现该查询。
- 全局数据库和每个代理的数据库都记录一行 `schema_meta`，其中包含数据库角色、
  架构版本、时间戳，以及代理数据库的代理 ID。该布局仍
  保持为 `user_version = 1`，因为此 SQLite 架构尚未发布。
- 每个代理的会话身份现在具有一个规范的 `sessions` 根表，其键为
  `session_id`，并包含 `session_key`、`session_scope`、`account_id`、
  `primary_conversation_id`、时间戳、显示字段、模型元数据、
  harness ID 以及父/衍生链接作为可查询列。`session_routes`
  是从 `session_key` 到当前
  `session_id` 的唯一活动路由索引，因此路由键可以移动到新的持久会话，而
  无需让热读取在重复的 `sessions.session_key` 行之间进行选择。旧的
  `session_entries.entry_json` 兼容型载荷通过外键挂载在
  持久的 `session_id` 根上；它不再是
  会话唯一的架构级表示形式。
- Per-agent external conversation identity is relational too:
  `conversations` 存储规范化提供商/账户/对话身份，且
  `session_conversations`OpenClaw 将一个 OpenClaw 会话链接到一个或多个外部
  对话。这涵盖了共享主私信会话，其中多个对等方可以
  有意映射到一个会话而无需在 `session_key` 中撒谎。SQLite 也
  对自然提供商身份强制执行唯一性，因此相同的
  渠道/账户/种类/对等方/线程元组不能在对话 ID 之间分叉。
  共享主直接对等方通过 `participant`OpenClaw 角色链接，因此一个
  OpenClaw 会话可以代表多个外部私信对等方而无需将
  较旧的对等方降级为模糊的相关行。 `sessions.primary_conversation_id` 仍然
  指向当前类型化投递目标。封闭的路由/状态列
  通过 SQLite `CHECK` 约束强制执行，而不仅仅依赖于
  TypeScript 联合类型。
  运行时会话投影在应用类型化会话/对话
  列之前，从 `session_entries.entry_json` 中清除兼容性路由阴影，
  因此过时的 JSON 负载无法复活投递目标。
  子代理通知路由同样需要类型化的 SQLite 投递上下文；
  它不再回退到兼容性 `SessionEntry`Gateway(网关) 路由字段。
  网关 `chat.send` 显式投递继承读取类型化的 SQLite
  投递上下文，而不是 `origin`/`last*` 兼容性字段。
  `tools.effective` 同样从类型化
  SQLite 投递/路由行派生提供商/账户/线程上下文，而不是过时的 `last*` 会话条目阴影。
  系统事件提示上下文从类型化投递字段
  重建渠道/到/账户/线程字段，而不是 `origin` 阴影。
  共享的 `deliveryContextFromSession` 辅助程序和会话到对话
  映射器现在完全忽略 `SessionEntry.origin`；只有类型化投递字段
  和关系对话行可以创建热路由标识。
  运行时会话条目规范化在持久化或
  投影 `entry_json` 之前剥离 `origin`，
  并且入站元数据写入类型化渠道/聊天
  字段加上关系对话行，而不是创建新的源
  阴影。
- Transcript 事件、transcript 快照和轨迹运行时事件现在引用每个代理规范的 `sessions` 根，并在会话删除时级联。Transcript 身份/幂等性行继续从确切的 transcript 事件行级联。
- Memory-core 索引现在使用显式的代理数据库表 `memory_index_meta`、`memory_index_sources`、`memory_index_chunks` 和 `memory_embedding_cache`；可选的 FTS/向量侧索引使用相同的 `memory_index_*` 前缀，而不是通用的 `meta`、`files`、`chunks` 或 `chunks_vec` 表。`memory_index_sources` 以 `(source_kind, source_key)` 为键，并携带可选的 `session_id` 所有权，因此当会话被删除时，源自会话的来源和块也会级联。缓存的块嵌入作为 Float32 SQLite BLOB 存储，而不是 JSON 文本数组。这些表是派生/搜索缓存，而不是规范的 transcript 存储；它们可以被删除并从 `sessions`、`transcript_events` 和内存工作区文件重建。
- Subagent 运行恢复状态现在存在于具有索引子项、请求者和控制器会话键的类型化共享 `subagent_runs` 行中。旧的 `subagents/runs.json` 文件仅作为 doctor 迁移输入。
- 当前对话绑定现在存在于以规范化对话 id 为键的类型化共享 `current_conversation_bindings` 行中，目标代理/会话列、对话类型、状态、过期和元数据作为关系列存储，而不是重复的不透明绑定记录。持久绑定键包括规范化对话类型，因此直接/群组/渠道引用不会冲突，并且 SQLite 会拒绝无效的绑定类型/状态值。旧的 `bindings/current-conversations.json` 文件仅作为 doctor 迁移输入。
- 传递队列恢复现在将渠道、目标、账户、会话、重试、错误、平台发送和恢复状态的类型化队列列叠加到重放 JSON 上。`entry_json` 保留了重放负载、钩子和格式化负载，但对于热队列路由/状态，类型化列具有权威性。
- TUI 上次会话恢复指针现在位于按哈希后的 TUI 连接/会话范围键入的类型化共享 TUI`tui_last_sessions`TUITUI 行中。旧的 TUI JSON 文件仅作为 doctor 迁移的输入。
- 默认 TTS 偏好现在位于以 `speech-core` 插件为键的共享插件状态 SQLite 行中。旧的 `settings/tts.json` 文件仅作为 doctor 迁移的输入；运行时不再读取或写入 TTS 偏好 JSON 文件，旧版路径解析器位于 doctor 迁移模块中。
- 密钥目标元数据现在谈论的是存储，而不是假装每个凭证目标都是一个配置文件。`openclaw.json` 仍然是配置存储；auth-profile 目标使用类型化的 SQLite `auth_profile_stores` 行，其中提供商标识的凭证作为 JSON 负载保留。
- 密钥审计不再扫描已废弃的按代理划分的 `auth.json` 文件。Doctor 负责警告、导入和删除该旧版文件。
- 旧版 auth profile 路径辅助函数现在位于 doctor 旧版代码中。核心 auth profile 路径辅助函数公开的是 SQLite auth-store 身份和显示位置，而不是 `auth-profiles.json` 或 `auth-state.json` 运行时路径。
- 子代理运行恢复和 OpenRouter 模型功能缓存运行时模块现在将 SQLite 快照读取器/写入器与仅限 doctor 使用的旧版 JSON 导入辅助函数分开。OpenRouter 功能使用 `provider_id = "openrouter"` 下的类型化通用 OpenRouterOpenRouter`model_capability_cache` 行，而不是一个不透明的缓存块或特定于提供商的主机表。子代理运行 `taskName` 存储在类型化的 `subagent_runs.task_name` 列中；`payload_json` 副本是重放/调试数据，不是热显示或查找字段的来源。
- `src/agents/filesystem/virtual-agent-fs.sqlite.ts` 在代理数据库 `vfs_entries` 表上实现了 SQLite VFS。目录读取、递归导出、删除和重命名使用带索引的 `(namespace, path)` 前缀范围，而不是扫描整个命名空间或依赖 `LIKE` 路径匹配。
- `src/agents/runtime-worker.entry.ts` 为工作进程创建每次运行的 SQLite VFS、工具产物、运行产物和作用域缓存存储。
- 工作区引导完成标记现在位于以解析的工作区路径键入的类型化共享 `workspace_setup_state` 行中，而不是 `.openclaw/workspace-state.json` 中；运行时不再读取或重写旧的工作区标记，辅助 API 也不再传递虚假的 `.openclaw/setup-state` 路径来推导存储标识。
- Exec 批准现在位于类型化共享 SQLite `exec_approvals_config` 单例行中。Doctor 导入旧的 `~/.openclaw/exec-approvals.json`；运行时写入不再创建、重写或将该文件报告为其活动存储位置。macOS 伴侣读取并写入相同的 `state/openclaw.sqlite` 表行；它在磁盘上仅保留 Unix 提示套接字，因为那是 IPC，而不是持久的运行时状态。
- 设备标识、设备身份验证和引导运行时模块现在将其 SQLite 快照读取器/写入器与仅限 doctor 的旧 JSON 导入辅助程序分开。设备标识使用类型化的 `device_identities` 行，设备身份验证令牌使用类型化的 `device_auth_tokens` 行。设备身份验证写入通过设备/角色协调行，而不是截断令牌表，并且运行时不再通过旧的整个存储适配器路由单令牌更新。旧版本 1 JSON 有效负载仅作为 doctor 导入/导出形状存在。
- GitHub Copilot 令牌交换缓存使用 `github-copilot/token-cache/default` 下的共享 SQLite plugin-state 表。它是提供商拥有的缓存状态，因此有意不添加主机架构表。
- GitHub Copilot 压缩不再写入 GitHub`openclaw-compaction-*.json`RPCOpenClaw 工作区 sidecars。Harness 调用受追踪 SDK 会话的 SDK 历史压缩 RPC，而 OpenClaw 将持久的会话/副本状态保存在 SQLite 中，而不是兼容性标记文件。
- 共享的 Swift 运行时 (`OpenClawKit`) 对设备标识和设备身份验证使用相同的 `state/openclaw.sqlite`macOS 行。macOS 应用助手导入共享的 SQLite 助手，而不是拥有第二个 JSON 或 SQLite 路径。一个遗留的 `identity/device.json`Android 会阻止标识创建，直到 doctor 将其导入 SQLite，这与 TypeScript 和 Android 启动门相匹配。
- Android 设备标识使用存储在类型化 Android`state/openclaw.sqlite#table/device_identities` 行中的相同 TypeScript 兼容密钥材料。它从不读取或写入 `openclaw/identity/device.json`；一个遗留文件会阻止启动，直到 doctor 将其导入 SQLite。
- Android 缓存的设备身份验证令牌也使用类型化 Android`state/openclaw.sqlite#table/device_auth_tokens` 行，并共享与 TypeScript 和 Swift 相同的 version-1 令牌语义。运行时不再读取 `SecurePrefs` `gateway.deviceToken*` 兼容密钥；这些仅属于迁移/doctor 逻辑。
- Android 通知最近包历史记录使用类型化 Android`android_notification_recent_packages` 行。运行时不再迁移或读取旧的 SharedPreferences CSV 密钥。
- 当存在遗留 `identity/device.json`、SQLite 标识行无效或无法打开 SQLite 标识存储时，设备标识创建将以失败关闭。Doctor 首先导入并删除该文件，因此运行时启动无法在迁移前静默轮换配对标识。
- 设备标识选择是 SQLite 行密钥，而不是 JSON 文件定位符。测试和网关助手传递显式标识密钥；只有 doctor 迁移和失败关闭启动门才知道已退役的 `identity/device.json` 文件名。
- 会话重置兼容性现在位于 doctor 配置迁移中：
  `session.idleMinutes` 已移动到 `session.reset.idleMinutes`，
  `session.resetByType.dm` 已移动到 `session.resetByType.direct`，并且
  运行时重置策略仅读取规范重置键。
- 旧版配置兼容性现在位于 `src/commands/doctor/` 下。常规
  `readConfigFileSnapshot()` 验证不会导入 doctor 旧版检测器
  或标注旧版问题；`runDoctorConfigPreflight()` 会为
  doctor 修复/报告添加这些问题。doctor 配置流程会导入
  `src/commands/doctor/legacy-config.ts`OAuth，而旧的 OAuth profile-id 修复位于
  `src/commands/doctor/legacy/oauth-profile-ids.ts` 下。
- 非 doctor 命令不会自动运行旧版配置修复。例如，
  `openclaw update --channel` 现在会在无效的旧版配置上失败，并要求
  用户运行 doctor，而不是静默导入 doctor 迁移代码。
- Web 推送、APNs、语音唤醒、更新检查和配置运行状况现在使用类型化的共享 SQLite
  表来存储订阅、VAPID 密钥、节点注册、触发器行、
  路由行、更新通知状态和配置运行状况条目，而不是
  整个不透明的 JSON 大对象。Web 推送和 APNs 快照写入现在通过
  主键协调订阅/注册，而不是清空它们的表；
  配置运行状况也通过配置路径执行相同操作。
  它们的运行时模块将 SQLite 快照读取器/写入器与
  仅限 doctor 的旧版 JSON 导入辅助程序分离开来。
- 节点宿主配置现在在共享 SQLite 数据库中使用类型化的单例行；
  doctor 会在常规运行时使用之前导入旧的 `node.json` 文件。
- 设备/节点配对、渠道配对、渠道允许列表和引导状态
  现在使用类型化的 SQLite 行，而不是整个不透明的 JSON 大对象。插件绑定
  批准和定时任务作业状态遵循相同的拆分：运行时模块公开
  支持 SQLite 的操作和中性快照辅助程序，并且配对/引导
  加上插件绑定批准快照写入通过主键协调行
  而不是截断表，而 doctor 通过
  `src/commands/doctor/legacy/*` 模块导入/删除旧的 JSON 文件。
- 已安装的插件记录现在位于 SQLite 的已安装插件索引中。
  运行时配置读/写不再迁移或保留旧的
  `plugins.installs` authored-config 数据；doctor 会在正常运行时使用前将该旧配置形状导入 SQLite。
- QQBot 凭据恢复快照现在位于 SQLite 插件状态下的
  `qqbot/credential-backups`。运行时不再写入
  `qqbot/data/credential-backup*.json`；doctor 会与其他 QQBot 状态输入一起导入并删除这些旧备份文件。
- Gateway(网关) 重新加载计划比较内部 `installedPluginIndex.installRecords.*` diff 命名空间下的 SQLite 已安装插件索引快照。运行时重新加载决策不再将这些行包装在伪造的 `plugins.installs` 配置对象中。
- Matrix 命名账户凭据升级不再在运行时读取期间发生。当可以解析单个/默认 Matrix 账户时，Doctor 负责处理旧顶级 `credentials/matrix/credentials.json` 重命名。
- 核心配对和 cron 运行时模块不再导出旧 JSON 路径构建器。Doctor 拥有的旧模块构建 `pending.json`、`paired.json`、
  `bootstrap.json` 和 `cron/jobs.json` 源路径，仅用于导入测试和迁移。旧 cron 作业形状规范化和 cron 运行日志导入位于 `src/commands/doctor/legacy/cron*.ts` 下。
- `src/commands/doctor/legacy/runtime-state.ts` 从 doctor 导入旧 JSON 状态文件（包括节点主机配置）到 SQLite。新的旧文件导入器保留在 `src/commands/doctor/legacy/` 下。
- `src/commands/doctor/state-migrations.ts` 直接将旧 `sessions.json` 和
  `*.jsonl` 副本导入 SQLite 并删除成功的源文件。它不再通过 `agents/<agentId>/sessions/*.jsonl` 暂存根级旧副本，也不在导入前创建规范 JSONL 目标。
- 状态完整性 doctor 检查不再扫描旧会话目录或提供孤立 JSONL 删除。旧副本文件仅作为迁移输入，且迁移步骤负责导入和源删除。
- 遗留的沙箱注册表导入位于
  `src/commands/doctor/legacy/sandbox-registry.ts`；活跃的沙箱注册表
  读写仍然仅限 SQLite。
- 遗留的会话transcript健康/导入修复位于
  `src/commands/doctor/legacy/session-transcript-health.ts`；运行时命令
  模块不再包含 JSONL transcript 解析或活跃分支修复代码。

已完成的合并/删除重点：

- 插件状态现在使用共享的 `state/openclaw.sqlite` 数据库。旧的
  分支本地 `plugin-state/state.sqlite` 附属导入器已被删除，因为
  该 SQLite 布局从未发布。探测/测试辅助工具报告共享的
  `databasePath`，而不是暴露特定于插件状态的 SQLite 路径。
- 任务和任务流运行时表现在位于共享的
  `state/openclaw.sqlite` 数据库中，而不是 `tasks/runs.sqlite` 和
  `tasks/flows/registry.sqlite`；旧的附属导入器已被删除，原因
  同样是该布局从未发布。
- `src/config/sessions/store.ts` 不再需要 `storePath`CLI 来获取入站
  元数据、路由更新或更新时间的读取。命令持久化、CLI
  会话清理、子代理深度、身份验证覆盖和 transcript 会话
  标识使用代理/会话行 API。写入作为带有乐观冲突重试的 SQLite 行补丁应用。
- 会话目标解析现在公开每代理数据库目标，而不是遗留的
  `sessions.json` 路径。共享网关、ACP 元数据、doctor 路由修复和
  `openclaw sessions` 枚举 `agent_databases` 以及已配置的代理。
- Gateway 会话路由现在使用 Gateway(网关)`resolveGatewaySessionDatabaseTarget`；
  返回的目标携带 `databasePath` 和候选 SQLite 行键，而不是
  遗留的会话存储文件路径。
- 通道会话运行时类型现在公开 `{agentId, sessionKey}` 用于
  更新时间的读取、入站元数据和最后路由更新。旧的
  `saveSessionStore(storePath, store)` 兼容类型已消失。
- 插件运行时、扩展 API 和 API`config/sessions` 导出层现在将插件代码引导至基于 SQLite 的会话行辅助工具。根库兼容性导出（`loadSessionStore`、`saveSessionStore`、`resolveStorePath`）保留为现有消费者的已弃用垫片。旧的 `resolveLegacySessionStorePath` 辅助工具已消失；传统的 `sessions.json` 路径构造现在仅限于迁移和测试固件。
- `src/config/sessions/session-entries.sqlite.ts` 现在将规范会话条目存储在每代理数据库中，并具有行级读取/更新/删除补丁支持。运行时更新/补丁/删除不再扫描大小写变体或修剪传统别名键；规范化由 doctor 负责。独立的 JSON 导入辅助工具已消失，迁移会合并更新较新的行，而不是替换整个会话表。公共读取/列表/加载辅助工具从类型化的 `sessions` 和 `conversations` 行投影热会话元数据；`entry_json` 是一个兼容性/调试影子，可能过期或无效，而不会丢失类型化会话身份或传递上下文。
- `src/config/sessions/delivery-info.ts` 现在从类型化的每代理 `sessions` + `conversations` + `session_conversations` 行解析传递上下文。它不再从 `session_entries.entry_json` 重建运行时传递身份；缺少类型化对话行是一个 doctor 迁移/修复问题，而不是运行时回退。
- 存储会话重置决策现在优先使用类型化的 `sessions.session_scope`、`sessions.chat_type` 和 `sessions.channel` 元数据。`sessionKey` 解析仅保留用于命令目标上的显式线程/主题后缀；组与直接重置分类不再来自键形状。
- 会话列表/状态显示分类现在使用类型化聊天元数据和网关会话种类。它不再将 `session_key` 内的 `:group:` 或 `:channel:` 子字符串视为持久的组/直接事实。
- 静默回复策略选择现在仅使用显式的对话类型或表面元数据。它不再根据 `session_key` 子字符串猜测直接/群组策略。
- 会话显示模型解析现在直接从 SQLite 会话数据库目标获取代理 ID，而不是从 `session_key` 中将其拆分出来。
- 代理到代理的通告目标填充现在仅使用类型化的 `sessions.list` `deliveryContext`。它不再从遗留的 `origin`、镜像的 `last*` 字段或 `session_key` 形状中恢复渠道/账户/线程路由。
- `sessions_send` 线程目标拒绝现在读取类型化的 SQLite 路由元数据。它不再通过从目标键中解析线程后缀来拒绝或接受目标。
- 分组范围的工具策略验证现在读取当前或生成会话的类型化 SQLite 对话路由。它不再通过解码 `sessionKey` 来信任群组/渠道身份；当没有类型化的会话行为其担保时，调用者提供的群组 ID 会被丢弃。
- 渠道模型覆盖匹配现在使用显式的群组和父对话元数据。它不再从 `parentSessionKey` 中解码父对话 ID。
- 存储的模型覆盖继承现在需要来自类型化会话上下文的显式父会话键。它不再从 `sessionKey` 中的 `:thread:` 或 `:topic:` 后缀派生父覆盖。
- 旧的会话线程信息包装器和已加载插件线程解析器已消失；没有运行时代码导入 `config/sessions/thread-info`。
- 渠道对话助手不再暴露完整会话键解析桥接。核心仍然通过 `resolveSessionConversation(...)` 标准化提供商拥有的原始对话 ID，但它不再从 `sessionKey` 重建路由事实。
- 完成交付、发送策略和任务维护不再从 `session_key` 形状派生聊天类型。旧的聊天类型键解析器已被删除；这些路径需要类型化的会话元数据、类型化的交付上下文或显式的交付目标词汇。
- 会话列表/状态、诊断、审批账户绑定、TUI 心跳过滤和使用摘要不再挖掘 TUI`SessionEntry.origin` 用于提供商/账户/线程/显示路由。唯一剩余的运行时 `origin` 读取是非会话概念或当前轮次传递对象。
- 审批请求的本机对话查找现在读取按类型划分的每代理会话路由行。它不再从 `sessionKey` 解析渠道/组/线程对话身份；缺少类型化元数据是一个迁移/修复问题。
- Gateway(网关) 会话变更/聊天/会话事件负载不再回显 Gateway(网关)`SessionEntry.origin` 或 `last*` 路由影子；客户端接收类型化的 `channel`、`chatType` 和 `deliveryContext`。
- 心跳传递解析现在可以直接接收类型化的 SQLite `deliveryContext`，并且心跳运行时传递每代理会话传递行，而不是依赖当前路由的兼容性 `session_entries` 影子。
- Cron 独立代理传递目标解析现在也先从类型化的每代理会话传递行填充其当前路由，然后再回退到兼容性条目负载。
- 子代理公告源解析现在将类型化的请求者-会话传递上下文通过 `loadRequesterSessionEntry` 串联起来，并优先使用该行而不是兼容性 `last*`/`deliveryContext` 影子。
- 入站会话元数据更新现在先与类型化的每代理传递行合并；旧的 `SessionEntry` 传递字段仅作为不存在类型化对话行时的回退选项。
- 重启/更新传递提取现在让类型化的 SQLite 传递 `threadId` 优先于从 `sessionKey` 解析的主题/线程片段；解析仅是遗留线程形状键的回退选项。
- Hook 代理上下文渠道 ID 现在优先使用类型化的 SQLite 会话身份，然后是显式的消息元数据。它们不再从 `sessionKey` 解析 提供商/组/渠道 片段。
- Gateway(网关) Gateway(网关)`chat.send` 外部路由继承现在读取类型化的 SQLite 会话路由元数据，而不是从 `sessionKey`CLI 片段推断 渠道/直连/组 范围。仅当类型化会话渠道和聊天类型与存储的传递上下文匹配时，渠道范围会话才会继承；shared-main 会话保留其更严格的 CLI/no-client-metadata 规则。
- Restart-sentinel 唤醒和继续路由现在在排队心跳唤醒或路由的代理轮次继续之前，读取类型化的 SQLite 传递/路由行。它不再从 会话-entry JSON 影子重建传递上下文。
- Gateway(网关) Gateway(网关)`tools.effective` 上下文解析现在为 提供商、账户、目标、线程和回复模式 输入读取类型化的 SQLite 传递/路由行。它不再从过时的 `session_entries.entry_json` 源影子恢复这些热路由字段。
- 实时语音咨询路由现在从类型化的按代理 SQLite 会话行解析父/调用传递。在选择嵌入式代理消息路由时，它不再回退到兼容性 `SessionEntry.deliveryContext` 影子。
- ACP 生成心跳中继和父流路由现在从类型化的 SQLite 会话行读取父传递。它们不再从兼容性 会话-entry 影子重建父传递上下文。
- 会话传递路由保留现在遵循类型化的聊天元数据和持久化的传递列。它不再从 `sessionKey` 提取渠道提示、直连/主 标记或线程形状；仅当 SQLite 已经具有该会话的类型化/持久化传递身份时，内部 webchat 路由才会继承外部目标。
- 通用会话传递提取现在仅读取确切的类型化 SQLite 会话传递行。它不再解析线程/主题后缀，也不从线程形状的键回退到基础会话键。
- 回复调度、重启哨兵恢复以及实时语音咨询路由现在使用精确类型的 SQLite 会话/对话行进行线程路由。它们不再通过解析线程形状的会话密钥来恢复线程 ID 或基础会话传递上下文。
- 嵌入式 PI 历史限制现在使用类型化的 SQLite 会话路由投影 (`sessions` + 主键 `conversations`) 来获取提供商、聊天类型和对等身份。它不再从 `sessionKey` 中解析提供商、私信、组或线程形状。
- Cron 工具传递推断现在仅使用显式传递或当前类型的传递上下文。它不再从 `agentSessionKey` 中解码渠道、对等端、账户或线程目标。
- 运行时会话行不再携带旧的 `lastProvider` 路由别名。辅助程序和测试使用类型化的 `lastChannel` 和 `deliveryContext` 字段；doctor 迁移是唯一应该翻译旧路由别名或持久化 `origin` 影子的地方。
- 抄录事件、VFS 行和工具工件行现在写入每代理数据库。未发布的全局抄录文件映射表已消失；doctor 改为在持久化迁移行中记录旧版源路径。
- 运行时抄录查找不再扫描 JSONL 字节偏移量或探测旧版抄录文件。Gateway(网关) 聊天/媒体/历史路径从 SQLite 读取抄录行；会话 JSONL 现在仅作为旧版 doctor 输入，而非运行时状态或导出格式。
- 抄录父级和分支关系使用 SQLite 抄录头中的结构化 `parentTranscriptScope: {agentId, sessionId}` 元数据，而不是类似路径的 `agent-db:...transcript_events...` 定位符字符串。
- 抄录管理器协定不再暴露隐式持久化 `create(cwd)` 或 `continueRecent(cwd)` 构造函数。持久化抄录管理器通过显式 `{agentId, sessionId}` 作用域打开；仅内存管理器保持无作用域状态，用于测试和纯抄录转换。
- Runtime transcript store APIs 解析 SQLite 作用域，而不是文件系统路径。旧的 `resolve...ForPath` 辅助函数和未使用的 `transcriptPath` 写入选项已从 Runtime 调用者中移除。
- Runtime 会话解析现在使用 `{agentId, sessionId}`，并且不得为外部边界派生 `sqlite-transcript://<agent>/<session>` 字符串。传统的绝对路径 JSONL 路径仅作为 doctor 迁移的输入。
- Native hook relay direct-bridge 记录现在存在于按 relay id 键入的共享 `native_hook_relay_bridges` 行中。Runtime 不再为那些短暂的 bridge 记录写入 `/tmp` JSON 注册表或不透明的通用记录。
- `runEmbeddedPiAgent(...)` 不再具有 transcript-locator 参数。准备好的 Worker 描述符也省略了 transcript 定位符。Runtime 会话状态和排队的后续运行携带 `{agentId, sessionId}`，而不是派生的 transcript 句柄。
- 嵌入式压缩现在从 `agentId` 和 `sessionId` 获取 SQLite 作用域。压缩 hooks、context-engine 调用、CLI 委托和协议回复不得接收派生的 `sqlite-transcript://...` 句柄。导出/调试代码可以从行中实现显式的用户工件，但它不提供通用的会话 JSONL 导出路径或将文件名反馈给运行时标识。
- `/export-session` 从 SQLite 读取 transcript 行，并仅写入请求的独立 HTML 视图。嵌入式查看器不再从这些行重构或下载会话 JSONL。
- Context-engine 委托不再解析 transcript 定位符来恢复代理标识。准备好的 Runtime 上下文将解析后的 `agentId` 带入内置压缩适配器。
- Transcript 重写和实时工具结果截断现在通过 `{agentId, sessionId}` 读取并持久化 transcript 状态，并且不为 transcript-update 事件负载派生临时定位符。
- transcript-state 辅助接口不再具有基于定位符的 `readTranscriptState`、`replaceTranscriptStateEvents` 或 `persistTranscriptStateMutation` 变体。运行时调用者必须使用 `{agentId, sessionId}` API。Doctor 导入通过显式文件路径读取旧文件并写入 SQLite 行；它不迁移定位符字符串。
- 运行时会话管理器契约不再暴露 `open(locator)`、`forkFrom(locator)` 或 `setTranscriptLocator(...)`。持久化会话管理器仅通过 `{agentId, sessionId}` 打开；列表/分支辅助工具位于面向行的会话和检查点 API 上，而不是位于记录管理器门面上。
- Gateway(网关) 记录读取器 API 以作用域为首。它们接受 Gateway(网关)`{agentId, sessionId}`，不接受可能意外成为运行时标识的位置记录定位符。活动记录定位符解析已消失；旧源路径仅由 doctor 导入代码读取。
- 记录更新事件也是以作用域为首的。`emitSessionTranscriptUpdate` 不再接受裸定位符字符串，并且侦听器通过 `{agentId, sessionId}` 进行路由，而无需解析句柄。
- Gateway(网关) 会话消息广播从代理/会话作用域解析会话密钥，而不是从记录定位符解析。旧的记录定位符到会话密钥解析器/缓存已消失。
- Gateway(网关) 会话历史 SSE 过滤器按代理/会话作用域过滤实时更新。它不再规范化记录定位符候选项、真实路径或文件形状的记录标识来决定流是否应接收更新。
- 会话生命周期挂钩不再在 `session_end` 上派生或暴露记录定位符。挂钩使用者获取 `sessionId`、`sessionKey`、下一会话 ID 和代理上下文；记录文件不是生命周期契约的一部分。
- 重置挂钩也不再派生或暴露记录定位符。`before_reset` 负载携带恢复的 SQLite 消息以及重置原因，而会话标识保留在挂钩上下文中。
- Agent harness reset 不再接受 transcript locator。Reset 调度范围由 `sessionId`/`sessionKey` 加上原因确定。
- Agent extension 会话类型不再公开 `transcriptLocator`；extensions 应该使用会话上下文和运行时 API，而不是访问文件形式的 transcript 身份标识。
- Plugin 压实 hooks 不再公开 transcript locators。Hook 上下文已经携带会话身份标识，transcript 读取必须通过支持 SQLite 范围感知的 API 进行，而不是使用文件形式的句柄。
- `before_agent_finalize` hooks 不再公开 `transcriptPath`，包括原生 hook 中继有效载荷。Finalization hooks 仅使用会话上下文。
- Gateway(网关) 重置响应不再在返回的条目上合成 transcript locator。重置操作会创建 SQLite transcript 行，返回干净的会话条目，并将 transcript 访问留给支持范围感知的读取器。
- Embedded run 和 compaction 结果不再为会话计费公开 transcript locators。自动压缩仅更新活动的 `sessionId`、压缩计数器和 token 元数据。
- Embedded attempt 结果不再返回 `transcriptLocatorUsed`，并且 context-engine `compact()` 结果不再返回 transcript locators。运行时重试循环仅接受后继 `sessionId`。
- Delivery-mirror transcript 追加结果不再返回 transcript locators。调用者获得追加的 `messageId`；transcript 更新信号使用 SQLite 范围。
- Parent-会话 fork helpers 仅返回分叉的 `sessionId`。Subagent 准备阶段将子 agent/会话 范围传递给引擎。
- CLI 运行器参数和历史记录重植不再接受 transcript locators。CLI 历史记录读取根据 `{agentId, sessionId}` 和会话密钥上下文解析 SQLite transcript 范围。
- CLI 和 embedded-runner 测试装置现在通过会话 ID 来填充和读取 SQLite 副本行，而不是假装活动会话是 CLI`*.jsonl` 文件，或者通过运行时参数传递 `sqlite-transcript://...` 字符串。
- 即使内存管理器没有派生的定位器，会话工具结果保护事件也会从已知的会话范围发出。其测试不再伪造活动的 `/tmp/*.jsonl` 副本文件。
- BTW 和压缩检查点辅助工具现在按 SQLite 范围读取和分叉副本行。检查点元数据现在仅存储会话 ID 和 leaf/entry ID；派生的定位器不再写入检查点有效负载中。
- Gateway(网关) 副本键查找在协议边界处使用 SQLite 副本范围，不再对副本文件名执行 realpath 或 stat 操作。
- 自动压缩副本轮换通过 SQLite 副本存储直接写入后继副本行。会话行仅保留后继会话标识，而不是持久的 JSONL 路径或持久化的定位器。
- 嵌入式上下文引擎压缩使用 SQLite 命名的副本轮换辅助工具。轮换测试不再构造 JSONL 后继路径或将活动会话建模为文件。
- 托管的出站图像保留策略从 SQLite 副本统计信息中键入其副本消息缓存，而不是通过文件系统 stat 调用。
- 运行时会话锁和独立的旧版 `.jsonl.lock` doctor 通道已被移除。
- Microsoft Teams 运行时桶和公共插件 SDK 不再重新导出旧的文件锁定辅助工具；持久的插件状态路径由 SQLite 支持。
- 会话时长/计数清理和显式的会话清理已被移除。Doctor 拥有旧版导入功能；过时的会话会被显式重置或删除。
- Doctor 完整性检查不再将旧版 JSONL 文件视为 SQLite 会话行的有效活动副本。活动副本的健康状况仅依赖于 SQLite；旧版 JSONL 文件被报告为迁移/孤立清理的输入。
- Doctor 不再将 `agents/<agent>/sessions/` 视为必需的运行时状态。仅当该目录已存在时，它才会扫描该目录，作为旧版导入或孤立清理的输入。
- Gateway Gateway(网关)`sessions.resolve`TUI、会话 patch/reset/compact 路径、子代理
  生成、快速中止、ACP 元数据、心跳隔离会话以及 TUI
  补丁不再将迁移或修剪旧会话密钥作为正常运行时工作的副作用。
- CLI 命令会话解析现在返回所属的 CLI`agentId` 而不是
  `storePath`，并且在正常的
  `--to` 或 `--session-id` 解析期间不再复制旧的主会话行。旧的主行规范化仅属于 doctor。
- 运行时子代理深度解析不再读取 `sessions.json` 或 JSON5
  会话存储。它通过代理 ID 读取 SQLite `session_entries`，并且旧的
  深度/会话元数据只能通过 doctor 导入路径进入。
- Auth 配置文件会话覆盖通过直接的 `{agentId, sessionKey}`
  行 upsert 持久化，而不是延迟加载文件形状的会话存储运行时。
- 自动回复详细门控和会话更新助手现在通过会话标识读取/更新 SQLite
  会话行，并且在接触持久化行状态之前不再需要旧存储路径。
- 命令运行会话元数据助手现在使用面向条目的名称和模块
  路径；旧的 `session-store` 命令助手表面已被移除。
- 引导头播种和手动压缩边界加固现在直接改变
  SQLite 转录行。运行时调用者传递会话标识，而不是
  可写的 `.jsonl` 路径。
- 静默会话轮换重放通过
  `{agentId, sessionId}` 从 SQLite 转录行复制最近的用户/助手轮次。它不再接受
  源或目标转录定位器。
- 新的运行时会话行不再存储转录定位器。调用者直接使用
  `{agentId, sessionId}`；导出/调试命令可以在具体化行时选择输出文件
  名称。
- 启动一个新的持久化转录会话现在始终按作用域打开 SQLite 行。
  会话管理器不再重用以前的文件时代转录
  路径或定位器作为新会话的标识。
- 持久化的转录会话使用显式的 `openTranscriptSessionManagerForSession({agentId, sessionId})`API API。旧的静态 `SessionManager.create/openForSession/list/forkFromSession` 外观已被移除，因此测试和运行时代码无法意外地重新创建文件时代的会话发现机制。
- 插件运行时不再公开 `api.runtime.agent.session.resolveTranscriptLocatorPath`；插件代码使用 SQLite 行助手和作用域值。
- 公共的 `session-store-runtime` SDK 表面现在仅导出会话行和转录行助手。原始的 SQLite 数据库打开/路径和关闭/重置助手位于专用的 `sqlite-runtime` SDK 表面中，因此插件测试不再拉取已弃用的广泛测试包来进行数据库清理。
- 传统的 `.jsonl` 轨迹/检查点文件名分类器现在位于 doctor 传统会话文件模块中。核心会话验证不再导入文件产物助手来决定正常的 SQLite 会话 ID。
- 主动内存阻塞的子代理运行使用 SQLite 转录行，而不是在插件状态下创建临时或持久的 `session.jsonl` 文件。旧的 `transcriptDir` 选项已被移除。
- 一次性 slug 生成和 Crestodian 规划器运行使用 SQLite 转录行，而不是创建临时的 `session.jsonl` 文件。
- `llm-task` 助手运行和隐藏承诺提取也使用 SQLite 转录行，因此这些仅模型的助手会话不再创建临时的 JSON/JSONL 转录文件。
- `TranscriptSessionManager` 现在只是一个已打开的 SQLite 转录作用域。运行时代码使用 `openTranscriptSessionManagerForSession({agentId, sessionId})` 打开它；创建、分支、继续、列表和分叉流程位于其所属的 SQLite 行助手中，而不是静态管理器外观。Doctor/import/debug 代码在运行时会话管理器之外处理显式的传统源文件。
- 过时的 `SessionManager.newSession()` 和 `SessionManager.createBranchedSession()` 外观方法已被移除。新会话和转录后代由其所属的 SQLite 工作流创建，而不是通过将已打开的管理器变异为不同的持久会话来实现。
- 父脚本 fork 决策和 fork 创建不再接受
  `storePath` 或 `sessionsDir`；它们使用 `{agentId, sessionId}` SQLite
  脚本作用域，而不是保留的文件系统路径元数据。
- Memory-host 不再导出空操作的会话目录脚本
  分类助手；脚本过滤现在在条目构建期间从 SQLite 行
  元数据派生。
- Memory-host 和 QMD 会话导出测试使用 SQLite 脚本作用域。旧的
  `agents/<agentId>/sessions/*.jsonl` 路径仅在有测试专门
  证明 doctor/导入/导出兼容性时才保持覆盖。
- QA-lab 原始会话检查现在通过网关使用 `sessions.list`
  而不是读取 `agents/qa/sessions/sessions.json`；MSteams 反馈
  直接追加到 SQLite 脚本，而无需捏造 JSONL 路径。
- 共享的入站渠道轮次现在携带 `{agentId, sessionKey}`，而不是
  旧的 `storePath`。LINE、WhatsApp、Slack、Discord、Telegram、Matrix、Signal、
  iMessage、BlueBubbles、Feishu、Google Chat、IRC、Nextcloud Talk、Zalo、
  Zalo Personal、QA 渠道、Microsoft Teams、Mattermost、Synology Chat、Tlon、
  Twitch 和 QQBot 记录路径现在读取更新于元数据，并通过 SQLite 身份记录
  入站会话行。
- 脚本定位器持久化已从活动会话行中移除。
  `resolveSessionTranscriptTarget` 返回 `agentId`、`sessionId` 和可选
  的主题元数据；doctor 是唯一导入旧脚本文件
  名称的代码。
- 运行时脚本标头始于 SQLite 版本 `1`。旧的 JSONL V1/V2/V3
  形状升级仅存在于 doctor 导入中，并在存储行之前将导入的标头规范化为
  当前 SQLite 脚本版本。
- database-first 守卫现在禁止使用 `SessionManager.listAll` 和
  `SessionManager.forkFromSession`；会话列表以及 fork/restore 工作流
  必须继续使用基于行/作用域的 SQLite API。
- 该守卫还禁止在 doctor/import 代码之外使用遗留的 transcript JSONL 解析/active-branch 修复辅助函数
  名称，因此运行时无法生成第二条遗留
  transcript 迁移路径。
- 嵌入式 PI 运行拒绝传入的 transcript 句柄。它们在 worker 启动之前
  以及在尝试接触 transcript 状态之前再次使用 SQLite
  `{agentId, sessionId}` 身份。过时的 `/tmp/*.jsonl` 输入无法选择
  运行时写入目标。
- 缓存跟踪、Anthropic 负载、原始流和诊断时间线记录
  现在写入类型化的 SQLite Anthropic`diagnostic_events`Gateway(网关) 行。Gateway 稳定性包
  现在写入类型化的 SQLite `diagnostic_stability_bundles` 行。旧的
  `diagnostics.cacheTrace.filePath`、`OPENCLAW_CACHE_TRACE_FILE`、
  `OPENCLAW_ANTHROPIC_PAYLOAD_LOG_FILE` 和
  `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH` JSONL 覆盖路径已被移除，并且
  正常的稳定性捕获不再写入 `logs/stability/*.json` 文件。
- Cron 持久化现在协调 SQLite `cron_jobs` 行，而不是
  在每次保存时删除/重新插入整个作业表。插件目标
  回写直接更新匹配的 cron 行，并将运行时 cron 状态保留在
  同一个状态数据库事务中。
- Cron 运行时调用者现在使用稳定的 SQLite cron 存储键。遗留的
  `cron.store`Telegram 路径仅作为 doctor 导入输入；生产环境 Gateway、任务
  维护、状态、运行日志和 Telegram 目标回写路径使用
  `resolveCronStoreKey` 并且不再对键进行路径规范化。Cron 状态现在
  报告 `storeKey` 而不是旧的文件形式的 `storePath` 字段。
- Cron 运行时加载和调度不再规范化遗留的持久化作业
  形状，例如 `jobId`、`schedule.cron`、数字 `atMs`、字符串布尔值或
  缺失的 `sessionTarget`。Doctor 遗留导入负责在行
  插入 SQLite 之前修复这些问题。
- ACP spawn 不再解析或持久化 transcript JSONL 文件路径。Spawn 和线程绑定设置直接持久化 SQLite 会话行，并将会话 ID 保留为 transcript 身份。
- ACP 会话元数据 API 现在通过 `agentId` 读取/列表/更新 SQLite 行，并且不再作为 ACP 会话条目契约的一部分暴露 `storePath`。
- 会话使用统计和网关使用聚合现在仅通过 `{agentId, sessionId}` 解析 transcript。成本/使用缓存和已发现的会话摘要不再合成或返回 transcript 定位符字符串。
- Gateway(网关) 聊天追加、中止部分持久化、Gateway(网关)`/sessions.send` 和 webchat 媒体 transcript 写入通过 SQLite transcript 范围直接追加。Gateway transcript 注入辅助函数不再接受 `transcriptLocator` 参数。
- SQLite transcript 发现现在仅列出 transcript 范围和统计信息：`{agentId, sessionId, updatedAt, eventCount}`。已弃用的 `listSqliteSessionTranscriptLocators` 兼容辅助函数和逐行 `locator` 字段已被移除。
- Transcript 修复运行时现在仅暴露 `repairTranscriptSessionStateIfNeeded({agentId, sessionId})`。旧的基于定位符的修复辅助函数已被删除；doctor/debug 代码读取显式源文件路径，并且从不迁移定位符字符串。
- ACP 重放账本运行时现在将会话级重试行存储在共享 SQLite 状态数据库中，而不是 `acp/event-ledger.json` 中；doctor 导入并删除旧文件。
- Gateway(网关) transcript 读取辅助函数现在位于 Gateway(网关)`src/gateway/session-transcript-readers.ts` 中，而不是旧的 `session-utils.fs` 模块名称。后备重试历史检查以 SQLite transcript 内容命名，而不是旧的文件辅助接口。
- Gateway(网关) 注入聊天和压缩辅助函数现在通过内部辅助 API 传递 SQLite transcript 范围，而不是将命名值传递为 transcript 路径或源文件。
- 引导继续检测现在通过 `hasCompletedBootstrapTranscriptTurn` 检查 SQLite transcript 行；它不再暴露文件形状的辅助函数名称。
- 嵌入式运行器测试现在使用 SQLite 副本标识，并且打开一个新的副本管理器总是需要一个显式的 `sessionId`。
- 内存索引辅助程序现在端到端地使用 SQLite 副本术语：宿主导出 `listSessionTranscriptScopesForAgent` 和 `sessionTranscriptKeyForScope`，定向同步队列 `sessionTranscripts`，公开的会话搜索命中暴露不透明的 `transcript:<agent>:<session>` 路径，并且内部 DB 源键是 `session:<session>` 位于 `source_kind='sessions'` 下，而不是伪造的文件路径。
- 通用插件 SDK 持久化去重辅助程序不再暴露文件形状的选项。调用者提供 SQLite 作用域键，持久化去重行位于共享插件状态中。
- Microsoft Teams SSO 和委托 OAuth 令牌已从锁定的 JSON 文件移动到 SQLite 插件状态。Doctor 导入 `msteams-sso-tokens.json` 和 `msteams-delegated.json`，从有效负载重建规范的 SSO 令牌键，并删除源文件。
- Matrix 同步缓存状态已从 `bot-storage.json` 移动到 SQLite 插件状态。Doctor 导入旧的原始或包装同步有效负载并删除源文件。活动的 Matrix 和 QA Matrix 客户端传递 SQLite 同步存储根目录，而不是伪造的 `sync-store.json` 或 `bot-storage.json` 路径。
- Matrix 旧版加密迁移状态已从 `legacy-crypto-migration.json` 移动到 SQLite 插件状态。Doctor 导入旧的状态文件；Matrix SDK IndexedDB 快照已从 `crypto-idb-snapshot.json` 移动到 SQLite 插件 Blob。Matrix 恢复密钥和凭据是 SQLite 插件状态行；它们的旧 JSON 文件仅作为 Doctor 迁移输入。
- Memory Wiki 活动日志现在使用 SQLite 插件状态，而不是 `.openclaw-wiki/log.jsonl`。Memory Wiki 迁移提供商导入旧的 JSONL 日志；wiki markdown 和用户保险库内容作为工作区内容保持文件支持。
- Memory Wiki 不再创建 `.openclaw-wiki/state.json` 或未使用的
  `.openclaw-wiki/locks` 目录。如果较旧的 vault 中仍有这些已停用的
  插件元数据文件，迁移提供商会将其删除。
- Crestodian 审计条目现在使用核心 SQLite 插件状态，而不是
  `audit/crestodian.jsonl`。Doctor 会导入旧的 JSONL 审计日志，
  并在成功导入后将其删除。
- 配置写入/观察审计条目现在使用核心 SQLite 插件状态，而不是
  `logs/config-audit.jsonl`。Doctor 会导入旧的 JSONL 审计日志，
  并在成功导入后将其删除。
- macOS 伴侣应用在编辑 `openclaw.json`macOS 时，不再写入应用本地 Gateway(网关)`logs/config-audit.jsonl` 或
  `logs/config-health.json` 附属文件。配置文件仍保持文件支持，恢复快照保留在配置文件旁边，
  而持久的配置审计/健康状态属于 Gateway SQLite 存储。
- Crestodian 救援待处理批准现在使用核心 SQLite 插件状态，而不是
  `crestodian/rescue-pending/*.json`。Doctor 会导入旧的待处理批准
  文件，并在成功导入后将其删除。
- Phone Control 临时布防状态现在使用 SQLite 插件状态，而不是
  `plugins/phone-control/armed.json`。Doctor 会将旧的 armed-state
  文件导入到 `phone-control/arm-state` 命名空间中，并删除该文件。
- Doctor 不再就地修复 JSONL 转录本或创建备份 JSONL
  文件。它将活动分支导入 SQLite 并删除旧源。
- 会话内存钩子转录本查找仅使用 `{agentId, sessionId}` 作用域的
  SQLite 读取。其辅助函数不再接受或推导转录本定位符、
  旧文件读取或文件重写选项。
- Codex 应用服务器对话绑定现在通过 OpenClaw 会话键或显式 OpenClaw`{agentId, sessionId}` 作用域来键控 SQLite 插件状态。它们绝不能
  保留转录本路径回退绑定。
- Codex 应用服务器镜像历史记录读取仅使用 SQLite 转录本作用域；
  它们绝不能从转录本文件路径恢复身份。
- 角色排序和压缩重置路径不再取消链接旧的转录本
  文件；重置仅轮换 SQLite 会话行和转录本身份。
- Gateway(网关) 重置和检查点响应返回干净的会话行以及会话 ID。它们不再为客户端合成 SQLite 脚本定位器。
- Memory-core dreaming 不再通过探测缺失的 JSONL 文件来清理会话行。Subagent 清理通过会话运行时 API 进行，而不是检查文件系统是否存在。其脚本摄取测试直接植入 SQLite 行，而不是创建 `agents/<id>/sessions` fixtures 或定位器占位符。
- Memory 脚本索引可能会将 `transcript:<agentId>:<sessionId>` 作为引用/读取辅助工具的虚拟搜索命中路径公开。持久索引源是关系型的（`source_kind='sessions'`、`source_key='session:<sessionId>'`、`session_id=<sessionId>`），因此该值既不是运行时脚本定位器，也不是文件系统路径，并且绝不能传回给会话运行时 API。
- Gateway(网关) doctor memory status 从 SQLite plugin-state 行读取短期回忆和阶段信号计数，而不是从 `memory/.dreams/*.json` 读取；CLI 和 doctor 输出现在将该存储标记为 SQLite 存储，而不是路径。
- Memory-core 运行时、CLI 状态、Gateway(网关) doctor 方法和 plugin SDK 外观不再审计或归档旧的 `.dreams/session-corpus` 文件。这些文件仅用作迁移输入；doctor 会将其导入 SQLite 并在验证后删除源。活动的会话摄取证据行现在使用虚拟 SQLite 路径 `memory/session-ingestion/<day>.txt`；运行时绝不会写入或从 `.dreams/session-corpus` 推导状态。
- Memory-core 公共构件将 SQLite 主机事件作为虚拟 JSON 构件 `memory/events/memory-host-events.json` 公开；它们不再重用旧的 `.dreams/events.jsonl` 源路径。
- 沙箱容器/浏览器注册表现在使用共享的
  `sandbox_registry_entries` SQLite 表，其中包含具有类型的会话、镜像、时间戳、
  后端/配置和浏览器端口列。Doctor 导入遗留的单一和分片 JSON 注册表文件，
  并移除成功的源。运行时读取使用类型化的行列作为真实来源；
  `entry_json` 仅用于重放/调试副本。
- Commitments 现在使用类型化的共享 `commitments` 表，而不是
  整个存储的 JSON blob。快照保存按 commitment id 进行 upsert，并仅
  删除缺失的行，而不是清空并重新插入表。运行时从类型化的
  scope、delivery-window、status、attempt 和 text 列加载
  commitments；`record_json` 仅用于重放/调试副本。Doctor 导入遗留的
  `commitments.json` 并在成功导入后将其移除。
- Cron 作业定义、计划状态和运行历史不再具有运行时
  JSON 编写器或读取器。运行时使用 `cron_jobs` 行，其中包含类型化的计划、
  payload、delivery、failure-alert、会话、status 和 runtime-state 列，以及类型化的
  `cron_run_logs` 元数据，用于状态、诊断摘要、delivery status/error、
  会话/run、模型和 token 总计。`job_json` 仅用于重放/调试副本；
  `state_json` 保留尚未具有热查询字段的嵌套
  运行时诊断，而运行时从类型化列重新填充热状态字段。Doctor 导入
  遗留的 `jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件，并移除
  已导入的源。插件目标回写更新匹配的 `cron_jobs`
  行，而不是加载和替换整个 cron 存储。
- Doctor 和 Gateway(网关) 启动时将遗留的 `notify: true` webhook 回退
  在调度程序运行之前转换为显式 SQLite delivery。已经
  向聊天宣布的作业保留该 delivery 并接收一个 webhook
  `completionDestination`；没有 `cron.webhook` 的作业被报告以进行手动
  修复。
- 出站和会话传递队列现在在共享的 `delivery_queue_entries` 表中，将队列状态、条目类型、
  会话密钥、渠道、目标、账户 ID、重试次数、上次尝试/错误、
  恢复状态和平台发送标记存储为类型化列。运行时恢复从
  这些类型化列中读取热字段，而重试/恢复变更直接更新这些列，
  而无需重写重放 JSON。完整的 JSON 载荷仅作为
  消息正文和其他冷重放数据的重放/调试 Blob 保留。
- 托管出站图像记录现在使用类型化的共享
  `managed_outgoing_image_records` 行，媒体字节仍存储在
  `media_blobs` 中。JSON 记录仅作为重放/调试副本保留。
- Discord 模型选择器首选项、命令部署哈希和线程绑定
  现在使用共享 SQLite 插件状态。其旧版 JSON 导入计划位于
  Discord 插件设置/doctor 迁移表面中，而不在核心迁移代码中。
- 插件旧版导入检测器使用 doctor 命名的模块，例如
  `doctor-legacy-state.ts` 或 `doctor-state-imports.ts`；普通渠道运行时
  模块不得导入旧版 JSON 检测器。
- BlueBubbles 追赶游标和入站去重标记现在使用共享 SQLite
  插件状态。其旧版 JSON 导入计划位于 BlueBubbles 插件
  设置/doctor 迁移表面中，而不在核心迁移代码中。
- Telegram 更新偏移量、贴纸缓存行、已发送消息缓存行、
  主题名称缓存行和线程绑定现在使用共享 SQLite 插件
  状态。其旧版 JSON 导入计划位于 Telegram 插件
  设置/doctor 迁移表面中，而不在核心迁移代码中。
- iMessage 追赶游标、回复短 ID 映射和已发送回声去重行
  现在使用共享 SQLite 插件状态。旧的 `imessage/catchup/*.json`、
  `imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl` 文件
  仅作为 doctor 输入。
- 飞书消息去重行现在使用共享 SQLite 插件状态，而不是
  `feishu/dedup/*.json` 文件。其旧版 JSON 导入计划位于飞书
  插件设置/doctor 迁移表面中，而不在核心迁移代码中。
- Microsoft Teams 对话、投票、待上传缓冲区以及反馈学习现在使用共享的 SQLite 插件 state/blob 表。待上传路径使用 Microsoft Teams`plugin_blob_entries`，因此媒体缓冲区作为 SQLite BLOBs 存储而不是 base64 JSON。运行时辅助名称现在使用 SQLite/state 命名而不是 `*-fs` 文件存储命名，并且旧的 `storePath`Microsoft Teams 垫片已从这些存储中移除。其遗留 JSON 导入计划位于 Microsoft Teams 插件 setup/doctor 迁移界面中。
- Zalo 托管的出站媒体现在使用共享的 SQLite Zalo`plugin_blob_entries` 而不是 `openclaw-zalo-outbound-media` JSON/bin 临时侧车文件。
- Diffs 查看器 HTML 和元数据现在使用共享的 SQLite `plugin_blob_entries` 而不是 `meta.json`/`viewer.html` 临时文件。渲染的 PNG/PDF 输出保留为临时具体化，因为渠道交付仍然需要文件路径。
- Canvas 托管的文档现在使用共享的 SQLite Canvas`plugin_blob_entries` 而不是默认的 `state/canvas/documents`Canvas 目录。Canvas 主机直接提供这些 blob；仅为显式的 `host.root` 操作员内容或当下游媒体读取器需要路径时的临时具体化创建本地文件。
- File Transfer 审计决策现在使用共享的 SQLite `plugin_state_entries` 而不是无限制的 `audit/file-transfer.jsonl` 运行时日志。Doctor 将遗留的 JSONL 审计文件导入插件状态，并在成功导入后删除源文件。
- ACPX 进程租约和网关实例标识现在使用共享的 SQLite 插件状态。Doctor 将遗留的 `gateway-instance-id` 文件导入插件状态并删除源文件。
- ACPX 生成的包装脚本和独立的 Codex 主目录是 OpenClaw 临时根目录下的临时具体化内容，而非持久的 OpenClaw 状态。持久的 ACPX 运行时记录是 SQLite 租约和 Gateway(网关)-instance 行；旧的 ACPX OpenClawOpenClaw`stateDir` 配置界面已被移除，因为不再有任何运行时状态写入其中。
- Gateway(网关) 媒体附件现在使用共享的 Gateway(网关)`media_blobs` SQLite 表作为规范的字节存储。返回给渠道 和沙盒兼容性界面的本地路径是数据库行的临时具体化内容，而非持久媒体存储。运行时媒体允许列表不再包含遗留的 `$OPENCLAW_STATE_DIR/media` 或 config-dir `media` 根目录；这些目录仅作为 doctor 导入源。
- Shell 补全不再写入 `$OPENCLAW_STATE_DIR/completions/*` 缓存文件。安装、doctor、更新和发布冒烟路径使用生成的补全输出或配置文件 sourcing，而不是持久的补全缓存文件。
- Gateway(网关) 技能上传暂存现在使用共享的 Gateway(网关)`skill_uploads` 行。上传元数据、幂等键和归档字节存储在 SQLite 中；安装程序仅在安装运行期间接收到一个临时具体化的归档路径。
- Subagent 内联附件不再在工作区 `.openclaw/attachments/*` 下进行具体化。生成路径准备 SQLite VFS 种子条目，内联运行将这些种子条目填充到每个代理的运行时草稿命名空间中，且磁盘支持的工具会将该 SQLite 草稿叠加用于附件路径。旧的 subagent-run attachment-dir 注册表列和清理钩子已被移除。
- CLI 图像填充不再维护稳定的 CLI`openclaw-cli-images`CLI 缓存文件。外部 CLI 后端仍然接收文件路径，但这些路径是带有清理机制的每次运行临时具体化内容。
- 缓存跟踪诊断、Anthropic 负载诊断、原始模型流诊断、诊断时间线事件以及 Gateway(网关) 稳定性包现在写入 SQLite 行，而不是 AnthropicGateway(网关)`logs/*.jsonl` 或 `logs/stability/*.json` 文件。运行时路径覆盖标志和环境变量已被移除；export/debug 命令可以从数据库行中显式生成文件。
- macOS 伴侣不再具有滚动 macOS`diagnostics.jsonl`Gateway(网关) 写入器。应用日志进入统一日志，持久的 Gateway(网关) 诊断保持由 SQLite 支持。
- macOS 端口守护者记录列表现在使用类型化的共享 SQLite macOS`macos_port_guardian_records` 行，而不是 Application Support JSON 文件或不透明的单例 blob。
- Gateway(网关) 单例锁现在使用 `gateway_locks`Gateway(网关) 作用域下的类型化共享 SQLite OAuth`state_leases` 行，而不是临时目录锁文件。Fly 和 OAuth 故障排除文档现在指向 SQLite 租约/认证刷新锁，而不是过时的文件锁清理。
- Gateway(网关) 重启哨兵状态现在使用类型化的共享 SQLite Gateway(网关)`gateway_restart_sentinel` 行，而不是 `restart-sentinel.json`；运行时从类型化列中读取哨兵类型、状态、路由、消息、延续和统计信息。`payload_json` 仅用于重放/调试副本。运行时代码直接清除 SQLite 行，不再包含文件清理管道。
- Gateway(网关) 重启意图和监督程序交接状态现在使用类型化的共享 SQLite Gateway(网关)`gateway_restart_intent` 和 `gateway_restart_handoff` 行，而不是 `gateway-restart-intent.json` 和 `gateway-supervisor-restart-handoff.json` 边车。
- Gateway(网关) 单例协调现在使用 Gateway(网关)`state_leases``gateway_locks` 下的类型化 `state_leases` 行，而不是写入 `gateway.<hash>.lock` 文件。租约行拥有锁所有者、过期时间、心跳和调试负载；SQLite 拥有原子获取/释放边界。已过时的文件锁目录选项已消失；测试直接使用 SQLite 行标识。
- 旧的未引用的 cron 使用情况报告辅助程序（用于扫描 `cron/runs/*.jsonl` 文件）已被删除。Cron 运行历史报告应读取类型化的 `cron_run_logs` SQLite 行。
- 主会话重启恢复现在通过 SQLite `agent_databases` 注册表发现候选代理，而不是扫描 `agents/*/sessions` 目录。
- Gemini 会话损坏恢复现在仅删除 SQLite 会话行；它不再需要遗留的 `storePath` 门控，也不会尝试取消链接派生的转录 JSONL 路径。
- 路径覆盖处理现在将字面量 `undefined`/`null` 环境值视为未设置，以防止在测试或 shell 交接期间意外出现仓库根目录 `undefined/state/*.sqlite` 数据库。
- 配置健康指纹现在使用类型化的共享 SQLite `config_health_entries` 行代替 `logs/config-health.json`macOS，保持普通配置文件作为唯一的非凭据配置文档。macOS 伴侣仅保留进程本地健康状态，不会重新创建旧的 JSON 附属文件。
- Auth 配置文件运行时不再导入或写入凭据 JSON 文件。规范的凭据存储是 SQLite；`auth-profiles.json`、每个代理的 `auth.json` 和共享的 `credentials/oauth.json` 是医生迁移输入，并在导入后删除。
- Auth 配置文件保存/状态测试现在直接断言类型化的 SQLite auth 表，并且仅将遗留的 auth-profile 文件名用于医生迁移输入。
- `openclaw secrets apply` 仅清理配置文件、环境文件和 SQLite auth-profile store。它不再包含编辑已弃用的每个 `auth.json` 的兼容性逻辑；doctor 负责导入和删除该文件。
- Hermes secret migration 计划并将导入的 API-key 配置文件直接应用 SQLite auth-profile store。它不再将 `auth-profiles.json` 作为中间目标进行写入或验证。
- 面向用户的 auth 文档现在描述 `state/openclaw.sqlite#table/auth_profile_stores/<agentDir>`，而不是告诉用户检查或复制 `auth-profiles.json`；遗留的 OAuth/auth JSON 名称仅作为 doctor-import 输入被记录。
- 核心状态路径辅助函数不再暴露已弃用的 `credentials/oauth.json` 文件。遗留的文件名仅限于 doctor auth 导入路径。
- 安装、安全、新手引导、模型-auth 和 SecretRef 文档现在描述 SQLite auth-profile 行和全状态备份/迁移，而不是每个代理的 auth-profile JSON 文件。
- PI 模型发现现在将规范凭证传递到内存中的 `pi-coding-agent` auth 存储。它不再在发现期间创建、清理或写入每个 `auth.json`。
- Voice Wake 触发和路由设置现在使用类型化的共享 SQLite 表，而不是 `settings/voicewake.json`、`settings/voicewake-routing.json` 或不透明的通用行；doctor 导入遗留 JSON 文件并在成功迁移后将其删除。
- Update-check 状态现在使用类型化的共享 `update_check_state` 行，而不是 `update-check.json` 或不透明的通用 blob；doctor 导入遗留 JSON 文件并在成功迁移后将其删除。
- Config health 状态现在使用类型化的共享 `config_health_entries` 行，而不是 `logs/config-health.json` 或不透明的通用 blob；doctor 导入遗留 JSON 文件并在成功迁移后将其删除。
- 插件对话绑定批准现在使用类型化的 `plugin_binding_approvals` 行，而不是不透明的共享 SQLite 状态或 `plugin-binding-approvals.json`；遗留文件是 doctor 迁移的输入。
- 通用当前对话绑定现在存储类型化的 `current_conversation_bindings` 行，而不是重写 `bindings/current-conversations.json`；doctor 会导入旧版 JSON 文件并在成功迁移后将其删除。
- Memory Wiki 导入源同步账本现在为每个仓库/源键存储一个 SQLite 插件状态行，而不是重写 `.openclaw-wiki/source-sync.json`；迁移提供商会导入并删除旧的 JSON 账本。
- Memory Wiki ChatGPT 导入运行记录现在为每个仓库/运行 ID 存储一个 SQLite 插件状态行，而不是写入 `.openclaw-wiki/import-runs/*.json`。在导入运行快照归档移至 blob 存储之前，回滚快照仍保留为显式的仓库文件。
- Memory Wiki 编译摘要现在存储 SQLite 插件 blob 行，而不是写入 `.openclaw-wiki/cache/agent-digest.json` 和 `.openclaw-wiki/cache/claims.jsonl`。迁移提供商会导入旧的缓存文件，并在目录变空时将其删除。
- ClawHub 技能安装跟踪现在为每个工作区/技能存储一个 SQLite 插件状态行，而不是在运行时写入或读取 `.clawhub/lock.json` 和 `.clawhub/origin.json` 附属文件。运行时代码使用跟踪安装状态对象，而不是文件形状的锁文件/源抽象。Doctor 会从配置的代理工作区导入旧版附属文件，并在干净导入后将其删除。
- 已安装插件索引现在读取并写入类型化的共享 SQLite `installed_plugin_index` 单例行，而不是 `plugins/installs.json`；旧的 JSON 文件仅作为 doctor 迁移输入，并在导入后被删除。
- 旧的 `plugins/installs.json` 路径辅助函数现在位于 doctor 旧代码中。运行时插件索引模块仅公开基于 SQLite 的持久化选项，而非 JSON 文件路径。
- Gateway(网关) 重启标记、重启意图和主管交接状态现在使用类型化的共享 SQLite 行（`gateway_restart_sentinel`、`gateway_restart_intent` 和 `gateway_restart_handoff`），而不是通用不透明 blob。运行时重启代码没有文件形状的标记/意图/交接约定。
- Matrix 同步缓存、存储元数据、线程绑定、入站去重标记、启动验证冷却状态、SDK IndexedDB 加密快照、凭据和恢复密钥现在使用共享的 SQLite 插件状态/Blob 表。运行时路径结构不再暴露 Matrix`storage-meta.json`Matrix 元数据路径；该文件名仅作为旧版迁移的输入。其旧版 JSON 导入计划位于 Matrix 插件设置/doctor 迁移界面中。
- Matrix 启动时不再扫描、报告或完成旧版 Matrix 文件状态。Matrix 文件检测、旧版加密快照创建、房间密钥恢复迁移状态、导入和源移除均由 doctor 管理。
- Matrix 运行时迁移桶已被移除。旧版状态/加密检测和变更助手现在由 Matrix doctor 直接导入，而不再是运行时 MatrixMatrixAPI 表面的一部分。
- Matrix 迁移快照重用标记现在位于 SQLite 插件状态中，而不是 Matrix`matrix/migration-snapshot.json` 中；doctor 仍然可以重用同一个已验证的迁移前归档，而无需写入 sidecar 状态文件。
- Nostr 总线游标和配置文件发布状态现在使用共享的 SQLite 插件状态。其旧版 JSON 导入计划位于 Nostr 插件设置/doctor 迁移界面中。
- Active Memory 会话切换现在使用共享的 SQLite 插件状态，而不是 `session-toggles.json`；重新打开记忆会会删除该行，而不是重写 JSON 对象。
- Skill Workshop 提案和审查计数器现在使用共享的 SQLite 插件状态，而不是每个工作区的 `skill-workshop/<workspace>.json` 存储。每个提案是 `skill-workshop/proposals` 下的单独一行，审查计数器是 `skill-workshop/reviews` 下的单独一行。
- Skill Workshop 审查者子代理运行现在使用运行时会话转录解析器，而不是创建 `skill-workshop/<sessionId>.json` sidecar 会话路径。
- ACPX 进程租约现在使用 `acpx/process-leases` 下的共享 SQLite 插件状态，而不是全文件的 `process-leases.json` 注册表。每个租约作为单独的一行存储，在不需要运行时 JSON 重写路径的情况下保留了启动时的陈旧进程清理。
- ACPX 包装器脚本和独立的 Codex 主目录是在 OpenClaw 临时根目录中生成的。它们根据需要重新创建，并且不是备份或迁移的输入。
- 子代理运行注册表持久化使用类型化的共享 `subagent_runs` 行。旧的 `subagents/runs.json` 路径现在仅作为 doctor 迁移输入，并且运行时辅助名称不再将状态层描述为磁盘支持。运行时测试不再创建无效或空的 `runs.json` 固件来证明注册表行为；它们直接种子化/读取 SQLite 行。
- 备份在归档之前暂存状态目录，复制非数据库文件，使用 `VACUUM INTO` 快照 `*.sqlite` 数据库，省略实时的 WAL/SHM 侧车，在归档清单中记录快照元数据，并使用归档清单在 SQLite 中记录已完成的备份运行。`openclaw backup
create` validates the written archive by default; `--no-verify` 是显式的快速路径。
- `openclaw backup restore` 在提取之前验证归档，重用验证器的规范化清单，并将验证过的清单资源恢复到其记录的源路径。它需要 `--yes` 进行写入并支持 `--dry-run` 用于恢复计划。
- 旧的备份易失性路径过滤器已被删除。备份不再需要针对旧版会话或 cron JSON/JSONL 文件的 live-tar 跳过列表，因为 SQLite 快照是在归档创建之前暂存的。
- 普通设置和新手引导工作区准备不再创建 `agents/<agentId>/sessions/` 目录。它们仅创建 config/workspace；SQLite 会话行和转录行按需在每代理数据库中创建。
- 安全权限修复现在针对全局和每代理 SQLite 数据库以及 WAL/SHM 侧车，而不是 `sessions.json` 和转录 JSONL 文件。
- 沙箱注册表运行时名称现在直接描述 SQLite 注册表种类，而不是通过活动存储传递遗留的 JSON 注册表术语。
- `openclaw reset --scope config+creds+sessions` 会删除每个代理的 `openclaw-agent.sqlite` 数据库以及 WAL/SHM 副车（sidecars），而不仅仅是遗留的 `sessions/` 目录。
- Gateway(网关) 聚合会话助手现在使用面向条目的名称：Gateway(网关)`loadCombinedSessionEntriesForGateway` 返回 `{ databasePath, entries }`。旧的组合存储命名已从运行时调用者中移除。
- Docker MCP 渠道种子现在将会话主行和转录事件写入每个代理的 SQLite 数据库，而不是创建 Docker`sessions.json` 和 JSONL 转录文件。
- 捆绑的会话内存钩子现在通过 `{agentId, sessionId}` 从 SQLite 解析先前会话的上下文。它不再扫描、存储或合成转录路径或 `workspace/sessions` 目录。
- 捆绑的命令日志记录器钩子现在将命令审计行写入共享的 SQLite `command_log_entries` 表，而不是追加 `logs/commands.log`。
- 渠道配对允许列表现在仅在运行时和插件 SDK 中公开基于 SQLite 的读/写助手。旧的 `*-allowFrom.json` 路径解析器和文件读取器仅存在于 doctor 遗留导入代码下。
- `migration_runs` 记录遗留状态迁移执行，包括状态、时间戳和 JSON 报告。
- `migration_sources` 记录每个导入的遗留文件源，包括哈希、大小、记录数、目标表、运行 ID、状态和源移除状态。
- `backup_runs` 记录备份归档路径、状态和 JSON 清单。
- 全局架构不保留未使用的 `agents` 注册表。代理数据库发现是规范的 `agent_databases` 注册表，直到运行时拥有真正的代理记录所有者。
- 生成的模型目录配置存储在以代理目录为键的类型化全局 SQLite `agent_model_catalogs` 行中。运行时调用者使用 `ensureOpenClawModelCatalog`；运行时代码中没有 `models.json`API 兼容 API。该实现会写入 SQLite，嵌入式 PI 注册表从存储的负载中填充，而无需创建 `models.json` 文件。
- QMD 会话转录 Markdown 导出和 `memory.qmd.sessions` 配置已被移除。不存在 QMD 转录集合、没有 `qmd/sessions*` 运行时路径，也没有文件支持的会话内存桥。
- Memory-core 运行时从 `openclaw/plugin-sdk/memory-core-host-engine-session-transcripts` 导入 SQLite 转录索引助手，而不是从 QMD SDK 子路径。QMD 子路径仅保留兼容性重新导出，供外部调用者使用，直到主要的 SDK 清理工作可以将其移除。
- QMD 自己的 `index.sqlite` 现在是由主 SQLite `plugin_blob_entries` 表支持的临时运行时具体化。运行时不再创建持久的 `~/.openclaw/agents/<agentId>/qmd` 附属文件。
- 可选的 `memory-lancedb` 插件不再创建 `~/.openclaw/memory/lancedb`OpenClaw 作为由 OpenClaw 隐式管理的存储。它是一个外部 LanceDB 后端，在操作员配置显式的 `dbPath` 之前保持禁用状态。
- `check:database-first-legacy-stores` 会拒绝将传统存储名称与写入式文件系统 API 配对的新运行时源。它还会拒绝重新引入记录桥接合约（如 `transcriptLocator`、`sqlite-transcript://...`、`sessionFile` 或 `storePath`）的运行时源，并扫描测试中是否存在这些桥接合约名称。它还禁止 `SessionManager.open(...)` 和旧的静态 SessionManager 外观，以防止运行时和测试静默重新创建基于文件的会话开启器或文件时代的会话发现。它还禁止从导出 UI 使用旧的会话 JSONL 下载器 hook/class。它还禁止 sidecar 形状的插件状态/任务 SQLite 辅助名称；测试应该断言 `databasePath` 和共享的 `state/openclaw.sqlite` 位置，而不是假装这些功能拥有独立的 SQLite 文件。它还在运行时源中禁止旧的通用内存索引 SQL 表名称（`meta`、`files`、`chunks`、`chunks_vec`、`chunks_fts`、`embedding_cache`），以便代理数据库保持其显式的 `memory_index_*` 架构。它还禁止嵌入 TEXT 架构和嵌入 JSON 数组写入，以使向量保持紧凑的 SQLite BLOB 形式。迁移、doctor、导入和显式非会话导出代码仍然允许使用。该保护现在还覆盖运行时 `cache/*.json` 存储、通用 `thread-bindings.json` sidecars、cron 状态/运行日志 JSON、配置健康 JSON、重启和锁定 sidecars、语音唤醒设置、插件绑定批准、已安装插件索引 JSON、文件传输审计 JSONL、Memory Wiki 活动日志、旧的捆绑 `command-logger` 文本日志和 pi-mono 原始流 JSONL 诊断旋钮。它还禁止旧的根级 doctor 传统模块名称，以便兼容性代码保留在 `src/commands/doctor/` 下。Android 调试处理程序也使用 logcat/内存输出，而不是暂存 `camera_debug.log` 或 `debug_logs.txt` 缓存文件。

## 目标架构形状

保持模式显式。宿主拥有的运行时状态使用类型化表。插件拥有的不透明状态使用 `plugin_state_entries` / `plugin_blob_entries`；不存在通用的宿主 `kv` 表。

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

未来的搜索可以在不更改规范事件表的情况下添加 FTS 表：

```text
transcript_events_fts(session_id, seq, text)
vfs_entries_fts(namespace, path, text)
```

大值应使用 `blob` 列，而不是 JSON 字符串编码。对于必须能够使用普通 SQLite 工具进行检查的小型结构化数据，请保留 `value_json`。

`agent_databases` 是此分支的规范注册表。在存在真正的代理记录所有者之前，不要添加 `agents` 表；代理配置保留在 `openclaw.json` 中。

## Doctor 迁移形态

Doctor 应调用一个明确的、可报告且可安全重新运行的迁移步骤：

```bash
openclaw doctor --fix
```

`openclaw doctor --fix` 在常规配置预检后调用状态迁移实现，并在导入前创建经过验证的备份。运行时启动和 `openclaw migrate` 不得导入旧版 OpenClaw 状态文件。

迁移属性：

- 一次迁移传递会发现所有旧版文件源，并在更改任何内容之前生成一个计划。
- Doctor 在导入旧版文件之前会创建一个经过验证的迁移前备份存档。
- 导入是幂等的，并按源路径、mtime、大小、哈希和目标表建立索引。
- 在目标数据库提交后，成功的源文件将被移除或归档。
- 失败的导入使源保持不变，并在 `migration_runs` 中记录警告。
- 运行时代码仅在迁移存在后读取 SQLite。
- 不需要降级/导出到运行时文件的路径。

## 迁移清单

将这些移入全局数据库：

- 任务注册表运行时写入现在使用共享数据库；未发布的 `tasks/runs.sqlite` 侧车导入器已删除。快照保存按任务 ID 进行 upsert，并仅删除缺失的任务/交付行。
- 任务流运行时写入现在使用共享数据库；未发布的 `tasks/flows/registry.sqlite` 侧车导入器已删除。快照保存按流 ID 进行 upsert，并仅删除缺失的流行。
- 插件状态运行时写入现在使用共享数据库；未发布的 `plugin-state/state.sqlite` sidecar 导入器已被删除。
- 内置内存搜索不再默认为 `memory/<agentId>.sqlite`；其索引表位于所属代理数据库中，显式的 `memorySearch.store.path` sidecar 选择加入已迁移至 doctor 配置迁移。
- 内置内存重新索引仅重置代理数据库中内存拥有的表。它不得替换整个 SQLite 文件，因为同一个数据库拥有会话、转录、VFS 行、工件和运行时缓存。
- 沙箱容器/浏览器注册表来自整体和分片的 JSON。运行时写入现在使用共享数据库；保留了旧版 JSON 导入。
- Cron 作业定义、调度状态和运行历史现在使用共享 SQLite；doctor 导入/移除旧版 `jobs.json`、`jobs-state.json` 和 `cron/runs/*.jsonl` 文件。
- 设备身份/认证、推送、更新检查、承诺、OpenRouter 模型缓存、已安装插件索引和应用服务器绑定
- 设备/节点配对和引导记录现在使用类型化的 SQLite 表
- 设备配对通知订阅者和已传递请求标记现在使用共享 SQLite 插件状态表，而不是 `device-pair-notify.json`。
- 语音通话记录现在使用共享 SQLite 插件状态表，位于 `voice-call` / `calls` 命名空间下，而不是 `calls.jsonl`CLI；插件 CLI 尾随并汇总 SQLite 支持的通话历史。
- QQBot 网关会话、已知用户记录和引用索引引用缓存现在使用 `qqbot` 命名空间 (`sessions`、`known-users`、`ref-index`) 下的 SQLite 插件状态，而不是 `session-*.json`、`known-users.json` 和 `ref-index.jsonl`；QQBot doctor/setup 迁移导入并移除旧版文件。
- Discord 模型选择器首选项、命令部署哈希和线程绑定
  现在使用 Discord`discord` 命名空间下的 SQLite 插件状态
  (`model-picker-preferences`, `command-deploy-hashes`, `thread-bindings`)
  代替 `model-picker-preferences.json`, `command-deploy-cache.json` 和
  `thread-bindings.json`Discord；Discord doctor/setup 迁移会导入并
  删除这些旧文件。
- BlueBubbles 追赶光标和入站去重标记现在使用 SQLite 插件
  状态，位于 BlueBubbles`bluebubbles` 命名空间 (`catchup-cursors`, `inbound-dedupe`)
  之下，代替 `bluebubbles/catchup/*.json` 和
  `bluebubbles/inbound-dedupe/*.json`BlueBubbles；BlueBubbles doctor/setup 迁移
  会导入并删除这些旧文件。
- Telegram 更新偏移量、贴纸缓存条目、回复链消息缓存
  条目、已发送消息缓存条目、主题名称缓存条目和线程
  绑定现在使用 Telegram`telegram` 命名空间下的 SQLite 插件状态
  (`update-offsets`, `sticker-cache`, `message-cache`, `sent-messages`,
  `topic-names`, `thread-bindings`) 代替 `update-offset-*.json`,
  `sticker-cache.json`, `*.telegram-messages.json`,
  `*.telegram-sent-messages.json`, `*.telegram-topic-names.json` 和
  `thread-bindings-*.json`Telegram；Telegram doctor/setup 迁移会导入并
  删除这些旧文件。
- iMessage 追赶光标、回复短 ID 映射和发送回显去重行
  现在使用 iMessage`imessage` 命名空间下的 SQLite 插件状态 (`catchup-cursors`,
  `reply-cache`, `sent-echoes`) 代替 `imessage/catchup/*.json`,
  `imessage/reply-cache.jsonl` 和 `imessage/sent-echoes.jsonl`iMessage；iMessage
  doctor/setup 迁移会导入并删除这些旧文件。
- Microsoft Teams 会话、投票、委派令牌、待处理上传以及
  反馈学习现在使用 SQLite 插件状态/二进制大对象命名空间
  (Microsoft Teams`conversations`, `polls`, `delegated-tokens`, `pending-uploads`,
  `feedback-learnings`) 而非 `msteams-conversations.json`,
  `msteams-polls.json`, `msteams-delegated.json`,
  `msteams-pending-uploads.json` 和 `*.learnings.json`Microsoft Teams；Microsoft Teams
  doctor/setup 迁移会导入并删除这些旧文件。
- Matrix 同步缓存、存储元数据、线程绑定、入站去重标记、
  启动验证冷却状态、凭据、恢复密钥以及 SDK
  IndexedDB 加密快照现在使用 Matrix`matrix` 下的 SQLite 插件状态/二进制大对象命名空间
  (`sync-store`, `storage-meta`, `thread-bindings`, `inbound-dedupe`,
  `startup-verification`, `credentials`, `recovery-key`, `idb-snapshots`)
  代替 `bot-storage.json`, `storage-meta.json`, `thread-bindings.json`,
  `inbound-dedupe.json`, `startup-verification.json`, `credentials.json`,
  `recovery-key.json` 和 `crypto-idb-snapshot.json`MatrixMatrix；Matrix doctor/setup
  迁移会从账户范围的 Matrix
  存储根目录导入并删除那些旧文件。
- Nostr 总线游标和资料发布状态现在使用 Nostr`nostr` 命名空间下的 SQLite 插件状态
  (`bus-state`, `profile-state`) 而非
  `bus-state-*.json` 和 `profile-state-*.json`Nostr；Nostr doctor/setup
  迁移会导入并删除这些旧文件。
- Active Memory 会话开关现在使用 `active-memory/session-toggles` 下的 SQLite 插件状态
  而非 `session-toggles.json`。
- Skill Workshop 提案队列和审查计数器现在使用 `skill-workshop/proposals` 和 `skill-workshop/reviews` 下的 SQLite 插件状态，而不是每个工作区的 `skill-workshop/<workspace>.json` 文件。
- 出站投递和会话投递队列现在在单独的队列名称（`outbound-delivery`、`session-delivery`）下共享全局 SQLite `delivery_queue_entries` 表，而不是持久的 `delivery-queue/*.json`、`delivery-queue/failed/*.json` 和 `session-delivery-queue/*.json` 文件。doctor legacy-state 步骤会导入待处理和失败的行，移除陈旧的已投递标记，并在导入后删除旧的 JSON 文件。热路由和重试字段是类型化列；JSON 有效负载仅保留用于重放/调试。
- ACPX 进程租约现在使用 `acpx/process-leases` 下的 SQLite 插件状态，而不是 `process-leases.json`。
- 备份和迁移运行元数据

将这些内容移入代理数据库：

- 代理会话根目录和兼容性形状的会话条目有效负载。已完成运行时写入：热会话元数据可在 `sessions` 中查询，而旧形状的完整 `SessionEntry` 有效负载仍保留在 `session_entries` 中。
- 代理转录事件。已完成运行时写入。
- 压缩检查点和转录快照。已完成运行时写入：检查点转录副本是 SQLite 转录行，检查点元数据记录在 `transcript_snapshots` 中。Gateway(网关) 检查点辅助程序现在将这些值命名为转录快照，而不是源文件。
- 代理 VFS 临时/工作区命名空间。已完成运行时 VFS 写入。
- 子代理附件有效负载。已完成运行时写入：它们是 SQLite VFS 种子条目，绝非持久化工作区文件。
- 工具构件。已完成运行时写入。
- 运行构件。已完成工作程序运行时通过每代理 `run_artifacts` 表的写入。
- 代理本地运行时缓存。已完成工作程序运行时通过每代理 `cache_entries` 表的作用域缓存写入。Gateway(网关) 范围的模型缓存保留在全局数据库中，除非它们变为代理特定的。
- ACP 父流日志。运行时写入已完成。
- ACP 重放账本会话。运行时写入通过 `acp_replay_sessions` 和 `acp_replay_events` 完成；旧版 `acp/event-ledger.json` 仅作为 doctor 输入保留。
- ACP 会话元数据。运行时写入通过 `acp_sessions` 完成；`sessions.json` 中的旧版 `entry.acp` 块仅作为 doctor 迁移输入。
- 非显式导出文件时的轨迹侧车。运行时写入已完成：轨迹捕获写入 agent-database `trajectory_runtime_events` 行并将运行范围产物镜像到 SQLite。旧版侧车仅作为 doctor 导入输入；导出可以实现新的 JSONL support-bundle 输出，但在运行时不读取或迁移旧的轨迹/转录侧车。运行时轨迹捕获公开 SQLite 范围；JSONL 路径助手仅限于导出/调试支持，不会从运行时模块重新导出。嵌入式运行器轨迹元数据记录 `{agentId, sessionId, sessionKey}` 标识，而不是持久化转录定位器。

暂时保留这些文件支持：

- `openclaw.json`
- CLI 或 CLI 凭据文件
- 插件/包清单
- 用户工作区和 Git 仓库（当选择磁盘模式时）
- 供操作员跟踪的日志，除非特定的日志界面被移动

## 迁移计划

### 阶段 0：冻结边界

在移动更多行之前，使持久状态边界显式化：

- 向全局数据库添加 `migration_runs` 表。
  旧版状态迁移执行报告已完成。
- 添加一个由 doctor 拥有的状态迁移服务，用于文件到数据库的导入。
  完成：`openclaw doctor --fix` 使用旧版状态迁移实现。
- 将 `plan` 设为只读，并让 `apply` 创建备份、导入、验证，然后删除或隔离旧文件。
  完成：doctor 创建一个经过验证的预迁移备份，将备份路径传递给 `migration_runs`，并重用导入器/删除路径。
- 添加静态禁令，以便新的运行时代码无法写入旧的状态文件，同时迁移代码和测试仍可以填充/读取这些文件。
  已完成当前迁移的旧存储；守卫还会扫描嵌套测试以查找禁止的运行时记录定位器合约。

### 阶段 1：完成全局控制平面

将共享协调状态保持在 `state/openclaw.sqlite` 中：

- 代理和代理数据库注册表
- 任务和任务流账本
- 插件状态
- 沙箱容器/浏览器注册表
- Cron/调度器运行历史
- 配对、设备、推送、更新检查、TUI、OpenRouter/模型缓存以及其他
  小型网关范围的运行时状态
- 备份和迁移元数据
- Gateway(网关) 媒体附件字节。运行时写入已完成；直接文件路径
  是为了与渠道发送器和沙箱
  暂存兼容的临时具体化。运行时允许列表接受 SQLite 具体化路径，而不是旧的
  状态/配置媒体根。Doctor 将旧媒体文件导入
  `media_blobs` 并在成功写入行后删除源文件。
- 调试代理捕获会话、事件和负载 Blob。已完成：捕获通过
  共享状态 DB 启动、架构、
  WAL 和忙超时设置在共享状态 DB 中实时进行并进行打开。没有调试代理运行时 Sidecar DB
  覆盖、blob 目录或仅代理捕获生成的架构/代码生成
  目标。

此阶段还从这些子系统中删除重复的 Sidecar 打开器、权限助手、WAL
设置、文件系统修剪和兼容性写入器。

### 阶段 2：引入每个代理的数据库

为每个代理创建一个数据库并从全局数据库注册它：

```text
~/.openclaw/state/openclaw.sqlite
~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite
```

全局 `agent_databases` 行存储路径、架构版本、最后查看
时间戳以及基本的大小/完整性元数据。运行时代码向注册表请求
代理数据库，而不是直接推导文件路径。

代理数据库拥有：

- `sessions` 作为规范会话根，`session_entries` 作为
  附加到该根的兼容性形式的负载表，以及
  `session_routes` 作为唯一的活动 `session_key` 查找
- `conversations` 和 `session_conversations` 作为附加到会话的规范化提供商
  路由标识
- `transcript_events`
- 转录快照和压缩检查点。已完成运行时写入。
- `vfs_entries`
- `tool_artifacts` 和运行产物
- 代理本地运行时/缓存行。已完成工作线程作用域缓存。
- ACP 父级流事件
- 轨迹运行时事件（当它们不是显式导出产物时）

### 第 3 阶段：替换会话存储 API

运行时已完成。文件型会话存储接口不是活动的
运行时契约：

- 运行时不再调用 `loadSessionStore(storePath)` 或将 `storePath` 视为
  会话标识。
- 运行时行操作为 `getSessionEntry`、`upsertSessionEntry`、
  `patchSessionEntry`、`deleteSessionEntry` 和 `listSessionEntries`。
- 全存储重写助手、文件写入器、队列测试、别名修剪和
  传统键删除参数已从运行时移除。
- 已弃用的根包兼容性导出仍将规范化的
  `sessions.json` 路径适配到 SQLite 行 API。
- `sessions.json` 解析仅保留在医生迁移/导入代码和
  医生测试中。
- 运行时生命周期回退读取 SQLite 转录头，而非 JSONL 首
  行。

继续删除任何重新引入文件锁参数、
修剪/截断即文件维护术语、存储路径标识或仅断言 JSON 持久化
的测试的内容。

### 第 4 阶段：迁移转录、ACP 流、轨迹和 VFS

使每个代理数据流都具备数据库原生特性：

- 转录追加写入通过一个 SQLite 事务完成，该事务确保
  会话头，检查消息幂等性，选择父尾部，插入到
  `transcript_events`，并在 `transcript_event_identities` 中记录可查询的标识元数据。
  已针对直接转录消息追加和正常持久化的 `TranscriptSessionManager` 追加完成；显式分支
  操作保留其显式父级选择，并仍然写入 SQLite 行
  而不派生任何文件定位符。
- ACP 父流日志变为行，而不是 `.acp-stream.jsonl` 文件。已完成。
- ACP 生成设置不再持久化转录 JSONL 路径。已完成。
- 运行时轨迹捕获直接写入事件行/工件。显式
  支持/导出命令仍可生成支持包 JSONL 工件作为
  导出格式，但会话导出不会重新创建会话 JSONL。已完成。
- 磁盘工作区在配置为磁盘模式时保留在磁盘上。
- VFS 临时文件和实验性纯 VFS 工作区模式使用代理数据库。

迁移导入一次旧的 JSONL 文件，在
`migration_runs` 中记录计数/哈希，并在完整性检查后删除已导入的文件。

### 阶段 5：备份、恢复、清理和验证

备份仍为一个归档文件：

- 对每个全局和代理数据库进行检查点操作。
- 使用 SQLite 备份语义或 `VACUUM INTO` 对每个数据库进行快照。
- 归档压缩的数据库快照、配置、外部凭据和请求的
  工作区导出。
- 省略原始实时 `*.sqlite-wal` 和 `*.sqlite-shm` 文件。
- 通过打开每个数据库快照并运行 `PRAGMA integrity_check` 来验证。
  `openclaw backup create` 默认执行此归档验证；
  `--no-verify` 仅跳过写入后归档传递，而不跳过快照
  创建完整性检查。
- 恢复将快照复制回其目标路径。此分支将
  未发布的 SQLite 布局重置为 `user_version = 1`；未来的已发布架构更改
  可以在需要时添加显式迁移。

### 阶段 6：Worker 运行时

在数据库拆分落地期间，保持 worker 模式为实验性：

- Worker 接收代理 ID、运行 ID、文件系统模式和 DB 注册身份。
- 每个 worker 打开自己的 SQLite 连接。
- 父级保留渠道传递、审批、配置和取消权限。
- 从每个活动运行一个 worker 开始；仅在生命周期和 DB
  连接所有权稳定后添加池化。

### 阶段 7：删除旧世界

运行时会话管理已完成。旧世界仅允许作为显式
doctor 输入或支持/导出输出：

- 没有运行时 `sessions.json`、转录 JSONL、沙箱注册表 JSON、任务
  附属 SQLite 或插件状态附属 SQLite 写入。
- 不进行 JSON/会话文件清理、文件转录截断、会话文件锁或锁形式的会话测试。
- 不存在旨在保持旧会话文件为最新状态的运行时兼容性导出。
- 显式支持导出保留用户请求的归档/具体化格式，且绝不能将文件名反馈回运行时标识。

## 备份与恢复

备份应为一个归档文件，但数据库捕获应基于 SQLite 原生方式：

1. 停止长时间运行的写入活动或进入短暂的备份屏障。
2. 对每个全局数据库和代理数据库运行检查点。
3. 使用 SQLite 备份语义或 `VACUUM INTO` 将每个数据库快照到临时备份目录。
4. 归档压缩后的数据库快照、配置文件、凭据目录、选定的工作区以及清单。
5. 通过打开每个包含的 SQLite 快照并运行 `PRAGMA integrity_check` 来验证归档。`openclaw backup create` 默认执行此操作；`--no-verify` 仅用于有意跳过写入后归档通过的情况。

不要依赖原始的实时 `*.sqlite`、`*.sqlite-wal` 和 `*.sqlite-shm` 副本作为主要备份格式。归档清单应记录数据库角色、代理 ID、架构版本、源路径、快照路径、字节大小和完整性状态。

恢复应从归档快照重建全局数据库和代理数据库文件。由于 SQLite 布局尚未发布，此重构仅保留 version-1 架构以及 doctor 文件到数据库的导入。恢复命令首先验证归档，然后从验证后的提取负载中替换每个清单资产。

## 运行时重构计划

1. 添加数据库注册表 API。
   - 解析全局数据库和每个代理的数据库路径。
   - 将未发布的架构保留在 `user_version = 1`；在已发布的架构需要之前，不要添加架构迁移运行器代码。
   - 添加测试、备份和 doctor 使用的 close/checkpoint/integrity 辅助函数。

2. 合并侧车 SQLite 存储。
   - 将插件状态表移动到全局数据库。运行时写入已完成；未发布的遗留侧车导入器已删除。
   - 将任务注册表表移至全局数据库。运行时写入已完成；未发布的旧版 sidecar 导入器已删除。
   - 将 Task Flow 表移至全局数据库。运行时写入已完成；未发布的旧版 sidecar 导入器已删除。
   - 将内置 memory-search 表移至每个代理的数据库中。已完成；通过 doctor 配置迁移，现在已移除显式自定义 `memorySearch.store.path`。完全重新索引仅针对内存表就地运行；旧的整文件交换路径和 sidecar 索引交换辅助工具已删除。
   - 从这些子系统中删除重复的数据库开启器、WAL 设置、权限辅助工具和关闭路径。

3. 将代理拥有的表移至每个代理的数据库中。
   - 通过全局数据库注册表按需创建代理数据库。已完成。
   - 将运行时会话条目、转录事件、VFS 行和工具制品移至代理数据库。已完成。
   - 不要迁移分支本地共享数据库会话条目、转录事件、VFS 行或工具制品；该布局从未发布。在 doctor 中仅保留旧的文件到数据库导入功能。

4. 替换会话存储 API。
   - 移除 `storePath` 作为运行时标识。已在运行时完成并由 `check:database-first-legacy-stores`CLI 保护：会话元数据、路由更新、命令持久化、CLI 会话清理、Feishu 推理预览、转录状态持久化、子代理深度、auth 配置文件会话覆盖、父分支逻辑和 QA 实验室检查现在从规范的 agent/会话 键解析数据库。Gateway(网关)/TUImacOS/UI/macOS 会话列表响应现在公开 `databasePath` 而不是遗留的 `path`；macOS 调试表面显示每个代理的数据库为只读状态，而不是写入 `session.store` 配置。`/status`CLI、聊天驱动的轨迹导出和 CLI 依赖代理不再传播遗留的存储路径；转录使用回退通过代理/会话标识读取 SQLite。运行时和桥接测试不再公开 `storePath`Gateway(网关)；doctor/migration 输入拥有该遗留字段名称。Gateway 组合会话加载不再为非模板化的 `session.store` 值具有特殊的运行时分支；它聚合每个代理的 SQLite 行。遗留的会话锁定 doctor 通道及其 `.jsonl.lock` 清理助手已被移除；SQLite 现在是会话并发边界。热运行时调用站点使用面向行的助手名称，例如 `resolveSessionRowEntry`；旧的 `resolveSessionStoreEntry` 兼容性别名已从运行时和插件 SDK 导出中移除。

- 使用 `{ agentId, sessionKey }` 行操作。完成：`getSessionEntry`、`upsertSessionEntry`、`deleteSessionEntry`、`patchSessionEntry` 和 `listSessionEntries` 是 SQLite 优先的 API，不需要会话存储路径。状态摘要、本地代理状态、健康状况和 `openclaw sessions` 列出命令现在直接读取每个代理的行，并显示每个代理的 SQLite 数据库路径，而不是 `sessions.json` 路径。
- 用 `upsertSessionEntry`、`deleteSessionEntry`、`listSessionEntries` 和 SQL 清理查询替换全量存储的删除/插入操作。运行时已完成：热路径现在使用行 API 和冲突重试的行修补；剩余的全量存储导入/替换辅助函数仅限于迁移导入代码和 SQLite 后端测试。
  - 删除 `store-writer.ts` 和 writer-queue 测试。已完成。
  - 从会话行的 upsert/patch 中删除运行时 legacy-key 修剪和 alias-delete 参数。已完成。

5. 删除运行时 JSON 注册表行为。
   - 使沙箱注册表的读写仅限 SQLite。已完成。
   - 仅从迁移步骤导入整体和分片的 JSON。已完成。
   - 移除分片注册表锁和 JSON 写入。已完成。

- 如果形状保持为热路径操作状态，则保留一个类型化注册表表，而不是将注册表行存储为通用不透明 JSON。已完成。

6. 删除文件锁形式的会话变更。
   - 运行时锁创建和运行时锁 API 已完成。
   - 独立的旧版 `.jsonl.lock` doctor 清理通道已被移除。
   - `session.writeLock` 是 doctor 迁移的旧版配置，而非类型化的运行时设置。
   - 状态完整性不再有单独的孤立转录文件修剪路径；doctor 迁移在一处导入/移除旧版 JSONL 源。
   - Gateway(网关) 单例协调使用 `gateway_locks` 下的类型化 SQLite Gateway(网关)`state_leases` 行，不再暴露文件锁目录接缝。
   - 通用插件 SDK 去重持久化不再使用文件锁或 JSON 文件；它写入共享的 SQLite 插件状态行。已完成。
   - QMD 嵌入协调使用 SQLite 状态租约代替 `qmd/embed.lock`。已完成。

7. 使 worker 感知数据库。
   - Worker 打开自己的 SQLite 连接。
   - 父级拥有交付、渠道回调和配置。
   - Worker 接收代理 id、运行 id、文件系统模式和 DB 注册表身份，而不是实时句柄。
   - `vfs-only` 保持实验性，并使用代理数据库作为其存储根。
   - 首先保持每个活动运行一个 worker。连接池可以等到 DB 连接生命周期和取消行为不再棘手时再进行。

8. 备份集成。
   - 教会备份通过 SQLite 备份或
     `VACUUM INTO` 对全局和代理数据库进行快照。已完成状态资产下发现的 `*.sqlite` 文件的处理。
   - 增加 SQLite 完整性和架构版本的备份验证。已完成
     备份创建和默认归档验证完整性检查。
   - 在 SQLite 中记录备份运行元数据。通过共享的 `backup_runs`
     表完成，其中包含归档路径、状态和清单 JSON。
   - 添加从已验证的归档快照进行恢复的功能。已完成：`openclaw backup
restore` 在提取前进行验证，使用验证器的标准化
     清单，支持 `--dry-run`，并且在替换
     记录的源路径之前需要 `--yes`。
   - 仅在请求时包含 VFS/工作区导出；不要将会话
     内部导出为 JSON 或 JSONL。

9. 删除过时的测试和代码。已针对已知的运行时会话表面完成。

- 移除断言运行时创建 `sessions.json` 或转录 JSONL 文件的测试。核心会话存储、聊天、网关转录事件、预览、生命周期、命令会话条目更新、自动回复重置/跟踪、memory-core 设备 fixture、批准目标路由、会话转录修复、安全权限修复、轨迹导出和会话导出的此项工作已完成。Active-memory 转录测试现在断言 SQLite 范围，并且不创建临时或持久化的 JSONL 文件。旧的 heartbeat transcript-pruning 回归测试已被移除，因为运行时不再截断 JSONL 转录。Agent 会话-list 工具测试不再将旧版 `sessions.json`macOS 路径建模为网关响应形状；app/UI/macOS 测试使用 `databasePath`。`/status`Gateway(网关) 转录使用测试现在直接植入 SQLite 转录行，而不是写入 JSONL 文件。Gateway 会话生命周期测试现在直接使用 SQLite 转录植入辅助程序；旧的单行会话文件 fixture 形状已从重置和删除覆盖范围中消失。`sessions.delete` 不再返回文件时代的 `archived: []` 字段；删除操作仅报告行变更结果。旧的 `deleteTranscript` 选项也已消失：删除会话会移除规范的 `sessions` 根，并让 SQLite 级联删除会话拥有的转录、快照和轨迹行，因此调用者不会留下转录孤立行或忘记清理分支。Context-engine 轨迹捕获测试现在从隔离的代理数据库读取 `trajectory_runtime_events` 行，而不是读取 `session.trajectory.jsonl`Docker。Docker MCP 渠道种子脚本现在直接植入 SQLite 行。直接的 `sessions.json`Gateway(网关) 写入仅限于 doctor fixture。Tool Search Gateway E2E 从 SQLite 转录行读取工具调用证据，而不是扫描 `agents/<agentId>/sessions/*.jsonl` 文件。Memory-core 主机事件和会话语料库临时行现在位于共享的 SQLite 插件状态中；`events.jsonl` 和 `session-corpus/*.txt` 仅作为旧版 doctor 迁移输入。活动行使用 `memory/session-ingestion/` 虚拟路径，而不是 `.dreams/session-corpus`CLIGateway(网关)。旧的 memory-core dreaming 修复模块及其 CLI/Gateway 测试已被移除，因为运行时不再拥有该语料库的文件归档修复。Memory-core bridge/public-artifact 测试不再公开 `.dreams/events.jsonl`；它们使用 SQLite 支持的虚拟 JSON 工件名称。Public SDK/Codex 测试文档现在使用 SQLite 会话状态而不是会话文件，并且 渠道-turn 示例不再公开 `storePath`Matrix 参数。Matrix 同步状态现在直接使用 SQLite 插件状态存储。活动的客户端/运行时合约传递帐户存储根，而不是 `bot-storage.json` 路径，并且 doctor 在删除源之前将旧版 `bot-storage.json`Matrix 导入 SQLite。QA Matrix 重启/破坏性场景现在直接变更 SQLite 同步行，而不是创建或删除假的 `bot-storage.json` 文件，并且 E2EE 基板传递同步存储根而不是假的 `sync-store.json`Matrix 路径。Matrix 存储根选择不再通过旧版同步/线程 JSON 文件对根进行评分；它使用持久根元数据和真实的加密状态。运行时 SQLite 会话后端测试套件不再伪造 `sessions.json`Gateway(网关)；旧版源 fixture 现在位于导入它们的 doctor 测试中。Gateway 会话测试不再公开 `createSessionStoreDir`Microsoft TeamsTelegram 辅助程序或未使用的临时会话存储路径设置；fixture 目录是显式的，并且直接行设置使用 SQLite 会话行命名。仅限 Doctor 的 JSON5 会话存储解析器覆盖范围已从 infra 测试移至 doctor 迁移测试，因此运行时测试套件不再拥有旧版会话文件解析。Microsoft Teams 运行时 SSO/待上传测试不再携带 JSON 附属 fixture 或解析器；旧版 SSO 令牌解析仅存在于插件迁移模块中。Telegram 测试不再植入假的 `/tmp/*.json`OpenClaw 存储路径；它们直接重置 SQLite 支持的消息缓存。通用 OpenClaw 测试状态辅助程序不再公开旧版 `auth-profiles.json`TUIMatrixiMessage 编写器；doctor 身份验证迁移测试在本地拥有该 fixture。用于 TUI 上次会话指针、执行批准、active-memory 切换、Matrix 去重/启动验证、Memory Wiki 源同步、当前对话绑定、新手引导身份验证和 Hermes 密钥导入的运行时测试不再制造旧的附属文件或断言旧文件名不存在。它们通过 SQLite 行和公共存储 API 证明行为；doctor/迁移测试是旧版源文件名唯一所属的地方。用于设备/节点配对、渠道 allowFrom、重启意图、重启切换、会话传递队列条目、配置运行状况、iMessage 缓存、cron 作业、PI 转录头、子代理注册表和托管图像附件的运行时测试也不再创建已弃用的 JSON/JSONL 文件来证明它们被忽略或不存在。PI 溢出恢复不再具有 SessionManager 重写/截断后备：工具结果截断和上下文引擎转录重改变更 SQLite 转录行，然后从数据库刷新活动提示状态。持久化的 SessionManager 消息追加委托给原子 SQLite 转录追加辅助程序，用于父选择和幂等性。正常的元数据/自定义条目追加也会在 SQLite 内部选择当前父级，因此过时的管理器实例不会复活 pre-SQLite 父链竞争。用于中途转弯前检查和 `sessions_yield` 的合成 PI 尾部清理现在直接修剪 SQLite 转录状态；旧的 SessionManager 尾部移除桥及其测试已被删除。压缩检查点捕获也仅从 SQLite 快照；调用者不再传递实时 SessionManager 作为备用转录源。
- 保留仅用于迁移的遗留文件测试。
- 活跃运行时表面的 JSON 文件证明已被 SQL 行证明替代。

- 添加针对遗留会话/缓存 JSON 路径运行时写入的静态禁令。
  已针对仓库守卫完成。

10. 使迁移报告可审计。
    - 在 SQLite 中记录迁移运行，包含开始/完成时间戳、源路径、
      源哈希、计数、警告和备份路径。
      已完成：legacy-state 迁移执行现在会持久化一个 `migration_runs`
      报告，其中包含源路径/表清单、源文件 SHA-256、大小、
      记录计数、警告和备份路径。
      已完成：legacy-state 迁移执行还会持久化 `migration_sources`
      行，用于源级别审计和未来的跳过/回填决策。
    - 使应用具有幂等性。在部分导入后重新运行应跳过
      已导入的源或通过稳定键进行合并。
      已完成：会话索引、记录、传递队列、插件状态、任务
      分类账和代理拥有的全局 SQLite 行通过稳定键或
      upsert/replace 语义导入，因此重新运行会合并而不会重复持久化
      行。
    - 导入失败必须保留原始源文件。
      已完成：失败的记录导入现在会将原始 JSONL 源保留在其
      检测到的路径中，并且 `migration_sources` 将源记录为
      `warning` 并带有 `removed_source=0`，以便下次 doctor 运行时处理。

## 性能规则

- 每个线程/进程一个连接是可以的；不要在工作进程之间共享句柄。
- 使用 WAL、`foreign_keys=ON`、30 秒繁忙超时和简短的 `BEGIN IMMEDIATE`
  写入事务。
- 保持写入事务辅助函数同步，除非/直到异步事务 API 添加了显式互斥/背压语义。
- 保持父级传递写入简短和事务性。
- 避免全存储重写；使用行级 upsert/delete。
- 在移动热代码之前，为按代理列出的列表、按会话列出的列表、更新时间、运行 ID 和
  过期路径添加索引。
- 将大型制品、媒体和向量存储为 BLOB 或分块 BLOB 行，而
  不是 base64 或数字数组 JSON。
- 保持不透明的插件状态条目简小且范围受限。
- 添加用于 TTL/过期的 SQL 清理，而不是文件系统修剪。
  已针对数据库拥有的运行时存储完成：媒体、插件状态、插件 Blob、
  持久化去重和代理缓存均通过 SQLite 行过期。剩余的
  文件系统清理仅限于临时实体化或显式删除命令。

## 静态禁令

添加一个仓库检查，禁止向遗留状态路径进行新的运行时写入：

- `sessions.json`
- `*.trajectory.jsonl` 除了实体化的 support-bundle 输出
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
- Memory-core `.dreams/events.jsonl`
- Memory-core `.dreams/session-corpus/`
- Memory-core `.dreams/daily-ingestion.json`
- Memory-core `.dreams/session-ingestion.json`
- Memory-core `.dreams/short-term-recall.json`
- Memory-core `.dreams/phase-signals.json`
- Memory-core `.dreams/short-term-promotion.lock`
- Skill Workshop `skill-workshop/<workspace>.json`
- Skill Workshop `skill-workshop/skill-workshop-review-*.json`
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
- 原生 Hook 中继 `/tmp` 网桥 JSON 文件
- `plugin-state/state.sqlite`
- 临时的 `openclaw-state.sqlite` 运行时 sidecars
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
- Memory Wiki `.openclaw-wiki/log.jsonl`
- Memory Wiki `.openclaw-wiki/state.json`
- Memory Wiki `.openclaw-wiki/locks/`
- Memory Wiki `.openclaw-wiki/source-sync.json`
- Memory Wiki `.openclaw-wiki/import-runs/*.json`
- Memory Wiki `.openclaw-wiki/cache/agent-digest.json`
- Memory Wiki `.openclaw-wiki/cache/claims.jsonl`
- ClawHub `.clawhub/lock.json`
- ClawHub `.clawhub/origin.json`
- Browser profile decoration `.openclaw-profile-decorated`
- `SessionManager.open(...)` 文件支持的会话开启器
- `SessionManager.listAll(...)` 和 `TranscriptSessionManager.listAll(...)`
  转录列表外观
- `SessionManager.forkFromSession(...)` 和
  `TranscriptSessionManager.forkFromSession(...)` 转录分支外观
- `SessionManager.newSession(...)` 和 `TranscriptSessionManager.newSession(...)`
  可变会话替换外观
- `SessionManager.createBranchedSession(...)` 和
  `TranscriptSessionManager.createBranchedSession(...)` 分支会话外观

该禁令应允许测试创建遗留装置，并允许迁移代码读取/导入/删除遗留文件源。未交付的 SQLite 侧车文件仍保持禁用状态，且不会获得 doctor 导入许可。

## 完成标准

- 运行时数据和缓存写入应进入全局或代理 SQLite 数据库。
- 运行时不再写入会话索引、转录 JSONL、沙盒注册表
  JSON、任务侧车 SQLite 或插件状态侧车 SQLite。未交付的任务
  和插件状态侧车 SQLite 导入器将被删除。
- 遗留文件导入仅限 doctor 使用。
- 备份生成一个包含紧凑 SQLite 快照和完整性证明的归档文件。
- Agent 工作进程可以使用磁盘、VFS 临时存储或实验性的仅 VFS 存储运行。
- 配置和显式的凭据文件仍然是唯一预期的持久化非数据库控制文件。
- 代码仓库检查可防止重新引入旧的运行时文件存储。
