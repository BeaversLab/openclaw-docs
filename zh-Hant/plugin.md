---
summary: "OpenClaw 外掛程式/延伸模組：探索、設定與安全性"
read_when:
  - 新增或修改外掛程式/延伸模組
  - 記錄外掛程式安裝或載入規則
title: "外掛程式"
---

# 外掛程式 (延伸模組)

## 快速入門 (初次接觸外掛程式？)

外掛程式只是一個**小型程式碼模組**，透過額外功能（指令、工具與 Gateway RPC）來擴充 OpenClaw。

大多數時候，當您想要一個尚未內建於 OpenClaw 核心的功能時（或者您想將可選功能留在主安裝之外），就會使用外掛程式。

快速路徑：

1. 查看目前已載入的內容：

```bash
openclaw plugins list
```

2. 安裝官方外掛程式（範例：語音通話）：

```bash
openclaw plugins install @openclaw/voice-call
```

3. 重新啟動 Gateway，然後在 `plugins.entries.<id>.config` 下進行設定。

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 以取得具體的外掛程式範例。

## 可用外掛程式 (官方)

- Microsoft Teams 自 2026.1.15 起僅支援外掛程式；如果您使用 Teams，請安裝 `@openclaw/msteams`。
- 記憶體 (核心) — 隨附的記憶體搜尋外掛程式（預設透過 `plugins.slots.memory` 啟用）
- 記憶體 (LanceDB) — 隨附的長期記憶體外掛程式（自動回憶/擷取；設定 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/zh-Hant/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh-Hant/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh-Hant/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh-Hant/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh-Hant/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh-Hant/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (提供者驗證) — 隨附為 `google-antigravity-auth` (預設停用)
- Gemini CLI OAuth (提供者驗證) — 隨附為 `google-gemini-cli-auth` (預設停用)
- Qwen OAuth (提供者驗證) — 隨附為 `qwen-portal-auth` (預設停用)
- Copilot Proxy (提供者驗證) — 本地端 VS Code Copilot Proxy 橋接器；與內建的 `github-copilot` 裝置登入不同 (隨附，預設停用)

OpenClaw 外掛程式是透過 jiti 在執行時期載入的 **TypeScript 模組**。**組態驗證不會執行外掛程式碼**；它會改用外掛程式清單和 JSON Schema。請參閱 [Plugin manifest](/zh-Hant/plugins/manifest)。

外掛程式可以註冊：

- Gateway RPC 方法
- Gateway HTTP 處理程式
- Agent 工具
- CLI 指令
- 背景服務
- 選用的組態驗證
- **技能**（透過在外掛程式清單中列出 `skills` 目錄）
- **自動回覆指令**（執行時不叫用 AI agent）

外掛程式與 Gateway **同程序** (in‑process) 執行，因此請將它們視為受信任的程式碼。
工具撰寫指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

## 執行時期輔助程式

外掛程式可以透過 `api.runtime` 存取選定的核心輔助程式。針對電話 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

備註：

- 使用核心 `messages.tts` 組態 (OpenAI 或 ElevenLabs)。
- 傳回 PCM 音訊緩衝區 + 取樣率。外掛程式必須針對供應商進行重取樣/編碼。
- 不支援電話的 Edge TTS。

## 探索與優先順序

OpenClaw 依序掃描：

1. 組態路徑

- `plugins.load.paths` (檔案或目錄)

2. 工作區擴充功能

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全域擴充功能

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 內建擴充功能 (隨 OpenClaw 附帶，**預設為停用**)

- `<openclaw>/extensions/*`

必須透過 `plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>` 明確啟用內建外掛程式。已安裝的外掛程式預設為啟用，但可以用相同的方式停用。

每個外掛程式必須在其根目錄中包含一個 `openclaw.plugin.json` 檔案。如果路徑指向檔案，則外掛程式根目錄為該檔案的目錄，且必須包含清單。

如果多個外掛程式解析到相同的 ID，則上述順序中的第一個符合項獲勝，並忽略優先順序較低的副本。

### 套件包

外掛程式目錄可能包含帶有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每個項目都會成為一個外掛程式。如果套件包列出了多個擴充功能，外掛程式 ID 會變成 `name/<fileBase>`。

如果您的插件導入了 npm 依賴項，請將其安裝在該目錄中，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

### 頻道目錄元數據

頻道插件可以通過 `openclaw.channel` 宣傳上手元數據，並通過 `openclaw.install` 提供安裝提示。這可以保持核心目錄不包含數據。

範例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw 也可以合併 **外部頻道目錄**（例如 MPM 註冊表匯出）。將 JSON 檔案放置在以下任一位置：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一個或多個 JSON 檔案（以逗號/分號/`PATH` 分隔）。每個檔案應包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

預設插件 ID：

- Package packs：`package.json` `name`
- 獨立檔案：檔案基本名稱（`~/.../voice-call.ts` → `voice-call`）

