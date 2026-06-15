---
summary: "建構一個可註冊本地 AI CLI 後端的插件"
title: "建構 CLI 後端插件"
sidebarTitle: "CLI 後端插件"
read_when:
  - You are building a local AI CLI backend plugin
  - You want to register a backend for model refs such as acme-cli/model
  - You need to map a third-party CLI into OpenClaw's text fallback runner
---

CLI 後端插件允許 OpenClaw 將本地 AI CLI 作為文字推論後端進行呼叫。該後端在模型參考中顯示為提供者前綴：

```text
acme-cli/acme-large
```

當上游整合已作為本地命令公開、當 CLI 擁有本地登入狀態，或當 API 提供者無法使用時 CLI 是有用的備選方案時，請使用 CLI 後端。

<Info>若上游服務提供標準 HTTP 模型 API，請改為撰寫 [provider plugin](/zh-Hant/plugins/sdk-provider-plugins)。若上游 runtime 擁有完整的 agent 會話、工具事件、壓縮 (compaction) 或背景 任務狀態，請使用 [agent harness](/zh-Hant/plugins/sdk-agent-harness)。</Info>

## 外掛程式的擁有權範圍

CLI 後端外掛程式有三個合約：

| 合約       | 檔案                   | 用途                                             |
| ---------- | ---------------------- | ------------------------------------------------ |
| 套件入口點 | `package.json`         | 指向 OpenClaw 的外掛程式執行時模組               |
| 清單所有權 | `openclaw.plugin.json` | 在執行時載入前宣告後端 ID                        |
| 執行時註冊 | `index.ts`             | 使用命令預設值呼叫 `api.registerCliBackend(...)` |

清單屬於探索中繼資料。它不會執行 CLI，也不會
註冊執行時行為。執行時行為在外掛程式入口點呼叫
`api.registerCliBackend(...)` 時開始。

## 最小後端外掛程式

