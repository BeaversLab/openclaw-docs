---
summary: "透過內建的 GitHub Copilot SDK harness 執行 OpenClaw 內建代理程式輪次"
title: "Copilot SDK harness"
read_when:
  - You want to use the bundled GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

內建的 `copilot` 擴充功能可讓 OpenClaw 透過 GitHub Copilot CLI (`@github/copilot-sdk`) 執行內建的訂閱制 Copilot 代理程式輪次，而非使用內建的 PI harness。

當您希望 Copilot CLI 工作階段擁有底層代理程式迴圈時，請使用 Copilot SDK harness：原生工具執行、原生壓縮 (`infiniteSessions`)，以及在 `copilotHome` 下由 CLI 管理的執行緒狀態。
OpenClaw 仍然擁有聊天通道、工作階段檔案、模型選擇、OpenClaw 動態工具 (橋接)、核准、媒體傳遞、可見的逐字稿鏡像、`/btw` 側邊問題 (由 in-tree PI 後援處理 — 請參閱 [側邊問題 (`/btw`)](#side-questions-btw))，以及 `openclaw doctor`。

若要了解更廣泛的模型/提供者/執行時期劃分，請從
[代理程式執行時期](/zh-Hant/concepts/agent-runtimes) 開始。

## 需求

- 具備內建 `copilot` 擴充功能的 OpenClaw。
- 如果您的組態使用 `plugins.allow`，請包含 `copilot` (`extensions/copilot/openclaw.plugin.json` 中的清單
  id)。使用 npm 風格 `@openclaw/copilot` 套件名稱的嚴格
  允許清單會導致內建外掛程式被封鎖，即使設定了 `agentRuntime.id: "copilot"`，執行時期也無法載入。
- 可驅動 Copilot CLI 的 GitHub Copilot 訂閱 (或是用於 headless / cron 排程的
  `gitHubToken` env / auth-profile 項目)。
- 可寫入的 `copilotHome` 目錄。Harness 預設為
  `~/.openclaw/agents/<agentId>/copilot` 以達成完整的各代理程式隔離。當未設定明確的 home 時，
  平台預設值 (Windows 上為 `%APPDATA%\copilot`，其他地方為 `$XDG_CONFIG_HOME/copilot`
  或 `~/.config/copilot`) 將作為 doctor probe 的後援。

`openclaw doctor` 會針對擴充功能執行內建的
[doctor 契約](#doctor-and-probes)；該處的失敗是
在選用代理程式之前確認環境已準備就緒的標準方式。

## 隨選 SDK 安裝

Copilot 代理程式執行時隨附的小型 TypeScript 程式碼會打包在
openclaw tarball 內，但底層的 `@github/copilot-sdk` 套件
（及其平台特定的 `@github/copilot-<platform>-<arch>` CLI
二元檔）**預設並不會**安裝——兩者合起來會讓您的
openclaw 安裝空間增加約 260 MB，而且大多數 openclaw 使用者並不會
選擇 Copilot 模型。

當您第一次選擇 `github-copilot/*` 模型**並且**您的設定透過
`agentRuntime: { id: "copilot" }` 將該模型（或其提供者）加入 Copilot 代理程式執行時時
（請參閱下方的 [Quickstart](#quickstart)），精靈會提議安裝 SDK。
若未加入，openclaw 會使用其內建的 GitHub Copilot 提供者
且永遠不會提示安裝 SDK：

```
The Copilot agent runtime needs @github/copilot-sdk (~260 MB on first
install, downloads the @github/copilot CLI binary for your platform).
Install now? [Y/n]
```

如果您接受，SDK 將會安裝至
`~/.openclaw/npm-runtime/copilot/` 並在後續執行時被偵測到。此
安裝程式會針對隨 openclaw 附帶的已簽入 `package-lock.json` 位於
`src/commands/copilot-sdk-install-manifest/package-lock.json` 執行 `npm ci`，因此
為此版本審核過的確切傳遞相依性圖表會安裝在每個
使用者的機器上。

如果您拒絕，執行時會在第一次叫用時失敗並附上
可採取動作的安裝訊息；請重新執行 `openclaw setup` 以重試安裝
（如果您需要離線安裝，請將固定的清單複製到 `~/.openclaw/npm-runtime/copilot/` 並
自行執行 `npm ci`）。

執行時會依照以下順序解析 SDK：

1. `import("@github/copilot-sdk")` 針對主機 openclaw 安裝
   （涵蓋原始碼/開發簽出，以及任何與 openclaw 並列
   預先安裝 SDK 的環境）。
2. 眾所周知的後援目錄 `~/.openclaw/npm-runtime/copilot/`（精靈
   安裝目標）。

缺少的 SDK 會顯示單一錯誤，代碼為 `COPILOT_SDK_MISSING`
以及上述的手動安裝指令。

## 快速入門

將一個模型（或一個提供者）釘選到 harness：

```json5
{
  agents: {
    defaults: {
      model: "github-copilot/gpt-5.5",
      models: {
        "github-copilot/gpt-5.5": {
          agentRuntime: { id: "copilot" },
        },
      },
    },
  },
}
```

這兩種方式是等效的。在單個模型項目上使用 `agentRuntime.id`，當僅有該模型應透過 harness 路由時；在提供者上設定 `agentRuntime.id`，當該提供者下的每個模型都應使用它時。

## 支援的提供者

Harness 宣告支援標準的 `github-copilot` 提供者（與 `extensions/github-copilot` 擁有的 id 相同）：

- `github-copilot`

任何超出該集合的項目都會透過 `selection.ts` 的 `auto_pi` 分支落回 PI。

## 認證

個別 Agent 的優先順序，在 `runCopilotAttempt` 期間套用：

1. **在嘗試輸入上明確指定 `useLoggedInUser: true`**。使用在 Agent 的 `copilotHome` 下解析出的 Copilot CLI 登入使用者。
2. **在嘗試輸入上明確指定 `gitHubToken`**（搭配 `profileId` + `profileVersion`）。適用於呼叫方想要繞過 auth-profile 解析的直接 CLI 叫用和測試。
3. **來自 `EmbeddedRunAttemptParams` 形狀的合約解析 `resolvedApiKey` + `authProfileId`**。這是**生產環境的主要路徑**：core 在叫用 harness 之前會解析 Agent 設定的 `github-copilot` auth profile（透過 `src/infra/provider-usage.auth.ts:resolveProviderAuths`），而 harness 會直接使用這兩個欄位。這使得 `github-copilot:<profile>` auth profile 能在無需環境變數的情況下，端對端運作於 headless / cron / multi-profile 設定。
4. **環境變數備案**，適用於未設定 auth profile 的直接 CLI / dogfood 執行。執行時會依優先順序檢查以下變數，鏡像隨附的 `github-copilot` 提供者（`extensions/github-copilot/auth.ts`）和記載的 Copilot SDK 設定：
   1. `OPENCLAW_GITHUB_TOKEN` -- harness 特定的覆寫；設定此項可為 OpenClaw harness 固定 token，而不會干擾全系統的 `gh` / Copilot CLI 設定。
   2. `COPILOT_GITHUB_TOKEN` -- 標準的 Copilot SDK / CLI 環境變數。
   3. `GH_TOKEN` -- 標準 `gh` CLI 環境變數（符合現有的
      `github-copilot` 提供者優先順序）。
   4. `GITHUB_TOKEN` -- 通用 GitHub 權杖後備。

   第一個非空值優先；空字串視為不存在。綜合的 pool profile id 是 `env:<NAME>`，而
   profileVersion 是權杖的不可逆 sha256 指紋，因此輪換環境變數值會乾淨地清除客戶端 pool。

5. 當沒有可用的權杖訊號時，**預設 `useLoggedInUser`**。

每個 agent 都會獲得一個專用的 `copilotHome`，因此 Copilot CLI 權杖、會話和
配置不會在同一台機器上的 agent 之間洩漏。當主機將 harness 指定為 agent 目錄時（將 SDK 狀態與同一目錄中 OpenClaw 的 `models.json` / `auth-profiles.json` 隔離），預設值為
`<agentDir>/copilot`，否則為 `~/.openclaw/agents/<agentId>/copilot`。
當您需要自訂位置時（例如，用於遷移的共用掛載），可以在 attempt input 上使用 `copilotHome: <path>` 覆寫。

`probeCopilotAuthShape`（請參閱 [Doctor and probes](#doctor-and-probes)）是
純粹的形狀檢查，用於驗證將使用上述哪種模式。
它不執行即時 SDK 握手。

## 配置表面

Harness 從每次嘗試的輸入
(`runCopilotAttempt({...})`) 以及 `extensions/copilot/src/` 內的一小組環境變數預設值讀取其配置：

- `copilotHome` — 每個 agent 的 CLI 狀態目錄（預設值如上文所述）。
- `model` — 字串或 `{ provider, id, api? }`。省略時，OpenClaw 會使用
  agent 的正常模型選擇，且 harness 會驗證解析出的提供者是否在支援的集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。從 `auto-reply/thinking.ts` 中
  OpenClaw 的 `ThinkLevel` / `ReasoningLevel` 解析對應。
- `infiniteSessionConfig` — 由 `harness.compact` 驅動的 SDK
  `infiniteSessions` 區塊的可選覆寫。預設值保持不變是安全的。
- `hooksConfig` — 可選的橋接配置，將 OpenClaw 的訊息寫入前後掛鉤（hooks）暴露給 SDK 迴圈。
- `permissionPolicy` — 可選的覆寫，用於處理內建 SDK 工具類型（`shell`、`write`、`read`、`url`、`mcp`、`memory`、`hook`）的 SDK `onPermissionRequest` 處理程式。預設為 `rejectAllPolicy` 作為安全網；實務上 SDK 從不會調用這些類型，因為每個橋接的 OpenClaw 工具都會註冊為 `overridesBuiltInTool: true` 和 `skipPermission: true`，所以 100% 的工具呼叫都會透過 OpenClaw 包裝後的 `execute()` 流通。請參閱 [權限與 ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 透過 `telemetry-bridge.ts` 選擇啟用 OpenTelemetry 路由。

OpenClaw 的其餘部分不需要知道這些欄位。其他外掛、通道和核心程式碼只會看到標準的 `AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 結構。

## 壓縮

當 `harness.compact` 執行時，Copilot SDK 套件：

1. 在 SDK 工作階段上啟用 `infiniteSessions`。
2. 讓 SDK 執行其原生的壓縮功能。
3. 在 `workspacePath/files/openclaw-compaction-<ts>.json` 處寫入 OpenClaw 格式的標記，以便現有的 OpenClaw 逐字稿閱讀器仍能看到熟悉的成果。

OpenClaw 端的逐字稿鏡像（見下文）會繼續接收壓縮後的訊息，因此使用者面向的聊天歷史記錄保持一致。

## 逐字稿鏡像

`runCopilotAttempt` 會透過 `extensions/copilot/src/dual-write-transcripts.ts` 將每個回合可鏡像的訊息雙寫至 OpenClaw 審計逐字稿中。鏡像具有工作階段範圍（`copilot:${sessionId}`）並使用每則訊息的身分識別（`${role}:${sha256_16(role,content)}`），因此先前回合項目的重新發送會與現有的磁碟金鑰衝突且不會重複。

鏡像被封裝在兩層故障隔離中，因此逐字稿寫入失敗不會導致嘗試失敗：一個內部的盡力而為包裝器，以及嘗試層級的縱深防禦 `.catch(...)`。故障會被記錄但不會顯示。

## 側面問題 (`/btw`)

`/btw` 在此整合套件中**不**是原生的。`createCopilotAgentHarness()` 故意將 `harness.runSideQuestion` 保留為未定義，因此 OpenClaw 的 `/btw` 調度器 (`src/agents/btw.ts`) 會回退到它用於每個非 Codex 執行時期的相同內樹 PI 備援路徑：直接使用簡短的側面問題提示呼叫配置的模型提供者，並透過 `streamSimple` 串流回傳（無 CLI 會話，無額外集區插槽）。

這將 Copilot CLI 會話保留給代理的主要回合循環，並使 `/btw` 行為與其他 PI 支援的執行時期保持一致。該合約在
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
中的 `describe("runSideQuestion")` 下斷言。

## Doctor 和 probes

`extensions/copilot/doctor-contract-api.ts` 由
`src/plugins/doctor-contract-registry.ts` 自動載入。它貢獻了：

- 一個空的 `legacyConfigRules`（在 MVP 階段無已淘汰欄位）。
- 一個無操作的 `normalizeCompatibilityConfig`（保留它以便未來的欄位淘汰
  有一個穩定的內樹家園）。
- 一個 `sessionRouteStateOwners` 條目，聲稱提供者 `github-copilot`；
  執行時期 `copilot`；CLI 會話金鑰 `copilot`；驗證設定檔
  前綴 `github-copilot:`。

`extensions/copilot/src/doctor-probes.ts` 導出三個命令式探針
，主機（包括 `openclaw doctor`）可以呼叫它們來驗證環境：

| 探針                       | 檢查內容                                                                       | 失敗原因                                                                         |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` 以非空版本字串退出並傳回 0                                 | `non-zero-exit`、`empty-version`、`spawn-failed`、`spawn-error`、`probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + write + rm 一個標記檔案                               | `copilothome-not-writable` (並在 `details.rawError` 中包含底層 fs 錯誤)          |
| `probeCopilotAuthShape`    | 至少 `useLoggedInUser`、`gitHubToken` 或 `profileId`+`profileVersion` 其中之一 | `no-auth-source`                                                                 |

每個 probe 都接受 DI 縫合點 (`spawnFn`, `fsApi`)，因此測試不會產生實際的 Copilot CLI 程序或接觸主機 fs。

## 限制

- 在 MVP 階段，此線束僅支援標準的 `github-copilot` 提供者。
  其他提供者（BYOK 或其他）應在後續的 PR 中實作，
  將介面卡與接線程式碼一起發布。
- 此線束不提供 TUI；PI 的 TUI 不受影響，並且對於
  沒有對應介面的執行時仍作為備案。
- 當代理切換到 `copilot` 時，PI session 狀態不會遷移。
  選擇是基於每次嘗試；既有的 PI sessions 仍然有效。
- **互動式 `ask_user` 尚未接線。** 依照 SDK 合約，
  SDK 的 `onUserInputRequest` 處理器刻意未註冊，這會
  完全向模型隱藏 `ask_user` 工具。
  在此線束下執行的代理會根據初始提示做出最佳判斷決策，
  而非在轉換過程中詢問釐清問題。後續工作會將
  `extensions/codex/src/app-server/user-input-bridge.ts` 中的 codex 模式移植，
  以將 SDK `UserInputRequest`s 路由
  經由 OpenClaw 頻道/TUI 提示路徑；
  `extensions/copilot/src/user-input-bridge.ts` 中休眠的腳手架
  即是後續工作將接線的介面。

## 權限與 ask_user

橋接 OpenClaw 工具的權限執行是發生在 **工具包裝器內部**，
而非透過 SDK 的 `onPermissionRequest` 回調。
PI 使用的相同 `wrapToolWithBeforeToolCallHook`
(`src/agents/pi-tools.before-tool-call.ts`) 會被
`createOpenClawCodingTools` 應用到每一個編碼工具上：
迴圈偵測、信任的插件策略、工具呼叫前的 hooks，以及透過
閘道進行的兩階段插件核准 (`plugin.approval.request`)，
全部都與原生 PI 嘗試使用完全相同的程式碼路徑執行。

為了讓該包裝器擁有決定權，由
`convertOpenClawToolToSdkTool` 返回的 SDK Tool 標記為：

- `overridesBuiltInTool: true` — 取代 Copilot CLI 的內建
  同名工具（edit、read、write、bash 等），因此每次工具
  呼叫都會路由回 OpenClaw。
- `skipPermission: true` — 告訴 SDK 在呼叫工具之前
  不要觸發 `onPermissionRequest({kind: "custom-tool"})`。
  被包裝的 `execute()` 會在內部執行更豐富的 OpenClaw 政策檢查；
  SDK 層級的提示要麼會短路 OpenClaw 的執行
  （如果我們允許所有操作），要麼會阻擋每次工具呼叫
  （如果我們拒絕所有操作）—— 這兩種情況都不符合 PI 同等性。

內建的 codex harness 使用相同的拆分：橋接的 OpenClaw 工具
會被包裝 (`extensions/codex/src/app-server/dynamic-tools.ts`)，而
codex-app-server 的*自身*原生審核類型
(`item/commandExecution/requestApproval`,
`item/fileChange/requestApproval`,
`item/permissions/requestApproval`) 則透過
`plugin.approval.request` 路由
(`extensions/codex/src/app-server/approval-bridge.ts`)。Copilot SDK
的等效方案——針對任何到達 `onPermissionRequest` 的
非 `custom-tool` 類型採取
失敗關閉 (fail-closed) 的 `rejectAllPolicy` —— 是相同的安全網，
且它在實務上不會觸發，因為 `overridesBuiltInTool: true`
取代了每一個內建工具。

為了讓封裝工具層做出與 PI 相當的政策決策，harness 會將完整的 PI attempt-tool context 轉發到 `createOpenClawCodingTools` — 身份（`senderIsOwner`、`memberRoleIds`、`ownerOnlyToolAllowlist`、…）、通道/路由（`groupId`、`currentChannelId`、`replyToMode`、訊息工具切換）、授權（`authProfileStore`）、執行身分（從 `sandboxSessionKey` 衍生的 `sessionKey`/`runSessionKey`、`runId`）、模型上下文（`modelApi`、`modelContextWindowTokens`、`modelCompat`、`modelHasVision`）和執行掛鉤（`onToolOutcome`、`onYield`）。如果沒有這些欄位，僅限所有者的允許清單將會靜默地表現為預設拒絕，外掛信任策略無法解析到正確的範圍，而 `session_status: "current"` 將解析為過時的沙盒金鑰。橋接建構器位於 `extensions/copilot/src/tool-bridge.ts`，並在 `src/agents/pi-embedded-runner/run/attempt.ts:1029-1117` 鏡像 PI 的授權呼叫。有兩個 PI 欄位在 MVP 版本中有意不轉發，並被追蹤為後續工作：`sandbox`（harness 尚未透過 `resolveSandboxContext` 進行路由）以及 PI 工具搜尋/程式碼模式機制（`toolSearchCatalogRef`、`includeCoreTools`、`includeToolSearchControls`、`toolSearchCatalogExecutor`、`toolConstructionPlan`），這在 SDK 邊界沒有類比功能。

### 層級的 GitHub 權杖

Copilot SDK 契約區分了**用戶端層級** 的 GitHub token (`CopilotClientOptions.gitHubToken`，用於驗證 CLI 程序本身) 與**工作階段層級** (session-level) 的 token (`SessionConfig.gitHubToken`，該 token 決定了該工作階段的內容排除、模型路由與配額，並在 `createSession` 和 `resumeSession` 上都受到尊重)。當驗證模式為 `gitHubToken` (明確的 `auth.gitHubToken` 或來自已配置 `github-copilot` 驗證設定檔的契約解析 `resolvedApiKey`) 時，harness 會透過 `resolveCopilotAuth` 解析驗證一次，並設定這兩個欄位。當解析出的模式為 `useLoggedInUser` 時，工作階段層級的欄位會被省略，以便 SDK 繼續從已登入的身分衍生身分。

`ask_user` 是刻意隱藏的 — 請參閱上述的限制。

## 相關

- [Agent runtimes](/zh-Hant/concepts/agent-runtimes)
- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Agent harness plugins (SDK reference)](/zh-Hant/plugins/sdk-agent-harness)
