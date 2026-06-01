---
summary: "用於取代低階嵌入式代理程式執行器的實驗性 SDK 介面"
title: "Agent harness 外掛程式"
sidebarTitle: "Agent Harness"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

**Agent harness** 是單一已準備 OpenClaw agent 回合的低層級執行器。它不是模型提供者、通道或工具註冊表。
若要了解使用者層面的心智模型，請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。

請僅將此介面用於隨附或受信任的原生外掛程式。由於參數型別刻意反映了目前的內嵌執行器，因此該合約仍屬實驗性質。

## 何時使用 harness

當模型系列擁有自己的原生 session 執行階段，且標準的 OpenClaw provider 傳輸是不正確的抽象層級時，請註冊一個 agent harness。

範例：

- 擁有執行緒和壓縮功能的原生編碼代理伺服器
- 必須串流原生計畫/推理/工具事件的本機 CLI 或常駐程式
- 除了 OpenClaw session 轉錄之外，還需要自己繼續 ID 的模型執行階段

請**勿**僅為了新增 LLM API 而註冊 harness。對於一般的 HTTP 或 WebSocket 模型 API，請建構 [provider plugin](/zh-Hant/plugins/sdk-provider-plugins)。

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

已準備的嘗試也包含 `params.runtimePlan`，這是 OpenClaw 擁有的政策套件，用於必須在 OpenClaw 與原生 harness 之間保持共享的執行時期決策：

- `runtimePlan.tools.normalize(...)` 和
  `runtimePlan.tools.logDiagnostics(...)`，用於具備 provider 感知的工具結構描述原則
- `runtimePlan.transcript.resolvePolicy(...)`，用於轉錄清理和
  工具呼叫修復原則
- `runtimePlan.delivery.isSilentPayload(...)`，用於共用的 `NO_REPLY` 和媒體
  傳遞抑制
- `runtimePlan.outcome.classifyRunResult(...)` 用於模型後援分類
- `runtimePlan.observability` 用於已解析的提供者/模型/配接器中繼資料

Harness 可以使用該計畫來做出符合 OpenClaw 行為的決策，但仍應將其視為主機擁有的嘗試狀態。請勿變更它或使用它在單一回合內切換提供者/模型。

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

1. 模型範圍的執行時期政策優先。
2. 其次是提供者範圍的執行時期政策。
3. `auto` 會詢問已註冊的 harness 是否支援解析後的
   提供者/模型。
4. 如果沒有註冊的 harness 相符，OpenClaw 會使用其內嵌執行時期。

Plugin harness 失敗會顯示為執行失敗。在 `auto` 模式下，只有在沒有註冊的 plugin harness 支援已解析的提供者/模型時，才會使用內嵌備援方案。一旦 plugin harness 宣告了執行，OpenClaw 不會透過其他執行時期重播同一個回合，因為這可能會變更驗證/執行時期語意或重複副作用。

選擇過程會忽略整個會話和整個代理的 runtime 釘選。這包括過時的會話 `agentHarnessId` 值、`agents.defaults.agentRuntime`、`agents.list[].agentRuntime` 和 `OPENCLAW_AGENT_RUNTIME`。`/status` 顯示了從提供者/模型路徑中選取的有效 runtime。如果選取的令人駭馭，請啟用 `agents/harness` 除錯日誌並檢查閘道的結構化 `agent harness selected` 記錄。它包含選取的 harness ID、選取原因、runtime/後援策略，以及在 `auto` 模式下，每個外掛候選者的支援結果。

隨附的 Codex 外掛程式將 `codex` 註冊為其 harness id。核心將其視為一般的 plugin harness id；Codex 專用的別名應屬於外掛程式或操作員設定，而不屬於共用執行時間選擇器。

## 提供者與 Harness 配對

大多數 harness 也應該註冊一個提供者。提供者讓模型參照、驗證狀態、模型中繼資料和 `/model` 選擇對 OpenClaw 的其他部分可見。然後 harness 在 `supports(...)` 中宣告該提供者。

隨附的 Codex 外掛程式遵循此模式：

- 優先的使用者模型參照：`openai/gpt-5.5`
- 相容性參照：舊版 `codex/gpt-*` 參照仍可接受，但新設定不應將其用作一般的提供者/模型參照
- harness id：`codex`
- auth：綜合提供者的可用性，因為 Codex harness 擁有原生 Codex 登入/會話
- app-server request：OpenClaw 將純模型 id 發送給 Codex，並讓 harness 與原生 app-server 協定通訊

Codex 外掛程式是增補性的。官方 OpenAI 提供者上的純 `openai/gpt-*` agent 參照預設會選取 Codex harness。較舊的 `codex/gpt-*` 參照為了相容性，仍會選取 Codex 提供者和 harness。

如需操作員設定、模型前綴範例，以及僅限 Codex 的設定，請參閱
[Codex Harness](/zh-Hant/plugins/codex-harness)。

OpenClaw 需要 Codex app-server `0.125.0` 或更新版本。Codex 外掛程式會檢查 app-server 初始化交握並封鎖較舊或無版本資訊的伺服器，因此 OpenClaw 只會針對其已測試過的通訊協定介面執行。`0.125.0` 的最低版本包含 Codex `0.124.0` 中新增的原生 MCP hook payload 支援，同時將 OpenClaw 釘選到較新的已測試穩定版本線。

### Tool-result 中介軟體

當其 manifest 在 `contracts.agentToolResultMiddleware` 中宣告目標執行時期 ID 時，Bundle 外掛程式可以透過
`api.registerAgentToolResultMiddleware(...)` 附加與執行時期無關的工具結果中介軟體。此信任的縫合點是用於必須在 OpenClaw 或 Codex 將工具輸出回饋至模型之前執行的非同步工具結果轉換。

