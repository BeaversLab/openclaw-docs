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

<Info>如果上游服務公開了標準的 HTTP 模型 API，請改為撰寫 [提供者插件](/zh-Hant/plugins/sdk-provider-plugins)。如果上游執行環境擁有完整的代理程式工作階段、工具事件、壓縮或背景 工作狀態，請使用 [Agent 韁具](/zh-Hant/plugins/sdk-agent-harness)。</Info>

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
  <Step title="建立套件中繼資料">
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

    已發布的套件必須包含已建置的 JavaScript 執行期檔案。如果您的來源進入點是 `./src/index.ts`，請新增指向已建置 JavaScript 對應項的 `openclaw.runtimeExtensions`。請參閱 [進入點](/zh-Hant/plugins/sdk-entrypoints)。

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

| 鉤子                               | 用途                                      |
| ---------------------------------- | ----------------------------------------- |
| `normalizeConfig(config, context)` | 合併後重寫舊版使用者配置                  |
| `resolveExecutionArgs(ctx)`        | 添加請求範圍的標誌，例如思考強度          |
| `prepareExecution(ctx)`            | 在啟動前建立臨時的授權或配置橋接          |
| `transformSystemPrompt(ctx)`       | 套用最終的 CLI 特定系統提示詞轉換         |
| `textTransforms`                   | 雙向提示詞/輸出替換                       |
| `defaultAuthProfileId`             | 優先使用特定的 OpenClaw 授權設定檔        |
| `authEpochMode`                    | 決定授權變更如何使儲存的 CLI 工作階段失效 |
| `nativeToolMode`                   | 宣告 CLI 是否具有始終啟用的原生工具       |
| `bundleMcp` / `bundleMcpMode`      | 選擇加入 OpenClaw 的回傳 MCP 工具橋接     |

保持這些鉤子由提供者擁有。當後端鉤子可以表達該行為時，請不要將 CLI 特定的分支添加到核心中。

## MCP 工具橋接

預設情況下，CLI 後端不會接收 OpenClaw 工具。如果 CLI 可以使用 MCP 配置，請明確選擇加入：

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

支援的橋接模式包括：

| 模式                     | 用途                                |
| ------------------------ | ----------------------------------- |
| `claude-config-file`     | 接受 MCP 配置檔案的 CLI             |
| `codex-config-overrides` | 接受 argv 上配置覆寫的 CLI          |
| `gemini-system-settings` | 從其系統設定目錄讀取 MCP 設定的 CLI |

僅當 CLI 實際可以使用橋接時才啟用它。如果 CLI 有自己的內建工具層且無法停用，請設定 `nativeToolMode:
"always-on"`，以便當呼叫者要求無原生工具時，OpenClaw 可以安全地失敗。

## 使用者配置

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

記錄使用者可能需要的最小覆寫。通常，當二進位檔位於 `PATH` 之外時，僅需要 `command`。

## 驗證

對於捆綁插件，在建構器和設定註冊周圍新增一個專注的測試，然後運行插件的目標測試通道：

```bash
pnpm test extensions/acme-cli
```

對於本地或已安裝的插件，驗證發現和一次真實模型運行：

```bash
openclaw plugins inspect acme-cli --runtime --json
openclaw agent --message "reply exactly: backend ok" --model acme-cli/acme-large
```

如果後端支援映像或 MCP，請新增一個實時冒煙測試，使用真實 CLI 證明這些路徑。不要依賴靜態檢查來處理提示、映像、MCP 或會話恢復行為。

## 檢查清單

<Check>`package.json` 具有 `openclaw.extensions` 和已發佈套件的內建運行時條目</Check>
<Check>`openclaw.plugin.json` 宣告 `cliBackends` 和有意義的 `activation.onStartup`</Check>
<Check>當設定/模型發現應該冷啟動後端時，`setup.cliBackends` 存在</Check>
<Check>`api.registerCliBackend(...)` 使用與清單相同的後端 id</Check>
<Check>`agents.defaults.cliBackends.<id>` 下的使用者覆寫仍然優先</Check>
<Check>會話、系統提示、映像和輸出解析器設定與真實 CLI 契約相符</Check>
<Check>目標測試和至少一個實時 CLI 冒煙測試證明了後端路徑</Check>

## 相關

- [CLI 後端](/zh-Hant/gateway/cli-backends) - 使用者設定和運行時行為
- [建構插件](/zh-Hant/plugins/building-plugins) - 套件和清單基礎
- [插件 SDK 概述](/zh-Hant/plugins/sdk-overview) - 註冊 API 參考
- [插件清單](/zh-Hant/plugins/manifest) - `cliBackends` 和設定描述符
- [Agent harness](/zh-Hant/plugins/sdk-agent-harness) - 完整的外部 agent 運行時
