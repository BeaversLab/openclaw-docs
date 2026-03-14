---
summary: "重构具有最高 LOC 减少潜力的集群"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "Refactor Cluster Backlog"
---

# 重构集群待办事项

按可能的 LOC 减少量、安全性和范围排序。

## 1. 渠道插件配置和安全脚手架

最高价值集群。

许多渠道插件中重复的模式：

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

典型示例：

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

可能的提取形式：

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

预期节省：

- ~250-450 LOC

风险：

- 中等。每个通道都有稍微不同的 `isConfigured`、警告和标准化处理。

## 2. 扩展运行时单例样板代码

非常安全。

几乎每个扩展都有相同的运行时持有者：

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

典型示例：

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

可能的提取形式：

- `createPluginRuntimeStore<T>(errorMessage)`

预期节省：

- ~180-260 LOC

风险：

- 低

## 3. 入门提示和配置补丁步骤

覆盖面广。

许多入门文件重复：

- 解析账户 ID
- 提示允许列表条目
- 合并 allowFrom
- 设置 私信 策略
- 提示密钥
- 补丁顶级与账户范围配置

典型示例：

- `extensions/bluebubbles/src/onboarding.ts`
- `extensions/googlechat/src/onboarding.ts`
- `extensions/msteams/src/onboarding.ts`
- `extensions/zalo/src/onboarding.ts`
- `extensions/zalouser/src/onboarding.ts`
- `extensions/nextcloud-talk/src/onboarding.ts`
- `extensions/matrix/src/onboarding.ts`
- `extensions/irc/src/onboarding.ts`

现有的辅助接缝：

- `src/channels/plugins/onboarding/helpers.ts`

可能的提取形式：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

预期节省：

- ~300-600 LOC

风险：

- 中等。容易过度概括；保持辅助函数的窄范围和可组合性。

## 4. 多账户配置架构片段

跨扩展的重复 schema 片段。

常见模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- 账户 schema 加上：
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- 重复的 私信/群组 字段
- 重复的 markdown/工具 policy 字段

典型示例：

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

可能的提取形式：

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

预期节省：

- 约 120-220 行代码

风险：

- 低至中等。部分 schema 较简单，部分较特殊。

## 5. Webhook 和监控生命周期启动

良好的中等价值集群。

重复的 `startAccount` / 监控设置模式：

- 解析账户
- 计算 webhook 路径
- 记录启动
- 启动监控
- 等待中止
- 清理
- 状态 sink 更新

典型示例：

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

现有的辅助接口：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取形式：

- 账户监控生命周期的辅助函数
- 基于 webhook 的账户启动辅助函数

预期节省：

- 约 150-300 行代码

风险：

- 中等至高。传输细节差异较大。

## 6. 小型精确克隆清理

低风险清理归类。

示例：

- 重复的 gateway argv 检测：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重复的端口诊断渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重复的 会话-key 构造：
  - `src/web/auto-reply/monitor/broadcast.ts`

预期节省：

- 约 30-60 行代码

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

- 约 120-180 行代码

### Telegram 原生命令授权矩阵

典型示例：

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

可能的提取：

- 论坛上下文构建器
- 拒绝消息断言辅助函数
- 表驱动的授权用例

预期节省：

- 约 80-140 行代码

### Zalo 生命周期设置

典型示例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取：

- 共享监控设置工具

预期节省：

- 约 50-90 行代码

### Brave llm-context 不受支持的选项测试

典型示例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能的提取：

- `it.each(...)` 矩阵

预期节省：

- ~30-50 LOC

## 建议顺序

1. 运行时单例样板代码
2. 小型精确克隆清理
3. 配置和安全构建器提取
4. 测试辅助提取
5. 入职步骤提取
6. 监视器生命周期辅助提取

import zh from '/components/footer/zh.mdx';

<zh />
