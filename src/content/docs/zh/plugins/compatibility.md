---
summary: "插件兼容性约定、弃用元数据和迁移预期"
title: "插件兼容性"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw 在移除较旧的插件协议之前，通过命名兼容性适配器保持其连接。这可以在 SDK、清单、设置、配置和代理运行时协议演进的同时，保护现有的捆绑和外部插件。

## 兼容性注册表

插件兼容性约定在核心注册表 `src/plugins/compat/registry.ts` 中进行跟踪。

每条记录包含：

- 稳定的兼容性代码
- status：`active`、`deprecated`、`removal-pending` 或 `removed`
- 所有者：SDK、配置、设置、渠道、提供商、插件执行、代理运行时或核心
- 适用时的引入和弃用日期
- 替换指导
- 涵盖旧行为和新行为的文档、诊断和测试

该注册表是维护者规划和未来插件检查的来源。如果插件面向的行为发生更改，请在添加适配器的同一更改中添加或更新兼容性记录。

Doctor 修复和迁移兼容性在 `src/commands/doctor/shared/deprecation-compat.ts` 中单独跟踪。这些记录涵盖旧的配置结构、安装账本布局和修复垫片，这些在运行时兼容性路径移除后可能仍需保持可用。

发布清理应检查两个注册表。不要仅仅因为匹配的运行时或配置兼容性记录过期就删除 doctor 迁移；首先验证没有支持的升级路径仍然需要该修复。此外，在发布期间重新验证每个替换注释，因为当提供商和渠道移出核心时，插件所有权和配置范围可能会发生变化。

## 插件检查器包

插件检查器应位于核心 OpenClaw 仓库之外，作为一个单独的包/仓库，由版本化的兼容性和清单协议支持。

第一天的 CLI 应该是：

```sh
openclaw-plugin-inspector ./my-plugin
```

它应该发出：

- 清单/架构验证
- 正在检查的协议兼容性版本
- 安装/源元数据检查
- 冷路径导入检查
- 弃用和兼容性警告

使用 `--json`OpenClaw 在 CI 注释中获取稳定的机器可读输出。OpenClaw 核心应公开检查器可以使用的约定和装置，但不应从主要的 `openclaw` 包中发布检查器二进制文件。

### 维护者验收通道

在针对 OpenClaw 插件包验证外部检查器时，请使用由 Crabbox 支持的 Blacksmith Testbox 作为可安装包验收通道。
在包构建完成后，请从干净的 OpenClaw 检出副本中运行它：

```sh
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "pnpm install && pnpm build && npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/telegram --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- ./extensions/discord --json"
pnpm crabbox:run -- --provider blacksmith-testbox --timing-json --shell -- "npm exec --yes @openclaw/plugin-inspector@0.1.0 -- <clawhub-plugin-dir> --json"
```

将此通道设为维护者可选，因为它会安装外部 npm 包，并且可能会检查在仓库外克隆的插件包。本地仓库守卫涵盖 SDK 导出映射、兼容性注册表元数据、已弃用的 SDK 导入缩减以及捆绑扩展导入边界；Testbox 检查器证明涵盖外部插件作者使用的包。

## 弃用策略

OpenClaw 不应在引入替换方案的同一发布版本中移除已记录的插件约定。

迁移序列如下：

1. 添加新约定。
2. 通过命名兼容性适配器保持旧行为的连接。
3. 当插件作者可以采取措施时，发出诊断或警告。
4. 记录替换方案和时间表。
5. 同时测试旧路径和新路径。
6. 等待宣布的迁移窗口期结束。
7. 仅在获得明确的破坏性版本发布批准后移除。

已弃用的记录必须包含警告开始日期、替换项、文档链接，以及最终移除日期（不得超过警告开始后的三个月）。除非维护者明确决定这是永久兼容性并将其标记为 `active`，否则不要添加开放移除窗口的已弃用兼容性路径。

## 当前兼容性领域

当前的兼容性记录包括：

- 传统的广泛 SDK 导入，例如 `openclaw/plugin-sdk/compat`
- 传统的仅限 Hook 的插件形状和 `before_agent_start`
- 传统的 `activate(api)` 插件入口点，同时插件迁移到
  `register(api)`
- 传统的 SDK 别名，例如 `openclaw/extension-api`、
  `openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth`
  状态构建器、`openclaw/plugin-sdk/test-utils`（已被专注的
  `openclaw/plugin-sdk/*` 测试子路径取代），以及 `ClawdbotConfig` /
  `OpenClawSchemaType` 类型别名
- 捆绑插件允许列表和启用行为
- 传统的提供商/渠道环境变量清单元数据
- 传统的提供商插件 Hook 和类型别名，同时提供商迁移到
  显式的目录、身份验证、思考、重放和传输 Hook
- 传统的运行时别名，例如 `api.runtime.taskFlow`、
  `api.runtime.subagent.getSession`、`api.runtime.stt` 以及已弃用的
  `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- 传统的内存插件拆分注册，同时内存插件迁移到
  `registerMemoryCapability`
- 针对原生消息架构、提及门控、入站信封格式和审批功能嵌套的传统渠道 SDK 辅助工具
- 传统的渠道路由键和可比较目标辅助别名，同时插件
  迁移到 `openclaw/plugin-sdk/channel-route`
- 正在被清单贡献所有权取代的激活提示
- `setup-api` 运行时回退，同时设置描述符迁移到冷
  `setup.requiresRuntime: false` 元数据
- 提供商 `discovery` Hook，同时提供商目录 Hook 迁移到
  `catalog.run(...)`
- 渠道 `showConfigured` / `showInSetup` 元数据，同时渠道包迁移
  到 `openclaw.channel.exposure`
- 旧的 runtime-policy 配置键，同时 doctor 将操作员迁移到
  `agentRuntime`
- 生成的捆绑渠道配置元数据回退，同时 registry-first
  `channelConfigs` 元数据落地
- 持久化的插件注册表禁用和安装迁移环境标志，同时
  修复流程将操作员迁移到 `openclaw plugins registry --refresh` 和
  `openclaw doctor --fix`
- 旧的插件拥有的 web search、web fetch 和 x_search 配置路径，同时
  doctor 将它们迁移到 `plugins.entries.<plugin>.config`
- 旧的 `plugins.installs` 编写的配置和捆绑的插件加载路径
  别名，同时安装元数据移动到状态管理的插件账本中

新插件代码应优先使用注册表和特定迁移指南中列出的替代方案。现有插件可以继续使用兼容性路径，
直到文档、诊断和发布说明宣布移除窗口。

## 发布说明

发布说明应包含即将进行的插件弃用信息，包括目标日期和
迁移文档链接。该警告需要在兼容性路径移动到 `removal-pending` 或 `removed` 之前发出。
