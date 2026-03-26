---
summary: "重構具有最高 LOC 減少潛力的叢集"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "重構叢集待辦事項"
---

# 重構叢集待辦事項

根據可能的 LOC 減少量、安全性和範圍進行排名。

## 1. 頻道外掛程式配置與安全性腳手架

最高價值的叢集。

在許多頻道外掛程式中重複出現的形狀：

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

強範例：

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

預期的提取形狀：

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

預期節省：

- ~250-450 LOC

風險：

- 中等。每個頻道都有略微不同的 `isConfigured`、警告和正規化。

## 2. Extension runtime singleton boilerplate

非常安全。

幾乎每個擴充都有相同的運行時持有者：

- `let runtime: PluginRuntime | null = null`
- `setXRuntime`
- `getXRuntime`

強力範例：

- `extensions/telegram/src/runtime.ts`
- `extensions/matrix/src/runtime.ts`
- `extensions/slack/src/runtime.ts`
- `extensions/discord/src/runtime.ts`
- `extensions/whatsapp/src/runtime.ts`
- `extensions/imessage/src/runtime.ts`
- `extensions/twitch/src/runtime.ts`

特殊情況變體：

- `extensions/bluebubbles/src/runtime.ts`
- `extensions/line/src/runtime.ts`
- `extensions/synology-chat/src/runtime.ts`

可能的重構形狀：

- `createPluginRuntimeStore<T>(errorMessage)`

預期減少量：

- ~180-260 LOC

風險：

- 低

## 3. Setup prompt and config-patch steps

涉及範圍廣大。

許多設置檔案重複：

- 解析帳戶 ID
- 提示許可清單條目
- 合併 allowFrom
- 設定 DM 政策
- 提示密碼
- 修補頂層與帳戶範圍的配置

強力範例：

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

現有的輔助接縫：

- `src/channels/plugins/setup-wizard-helpers.ts`

可能的重構形狀：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

預期節省：

- ~300-600 LOC

風險：

- 中等。容易過度泛化；請保持輔助函式的窄範圍與可組合性。

## 4. 多帳號 config-schema 片段

擴充功能之間重複的 schema 片段。

常見模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- account schema 加上：
  - `accounts: z.object({}).catchall(accountSchema).optional()`
  - `defaultAccount: z.string().optional()`
- 重複的 DM/群組欄位
- 重複的 markdown/工具政策欄位

典型範例：

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

- ~120-220 LOC

風險：

- 低到中等。部分架構簡單，部分較為特殊。

## 5. Webhook 和監控器生命週期啟動

良好的中等價值群集。

重複的 `startAccount` / 監控器設定模式：

- 解析帳戶
- 計算 webhook 路徑
- 記錄啟動
- 啟動監控器
- 等待中止
- 清理
- 狀態接收器更新

強範例：

- `extensions/googlechat/src/channel.ts`
- `extensions/bluebubbles/src/channel.ts`
- `extensions/zalo/src/channel.ts`
- `extensions/telegram/src/channel.ts`
- `extensions/nextcloud-talk/src/channel.ts`

現有的輔助接縫：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取形狀：

- 帳戶監控器生命週期的輔助函式
- Webback 支援的帳戶啟動輔助函式

預期節省：

- ~150-300 LOC

風險：

- 中到高。傳輸細節差異很大。

## 6. 小型完全克隆清理

低風險清理桶。

範例：

- 重複的網關 argv 檢測：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重複的 port diagnostics 渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重複的 session-key 建構：
  - `src/web/auto-reply/monitor/broadcast.ts`

預期節省：

- ~30-60 LOC

風險：

- 低

## 測試叢集

### LINE webhook event fixtures

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

- forum context builder
- denied-message assertion helper
- table-driven auth cases

預期節省：

- ~80-140 LOC

### Zalo lifecycle setup

強力範例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取：

- shared monitor setup harness

預期節省：

- ~50-90 LOC

### Brave llm-context 不支援選項測試

強烈範例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能提取：

- `it.each(...)` 矩陣

預期節省：

- ~30-50 LOC

## 建議順序

1. Runtime singleton 樣板
2. 小型完全複製清理
3. 設定與安全性建構器提取
4. 測試輔助提取
5. 入門步驟提取
6. 監控生命週期輔助提取

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
