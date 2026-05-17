---
summary: "在幾分鐘內建立您的第一個 OpenClaw 外掛程式"
title: "建置外掛程式"
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

您不需要將外掛程式新增至 OpenClaw 存放庫。發布至
[ClawHub](/zh-Hant/clawhub)，使用者即可使用
`openclaw plugins install clawhub:<package-name>` 安裝。在啟動切換期間，裸套件規格仍會從 npm 安裝。

## 必要條件

- Node >= 22 與套件管理員 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 對於存放庫內的外掛程式：存放庫已複製並完成 `pnpm install`。原始碼
  籤出外掛程式開發僅支援 pnpm，因為 OpenClaw 會從 `extensions/*` 工作區套件載入
  捆綁的外掛程式。

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    將 OpenClaw 連線至訊息平台 (Discord、IRC 等)
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    新增模型提供者 (LLM、Proxy 或自訂端點)
  </Card>
  <Card title="CLI 後端外掛程式" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    將本機 AI CLI 對應至 OpenClaw 的文字後援執行器
  </Card>
  <Card title="工具 / Hook 外掛程式" icon="wrench" href="/zh-Hant/plugins/hooks">
    註冊代理程式工具、事件 Hook 或服務 - 繼續閱讀下方內容
  </Card>
</CardGroup>