<Steps>
  <Step title="Create package metadata">
    ```json package.json
    {
      "name": "@acme/openclaw-acme-cli",
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
      },
      "dependencies": {
        "openclaw": "^2026.3.24"
      },
      "devDependencies": {
        "typescript": "^5.9.0"
      }
    }
    ```

    已發佈的套件必須包含建置後的 JavaScript runtime 檔案。若您的來源
    入口是 `./src/index.ts`，請新增 `openclaw.runtimeExtensions` 指向
    建置後的 JavaScript peer。請參閱 [Entry points](/zh-Hant/plugins/sdk-entrypoints)。

  </Step>

  <Step title="宣告後端擁有權">
    ```json openclaw.plugin.json
    {
      "id": "acme-cli",
      "name": "Acme CLI",
      "description": "Run Acme's local AI CLI through OpenClaw",
      "cliBackends": ["acme-cli"],
      "setup": {
        "cliBackends": ["acme-cli"],
        "requiresRuntime": false
      },
      "activation": {
        "onStartup": false
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```

    `cliBackends` 是執行時期擁有權清單。它讓 OpenClaw 在設定或模型選擇提到 `acme-cli/...` 時能自動載入外掛程式。

    `setup.cliBackends` 是以描述符優先的設定介面。當模型探索、上架或狀態應在載入外掛程式執行環境前識別後端時，請加入它。僅當那些靜態描述符足以進行設定時，才使用 `requiresRuntime: false`。

  </Step>

  <Step title="註冊後端">
    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import {
      CLI_FRESH_WATCHDOG_DEFAULTS,
      CLI_RESUME_WATCHDOG_DEFAULTS,
      type CliBackendPlugin,
    } from "openclaw/plugin-sdk/cli-backend";

    function buildAcmeCliBackend(): CliBackendPlugin {
      return {
        id: "acme-cli",
        liveTest: {
          defaultModelRef: "acme-cli/acme-large",
          defaultImageProbe: false,
          defaultMcpProbe: false,
          docker: {
            npmPackage: "@acme/acme-cli",
            binaryName: "acme",
          },
        },
        config: {
          command: "acme",
          args: ["chat", "--json"],
          output: "json",
          input: "stdin",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptFileArg: "--system-file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          reliability: {
            watchdog: {
              fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
              resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
            },
          },
          serialize: true,
        },
      };
    }

    export default definePluginEntry({
      id: "acme-cli",
      name: "Acme CLI",
      description: "Run Acme's local AI CLI through OpenClaw",
      register(api) {
        api.registerCliBackend(buildAcmeCliBackend());
      },
    });
    ```

    後端 ID 必須與 manifest `cliBackends` 條目相符。註冊的
    `config` 僅為預設值；位於
    `agents.defaults.cliBackends.acme-cli` 下的使用者設定會在執行時合併覆蓋它。

  </Step>
</Steps>

## 設定形狀

`CliBackendConfig` 描述了 OpenClaw 應如何啟動和解析 CLI：

| 欄位                                      | 用途                                    |
| ----------------------------------------- | --------------------------------------- |
| `command`                                 | 二進位檔名稱或絕對指令路徑              |
| `args`                                    | 全新執行的基底 argv                     |
| `resumeArgs`                              | 恢復階段的替代 argv；支援 `{sessionId}` |
| `output` / `resumeOutput`                 | 解析器：`json`、`jsonl` 或 `text`       |
| `input`                                   | 提示詞傳輸：`arg` 或 `stdin`            |
| `modelArg`                                | 用於模型 ID 之前的標誌                  |
| `modelAliases`                            | 將 OpenClaw 模型 ID 映射到 CLI 原生 ID  |
| `sessionArg` / `sessionArgs`              | 如何傳遞會話 ID                         |
| `sessionMode`                             | `always`、`existing` 或 `none`          |
| `sessionIdFields`                         | OpenClaw 從 CLI 輸出讀取的 JSON 欄位    |
| `systemPromptArg` / `systemPromptFileArg` | 系統提示詞傳輸                          |
| `systemPromptWhen`                        | `first`、`always` 或 `never`            |
| `imageArg` / `imageMode`                  | 圖片路徑支援                            |
| `serialize`                               | 保持相同後端的執行有序                  |
| `reliability.watchdog`                    | 無輸出超時調整                          |

優先使用符合 CLI 的最小靜態配置。僅針對真正屬於後端的行為添加插件回調。

## 進階後端鉤子

`CliBackendPlugin` 也可以定義：

| 鉤子                               | 用途                                         |
| ---------------------------------- | -------------------------------------------- |
| `normalizeConfig(config, context)` | 合併後重寫舊版使用者配置                     |
| `resolveExecutionArgs(ctx)`        | 添加請求範圍的標誌，例如思考強度             |
| `prepareExecution(ctx)`            | 在啟動前建立臨時的授權或配置橋接             |
| `transformSystemPrompt(ctx)`       | 套用最終的 CLI 特定系統提示詞轉換            |
| `textTransforms`                   | 雙向提示詞/輸出替換                          |
| `defaultAuthProfileId`             | 優先使用特定的 OpenClaw 授權設定檔           |
| `authEpochMode`                    | 決定授權變更如何使儲存的 CLI 工作階段失效    |
| `nativeToolMode`                   | 宣告 CLI 是否具有始終啟用的原生工具          |
| `bundleMcp` / `bundleMcpMode`      | 選擇加入 OpenClaw 的回傳 MCP 工具橋接        |
| `ownsNativeCompaction`             | 後端擁有自己的壓縮機制 - OpenClaw 會延後處理 |

請保持這些 hooks 由 provider 擁有。當後端 hook 可以表達該行為時，
請勿在核心中新增 CLI 特定的分支。

### `ownsNativeCompaction`：選擇不使用 OpenClaw 壓縮

若您的後端執行的是會壓縮其**自身**對話記錄的 agent，請設定
`ownsNativeCompaction: true`，如此 OpenClaw 的安全保護摘要器 (safeguard summarizer) 將不會對其
會話執行 - CLI 壓縮生命週期會傳回 no-op，並繼續執行該回合。`claude-cli`
宣告此設定是因為 Claude Code 會在內部進行壓縮，而沒有 harness 端點。諸如 Codex 等
Native-harness 會話則會繼續路由至其 harness 壓縮端點。

**僅在下列所有條件成立時才宣告**，否則延後且超過預算的會話可能
會持續超過預算 / 變為過時 (OpenClaw 將不再救援它)：

- 當後端接近其視窗限制時，能可靠地壓縮或限制其自身的對話記錄；
- 它會保存可恢復的會話，使壓縮後的狀態能在回合中存活下來
  (例如 `--resume` / `--session-id`)；
- 它不是 native-harness 壓縮會話 - 符合 `agentHarnessId` 的會話
  會改為路由至 harness 端點。

## MCP 工具橋接器

CLI 後端預設不會接收 OpenClaw 工具。若該 CLI 能使用 MCP 組態，請明確選擇加入：

```typescript
return {
  id: "acme-cli",
  bundleMcp: true,
  bundleMcpMode: "codex-config-overrides",
  config: {
    command: "acme",
    args: ["chat", "--json"],
    output: "json",
  },
};
```

支援的橋接模式如下：

| 模式                     | 用途                                |
| ------------------------ | ----------------------------------- |
| `claude-config-file`     | 接受 MCP 組態檔的 CLI               |
| `codex-config-overrides` | 接受 argv 組態覆寫的 CLI            |
| `gemini-system-settings` | 從其系統設定目錄讀取 MCP 設定的 CLI |

僅在 CLI 實際能夠使用該橋接時啟用它。如果 CLI 具有無法停用的內建工具層，請設定 `nativeToolMode:
"always-on"`，以便當呼叫方要求不使用原生工具時，OpenClaw 能夠以封閉模式失敗。

## 使用者設定

使用者可以覆寫任何後端預設值：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "acme-cli": {
          command: "/opt/acme/bin/acme",
          args: ["chat", "--json", "--profile", "work"],
          modelAliases: {
            large: "acme-large-2026",
          },
        },
      },
      model: {
        primary: "openai/gpt-5.5",
        fallbacks: ["acme-cli/large"],
      },
    },
  },
}
```

