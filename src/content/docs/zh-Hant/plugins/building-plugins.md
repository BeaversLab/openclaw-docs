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

您不需要將您的插件添加到 OpenClaw 儲存庫中。發佈到
[ClawHub](/zh-Hant/tools/clawhub) 或 npm，用戶可以使用
`openclaw plugins install <package-name>` 進行安裝。OpenClaw 會先嘗試 ClawHub，然後
自動回退到 npm。

## 先決條件

- Node >= 22 與套件管理工具 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 對於儲存庫內的外掛程式：儲存庫已複製並且完成 `pnpm install`

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    將 OpenClaw 連線到訊息平台（Discord、IRC 等）
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
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
  <Step title="Create the package and manifest">
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

    每個插件都需要一個清單，即使沒有配置。請參閱
    [Manifest](/zh-Hant/plugins/manifest) 以了解完整的架構。正規的 ClawHub
    發佈片段位於 `docs/snippets/plugin-publish/` 中。

  </Step>

  <Step title="Write the entry point">

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

    `definePluginEntry` 適用於非通道插件。對於通道，請使用
    `defineChannelPluginEntry` — 請參閱 [Channel Plugins](/zh-Hant/plugins/sdk-channel-plugins)。
    如需完整的入口點選項，請參閱 [Entry Points](/zh-Hant/plugins/sdk-entrypoints)。

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

