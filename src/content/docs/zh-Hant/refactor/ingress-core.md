---
summary: "將重複的通道入口黏合程式碼移至核心的刪除優先計畫。"
read_when:
  - Auditing why the channel ingress refactor added too much code
  - Moving route, command, event, activation, or access-group policy from bundled plugins into core
  - Reviewing whether a channel ingress helper actually deletes bundled plugin code
title: "Ingress 核心刪除計畫"
sidebarTitle: "Ingress 核心刪除"
---

# Ingress 核心刪除計畫

當入口重構增加了數千行程式碼時，這並不健康。只有當捆綁外掛的生產程式碼變少，且舊的第三方 SDK 相容性被隔離到 SDK/core 橋接層時，核心集中化才有意義。

預期的執行時期結構：

```text
bundled plugin event
  -> extract platform facts locally
  -> resolve shared ingress once when facts are available
  -> branch on generic ingress projections/outcomes
  -> perform platform side effects locally

old third-party helper
  -> SDK compatibility shim
  -> shared ingress-compatible projection where possible
  -> old return shape preserved
```

捆綁外掛不應該將入口轉換回本地的 `AccessResult`、
`GroupAccessDecision`、`CommandAuthDecision`、`DmCommandAccess` 或
`{ allowed, reasonCode }` 形狀，除非該類型是公開的外掛 API。

## 預算

根據使用 `origin/main` 的 PR 合併基礎進行測量，包括未追蹤的檔案。

```text
merge-base            1671e7532adb

current:
core production       +3,922 / -546    = +3,376
docs                  +601 / -17       = +584
other                 +145 / -2        = +143
plugin production     +4,148 / -5,388  = -1,240
tests                 +2,326 / -2,414  = -88
total                 +11,142 / -8,367 = +2,775

required:
plugin production     <= -1,500
core production       <= +1,500, or paid for by larger plugin deletion
tests                 <= +1,000
total                 <= +2,000

stretch:
plugin production     <= -2,500
core production       <= +1,200
total                 <= 0
```

最低剩餘清理工作：

```text
plugin production     needs 260 more net deleted lines
total                 needs 775 more net deleted lines
core production       still +1,876 over standalone budget, unless paid down by plugin deletion
```

僅刪除註解不算作清理。之前的預算通過過於寬鬆，因為它包含了還原的 QQBot 說明註解；本文檔僅追蹤可執行/文檔/測試程式碼的變動。

在每次清理浪潮後重新測量：

```sh
base=$(git merge-base HEAD origin/main)
git diff --shortstat "$base"
git diff --numstat "$base" -- src/channels/message-access src/plugin-sdk extensions | sort -nr -k1 | head -n 80
pnpm lint:extensions:no-deprecated-channel-access
```

## 診斷

第一階段增加了共享的入口核心，但在旁邊留下了太多外掛本地的授權邏輯：

```text
platform facts
  -> shared ingress state and decision
  -> plugin-local DTO or legacy projection
  -> plugin-local if/else ladder
```

這重複了模型。核心生產程式碼增加了約 3,376 行，而捆綁外掛生產程式碼減少了 1,240 行。這比第一階段好，但尚未達到最低預算。修正方法仍是刪除優先：

- 刪除僅重新命名入口欄位的外掛 DTO
- 刪除僅斷言包裝器形狀的測試
- 僅當同一個修補程式刪除了捆綁外掛程式碼時，才新增核心輔助函數
- 僅將舊的 SDK 相容性保留在 SDK/core 橋接層中
- 在刪除包裝器並暴露穩定結構後，重新打包核心

## 熱點

仍然需要縮減的正向捆綁生產檔案：

```text
extensions/telegram/src/ingress.ts                        +126
extensions/discord/src/monitor/dm-command-auth.ts         +101
extensions/signal/src/monitor/access-policy.ts             +92
extensions/feishu/src/policy.ts                            +85
extensions/slack/src/monitor/auth.ts                       +64
extensions/googlechat/src/monitor-access.ts                +59
extensions/nextcloud-talk/src/inbound.ts                   +51
extensions/matrix/src/matrix/monitor/access-state.ts       +49
extensions/irc/src/inbound.ts                              +44
extensions/imessage/src/monitor/inbound-processing.ts      +36
extensions/qa-channel/src/inbound.ts                       +34
extensions/qqbot/src/bridge/sdk-adapter.ts                 +33
extensions/tlon/src/monitor/utils.ts                       +30
extensions/twitch/src/access-control.ts                    +22
extensions/qqbot/src/engine/commands/slash-command-handler.ts +20
extensions/telegram/src/bot-handlers.runtime.ts            +19
```

該分支尚未達到最低預算。剩餘的審查相關工作應該在新增另一個核心抽象之前，刪除重複的授權流程、轉向腳手架或包裝器測試。

## 當前程式碼審閱

