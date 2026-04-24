---
summary: "安裝、設定和管理 OpenClaw 外掛程式"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "外掛程式"
sidebarTitle: "安裝與設定"
---

# 外掛程式

外掛程式透過新功能擴充 OpenClaw：管道、模型提供者、
工具、技能、語音、即時轉錄、即時語音、
媒體理解、影像生成、影片生成、網路擷取、網路
搜尋等等。部分外掛程式是**核心**（隨 OpenClaw 附帶），其他則是
**外部**（由社群在 npm 上發布）。

## 快速入門

<Steps>
  <Step title="查看已載入的內容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安裝外掛程式">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重新啟動閘道">
    ```bash
    openclaw gateway restart
    ```

    然後在您的設定檔中的 `plugins.entries.\<id\>.config` 下進行設定。

  </Step>
</Steps>

如果您偏好在聊天中原生控制，請啟用 `commands.plugins: true` 並使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安裝路徑使用與 CLI 相同的解析器：本機路徑/壓縮檔、明確的
`clawhub:<pkg>`，或裸套件規格（優先使用 ClawHub，然後後備至 npm）。

如果設定無效，安裝通常會失敗並關閉，並指引您查看
`openclaw doctor --fix`。唯一的恢復例外是針對選擇加入
`openclaw.install.allowInvalidConfigRecovery` 之外掛程式的狹隘捆綁外掛程式重新安裝路徑。

封裝的 OpenClaw 安裝程式並不會急切地安裝每個捆綁外掛程式的執行時依賴樹。當來自外掛程式設定、舊版頻道設定或預設啟用清單的捆綁 OpenClaw 擁有之外掛程式啟用時，啟動過程只會在匯入該外掛程式之前修復其宣告的執行時依賴。外部外掛程式和自訂載入路徑仍必須透過 `openclaw plugins install` 進行安裝。

## 外掛程式類型

OpenClaw 辨識兩種外掛程式格式：

| 格式         | 運作方式                                                 | 範例                                                   |
| ------------ | -------------------------------------------------------- | ------------------------------------------------------ |
| **原生**     | `openclaw.plugin.json` + runtime 模組；於程序內執行      | 官方外掛程式、社群 npm 套件                            |
| **套件組合** | Codex/Claude/Cursor 相容的版面配置；對應至 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都會顯示在 `openclaw plugins list` 之下。請參閱 [Plugin Bundles](/zh-Hant/plugins/bundles) 以了解套件的詳細資訊。

如果您正在編寫原生插件，請從 [Building Plugins](/zh-Hant/plugins/building-plugins)
和 [Plugin SDK Overview](/zh-Hant/plugins/sdk-overview) 開始。

## 官方外掛程式

### 可安裝

| 外掛程式        | 套件                   | 文件                                    |
| --------------- | ---------------------- | --------------------------------------- |
| 矩陣            | `@openclaw/matrix`     | [Matrix](/zh-Hant/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh-Hant/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh-Hant/channels/nostr)             |
| 語音通話        | `@openclaw/voice-call` | [Voice Call](/zh-Hant/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh-Hant/channels/zalo)               |
| Zalo 個人版     | `@openclaw/zalouser`   | [Zalo Personal](/zh-Hant/plugins/zalouser)   |

### 核心 (隨 OpenClaw 附帶)

<AccordionGroup>
  <Accordion title="模型提供者（預設啟用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶外掛">- `memory-core` — 內建記憶搜尋（透過 `plugins.slots.memory` 預設） - `memory-lancedb` — 按需安裝的長期記憶，具備自動召回/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="語音提供者（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 用於瀏覽器工具的內建瀏覽器外掛、`openclaw browser` CLI、`browser.request` 閘道方法、瀏覽器執行環境以及預設瀏覽器控制服務（預設啟用；替換前請停用）
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器（預設停用）
  </Accordion>
</AccordionGroup>

尋找第三方插件嗎？請參閱 [Community Plugins](/zh-Hant/plugins/community)。

## 設定

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 欄位             | 描述                                                      |
| ---------------- | --------------------------------------------------------- |
| `enabled`        | 主開關（預設值：`true`）                                  |
| `allow`          | Plugin allowlist (optional)                               |
| `deny`           | Plugin denylist (optional; deny wins)                     |
| `load.paths`     | Extra plugin files/directories                            |
| `slots`          | Exclusive slot selectors (e.g. `memory`, `contextEngine`) |
| `entries.\<id\>` | Per-plugin toggles + config                               |

Config changes **require a gateway restart**. If the Gateway is running with config
watch + in-process restart enabled (the default `openclaw gateway` path), that
restart is usually performed automatically a moment after the config write lands.

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**: plugin exists but enablement rules turned it off. Config is preserved. - **Missing**: config references a plugin id that discovery did not find. - **Invalid**: plugin exists but its config does not match the declared schema.</Accordion>

## Discovery and precedence

OpenClaw scans for plugins in this order (first match wins):

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — explicit file or directory paths.
  </Step>

  <Step title="Workspace 插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全域插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    Shipped with OpenClaw. Many are enabled by default (model providers, speech).
    Others require explicit enablement.
  </Step>
</Steps>

### Enablement rules

- `plugins.enabled: false` disables all plugins
- `plugins.deny` always wins over allow
- `plugins.entries.\<id\>.enabled: false` disables that plugin
- Workspace-origin plugins are **disabled by default** (must be explicitly enabled)
- Bundled plugins follow the built-in default-on set unless overridden
- Exclusive slots can force-enable the selected plugin for that slot

