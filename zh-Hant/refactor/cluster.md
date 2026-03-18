---
summary: "重構具有最高 LOC 減少潛力的叢集"
read_when:
  - You want to reduce total LOC without changing behavior
  - You are choosing the next dedupe or extraction pass
title: "重構叢集待辦事項"
---

# 重構叢集待辦事項

依據可能的 LOC 減少量、安全性與廣度排名。

## 1. 通道外掛程式配置與安全腳手架

價值最高的叢集。

許多通道外掛程式中重複的結構：

- `config.listAccountIds`
- `config.resolveAccount`
- `config.defaultAccountId`
- `config.setAccountEnabled`
- `config.deleteAccount`
- `config.describeAccount`
- `security.resolveDmPolicy`

強力範例：

- `extensions/telegram/src/channel.ts`
- `extensions/googlechat/src/channel.ts`
- `extensions/slack/src/channel.ts`
- `extensions/discord/src/channel.ts`
- `extensions/matrix/src/channel.ts`
- `extensions/irc/src/channel.ts`
- `extensions/signal/src/channel.ts`
- `extensions/mattermost/src/channel.ts`

可能的提取結構：

- `buildChannelConfigAdapter(...)`
- `buildMultiAccountConfigAdapter(...)`
- `buildDmSecurityAdapter(...)`

預期節省：

- ~250-450 LOC

風險：

- 中等。每個通道都有略微不同的 `isConfigured`、警告和正規化處理。

## 2. 擴充功能執行時期單例樣板程式碼

非常安全。

幾乎每個擴充功能都有相同的執行時期持有者：

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

可能的提取結構：

- `createPluginRuntimeStore<T>(errorMessage)`

預期節省：

- ~180-260 LOC

風險：

- 低

## 3. 設定提示與配置修補步驟

涵蓋面積大。

許多設定檔案重複：

- 解析帳戶 ID
- 提示允許清單項目
- 合併 allowFrom
- 設定 DM 政策
- 提示機密
- 修補頂層與帳戶範圍配置

強力範例：

- `extensions/bluebubbles/src/setup-surface.ts`
- `extensions/googlechat/src/setup-surface.ts`
- `extensions/msteams/src/setup-surface.ts`
- `extensions/zalo/src/setup-surface.ts`
- `extensions/zalouser/src/setup-surface.ts`
- `extensions/nextcloud-talk/src/setup-surface.ts`
- `extensions/matrix/src/setup-surface.ts`
- `extensions/irc/src/setup-surface.ts`

現有的輔助縫隙：

- `src/channels/plugins/setup-wizard-helpers.ts`

可能的提取形狀：

- `promptAllowFromList(...)`
- `buildDmPolicyAdapter(...)`
- `applyScopedAccountPatch(...)`
- `promptSecretFields(...)`

預期節省：

- ~300-600 LOC

風險：

- 中等。容易過度概括；請保持輔助函式的狹窄與可組合性。

## 4. 多帳號 config-schema 片段

擴充功能間重複的 schema 片段。

常見模式：

- `const allowFromEntry = z.union([z.string(), z.number()])`
- 帳號 schema 加上：
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

- ~120-220 LOC

風險：

- 低至中等。有些 schema 很簡單，有些則很特殊。

## 5. Webhook 與監控器生命週期啟動

不錯的中價值群組。

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

現有的輔助縫隙：

- `src/plugin-sdk/channel-lifecycle.ts`

可能的提取形狀：

- 帳號監控器生命週期的輔助函式
- 由 webhook 支援的帳號啟動輔助函式

預期節省：

- ~150-300 LOC

風險：

- 中至高。傳輸細節很快會出現分歧。

## 6. 小型完全複製清理

低風險清理分組。

範例：

- 重複的 gateway argv 偵測：
  - `src/infra/gateway-lock.ts`
  - `src/cli/daemon-cli/lifecycle.ts`
- 重複的 port 診斷渲染：
  - `src/cli/daemon-cli/restart-health.ts`
- 重複的 session-key 建構：
  - `src/web/auto-reply/monitor/broadcast.ts`

預期節省：

- 約 30-60 行程式碼

風險：

- 低

## 測試叢集

### LINE webhook 事件範例

強力範例：

- `src/line/bot-handlers.test.ts`

可能的提取項：

- `makeLineEvent(...)`
- `runLineEvent(...)`
- `makeLineAccount(...)`

預期節省：

- 約 120-180 行程式碼

### Telegram 原生命令授權矩陣

強力範例：

- `src/telegram/bot-native-commands.group-auth.test.ts`
- `src/telegram/bot-native-commands.plugin-auth.test.ts`

可能的提取項：

- 論壇上下文建構器
- 拒絕訊息斷言輔助函式
- 表驅動授權案例

預期節省：

- 約 80-140 行程式碼

### Zalo 生命週期設定

強力範例：

- `extensions/zalo/src/monitor.lifecycle.test.ts`

可能的提取項：

- 共享監控設定線束

預期節省：

- 約 50-90 行程式碼

### Brave llm-context 不支援選項測試

強力範例：

- `src/agents/tools/web-tools.enabled-defaults.test.ts`

可能的提取項：

- `it.each(...)` 矩陣

預期節省：

- 約 30-50 行程式碼

## 建議順序

1. Runtime singleton boilerplate
2. 小型精確複製清理
3. 設定與安全性建構器提取
4. 測試輔助函式提取
5. Onboarding 步驟提取
6. 監控生命週期輔助函式提取

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
