---
title: "Agent Harness 插件"
sidebarTitle: "Agent Harness"
summary: "用於替換底層嵌入式代理執行器的實驗性 SDK 介面"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

# Agent Harness 插件

一個 **agent harness** 是針對一個已準備好的 OpenClaw 代理回合的低階執行器。它不是模型提供者，不是通道，也不是工具註冊表。

僅將此介面用於隨附或受信任的原生插件。該合約仍處於實驗階段，因為參數類型有意反映了當前的嵌入式執行器。

## 何時使用 harness

當模型系列擁有自己的原生會話運行時，且正常的 OpenClaw 提供者傳輸是錯誤的抽象層時，請註冊一個 agent harness。

範例：

- 一個擁有執行緒和壓縮功能的原生編碼代理伺服器
- 必須串流原生計畫/推理/工具事件的本地 CLI 或守護程序
- 除 OpenClaw 會話記錄外，還需要自己復原 ID 的模型運行時

請**勿**僅為了新增新的 LLM API 而註冊 harness。對於一般的 HTTP 或 WebSocket 模型 API，請建構 [provider plugin](/zh-Hant/plugins/sdk-provider-plugins)。

## 核心仍然擁有的部分

在選擇 harness 之前，OpenClaw 已經解析了：

- 提供者和模型
- 運行時身份驗證狀態
- 思考層級和上下文預算
- OpenClaw 記錄/會話檔案
- 工作區、沙箱和工具策略
- 通道回覆回呼和串流回呼
- 模型回退和即時模型切換策略

這種分割是有意為之的。Harness 運行已準備的嘗試；它不選擇提供者、不替換通道交付，也不會無聲地切換模型。

## 註冊 harness

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

## 選擇策略

OpenClaw 在解析提供者/模型之後選擇一個 harness：

1. `OPENCLAW_AGENT_RUNTIME=<id>` 強制使用具有該 ID 的已註冊 harness。
2. `OPENCLAW_AGENT_RUNTIME=pi` 強制使用內建的 PI harness。
3. `OPENCLAW_AGENT_RUNTIME=auto` 詢問已註冊的 harness 是否支援解析出的提供者/模型。
4. 如果沒有已註冊的 harness 匹配，除非停用了 PI 回退，否則 OpenClaw 將使用 PI。

外掛 harness 失敗會表現為執行失敗。在 `auto` 模式下，僅當沒有已註冊的外掛 harness 支援解析後的 provider/model 時，才會使用 PI 備援機制。一旦外掛 harness 宣稱了某次執行，OpenClaw 將不會透過 PI 重播該輪次，因為這可能會改變 auth/runtime 語意或重複副作用。

內建的 Codex 外掛將 `codex` 註冊為其 harness id。核心將其視為普通的 plugin harness id；Codex 專用的別名應屬於外掛或操作員設定，而不屬於共享的 runtime selector。

## 提供者與配接器配對

大多數 harness 也應該註冊 provider。Provider 會讓模型參照、auth 狀態、模型中繼資料和 `/model` 選擇對 OpenClaw 的其他部分可見。然後 harness 會在 `supports(...)` 中宣稱該 provider。

隨附的 Codex 外掛遵循此模式：

- provider id: `codex`
- user model refs: `codex/gpt-5.4`, `codex/gpt-5.2`, 或 Codex app server 回傳的其他模型
- harness id: `codex`
- auth: 合成的提供者可用性，因為 Codex 配接器擁有
  原生 Codex 登入/工作階段
- app-server request: OpenClaw 將純模型 ID 傳送給 Codex 並讓
  配接器與原生應用伺服器通訊協定交談

Codex 外掛是附加性的。單純的 `openai/gpt-*` 參照仍然是 OpenAI provider 參照，並會繼續使用正常的 OpenClaw provider 路徑。當您想要由 Codex 管理的 auth、Codex 模型探索、原生執行緒和 Codex app-server 執行時，請選擇 `codex/gpt-*`。`/model` 可以在 Codex app server 回傳的 Codex 模型之間切換，而不需要 OpenAI provider 憑證。

關於操作員設定、模型前綴範例和 Codex 專用設定，請參閱 [Codex Harness](/zh-Hant/plugins/codex-harness)。

OpenClaw 需要 Codex app-server `0.118.0` 或更新版本。Codex 外掛會檢查 app-server 初始化交握，並阻擋較舊或未標記版本的伺服器，因此 OpenClaw 只會針對已測試過的協定介面執行。

### Codex app-server tool-result 中介軟體

捆綁式外掛程式也可以在其清單宣告 `contracts.embeddedExtensionFactories: ["codex-app-server"]` 時，透過 `api.registerCodexAppServerExtensionFactory(...)` 附加 Codex 應用程式伺服器專屬的 `tool_result` 中介軟體。這是信任外掛程式的縫合點，用於需要在工具輸出投射回 OpenClaw 逐字稿之前，於原生 Codex 韁具內執行的非同步工具結果轉換。

