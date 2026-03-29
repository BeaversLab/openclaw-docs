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

您不需要將外掛程式新增至 OpenClaw 存放庫。發佈至
[ClawHub](/en/tools/clawhub) 或 npm，使用者即可透過
`openclaw plugins install <package-name>` 安裝。OpenClaw 會優先嘗試 ClawHub，
並自動回退至 npm。

## 先決條件

- Node >= 22 與套件管理工具 (npm 或 pnpm)
- 熟悉 TypeScript (ESM)
- 針對存放庫內的外掛程式：已複製存放庫並完成 `pnpm install`

## 哪種類型的外掛程式？

<CardGroup cols={3}>
  <Card title="頻道外掛程式" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    將 OpenClaw 連線至訊息平台 (Discord、IRC 等)
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    新增模型提供者 (LLM、代理伺服器或自訂端點)
  </Card>
  <Card title="工具 / 掛鉤外掛程式" icon="wrench">
    註冊代理程式工具、事件掛鉤或服務 — 請繼續閱讀下方內容
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

    每個外掛程式都需要清單，即使沒有任何設定。請參閱
    [Manifest](/en/plugins/manifest) 以取得完整的綱要 (Schema)。

  </Step>

  <Step title="寫入進入點">

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

    `definePluginEntry` 用於非通道插件。對於通道，請使用
    `defineChannelPluginEntry` — 請參閱 [通道插件](/en/plugins/sdk-channel-plugins)。
    如需完整的進入點選項，請參閱 [進入點](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="測試與發布">

    **外部插件：** 發布到 [ClawHub](/en/tools/clawhub) 或 npm，然後安裝：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 會先檢查 ClawHub，然後再回退到 npm。

    **倉庫內插件：** 放置在 `extensions/` 下 — 會自動被發現。

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

單個插件可以透過 `api` 物件註冊任意數量的功能：

| 功能            | 註冊方法                                      | 詳細指南                                                                     |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| 文字推斷 (LLM)  | `api.registerProvider(...)`                   | [提供者插件](/en/plugins/sdk-provider-plugins)                               |
| 通道 / 訊息傳遞 | `api.registerChannel(...)`                    | [通道插件](/en/plugins/sdk-channel-plugins)                                  |
| 語音 (TTS/STT)  | `api.registerSpeechProvider(...)`             | [提供者插件](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒體理解        | `api.registerMediaUnderstandingProvider(...)` | [提供者插件](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 圖像生成        | `api.registerImageGenerationProvider(...)`    | [提供者插件](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 網路搜尋        | `api.registerWebSearchProvider(...)`          | [提供者插件](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 代理工具        | `api.registerTool(...)`                       | 下方                                                                         |
| 自訂指令        | `api.registerCommand(...)`                    | [進入點](/en/plugins/sdk-entrypoints)                                        |
| 事件掛鉤        | `api.registerHook(...)`                       | [進入點](/en/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                  | [內部機制](/en/plugins/architecture#gateway-http-routes)                     |
| CLI 子指令      | `api.registerCli(...)`                        | [進入點](/en/plugins/sdk-entrypoints)                                        |

如需完整的註冊 API，請參閱 [SDK 概覽](/en/plugins/sdk-overview#registration-api)。

請注意以下的 Hook guard 語意：

- `before_tool_call`：`{ block: true }` 是終止的，並停止較低優先級的處理程序。
- `before_tool_call`：`{ block: false }` 被視為未做決定。
- `message_sending`：`{ cancel: true }` 是終止的，並停止較低優先級的處理程序。
- `message_sending` `{ cancel: false }` 被視為未做決定。

詳情請參閱 [SDK Overview hook decision semantics](/en/plugins/sdk-overview#hook-decision-semantics)。

## 註冊代理工具

工具是 LLM 可以調用的類型化函數。它們可以是必需的（始終可用）或可選的（用戶選擇加入）：

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

用戶在配置中啟用可選工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名稱不得與核心工具衝突（衝突的工具將被跳過）
- 對於具有副作用或額外二進制要求的工具，請使用 `optional: true`
- 用戶可以透過將插件 ID 添加到 `tools.allow` 來啟用插件中的所有工具

## 匯入慣例

始終從專用的 `openclaw/plugin-sdk/<subpath>` 路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有關完整的子路徑參考，請參閱 [SDK Overview](/en/plugins/sdk-overview)。

在您的插件內部，請使用本地桶檔案（`api.ts`、`runtime-api.ts`）進行
內部匯入 — 切勿透過其 SDK 路徑匯入您自己的插件。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 元數據</Check>
<Check>**openclaw.plugin.** 清單存在且有效</Check>
<Check>入口點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專用的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模塊，而非 SDK 自我匯入</Check>
<Check>測試通過（`pnpm test -- extensions/my-plugin/`）</Check>
<Check>`pnpm check` 通過（倉庫內插件）</Check>

## 下一步

<CardGroup cols={2}>
  <Card title="頻道插件" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    建構訊息頻道插件
  </Card>
  <Card title="供應商外掛程式" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    建構模型供應商外掛程式
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/en/plugins/sdk-overview">
    匯入映射與註冊 API 參考資料
  </Card>
  <Card title="執行時期輔助程式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、搜尋、子代理程式
  </Card>
  <Card title="測試" icon="test-tubes" href="/en/plugins/sdk-testing">
    測試工具與模式
  </Card>
  <Card title="外掛程式清單" icon="file-json" href="/en/plugins/manifest">
    完整的清單架構參考資料
  </Card>
</CardGroup>
