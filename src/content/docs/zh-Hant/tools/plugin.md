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
  <Step title="See what is loaded">
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

    然後在設定檔中的 `plugins.entries.\<id\>.config` 下進行設定。

  </Step>
</Steps>

如果您偏好聊天原生的控制方式，請啟用 `commands.plugins: true` 並使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安裝路徑使用與 CLI 相同的解析器：本機路徑/封存、明確的 `clawhub:<pkg>`，或純套件規格（優先 ClawHub，其次為 npm 後備）。

如果設定無效，安裝通常會安全失敗並指引您至
`openclaw doctor --fix`。唯一的恢復例外是針對選擇加入
`openclaw.install.allowInvalidConfigRecovery` 的外掛程式所採取的狹隘打包外掛程式
重新安裝路徑。

## 外掛程式類型

OpenClaw 辨識兩種外掛程式格式：

| 格式     | 運作方式                                           | 範例                                                   |
| -------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生** | `openclaw.plugin.json` + 運行時模組；在進程內執行  | 官方外掛程式、社群 npm 套件                            |
| **套件** | Codex/Claude/Cursor 相容佈局；對應至 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都會出現在 `openclaw plugins list` 下。有關套件的詳細資訊，請參閱 [外掛程式套件](/en/plugins/bundles)。

如果您正在編寫原生外掛程式，請從 [建構外掛程式](/en/plugins/building-plugins)
和 [外掛程式 SDK 概覽](/en/plugins/sdk-overview) 開始。

## 官方外掛程式

### 可安裝（npm）

| 外掛程式        | 套件                   | 文件                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/en/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/en/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/en/channels/nostr)             |
| 語音通話        | `@openclaw/voice-call` | [語音通話](/en/plugins/voice-call)      |
| Zalo            | `@openclaw/zalo`       | [Zalo](/en/channels/zalo)               |
| Zalo 個人版     | `@openclaw/zalouser`   | [Zalo 個人版](/en/plugins/zalouser)     |

### 核心（隨 OpenClaw 附帶）

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶體外掛程式">- `memory-core` — 捆綁的記憶體搜尋（透過 `plugins.slots.memory` 預設啟用） - `memory-lancedb` — 按需安裝的長期記憶體，具備自動回想/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="語音提供者（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 瀏覽器工具的捆綁瀏覽器外掛程式，`openclaw browser` CLI，`browser.request` 閘道方法，瀏覽器執行環境，以及預設瀏覽器控制服務（預設啟用；替換前請先停用）
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器（預設停用）
  </Accordion>
</AccordionGroup>

尋找第三方外掛程式？請參閱 [社群外掛程式](/en/plugins/community)。

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

| 欄位             | 描述                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主開關（預設：`true`）                           |
| `allow`          | 外掛程式允許清單（選用）                         |
| `deny`           | 外掛程式拒絕清單（選用；拒絕優先）               |
| `load.paths`     | 額外的外掛程式檔案/目錄                          |
| `slots`          | 獨佔插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 各外掛程式的開關 + 組態                          |

組態變更**需要重新啟動閘道**。如果閘道是以組態監看 + 程序內重新啟動執行的（預設 `openclaw gateway` 路徑），該重新啟動通常會在組態寫入後自動執行。

<Accordion title="外掛程式狀態：已停用 vs 遺失 vs 無效">- **Disabled（已停用）**：外掛程式存在，但啟用規則將其關閉。組態會保留。 - **Missing（遺失）**：組態參照了一個探索程序未找到的外掛程式 ID。 - **Invalid（無效）**：外掛程式存在，但其組態不符合宣告的架構。</Accordion>

## 發現與優先順序

OpenClaw 會依照以下順序掃描外掛（找到第一個符合項目即止）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — 明確的檔案或目錄路徑。
  </Step>

  <Step title="Workspace extensions">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Global extensions">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="Bundled plugins">
    隨 OpenClaw 附帶。許多預設為啟用（模型提供者、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛
- `plugins.deny` 的優先順序總是高於允許
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛
- 工作區來源的外掛**預設為停用**（必須明確啟用）
- 隨附外掛遵循內建的預設開啟集合，除非被覆寫
- 專屬插槽可以強制啟用該插槽選定的外掛

## 外掛插槽（專屬類別）

某些類別是專屬的（一次只能有一個啟用）：

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

| 插槽            | 控制內容           | 預設            |
| --------------- | ------------------ | --------------- |
| `memory`        | 使用中的記憶體外掛 | `memory-core`   |
| `contextEngine` | 使用中的情境引擎   | `legacy` (內建) |

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