健康的核心縫隙已存在於 `src/channels/message-access/runtime.ts` 中：
它擁有身分配接器、有效允許清單、配對儲存讀取、路由
描述符、指令/事件預設、存取群組，以及最終解析的
`ResolvedChannelMessageIngress` 投影。

剩餘的成長主要是在該縫隙之上層疊的外掛程式膠合程式碼：

- `extensions/telegram/src/ingress.ts` 將核心決策包裝在 Telegram 特定的
  指令/事件輔助程式中，然後呼叫站點仍會傳遞預先計算的標準化
  允許清單和擁有者清單。
- `extensions/discord/src/monitor/dm-command-auth.ts`、
  `extensions/feishu/src/policy.ts`、`extensions/googlechat/src/monitor-access.ts`
  和 `extensions/matrix/src/matrix/monitor/access-state.ts` 仍在 ingress 旁保留
  本機政策 DTO 或舊版決策名稱。
- `extensions/signal/src/monitor/access-policy.ts` 正確地將 Signal
  身分標準化和配對回覆保留在本機，但仍有一個包裝程式
  縫隙，應該收斂為直接 ingress 消耗。
- `extensions/nextcloud-talk/src/inbound.ts`、`extensions/irc/src/inbound.ts`、
  `extensions/qa-channel/src/inbound.ts`、`extensions/zalo/src/monitor.ts` 和
  `extensions/zalouser/src/monitor.ts` 仍重複路由/信封/回合
  組裝，這些可以移至 ingress 核心之外的共用回合輔助程式。

結論：只有當在同一個修補程式中刪除這些
外掛程式包裝層時，將更多程式碼移入核心才有用。在
保留包裝程式回傳的同時新增另一個抽象層是重複錯誤。

## 邊界

核心擁有通用政策：

- 允許清單標準化與比對
- 存取群組擴充與診斷
- 配對儲存 DM 允許清單讀取
- 路由、傳送者、指令、事件和啟動閘道
- 准入對應：分派、丟棄、跳過、觀察、配對
- 編輯狀態、決策、診斷和 SDK 相容性投影
- 用於身分、路由、指令、事件、啟動
  和結果的可重複使用通用描述符

外掛程式擁有傳輸事實和副作用：

- webhook/socket/request 真實性
- 平台身分擷取和 API 查詢
- 頻道特定政策預設值
- 配對挑戰傳遞、回覆、確認、反應、輸入中、媒體、歷史記錄、
  設定、診斷、狀態、日誌和面向使用者的文字

Core 必須保持與管道無關：在 `src/channels/message-access` 中不得有 Discord、Slack、Telegram、Matrix、room、guild、space、API 用戶端或外掛程式特有的預設值。

## 驗收規則

每個新的核心輔助函式都必須立即刪除捆綁的外掛程式生產程式碼。

```text
one bundled caller        reject; keep plugin-local
two bundled callers       accept only if plugin production LOC drops
three or more callers     plugin deletion must be at least 2x new core LOC
compatibility-only helper SDK/core shim only; never bundled hot paths
```

如果出現以下情況，請停止並重新設計：

- 外掛程式生產程式碼行數（LOC）增加
- 測試程式碼的增長速度快於生產程式碼的縮減速度
- 捆綁的熱路徑返回一個僅重新命名 `ResolvedChannelMessageIngress` 的 DTO
- 核心輔助函式需要管道 ID、平台物件、API 用戶端或管道特有的預設值

## 工作套件

1. 凍結預算。
   在 PR 中加入 LOC，保持 deprecated-ingress lint 為綠燈，並在清理提交中包含前後的 LOC。

2. 刪除薄弱的 DTO 縫隙。
   將外掛程式本地的包裝器返回值替換為 `ResolvedChannelMessageIngress`、
   `senderAccess`、`commandAccess`、`routeAccess` 或 `ingress` 直接返回。先從
   QQBot、Telegram、Slack、Discord、Signal、Feishu、Matrix、iMessage 和
   Tlon 開始。刪除包裝器形狀的測試；保留行為測試。

3. 僅在進行刪除時加入結果分類。
   通用的分類器可能會公開 `dispatch`、`pairing-required`、
   `skip-activation`、`drop-command`、`drop-route`、`drop-sender` 和
   `drop-ingress`。它必須源自決策圖，而非原因字串，
   並且在同一個修補程式中至少遷移三個外掛程式。

4. 僅在進行刪除時加入路由描述建構器。
   通用的路由目標和路由發送者輔助函式只有在能立即縮減路由繁重的外掛程式時才可接受：Google Chat、IRC、Microsoft Teams、
   Nextcloud Talk、Mattermost、Slack、Zalo 和 Zalo Personal。

5. 僅在進行刪除時加入指令/事件預設集。
   集中文字指令、原生指令、回呼和來源主體形狀。
   當沒有運行指令閘道時，指令消費者必須預設為未授權；
   事件不得開始配對。

