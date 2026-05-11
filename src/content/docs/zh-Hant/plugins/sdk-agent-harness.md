---
summary: "用於取代低階嵌入式代理程式執行器的實驗性 SDK 介面"
title: "Agent harness 外掛程式"
sidebarTitle: "Agent Harness"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

**Agent harness** 是一個準備好的 OpenClaw agent 回合的低階執行器。它不是模型提供者，不是通道，也不是工具登錄檔。
如需面向使用者的心智模型，請參閱 [Agent 執行階段](/zh-Hant/concepts/agent-runtimes)。

請僅將此介面用於隨附或受信任的原生外掛程式。由於參數型別刻意反映了目前的內嵌執行器，因此該合約仍屬實驗性質。

## 何時使用 harness

當模型系列擁有自己的原生 session 執行階段，且標準的 OpenClaw provider 傳輸是不正確的抽象層級時，請註冊一個 agent harness。

範例：

- 擁有執行緒和壓縮功能的原生編碼代理伺服器
- 必須串流原生計畫/推理/工具事件的本機 CLI 或常駐程式
- 除了 OpenClaw session 轉錄之外，還需要自己繼續 ID 的模型執行階段

請**不要**僅為了新增新的 LLM API 而註冊 harness。對於標準的 HTTP 或 WebSocket 模型 API，請建構 [provider 外掛程式](/zh-Hant/plugins/sdk-provider-plugins)。

## 核心仍擁有的部分

在選取 harness 之前，OpenClaw 已經解析了：

- provider 和模型
- 執行階段驗證狀態
- 思考層級和內容預算
- OpenClaw 轉錄/session 檔案
- 工作區、沙箱和工具原則
- 通道回覆回呼和串流回呼
- 模型容錯移轉和即時模型切換原則

這種區分是有意為之的。Harness 會執行準備好的嘗試；它不會選取 provider、取代通道傳遞，或是以無訊息方式切換模型。

準備好的嘗試還包含 `params.runtimePlan`，這是一個 OpenClaw 擁有的原則套件，用於必須在 PI 和原生 harness 之間保持共用的執行階段決策：

- `runtimePlan.tools.normalize(...)` 和
  `runtimePlan.tools.logDiagnostics(...)`，用於具備 provider 感知的工具結構描述原則
- `runtimePlan.transcript.resolvePolicy(...)`，用於轉錄清理和
  工具呼叫修復原則
- `runtimePlan.delivery.isSilentPayload(...)`，用於共用的 `NO_REPLY` 和媒體
  傳遞抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用於模型後援分類
- `runtimePlan.observability` 用於已解析的提供者/模型/配接器中繼資料

配接器可以使用計畫來做出需要符合 PI 行為的決策，但仍應將其視為主機擁有的嘗試狀態。請勿變異計畫或使用它在單次回合內切換提供者/模型。

## 註冊配接器

**匯入：** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider" ? { supported: true, priority: 100 } : { supported: false };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## 選取原則

OpenClaw 在提供者/模型解析完成後選擇一個配接器：

1. 現有工作階段記錄的配接器 ID 優先，因此組態/環境變更不會將該文字紀錄熱切換至另一個執行時期。
2. `OPENCLAW_AGENT_RUNTIME=<id>` 強制為尚未固定的工作階段使用具有該 ID 的已註冊配接器。
3. `OPENCLAW_AGENT_RUNTIME=pi` 強制使用內建 PI 配接器。
4. `OPENCLAW_AGENT_RUNTIME=auto` 會詢問已註冊的配接器是否支援已解析的提供者/模型。
5. 如果沒有已註冊的配接器符合，除非停用 PI 後援，否則 OpenClaw 會使用 PI。

外掛程式配接器失敗會顯示為執行失敗。在 `auto` 模式下，只有在沒有已註冊的外掛程式配接器支援已解析的提供者/模型時，才會使用 PI 後援。一旦外掛程式配接器認領了執行，OpenClaw 不會透過 PI 重新播放同一個回合，因為這可能會變更驗證/執行時期語意或重複副作用。

