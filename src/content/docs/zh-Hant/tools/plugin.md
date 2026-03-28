---
summary: "OpenClaw 外掛程式/擴充功能：探索、設定與安全性"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
---

# 外掛程式 (擴充功能)

## 快速入門

外掛程式可以是：

- 原生 **OpenClaw 外掛程式** (`openclaw.plugin.json` + 執行時期模組)，或
- 相容的 **套件** (`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`)

兩者都會顯示在 `openclaw plugins` 下，但只有原生 OpenClaw 外掛程式會在
程式內執行執行時期程式碼。

1. 查看已載入的項目：

```exec
openclaw plugins list
```

2. 安裝官方外掛程式 (範例：Voice Call)：

```exec
openclaw plugins install @openclaw/voice-call
```

Npm 規格僅支援 registry。請參閱[安裝規則](/zh-Hant/cli/plugins#install)以了解
關於鎖定版本、搶先體驗版管制以及支援規格格式的詳細資訊。

3. 重新啟動 Gateway，然後在 `plugins.entries.<id>.config` 下進行設定。

請參閱 [Voice Call](/zh-Hant/plugins/voice-call) 以了解具體的外掛程式範例。
正在尋找第三方清單？請參閱 [社群外掛程式](/zh-Hant/plugins/community)。
需要套件相容性詳細資訊？請參閱 [外掛程式套件](/zh-Hant/plugins/bundles)。

對於相容的套件，請從本機目錄或封存檔進行安裝：

```exec
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

對於 Claude marketplace 安裝，請先列出 marketplace，然後依
marketplace 項目名稱進行安裝：

```exec
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 會從
`~/.claude/plugins/known_marketplaces.json` 解析已知的 Claude marketplace 名稱。您也可以使用 `--marketplace` 傳遞明確的
marketplace 來源。

## 可用的外掛程式 (官方)

### 可安裝的外掛程式

這些會發佈到 npm 並使用 `openclaw plugins install` 安裝：

| 外掛程式        | 套件                   | 文件                                         |
| --------------- | ---------------------- | -------------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh-Hant/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh-Hant/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh-Hant/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/zh-Hant/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh-Hant/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/zh-Hant/plugins/zalouser)   |

截至 2026.1.15，Microsoft Teams 僅支援外掛程式。

封裝版本還包含重量級官方外掛程式的按需安裝中繼資料。目前這包括 WhatsApp 和 `memory-lancedb`：入門、`openclaw channels add`、`openclaw channels login --channel whatsapp`，以及其他通道設定流程會在首次使用時提示安裝，而不是將其完整的執行時樹包含在主 npm tarball 中。

### 隨附的外掛程式

這些隨 OpenClaw 附帶，除非另有說明，否則預設為啟用。

**記憶體：**

- `memory-core` -- 隨附的記憶體搜尋（透過 `plugins.slots.memory` 預設）
- `memory-lancedb` -- 按需安裝的長期記憶體，具備自動回憶/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）

**模型提供者**（全部預設啟用）：

`anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`, `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`, `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`, `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`, `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`

**語音提供者**（預設啟用）：

`elevenlabs`, `microsoft`

**其他隨附項目：**

- `copilot-proxy` -- VS Code Copilot Proxy 橋接器（預設停用）

## 相容套件

OpenClaw 也識別相容的外部套件佈局：

- Codex 風格套件：`.codex-plugin/plugin.json`
- Claude 風格套件：`.claude-plugin/plugin.json` 或沒有清單的預設 Claude
  元件佈局
- Cursor 樣式的套件：`.cursor-plugin/plugin.json`

它們在插件清單中顯示為 `format=bundle`，並在詳細/檢查輸出中帶有子類型
`codex`、`claude` 或 `cursor`。

請參閱 [Plugin bundles](/zh-Hant/plugins/bundles) 以了解確切的偵測規則、對應
行為以及目前的支援矩陣。

## Config

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

- `enabled`：主控開關（預設值：true）
- `allow`：允許清單（選用）
- `deny`：拒絕清單（選用；拒絕優先）
- `load.paths`：額外的插件檔案/目錄
- `slots`：獨佔插槽選擇器，例如 `memory` 和 `contextEngine`
- `entries.<id>`：各別插件開關 + 設定

設定變更**需要重新啟動 gateway**。請參閱
[Configuration reference](/zh-Hant/configuration) 以了解完整的設定架構。

驗證規則（嚴格）：

- `entries`、`allow`、`deny` 或 `slots` 中的未知 plugin id 屬於**錯誤**。
- 未知的 `channels.<id>` 鍵屬於**錯誤**，除非插件清單宣告了
  該頻道 id。
- 原生插件設定是使用嵌入在
  `openclaw.plugin.json` (`configSchema`) 中的 JSON Schema 進行驗證。
- 相容的套件目前不會公開原生 OpenClaw 設定架構。
- 如果停用插件，其設定會被保留，並發出**警告**。

### Disabled vs missing vs invalid

這些狀態有意設計為不同：

- **disabled**：插件存在，但啟用規則將其關閉
- **missing**：設定參照了一個探索時未找到的 plugin id
- **invalid**：插件存在，但其設定不符合宣告的架構

