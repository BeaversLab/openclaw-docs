---
summary: "插件兼容性协议、弃用元数据和迁移预期"
title: "插件兼容性"
read_when:
  - You maintain an OpenClaw plugin
  - You see a plugin compatibility warning
  - You are planning a plugin SDK or manifest migration
---

OpenClaw 在移除较旧的插件协议之前，通过命名兼容性适配器保持其连接。这可以在 SDK、清单、设置、配置和代理运行时协议演进的同时，保护现有的捆绑和外部插件。

## 兼容性注册表

插件兼容性协议在核心注册表
`src/plugins/compat/registry.ts` 中进行跟踪。

每条记录包含：

- 稳定的兼容性代码
- 状态：`active`、`deprecated`、`removal-pending` 或 `removed`
- 所有者：SDK、配置、设置、渠道、提供商、插件执行、代理运行时或核心
- 适用时的引入和弃用日期
- 替换指导
- 涵盖旧行为和新行为的文档、诊断和测试

该注册表是维护者规划和未来插件检查的来源。如果插件面向的行为发生更改，请在添加适配器的同一更改中添加或更新兼容性记录。

Doctor 修复和迁移兼容性在
`src/commands/doctor/shared/deprecation-compat.ts` 中单独跟踪。这些记录涵盖在运行时兼容性路径移除后可能仍需要保留的旧配置形状、安装账本布局和修复垫片。

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

使用 `--json` 以在 CI 注释中生成稳定的机器可读输出。OpenClaw 核心应公开检查器可使用的契约和装置，但不应从主 `openclaw` 包中发布检查器二进制文件。

## 弃用政策

OpenClaw 不应在其引入替换方案的同一版本中移除已记录的插件契约。

迁移顺序如下：

1. 添加新契约。
2. 通过命名兼容性适配器保持旧行为的连接。
3. 在插件作者可以采取行动时发出诊断或警告。
4. 记录替换方案和时间表。
5. 同时测试旧路径和新路径。
6. 等待公告的迁移窗口期结束。
7. 仅在获得明确的破坏性版本 批准后移除。

已弃用的记录必须包含警告开始日期、替代方案、文档链接以及最终移除日期（该日期不得晚于警告开始后的三个月）。除非维护者明确决定这是永久性兼容性并将其标记为 `active`，否则不要添加具有开放式移除窗口的已弃用兼容性路径。

## 当前兼容性领域

当前的兼容性记录包括：

- 旧的广泛 SDK 导入，例如 `openclaw/plugin-sdk/compat`
- 旧的仅 hook 插件形态和 `before_agent_start`
- 在插件迁移到 `register(api)` 期间的旧的 `activate(api)` 插件入口点
- 旧的 SDK 别名，例如 `openclaw/extension-api`、`openclaw/plugin-sdk/channel-runtime`、`openclaw/plugin-sdk/command-auth` 状态构建器、`openclaw/plugin-sdk/test-utils` 以及 `ClawdbotConfig` / `OpenClawSchemaType` 类型别名
- 捆绑插件允许列表和启用行为
- 旧的提供商/渠道环境变量清单元数据
- 旧的提供商插件挂钩和类型别名，同时提供商转向显式的目录、身份验证、思考、重放和传输挂钩
- 旧的运行时别名，例如 `api.runtime.taskFlow`、`api.runtime.subagent.getSession`、`api.runtime.stt` 以及已弃用的 `api.runtime.config.loadConfig()` / `api.runtime.config.writeConfigFile(...)`
- 旧的内存插件分离注册，同时内存插件迁移到 `registerMemoryCapability`
- 用于原生消息架构、提及阻断、入站信封格式化和审批功能嵌套的旧版渠道 SDK 助手
- 正被清单贡献所有权取代的激活提示
- 在设置描述符迁移到冷 `setup.requiresRuntime: false` 元数据时的 `setup-api` 运行时回退
- 在提供商目录挂钩迁移到 `catalog.run(...)` 时的提供商 `discovery` 挂钩
- 在渠道包迁移到 `openclaw.channel.exposure` 时的渠道 `showConfigured` / `showInSetup` 元数据
- 在 doctor 将操作员迁移到 `agentRuntime` 时的旧版运行时策略配置键
- 在以注册表为先的 `channelConfigs` 元数据落地时的生成式捆绑渠道配置元数据回退
- 在修复流程将操作员迁移到 `openclaw plugins registry --refresh` 和 `openclaw doctor --fix` 时的持久化插件注册表禁用和安装迁移环境标志
- 在 doctor 将插件拥有的旧版 Web 搜索、Web 获取和 x_search 配置路径迁移到 `plugins.entries.<plugin>.config` 时
- 在安装元数据迁移到状态管理的插件账本时的旧版 `plugins.installs` 编写配置和捆绑插件加载路径别名

新的插件代码应优先选择注册表和特定迁移指南中列出的替代方案。现有插件可以继续使用兼容性路径，直到文档、诊断和发布通知宣布移除窗口。

## 发行说明

发行说明应包含即将进行的插件弃用信息，包括目标日期和迁移文档链接。该警告需要在兼容性路径迁移到 `removal-pending` 或 `removed` 之前发出。