選取的配接器 ID 會在嵌入式執行後與工作階段 ID 一起保存。在配接器固定之前建立的舊版工作階段，一旦擁有文字紀錄歷程，就會被視為 PI 固定。在 PI 和原生外掛程式配接器之間切換時，請使用新的/重設的工作階段。`/status` 會在 `Fast` 旁邊顯示非預設的配接器 ID（例如 `codex`）；PI 保持隱藏，因為它是預設的相容性路徑。如果選取的配接器出乎意料，請啟用 `agents/harness` 偵錯記錄並檢查閘道的結構化 `agent harness selected` 記錄。它包含選取的配接器 ID、選取原因、執行時期/後援原則，以及在 `auto` 模式下，每個外掛程式候選項的支援結果。

內建的 Codex 外掛註冊 `codex` 作為其 harness id。Core 將其視為普通的插件 harness id；Codex 專用的別名屬於插件或操作員配置，而不屬於共享的運行時選擇器。

## 提供者與 harness 配對

大多數 harness 也應該註冊一個提供者。提供者使模型參照、身份驗證狀態、模型元數據和 `/model` 選擇對 OpenClaw 的其餘部分可見。然後，harness 在 `supports(...)` 中聲明該提供者。

內建的 Codex 外掛遵循此模式：

- 首選用戶模型參照：`openai/gpt-5.5` 加上
  `agentRuntime.id: "codex"`
- 相容性參照：舊版 `codex/gpt-*` 參照仍然被接受，但新
  配置不應將它們用作常規的提供者/模型參照
- harness id：`codex`
- 身份驗證：合成提供者可用性，因為 Codex harness 擁有
  原生 Codex 登入/會話
- 應用程式伺服器請求：OpenClaw 將純模型 id 發送到 Codex 並讓
  harness 與原生應用程式伺服器協定通信

Codex 外掛是累加的。純 `openai/gpt-*` 參照繼續使用
正常的 OpenClaw 提供者路徑，除非您使用
`agentRuntime.id: "codex"` 強制使用 Codex harness。較舊的 `codex/gpt-*` 參照仍然選擇
Codex 提供者和 harness 以保持相容性。

有關操作員設置、模型前綴示例和僅限 Codex 的配置，請參閱
[Codex Harness](/zh-Hant/plugins/codex-harness)。

OpenClaw 需要 Codex 應用程式伺服器 `0.125.0` 或更新版本。Codex 外掛檢查
應用程式伺服器初始化握手並阻止較舊或未設定版本的伺服器，以便
OpenClaw 僅針對已測試過的協定層運行。
`0.125.0` 下限包含 Codex `0.124.0` 中新增的原生 MCP hook payload 支援，同時將 OpenClaw 固定在較新的已測試穩定版本上。

### 工具結果中介軟體

隨附外掛程式可以透過
`api.registerAgentToolResultMiddleware(...)` 附加與執行階段無關的工具結果中介軟體，
只要其資訊清單在 `contracts.agentToolResultMiddleware` 中宣告了目標執行階段 ID。
此受信縫隙適用於必須在 PI 或 Codex 將工具輸出饋送回模型之前執行的非同步工具結果轉換。

舊版隨附外掛程式仍可針對僅限 Codex 應用程式伺服器
的中介軟體使用 `api.registerCodexAppServerExtensionFactory(...)`，但新的結果轉換應使用與執行階段無關的 API。
僅限 PI 的 `api.registerEmbeddedExtensionFactory(...)` 掛鉤已被移除；
PI 工具結果轉換必須使用與執行階段無關的中介軟體。

### 終端結果分類

擁有自己的通訊協定投射的原生線束，可以在完成的回合未產生
任何可見的助理文字時，使用來自
`openclaw/plugin-sdk/agent-harness-runtime` 的 `classifyAgentHarnessTerminalOutcome(...)`。
此協助程式會傳回 `empty`、`reasoning-only` 或
`planning-only`，以便 OpenClaw 的後援政策決定是否要在不同的模型上重試。
它刻意不對提示錯誤、進行中的回合以及有意無聲回應（例如 `NO_REPLY`）進行分類。

### 原生 Codex 線束模式

隨附的 `codex` 線束是內嵌 OpenClaw
代理程式回合的原生 Codex 模式。先啟用隨附的 `codex` 外掛程式，並且如果您的設定使用限制性允許清單，
請在 `plugins.allow` 中包含 `codex`。
原生應用程式伺服器設定應使用 `openai/gpt-*` 搭配 `agentRuntime.id: "codex"`。
請改用 `openai-codex/*` 透過 PI 進行 Codex OAuth。
舊版 `codex/*`
模型參照仍然是原生線束的相容性別名。

