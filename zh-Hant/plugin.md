---
summary: "OpenClaw 外掛程式/擴充功能：探索、設定與安全性"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "外掛程式"
---

# 外掛程式（擴充功能）

## 快速入門（初次接觸外掛程式？）

外掛程式只是一個**小型程式碼模組**，用來透過額外功能（指令、工具和 Gateway RPC）擴充 OpenClaw。

大多數時候，當您想要 OpenClaw 核心尚未內建的功能（或者您想將可選功能保留在主安裝之外）時，您會使用外掛程式。

快速路徑：

1. 檢視目前已載入的項目：

```bash
openclaw plugins list
```

2. 安裝官方外掛程式（例如：Voice Call）：

```bash
openclaw plugins install @openclaw/voice-call
```

3. 重新啟動 Gateway，然後在 `plugins.entries.<id>.config` 下進行設定。

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 以了解具體的外掛程式範例。

## 可用的外掛程式（官方）

- Microsoft Teams 自 2026.1.15 起僅支援外掛程式；如果您使用 Teams，請安裝 `@openclaw/msteams`。
- Memory (Core) — 內建的記憶體搜尋外掛程式（透過 `plugins.slots.memory` 預設啟用）
- Memory (LanceDB) — 內建的長期記憶體外掛程式（自動回憶/擷取；設定 `plugins.slots.memory = "memory-lancedb"`）
- [Voice Call](/zh-Hant/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/zh-Hant/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/zh-Hant/channels/matrix) — `@openclaw/matrix`
- [Nostr](/zh-Hant/channels/nostr) — `@openclaw/nostr`
- [Zalo](/zh-Hant/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/zh-Hant/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (提供者驗證) — 打包為 `google-antigravity-auth` (預設停用)
- Gemini CLI OAuth (提供者驗證) — 打包為 `google-gemini-cli-auth` (預設停用)
- Qwen OAuth (提供者驗證) — 打包為 `qwen-portal-auth` (預設停用)
- Copilot Proxy (提供者驗證) — 本地 VS Code Copilot Proxy 橋接器；與內建的 `github-copilot` 裝置登入不同 (已打包，預設停用)

OpenClaw 外掛是透過 jiti 在執行時期載入的 **TypeScript 模組**。**組態
驗證不會執行外掛程式碼**；它會改用外掛清單與 JSON
Schema。請參閱 [Plugin manifest](/zh-Hant/plugins/manifest)。

外掛可以註冊：

- Gateway RPC 方法
- Gateway HTTP 處理器
- Agent 工具
- CLI 指令
- 背景服務
- 選用組態驗證
- **技能**（透過在插件清單中列出 `skills` 目錄）
- **自動回覆指令**（無需呼叫 AI 代理即可執行）

插件與閘道**同進程**運行，因此請將其視為受信任的程式碼。
工具撰寫指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

## 執行時輔助工具

插件可以透過 `api.runtime` 存取選定的核心輔助工具。針對電話語音 TTS：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

備註：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 傳回 PCM 音訊緩衝區 + 取樣率。插件必須為提供者重新取樣/編碼。
- 電話語音不支援 Edge TTS。

## 探索與優先順序

OpenClaw 會依序掃描：

1. 配置路徑

- `plugins.load.paths`（檔案或目錄）

2. 工作區擴充功能

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全域擴充功能

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 內建擴充功能（隨 OpenClaw 附帶，**預設為停用**）

- `<openclaw>/extensions/*`

必須透過 `plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>` 明確啟用內建外掛程式。已安裝的外掛程式預設為啟用，但也可以用相同方式停用。

每個外掛程式必須在其根目錄中包含一個 `openclaw.plugin.json` 檔案。如果路徑指向某個檔案，則外掛程式根目錄為該檔案的所在目錄，且必須包含此資訊清單。

如果多個外掛程式解析為相同的 ID，則上述順序中的第一個匹配項將獲勝，並忽略優先順序較低的副本。

### 套件包

外掛程式目錄中可以包含一個含有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

每個條目都會成為一個外掛程式。如果套件包列出多個擴充功能，外掛程式 ID 會變成 `name/<fileBase>`。

如果您的外掛程式匯入 npm 相依性，請將其安裝在該目錄中，以便
`node_modules` 可用 (`npm install` / `pnpm install`)。

### 通道目錄元數據

通道外掛程式可以透過 `openclaw.channel` 宣傳上架元數據，並透過
`openclaw.install` 提供安裝提示。這使核心目錄保持無數據狀態。

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

OpenClaw 也可以合併 **外部通道目錄** (例如 MPM
註冊表匯出)。將 JSON 檔案放置於以下任一路徑：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者將 `OPENCLAW_PLUGIN_CATALOG_PATHS` (或 `OPENCLAW_MPM_CATALOG_PATHS`) 指向
一或多個 JSON 檔案 (以逗號/分號/`PATH` 分隔)。每個檔案應
包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 外掛程式 ID

預設外掛程式 ID：

- 套件包：`package.json` `name`
- 獨立檔案：檔案基本名稱 (`~/.../voice-call.ts` → `voice-call`)

如果外掛程式匯出 `id`，OpenClaw 會使用它，但若其與設定的 ID 不符則會發出警告。

## 組態

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

- `enabled`：主切換 (預設：true)
- `allow`：允許清單 (選用)
- `deny`：拒絕清單 (選用；拒絕優先)
- `load.paths`：額外的外掛檔案/目錄
- `entries.<id>`：個別外掛切換 + 組態

變更組態**需要重新啟動閘道**。

驗證規則 (嚴格)：

- `entries`、`allow`、`deny` 或 `slots` 中出現未知的外掛 ID 屬於**錯誤**。
- 未知的 `channels.<id>` 金鑰是 **錯誤**，除非插件清單宣告了頻道 ID。
- 插件設定是使用嵌入在 `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 來驗證的。
- 如果插件被停用，其設定會被保留，並且會發出 **警告**。

## 插件槽（獨佔類別）

某些插件類別是 **獨佔的**（一次只能啟用一個）。使用 `plugins.slots` 來選擇哪個插件擁有該槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

如果多個插件宣告 `kind: "memory"`，只有被選中的那個會載入。其他的會被停用並附帶診斷資訊。

## 控制 UI (Schema + 標籤)

控制 UI 使用 `config.schema` (JSON Schema + `uiHints`) 來渲染更好的表單。

OpenClaw 會根據探索到的插件在執行時增強 `uiHints`：

- 為 `plugins.entries.<id>` / `.enabled` / `.config` 新增個別外掛程式標籤
- 合併選用的外掛程式提供的設定欄位提示於：
  `plugins.entries.<id>.config.<field>`

如果您希望外掛程式設定欄位顯示良好的標籤/佔位符（並將機密標記為敏感），請在外掛程式清單中隨附 JSON Schema 提供 `uiHints`。

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

`plugins update` 僅適用於在 `plugins.installs` 下追蹤的 npm 安裝。

外掛程式也可以註冊自己的頂層指令（例如：`openclaw voicecall`）。

## 外掛程式 API (概覽)

外掛程式匯出下列其中之一：

- 一個函式：`(api) => { ... }`
- 一個物件：`{ id, name, configSchema, register(api) { ... } }`

## 外掛程式 Hooks

插件可以附帶掛鉤並在執行時註冊它們。這讓插件可以打包事件驅動的自動化，而無需單獨安裝掛鉤包。

### 範例

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

備註：

- 掛鉤目錄遵循正常的掛鉤結構（`HOOK.md` + `handler.ts`）。
- 掛鉤資格規則仍然適用（作業系統/二進位檔/環境/配置要求）。
- 外掛程式管理的掛鉤會顯示在 `openclaw hooks list` 中，並帶有 `plugin:<id>`。
- 您無法透過 `openclaw hooks` 啟用/停用外掛程式管理的掛鉤；請改為啟用/停用外掛程式。

## 提供者外掛程式（模型驗證）

外掛程式可以註冊**模型提供者驗證**流程，以便使用者可以在 OpenClaw 內執行 OAuth 或 API 金鑰設定（不需要外部腳本）。

透過 `api.registerProvider(...)` 註冊提供者。每個提供者會公開一個或多個驗證方法（OAuth、API 金鑰、裝置代碼等）。這些方法支援：

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
  `openUrl` 和 `oauth.createVpsAwareHandlers` 輔助函數的 `ProviderAuthContext`。
- 當您需要新增預設模型或供應商設定時，請回傳 `configPatch`。
- 請回傳 `defaultModel`，以便 `--set-default` 更新代理預設值。

### 註冊訊息傳遞通道

外掛程式可以註冊行為類似於內建通道
（WhatsApp、Telegram 等）的 **通道外掛程式**。通道設定位於 `channels.<id>` 下，並由您的通道外掛程式碼進行驗證。

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

- 請將設定放在 `channels.<id>` 下（而非 `plugins.entries`）。
- `meta.label` 用於 CLI/UI 列表中的標籤。
- `meta.aliases` 新增用於標準化和 CLI 輸入的替代 ID。
- `meta.preferOver` 列出在兩者都已配置時跳過自動啟用的頻道 ID。
- `meta.detailLabel` 和 `meta.systemImage` 讓 UI 能顯示更豐富的頻道標籤/圖示。

### 撰寫新的訊息頻道（逐步說明）

當您需要**新的聊天介面**（「訊息頻道」），而非模型提供者時使用此功能。
模型提供者文件位於 `/providers/*` 之下。

1. 選擇 ID + 配置結構

- 所有頻道配置都位於 `channels.<id>` 之下。
- 對於多帳號設置，建議使用 `channels.<id>.accounts.<accountId>`。

2. 定義頻道元資料

- `meta.label`、`meta.selectionLabel`、`meta.docsPath` 和 `meta.blurb` 控制 CLI/UI 列表。
- `meta.docsPath` 應指向文件頁面，例如 `/channels/<id>`。
- `meta.preferOver` 允許插件取代另一個頻道（自動啟用會優先選擇它）。
- `meta.detailLabel` 和 `meta.systemImage` 由 UI 用於顯示詳細文字/圖示。

3. 實作所需的適配器

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (聊天類型、媒體、討論串等)
- `outbound.deliveryMode` + `outbound.sendText` (用於基本傳送)

4. 視需要新增選用的適配器

- `setup` (精靈), `security` (DM 政策), `status` (健康/診斷)
- `gateway` (啟動/停止/登入), `mentions`, `threading`, `streaming`
- `actions` (訊息操作), `commands` (原生指令行為)

5. 在您的插件中註冊頻道

- `api.registerChannel({ plugin })`

最小配置範例：

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

最小頻道插件 (僅限輸出)：

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

載入插件 (擴充套件目錄或 `plugins.load.paths`)，重新啟動網關，
然後在您的配置中設定 `channels.<id>`。

### Agent 工具

請參閱專屬指南：[Plugin agent tools](/zh-Hant/plugins/agent-tools)。

### 註冊 Gateway RPC 方法

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

外掛程式可以註冊自訂斜線指令，這些指令**無需叫用 AI 代理程式**即可執行。這對於切換指令、狀態檢查或不需要 LLM 處理的快速動作非常有用。

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

- `senderId`：發送者的 ID（如果有的話）
- `channel`：傳送指令的頻道
- `isAuthorizedSender`：發送者是否為授權使用者
- `args`：指令之後傳遞的參數（如果 `acceptsArgs: true`）
- `commandBody`：完整的指令文字
- `config`：目前的 OpenClaw 設定

指令選項：

- `name`：指令名稱（不包含前導的 `/`）
- `description`：在指令清單中顯示的說明文字
- `acceptsArgs`：指令是否接受參數（預設值：false）。如果為 false 且提供了參數，該指令將不會匹配，訊息將會傳遞給其他處理程式
- `requireAuth`：是否要求經過授權的發送者（預設值：true）
- `handler`：返回 `{ text: string }` 的函數（可以是異步的）

包含授權和參數的範例：

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

注意：

- 插件指令會在內建指令和 AI 代理程式**之前**被處理
- 指令是全域註冊的，並在所有頻道中運作
- 指令名稱不區分大小寫（`/MyStatus` 符合 `/mystatus`）
- 指令名稱必須以字母開頭，且只能包含字母、數字、連字號和底線
- 保留的命令名稱（例如 `help`、`status`、`reset` 等）無法被外掛覆寫
- 跨外掛重複註冊命令將會失敗，並回報診斷錯誤

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

- Gateway 方法：`pluginId.action`（例如：`voicecall.status`）
- 工具：`snake_case`（例如：`voice_call`）
- CLI 指令：kebab 或 camel case，但避免與核心指令衝突

## 技能

外掛可以在 repo 中附帶技能（`skills/<name>/SKILL.md`）。
使用 `plugins.entries.<id>.enabled`（或其他設定閘道）啟用它，並確保
它存在於您的工作區/受管理技能位置中。

## 發布

建議的打包方式：

- 主要套件：`openclaw`（此 repo）
- 外掛程式：`@openclaw/*` 下的獨立 npm 套件（例如：`@openclaw/voice-call`）

發布合約：

- 外掛程式 `package.json` 必須包含帶有一個或多個入口檔案的 `openclaw.extensions`。
- 入口檔案可以是 `.js` 或 `.ts`（jiti 會在執行時載入 TS）。
- `openclaw plugins install <npm-spec>` 使用 `npm pack`，解壓縮至 `~/.openclaw/extensions/<id>/`，並在設定中啟用。
- 設定鍵穩定性：範圍套件 (scoped packages) 會正規化為 `plugins.entries.*` 的 **無範圍** (unscoped) id。

## 範例外掛程式：語音通話

此儲存庫包含一個語音通話外掛程式（Twilio 或 log 備援）：

- 來源：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`、`voicecall.status`
- Config (twilio)：`provider: "twilio"` + `twilio.accountSid/authToken/from` (選用 `statusCallbackUrl`、`twimlUrl`)
- Config (dev)：`provider: "log"` (無網路)

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 和 `extensions/voice-call/README.md` 以了解設定與使用方式。

## 安全性備註

外掛程式與 Gateway 在同一個行程中執行。請將其視為受信任的程式碼：

- 僅安裝您信任的外掛程式。
- 偏好使用 `plugins.allow` 允許清單。
- 變更後請重新啟動 Gateway。

## 測試外掛程式

外掛程式可以（也應該）附帶測試：

- 存放於儲存庫中的外掛程式可將 Vitest 測試置於 `src/**` 下 (例如：`src/plugins/voice-call.plugin.test.ts`)。
- 單獨發布的外掛程式應執行自己的 CI（lint/build/test），並驗證 `openclaw.extensions` 指向建置的進入點（`dist/index.js`）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
