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

外掛程式透過新功能擴充 OpenClaw：頻道、模型提供者、語音、
影像生成、網路搜尋、代理程式工具，或上述功能的任意組合。

您不需要將外掛程式新增至 OpenClaw 儲存庫。發佈至 [ClawHub](/en/tools/clawhub) 或 npm，用戶便會使用 `openclaw plugins install <package-name>` 進行安裝。OpenClaw 會先嘗試 ClawHub，然後自動回退至 npm。

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

## 快速入門：工具外掛程式

此逐步指南將建立一個可註冊代理程式工具的極簡外掛程式。頻道
與提供者外掛程式有專屬的連結指南，如上所示。

<Steps>
  <Step title="建立套件與清單">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"]
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

    每個外掛都需要一份清單，即使沒有配置也一樣。請參閱
    [Manifest](/en/plugins/manifest) 以了解完整架構。

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

    `definePluginEntry` 是用於非頻道外掛。對於頻道，請使用
    `defineChannelPluginEntry` — 請參閱 [頻道外掛](/en/plugins/sdk-channel-plugins)。
    如需完整的進入點選項，請參閱 [進入點](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發布">

    **外部外掛：** 發布至 [ClawHub](/en/tools/clawhub) 或 npm，然後安裝：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 會先檢查 ClawHub，然後自動回退至 npm。

    **存放庫內外掛：** 置於 `extensions/` 下 — 會自動被發現。

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

單一外掛可以透過 `api` 物件註冊任意數量的功能：

| 功能            | 註冊方法                                      | 詳細指南                                                                         |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| 文字推斷 (LLM)  | `api.registerProvider(...)`                   | [提供者外掛程式](/en/plugins/sdk-provider-plugins)                               |
| CLI 推論後端    | `api.registerCliBackend(...)`                 | [CLI 後端](/en/gateway/cli-backends)                                             |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                    | [頻道外掛程式](/en/plugins/sdk-channel-plugins)                                  |
| 語音 (TTS/STT)  | `api.registerSpeechProvider(...)`             | [提供者外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)` | [提供者外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | [提供者外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | [提供者外掛程式](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 代理程式工具    | `api.registerTool(...)`                       | 下方                                                                             |
| 自訂指令        | `api.registerCommand(...)`                    | [進入點](/en/plugins/sdk-entrypoints)                                            |
| 事件掛鉤        | `api.registerHook(...)`                       | [進入點](/en/plugins/sdk-entrypoints)                                            |
| HTTP 路由       | `api.registerHttpRoute(...)`                  | [內部機制](/en/plugins/architecture#gateway-http-routes)                         |
| CLI 子指令      | `api.registerCli(...)`                        | [進入點](/en/plugins/sdk-entrypoints)                                            |

如需完整的註冊 API，請參閱 [SDK 概覽](/en/plugins/sdk-overview#registration-api)。

請牢記以下掛鉤守衛語義：

- `before_tool_call`：`{ block: true }` 為終止狀態，並停止較低優先級的處理程序。
- `before_tool_call`：`{ block: false }` 被視為未做決定。
- `message_sending`：`{ cancel: true }` 為終止狀態，並停止較低優先級的處理程序。
- `message_sending`：`{ cancel: false }` 被視為未作決定。

詳情請參閱 [SDK 概述 hook 決策語義](/en/plugins/sdk-overview#hook-decision-semantics)。

## 註冊 Agent 工具

工具是 LLM 可以呼叫的型別函式。它們可以是必要的（始終可用）或可選的（使用者選擇加入）：

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

使用者可以在設定中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突的工具將被跳過）
- 對於具有副作用或額外二進制需求的工具，請使用 `optional: true`
- 使用者可以透過將外掛 ID 新增至 `tools.allow` 來啟用來自某個外掛的所有工具

## 匯入慣例

務必從專注的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有關完整的子路徑參考，請參閱 [SDK 概述](/en/plugins/sdk-overview)。

在您的插件內，請使用本機 barrel 檔案（`api.ts`、`runtime-api.ts`）進行
內部匯入 —— 絕不要透過其 SDK 路徑匯入您自己的插件。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元資料</Check>
<Check>**openclaw.plugin.** 清單存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本機模組，而非 SDK 自我匯入</Check>
<Check>測試通過（`pnpm test -- extensions/my-plugin/`）</Check>
<Check>`pnpm check` 通過（倉庫內插件）</Check>

## Beta 版本測試

1. 留意 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發佈標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知，以獲取發佈公告。
2. 在 Beta 標籤出現後，儘快針對該標籤測試您的外掛。穩定版本發佈前的時間通常只有幾個小時。
3. 測試完成後，請在 `plugin-forum` Discord 頻道的您的外掛主題串中張貼測試結果 `all good` 或遇到的問題。如果您還沒有主題串，請建立一個。
4. 如果有任何問題，請開啟或更新一個標題為 `Beta blocker: <plugin-name> - <summary>` 的 issue，並加上 `beta-blocker` 標籤。請將 issue 連結放在您的討論串中。
5. 向 `main` 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 執行緒中連結該問題。貢獻者無法標記 PR，因此標題是維護者和自動化工具在 PR 端的訊號。有 PR 的阻滯性問題會被合併；沒有 PR 的可能仍會發布。維護者會在測試期間監控這些執行緒。
6. 保持沈默即表示無問題（綠燈）。如果您錯過了時窗，您的修正很可能會在下一個週期落地。

## 接下來的步驟

<CardGroup cols={2}>
  <Card title="通道外掛程式" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    建構訊息通道外掛程式
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    建構模型提供者外掛程式
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/en/plugins/sdk-overview">
    匯入圖與註冊 API 參考
  </Card>
  <Card title="Runtime 輔助函式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、搜尋、子代理
  </Card>
  <Card title="測試" icon="test-tubes" href="/en/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="Plugin Manifest" icon="file-" href="/en/plugins/manifest">
    完整 Manifest 綱要參考
  </Card>
</CardGroup>