當此模式運行時，Codex 擁有原生執行緒 id、恢復行為、
壓縮和應用伺服器執行。OpenClaw 仍擁有聊天通道、
可見的逐字稿鏡像、工具策略、核准、媒體傳遞和工作階段
選擇。當您需要證明只有 Codex 應用伺服器路徑可以聲稱執行時，
請在不使用 `fallback` 覆蓋的情況下使用 `agentRuntime.id: "codex"`。
明確的外掛執行時預設已封閉失敗 (fail closed)。僅當您有意讓
PI 處理缺少的 harness 選擇時，才設定 `fallback: "pi"`。
Codex 應用伺服器失敗已經直接失敗，而不是透過 PI 重試。

## 停用 PI 備援

預設情況下，OpenClaw 運行嵌入式代理時將 `agents.defaults.agentRuntime`
設定為 `{ id: "auto", fallback: "pi" }`。在 `auto` 模式下，
註冊的外掛 harness 可以聲稱提供者/模型配對。如果沒有匹配的，
OpenClaw 會備援至 PI。

在 `auto` 模式下，當您需要遺失的外掛 harness
選擇失敗而不是使用 PI 時，請設定 `fallback: "none"`。
諸如 `runtime: "codex"` 之類的明確外掛執行時預設已封閉失敗，
除非在相同的設定或環境覆蓋範圍內設定了 `fallback: "pi"`。
選定的外掛 harness 失敗總是會嚴重失敗。這不會阻擋明確的
`runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

對於僅限 Codex 的嵌入式執行：

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

如果您希望任何註冊的外掛 harness 聲稱匹配的模型，但從不
希望 OpenClaw 靜默備援至 PI，請保留 `runtime: "auto"` 並停用
備援：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "none"
      }
    }
  }
}
```

每個代理的覆蓋使用相同的形狀：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": {
          "id": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍然會覆蓋設定的執行時。使用
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 從環境停用 PI 備援。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

停用備援後，當請求的 harness 未註冊、不支援解析後的提供者/模型，
或在產生轉次 (turn) 副作用之前失敗時，工作階段會提早失敗。
這對於僅限 Codex 的部署以及必須證明 Codex 應用伺服器路徑實際上
正在使用的即時測試是有意的。

此設定僅控制嵌入式代理 harness。它不會停用
影像、影片、音樂、TTS、PDF 或其他特定於提供者的模型路由。

## 原生會話和抄本鏡像

繫具可以保留原生會話 ID、執行緒 ID 或守護程序端恢復 Token。請將該繫結與 OpenClaw 會話明確關聯，並繼續將用戶可見的助理/工具輸出鏡像到 OpenClaw 抄本中。

OpenClaw 抄本仍然是以下項目的相容層：

- 通道可見的會話歷史記錄
- 抄本搜尋和索引
- 在後續輪次中切換回內建的 PI 繫具
- 通用的 `/new`、`/reset` 和會話刪除行為

如果您的繫具儲存了附屬繫結，請實作 `reset(...)`，以便當擁有的 OpenClaw 會話重置時，OpenClaw 可以清除它。

## 工具和媒體結果

Core 構造 OpenClaw 工具列表並將其傳遞到準備好的嘗試中。當繫具執行動態工具呼叫時，請透過繫具結果形狀傳回工具結果，而不是自行傳送通道媒體。

這可以讓文字、圖片、影片、音樂、TTS、審核和傳訊工具輸出與 PI 支援的執行位於相同的傳送路徑上。

## 目前的限制

- 公開匯入路徑是通用的，但某些嘗試/結果型別別名仍然帶有 `Pi` 名稱以保持相容性。
- 第三方繫具安裝處於實驗階段。在您需要原生會話執行時間之前，請優先選擇提供者外掛程式。
- 支援跨輪次切換繫具。在原生工具、審核、助理文字或訊息傳送開始後，請勿在輪次中間切換繫具。

## 相關

- [SDK 概述](/zh-Hant/plugins/sdk-overview)
- [執行時間輔助程式](/zh-Hant/plugins/sdk-runtime)
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins)
- [Codex 繫具](/zh-Hant/plugins/codex-harness)
- [模型提供者](/zh-Hant/concepts/model-providers)
