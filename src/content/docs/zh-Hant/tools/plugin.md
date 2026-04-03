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

外掛程式透過新功能擴充 OpenClaw：頻道、模型提供者、工具、技能、語音、圖像生成等。部分外掛程式為**核心**（隨 OpenClaw 附帶），其他則為**外部**（由社群發布於 npm）。

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

## 外掛程式類型

OpenClaw 可識別兩種外掛程式格式：

| 格式         | 運作方式                                             | 範例                                                   |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------ |
| **原生**     | `openclaw.plugin.json` + 執行時間模組；於進程內執行  | 官方外掛程式、社群 npm 套件                            |
| **套件組合** | Codex/Claude/Cursor 相容的佈局；對應至 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

兩者都顯示在 `openclaw plugins list` 下。有關套件的詳細資訊，請參閱 [Plugin Bundles](/en/plugins/bundles)。

如果您正在編寫原生插件，請從 [Building Plugins](/en/plugins/building-plugins)
和 [Plugin SDK Overview](/en/plugins/sdk-overview) 開始。

## 官方外掛程式

### 可安裝

| 外掛程式        | 套件                   | 文件                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/en/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/en/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/en/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/en/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/en/channels/zalo)               |
| Zalo 個人版     | `@openclaw/zalouser`   | [Zalo Personal](/en/plugins/zalouser)   |

### 核心 (隨 OpenClaw 附帶)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶體外掛">- `memory-core` — 內建記憶體搜尋（預設透過 `plugins.slots.memory`） - `memory-lancedb` — 按需安裝的長期記憶體，具備自動回憶/捕獲功能（設定 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="語音提供商（預設啟用）">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Other">
    - `browser` — 瀏覽器工具的內建瀏覽器插件、`openclaw browser` CLI、`browser.request` 網關方法、瀏覽器執行時和預設瀏覽器控制服務（預設啟用；更換前請先停用）
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器（預設停用）
  </Accordion>
</AccordionGroup>

尋找第三方插件？請參閱 [Community Plugins](/en/plugins/community)。

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

| 欄位             | 說明                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主切換開關（預設：`true`）                       |
| `allow`          | 外掛程式允許清單 (選用)                          |
| `deny`           | 外掛程式拒絕清單 (選用；拒絕優先)                |
| `load.paths`     | 額外的外掛程式檔案/目錄                          |
| `slots`          | 專屬插槽選擇器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 各外掛程式開關 + 設定                            |

設定變更**需要重新啟動閘道**。如果 Gateway 在啟用設定監看 + 程序內重新啟動（預設的 `openclaw gateway` 路徑）的情況下運行，該重新啟動通常會在設定寫入完成後自動執行。

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**：外掛程式存在但啟用規則將其關閉。設定會被保留。 - **Missing**：設定參照了一個探索未找到的外掛程式 ID。 - **Invalid**：外掛程式存在，但其設定不符合宣告的結構描述。</Accordion>

## 探索與優先順序

OpenClaw 會依照以下順序掃描外掛程式（符合者優先）：

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

  <Step title="內建外掛程式">
    隨 OpenClaw 附帶。許多外掛程式預設為啟用（模型提供者、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

### 啟用規則

- `plugins.enabled: false` 停用所有外掛
- `plugins.deny` 優先於 allow
- `plugins.entries.\<id\>.enabled: false` 停用該外掛
- 來自工作區的外掛程式預設為**已停用**（必須明確啟用）
- 內建外掛程式遵循內建的預設啟用集合，除非被覆寫
- 獨佔插槽可以強制啟用該插槽的選取外掛程式

## 外掛程式插槽（獨佔類別）

某些類別是獨佔的（一次只能有一個啟用）：

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

| 插槽            | 控制內容             | 預設值          |
| --------------- | -------------------- | --------------- |
| `memory`        | 啟用的記憶體外掛程式 | `memory-core`   |
| `contextEngine` | 啟用的情境引擎       | `legacy` (內建) |

## CLI 參考資料

```bash
openclaw plugins list                    # compact inventory
openclaw plugins inspect <id>            # deep detail
openclaw plugins inspect <id> --json     # machine-readable
openclaw plugins status                  # operational summary
openclaw plugins doctor                  # diagnostics

openclaw plugins install <package>        # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>   # install from ClawHub only
openclaw plugins install <path>          # install from local path
openclaw plugins install -l <path>       # link (no copy) for dev
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update --all            # update all

openclaw plugins enable <id>
openclaw plugins disable <id>
```

`--dangerously-force-unsafe-install` 是針對內建危險代碼掃描器誤報的緊急覆蓋選項。它允許安裝繼續進行，忽略內建的 `critical` 發現結果，但仍不會繞過插件 `before_install` 策略封鎖或掃描失敗封鎖。

此 CLI 標誌僅適用於插件安裝。由 Gateway 支援的技能相依性安裝則改用相符的 `dangerouslyForceUnsafeInstall` 請求覆蓋選項，而 `openclaw skills install` 則仍是獨立的 ClawHub 技能下載/安裝流程。

有關完整詳情，請參閱 [`openclaw plugins` CLI reference](/en/cli/plugins)。

## Plugin API 概覽

插件會匯出一個函式或一個具有 `register(api)` 的物件：

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

常見註冊方法：

| 方法                                 | 註冊內容         |
| ------------------------------------ | ---------------- |
| `registerProvider`                   | 模型提供者 (LLM) |
| `registerChannel`                    | 聊天頻道         |
| `registerTool`                       | 代理工具         |
| `registerHook` / `on(...)`           | 生命週期鉤子     |
| `registerSpeechProvider`             | 文字轉語音 / STT |
| `registerMediaUnderstandingProvider` | 影像/音訊分析    |
| `registerImageGenerationProvider`    | 影像生成         |
| `registerWebSearchProvider`          | 網路搜尋         |
| `registerHttpRoute`                  | HTTP 端點        |
| `registerCommand` / `registerCli`    | CLI 指令         |
| `registerContextEngine`              | 脈絡引擎         |
| `registerService`                    | 背景服務         |

型別化生命週期掛鉤的掛鉤守衛行為：

- `before_tool_call`：`{ block: true }` 為終止狀態；將跳過較低優先級的處理程式。
- `before_tool_call`：`{ block: false }` 為無操作，並不會清除先前的阻擋。
- `before_install`：`{ block: true }` 為終止狀態；將跳過較低優先級的處理程式。
- `before_install`：`{ block: false }` 為無操作，並不會清除先前的阻擋。
- `message_sending`：`{ cancel: true }` 為終止狀態；將跳過較低優先級的處理程式。
- `message_sending`：`{ cancel: false }` 為無操作，並不會清除先前的取消。

如需完整的型別化掛鉤行為，請參閱 [SDK 概觀](/en/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [建置外掛程式](/en/plugins/building-plugins) — 建立您自己的外掛程式
- [外掛程式套件](/en/plugins/bundles) — Codex/Claude/Cursor 套件相容性
- [外掛程式清單](/en/plugins/manifest) — 清單架構
- [註冊工具](/en/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增代理程式工具
- [外掛程式內部](/en/plugins/architecture) — 功能模型與載入管線
- [社群外掛程式](/en/plugins/community) — 第三方列表