對於無法保證在上線/設定執行時已安裝的頻道外掛程式，
請使用來自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface(...)`。它會產生一組設定介面卡 + 精靈，
用於宣佈安裝需求，並在外掛程式安裝前對真實設定寫入採取封閉式失敗處理。

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
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每個外掛程式都需要一份清單，即使沒有設定也一樣。執行時期註冊的工具
    必須列在 `contracts.tools` 中，這樣 OpenClaw 才能在不載入每個外掛程式執行時期的情況下，發現擁有該工具的外掛程式。外掛程式也應
    故意宣告 `activation.onStartup`。此範例將其設定為 `true`。請參閱
    [Manifest](/zh-Hant/plugins/manifest) 以了解完整架構。正規的 ClawHub
    發布片段位於 `docs/snippets/plugin-publish/`。

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

    `definePluginEntry` 適用於非通道外掛程式。對於通道，請使用
    `defineChannelPluginEntry` - 請參閱 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)。
    如需完整的進入點選項，請參閱 [Entry Points](/zh-Hant/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發布">

    **外部外掛：** 使用 ClawHub 驗證並發布，然後安裝：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    諸如 `@myorg/openclaw-my-plugin` 之類的裸套件規格會在
    啟動切換期間從 npm 安裝。當您需要 ClawHub 解析時，請使用 `clawhub:`。

    **程式庫內外掛：** 將其放置在捆綁的外掛工作區樹下 - 會自動被發現。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

單一外掛可以透過 `api` 物件註冊任意數量的功能：

| 功能             | 註冊方法                                         | 詳細指南                                                                           |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 文字推理 (LLM)   | `api.registerProvider(...)`                      | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins)                               |
| CLI 推理後端     | `api.registerCliBackend(...)`                    | [CLI Backend Plugins](/zh-Hant/plugins/cli-backend-plugins)                             |
| 頻道 / 訊息傳遞  | `api.registerChannel(...)`                       | [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)                                 |
| 語音 (TTS/STT)   | `api.registerSpeechProvider(...)`                | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時轉錄         | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時語音         | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解         | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影像生成         | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音樂生成         | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影片生成         | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁擷取         | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁搜尋         | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具結果中介軟體 | `api.registerAgentToolResultMiddleware(...)`     | [SDK Overview](/zh-Hant/plugins/sdk-overview#registration-api)                          |
| Agent 工具       | `api.registerTool(...)`                          | 以下                                                                               |
| 自訂指令         | `api.registerCommand(...)`                       | [Entry Points](/zh-Hant/plugins/sdk-entrypoints)                                        |
| 外掛程式鉤子     | `api.on(...)`                                    | [Plugin hooks](/zh-Hant/plugins/hooks)                                                  |
| 內部事件鉤子     | `api.registerHook(...)`                          | [Entry Points](/zh-Hant/plugins/sdk-entrypoints)                                        |
| HTTP 路由        | `api.registerHttpRoute(...)`                     | [內部機制](/zh-Hant/plugins/architecture-internals#gateway-http-routes)                 |
| CLI 子命令       | `api.registerCli(...)`                           | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |

如需完整的註冊 API，請參閱 [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)。

當捆綁的外掛程式需要進行非同步工具結果重寫，以便模型看到輸出時，可以使用 `api.registerAgentToolResultMiddleware(...)`。在 `contracts.agentToolResultMiddleware` 中宣告目標執行時，例如 `["pi", "codex"]`。這是一個受信任的捆綁外掛程式接口；除非 OpenClaw 為此功能發展出明確的信任策略，否則外部外掛程式應優先使用常規的 OpenClaw 外掛程式鉤子。

如果您的外掛程式註冊了自訂的 Gateway RPC 方法，請將其保留在外掛程式特定的前綴上。核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，並且始終解析為 `operator.admin`，即使外掛程式請求了更窄的範圍。

需牢記的鉤子保護語義：

- `before_tool_call`：`{ block: true }` 是終端的，並且會停止優先級較低的處理程序。
- `before_tool_call`：`{ block: false }` 被視為未作決定。
- `before_tool_call`：`{ requireApproval: true }` 會暫停 Agent 執行，並透過執行核准覆蓋層、Telegram 按鈕、Discord 互動，或任何頻道上的 `/approve` 指令提示使用者進行核准。
- `before_install`：`{ block: true }` 是終止的，並會停止低優先級的處理程式。
- `before_install`：`{ block: false }` 被視為未作決定。
- `message_sending`：`{ cancel: true }` 是終止的，並會停止低優先級的處理程式。
- `message_sending`：`{ cancel: false }` 被視為未作決定。
- `message_received`：當您需要傳入的執行緒/主題路由時，請優先使用型別化的 `threadId` 欄位。保留 `metadata` 用於頻道特定的額外項目。
- `message_sending`：請優先使用型別化的 `replyToId` / `threadId` 路由欄位，而非頻道特定的中繼資料鍵。

`/approve` 指令會以有限的回退機制來處理執行和插件核准：當找不到執行核准 ID 時，OpenClaw 會透過插件核准重試同一個 ID。插件核准轉發可以透過 config 中的 `approvals.plugin` 獨立設定。

如果自訂核准管道需要偵測相同的有限回退案例，請優先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而不是手動比對核准過期字串。

請參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以取得範例和 Hook 參考。

## 註冊 Agent 工具

工具是 LLM 可以呼叫的型別化函式。它們可以是必需的（始終可用）或可選的（使用者選擇加入）：

```typescript
register(api) {
  // Required tool - always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool - user must add to allowlist
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

工具工廠會接收一個執行時提供的 context 物件。當工具需要記錄、顯示或適配當前輪次的主動模型時，請使用 `ctx.activeModel`。該物件可以包含 `provider`、`modelId` 和 `modelRef`。請將其視為資訊性的執行時元數據，而非對抗本機操作員、已安裝插件程式碼或修改後 OpenClaw 執行時的安全邊界。對於敏感的本機工具，請保持明確的插件或操作員選入 (opt-in)，並在主動模型元數據缺失或不適當時關閉。

每個使用 `api.registerTool(...)` 註冊的工具也必須在插件清單中宣告：

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw 會擷取並快取來自已註冊工具的已驗證描述符，因此插件不會在清單中重複 `description` 或 schema 資料。清單合約僅宣告擁有權和探索；執行仍然會調用實時的已註冊工具實作。
為使用 `api.registerTool(..., { optional: true })` 註冊的工具設定 `toolMetadata.<tool>.optional: true`，以便 OpenClaw 可以避免加載該插件執行時，直到該工具被明確列入允許清單。

使用者可以在設定中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突的工具會被跳過）
- 註冊物件格式錯誤的工具（包括缺少 `parameters`）將被跳過，並在插件診斷中報告，而不會中斷代理執行
- 對於具有副作用或額外二進位需求的工具，請使用 `optional: true`
- 使用者可以透過將插件 ID 加入 `tools.allow` 來啟用插件中的所有工具

## 註冊 CLI 指令

插件可以使用 `api.registerCli` 新增根 `openclaw` 指令群組。為每個頂層指令根提供 `descriptors`，以便 OpenClaw 可以在不急切加載每個插件執行時的情況下顯示和路由該指令。

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("Run demo plugin commands");

      demo
        .command("ping")
        .description("Check that the plugin CLI is executable")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "Run demo plugin commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

安裝後，請驗證執行時期註冊並執行指令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 匯入慣例

請一律從專用的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

完整的子路徑參考，請參閱 [SDK 概觀](/zh-Hant/plugins/sdk-overview)。

在您的外掛程式內，請使用本地桶狀檔案 (`api.ts`, `runtime-api.ts`) 進行
內部匯入 —— 切勿透過其 SDK 路徑匯入您自己的外掛程式。

對於提供者外掛程式，除非介面確實通用，否則請將提供者特定的輔助函式保留在這些套件根目錄的
桶狀檔案中。目前內建的範例包括：

- Anthropic：Claude 串流包裝器與 `service_tier` / beta 輔助函式
- OpenAI：提供者建構器、預設模型輔助函式、即時提供者
- OpenRouter：提供者建構器加上上架/設定輔助函式

如果某個輔助函式僅在單一內建提供者套件內有用，請將其保留在該
套件根目錄的介面中，而不要將其提升至 `openclaw/plugin-sdk/*`。

當部分產生的 `openclaw/plugin-sdk/<bundled-id>` 輔助介面具有追蹤到的擁有者使用情況時，它們仍然存在用於
內建外掛程式的維護。請將這些視為保留介面，而非新第三方外掛程式的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 中繼資料</Check>
<Check>**openclaw.plugin.** 資訊清單存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專用的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過 (存放庫內的外掛程式)</Check>

## Beta 版本測試

1. 請留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發行標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知以接收發行公告。
2. 在 beta 標籤出現時，立即針對它測試您的插件。穩定版之前的時間窗口通常只有幾個小時。
3. 在 `plugin-forum` Discord 頻道中您插件的討論串發布測試結果，不論是 `all good` 或是出現了問題。如果您還沒有討論串，請建立一個。
4. 如果發生錯誤，請開啟或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的問題，並套用 `beta-blocker` 標籤。將問題連結放在您的討論串中。
5. 開啟一個 PR 到 `main`，標題為 `fix(<plugin-id>): beta blocker - <summary>`，並將問題連結加入到 PR 和您的 Discord 討論串中。貢獻者無法標記 PR，因此標題是給維護者和自動化工具的 PR 端訊號。有 PR 的阻礙性問題會被合併；沒有 PR 的阻礙性問題可能仍會發布。維護者會在 beta 測試期間關注這些討論串。
6. 沒有消息就是好消息（即通過）。如果您錯過了時間窗口，您的修正可能會在下一個週期發布。

## 下一步

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建構訊息傳遞通道插件
  </Card>
  <Card title="提供者插件" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建構模型提供者插件
  </Card>
  <Card title="CLI 後端插件" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    註冊本地 AI CLI 後端
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    匯入映射和註冊 API 參考
  </Card>
  <Card title="執行時輔助函式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、搜尋、子代理
  </Card>
  <Card title="測試" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="外掛程式清單" icon="file-" href="/zh-Hant/plugins/manifest">
    完整的清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛程式架構](/zh-Hant/plugins/architecture) - 內部架構深入解析
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 外掛程式 SDK 參考
- [清單](/zh-Hant/plugins/manifest) - 外掛程式清單格式
- [通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 建構通道外掛程式
- [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins) - 建構供應商外掛程式
