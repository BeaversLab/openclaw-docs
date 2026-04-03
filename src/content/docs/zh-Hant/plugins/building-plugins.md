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

您無需將外掛程式新增至 OpenClaw 程式庫。發佈到
[ClawHub](/en/tools/clawhub) 或 npm，使用者即可使用
`openclaw plugins install <package-name>` 安裝。OpenClaw 會優先嘗試 ClawHub，然後自動回退至 npm。

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

    每個外掛程式都需要一個清單，即使沒有設定也一樣。請參閱
    [Manifest](/en/plugins/manifest) 以了解完整架構。正式的 ClawHub
    發佈程式碼片段位於 `docs/snippets/plugin-publish/`。

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

    `definePluginEntry` 用於非頻道外掛程式。若是頻道，請使用
    `defineChannelPluginEntry` — 請參閱 [Channel Plugins](/en/plugins/sdk-channel-plugins)。
    如需完整的進入點選項，請參閱 [Entry Points](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發佈">

    **External plugins:** 使用 ClawHub 驗證並發佈，然後進行安裝：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    針對像 `@myorg/openclaw-my-plugin` 這類純套件規格，OpenClaw 也會在檢查 npm 之前先檢查 ClawHub。

    **In-repo plugins:** 將其置於捆綁外掛程式工作區樹下 — 將會自動被發現。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

單一外掛程式可以透過 `api` 物件註冊任意數量的功能：

| 功能            | 註冊方法                                      | 詳細指南                                                                           |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| 文字推斷 (LLM)  | `api.registerProvider(...)`                   | [Provider Plugins](/en/plugins/sdk-provider-plugins)                               |
| CLI 推論後端    | `api.registerCliBackend(...)`                 | [CLI Backends](/en/gateway/cli-backends)                                           |
| 頻道 / 訊息傳遞 | `api.registerChannel(...)`                    | [Channel Plugins](/en/plugins/sdk-channel-plugins)                                 |
| 語音 (TTS/STT)  | `api.registerSpeechProvider(...)`             | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)` | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 代理程式工具    | `api.registerTool(...)`                       | 下方                                                                               |
| 自訂指令        | `api.registerCommand(...)`                    | [進入點](/en/plugins/sdk-entrypoints)                                              |
| 事件掛鉤        | `api.registerHook(...)`                       | [進入點](/en/plugins/sdk-entrypoints)                                              |
| HTTP 路由       | `api.registerHttpRoute(...)`                  | [內部機制](/en/plugins/architecture#gateway-http-routes)                           |
| CLI 子指令      | `api.registerCli(...)`                        | [進入點](/en/plugins/sdk-entrypoints)                                              |

如需完整的註冊 API，請參閱 [SDK 概覽](/en/plugins/sdk-overview#registration-api)。

請牢記以下掛鉤守衛語義：

- `before_tool_call`: `{ block: true }` 是終止狀態，並會停止優先順序較低的處理程序。
- `before_tool_call`: `{ block: false }` 被視為未做決定。
- `before_tool_call`: `{ requireApproval: true }` 會暫停代理執行，並透過執行核准覆蓋層、Telegram 按鈕、Discord 互動或任何頻道上的 `/approve` 指令提示使用者核准。
- `before_install`: `{ block: true }` 是終止狀態，並會停止優先順序較低的處理程序。
- `before_install`: `{ block: false }` 被視為未做決定。
- `message_sending`: `{ cancel: true }` 是終止狀態，並會停止優先順序較低的處理程序。
- `message_sending`: `{ cancel: false }` 被視為未做決定。

`/approve` 指令會以自動回退機制處理執行與外掛程式的核准。可以透過設定中的 `approvals.plugin` 獨立設定外掛程式核准的轉送。

詳情請參閱 [SDK 概覽 hook 決策語意](/en/plugins/sdk-overview#hook-decision-semantics)。

## 註冊代理工具

工具是 LLM 可呼叫的型別函式。它們可以是必要（始終可用）或選用（使用者選擇加入）：

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

使用者在設定中啟用選用工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突項目會被跳過）
- 對具有副作用或額外二進位需求的工具使用 `optional: true`
- 使用者可以透過將外掛程式 ID 新增至 `tools.allow` 來啟用外掛程式中的所有工具

## 匯入慣例

請一律從專注的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

如需完整的子路徑參考，請參閱 [SDK Overview](/en/plugins/sdk-overview)。

在您的插件內，請使用本地 barrel files (`api.ts`, `runtime-api.ts`) 進行
內部匯入 —— 切勿通過其 SDK 路徑匯入您自己的插件。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元數據</Check>
<Check>**openclaw.plugin.** 清單已存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過 (存放庫內插件)</Check>

## Beta 版本測試

1. 請關注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發布標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知以獲取發布公告。
2. Beta 標籤一出現，請立即針對其測試您的插件。正式版發布前的時間通常只有幾小時。
3. 測試後，請在 `plugin-forum` Discord 頻道的您的插件討論串中發布測試結果 `all good` 或遇到的問題。如果您還沒有討論串，請建立一個。
4. 如果有功能損壞，請開立或更新標題為 `Beta blocker: <plugin-name> - <summary>` 的問題並套用 `beta-blocker` 標籤。將問題連結放在您的討論串中。
5. 向 `main` 開立標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，並在 PR 和您的 Discord 討論串中都連結至該問題。貢獻者無法標記 PR，因此標題是維護者和自動化工具在 PR 端的訊號。附有 PR 的阻礙性問題會被合併；沒有 PR 的阻礙性問題可能仍會發布。維護者在 Beta 測試期間會關注這些討論串。
6. 沒消息就是好消息。如果您錯過了時間窗口，您的修復可能會在下一週期落地。

## 下一步

<CardGroup cols={2}>
  <Card title="通道插件" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    建構訊息通道插件
  </Card>
  <Card title="提供者插件" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    建構模型提供者插件
  </Card>
  <Card title="SDK 概述" icon="book-open" href="/en/plugins/sdk-overview">
    匯入對應與註冊 API 參考資料
  </Card>
  <Card title="Runtime 輔助程式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、搜尋、子代理程式
  </Card>
  <Card title="測試" icon="test-tubes" href="/en/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="插件清單" icon="file-" href="/en/plugins/manifest">
    完整清單架構參考資料
  </Card>
</CardGroup>

## 相關

- [插件架構](/en/plugins/architecture) — 內部架構深度剖析
- [SDK 概述](/en/plugins/sdk-overview) — 插件 SDK 參考資料
- [清單](/en/plugins/manifest) — 插件清單格式
- [通道插件](/en/plugins/sdk-channel-plugins) — 建構通道插件
- [提供者插件](/en/plugins/sdk-provider-plugins) — 建構提供者插件
