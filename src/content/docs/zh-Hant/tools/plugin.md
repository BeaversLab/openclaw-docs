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

## 外掛程式類型

OpenClaw 辨識兩種外掛程式格式：

| 格式     | 運作方式                                            | 範例                                                   |
| -------- | --------------------------------------------------- | ------------------------------------------------------ |
| **原生** | `openclaw.plugin.json` + 執行時期模組；在程序內執行 | 官方外掛程式、社群 npm 套件                            |
| **捆綁** | Codex/Claude/Cursor 相容佈局；對應至 OpenClaw 功能  | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都會顯示在 `openclaw plugins list` 下。關於捆綁包的詳情，請參閱 [外掛程式捆綁包](/zh-Hant/plugins/bundles)。

如果您正在撰寫原生外掛程式，請從 [建置外掛程式](/zh-Hant/plugins/building-plugins)
以及 [外掛程式 SDK 概觀](/zh-Hant/plugins/sdk-overview) 開始。

## 官方外掛程式

### 可安裝 (npm)

| 外掛程式        | 套件                   | 文件                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh-Hant/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh-Hant/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh-Hant/channels/nostr)             |
| 語音通話        | `@openclaw/voice-call` | [語音通話](/zh-Hant/plugins/voice-call)      |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh-Hant/channels/zalo)               |
| Zalo 個人版     | `@openclaw/zalouser`   | [Zalo 個人版](/zh-Hant/plugins/zalouser)     |

### 核心（隨 OpenClaw 附帶）

<AccordionGroup>
  <Accordion title="模型供應商（預設啟用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶體插件">- `memory-core` — 內建的記憶體搜尋（透過 `plugins.slots.memory` 預設啟用） - `memory-lancedb` — 按需安裝的長期記憶體，具備自動回想/擷取功能（設定 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="語音供應商（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `browser` — 瀏覽器工具的內建瀏覽器插件、`openclaw browser` CLI、`browser.request` 網關方法、瀏覽器執行時間以及預設的瀏覽器控制服務（預設啟用；更換前請先停用）
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器（預設停用）
  </Accordion>
</AccordionGroup>

正在尋找第三方插件嗎？請參閱[社群外掛](/zh-Hant/plugins/community)。

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

| 欄位             | 描述                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主開關（預設：`true`）                           |
| `allow`          | 外掛程式允許清單（選用）                         |
| `deny`           | 外掛程式拒絕清單（選用；拒絕優先）               |
| `load.paths`     | 額外的外掛程式檔案/目錄                          |
| `slots`          | 專屬插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 個別外掛程式開關 + 設定                          |

設定變更**需要重新啟動閘道**。如果 Gateway 在啟用設定監控 + 程序內重啟（預設的 `openclaw gateway` 路徑）的情況下執行，則通常會在設定寫入後自動執行重啟。

<Accordion title="外掛程式狀態：已停用 vs 缺失 vs 無效">- **已停用**：外掛程式存在，但啟用規則將其關閉。設定會予以保留。 - **缺失**：設定參照了一個探索未找到的外掛程式 ID。 - **無效**：外掛程式存在，但其設定不符合宣告的結構描述 (schema)。</Accordion>

## 探索與優先順序

OpenClaw 依照此順序掃描外掛程式（找到第一個符合項即勝出）：

<Steps>
  <Step title="設定路徑">
    `plugins.load.paths` — 明確的檔案或目錄路徑。
  </Step>

  <Step title="工作區擴充功能">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全域擴充功能">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="內建外掛程式">
    隨 OpenClaw 附帶。許多預設為啟用（模型供應商、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛程式
- `plugins.deny` 優先於允許
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛程式
- 工作區來源的外掛程式**預設為停用**（必須明確啟用）
- 內建外掛程式遵循內建的預設啟用集合，除非被覆寫
- 專用插槽可以強制啟用該插槽所選的外掛程式

## 外掛程式插槽 (專用類別)

某些類別是專用的 (一次只能啟用一個)：

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

| 插槽            | 控制項目             | 預設            |
| --------------- | -------------------- | --------------- |
| `memory`        | 啟用的記憶體外掛程式 | `memory-core`   |
| `contextEngine` | 啟用的內容引擎       | `legacy` (內建) |

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

隨附外掛程式隨 OpenClaw 附帶。許多外掛程式預設為啟用狀態 (例如隨附的模型提供者、隨附的語音提供者以及隨附的瀏覽器外掛程式)。其他隨附外掛程式仍需要 `openclaw plugins enable <id>`。

`--force` 會就地覆寫現有已安裝的外掛程式或 hook pack。它不支援 `--link`，後者會重複使用來源路徑，而不是複製到受管理的安裝目標。

