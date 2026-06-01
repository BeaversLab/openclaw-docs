---
summary: "在幾分鐘內建立您的第一個 OpenClaw 外掛程式"
title: "建置外掛程式"
sidebarTitle: "開始使用"
doc-schema-version: 1
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are choosing between channel, provider, CLI backend, tool, or hook docs
---

外掛程式可在不變更核心的情況下擴充 OpenClaw。外掛程式可以新增訊息通道、模型提供者、本機 CLI 後端、代理程式工具、掛勾 (hook)、媒體提供者，或另一個外掛程式擁有的功能。

您不需要將外部外掛程式新增至 OpenClaw 存放庫。將套件發佈到 [ClawHub](/zh-Hant/clawhub)，使用者即可透過以下方式安裝：

```bash
openclaw plugins install clawhub:<package-name>
```

在啟動切換期間，純套件規格仍會從 npm 安裝。當您需要 ClawHub 解析時，請使用
`clawhub:` 前綴。

## 需求

- 使用 Node 22.19 或更新版本，以及像 `npm` 或 `pnpm` 這樣的套件管理員。
- 請熟悉 TypeScript ESM 模組。
- 若要進行存放庫內的套件外掛程式工作，請複製存放庫並執行 `pnpm install`。
  原始碼結帳的外掛程式開發僅支援 pnpm，因為 OpenClaw 會從 `extensions/*` 工作區套件載入套件外掛程式。

## 選擇外掛程式類型

<CardGroup cols={2}>
  <Card title="通道外掛程式" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    將 OpenClaw 連線至訊息平台。
  </Card>
  <Card title="提供者外掛程式" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    新增模型、媒體、搜尋、擷取、語音或即時提供者。
  </Card>
  <Card title="CLI 後端外掛程式" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    透過 OpenClaw 模型後援機制執行本機 AI CLI。
  </Card>
  <Card title="工具外掛程式" icon="wrench" href="/zh-Hant/plugins/tool-plugins">
    註冊代理程式工具。
  </Card>
</CardGroup>

## 快速入門

透過註冊一個必要的代理程式工具來建構一個最小化的工具外掛。這是最短的有用外掛形狀，並展示了套件、清單、進入點以及本機驗證。