隨附外掛隨 OpenClaw 附帶。許多預設為啟用（例如
隨附的模型提供者、隨附的語音提供者，以及隨附的瀏覽器
外掛）。其他隨附外掛仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的外掛或 hook pack。
它不支援 `--link`，因為該選項會重複使用來源路徑，而不是
複製到受管理的安裝目標。

`--pin` 僅適用於 npm。它不支援 `--marketplace`，因為
marketplace 安裝會保留 marketplace 的來源中繼資料，而非 npm 規格。

`--dangerously-force-unsafe-install` 是一個緊急覆寫機制，用於解決內建危險代碼掃描器的誤報。它允許插件安裝和更新繼續進行，儘管內建的 `critical` 發現了問題，但它仍然無法繞過插件 `before_install` 策略封鎖或掃描失敗封鎖。

此 CLI 標誌僅適用於插件安裝/更新流程。由 Gateway 支援的技能依賴安裝改為使用匹配的 `dangerouslyForceUnsafeInstall` 請求覆寫，而 `openclaw skills install` 則維持為單獨的 ClawHub 技能下載/安裝流程。

相容的套件參與相同的插件列表/檢查/啟用/停用流程。目前的運行時支援包括套件技能、Claude command-skills、Claude `settings.json` 預設值、Claude `.lsp.json` 和清單宣告的 `lspServers` 預設值、Cursor command-skills，以及相容的 Codex hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及套件支援插件的支援或不支援的 MCP 和 LSP 伺服器項目。

Marketplace 來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱、本地 marketplace 根目錄或 `marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub repo URL，或 git URL。對於遠端 marketplace，插件項目必須保留在複製的 marketplace repo 內，並且僅使用相對路徑來源。

有關完整細節，請參閱 [`openclaw plugins` CLI 參考](/en/cli/plugins)。

## Plugin API 概覽

原生插件會匯出一個公開 `register(api)` 的進入物件。較舊的插件可能仍將 `activate(api)` 作為舊版別名使用，但新插件應使用 `register`。

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

OpenClaw 會載入進入物件，並在插件啟用期間呼叫 `register(api)`。載入器仍然會針對舊插件回退到 `activate(api)`，但套件插件和新的外部插件應將 `register` 視為公開合約。

常見的註冊方法：

| 方法                                    | 註冊內容              |
| --------------------------------------- | --------------------- |
| `registerProvider`                      | 模型提供者 (LLM)      |
| `registerChannel`                       | 聊天頻道              |
| `registerTool`                          | 代理工具              |
| `registerHook` / `on(...)`              | 生命週期鉤子          |
| `registerSpeechProvider`                | 文字轉語音 / STT      |
| `registerRealtimeTranscriptionProvider` | 串流 STT              |
| `registerRealtimeVoiceProvider`         | 雙向即時語音          |
| `registerMediaUnderstandingProvider`    | 影像/音訊分析         |
| `registerImageGenerationProvider`       | 影像生成              |
| `registerMusicGenerationProvider`       | 音樂生成              |
| `registerVideoGenerationProvider`       | 影片生成              |
| `registerWebFetchProvider`              | Web 抓取 / 擷取提供者 |
| `registerWebSearchProvider`             | 網路搜尋              |
| `registerHttpRoute`                     | HTTP 端點             |
| `registerCommand` / `registerCli`       | CLI 指令              |
| `registerContextEngine`                 | 情境引擎              |
| `registerService`                       | 背景服務              |

類型化生命週期鉤子的 Hook guard 行為：

- `before_tool_call`：`{ block: true }` 是終端操作；較低優先級的處理程序將被跳過。
- `before_tool_call`：`{ block: false }` 是無操作，且不會清除先前的區塊。
- `before_install`：`{ block: true }` 是終端操作；較低優先級的處理程序將被跳過。
- `before_install`：`{ block: false }` 是無操作，且不會清除先前的區塊。
- `message_sending`：`{ cancel: true }` 是終端操作；較低優先級的處理程序將被跳過。
- `message_sending`：`{ cancel: false }` 是無操作，且不會清除先前的取消操作。

如需完整的類型化 Hook 行為，請參閱 [SDK Overview](/en/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [Building Plugins](/en/plugins/building-plugins) — 建立您自己的外掛程式
- [Plugin Bundles](/en/plugins/bundles) — Codex/Claude/Cursor bundle 相容性
- [Plugin Manifest](/en/plugins/manifest) — manifest schema
- [Registering Tools](/en/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增代理工具
- [Plugin Internals](/en/plugins/architecture) — 能力模型與載入管道
- [Community Plugins](/en/plugins/community) — 第三方清單