OpenClaw 會保留已停用插件的設定，因此將其重新啟用並不會
造成破壞性改變。

## Discovery and precedence

OpenClaw 會依序掃描：

1. Config paths

- `plugins.load.paths` (檔案或目錄)

2. Workspace extensions

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Global extensions

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 內建擴充功能（隨 OpenClaw 附帶；混合預設開啟/預設關閉）

- 套件安裝中的 `<openclaw>/dist/extensions/*`
- 本地建構取出中的 `<workspace>/dist-runtime/extensions/*`
- 來源/Vitest 工作流程中的 `<workspace>/extensions/*`

許多內建的提供者外掛預設為啟用，因此模型目錄/執行時掛鉤
無需額外設定即可使用。其他外掛仍需透過 `plugins.entries.<id>.enabled` 或
`openclaw plugins enable <id>` 明確啟用。

內建外掛的執行時相依性由每個外掛套件擁有。套件
建構會將選擇加入的內建相依性放置在
`dist/extensions/<id>/node_modules` 下，而不需要在
根套件中建立鏡像副本。非常大的官方外掛可以僅以元資料內建
項目的形式發行，並按需安裝其執行時套件。 npm 成品會 shipped
已建構的 `dist/extensions/*` 樹狀結構；來源 `extensions/*` 目錄則
僅保留在來源取出中。

已安裝的外掛預設為啟用，但也可以用相同的方式停用。

工作區外掛 **預設為停用**，除非您明確啟用它們
或將其加入允許清單。這是刻意為之的：取出的存放庫不應
在無聲無息中變成生產環境閘道程式碼。

如果多個外掛解析到同一個 ID，則上述順序中的第一個匹配
項獲勝，並會忽略優先順序較低的副本。

### 啟用規則

啟用在探索之後解析：

- `plugins.enabled: false` 停用所有外掛
- `plugins.deny` 總是獲勝
- `plugins.entries.<id>.enabled: false` 停用該外掛
- 工作區來源的外掛預設為停用
- 當 `plugins.allow` 非空時，允許清單會限制作用中的集合
- 允許清單是 **以 ID 為基礎**，而不是以來源為基礎
- 內建外掛預設為停用，除非：
  - 內建 ID 位於內建預設開啟集合中，或
  - 您明確啟用它，或
  - 通道設定隱含啟用內建的通道外掛
- 獨佔插槽可以強制啟用該插槽的已選外掛

## 外掛插槽（獨佔類別）

某些外掛類別是 **獨佔的**（一次只能有一個作用中）。使用
`plugins.slots` 來選擇哪個外掛擁有該插槽：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

支援的獨佔插槽：

- `memory`：啟用的記憶體外掛（`"none"` 會停用記憶體外掛）
- `contextEngine`：啟用的情境引擎外掛（`"legacy"` 是內建的預設值）

如果多個外掛宣告了 `kind: "memory"` 或 `kind: "context-engine"`，只有
為該插槽選取的外掛會載入。其他的會被停用並顯示診斷資訊。
請在您的[外掛清單](/zh-Hant/plugins/manifest)中宣告 `kind`。

## 外掛 ID

預設外掛 ID：

- 套件包：`package.json` `name`
- 獨立檔案：檔案基底名稱（`~/.../voice-call.ts` -> `voice-call`）

如果外掛匯出了 `id`，OpenClaw 會使用它，但若其與設定的 ID 不符則會發出警告。

## 檢查

```exec
openclaw plugins inspect openai        # deep detail on one plugin
openclaw plugins inspect openai --json # machine-readable
openclaw plugins list                  # compact inventory
openclaw plugins status                # operational summary
openclaw plugins doctor                # issue-focused diagnostics
```

## CLI

```exec
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

請參閱 [`openclaw plugins` CLI 參考手冊](/zh-Hant/cli/plugins) 以了解每個指令的完整細節
（安裝規則、檢查輸出、市集安裝、解除安裝）。

外掛也可以註冊自己的頂層指令（例如：
`openclaw voicecall`）。

## 外掛 API（概覽）

外掛可以匯出：

- 一個函式：`(api) => { ... }`
- 一個物件：`{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是外掛附加行為的地方。常見的註冊項目包括：

- `registerTool`
- `registerHook`
- 用於類型化生命週期鉤子的 `on(...)`
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

請參閱 [外掛清單](/zh-Hant/plugins/manifest) 以了解清單檔案格式。

## 延伸閱讀

- [外掛架構與內部機制](/zh-Hant/plugins/architecture) -- 能力模型、
  擁有權模型、合約、載入管線、執行時期輔助函式，以及開發者 API
  參考手冊
- [建構擴充功能](/zh-Hant/plugins/building-extensions)
- [外掛程式套件](/zh-Hant/plugins/bundles)
- [外掛程式清單](/zh-Hant/plugins/manifest)
- [外掛程式代理程式工具](/zh-Hant/plugins/agent-tools)
- [功能食譜](/zh-Hant/tools/capability-cookbook)
- [社群外掛程式](/zh-Hant/plugins/community)
