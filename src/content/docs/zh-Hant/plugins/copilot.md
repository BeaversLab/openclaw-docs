---
summary: "透過外部 GitHub Copilot SDK 線束執行 OpenClaw 內嵌代理程式輪次"
title: "Copilot SDK harness"
read_when:
  - You want to use the GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

外部的 `@openclaw/copilot` 外掛程式讓 OpenClaw 透過 GitHub Copilot CLI (`@github/copilot-sdk`) 執行內嵌的訂閱制 Copilot 代理程式輪次，而不是使用內建的 PI 線束。

當您希望 Copilot CLI 會話擁有底層 agent 迴圈時，請使用 Copilot SDK harness：原生工具執行、原生壓縮 (`infiniteSessions`)，以及由 CLI 管理的 `copilotHome` 下的執行緒狀態。
OpenClaw 仍然擁有聊天頻道、會話檔案、模型選擇、OpenClaw 動態工具（已橋接）、核准、媒體傳遞、可見的逐字稿鏡像、`/btw` 側邊問題（由樹內 PI 後備處理 — 請參閱 [側邊問題 (`/btw`)](#side-questions-btw)），以及 `openclaw doctor`。

若要了解更廣泛的模型/提供者/執行時間劃分，請從
[Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。

## 需求

- 安裝了 `@openclaw/copilot` 外掛程式的 OpenClaw。
- 如果您的設定檔使用 `plugins.allow`，請包含 `copilot` (外掛程式宣告的清單 id)。使用 npm 風格 `@openclaw/copilot` 套件名稱的限制性允許清單會導致外掛程式被封鎖，且即使有 `agentRuntime.id: "copilot"`，執行時期也不會載入。
- 可驅動 Copilot CLI 的 GitHub Copilot 訂閱 (或用於無頭 / cron 執行的 `gitHubToken` env / auth-profile 項目)。
- 可寫入的 `copilotHome` 目錄。線束預設為 `~/.openclaw/agents/<agentId>/copilot` 以實現完整的每個代理程式隔離。當未設定明確的 home 時，平台預設值 (Windows 上為 `%APPDATA%\copilot`，其他地方為 `$XDG_CONFIG_HOME/copilot` 或 `~/.config/copilot`) 會作為醫生探測的備援。

`openclaw doctor` 會針對擴充功能執行外掛程式
[doctor contract](#doctor-and-probes)；該處的失敗是
在選擇啟用 agent 之前確認環境已準備就緒的正規方式。

## 外掛程式安裝

Copilot 執行時是一個外掛程式，因此核心 `openclaw` 套件並不
攜帶 `@github/copilot-sdk` 相依性或其平台特定的
`@github/copilot-<platform>-<arch>` CLI 執行檔。這兩者加起來大約增加
260 MB，因此僅針對選擇加入此執行時的代理程式安裝它們：

```bash
openclaw plugins install @openclaw/copilot
```

當您第一次選擇 `github-copilot/*` 模型
**且** 您的組態透過 `agentRuntime: { id: "copilot" }` 將該模型（或其提供者）選用至 Copilot agent 執行時間時，精靈會安裝此外掛程式（請參閱下方的 [快速入門](#quickstart)）。
若未選用，openclaw 將使用其內建的 GitHub Copilot 提供者，且永遠不會安裝執行時間外掛程式。

執行時會依以下順序解析 SDK：

1. 來自已安裝 `@openclaw/copilot`
   套件的 `import("@github/copilot-sdk")`。
2. 眾所周知的後援目錄 `~/.openclaw/npm-runtime/copilot/`（
   舊版隨需安裝的目標）。

如果缺少 SDK，會顯示單一錯誤，代碼為 `COPILOT_SDK_MISSING`
以及上述的外掛程式重新安裝指令。

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

這兩種方式是等效的。當只有該模型應透過 harness 路由時，在單一模型項目上使用
`agentRuntime.id`；當該提供者下的每個模型都應使用它時，在提供者上設定
`agentRuntime.id`。

## 支援的提供者

Harness 宣告支援標準的 `github-copilot` 提供者
（與 `extensions/github-copilot` 擁有的相同 id）：

- `github-copilot`

該集合之外的任何事物都會透過 `selection.ts` 的
`auto_pi` 分支回落到 PI。

## Auth

個別代理程式的優先順序，於 `runCopilotAttempt` 期間套用：

1. 嘗試輸入上的**明確 `useLoggedInUser: true`**。使用 Copilot
   CLI 已登入的使用者，該使用者是在代理程式的 `copilotHome` 下解析的。
2. 嘗試輸入上的**明確 `gitHubToken`**（附帶 `profileId` +
   `profileVersion`）。適用於呼叫方想要繞過 auth-profile 解析的直接 CLI 呼叫和測試。
3. **來自 `EmbeddedRunAttemptParams` 結構的已解析合約 `resolvedApiKey` + `authProfileId`**。這是**正式生產的主要路徑**：核心會在呼叫 harness 之前解析 agent 已配置的 `github-copilot` auth profile (透過 `src/infra/provider-usage.auth.ts:resolveProviderAuths`)，而 harness 會直接使用這兩個欄位。這使得 `github-copilot:<profile>` auth profile 能夠在無環境變數的情況下，針對 headless / cron / multi-profile 設定進行端對端運作。
4. 針對未配置 auth profile 的直接 CLI / dogfood 執行，提供**環境變數回退 (Env-var fallback)**。執行時會依照優先順序檢查下列變數，反映了已發佈的 `github-copilot` provider (`extensions/github-copilot/auth.ts`) 以及文件中記載的 Copilot SDK 設定：
   1. `OPENCLAW_GITHUB_TOKEN` -- harness 特定的覆寫；設定此項可為 OpenClaw harness 固定 token，而不會干擾全系統的 `gh` / Copilot CLI 設定。
   2. `COPILOT_GITHUB_TOKEN` -- 標準的 Copilot SDK / CLI 環境變數。
   3. `GH_TOKEN` -- 標準的 `gh` CLI 環境變數 (符合現有 `github-copilot` provider 的優先順序)。
   4. `GITHUB_TOKEN` -- 通用的 GitHub token 回退。

   第一個非空值優先採用；空字串被視為不存在。綜合產生的 pool profile id 是 `env:<NAME>`，而 profileVersion 則是 token 的不可逆 sha256 指紋，因此輪替環境變數值能乾淨地清除用戶端 pool。

5. 當無可用 token 訊號時的**預設 `useLoggedInUser`**。

每個 agent 都有專屬的 `copilotHome`，因此 Copilot CLI 的 token、session 和 config 不會在同一台機器上的不同 agent 之間洩漏。當主機將 agent 目錄交給 harness 時 (將 SDK 狀態與同一目錄中 OpenClaw 的 `models.json` / `auth-profiles.json` 隔離)，預設為 `<agentDir>/copilot`，否則為 `~/.openclaw/agents/<agentId>/copilot`。當您需要自訂位置時 (例如，用於遷移的共享掛載)，可以在 attempt input 上使用 `copilotHome: <path>` 進行覆寫。

`probeCopilotAuthShape`（請參閱 [Doctor and probes](#doctor-and-probes)）是純形狀檢查，用於驗證將使用上述哪一種模式。
它不會執行即時 SDK 交握。

## 設定介面

此套組從每次嘗試的輸入
(`runCopilotAttempt({...})`) 以及 `extensions/copilot/src/`: 內的一小組預設環境變數讀取其設定

- `copilotHome` — 每個代理程式的 CLI 狀態目錄 (預設值記載於上文)。
- `model` — 字串或 `{ provider, id, api? }`。當省略時，OpenClaw 使用代理程式的正常模型選擇，且此套組會驗證解析出的提供者位於支援的集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。從 `auto-reply/thinking.ts` 中 OpenClaw 的 `ThinkLevel` / `ReasoningLevel` 解析進行對應。
- `infiniteSessionConfig` — 由 `harness.compact` 驅動的 SDK
  `infiniteSessions` 區塊的可選覆寫。預設值保持原樣是安全的。
- `hooksConfig` — 可選的橋接器設定，將 OpenClaw 的訊息寫入前/後掛鉤 (hooks) 暴露給 SDK 迴圈。
- `permissionPolicy` — 針對內建 SDK 工具類型
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`)
  所使用的 SDK `onPermissionRequest` 處理程式的可選覆寫。
  預設為 `rejectAllPolicy` 作為安全網；實務上 SDK 從不會
  叫用任何這些類型，因為每個橋接的 OpenClaw 工具都會
  註冊為 `overridesBuiltInTool: true` 和
  `skipPermission: true`，所以 100% 的工具呼叫都會透過 OpenClaw
  包裝的 `execute()` 流動。請參閱 [Permissions and ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 透過
  `telemetry-bridge.ts` 的選用 OpenTelemetry 路由。

OpenClaw 的其他部分無需了解這些欄位。其他
外掛、通道和核心程式碼只能看到標準的
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 結構。

## 壓縮

當 `harness.compact` 執行時，Copilot SDK 套件會：

1. 恢復已追蹤的 SDK 會話，但不繼續進行擱置的工作。
2. 呼叫 SDK 的會話範圍歷史記錄壓縮 RPC。
3. 傳回 SDK 壓縮結果，而不在工作區下寫入相容性標記
   檔案。

OpenClaw 端的逐字稿鏡像（見下文）會繼續接收
壓縮後的訊息，因此使用者面對的聊天記錄保持一致。

## 逐字稿鏡像

`runCopilotAttempt` 會透過
`extensions/copilot/src/dual-write-transcripts.ts`，將每個回合可鏡像的訊息雙重寫入至
OpenClaw 審計逐字稿。此鏡像
是每個會話範圍 (`copilot:${sessionId}`) 的，並使用每則
訊息的身分識別 (`${role}:${sha256_16(role,content)}`)，因此先前回合
項目的重新發出會與現有的磁碟金鑰衝突，而不會重複。

此鏡像包裝在兩層故障隔離層中，因此逐字稿
寫入失敗不會導致嘗試失敗：一個內部盡力而為的包裝器，以及
嘗試層級的深度防禦 `.catch(...)`。故障會被記錄下來，但
不會顯示出來。

## 側邊問題 (`/btw`)

`/btw` 在此套件中**並非**原生的。`createCopilotAgentHarness()`
刻意保留 `harness.runSideQuestion` 為未定義，因此 OpenClaw 的 `/btw`
分派器 (`src/agents/btw.ts`) 會落入其針對每個非 Codex 執行階段所使用的相同
樹內 PI 後備路徑：直接使用簡短的側邊問題提示呼叫已設定的模型提供者，並透過
`streamSimple` 串流回傳 (無 CLI 會話，無額外的集區插槽)。

這將 Copilot CLI 會話保留給 Agent 的主要輪循迴圈，並讓 `/btw` 行為與其他 PI 支援的執行時保持一致。合約在 `describe("runSideQuestion")` 下的
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
中斷言。

## 醫生與探測

`extensions/copilot/doctor-contract-api.ts` 會由 `src/plugins/doctor-contract-registry.ts` 自動載入。它提供：

- 一個空的 `legacyConfigRules`（在 MVP 版本中沒有已棄用的欄位）。
- 一個無操作的 `normalizeCompatibilityConfig`（保留以便未來的欄位棄用有一個穩定的樹內位置）。
- 一個 `sessionRouteStateOwners` 條目，聲明了提供者 `github-copilot`；
  執行時 `copilot`；CLI 會話金鑰 `copilot`；認證設定檔
  前綴 `github-copilot:`。

`extensions/copilot/src/doctor-probes.ts` 匯出了三個命令式探針，主機（包括 `openclaw doctor`）可以呼叫這些探針來驗證環境：

| 探查程式                   | 檢查項目                                                                           | 失敗原因                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` 以非空的版本字串結束並返回 0                                   | `non-zero-exit`, `empty-version`, `spawn-failed`, `spawn-error`, `probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + 寫入 + 刪除標記檔案                                       | `copilothome-not-writable`（其中包含底層 fs 錯誤，位於 `details.rawError`）      |
| `probeCopilotAuthShape`    | 至少具備 `useLoggedInUser`、`gitHubToken` 或 `profileId`+`profileVersion` 其中之一 | `no-auth-source`                                                                 |

每個探針都接受一個 DI 縫隙（`spawnFn`、`fsApi`），以便測試不會產生真實的 Copilot CLI 程序或接觸主機檔案系統。

## 限制

- 在 MVP 版本中，此馬具僅聲明正規的 `github-copilot` 提供者。
  其他提供者（BYOK 或其他）應在後續的 PR 中實作，這些 PR 將轉接器與連線設定一併發佈。
- 此工具不提供 TUI；PI 的 TUI 不受影響，並且仍是
  任何沒有對等介面的執行時期的後備方案。
- 當 Agent 切換到 `copilot` 時，PI 會話狀態不會遷移。
  選擇是基於每次嘗試；現有的 PI 會話仍然有效。
- **互動式 `ask_user` 尚未連線。** SDK 的
  `onUserInputRequest` 處理程式是刻意不註冊的，根據
  SDK 合約，這會完全從模型中隱藏 `ask_user` 工具。
  在此框架下執行的代理程式會根據初始提示做出最佳判斷
  決策，而不是在回合中途提出釐清問題。後續工作將把
  `extensions/codex/src/app-server/user-input-bridge.ts` 的 codex 模式移植過來，將 SDK
  `UserInputRequest` 路由透過 OpenClaw 頻道/TUI 提示路徑；
  `extensions/copilot/src/user-input-bridge.ts` 中休眠的腳手架
  是該後續工作將要連線的介面。

## Permissions and ask_user

橋接 OpenClaw 工具的權限執行發生在**工具包裝函式內部**，
而非透過 SDK 的 `onPermissionRequest` 回呼。PI 使用的
相同 `wrapToolWithBeforeToolCallHook`
(`src/agents/pi-tools.before-tool-call.ts`) 會由
`createOpenClawCodingTools` 套用到每個編碼工具：迴圈偵測、
受信任的外掛程式原則、工具呼叫前掛鉤，以及透過閘道 (`plugin.approval.request`) 進行的兩階段外掛程式
核准，全部都使用與原生 PI 嘗試完全相同的程式碼路徑執行。

為了讓該包裝函式擁有決定權，由
`convertOpenClawToolToSdkTool` 傳回的 SDK 工具會標記為：

- `overridesBuiltInTool: true` — 取代 Copilot CLI 的內建
  同名工具 (edit, read, write, bash, …)，讓每個工具
  叫用都路由回 OpenClaw。
- `skipPermission: true` — 告訴 SDK 不要在叫用工具前觸發
  `onPermissionRequest({kind: "custom-tool"})`。
  包裝後的 `execute()` 會在內部執行更豐富的 OpenClaw 原則檢查；
  SDK 層級的提示要麼會短路 OpenClaw 的
  執行 (如果我們允許所有)，要麼會封鎖每個工具呼叫 (如果我們
  拒絕所有) — 這兩者都不符合 PI 同等性。

內建 codex harness 使用相同的分割方式：橋接的 OpenClaw 工具
被包裝 (`extensions/codex/src/app-server/dynamic-tools.ts`)，而
codex-app-server 的「自有」原生審批類型
(`item/commandExecution/requestApproval`，
`item/fileChange/requestApproval`，
`item/permissions/requestApproval`) 則透過
`plugin.approval.request`
(`extensions/codex/src/app-server/approval-bridge.ts`) 路由。Copilot SDK
的同等機制 —— 對任何到達 `onPermissionRequest`
的非 `custom-tool` 類型
採取封閉式失敗 `rejectAllPolicy` —— 是相同的安全網，
且實際上並不會觸發，因為 `overridesBuiltInTool: true`
會取代所有內建項。

為了讓 wrapped-tool 層做出等同於 PI 的政策決策，harness 會將完整的 PI attempt-tool 上下文轉發至
`createOpenClawCodingTools` — 身份（`senderIsOwner`、
`memberRoleIds`、`ownerOnlyToolAllowlist`，...）、通道/路由
（`groupId`、`currentChannelId`、`replyToMode`、message-tool 開關）、
授權（`authProfileStore`）、執行身份
（從 `sandboxSessionKey`、
`runId` 衍生的 `sessionKey`/`runSessionKey`）、模型上下文（`modelApi`、`modelContextWindowTokens`、
`modelCompat`、`modelHasVision`）以及執行鉤子（`onToolOutcome`、
`onYield`）。如果沒有這些欄位，僅限擁有者的允許清單將無聲地
表現為預設拒絕，外掛信任策略無法解析到
正確的範圍，而 `session_status: "current"` 將解析為過時的
sandbox 金鑰。橋接建構器位於
`extensions/copilot/src/tool-bridge.ts` 中，並映照 PI
在 `src/agents/pi-embedded-runner/run/attempt.ts:1029-1117` 的權威呼叫。有兩個 PI 欄位
在 MVP 階段故意**未**轉發，並被追蹤為後續工作：
`sandbox`（harness 尚未透過 `resolveSandboxContext` 路由）
以及 PI tool-search/code-mode 機制
（`toolSearchCatalogRef`、`includeCoreTools`、
`includeToolSearchControls`、`toolSearchCatalogExecutor`、
`toolConstructionPlan`），這些在 SDK 邊界沒有類比機制。

### 工作階段層級 GitHub 權杖

Copilot SDK 合約區分了**客戶端層級**的 GitHub token (`CopilotClientOptions.gitHubToken`，用於對 CLI 程序本身進行身份驗證) 與**工作階段層級**的 token (`SessionConfig.gitHubToken`，該 token 決定了該工作階段的內容排除、模型路由與配額，並在 `createSession` 和 `resumeSession` 上均有效)。當驗證模式為 `gitHubToken` (明確的 `auth.gitHubToken` 或來自已配置的 `github-copilot` 驗證設定檔的合約解析 `resolvedApiKey`) 時，此套件會透過 `resolveCopilotAuth` 解析一次驗證並設定這兩個欄位。當解析出的模式為 `useLoggedInUser` 時，會省略工作階段層級的欄位，以便 SDK 持續從已登入的身分衍生身分資訊。

`ask_user` 是有意隱藏的 — 請參閱上方的限制。

## 相關

- [Agent 執行環境](/zh-Hant/concepts/agent-runtimes)
- [Codex 套件](/zh-Hant/plugins/codex-harness)
- [Agent 套件外掛程式 (SDK 參考)](/zh-Hant/plugins/sdk-agent-harness)