如果插件匯出 `id`，OpenClaw 將使用它，但在其與配置的 ID 不匹配時會發出警告。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

欄位：

- `enabled`：主開關（預設值：true）
- `allow`：允許清單（可選）
- `deny`：拒絕清單（可選；拒絕優先）
- `load.paths`：額外的插件檔案/目錄
- `entries.<id>`：每個插件的開關 + 配置

配置變更 **需要重新啟動 gateway**。

驗證規則（嚴格）：

- `entries`、`allow`、`deny` 或 `slots` 中的未知插件 ID 為 **錯誤**。
- 未知的 `channels.<id>` 鍵為 **錯誤**，除非插件清單宣告了頻道 ID。
- 插件配置是使用嵌入在 `openclaw.plugin.json`（`configSchema`）中的 JSON Schema 進行驗證的。
- 如果插件被停用，其配置會被保留，並且會發出 **警告**。

## 插件插槽（獨佔類別）

某些外掛類別是**獨佔**的（一次只能啟用一個）。請使用
`plugins.slots` 來選擇哪個外掛擁有該位置：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

如果多個外掛宣告 `kind: "memory"`，只有被選中的那個會載入。其他的
會被停用並顯示診斷資訊。

## 控制介面 (schema + labels)

控制介面使用 `config.schema` (JSON Schema + `uiHints`) 來渲染更好的表單。

OpenClaw 會根據發現的外掛在執行時增強 `uiHints`：

- 為 `plugins.entries.<id>` / `.enabled` / `.config` 新增各別外掛的 labels
- 在以下路徑合併選用性的外掛提供的設定欄位提示：
  `plugins.entries.<id>.config.<field>`

如果您希望您的外掛設定欄位顯示良好的 labels/placeholders（並將機密標記為敏感），
請在外掛清單中將 `uiHints` 與您的 JSON Schema 一起提供。

範例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` 僅適用於 `plugins.installs` 中追蹤的 npm 安裝。

外掛也可以註冊自己的頂層指令（例如：`openclaw voicecall`）。

## 外掛 API (概覽)

外掛匯出以下任一項：

- 一個函式：`(api) => { ... }`
- 一個物件：`{ id, name, configSchema, register(api) { ... } }`

## 外掛 hooks

外掛可以包含 hooks 並在執行時註冊它們。這讓外掛可以打包
事件驅動的自動化，而無需額外安裝 hook pack。

### 範例

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

備註：

- Hook 目錄遵循正常的 hook 結構 (`HOOK.md` + `handler.ts`)。
- Hook 資格規則仍然適用 (作業系統/可執行檔/環境/設定 需求)。
- 外掛管理的 hooks 會顯示在 `openclaw hooks list` 中，並帶有 `plugin:<id>`。
- 您無法透過 `openclaw hooks` 啟用/停用外掛管理的 hooks；請改為啟用/停用外掛。

## 提供者外掛 (model auth)

外掛可以註冊 **模型提供者驗證** 流程，讓使用者可以在 OpenClaw 內執行 OAuth 或
API 金鑰設定（無需外部腳本）。

透過 `api.registerProvider(...)` 註冊提供者。每個提供者會公開一個
或多個驗證方法 (OAuth、API 金鑰、裝置代碼等)。這些方法支援：

- `openclaw models auth login --provider <id> [--method <id>]`

範例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
});
```

備註：

- `run` 會接收一個帶有 `prompter`、`runtime`、
  `openUrl` 和 `oauth.createVpsAwareHandlers` 輔助函式的 `ProviderAuthContext`。
- 當您需要新增預設模型或提供者設定時，請傳回 `configPatch`。
- 傳回 `defaultModel` 以便 `--set-default` 可以更新代理預設值。

### 註冊訊息通道

外掛可以註冊**通道外掛**，其行為類似於內建通道 (WhatsApp、Telegram 等)。通道設定位於 `channels.<id>` 下，並由您的通道外掛程式碼驗證。

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

備註：

- 將設定放在 `channels.<id>` 下 (而非 `plugins.entries`)。
- `meta.label` 用於 CLI/UI 列表中的標籤。
- `meta.aliases` 新增用於標準化和 CLI 輸入的替代 ID。
- `meta.preferOver` 列出當兩者都設定為時要跳過自動啟用的通道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 讓 UI 能顯示更豐富的通道標籤/圖示。

### 撰寫新的訊息通道 (逐步指南)

當您想要**新的聊天介面** (「訊息通道」) 而非模型提供者時，請使用此功能。
模型提供者文件位於 `/providers/*` 下。

1. 選擇 ID + 設定結構

- 所有通道設定都位於 `channels.<id>` 下。
- 對於多帳號設定，建議優先使用 `channels.<id>.accounts.<accountId>`。

2. 定義通道中繼資料

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 應指向文件頁面，例如 `/channels/<id>`。
- `meta.preferOver` 允許外掛取代另一個通道 (自動啟用會優先選擇它)。
- `meta.detailLabel` 和 `meta.systemImage` 由 UI 用於顯示詳細資訊文字/圖示。

