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

兩者皆顯示於 `openclaw plugins list` 下。詳見 [Plugin Bundles](/en/plugins/bundles) 以了解套件組合詳情。

如果您正在撰寫原生外掛程式，請從 [Building Plugins](/en/plugins/building-plugins)
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
| Zalo 個人版     | `@openclaw/zalouser`   | [Zalo 個人版](/en/plugins/zalouser)     |

### 核心 (隨 OpenClaw 附帶)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="記憶體外掛程式">- `memory-core` — 內建的記憶體搜尋 (預設透過 `plugins.slots.memory`) - `memory-lancedb` — 按需安裝的長期記憶體，具備自動回憶/擷取功能 (設定 `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="語音提供者 (預設啟用)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="其他">
    - `copilot-proxy` — VS Code Copilot Proxy 橋接器 (預設停用)
  </Accordion>
</AccordionGroup>

正在尋找第三方外掛程式？請參閱 [社群外掛程式](/en/plugins/community)。

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

| 欄位             | 說明                                            |
| ---------------- | ----------------------------------------------- |
| `enabled`        | 主開關 (預設：`true`)                           |
| `allow`          | 外掛程式允許清單 (選用)                         |
| `deny`           | 外掛程式拒絕清單 (選用；拒絕優先)               |
| `load.paths`     | 額外的外掛程式檔案/目錄                         |
| `slots`          | 專屬插槽選擇器 (例如 `memory`, `contextEngine`) |
| `entries.\<id\>` | 各外掛程式開關 + 設定                           |

設定變更**需要重新啟動閘道**。如果閘道以設定監看 + 內程序重新啟動 (預設的 `openclaw gateway` 路徑) 執行，則通常會在寫入設定後自動執行重新啟動。

<Accordion title="外掛程式狀態：已停用 vs 遺失 vs 無效">- **已停用**：外掛程式存在，但啟用規則將其關閉。設定會被保留。 - **遺失**：設定參照了一個探索未找到的外掛程式 ID。 - **無效**：外掛程式存在，但其設定不符合宣告的架構。</Accordion>

## 探索與優先順序

OpenClaw 會依照以下順序掃描外掛程式（符合者優先）：

<Steps>
  <Step title="設定路徑">
    `plugins.load.paths` — 明確的檔案或目錄路徑。
  </Step>

  <Step title="工作區擴充功能">
    `\<workspace\>/.openclaw/extensions/*.ts` 和 `\<workspace\>/.openclaw/extensions/*/index.ts`。
  </Step>

<Step title="全域擴充功能">`~/.openclaw/extensions/*.ts` 和 `~/.openclaw/extensions/*/index.ts`。</Step>

  <Step title="內建外掛程式">
    隨 OpenClaw 附帶。許多外掛程式預設為啟用（模型提供者、語音）。
    其他則需要明確啟用。
  </Step>
</Steps>

### 啟用規則

- `plugins.enabled: false` 會停用所有外掛程式
- `plugins.deny` 的優先順序永遠高於允許
- `plugins.entries.\<id\>.enabled: false` 會停用該外掛程式
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
openclaw plugins update <id>             # update one plugin
openclaw plugins update --all            # update all

openclaw plugins enable <id>
openclaw plugins disable <id>
```

請參閱 [`openclaw plugins` CLI 參考資料](/en/cli/plugins) 以了解完整細節。

## 外掛程式 API 概觀

外掛程式會匯出一個函式或一個帶有 `register(api)` 的物件：

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

常見的註冊方法：

| 方法                                 | 註冊內容         |
| ------------------------------------ | ---------------- |
| `registerProvider`                   | 模型提供者 (LLM) |
| `registerChannel`                    | 聊天頻道         |
| `registerTool`                       | 代理程式工具     |
| `registerHook` / `on(...)`           | 生命週期掛鉤     |
| `registerSpeechProvider`             | 文字轉語音 / STT |
| `registerMediaUnderstandingProvider` | 影像/音訊分析    |
| `registerImageGenerationProvider`    | 影像生成         |
| `registerWebSearchProvider`          | 網路搜尋         |
| `registerHttpRoute`                  | HTTP 端點        |
| `registerCommand` / `registerCli`    | CLI 命令         |
| `registerContextEngine`              | Context 引擎     |
| `registerService`                    | 背景服務         |

類型化生命週期 Hook 的 Hook 保衛行為：

- `before_tool_call`：`{ block: true }` 為終止狀態；將跳過優先級較低的處理程序。
- `before_tool_call`：`{ block: false }` 為無操作，且不會清除先前的封鎖。
- `message_sending`：`{ cancel: true }` 為終止狀態；將跳過優先級較低的處理程序。
- `message_sending`：`{ cancel: false }` 為無操作，且不會清除先前的取消。

有關完整的類型化 Hook 行為，請參閱 [SDK Overview](/en/plugins/sdk-overview#hook-decision-semantics)。

## 相關

- [Building Plugins](/en/plugins/building-plugins) — 建立您的外掛程式
- [Plugin Bundles](/en/plugins/bundles) — Codex/Claude/Cursor 套件組合相容性
- [Plugin Manifest](/en/plugins/manifest) — 宣告清單架構
- [Registering Tools](/en/plugins/building-plugins#registering-agent-tools) — 在外掛程式中新增 Agent 工具
- [Plugin Internals](/en/plugins/architecture) — 功能模型與載入管線
- [Community Plugins](/en/plugins/community) — 第三方清單