| 功能            | 註冊方法                                         | 詳細指南                                                                     |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 文字推理 (LLM)  | `api.registerProvider(...)`                      | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins)                               |
| CLI 推理後端    | `api.registerCliBackend(...)`                    | [CLI 後端](/zh-Hant/gateway/cli-backends)                                         |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                       | [通道插件](/zh-Hant/plugins/sdk-channel-plugins)                                  |
| 語音 (TTS/STT)  | `api.registerSpeechProvider(...)`                | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時轉錄        | `api.registerRealtimeTranscriptionProvider(...)` | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 即時語音        | `api.registerRealtimeVoiceProvider(...)`         | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)`    | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影像生成        | `api.registerImageGenerationProvider(...)`       | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音樂生成        | `api.registerMusicGenerationProvider(...)`       | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 影片生成        | `api.registerVideoGenerationProvider(...)`       | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁擷取        | `api.registerWebFetchProvider(...)`              | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網頁搜尋        | `api.registerWebSearchProvider(...)`             | [提供者插件](/zh-Hant/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 嵌入式 Pi 擴充  | `api.registerEmbeddedExtensionFactory(...)`      | [SDK 概覽](/zh-Hant/plugins/sdk-overview#registration-api)                        |
| Agent 工具      | `api.registerTool(...)`                          | 以下                                                                         |
| 自訂指令        | `api.registerCommand(...)`                       | [入口點](/zh-Hant/plugins/sdk-entrypoints)                                        |
| 事件掛鉤        | `api.registerHook(...)`                          | [入口點](/zh-Hant/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                     | [內部機制](/zh-Hant/plugins/architecture#gateway-http-routes)                     |
| CLI 子指令      | `api.registerCli(...)`                           | [進入點](/zh-Hant/plugins/sdk-entrypoints)                                        |

如需完整的註冊 API，請參閱 [SDK 概述](/zh-Hant/plugins/sdk-overview#registration-api)。

當外掛程式需要 Pi 原生嵌入式執行器鉤子（例如在最終工具結果訊息發出前的異步 `tool_result` 重寫）時，請使用 `api.registerEmbeddedExtensionFactory(...)`。當工作不需要 Pi 擴充計時時，建議優先使用常規的 OpenClaw 外掛程式鉤子。

如果您的外掛程式註冊了自訂閘道 RPC 方法，請將它們保留在外掛程式特定的前綴上。核心管理命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保留供使用，且一律解析為 `operator.admin`，即使外掛程式請求較小的範圍。

請牢記 Hook guard 語義：

- `before_tool_call`：`{ block: true }` 是終止操作，會停止優先級較低的處理程式。
- `before_tool_call`：`{ block: false }` 視為未做決定。
- `before_tool_call`：`{ requireApproval: true }` 會暫停代理程式執行，並透過執行批准覆蓋層、Telegram 按鈕、Discord 互動或任何頻道上的 `/approve` 指令提示使用者批准。
- `before_install`：`{ block: true }` 是終止操作，會停止優先級較低的處理程式。
- `before_install`：`{ block: false }` 視為未做決定。
- `message_sending`：`{ cancel: true }` 是終止操作，會停止優先級較低的處理程式。
- `message_sending`：`{ cancel: false }` 視為未做決定。
- `message_received`：當您需要傳入的執行緒/主題路由時，建議優先使用具型別的 `threadId` 欄位。請保留 `metadata` 用於特定頻道的額外項目。
- `message_sending`：建議優先使用具型別的 `replyToId` / `threadId` 路由欄位，而非特定頻道的元資料鍵。

`/approve` 指令會處理 exec 和 plugin 的批准，並帶有受限的備援機制：當找不到 exec 批准 id 時，OpenClaw 會透過 plugin 批准重試該 id。Plugin 批准的轉發可以透過 config 中的 `approvals.plugin` 獨立設定。

如果自訂批准流程需要偵測相同的受限備援情況，請優先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而不是手動比對批准過期字串。

詳情請參閱 [SDK Overview hook decision semantics](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 註冊代理工具

工具是 LLM 可以呼叫的型別化函式。它們可以是必要的（始終可用）或選用的（使用者選擇加入）：

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

使用者可以在 config 中啟用選用工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突的工具會被略過）
- 對於具有副作用或額外二進位需求的工具，請使用 `optional: true`
- 使用者可以透過將插件 id 加入 `tools.allow` 來啟用插件中的所有工具

## 匯入慣例

請一律從專門的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

完整的子路徑參考，請參閱 [SDK Overview](/zh-Hant/plugins/sdk-overview)。

在你的插件內，請使用本地 barrel 檔案（`api.ts`、`runtime-api.ts`）進行內部匯入 — 絕對不要透過其 SDK 路徑匯入你自己的插件。

對於提供者插件，除非接縫是真正通用的，否則請將提供者特定的輔助函式保留在這些套件根目錄的 barrel 檔案中。目前內建的範例：

- Anthropic：Claude 串流包裝器和 `service_tier` / beta 輔助函式
- OpenAI：provider 建構器、預設模型輔助函式、即時提供者
- OpenRouter：provider 建構器加上上架/設定輔助函式

如果輔助函式僅在單一內建提供者套件中有用，請將其保留在該套件根目錄的接縫中，而不是將其提升至 `openclaw/plugin-sdk/*`。

某些生成的 `openclaw/plugin-sdk/<bundled-id>` 輔助接縫仍然存在，用於內建插件的維護和相容性，例如 `plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。請將這些視為保留介面，而非新第三方插件的預設模式。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 清單存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用集中的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自身匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過 (存放庫內外掛程式)</Check>

## Beta 版本測試

1. 留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 版本標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以為官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 開啟通知，以獲取版本公告。
2. Beta 標籤一出現，請立即針對該版本測試您的插件。穩定版發布前的時間窗口通常只有幾個小時。
3. 測試後，請在 `plugin-forum` Discord 頻道的您的外掛程式主題中發文，說明 `all good` 或是什麼地方出錯了。如果您還沒有主題，請建立一個。
4. 如果有東西壞了，請開啟或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的 Issue，並套用 `beta-blocker` 標籤。將 Issue 連結放在您的主題中。
5. 向 `main` 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 主題中連結該 Issue。貢獻者無法標記 PR，因此標題是維護者和自動化工具在 PR 端的信號。附有 PR 的阻礙性問題會被合併；沒有 PR 的阻礙性問題可能仍會隨版本發布。維護者會在 Beta 測試期間關注這些主題。
6. 沒有消息就是好消息。如果您錯過了時間窗口，您的修復很可能會在下一個週期落地。

## 後續步驟

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建構訊息通道插件
  </Card>
  <Card title="供應商外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建構模型供應商外掛程式
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    匯入映射與註冊 API 參考
  </Card>
  <Card title="執行時期輔助程式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、搜尋、子代理程式
  </Card>
  <Card title="測試" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="外掛程式清單" icon="file-" href="/zh-Hant/plugins/manifest">
    完整清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛程式架構](/zh-Hant/plugins/architecture) — 內部架構深度探討
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 外掛程式 SDK 參考
- [清單](/zh-Hant/plugins/manifest) — 外掛程式清單格式
- [通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 建構通道外掛程式
- [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 建構供應商外掛程式