6. 僅在能消除樣板程式碼的地方加入身分預設集。
   當原始值僅進入配接器輸入，且編輯狀態保持不透明 ID/計數時，允許使用 stable-id、stable-id-plus-aliases、phone/e164 和多識別碼輔助函式。

7. 共享授權的輪次組裝。
   在 ingress 核心之外，從 QA Channel、IRC、Nextcloud Talk、Zalo 和 Zalo Personal 中移除重複的 route/envelope/context/reply 腳手架。
   核心可以擁有 route/session/envelope/dispatch 排序；外掛程式保留傳送和特定於頻道的語境。

8. 隔離相容性。
   已棄用的 SDK 輔助程式保持源碼相容，但捆綁的熱路徑不得匯入已棄用的 ingress 或 command-auth 外觀。相容性測試應使用假造的第三方外掛程式，而不是捆綁外掛程式的內部細節。

9. 重新打包核心。
   刪除包裝函式後，合併一次性使用的模組，移除未使用的匯出，將相容性投影移出熱路徑，並保留針對身分、route、command/event、啟用、存取群組和相容性 shim 的專注測試。

## 刪除波次

按順序執行這些步驟。每個波次必須降低捆綼的生產程式碼行數 (LOC)。

1. 包裝函式折疊，預期外掛程式變化量：-400 至 -600。
   將外掛程式本地的 `resolveXAccess`、`resolveXCommandAccess` 和
   `accessFromIngress` 結果類型替換為從
   `ResolvedChannelMessageIngress` 的直接讀取。首批目標：Discord DM 指令授權、
   飛書策略、Matrix 存取狀態、Telegram ingress、Signal 存取策略、
   QQBot SDK 配接器。

2. 共享結果輔助程式，預期外掛程式變化量：-200 至 -350。
   僅當刪除跨至少三個外掛程式的重複
   `shouldBlockControlCommand`、配對、啟用跳過、route 封鎖和 sender 封鎖階梯時，才新增一個通用分類器。

3. Route 描述符建構器，預期外掛程式變化量：-200 至 -350。
   將重複的 route target 和 route sender 描述符組裝移至核心輔助程式。首批目標：Google Chat、IRC、Microsoft Teams、Nextcloud Talk、
   Mattermost、Slack、Zalo、Zalo Personal。

4. 輪次組裝共享，預期外掛程式變化量：-250 至 -450。
   對簡單的入站外掛程式使用通用的 route/session/envelope/dispatch 排序。首批目標：QA Channel、IRC、Nextcloud Talk、Zalo、Zalo Personal。

5. 核心重新打包，預期核心變化量：-300 至 -700。
   當外掛程式直接使用運行時投影後，刪除一次性使用的模組，將微小的檔案合併回 `runtime.ts` 或專注的兄弟檔案，並將 SDK 相容性檔案與捆綼熱路徑分開。

6. 測試剪枝，預期測試增量：-300 到 -600。
   刪除僅斷言已移除封裝形狀的測試。保留針對
   命令拒絕、群組回退、來源-主體匹配、啟用跳過、
   存取群組、配對和編輯的行為測試。

這些波次之後的預期最小落地形狀：

```text
plugin production     <= -1,500
core production       about +1,800 to +2,200 before final repack
tests                 <= +500
total                 <= +2,000
```

## 不要移動

不要移動平台設定預設值、設定 UX、doctor/fix 複製文字、API 查找、
Slack 擁有者存在檢查、Matrix 別名/驗證處理、Telegram
回呼解析、命令語法解析、原生命令註冊、反應
負載解析、配對回覆、命令回覆、確認、輸入中、媒體、歷史記錄
或日誌。

## 驗證

針對性本機迴圈：

```sh
pnpm lint:extensions:no-deprecated-channel-access
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts src/plugin-sdk/access-groups.test.ts
pnpm test extensions/<changed-plugin>/src/...
pnpm plugin-sdk:api:check
pnpm config:docs:check
pnpm check:docs
git diff --check
```

一旦 LOC 趨勢在預算範圍內，使用 Testbox 進行廣泛的變更閘道/完整套件證明。

每個工作包記錄：

- 依類別區分的之前/之後 LOC
- 已刪除的外掛程式封裝
- 新的核心輔助 LOC（如果有）
- 針對性測試執行
- 剩餘的熱點清單

## 退出準則

- 捆綁的生產程式碼匯入不再使用已棄用的 channel-access 或 command-auth 外觀
- 相容性程式碼被隔離到 SDK/core 縫隙
- 捆綁的外掛程式直接消耗 ingress 投影或一般結果
- 外掛程式生產 LOC 較 `origin/main` 至少淨減少 1,500 行
- 核心生產 LOC 為 `<= +1,500`，或在總數保持 `<= +2,000` 的同時支付任何超出的費用
- 代表性測試涵蓋編輯、路由、命令/事件、啟用、
  存取群組和特定通道的回退行為