3. 實作必要的配接器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (聊天類型、媒體、執行緒等)
- `outbound.deliveryMode` + `outbound.sendText` (用於基本發送)

4. 根據需要添加選用介面卡

- `setup` (精靈), `security` (DM 原則), `status` (健全狀況/診斷)
- `gateway` (啟動/停止/登入), `mentions`, `threading`, `streaming`
- `actions` (訊息動作), `commands` (原生指令行為)

5. 在您的外掛程式中註冊通道

- `api.registerChannel({ plugin })`

最簡設定範例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最簡通道外掛程式 (僅限輸出)：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

載入外掛程式 (extensions 目錄或 `plugins.load.paths`)，重新啟動閘道，
然後在您的設定中設定 `channels.<id>`。

### Agent 工具

請參閱專屬指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

### 註冊閘道 RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 註冊 CLI 指令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 註冊自動回覆指令

外掛程式可以註冊自訂斜線指令，這些指令**無需叫用
AI agent** 即可執行。這適用於開關指令、狀態檢查，或是不需要 LLM 處理的
快速動作。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

指令處理常式內容：

- `senderId`: 發送者的 ID (如果有的話)
- `channel`: 傳送指令的通道
- `isAuthorizedSender`: 發送者是否為授權使用者
- `args`: 指令之後傳遞的引數 (如果 `acceptsArgs: true`)
- `commandBody`: 完整的指令文字
- `config`: 目前的 OpenClaw 設定

指令選項：

- `name`: 指令名稱 (不包含開頭的 `/`)
- `description`: 在指令清單中顯示的說明文字
- `acceptsArgs`: 指令是否接受引數 (預設：false)。如果為 false 且提供了引數，則該指令將不會符合，且訊息會傳遞給其他處理常式
- `requireAuth`: 是否要求授權發送者 (預設：true)
- `handler`：返回 `{ text: string }` 的函式（可為非同步）

包含授權與參數的範例：

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

備註：

- 外掛指令會在內建指令與 AI 代理程式**之前**處理
- 指令為全域註冊，且在所有頻道中皆可運作
- 指令名稱不區分大小寫（`/MyStatus` 符合 `/mystatus`）
- 指令名稱必須以字母開頭，且僅能包含字母、數字、連字號與底線
- 保留的指令名稱（如 `help`、`status`、`reset` 等）無法由外掛覆寫
- 跨外掛重複註冊指令將會失敗並回報診斷錯誤

### 註冊背景服務

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## 命名慣例

- Gateway 方法：`pluginId.action`（範例：`voicecall.status`）
- 工具：`snake_case`（範例：`voice_call`）
- CLI 指令：kebab-case 或 camelCase，但避免與核心指令衝突

## 技能

外掛可在 repo 中附帶一個技能（`skills/<name>/SKILL.md`）。
使用 `plugins.entries.<id>.enabled`（或其他設定開關）啟用它，並確保
它位於您的工作區/受管理技能位置中。

## 發行

建議的封裝方式：

- 主要套件：`openclaw`（此 repo）
- 外掛：於 `@openclaw/*` 下的獨立 npm 套件（範例：`@openclaw/voice-call`）

發行合約：

- 外掛 `package.json` 必須包含 `openclaw.extensions`，其中含有一或多個進入點檔案。
- 進入點檔案可以是 `.js` 或 `.ts`（jiti 會在執行時期載入 TS）。
- `openclaw plugins install <npm-spec>` 會使用 `npm pack`，解壓縮至 `~/.openclaw/extensions/<id>/`，並在設定中啟用它。
- 設定鍵穩定性：限定範圍的套件會在 `plugins.entries.*` 中正規化為**未限定範圍**的 id。

## 範例外掛：語音通話

此 repo 包含一個語音通話外掛（Twilio 或 log 備援）：

- 來源：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`，`voicecall.status`
- 設定（twilio）：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可選 `statusCallbackUrl`，`twimlUrl`）
- 設定（dev）：`provider: "log"`（無網路）

請參閱 [語音通話](/zh-Hant/plugins/voice-call) 和 `extensions/voice-call/README.md` 以進行設定和使用。

## 安全注意事項

外掛程式與閘道在相同的程序中執行。請將其視為受信任的程式碼：

- 僅安裝您信任的外掛程式。
- 優先使用 `plugins.allow` 允許清單。
- 變更後請重新啟動閘道。

## 測試外掛程式

外掛程式可以（且應該）附帶測試：

- 存放庫內的外掛程式可以將 Vitest 測試保留在 `src/**` 下（例如：`src/plugins/voice-call.plugin.test.ts`）。
- 單獨發布的外掛程式應執行其自己的 CI（lint/build/test），並驗證 `openclaw.extensions` 指向建置的進入點（`dist/index.js`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