請記錄使用者可能需要的最小覆寫設定。通常，當二進位檔位於 `PATH` 之外時，僅需設定 `command`。

## 驗證

對於內建套件，請針對建構器和設定註冊新增專注測試，然後執行外掛的目標測試管道：

```bash
pnpm test extensions/acme-cli
```

對於本機或已安裝的外掛，請驗證探索機制以及一次真實的模型執行：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

如果後端支援影像或 MCP，請新增即時冒煙測試，以使用真實 CLI 證明這些路徑。不要依賴靜態檢查來驗證提示、影像、MCP 或會話恢復行為。

## 檢查清單

<Check>`package.json` 具有 `openclaw.extensions` 以及已發布套件的建構執行時期項目</Check>
<Check>`openclaw.plugin.json` 宣告了 `cliBackends` 和刻意設定的 `activation.onStartup`</Check>
<Check>當設定/模型探索應冷啟動後端時，需存在 `setup.cliBackends`</Check>
<Check>`api.registerCliBackend(...)` 使用與清單相同的後端 ID</Check>
<Check>`agents.defaults.cliBackends.<id>` 下的使用者覆寫設定仍然優先生效</Check>
<Check>工作階段、系統提示、影像和輸出解析器設定符合真實 CLI 的契約</Check>
<Check>目標測試和至少一個即時 CLI 冒煙測試證明了後端路徑</Check>

## 相關

- [CLI 後端](/zh-Hant/gateway/cli-backends) - 使用者設定與執行時期行為
- [建構外掛](/zh-Hant/plugins/building-plugins) - 套件與清單基礎
- [外掛 SDK 概覽](/zh-Hant/plugins/sdk-overview) - 註冊 API 參考
- [外掛清單](/zh-Hant/plugins/manifest) - `cliBackends` 與設定描述
- [Agent harness](/zh-Hant/plugins/sdk-agent-harness) - 完整的外部 Agent 執行環境
