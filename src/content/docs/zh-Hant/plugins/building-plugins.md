---
summary: "幾分鐘內建立您的第一個 OpenClaw 外掛程式"
title: "建立外掛程式"
sidebarTitle: "開始使用"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

外掛程式透過新功能擴充 OpenClaw：頻道、模型供應商、
語音、即時轉錄、即時語音、媒體理解、影像
產生、影片產生、網路擷取、網路搜尋、代理工具，或任何
組合。

您不需要將外掛程式新增至 OpenClaw 儲存庫。發佈至
[ClawHub](/zh-Hant/tools/clawhub) 或 npm，使用者會使用
`openclaw plugins install <package-name>` 進行安裝。OpenClaw 會先嘗試 ClawHub，然後
自動回退至 npm。

## 必要條件

- Node >= 22 與套件管理員 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 對於儲存庫內的外掛程式：已複製儲存庫並完成 `pnpm install`

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    將 OpenClaw 連線至訊息平台 (Discord、IRC 等)
  </Card>
  <Card title="供應商外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    新增模型供應商 (LLM、Proxy 或自訂端點)
  </Card>
  <Card title="工具 / Hook 外掛程式" icon="wrench" href="/zh-Hant/plugins/hooks">
    註冊代理工具、事件 Hook 或服務 — 請繼續閱讀下方內容
  </Card>
</CardGroup>

對於無法保證在執行上架/設定時已安裝的頻道外掛程式，
請使用來自 `openclaw/plugin-sdk/channel-setup` 的
`createOptionalChannelSetupSurface(...)`。它會產生設定介面卡 + 精靈組合，
會宣佈安裝需求，並在外掛程式安裝前，對實際設定寫入採取
失敗封閉 (fail closed) 處理。

## 快速入門：工具外掛程式

此逐步解說會建立一個註冊代理工具的極簡外掛程式。
頻道與供應商外掛程式有連結至上述的專屬指南。

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

    每個外掛都需要一個清單，即使沒有設定也一樣。請參閱
    [Manifest](/zh-Hant/plugins/manifest) 以了解完整的架構。正式的 ClawHub
    發布程式碼片段位於 `docs/snippets/plugin-publish/` 中。

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

    `definePluginEntry` 是用於非頻道外掛的。對於頻道，請使用
    `defineChannelPluginEntry` — 請參閱 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)。
    如需完整的進入點選項，請參閱 [Entry Points](/zh-Hant/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發布">

    **外部外掛：** 使用 ClawHub 驗證並發布，然後進行安裝：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    對於裸露的套件規格（例如 `@myorg/openclaw-my-plugin`），OpenClaw 也會在檢查 npm 之前先檢查 ClawHub。

    **In-repo 外掛：** 將其置於捆綁的外掛工作區樹下 — 將會自動被發現。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 外掛功能

單一外掛可以透過 `api` 物件註冊任意數量的功能：

| 功能             | 註冊方法                                         | 詳細指南                                                                           |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 文字推論 (LLM)   | `api.registerProvider(...)`                      | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins)                               |
| CLI 推論後端     | `api.registerCliBackend(...)`                    | [CLI Backends](/zh-Hant/gateway/cli-backends)                                           |
| 頻道 / 傳訊      | `api.registerChannel(...)`                       | [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)                                 |
| 語音 (TTS/STT)   | `api.registerSpeechProvider(...)`                | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時轉錄         | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時語音         | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解         | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影像生成         | `api.registerImageGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| 音樂生成         | `api.registerMusicGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| 影片生成         | `api.registerVideoGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| 網頁擷取         | `api.registerWebFetchProvider(...)`              | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| 網頁搜尋         | `api.registerWebSearchProvider(...)`             | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| 工具結果中介軟體 | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)                              |
| 代理工具         | `api.registerTool(...)`                          | 下方                                                                               |
| 自訂指令         | `api.registerCommand(...)`                       | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |
| 外掛掛鉤         | `api.on(...)`                                    | [外掛掛鉤](/zh-Hant/plugins/hooks)                                                      |
| 內部事件掛鉤     | `api.registerHook(...)`                          | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |
| HTTP 路由        | `api.registerHttpRoute(...)`                     | [內部機制](/zh-Hant/plugins/architecture-internals#gateway-http-routes)                 |
| CLI 子指令       | `api.registerCli(...)`                           | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |

如需完整的註冊 API，請參閱 [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)。

打包的外掛可以在需要對工具結果進行非同步重寫（在模型看到輸出之前）時使用 `api.registerAgentToolResultMiddleware(...)`。請在 `contracts.agentToolResultMiddleware` 中宣告目標執行環境，例如 `["pi", "codex"]`。這是一個受信任的打包外掛介面；除非 OpenClaw 針對此功能發展出明確的信任政策，否則外部外掛應優先使用常規的 OpenClaw 外掛掛鉤。

如果您的外掛註冊了自訂的閘道 RPC 方法，請將其保留在特定於該外掛的前綴下。核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保留給內部使用，且即使外掛要求更窄的範圍，也一律解析為 `operator.admin`。

請記住掛鉤防護的語意：

- `before_tool_call`：`{ block: true }` 是終止性的，會停止優先級較低的處理程序。
- `before_tool_call`: `{ block: false }` 被視為未作決定。
- `before_tool_call`: `{ requireApproval: true }` 暫停代理執行並透過執行批准覆蓋層、Telegram 按鈕、Discord 互動或任何頻道上的 `/approve` 指令提示使用者批准。
- `before_install`: `{ block: true }` 是終止的，並停止較低優先級的處理程序。
- `before_install`: `{ block: false }` 被視為未作決定。
- `message_sending`: `{ cancel: true }` 是終止的，並停止較低優先級的處理程序。
- `message_sending`: `{ cancel: false }` 被視為未作決定。
- `message_received`: 當您需要入站執行緒/主題路由時，請優先使用具類型的 `threadId` 欄位。保留 `metadata` 用於特定頻道的額外資訊。
- `message_sending`: 優先使用具類型的 `replyToId` / `threadId` 路由欄位，而非特定頻道的元資料鍵。

`/approve` 指令透過有界的回退機制處理執行和插件批准：當找不到執行批准 ID 時，OpenClaw 會透過插件批准重試相同的 ID。插件批准轉發可以透過配置中的 `approvals.plugin` 獨立配置。

如果自訂批准管線需要偵測相同的界線回退情況，
請優先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`
而不是手動比對批准過期字串。

