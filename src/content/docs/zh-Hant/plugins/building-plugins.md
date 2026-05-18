---
summary: "幾分鐘內建立您的第一個 OpenClaw 外掛程式"
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

您不需要將您的外掛程式新增至 OpenClaw 存放庫。發佈至
[ClawHub](/zh-Hant/clawhub)，使用者即可透過
`openclaw plugins install clawhub:<package-name>` 安裝。在啟動切換期間，純套件規格仍會從 npm 安裝。

## 必要條件

- Node >= 22 與套件管理員 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 針對存放庫內的外掛程式：存放庫已複製且 `pnpm install` 完成。由於 OpenClaw 會從 `extensions/*` 工作區套件載入已打包的外掛程式，因此原始碼簽出外掛程式開發僅支援 pnpm。

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    將 OpenClaw 連線至訊息平台 (Discord、IRC 等)
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    新增模型提供者 (LLM、Proxy 或自訂端點)
  </Card>
  <Card title="CLI 後端外掛程式" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    將本地 AI CLI 對應至 OpenClaw 的文字後援執行器
  </Card>
  <Card title="工具外掛程式" icon="wrench" href="/zh-Hant/plugins/tool-plugins">
    新增具有產生資訊清單元資料的簡單型別代理程式工具
  </Card>
  <Card title="Hook 外掛程式" icon="plug" href="/zh-Hant/plugins/hooks">
    註冊事件掛勾、服務或進階執行階段整合
  </Card>
</CardGroup>