舊版的 bundle 外掛程式仍可針對僅限 Codex app-server 的
中介軟體使用
`api.registerCodexAppServerExtensionFactory(...)`，但新的結果轉換應使用與執行時期無關的 API。
僅限 embedded-runner 的 `api.registerEmbeddedExtensionFactory(...)` hook 已被移除；
內嵌工具結果轉換必須使用與執行時期無關的中介軟體。

### 終端結果分類

擁有自己通訊協定投影的原生套組可以使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)`，當完成的輪次未產生任何可見的助理文字時。此輔助函式會回傳 `empty`、`reasoning-only` 或 `planning-only`，以便 OpenClaw 的後援政策能決定是否在不同模型上重試。它刻意不將提示錯誤、進行中的輪次和刻意的無聲回覆（例如 `NO_REPLY`）進行分類。

### 原生 Codex 套組模式

隨附的 `codex` 插接器是內嵌 OpenClaw
代理程式回合的原生 Codex 模式。請先啟用隨附的 `codex` 外掛程式，如果你的設定使用嚴格的允許清單，請將 `codex` 包含在
`plugins.allow` 中。原生應用程式伺服器
設定應使用 `openai/gpt-*`；OpenAI 代理程式回合預設會選擇 Codex 插接器。
舊版 `openai-codex/*` 路由應使用 `openclaw doctor --fix` 進行修復，而舊版 `codex/*` 模型參照則保留為
原生插接器的相容性別名。

當此模式執行時，Codex 擁有原生執行緒 ID、恢復行為、壓縮和應用程式伺服器執行權。OpenClaw 仍然擁有聊天通道、可見的逐字稿鏡像、工具政策、核准、媒體傳遞和工作階段選擇權。當您需要證明只有 Codex 應用程式伺服器路徑能聲稱該執行時，請使用 provider/model `agentRuntime.id: "codex"`。明確的外掛程式執行時會以封閉式失敗（fail closed）；Codex 應用程式伺服器選擇失敗和執行時失敗不會透過另一個執行時重試。

## 運行時嚴格性

預設情況下，OpenClaw 使用 `auto` provider/model 執行時政策：已註冊的外掛程式工具程式可以聲稱一個 provider/model 配對，而當沒有配對符合時，內建執行時會處理該回合。官方 OpenAI 提供者上的 OpenAI 代理程式參照預設為 Codex。當缺少工具程式選擇應該失敗，而不是透過內建執行時路由時，請使用明確的 provider/model 外掛程式執行時，例如 `agentRuntime.id: "codex"`。選定的外掛程式工具程式失敗始終會嚴重失敗。這不會阻擋明確的 provider/model `agentRuntime.id: "openclaw"`。

對於僅限 Codex 的嵌入式執行：

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5"
    }
  }
}
```

如果您想要某個標準模型的 CLI 後端，請將執行時放在該模型條目上：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-8",
      "models": {
        "anthropic/claude-opus-4-8": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

單一 agent 的覆蓋使用相同的模型範圍結構：

```json
{
  "agents": {
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "models": {
          "openai/gpt-5.5": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    ]
  }
}
```

像這樣的舊版整體 agent 執行時範例會被忽略：

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

在使用明確的插件執行時時，若請求的 harness 未註冊、不支援解析後的提供者/模型，或在產生 turn 副作用前失敗，工作階段會提早失敗。這對於僅使用 Codex 的部署以及必須證明 Codex 應用程式伺服器路徑確實在使用的即時測試來說，是故意的設計。

此設定僅控制內嵌的 agent harness。它不會停用圖片、影片、音樂、TTS、PDF 或其他提供者專用的模型路由。

## 原生工作階段與記錄映射

Harness 可能會保留原生工作階段 ID、執行緒 ID 或 daemon 端的恢復權杖。請將該綁定與 OpenClaw 工作階段明確關聯，並繼續將使用者可見的 assistant/tool 輸出映射到 OpenClaw 記錄中。

OpenClaw 記錄仍是以下項目的相容性層：

- 通道可見的工作階段歷史記錄
- 記錄搜尋與索引
- 在後續回合切換回內建的 OpenClaw 工具程式
- 通用 `/new`、`/reset` 和會話刪除行為

如果您的 harness 儲存了 sidecar 綁定，請實作 `reset(...)`，以便 OpenClaw 在擁有的 OpenClaw 會話重置時將其清除。

## 工具和媒體結果

Core 建構 OpenClaw 工具清單並將其傳遞到準備好的嘗試中。當 harness 執行動態工具呼叫時，請透過 harness 結果形狀傳回工具結果，而不是自行傳送通道媒體。

這能讓文字、圖像、影片、音樂、TTS、核准和訊息工具輸出保持與 OpenClaw 支援的執行相同的傳遞路徑。

## 目前的限制

- 公開的匯入路徑是通用的，但部分嘗試/結果類型別名仍為了相容性而保留了舊有名稱。
- 第三方 harness 安裝為實驗性功能。在您需要原生會話執行時間之前，建議優先使用提供者外掛程式。
- 支援在回合之間切換駝具。請勿在啟動原生工具、審批、助理文字或訊息傳送後的回合中途切換駝具。

## 相關

- [SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [執行時協助程式](/zh-Hant/plugins/sdk-runtime)
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins)
- [Codex 工具程式](/zh-Hant/plugins/codex-harness)
- [模型提供者](/zh-Hant/concepts/model-providers)