## Plugin slots (exclusive categories)

某些類別是互斥的（一次只能啟用一個）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| 插槽            | 控制對象         | 預設值          |
| --------------- | ---------------- | --------------- |
| `memory`        | 啟用的記憶體外掛 | `memory-core`   |
| `contextEngine` | 啟用的情境引擎   | `legacy` (內建) |

## CLI 參考

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only loaded plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

隨附的外掛隨 OpenClaw 一起出廠。許多外掛預設為啟用狀態（例如隨附的模型提供者、隨附的語音提供者以及隨附的瀏覽器外掛）。其他隨附的外掛仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的插件或 hook 套件。請使用
`openclaw plugins update <id-or-npm-spec>` 來進行已追蹤 npm 插件的例行升級。
`--link` 不支援此功能，因為它會重複使用來源路徑，
而不是複製到受管理的安裝目標。

`openclaw plugins update <id-or-npm-spec>` 適用於已追蹤的安裝。傳遞帶有
dist-tag 或確切版本的 npm 套件規格，會將套件名稱解析回已追蹤的插件記錄，並記錄新規格以供未來更新。
若傳遞不帶版本的套件名稱，會將確切釘選的安裝移回
登錄檔的預設發行版本。如果已安裝的 npm 插件已符合
解析後的版本和記錄的構件身分，OpenClaw 將會跳過更新，
而不下載、重新安裝或重寫設定。

`--pin` 僅適用於 npm。它不支援與 `--marketplace` 搭配使用，因為
marketplace 安裝會保存 marketplace 來源中繼資料，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是針對內建危險代碼掃描器誤報的緊急覆寫機制。它允許外掛安裝和更新在遇到內建 `critical` 發現時繼續進行，但仍然無法繞過外掛 `before_install` 政策封鎖或掃描失敗封鎖。

此 CLI 標誌僅適用於外掛安裝/更新流程。由 Gateway 支援的技能依賴安裝改用匹配的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則是單獨的 ClawHub 技能下載/安裝流程。

相容的套件參與相同的外掛列表/檢查/啟用/停用流程。目前的執行時期支援包括套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和清單宣告的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及由套件支援的外掛所支援或不支援的 MCP 和 LSP 伺服器項目。

Marketplace 來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市場名稱、本機 marketplace 根目錄或 `marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub 存儲庫 URL 或 git URL。對於遠端 marketplace，外掛項目必須保留在複製的 marketplace 存儲庫內，並且僅使用相對路徑來源。

請參閱 [`openclaw plugins` CLI 參考資料](/zh-Hant/cli/plugins) 以了解完整細節。

## 外掛 API 概覽

原生外掛會匯出一個公開 `register(api)` 的進入點物件。較舊的外掛可能仍會將 `activate(api)` 作為傳統別名使用，但新外掛應使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 會載入進入點物件並在外掛啟用期間呼叫 `register(api)`。載入器對於較舊的外掛仍會回退到 `activate(api)`，但套件外掛和新的外部外掛應將 `register` 視為公開契約。

常見的註冊方法：

| 方法                                    | 註冊內容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供者 (LLM)      |
| `registerChannel`                       | 聊天頻道              |
| `registerTool`                          | 代理工具              |
| `registerHook` / `on(...)`              | 生命週期鉤子          |
| `registerSpeechProvider`                | 文字轉語音 / STT      |
| `registerRealtimeTranscriptionProvider` | 串流 STT              |
| `registerRealtimeVoiceProvider`         | 雙工即時語音          |
| `registerMediaUnderstandingProvider`    | 影像/音訊分析         |
| `registerImageGenerationProvider`       | 影像生成              |
| `registerMusicGenerationProvider`       | 音樂生成              |
| `registerVideoGenerationProvider`       | 影片生成              |
| `registerWebFetchProvider`              | 網頁擷取 / 爬取提供者 |
| `registerWebSearchProvider`             | 網路搜尋              |
| `registerHttpRoute`                     | HTTP 端點             |
| `registerCommand` / `registerCli`       | CLI 指令              |
| `registerContextEngine`                 | 語境引擎              |
| `registerService`                       | 背景服務              |

型別化生命週期鉤子的鉤子防護行為：

- `before_tool_call`：`{ block: true }` 為終止指令；較低優先級的處理程序將被跳過。
- `before_tool_call`：`{ block: false }` 為無操作指令，且不會清除先前的阻擋。
- `before_install`：`{ block: true }` 為終止指令；較低優先級的處理程序將被跳過。
- `before_install`：`{ block: false }` 為無操作指令，且不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 為終止指令；較低優先級的處理程序將被跳過。
- `message_sending`：`{ cancel: false }` 為無操作指令，且不會清除先前的取消。

有關完整的型別化鉤子行為，請參閱 [SDK 概述](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛](/zh-Hant/plugins/building-plugins) — 建立您自己的外掛
- [外掛套件](/zh-Hant/plugins/bundles) — Codex/Claude/Cursor 套件相容性
- [外掛清單](/zh-Hant/plugins/manifest) — 清單架構
- [註冊工具](/zh-Hant/plugins/building-plugins#registering-agent-tools) — 在外掛中新增代理工具
- [Plugin Internals](/zh-Hant/plugins/architecture) — 能力模型與載入管線
- [Community Plugins](/zh-Hant/plugins/community) — 第三方清單
