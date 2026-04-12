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

請**勿**僅為了新增新的 LLM API 而註冊 harness。對於正常的 HTTP 或 WebSocket 模型 API，請建構[提供者插件](/en/plugins/sdk-provider-plugins)。

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

強制的插件配接器失敗會以執行失敗呈現。在 `auto` 模式下，當選定的插件配接器在單次輪次產生副作用之前失敗時，OpenClaw 可能會回退到 PI。設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=none` 或 `embeddedHarness.fallback: "none"` 可將該回退變為嚴重失敗。

隨附的 Codex 外掛將 `codex` 註冊為其配接器 ID。Core 將其視為一般的插件配接器 ID；Codex 專用的別名應屬於外掛或操作員設定，而非共用執行時選擇器。

## 提供者與配接器配對

大多數配接器也應註冊一個提供者。提供者會將模型參考、授權狀態、模型中繼資料和 `/model` 選擇對 OpenClaw 的其他部分公開。隨後配接器會在 `supports(...)` 中宣告該提供者。

隨附的 Codex 外掛遵循此模式：

- provider id: `codex`
- user model refs: `codex/gpt-5.4`、`codex/gpt-5.2`，或 Codex 應用伺服器傳回的
  其他模型
- harness id: `codex`
- auth: 合成的提供者可用性，因為 Codex 配接器擁有
  原生 Codex 登入/工作階段
- app-server request: OpenClaw 將純模型 ID 傳送給 Codex 並讓
  配接器與原生應用伺服器通訊協定交談

Codex 外掛是附加性的。單純的 `openai/gpt-*` 參考仍是 OpenAI 提供者參考，並繼續使用一般的 OpenClaw 提供者路徑。當您想要 Codex 管理的授權、Codex 模型探索、原生執行緒和 Codex 應用伺服器執行時，請選擇 `codex/gpt-*`。`/model` 可在 Codex 應用伺服器傳回的 Codex 模型之間切換，而不需要 OpenAI 提供者憑證。

如需操作員設定、模型前綴範例和 Codex 專用設定，請參閱
[Codex Harness](/en/plugins/codex-harness)。

OpenClaw 需要 Codex 應用伺服器 `0.118.0` 或更新版本。Codex 外掛會檢查應用伺服器初始化交握，並阻擋較舊或無版本的伺服器，以便 OpenClaw 僅針對已測試的通訊協定介面執行。

## 停用 PI 回退

預設情況下，OpenClaw 運行內置代理時將 `agents.defaults.embeddedHarness`
設定為 `{ runtime: "auto", fallback: "pi" }`。在 `auto` 模式下，已註冊的
插件套件可以宣告提供者/模型配對。如果沒有匹配項，或者自動選擇的
插件套件在產生輸出之前失敗，OpenClaw 將回退至 PI。

當您需要證明插件套件是唯一正在運行的執行時，請設定 `fallback: "none"`。這將停用
自動 PI 回退；但不會阻擋明確的 `runtime: "pi"` 或 `OPENCLAW_AGENT_RUNTIME=pi`。

對於僅限 Codex 的內置運行：

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

如果您希望任何已註冊的插件套件宣告匹配的模型，但從不希望 OpenClaw
靜默回退至 PI，請保留 `runtime: "auto"` 並停用回退：

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

每個代理的覆蓋設定使用相同的結構：

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

`OPENCLAW_AGENT_RUNTIME` 仍然會覆蓋已配置的執行時。請使用
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 從環境中停用 PI 回退。

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

停用回退後，當請求的套件未註冊、不支援解析後的提供者/模型，或在
產生輪次副作用之前失敗時，工作階段會提前失敗。這對於僅限 Codex 的部署
以及必須證明 Codex 應用伺服器路徑實際正在使用的即時測試來說，是有意義的。

此設定僅控制內置代理套件。它不會停用
圖片、影片、音樂、TTS、PDF 或其他特定提供者的模型路由。

## 原生工作階段和文字記錄鏡像

套件可能會保留原生工作階段 ID、執行緒 ID 或守護程序端恢復權杖。
請將該綁定與 OpenClaw 工作階段明確關聯，並繼續將用戶可見的助理/工具輸出
鏡像到 OpenClaw 文字記錄中。

OpenClaw 文字記錄仍然是以下內容的相容性層：

- 通道可見的工作階段歷史記錄
- 文字記錄搜尋和索引
- 在後續輪次切換回內置 PI 套件
- 通用的 `/new`、`/reset` 和工作階段刪除行為

如果您的套件存儲了附屬綁定，請實作 `reset(...)`，以便當擁有的
OpenClaw 工作階段重置時，OpenClaw 可以將其清除。

## 工具和媒體結果

Core 會構建 OpenClow 工具列表並將其傳遞到準備好的嘗試中。當 harness 執行動態工具呼叫時，請透過 harness 結果形狀傳回工具結果，而不是自行傳送通道媒體。

這保持了文字、圖片、影片、音樂、TTS、審批和訊息工具輸出與 PI 支援的執行位於相同的傳遞路徑上。

## 目前限制

- 公匯入路徑是通用的，但部分 attempt/result 類型別名為了相容性仍帶有 `Pi` 名稱。
- 第三方 harness 安裝仍屬實驗性。在您需要原生會話執行時段之前，請優先考慮提供者外掛程式。
- 支援在回合之間切換 harness。在原生工具、審批、助手文字或訊息傳送已開始後，請勿在回合中途切換 harness。

## 相關

- [SDK 概觀](/en/plugins/sdk-overview)
- [執行時段輔助程式](/en/plugins/sdk-runtime)
- [提供者外掛程式](/en/plugins/sdk-provider-plugins)
- [Codex Harness](/en/plugins/codex-harness)
- [模型提供者](/en/concepts/model-providers)
