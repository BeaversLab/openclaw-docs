---
summary: "Refactor clusters with highest LOC reduction potential"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "Refactor Cluster Backlog"
---

# Refactor Cluster Backlog

Ranked by likely LOC reduction, safety, and breadth.

## 1. Channel plugin config and security scaffolding

Highest-value cluster.

Repeated shapes across many channel plugins:

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

Strong examples:

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

Likely extraction shape:

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

Expected savings:

- ~250-450 LOC

Risk:

- Medium. Each channel has slightly different `isConfigured`, warnings, and normalization.

## 2. Extension runtime singleton boilerplate

Very safe.

Nearly every extension has the same runtime holder:

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

Strong examples:

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

Special-case variants:

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

Likely extraction shape:

- `createPluginRuntimeStore<T>(errorMessage)`

Expected savings:

- ~180-260 LOC

Risk:

- Low

## 3. Setup prompt and config-patch steps

Large surface area.

Many setup files repeat:

- resolve account id
- prompt allowlist entries
- merge allowFrom
- set DM policy
- prompt secrets
- patch top-level vs account-scoped config

Strong examples:

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

現有的輔助縫合點：

- `src/channels/plugins/setup-wizard-helpers.ts`

可能的提取形狀：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

預期節省：

- 約 300-600 行程式碼

風險：

- 中等。容易過度泛化；請保持輔助函式的狹窄與可組合性。

## 4. 多帳號 config-schema 片段

跨擴充功能重複的 schema 片段。

常見模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- account schema 加上：
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- 重複的 DM/群組欄位
- 重複的 markdown/工具政策欄位

強力範例：

- `extensions/bluebubbles/src/config-schema.ts`
- `extensions/zalo/src/config-schema.ts`
- `extensions/zalouser/src/config-schema.ts`
- `extensions/matrix/src/config-schema.ts`
- `extensions/nostr/src/config-schema.ts`

可能的提取形狀：

- `AllowFromEntrySchema`
- `buildMultiAccountChannelSchema(accountSchema)`
- `buildCommonDmGroupFields(...)`

預期節省：

- 約 120-220 行程式碼

風險：

- 低至中等。部分 schema 很簡單，部分則較特殊。

## 5. Webhook 與監控器生命週期啟動

良好的中等價值叢集。

重複的 `startAccount` / 監控器設定模式：

- 解析帳號
- 計算 webhook 路徑
- 記錄啟動
- 啟動監控器
- 等待中止
- 清理
- 狀態 sink 更新

強力範例：

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

現有的輔助縫合點：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取形狀：

- 帳號監控器生命週期的輔助函式
- 基於 webhook 的帳號啟動輔助函式

預期節省：

- 約 150-300 行程式碼

風險：

- 中至高。傳輸細節很容易快速分歧。

## 6. 小型完全克隆清理

低風險清理分類。

範例：

- 重複的 gateway argv 偵測：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重複的 port 診斷渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重複的 session-key 建構：
  - `src/web/auto-reply/monitor/broadcast.ts`

預期節省：

- ~30-60 LOC

風險：

- 低

## 測試叢集

### LINE webhook 事件 fixtures

強力範例：

- `src/line/bot-handlers.test.ts`

可能的提取：

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

預期節省：

- ~120-180 LOC

### Telegram 原生命令授權矩陣

強力範例：

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

可能的提取：

- 論壇 context builder
- denied-message assertion helper
- table-driven auth cases

預期節省：

- ~80-140 LOC

### Zalo lifecycle 設定

強力範例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取：

- shared monitor setup harness

預期節省：

- ~50-90 LOC

### Brave llm-context unsupported-option 測試

強力範例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能的提取：

- `it.each(...)` 矩陣

預期節省：

- ~30-50 LOC

## 建議順序

1. Runtime singleton boilerplate
2. Small exact-clone cleanup
3. Config and security builder extraction
4. Test-helper extraction
5. Onboarding step extraction
6. Monitor lifecycle helper extraction

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