### 原生 Codex 韁具模式

捆綁的 `codex` 韁具是嵌入式 OpenClaw 代理程式回合的原生 Codex 模式。請先啟用捆綁的 `codex` 外掛程式，如果您的設定使用限制性允許清單，請在 `plugins.allow` 中包含 `codex`。它與 `openai-codex/*` 不同：

- `openai-codex/*` 透過正常的 OpenClaw 提供者路徑使用 ChatGPT/Codex OAuth。
- `codex/*` 使用捆綁的 Codex 提供者，並透過 Codex 應用程式伺服器路由回合。

當此模式執行時，Codex 擁有原生執行緒 ID、恢復行為、壓縮和應用程式伺服器執行。OpenClaw 仍然擁有聊天通道、可見的逐字稿鏡像、工具政策、核准、媒體傳遞和工作階段選取。當您需要證明只有 Codex 應用程式伺服器路徑可以聲稱該執行時，請使用 `embeddedHarness.runtime: "codex"` 搭配 `embeddedHarness.fallback: "none"`。該設定只是一個選擇防護：Codex 應用程式伺服器失敗已經會直接失敗，而不是透過 PI 重試。

## 停用 PI 備援

根據預設，OpenClaw 執行嵌入式代理程式時，會將 `agents.defaults.embeddedHarness` 設定為 `{ runtime: "auto", fallback: "pi" }`。在 `auto` 模式下，已註冊的外掛程式韁具可以聲稱提供者/模型組合。如果沒有相符的項目，OpenClaw 會備援至 PI。

當您需要遺失的外掛程式韁具選擇失敗而不是使用 PI 時，請設定 `fallback: "none"`。選定的外掛程式韁具失敗已經會嚴重失敗。這不會阻擋明確的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

對於僅限 Codex 的嵌入式執行：

```json
{
  "agents": {
    "defaults": {
      "model": "codex/gpt-5.4",
      "embeddedHarness": {
        "runtime": "codex",
        "fallback": "none"
      }
    }
  }
}
```

如果您希望任何已註冊的外掛程式韁具能聲稱相符的模型，但絕不希望 OpenClaw 悄悄備援至 PI，請保留 `runtime: "auto"` 並停用備援：

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "none"
      }
    }
  }
}
```

個別代理覆寫使用相同的形狀：

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "codex/gpt-5.4",
        "embeddedHarness": {
          "runtime": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` 仍然會覆寫已設定的執行時期。使用
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 來停用來自環境的
PI 回退。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

停用回退後，當請求的輓具未註冊、不支援解析後的提供者/模型，或在產生輪次副作用之前失敗時，工作階段會提早失敗。這對於僅使用 Codex 的部署以及必須證明 Codex app-server 路徑實際上正在生效的即時測試來說，是有意圖的設計。

此設定僅控制內嵌的代理輓具。它不會停用
影像、影片、音樂、TTS、PDF 或其他提供者特定的模型路由。

## 原生工作階段和逐字稿鏡像

輓具可能會保留原生的工作階段 ID、執行緒 ID 或守護程式端的恢復權杖。
請將該綁定與 OpenClaw 工作階段明確關聯，並繼續將用戶可見的助理/工具輸出鏡像到 OpenClaw 逐字稿中。

OpenClaw 逐字稿仍是以下各項的相容層：

- 通道可見的工作階段歷史記錄
- 逐字稿搜尋和索引
- 在稍後的輪次中切換回內建的 PI 輓具
- 通用的 `/new`、`/reset` 和工作階段刪除行為

如果您的輓具儲存了側車綁定，請實作 `reset(...)`，以便當擁有的 OpenClaw 工作階段被重設時，OpenClaw 可以將其清除。

## 工具和媒體結果

核心會建構 OpenClaw 工具清單並將其傳遞至準備好的嘗試中。
當輓具執行動態工具呼叫時，請透過輓具結果形狀傳回工具結果，而不要自行傳送通道媒體。

這可讓文字、影像、影片、音樂、TTS、核准和傳訊工具輸出
與 PI 支援的執行位於相同的傳遞路徑上。

## 目前的限制

- 公開的匯入路徑是通用的，但部分嘗試/結果類型別名仍
  沿用 `Pi` 名稱以保持相容性。
- 第三方輓具安裝屬於實驗性功能。直到您需要原生工作階段執行時期之前，請優先使用提供者外掛程式
  。
- 支援跨輪次切換輓具。不要在原生工具、核准、助理文字或訊息
  傳送開始後，於輪次中途切換輓具。

## 相關

- [SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Runtime Helpers](/zh-Hant/plugins/sdk-runtime)
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins)
- [Codex Harness](/zh-Hant/plugins/codex-harness)
- [Model Providers](/zh-Hant/concepts/model-providers)