參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以取得範例和掛鉤參考。

## 註冊代理工具

工具是 LLM 可以呼叫的具類型函式。它們可以是必需的（始終
可用）或可選的（使用者選擇加入）：

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

使用者在配置中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突會被跳過）
- 具有格式錯誤註冊物件的工具（包括缺少 `parameters`）將被跳過並在插件診斷中回報，而不是中斷代理執行
- 對於具有副作用或額外二進位需求的工具，請使用 `optional: true`
- 使用者可以透過將插件 ID 新增至 `tools.allow` 來啟用插件中的所有工具

## 匯入慣例

請一律從專注的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

如需完整的子路徑參考，請參閱 [SDK 概觀](/zh-Hant/plugins/sdk-overview)。

在您的插件中，請使用本地桶檔案（`api.ts`、`runtime-api.ts`）進行
內部匯入 — 切勿透過其 SDK 路徑匯入您自己的插件。

對於提供者插件，請將提供者特定的輔助函式保留在這些套件根目錄的
桶檔案中，除非該介面確實是通用的。目前內建的範例包括：

- Anthropic：Claude 串流包裝器與 `service_tier` / beta 輔助函式
- OpenAI：提供者建構器、預設模型輔助函式、即時提供者
- OpenRouter：提供者建構器以及上架/配置輔助函式

如果輔助函式僅在某個內建的提供者套件中有用，請將其保留在該
套件根目錄的介面中，而不是將其升級至 `openclaw/plugin-sdk/*`。

某些生成的 `openclaw/plugin-sdk/<bundled-id>` 輔助介面仍然存在，
用於內建插件的維護和相容性，例如
`plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。請將這些視為保留
的介面，而非新的第三方插件的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 宣告檔存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入皆使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過（`pnpm test -- <bundled-plugin-root>/my-plugin/`）</Check>
<Check>`pnpm check` 通過（儲存庫內插件）</Check>

## Beta 版發布測試

1. 請密切關注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 版本標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳戶 [@openclaw](https://x.com/openclaw) 的通知，以接收發布公告。
2. 在 Beta 標籤出現後，立即針對其測試您的外掛。穩定版本發布前的窗口通常只有幾個小時。
3. 測試後，請在 `plugin-forum` Discord 頻道的您的外掛貼文中回覆，內容可以是 `all good` 或是遇到的問題。如果您還沒有貼文，請先建立一個。
4. 如果有任何問題，請開立或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的 Issue，並加上 `beta-blocker` 標籤。請將 Issue 連結放在您的貼文中。
5. 向 `main` 開立一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 貼文中連結該 Issue。貢獻者無法為 PR 加上標籤，因此標題是維護者和自動化工具在 PR 端的識別信號。有 PR 的阻斷性問題會被合併；沒有 PR 的阻斷性問題可能仍會隨版本發布。維護者會在 Beta 測試期間監控這些貼文。
6. 沒有消息就是好消息。如果您錯過了窗口，您的修復很可能會在下一個週期發布。

## 下一步

<CardGroup cols={2}>
  <Card title="通道外掛" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建立訊息通道外掛
  </Card>
  <Card title="供應商外掛" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建立模型供應商外掛
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    Import map 與註冊 API 參考資料
  </Card>
  <Card title="執行時期輔助函式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、搜尋、subagent
  </Card>
  <Card title="測試" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具程式與模式
  </Card>
  <Card title="外掛程式清單" icon="file-" href="/zh-Hant/plugins/manifest">
    完整的清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛程式架構](/zh-Hant/plugins/architecture) — 內部架構深度解析
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 外掛程式 SDK 參考
- [清單](/zh-Hant/plugins/manifest) — 外掛程式清單格式
- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 建置頻道外掛程式
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 建置提供者外掛程式
