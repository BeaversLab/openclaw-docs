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

您不需要將您的外掛程式新增至 OpenClaw 存放庫。發佈至
[ClawHub](/zh-Hant/clawhub)，使用者即可使用
`openclaw plugins install clawhub:<package-name>` 安裝。在啟動切換期間，純套件規格仍會從 npm 安裝。

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

    每個外掛都需要一個清單，即使沒有設定檔也一樣。執行時期註冊的工具
    必須列在 `contracts.tools` 中，這樣 OpenClaw 才能發現擁有該工具的
    外掛，而無需載入每個外掛的執行時期。外掛也應該
    明確宣告 `activation.onStartup`。此範例將其設定為 `true`。請參閱
    [Manifest](/zh-Hant/plugins/manifest) 以了解完整的架構。標準的 ClawHub
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

    `definePluginEntry` 適用於非通道類外掛。對於通道，請使用
    `defineChannelPluginEntry` - 請參閱 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)。
    若要了解完整的進入點選項，請參閱 [Entry Points](/zh-Hant/plugins/sdk-entrypoints)。

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
| 媒體理解         | `api.registerMediaUnderstandingProvider(...)`    | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 影像生成         | `api.registerImageGenerationProvider(...)`       | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 音樂生成         | `api.registerMusicGenerationProvider(...)`       | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 影片生成         | `api.registerVideoGenerationProvider(...)`       | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 網頁擷取         | `api.registerWebFetchProvider(...)`              | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 網頁搜尋         | `api.registerWebSearchProvider(...)`             | [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)   |
| 工具結果中介軟體 | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)                              |
| Agent 工具       | `api.registerTool(...)`                          | 以下                                                                               |
| 自訂指令         | `api.registerCommand(...)`                       | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |
| 外掛程式鉤子     | `api.on(...)`                                    | [外掛程式鉤子](/zh-Hant/plugins/hooks)                                                  |
| 內部事件鉤子     | `api.registerHook(...)`                          | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |
| HTTP 路由        | `api.registerHttpRoute(...)`                     | [內部機制](/zh-Hant/plugins/architecture-internals#gateway-http-routes)                 |
| CLI 子命令       | `api.registerCli(...)`                           | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                              |

有關完整的註冊 API，請參閱 [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)。

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

請參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以取得範例和 Hook 參考資料。

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

每個透過 `api.registerTool(...)` 註冊的工具也必須在插件清單中宣告：

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

OpenClaw 會從已註冊的工具中擷取並快取驗證過的描述符，因此外掛程式不會在清單中重複 `description` 或架構資料。清單合約僅宣告擁有權與探索功能；執行時仍會呼叫即時已註冊的工具實作。
為使用 `api.registerTool(..., { optional: true })` 註冊的工具設定 `toolMetadata.<tool>.optional: true`，如此一來，OpenClaw 便可在該工具被明確列入允許清單之前，避免載入該外掛程式執行時期。

使用者可以在設定中啟用選用工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（發生衝突時會跳過）
- 若工具的註冊物件格式錯誤（包括缺少 `parameters`），將會跳過並回報於外掛程式診斷中，而不會導致代理執行中斷
- 對於具有副作用或額外二元檔需求的工具，請使用 `optional: true`
- 使用者可以透過將外掛程式 ID 加入 `tools.allow` 來啟用來自某個外掛程式的所有工具

## 註冊 CLI 指令

外掛程式可以使用 `api.registerCli` 新增根層級 `openclaw` 指令群組。請為每個頂層指令根提供 `descriptors`，讓 OpenClaw 能夠顯示並路由該指令，而無須急切載入每個外掛程式執行時期。

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

安裝完成後，請驗證執行時期註冊並執行指令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 匯入慣例

務必從專注的 `openclaw/plugin-sdk/<subpath>` 路徑進行匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

如需完整的子路徑參考，請參閱 [SDK 概觀](/zh-Hant/plugins/sdk-overview)。

在您的外掛程式中，請使用本地 barrel 檔案（`api.ts`、`runtime-api.ts`）進行內部匯入——切勿透過其 SDK 路徑匯入您自己的外掛程式。

對於提供者外掛程式，除非介面確實通用，否則請將提供者專用的輔助函式保留在那些套件根層級 barrel 中。目前內建的範例包括：

- Anthropic：Claude 串流包裝函式與 `service_tier` / beta 輔助函式
- OpenAI：提供者建構器、預設模型輔助函式、即時提供者
- OpenRouter：提供者建構器以及上手/設定輔助函式

如果某個輔助函式僅在一個內建的提供者套件中有用，請將其保留在該套件根層級的介面中，而不是將其提升至 `openclaw/plugin-sdk/*`。

對於具有追蹤所有者使用情況的維護捆綁插件，部分生成的 `openclaw/plugin-sdk/<bundled-id>` 輔助接縫仍然存在。請將這些視為保留介面，而非新第三方外掛程式的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 清單存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本機模組，而非 SDK 自我匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過 (存放庫內外掛程式)</Check>

## Beta 版本測試

1. 留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發布標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知，以獲取發布公告。
2. 在 Beta 標籤出現後，立即針對其測試您的外掛程式。穩定版之前的時間窗口通常只有幾個小時。
3. 測試完成後，請在 `plugin-forum` Discord 頻道的您的外掛程式主題中發布測試結果，註明 `all good` 或壞掉的地方。如果您還沒有主題，請建立一個。
4. 如果發生錯誤，請開啟或更新標題為 `Beta blocker: <plugin-name> - <summary>` 的 Issue，並套用 `beta-blocker` 標籤。將 Issue 連結放在您的主題中。
5. 向 `main` 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 主題中連結該 Issue。貢獻者無法為 PR 加上標籤，因此標題是維護者和自動化的 PR 端訊號。有 PR 的阻礙項目會被合併；沒有 PR 的阻礙項目可能仍會發布。維護者會在 Beta 測試期間監控這些主題。
6. 沒有消息就是好消息。如果您錯過了時間窗口，您的修正很可能會在下一個週期落地。

## 下一步

<CardGroup cols={2}>
  <Card title="通道外掛" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建構訊息通道外掛
  </Card>
  <Card title="供應商外掛" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建構模型供應商外掛
  </Card>
  <Card title="CLI 後端外掛" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    註冊本機 AI CLI 後端
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    匯入對應表與註冊 API 參考
  </Card>
  <Card title="執行時輔助函式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、搜尋、subagent
  </Card>
  <Card title="測試" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="外掛清單" icon="file-" href="/zh-Hant/plugins/manifest">
    完整清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛架構](/zh-Hant/plugins/architecture) - 內部架構深入解析
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 外掛 SDK 參考
- [Manifest](/zh-Hant/plugins/manifest) - 外掛清單格式
- [通道外掛](/zh-Hant/plugins/sdk-channel-plugins) - 建構通道外掛
- [供應商外掛](/zh-Hant/plugins/sdk-provider-plugins) - 建構供應商外掛
