---
summary: "透過外部 GitHub Copilot SDK 線束執行 OpenClaw 內嵌代理程式輪次"
title: "Copilot SDK harness"
read_when:
  - You want to use the GitHub Copilot SDK harness for an agent
  - You need configuration examples for the `copilot` runtime
  - You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI
---

外部的 `@openclaw/copilot` 外掛程式讓 OpenClaw 透過 GitHub Copilot CLI (`@github/copilot-sdk`) 執行內嵌的訂閱制 Copilot 代理程式輪次，而不是使用內建的 PI 線束。

當您希望 Copilot CLI 工作階段擁有底層代理程式迴圈時：原生工具執行、原生壓縮 (`infiniteSessions`)，以及在 `copilotHome` 下由 CLI 管理的執行緒狀態，請使用 Copilot SDK 線束。OpenClaw 仍然擁有聊天頻道、工作階段檔案、模型選擇、OpenClaw 動態工具 (橋接)、核准、媒體傳遞、可見的逐字稿鏡像、`/btw` 側邊問題 (由樹內 PI 備援機制處理 — 請參閱 [側邊問題 (`/btw`)](#side-questions-btw))，以及 `openclaw doctor`。

關於更廣泛的模型/提供者/執行時期區分，請從 [代理程式執行時期](/zh-Hant/concepts/agent-runtimes) 開始。

## 需求

- 安裝了 `@openclaw/copilot` 外掛程式的 OpenClaw。
- 如果您的設定檔使用 `plugins.allow`，請包含 `copilot` (外掛程式宣告的清單 id)。使用 npm 風格 `@openclaw/copilot` 套件名稱的限制性允許清單會導致外掛程式被封鎖，且即使有 `agentRuntime.id: "copilot"`，執行時期也不會載入。
- 可驅動 Copilot CLI 的 GitHub Copilot 訂閱 (或用於無頭 / cron 執行的 `gitHubToken` env / auth-profile 項目)。
- 可寫入的 `copilotHome` 目錄。線束預設為 `~/.openclaw/agents/<agentId>/copilot` 以實現完整的每個代理程式隔離。當未設定明確的 home 時，平台預設值 (Windows 上為 `%APPDATA%\copilot`，其他地方為 `$XDG_CONFIG_HOME/copilot` 或 `~/.config/copilot`) 會作為醫生探測的備援。

`openclaw doctor` 會針對擴充功能執行外掛程式 [醫生合約](#doctor-and-probes)；該處的失敗是在選擇加入代理程式之前確認環境已準備就緒的標準方式。

## 外掛程式安裝

Copilot 執行時是一個外掛程式，因此核心 `openclaw` 套件並不
攜帶 `@github/copilot-sdk` 相依性或其平台特定的
`@github/copilot-<platform>-<arch>` CLI 執行檔。這兩者加起來大約增加
260 MB，因此僅針對選擇加入此執行時的代理程式安裝它們：

```bash
openclaw plugins install @openclaw/copilot
```

當您第一次選擇
`github-copilot/*` 模型**並**且您的設定透過
`agentRuntime: { id: "copilot" }` 將該模型（或其提供者）選用加入 Copilot 代理程式執行時時
（請參閱下方的 [Quickstart](#quickstart)），精靈會安裝此外掛程式。
如果沒有選用加入，openclaw 會使用其內建的 GitHub Copilot 提供者
且絕不會安裝執行時外掛程式。

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

`probeCopilotAuthShape` (請參閱 [Doctor and probes](#doctor-and-probes)) 是純粹的形狀檢查，用於驗證將使用上述哪一種模式。它不執行即時的 SDK 握手。

## 設定介面

此套組從每次嘗試的輸入
(`runCopilotAttempt({...})`) 以及 `extensions/copilot/src/`: 內的一小組預設環境變數讀取其設定

- `copilotHome` — 每個代理程式的 CLI 狀態目錄 (預設值記載於上文)。
- `model` — 字串或 `{ provider, id, api? }`。當省略時，OpenClaw 使用代理程式的正常模型選擇，且此套組會驗證解析出的提供者位於支援的集合中。
- `reasoningEffort` — `"low" | "medium" | "high" | "xhigh"`。從 `auto-reply/thinking.ts` 中 OpenClaw 的 `ThinkLevel` / `ReasoningLevel` 解析進行對應。
- `infiniteSessionConfig` — 由 `harness.compact` 驅動的 SDK
  `infiniteSessions` 區塊的可選覆寫。預設值保持原樣是安全的。
- `hooksConfig` — 可選的橋接器設定，將 OpenClaw 的訊息寫入前/後掛鉤 (hooks) 暴露給 SDK 迴圈。
- `permissionPolicy` — 用於內建 SDK 工具類型
  (`shell`, `write`, `read`, `url`, `mcp`, `memory`, `hook`) 的 SDK
  `onPermissionRequest` 處理程序的可選覆寫。預設值
  為 `rejectAllPolicy` 作為安全網；實務上 SDK 從不
  呼叫這些類型中的任何一個，因為每個橋接的 OpenClaw 工具都已
  向 `overridesBuiltInTool: true` 和
  `skipPermission: true` 註冊，因此 100% 的工具呼叫皆透過 OpenClaw
  包裝的 `execute()` 流動。請參閱 [Permissions and ask_user](#permissions-and-ask_user)。
- `enableSessionTelemetry` — 透過
  `telemetry-bridge.ts` 的選用 OpenTelemetry 路由。

OpenClaw 的其他部分無需了解這些欄位。其他
外掛、通道和核心程式碼只能看到標準的
`AgentHarnessAttemptParams` / `AgentHarnessAttemptResult` 結構。

## 壓縮

當 `harness.compact` 執行時，Copilot SDK 套件會：

1. 在 SDK 工作階段上啟用 `infiniteSessions`。
2. 讓 SDK 執行其原生壓縮。
3. 在 `workspacePath/files/openclaw-compaction-<ts>.json` 寫入 OpenClaw 格式的標記，
   以便現有的 OpenClaw
   逐字稿讀取器仍能看到熟悉的成品。

OpenClaw 端的逐字稿鏡像（見下文）會繼續接收
壓縮後的訊息，因此使用者面對的聊天記錄保持一致。

## 逐字稿鏡像

`runCopilotAttempt` 會透過
`extensions/copilot/src/dual-write-transcripts.ts` 將每回合可鏡像的訊息雙寫至
OpenClaw 審計逐字稿。鏡像是
按工作階段範圍 (`copilot:${sessionId}`) 並使用每則訊息的身分
(`${role}:${sha256_16(role,content)}`)，因此先前回合條目的
重新發送會與現有的磁碟金鑰衝突而不會重複。

鏡像包裝在兩層失敗遏制機制中，因此逐字稿
寫入失敗不會導致嘗試失敗：內部為盡力而為的包裝器，
而嘗試層級則有縱深防禦 `.catch(...)`。失敗會被記錄但
不會呈現出來。

## 側邊問題 (`/btw`)

`/btw` 在此套件中**不具**原生功能。`createCopilotAgentHarness()`
刻意讓 `harness.runSideQuestion` 保持未定義，因此 OpenClaw 的 `/btw`
分派器 (`src/agents/btw.ts`) 會落入其對每個非 Codex 執行時所使用的相同
樹內 PI 後備路徑：直接以簡短的側邊問題提示呼叫設定的模型提供者，
並透過 `streamSimple` 串流傳回
（無 CLI 工作階段，無額外集區位置）。

這讓 Copilot CLI 工作階段保留給代理程式的主要回合迴圈，並讓
`/btw` 行為與其他 PI 支援的執行時相同。此契約在
[`extensions/copilot/harness.test.ts`](https://github.com/openclaw/openclaw/blob/main/extensions/copilot/harness.test.ts)
中的 `describe("runSideQuestion")` 下聲明。

## 醫生與探測

`extensions/copilot/doctor-contract-api.ts` 由
`src/plugins/doctor-contract-registry.ts` 自動載入。它提供：

- 一個空的 `legacyConfigRules`（在 MVP 階段沒有已棄用的欄位）。
- 一個無操作的 `normalizeCompatibilityConfig`（保留以便未來的欄位棄用
  有一個穩定的程式碼庫內容歸宿）。
- 一個 `sessionRouteStateOwners` 條目，宣告提供者 `github-copilot`；
  執行時期 `copilot`；CLI 工作階段金鑰 `copilot`；驗證設定檔
  前綴 `github-copilot:`。

`extensions/copilot/src/doctor-probes.ts` 匯出三個命令式探查程式
，主機（包括 `openclaw doctor`）可以呼叫它們來驗證環境：

| 探查程式                   | 檢查項目                                                                       | 失敗原因                                                                         |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `probeCopilotCliVersion`   | `copilot --version` 以狀態碼 0 退出並傳回非空版本字串                          | `non-zero-exit`、`empty-version`、`spawn-failed`、`spawn-error`、`probe-timeout` |
| `probeCopilotHomeWritable` | `mkdir -p copilotHome` + 寫入 + 刪除標記檔案                                   | `copilothome-not-writable`（並在 `details.rawError` 中包含底層 fs 錯誤）         |
| `probeCopilotAuthShape`    | 至少 `useLoggedInUser`、`gitHubToken` 或 `profileId`+`profileVersion` 其中之一 | `no-auth-source`                                                                 |

每個探查程式都接受一個 DI 縫合點（`spawnFn`, `fsApi`），以便測試不會產生
真實的 Copilot CLI 或觸碰主機檔案系統。

## 限制

- 在 MVP 階段，此工具僅宣告標準的 `github-copilot` 提供者。
  其他的提供者（BYOK 或其他）應該在後續的 PR 中實作，
  將配接器與連線設定一起發布。
- 此工具不提供 TUI；PI 的 TUI 不受影響，並且仍是
  任何沒有對等介面的執行時期的後備方案。
- 當代理程式切換到 `copilot` 時，PI 工作階段狀態不會遷移。
  選擇是基於每次嘗試；現有的 PI 工作階段仍然有效。
- **Interactive `ask_user` 尚未連接。** SDK 的
  `onUserInputRequest` 處理程式故意未註冊，根據 SDK
  合約，這會完全向模型隱藏 `ask_user` 工具。
  在此配接器下執行的代理會根據初始提示做出最佳判斷
  決策，而不是在回合中途提出澄清
  問題。後續追蹤將把 `extensions/codex/src/app-server/user-input-bridge.ts` 的 codex 模式
  移植，以將 SDK `UserInputRequest` 路由至 OpenClaw 通道/TUI 提示路徑；
  `extensions/copilot/src/user-input-bridge.ts` 中休眠的鷹架
  則是該次追蹤將連接的介面。

## Permissions and ask_user

橋接 OpenClaw 工具的權限強制執行發生在 **工具包裝函式內**，
而非透過 SDK 的 `onPermissionRequest` 回呼。PI 使用的
相同 `wrapToolWithBeforeToolCallHook`
(`src/agents/pi-tools.before-tool-call.ts`) 會由
`createOpenClawCodingTools` 套用至每個編碼工具：迴圈偵測、
受信任外掛程式原則、工具呼叫前掛鉤，以及透過閘道
(`plugin.approval.request`) 的兩階段外掛程式
核准，皆以與原生 PI 嘗試完全相同的程式碼路徑執行。

為了讓該包裝函式擁有決定權，由
`convertOpenClawToolToSdkTool` 傳回的 SDK 工具會標記為：

- `overridesBuiltInTool: true` — 取代 Copilot CLI 的內建
  同名工具 (edit, read, write, bash, …)，因此每個工具
  叫用都會路由回 OpenClaw。
- `skipPermission: true` — 告訴 SDK 不要在叫用工具前觸發
  `onPermissionRequest({kind: "custom-tool"})`。
  包裝後的 `execute()` 會在內部執行更完善的 OpenClaw 原則檢查；
  SDK 層級的提示要麼會短路 OpenClaw 的
  強制執行 (若我們允許所有)，要麼會封鎖每個工具呼叫 (若我們
  拒絕所有) — 這兩者都不符合 PI 對等性。

內建 codex harness 使用相同的分割方式：橋接的 OpenClaw 工具
被包裝起來 (`extensions/codex/src/app-server/dynamic-tools.ts`)，而
codex-app-server 自己的原生核可類型
(`item/commandExecution/requestApproval`,
`item/fileChange/requestApproval`,
`item/permissions/requestApproval`) 則透過
`plugin.approval.request`
(`extensions/codex/src/app-server/approval-bridge.ts`) 進行路由。Copilot SDK
的等效機制 —— 對任何到達 `onPermissionRequest` 的非 `custom-tool`
類型採取 `rejectAllPolicy` 失敗關閉策略 —— 是相同的安全網，
且實際上不會觸發，因為 `overridesBuiltInTool: true`
會取代所有內建功能。

為了讓包裝工具層做出與 PI 同等的策略決策，
駕駛束將完整的 PI 工具嘗試上下文轉發至
`createOpenClawCodingTools` — 身份（`senderIsOwner`、
`memberRoleIds`、`ownerOnlyToolAllowlist`、…）、通道/路由
（`groupId`、`currentChannelId`、`replyToMode`、訊息工具切換）、
授權（`authProfileStore`）、執行身分
（源自 `sandboxSessionKey` 的
`sessionKey`/`runSessionKey`、
`runId`）、模型上下文（`modelApi`、`modelContextWindowTokens`、
`modelCompat`、`modelHasVision`）和執行鉤子（`onToolOutcome`、
`onYield`）。如果沒有這些欄位，僅限擁有者的允許清單將會
以預設拒絕的方式靜默運作、外掛程式信任原則無法解析至
正確的範圍，而 `session_status: "current"` 將解析為過時的
沙箱金鑰。橋接建構器位於
`extensions/copilot/src/tool-bridge.ts` 中，並鏡像
PI 的權威呼叫於
`src/agents/pi-embedded-runner/run/attempt.ts:1029-1117`。有兩個 PI 欄位
在 MVP 版本中故意**未**轉發，並被追蹤為後續工作：
`sandbox`（駕駛束尚未透過 `resolveSandboxContext` 進行路由）
以及 PI 的工具搜尋/程式碼模式機制
（`toolSearchCatalogRef`、`includeCoreTools`、
`includeToolSearchControls`、`toolSearchCatalogExecutor`、
`toolConstructionPlan`），這些機制在 SDK 邊界上沒有類比項目。

### 工作階段層級 GitHub 權杖

Copilot SDK 契約區分了 **用戶端層級** 的 GitHub 權杖（`CopilotClientOptions.gitHubToken`，用於驗證 CLI 程序本身）與 **工作階段層級** 的權杖（`SessionConfig.gitHubToken`，該權杖決定了內容排除、模型路由以及該工作階段的配額，並在 `createSession` 和 `resumeSession` 上均受支援）。當驗證模式為 `gitHubToken`（顯式的 `auth.gitHubToken` 或從設定的 `github-copilot` 驗證設定檔解析出的契約 `resolvedApiKey`）時，此工具會透過 `resolveCopilotAuth` 解析一次驗證，並設定這兩個欄位。當解析出的模式為 `useLoggedInUser` 時，會省略工作階段層級的欄位，以便 SDK 從登入的身分繼續推導身分資訊。

`ask_user` 是故意隱藏的 — 請參閱上述的「限制」。

## 相關

- [Agent runtimes](/zh-Hant/concepts/agent-runtimes)
- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Agent harness plugins (SDK 參考資料)](/zh-Hant/plugins/sdk-agent-harness)