<Steps>
  <Step title="建立套件元資料">
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

    已發布的外部外掛應將執行時進入點指向已建置的 JavaScript 檔案。請參閱 [SDK entry points](/zh-Hant/plugins/sdk-entrypoints) 以了解完整的進入點合約。

    每個外掛都需要一個清單，即使它沒有設定。執行時工具必須出現在 `contracts.tools` 中，以便 OpenClaw 能夠在不急切載入每個外掛執行時的情況下發現所有權。有意義地設定 `activation.onStartup`。此範例在 Gateway 啟動時啟動。

    如需每個清單欄位的詳細資訊，請參閱 [Plugin manifest](/zh-Hant/plugins/manifest)。

  </Step>

  <Step title="註冊工具">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Echo one input value",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
            };
          },
        });
      },
    });
    ```

    針對非頻道外掛，使用 `definePluginEntry`。頻道外掛則使用
    `defineChannelPluginEntry`。

  </Step>

  <Step title="測試執行時">
    對於已安裝或外部外掛，請檢查已載入的執行時：

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    如果外掛註冊了 CLI 指令，也請執行該指令。例如，示範指令應該有執行驗證，例如
    `openclaw demo-plugin ping`。

    對於此儲存庫中的套件外掛，OpenClaw 會從 `extensions/*` 工作區發現原始碼結帳的外掛套件。執行最接近的目標測試：

    ```bash
    pnpm test -- extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="發布">
    發布前請驗證套件：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    標準的 ClawHub 程式碼片段位於 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="安裝">
    透過 ClawHub 安裝已發布的套件：

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

<a id="registering-agent-tools"></a>

## 註冊工具

工具可以是必選的或可選的。當外掛程式啟用時，必選工具始終可用。可選工具需要使用者選擇加入。

```typescript
register(api) {
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

使用 `api.registerTool(...)` 註冊的每個工具也必須在外掛程式清單中宣告：

```json
{
  "contracts": {
    "tools": ["workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

使用者透過 `tools.allow` 選擇加入：

```json5
{
  tools: { allow: ["workflow_tool"] }, // or ["my-plugin"] for all tools from one plugin
}
```

選用工具控制工具是否對模型公開。當工具或
掛鉤應在模型選取後且動作執行前請求批准時，請使用
[插件權限請求](/zh-Hant/plugins/plugin-permission-requests)。

請將選用工具用於副作用、特殊二進位檔案，或預設不應公開的功能。
工具名稱不得與核心工具衝突；衝突的工具會被跳過，並在插件診斷中回報。
格式錯誤的註冊（包括缺少 `parameters` 的工具描述元）也會
被跳過並以同樣方式回報。已註冊的工具是模型在通過策略
和允許清單檢查後可呼叫的型別函式。

工具工廠會接收一個執行時期提供的內容物件。當工具需要
記錄、顯示或適配當前輪次的現用模型時，請使用 `ctx.activeModel`。
該物件可以包含 `provider`、`modelId` 和
`modelRef`。請將其視為參考資訊性的執行時期元資料，而非防範本機
操作員、已安裝的插件程式碼或修改後的 OpenClaw 執行時期的安全邊界。
敏感的本機工具仍應要求明確的插件或操作員選擇加入，並在
現用模型元資料缺失或不適當時以封閉方式失敗。

清單宣告了所有權和探索方式；執行仍然會呼叫實際的已註冊工具實作。
請保持 `toolMetadata.<tool>.optional: true` 與
`api.registerTool(..., { optional: true })` 一致，以便 OpenClow 可以
避免載入該插件執行時期，直到該工具被明確加入允許清單為止。

## 匯入慣例

從專注的 SDK 子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

請勿從已棄用的根層級匯出檔匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk";
```

在您的插件套件中，請使用諸如 `api.ts` 和
`runtime-api.ts` 等本機匯出檔進行內部匯入。請勿透過 SDK
路徑匯入您自己的插件。特定於提供者的輔助函式應保留在提供者套件中，除非
該介面確實具有通用性。

自訂 Gateway RPC 方法是一個進階進入點。請將它們保留在
外掛特定的前綴上；核心管理命名空間（例如 `config.*`、
`exec.approvals.*`、`operator.admin.*`、`wizard.*` 和 `update.*`）保持保留
狀態，並解析至 `operator.admin`。
`openclaw/plugin-sdk/gateway-method-runtime` 橋接器保留給宣告
`contracts.gatewayMethodDispatch: ["authenticated-request"]` 的外掛 HTTP 路由使用。

若要查看完整的匯入對應，請參閱 [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)。

## 提交前檢查清單

<Check>**package.** 具有正確的 `openclaw` 中繼資料</Check>
<Check>**openclaw.plugin.** 資訊清單已存在且有效</Check>
<Check>進入點使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有匯入均使用專注的 `plugin-sdk/<subpath>` 路徑</Check>
<Check>內部匯入使用本地模組，而非 SDK 自我匯入</Check>
<Check>測試通過 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通過（儲存庫外掛）</Check>

## 針對 Beta 版本進行測試

1. 關注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 發布標籤，並透過 `Watch` > `Releases` 訂閱。Beta 標籤看起來像 `v2026.3.N-beta.1`。您也可以開啟官方 OpenClaw X 帳號 [@openclaw](https://x.com/openclaw) 的通知以取得發布公告。
2. 在 Beta 標籤出現後立即針對該版本測試您的外掛。穩定版發布前的時間通常只有幾小時。
3. 測試後，請在 `plugin-forum` Discord 頻道中您的外掛主題串張貼結果，說明 `all good` 或哪些功能發生問題。如果您還沒有主題串，請建立一個。
4. 如果有任何問題，請開立或更新標題為 `Beta blocker: <plugin-name> - <summary>` 的問題，並套用 `beta-blocker` 標籤。請將問題連結放在您的主題串中。
5. 開啟一個標題為 `fix(<plugin-id>): beta blocker - <summary>` 的 PR 到 `main`，並在 PR 和您的 Discord 執行緒中連結該 issue。貢獻者無法標記 PR，因此標題是維護者和自動化工具在 PR 端的信號。有 PR 的阻滯項目會被合併；沒有 PR 的阻滯項目可能仍會發布。維護者會在 Beta 測試期間關注這些執行緒。
6. 沒有消息就是好消息。如果您錯過了時機，您的修復可能會在下一個週期落地。

## 下一步

<CardGroup cols={2}>
  <Card title="頻道外掛" icon="messages-square" href="/zh-Hant/plugins/sdk-channel-plugins">
    建構訊息傳遞頻道外掛
  </Card>
  <Card title="提供者外掛" icon="cpu" href="/zh-Hant/plugins/sdk-provider-plugins">
    建構模型提供者外掛
  </Card>
  <Card title="CLI 後端外掛" icon="terminal" href="/zh-Hant/plugins/cli-backend-plugins">
    註冊本地 AI CLI 後端
  </Card>
  <Card title="SDK 概覽" icon="book-open" href="/zh-Hant/plugins/sdk-overview">
    匯入映射和註冊 API 參考
  </Card>
  <Card title="執行時輔助函式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、搜尋、subagent
  </Card>
  <Card title="測試" icon="test-tubes" href="/zh-Hant/plugins/sdk-testing">
    測試工具和模式
  </Card>
  <Card title="外掛清單" icon="file-" href="/zh-Hant/plugins/manifest">
    完整清單架構參考
  </Card>
</CardGroup>

## 相關

- [外掛鉤子](/zh-Hant/plugins/hooks)
- [外掛架構](/zh-Hant/plugins/architecture)