`--pin` 僅支援 npm。它不支援 `--marketplace`，因為市集安裝會保留市集來源中繼資料，而不是 npm 規格。

`--dangerously-force-unsafe-install` 是針對內建危險程式碼掃描器誤報的緊急覆寫選項。它允許外掛程式安裝和更新繼續進行，略過內建 `critical` 的發現，但仍不會繞過外掛程式 `before_install` 原則封鎖或掃描失敗封鎖。

此 CLI 旗標僅適用於外掛程式安裝/更新流程。閘道支援的技能相依性安裝會改用相符的 `dangerouslyForceUnsafeInstall` 要求覆寫，而 `openclaw skills install` 則維持為獨立的 ClawHub 技能下載/安裝流程。

相容的套件會參與相同的外掛程式 list/inspect/enable/disable 流程。目前的執行階段支援包括套件技能、Claude 指令技能、Claude `settings.json` 預設值、Claude `.lsp.json` 和宣告資訊清單的 `lspServers` 預設值、Cursor 指令技能，以及相容的 Codex hook 目錄。

`openclaw plugins inspect <id>` 也會回報偵測到的套件功能，以及套件支援外掛程式的支援或不支援 MCP 和 LSP 伺服器項目。

Marketplace 來源可以是來自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名稱、本機 marketplace 根目錄或 `marketplace.json` 路徑、類似 `owner/repo` 的 GitHub 簡寫、GitHub 儲存庫 URL，或是 git URL。對於遠端 marketplace，外掛條目必須保留在複製下來的 marketplace 儲存庫內，並且僅使用相對路徑來源。

請參閱 [`openclaw plugins` CLI 參考文件](/zh-Hant/cli/plugins) 以了解完整細節。

## Plugin API 概覽

原生外掛會匯出一個暴露 `register(api)` 的進入物件。舊版外掛可能仍將 `activate(api)` 作為舊版別名使用，但新外掛應使用 `register`。

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

OpenClaw 會載入進入物件並在外掛啟用期間呼叫 `register(api)`。載入器仍會針對舊版外掛回退至 `activate(api)`，但套件組合外掛和新的外部外掛應將 `register` 視為公開合約。

常見的註冊方法：

| 方法                                    | 註冊內容            |
| --------------------------------------- | ------------------- |
| `registerProvider`                      | 模型提供者 (LLM)    |
| `registerChannel`                       | 聊天頻道            |
| `registerTool`                          | 代理程式工具        |
| `registerHook` / `on(...)`              | 生命週期鉤子        |
| `registerSpeechProvider`                | 文字轉語音 / STT    |
| `registerRealtimeTranscriptionProvider` | 串流 STT            |
| `registerRealtimeVoiceProvider`         | 雙向即時語音        |
| `registerMediaUnderstandingProvider`    | 圖像/音訊分析       |
| `registerImageGenerationProvider`       | 圖像生成            |
| `registerMusicGenerationProvider`       | 音樂生成            |
| `registerVideoGenerationProvider`       | 影片生成            |
| `registerWebFetchProvider`              | Web 擷取/爬取提供者 |
| `registerWebSearchProvider`             | Web 搜尋            |
| `registerHttpRoute`                     | HTTP 端點           |
| `registerCommand` / `registerCli`       | CLI 指令            |
| `registerContextEngine`                 | Context 引擎        |
| `registerService`                       | 背景服務            |

具類型生命週期鉤子的 Hook guard 行為：

- `before_tool_call`：`{ block: true }` 為終止狀態；較低優先級的處理程式會被跳過。
- `before_tool_call`：`{ block: false }` 是無操作（no-op），並不會清除先前的區塊。
- `before_install`：`{ block: true }` 是終結性的；較低優先級的處理程式會被跳過。
- `before_install`：`{ block: false }` 是無操作（no-op），並不會清除先前的區塊。
- `message_sending`：`{ cancel: true }` 是終結性的；較低優先級的處理程式會被跳過。
- `message_sending`：`{ cancel: false }` 是無操作（no-op），並不會清除先前的取消操作。

如需完整的類型化 Hook 行為，請參閱 [SDK 概述](/zh-Hant/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛程式](/zh-Hant/plugins/building-plugins) — 建立您自己的外掛程式
- [外掛程式套件](/zh-Hant/plugins/bundles) — Codex/Claude/Cursor 套件相容性
- [外掛程式資訊清單](/zh-Hant/plugins/manifest) — 資訊清單架構
- [註冊工具](/zh-Hant/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增代理程式工具
- [外掛程式內部機制](/zh-Hant/plugins/architecture) — 功能模型與載入管線
- [社群外掛程式](/zh-Hant/plugins/community) — 第三方清單
