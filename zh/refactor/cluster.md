---
summary: "重构具有最高代码行数减少潜力的集群"
read_when:
  - 你希望在不改变行为的情况下减少总代码行数
  - 你正在选择下一个去重或提取阶段
title: "重构集群待办事项"
---

# 重构集群待办事项

按可能的代码行数减少量、安全性和广度排名。

## 1. 渠道插件配置和安全脚手架

最高价值集群。

在许多渠道插件中重复的形状：

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

强有力的示例：

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

可能的提取形状：

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

预期节省：

- ~250-450 LOC

风险：

- 中等。每个渠道的 `isConfigured`、警告和规范化略有不同。

## 2. 扩展运行时单例样板代码

非常安全。

几乎每个扩展都有相同的运行时持有者：

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

强有力的示例：

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

特殊情况变体：

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

可能的提取形状：

- `createPluginRuntimeStore<T>(errorMessage)`

预期节省：

- ~180-260 LOC

风险：

- 低

## 3. 设置提示和配置修补步骤

涉及面广。

许多设置文件重复：

- 解析账户 ID
- 提示允许列表条目
- 合并 allowFrom
- 设置私信策略
- 提示密钥
- 修补顶级与账户范围的配置

强有力的示例：

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

现有的辅助接缝：

- `src/channels/plugins/setup-wizard-helpers.ts`

可能的提取形状：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

预期节省：

- ~300-600 LOC

风险：

- 中等。容易过度概括；保持辅助函数的窄范围和可组合性。

## 4. 多账户 config-schema 片段

跨扩展重复的 schema 片段。

常见模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- account schema 加上：
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- 重复的私信/群组字段
- 重复的 markdown/工具策略字段

强示例：

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

可能的提取形状：

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

预期节省：

- ~120-220 LOC

风险：

- 低至中等。有些 schema 简单，有些特殊。

## 5. Webhook 和监控生命周期启动

良好的中等价值集群。

重复的 `startAccount` / 监控设置模式：

- 解析账户
- 计算 webhook 路径
- 记录启动
- 启动监控
- 等待中止
- 清理
- 状态接收器更新

强示例：

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

现有的辅助接缝：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取形状：

- 账户监控生命周期辅助函数
- webhook 支持的账户启动辅助函数

预期节省：

- ~150-300 LOC

风险：

- 中等至高。传输细节差异很快。

## 6. 小型精确克隆清理

低风险清理桶。

示例：

- 重复的 gateway argv 检测：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重复的端口诊断渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重复的 会话-key 构造：
  - `src/web/auto-reply/monitor/broadcast.ts`

预期节省：

- ~30-60 LOC

风险：

- 低

## 测试集群

### LINE webhook 事件固件

典型示例：

- `src/line/bot-handlers.test.ts`

可能的提取：

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

预期节省：

- ~120-180 LOC

### Telegram 原生命令鉴权矩阵

典型示例：

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

可能的提取：

- forum 上下文构建器
- denied-message 断言辅助函数
- 表驱动鉴权用例

预期节省：

- ~80-140 LOC

### Zalo 生命周期设置

典型示例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取：

- 共享监视器设置工具

预期节省：

- ~50-90 LOC

### Brave llm-context 不支持选项测试

典型示例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能的提取：

- `it.each(...)` 矩阵

预期节省：

- ~30-50 LOC

## 建议顺序

1. 运行时单例样板代码
2. 小型精确克隆清理
3. 配置和安全性构建器提取
4. 测试辅助工具提取
5. 新手引导步骤提取
6. 监视器生命周期辅助工具提取

import en from "/components/footer/en.mdx";

<en />
