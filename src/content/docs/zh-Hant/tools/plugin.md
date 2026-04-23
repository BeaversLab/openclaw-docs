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

兩者都會顯示在 `openclaw plugins list` 下方。請參閱 [Plugin Bundles](/zh-Hant/plugins/bundles) 以了解套件組合的詳細資訊。

如果您正在撰寫原生外掛程式，請從 [Building Plugins](/zh-Hant/plugins/building-plugins)
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

正在尋找協力廠商外掛嗎？請參閱 [社群外掛](/zh-Hant/plugins/community)。

## 設定

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

  <Step title="Workspace extensions">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` and `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global extensions">
    `~/.openclaw/<plugin-root>/*.ts` and `~/.openclaw/<plugin-root>/*/index.ts`.
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
openclaw plugins update <id>             # update one plugin
openclaw plugins update <id> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

隨附的外掛隨 OpenClaw 一起出廠。許多外掛預設為啟用狀態（例如隨附的模型提供者、隨附的語音提供者以及隨附的瀏覽器外掛）。其他隨附的外掛仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的外掛或 Hook 套件。它不支援與 `--link` 搭配使用，後者會重複使用來源路徑，而不是複製到受管理的安裝目標。

`--pin` 僅適用於 npm。它不支援與 `--marketplace` 搭配使用，因為市集安裝會保留市集來源中繼資料，而非 npm 規格。

`--dangerously-force-unsafe-install` 是針對內建危險代碼掃描器誤報的緊急覆寫機制。它允許外掛安裝和外掛更新繼續進行，忽略內建 `critical` 的發現，但仍不會繞過外掛 `before_install` 政策封鎖或掃描失敗的封鎖。

此 CLI 旗標僅適用於外掛安裝/更新流程。Gateway 支援的技能依賴安裝則改用相符的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為個別的 ClawHub 技能下載/安裝流程。

相容的套件會參與相同的外掛列表/檢查/啟用/停用流程。目前的執行階段支援包含套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和資訊清單宣告的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex Hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及套件支援外掛的支援或不支援的 MCP 和 LSP 伺服器項目。

Marketplace sources can be a Claude known-marketplace name from
`~/.claude/plugins/known_marketplaces.json`, a local marketplace root or
`marketplace.json` path, a GitHub shorthand like `owner/repo`, a GitHub repo
URL, or a git URL. For remote marketplaces, plugin entries must stay inside the
cloned marketplace repo and use relative path sources only.

See [`openclaw plugins` CLI reference](/zh-Hant/cli/plugins) for full details.

## Plugin API overview

Native plugins export an entry object that exposes `register(api)`. Older
plugins may still use `activate(api)` as a legacy alias, but new plugins should
use `register`.

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

OpenClaw loads the entry object and calls `register(api)` during plugin
activation. The loader still falls back to `activate(api)` for older plugins,
but bundled plugins and new external plugins should treat `register` as the
public contract.

Common registration methods:

| Method                                  | What it registers           |
| --------------------------------------- | --------------------------- |
| `registerProvider`                      | Model provider (LLM)        |
| `registerChannel`                       | Chat channel                |
| `registerTool`                          | Agent tool                  |
| `registerHook` / `on(...)`              | Lifecycle hooks             |
| `registerSpeechProvider`                | Text-to-speech / STT        |
| `registerRealtimeTranscriptionProvider` | Streaming STT               |
| `registerRealtimeVoiceProvider`         | Duplex realtime voice       |
| `registerMediaUnderstandingProvider`    | Image/audio analysis        |
| `registerImageGenerationProvider`       | Image generation            |
| `registerMusicGenerationProvider`       | Music generation            |
| `registerVideoGenerationProvider`       | Video generation            |
| `registerWebFetchProvider`              | Web fetch / scrape provider |
| `registerWebSearchProvider`             | Web search                  |
| `registerHttpRoute`                     | HTTP endpoint               |
| `registerCommand` / `registerCli`       | CLI commands                |
| `registerContextEngine`                 | Context engine              |
| `registerService`                       | Background service          |

Hook guard behavior for typed lifecycle hooks:

- `before_tool_call`: `{ block: true }` is terminal; lower-priority handlers are skipped.
- `before_tool_call`: `{ block: false }` 是一個空操作，不會清除先前的區塊。
- `before_install`: `{ block: true }` 是終止的；較低優先級的處理程序將被跳過。
- `before_install`: `{ block: false }` 是一個空操作，不會清除先前的區塊。
- `message_sending`: `{ cancel: true }` 是終止的；較低優先級的處理程序將被跳過。
- `message_sending`: `{ cancel: false }` 是一個空操作，不會清除先前的取消。

有關完整的類型化掛鉤行為，請參閱 [SDK 概述](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 建立您自己的外掛程式
- [外掛程式套件](/zh-Hant/plugins/bundles) — Codex/Claude/Cursor 套件相容性
- [外掛程式清單](/zh-Hant/plugins/manifest) — 清單架構
- [註冊工具](/zh-Hant/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增代理程式工具
- [外掛程式內部機制](/zh-Hant/plugins/architecture) — 功能模型和載入管線
- [社群外掛程式](/zh-Hant/plugins/community) — 第三方列表