對於無法保證在入職/設定執行時已安裝的頻道外掛，請使用來自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface(...)`。它會產生一組設定介面卡與精靈，用於宣佈安裝需求，並在外掛安裝前對真實的設定寫入採取封閉式失敗處理。

## 快速入門：工具外掛

此逐步指南將建立一個註冊代理工具的最小外掛。頻道和提供者外掛有上面連結的專屬指南。
如需僅工具的詳細工作流程，請參閱[工具外掛](/zh-Hant/plugins/tool-plugins)。

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

    每個外掛都需要一個清單，即使沒有設定也一樣。執行時註冊的工具必須列在 `contracts.tools` 中，以便 OpenClaw 能在不載入每個外掛執行時期的情況下發現擁有者外掛。對於簡單的僅工具外掛，建議使用 `defineToolPlugin` 加上 `openclaw plugins build`，這樣工具名稱和空設定架構可以從單一來源產生。外掛也應該有意義地宣告 `activation.onStartup`。此範例將其設為 `true`。請參閱[清單](/zh-Hant/plugins/manifest)以了解完整架構。標準的 ClawHub 發布片段存放在 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="撰寫進入點">

    ```typescript
    // index.ts
    import { Type } from "typebox";
    import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

    export default defineToolPlugin({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      tools: (tool) => [
        tool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute({ input }) {
            return { message: `Got: ${input}` };
          },
        }),
      ],
    });
    ```

    `defineToolPlugin` 適用於簡單的代理工具外掛。對於提供者、鉤子、服務和其他進階的非頻道外掛，請使用 `definePluginEntry`。
    對於頻道，請使用 `defineChannelPluginEntry` - 請參閱
    [頻道外掛](/zh-Hant/plugins/sdk-channel-plugins)。如需完整的
    `defineToolPlugin` 工作流程，請參閱[工具外掛](/zh-Hant/plugins/tool-plugins)。如需
    完整的進入點選項，請參閱[進入點](/zh-Hant/plugins/sdk-entrypoints)。

  </Step>

  <Step title="生成並驗證元資料">

    ```bash
    npm run build
    openclaw plugins build --entry ./dist/index.js
    openclaw plugins validate --entry ./dist/index.js
    ```

    `openclaw plugins build` 會寫入 `openclaw.plugin.json` 並保持
    `package.json` `openclaw.extensions` 指向進入點模組。對於
    已發布的套件，將其指向建置好的 JavaScript，例如 `./dist/index.js`。
    生成的清單（manifest）是 OpenClaw 在執行時匯入前讀取的冷載入合約。
    `openclaw plugins validate` 僅在作者驗證期間匯入進入點，並檢查清單和套件元資料是否與靜態的
    `defineToolPlugin` 元資料相符。

  </Step>

  <Step title="測試並發布">

    **外部外掛：** 使用 ClawHub 驗證並發布，然後安裝：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    諸如 `@myorg/openclaw-my-plugin` 之類的純套件規格會在啟動切換期間從 npm 安裝。
    當您需要 ClawHub 解析時，請使用 `clawhub:`。

    **存放庫內外掛：** 置於綑綁的外掛工作區樹下 - 會自動被發現。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 外掛功能

單一外掛可以透過 `api` 物件註冊任意數量的功能：

| 功能             | 註冊方法                                         | 詳細指南                                                                     |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 文字推論 (LLM)   | `api.registerProvider(...)`                      | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins)                               |
| CLI 推論後端     | `api.registerCliBackend(...)`                    | [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)                              |
| 頻道 / 傳訊      | `api.registerChannel(...)`                       | [頻道外掛](/zh-Hant/plugins/sdk-channel-plugins)                                  |
| 語音 (TTS/STT)   | `api.registerSpeechProvider(...)`                | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時轉錄         | `api.registerRealtimeTranscriptionProvider(...)` | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時語音         | `api.registerRealtimeVoiceProvider(...)`         | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解         | `api.registerMediaUnderstandingProvider(...)`    | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影像生成         | `api.registerImageGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音樂生成         | `api.registerMusicGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影片生成         | `api.registerVideoGenerationProvider(...)`       | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁擷取         | `api.registerWebFetchProvider(...)`              | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁搜尋         | `api.registerWebSearchProvider(...)`             | [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具結果中介軟體 | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)                        |
| 代理工具         | `api.registerTool(...)`                          | 下方                                                                         |
| 自訂指令         | `api.registerCommand(...)`                       | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                        |
| 外掛鉤子         | `api.on(...)`                                    | [外掛鉤子](/zh-Hant/plugins/hooks)                                                |
| 內部事件鉤子     | `api.registerHook(...)`                          | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                        |
| HTTP 路由        | `api.registerHttpRoute(...)`                     | [內部機制](/zh-Hant/plugins/architecture-internals#gateway-http-routes)           |
| CLI 子指令       | `api.registerCli(...)`                           | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                        |

如需完整的註冊 API，請參閱 [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)。

打包的外掛在模型看到輸出之前，如果需要非同步重寫工具結果，可以使用 `api.registerAgentToolResultMiddleware(...)`。在 `contracts.agentToolResultMiddleware` 中宣告目標執行環境，例如 `["pi", "codex"]`。這是一個受信任的打包外掛接口；除非 OpenClaw 對此功能發展出明確的信任政策，否則外部外掛應優先使用常規的 OpenClaw 外掛鉤子。

如果您的外掛註冊了自訂的 Gateway RPC 方法，請將其保留在外掛特定的前綴下。核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，並且總是解析為 `operator.admin`，即使外掛要求更窄的範圍也是如此。

`openclaw/plugin-sdk/gateway-method-runtime` 是一個保留的控制平面橋接器，
用於宣告 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的
外掛 HTTP 路由。這是針對已審核的原生外掛的
意圖使用防護，而非沙箱邊界。

需記住的 Hook 防護語義：

- `before_tool_call`： `{ block: true }` 是終止性的，會停止較低優先級的處理程式。
- `before_tool_call`： `{ block: false }` 被視為未作決定。
- `before_tool_call`： `{ requireApproval: true }` 暫停代理執行並透過執行核准覆蓋層、Telegram 按鈕、Discord 互動或任何頻道上的 `/approve` 指令提示使用者核准。
- `before_install`： `{ block: true }` 是終止性的，會停止較低優先級的處理程式。
- `before_install`： `{ block: false }` 被視為未作決定。
- `message_sending`： `{ cancel: true }` 是終止性的，會停止較低優先級的處理程式。
- `message_sending`： `{ cancel: false }` 被視為未作決定。
- `message_received`：當您需要入站執行緒/主題路由時，請優先使用類型化的 `threadId` 欄位。保留 `metadata` 用於特定頻道的額外內容。
- `message_sending`：優先使用類型化的 `replyToId` / `threadId` 路由欄位，而非特定頻道的元資料鍵。

`/approve` 指令以有邊界的回退處理執行和外掛核准：當找不到執行核准 ID 時，OpenClaw 會透過外掛核准重試相同的 ID。外掛核准轉發可以透過設定中的 `approvals.plugin` 獨立設定。

如果自訂核准管道需要偵測到相同的有限回退情況，
請優先使用 `openclaw/plugin-sdk/error-runtime` 中的
`isApprovalNotFoundError`，
而不是手動比對核准過期字串。

參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以取得範例和 Hook 參考。

## 註冊代理工具

工具是 LLM 可以調用的類型化函數。它們可以是必需的（始終可用）或可選的（用戶選擇加入）：

對於僅擁有一組固定工具的簡單插件，首選使用 [`defineToolPlugin`](/zh-Hant/plugins/tool-plugins)。它會生成清單元數據並保持 `contracts.tools` 的同步。當插件還擁有通道、提供商、鉤子、服務、命令或完全動態的工具註冊時，請使用底層的 `api.registerTool(...)` 介面。

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

工具工廠會接收一個運行時提供的上下文物件。當工具需要記錄日誌、顯示資訊或適配當前輪次的活動模型時，請使用 `ctx.activeModel`。該物件可以包含 `provider`、`modelId` 和 `modelRef`。應將其視為資訊性的運行時元數據，而非針對本地操作員、已安裝的插件代碼或修改後的 OpenClaw 運行時的安全邊界。對於敏感的本地工具，請保持明確的插件或操作員選擇加入，並在活動模型元數據缺失或不合適時採取封閉式失敗（fail closed）。

每個使用 `api.registerTool(...)` 註冊的工具也必須在插件清單中聲明：

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

OpenClaw 會捕獲並緩存已註冊工具的經過驗證的描述符，因此插件無需在清單中重複 `description` 或架構數據。清單約定僅聲明所有權和發現；執行仍會調用實時的已註冊工具實現。為使用 `api.registerTool(..., { optional: true })` 註冊的工具設置 `toolMetadata.<tool>.optional: true`，以便 OpenClaw 可以避免加載該插件運行時，直到該工具被明確列入允許清單。

用戶在配置中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突的工具會被跳過）
- 註冊物件格式錯誤（包括缺少 `parameters`）的工具會被跳過，並在插件診斷中報告，而不會中斷 Agent 運行
- 對於具有副作用或額外二進制要求的工具，請使用 `optional: true`
- 用戶可以通過將插件 ID 添加到 `tools.allow` 來啟用插件中的所有工具

## 註冊 CLI 命令

外掛程式可以使用 `api.registerCli` 新增根 `openclaw` 指令群組。請為每個頂層指令根提供 `descriptors`，以便 OpenClaw 能顯示和路由該指令，而無需急切地載入每個外掛程式執行時環境。

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

安裝後，驗證執行時註冊並執行指令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 匯入慣例

請始終從專注的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有關完整的子路徑參考，請參閱 [SDK 概覽](/zh-Hant/plugins/sdk-overview)。

在您的外掛程式內，請使用本地桶裝檔案（`api.ts`、`runtime-api.ts`）進行內部匯入——切勿透過其 SDK 路徑匯入您自己的外掛程式。

對於提供者外掛程式，請將提供者特定的輔助程式保留在那些套件根目錄的桶裝檔案中，除非該介面確實是通用的。目前的內建範例：

- Anthropic：Claude 串流包裝程式和 `service_tier` / beta 輔助程式
- OpenAI：提供者建構器、預設模型輔助程式、即時提供者
- OpenRouter：提供者建構器加上入門/設定輔助程式

如果某個輔助程式僅在一個內建提供者套件中有用，請將其保留在該套件根目錄的介面中，而不是將其提升到 `openclaw/plugin-sdk/*`。

某些產生的 `openclaw/plugin-sdk/<bundled-id>` 輔助介面仍然存在，用於內建外掛程式的維護，因為它們有追蹤到的擁有者使用。請將這些視為保留的介面，而不是新第三方外掛程式的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 宣告檔存在且有效</Check>
<Check>進入點使用 `defineToolPlugin`、`defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過 (存放庫內的外掛程式)</Check>

## Beta 版發布測試

1. 請留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發佈標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知，以獲取發佈公告。
2. 一旦 Beta 標籤出現，請立即針對該版本測試您的插件。穩定版發佈前的窗口期通常只有幾個小時。
3. 測試後，請在 `plugin-forum` Discord 頻道中您的插件討論串發文，回報 `all good` 或是發生問題的地方。如果您還沒有討論串，請建立一個。
4. 如果有任何問題，請開啟或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的 Issue，並套上 `beta-blocker` 標籤。請將 Issue 連結放在您的討論串中。
5. 請向 `main` 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 討論串中連結該 Issue。貢獻者無法為 PR 加上標籤，因此標題是給維護者和自動化工具看的 PR 端訊號。有 PR 的阻斷性問題會被合併；沒有 PR 的則可能照常發佈。維護者會在 Beta 測試期間關注這些討論串。
6. 沒有消息就是好消息。如果您錯過了窗口期，您的修正可能會在下一個週期發佈。

## 下一步

<CardGroup cols={2}>
  <Card title="頻道插件" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建構訊息傳遞頻道插件
  </Card>
  <Card title="供應商插件" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建構模型供應商插件
  </Card>
  <Card title="CLI 後端插件" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    註冊本機 AI CLI 後端
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    匯入映射與註冊 API 參考資料
  </Card>
  <Card title="Runtime Helpers" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、搜尋、子代理程式
  </Card>
  <Card title="Testing" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="Plugin Manifest" icon="file-" href="/zh-Hant/plugins/manifest">
    完整的清單架構參考
  </Card>
</CardGroup>

## 相關

- [Plugin Architecture](/zh-Hant/plugins/architecture) - 內部架構深度解析
- [SDK Overview](/zh-Hant/plugins/sdk-overview) - 外掛程式 SDK 參考
- [Manifest](/zh-Hant/plugins/manifest) - 外掛程式清單格式
- [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins) - 建構通道外掛程式
- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) - 建構提供者外掛程式
