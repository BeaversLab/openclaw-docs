---
title: "建置外掛程式"
sidebarTitle: "開始使用"
summary: "在幾分鐘內建立您的第一個 OpenClaw 外掛程式"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

# 建置外掛程式

插件為 OpenClaw 擴充新功能：管道、模型供應商、語音、即時轉錄、即時語音、媒體理解、影像生成、影片生成、網路擷取、網路搜尋、代理工具，或以上項目的任意組合。

您不需要將您的插件加入 OpenClaw 儲存庫。發佈到 [ClawHub](/en/tools/clawhub) 或 npm，使用者即可使用 `openclaw plugins install <package-name>` 安裝。OpenClaw 會先嘗試 ClawHub，然後自動回退到 npm。

## 先決條件

- Node >= 22 與套件管理工具 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 對於儲存庫內的外掛程式：儲存庫已複製並且完成 `pnpm install`

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    將 OpenClaw 連線到訊息平台（Discord、IRC 等）
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    新增模型提供者（LLM、Proxy 或自訂端點）
  </Card>
  <Card title="工具 / 掛件外掛" icon="wrench">
    註冊代理工具、事件掛件或服務 — 繼續閱讀下方內容
  </Card>
</CardGroup>

如果管道插件是選用的，且可能在上線/設定執行時尚未安裝，請使用來自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface(...)`。它會產生一組設定配接器與精靈，用以宣佈安裝需求，並在實際設定寫入時封閉式失敗，直到插件安裝為止。

## 快速入門：工具插件

此逐步指南將建立一個註冊代理工具的最小化插件。管道和供應商插件有連結在上述的專屬指南。

<Steps>
  <Step title="建立套件與清單">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "description": "Adds a custom tool to OpenClaw",
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每個插件都需要一個清單，即使沒有設定也一樣。請參閱 [Manifest](/en/plugins/manifest) 以了解完整的架構。標準的 ClawHub 發佈程式碼片段位於 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="撰寫進入點">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` 是用於非管道插件。對於管道，請使用 `defineChannelPluginEntry` — 請參閱 [Channel Plugins](/en/plugins/sdk-channel-plugins)。如需完整的進入點選項，請參閱 [Entry Points](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發佈">

    **外部插件：** 使用 ClawHub 驗證並發佈，然後安裝：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    OpenClaw 對於裸套件規格（如 `@myorg/openclaw-my-plugin`）也會在檢查 npm 之前先檢查 ClawHub。

    **In-repo plugins:** 放置在捆綁的插件工作區樹下 — 會自動發現。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

單一外掛程式可以透過 `api` 物件註冊任意數量的功能：

| 功能           | 註冊方法                                         | 詳細指南                                                                         |
| -------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| 文字推理 (LLM) | `api.registerProvider(...)`                      | [供應商外掛程式](/en/plugins/sdk-provider-plugins)                               |
| 頻道 / 傳訊    | `api.registerChannel(...)`                       | [頻道外掛程式](/en/plugins/sdk-channel-plugins)                                  |
| 語音 (TTS/STT) | `api.registerSpeechProvider(...)`                | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時轉錄       | `api.registerRealtimeTranscriptionProvider(...)` | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時語音       | `api.registerRealtimeVoiceProvider(...)`         | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解       | `api.registerMediaUnderstandingProvider(...)`    | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影像生成       | `api.registerImageGenerationProvider(...)`       | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音樂生成       | `api.registerMusicGenerationProvider(...)`       | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影片生成       | `api.registerVideoGenerationProvider(...)`       | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁擷取       | `api.registerWebFetchProvider(...)`              | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁搜尋       | `api.registerWebSearchProvider(...)`             | [供應商外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 代理程式工具   | `api.registerTool(...)`                          | 下方                                                                             |
| 自訂指令       | `api.registerCommand(...)`                       | [進入點](/en/plugins/sdk-entrypoints)                                            |
| 事件攔截器     | `api.registerHook(...)`                          | [進入點](/en/plugins/sdk-entrypoints)                                            |
| HTTP 路由      | `api.registerHttpRoute(...)`                     | [內部機制](/en/plugins/architecture#gateway-http-routes)                         |
| CLI 子指令     | `api.registerCli(...)`                           | [進入點](/en/plugins/sdk-entrypoints)                                            |

如需完整的註冊 API，請參閱 [SDK 概觀](/en/plugins/sdk-overview#registration-api)。

如果您的插件註冊自訂閘道 RPC 方法，請將其保留在插件特定的前綴上。核心管理命名空間（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，並且總是解析為
`operator.admin`，即使插件請求的範圍更窄。

需記住的 Hook guard 語義：

- `before_tool_call`：`{ block: true }` 是終止的，並且會停止較低優先級的處理程序。
- `before_tool_call`：`{ block: false }` 被視為未做決定。
- `before_tool_call`：`{ requireApproval: true }` 暫停代理程式執行，並透過執行核准覆蓋層、Telegram 按鈕、Discord 互動或任何頻道上的 `/approve` 指令提示使用者進行核准。
- `before_install`：`{ block: true }` 是終止的，並且會停止較低優先級的處理程序。
- `before_install`：`{ block: false }` 被視為未做決定。
- `message_sending`：`{ cancel: true }` 是終止的，並且會停止較低優先級的處理程序。
- `message_sending`：`{ cancel: false }` 被視為未做決定。

`/approve` 指令透過有界回退處理執行和插件核准：當找不到執行核准 ID 時，OpenClaw 會透過插件核准重試相同的 ID。插件核准轉發可以透過設定中的 `approvals.plugin` 獨立設定。

如果自訂核准機制需要偵測到相同的界限回退情況，
建議優先使用 `isApprovalNotFoundError` 來自 `openclaw/plugin-sdk/error-runtime`
，而不是手動匹配核准過期字串。

詳見 [SDK Overview hook decision semantics](/en/plugins/sdk-overview#hook-decision-semantics)。

## 註冊代理程式工具

工具是 LLM 可以呼叫的型別函式。它們可以是必需的（始終可用）或可選的（使用者選擇加入）：

```typescript
register(api) {
  // Required tool — always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool — user must add to allowlist
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

使用者在設定中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突將被跳過）
- 對於具有副作用或額外二進位需求的工具，請使用 `optional: true`
- 使用者可以透過將外掛 ID 新增至 `tools.allow` 來啟用該外掛的所有工具

## 匯入慣例

請務必從專注的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

如需完整的子路徑參考，請參閱 [SDK 概觀](/en/plugins/sdk-overview)。

在您的外掛中，請使用本地桶檔案（barrel files）（`api.ts`、`runtime-api.ts`）進行
內部匯入 —— 切勿透過其 SDK 路徑匯入您自己的外掛。

對於提供者外掛，除非介面確實通用，否則請將特定於提供者的輔助函式保留在這些套件根目錄的
桶檔案中。目前附帶的範例包括：

- Anthropic：Claude 串流包裝器以及 `service_tier` / beta 輔助函式
- OpenAI：提供者建構器、預設模型輔助函式、即時提供者
- OpenRouter：提供者建構器以及上線/配置輔助函式

如果輔助函式僅在某個附帶的提供者套件內有用，請將其保留在該
套件根目錄的介面上，而不是將其提升至 `openclaw/plugin-sdk/*`。

部分生成的 `openclaw/plugin-sdk/<bundled-id>` 輔助介面仍然存在，
用於附帶外掛的維護和相容性，例如
`plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。請將其視為保留介面，
而非新第三方外掛的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 資訊清單存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過（`pnpm test -- <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通過（存放庫內的外掛）</Check>

## Beta 版發布測試

1. 留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發布標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知，以獲取發布公告。
2. Beta 標籤一出現，請立即針對其測試您的插件。穩定版本發布前的時間窗口通常只有幾個小時。
3. 測試後，請在 `plugin-forum` Discord 頻道的您的插件主題串中發布回覆，說明 `all good` 或是遇到了什麼問題。如果您還沒有主題串，請建立一個。
4. 如果有任何問題，請開啟或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的 issue，並套用 `beta-blocker` 標籤。將 issue 連結放在您的主題串中。
5. 向 `main` 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並將 issue 連結同時放在 PR 和您的 Discord 主題串中。貢獻者無法標記 PR，因此標題是給維護者和自動化工具看的 PR 端訊號。有 PR 的阻礙性問題會被合併；沒有 PR 的可能仍會直接發布。維護者在 Beta 測試期間會關注這些主題串。
6. 沒有消息就是好消息。如果您錯過了時間窗口，您的修復很可能會在下一個週期落地。

## 下一步

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    建構訊息通道插件
  </Card>
  <Card title="提供者插件" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    建構模型提供者插件
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/en/plugins/sdk-overview">
    匯入映射與註冊 API 參考
  </Card>
  <Card title="執行時輔助函式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、搜尋、子代理程式
  </Card>
  <Card title="測試" icon="test-tubes" href="/en/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="外掛程式清單" icon="file-" href="/en/plugins/manifest">
    完整的清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛程式架構](/en/plugins/architecture) — 內部架構深度剖析
- [SDK 概觀](/en/plugins/sdk-overview) — 外掛程式 SDK 參考
- [清單](/en/plugins/manifest) — 外掛程式清單格式
- [頻道外掛程式](/en/plugins/sdk-channel-plugins) — 建置頻道外掛程式
- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 建置提供者外掛程式
