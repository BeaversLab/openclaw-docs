---
summary: "透過隨附的 Codex 應用程式伺服器介接器執行 OpenClaw 嵌入式代理程式回合"
title: "Codex 介接器"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

隨附的 `codex` 外掛程式讓 OpenClaw 透過 Codex 應用程式伺服器執行嵌入式 OpenAI 代理程式回合，而非透過內建的 PI 介接器。

當您希望 Codex 掌管底層 agent 工作階段時，請使用 Codex harness：原生執行緒恢復、原生工具接續、原生壓縮以及 app-server 執行。OpenClaw 仍然掌管聊天頻道、工作階段檔案、模型選擇、OpenClaw 動態工具、審核、媒體傳輸以及可見的逐字稿鏡像。

一般設定使用標準 OpenAI 模型參考（例如 `openai/gpt-5.5`）。請勿設定 `openai-codex/gpt-*` 模型參考。請將 OpenAI 代理程式驗證順序置於 `auth.order.openai` 之下；舊版的 `openai-codex:*` 設定檔和 `auth.order.openai-codex` 項目仍支援現有安裝。

OpenClaw 會啟動 Codex app-server 執行緒，並啟用 Codex 原生程式碼模式與僅程式碼模式。這能將延遲/可搜尋的 OpenClaw 動態工具保留在 Codex 自己的程式碼執行與工具搜尋介面中，而不是在 Codex 之上加上 PI 風格的工具搜尋包裝器。

若要瞭解更廣泛的模型/提供者/執行時期劃分，請從 [Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單來說：`openai/gpt-5.5` 是模型參考，`codex` 是執行時期，而 Telegram、Discord、 Slack 或其他通道則仍是通訊介面。

## 需求

- 具備可用的隨附 `codex` 外掛程式之 OpenClaw。
- 如果您的設定檔使用 `plugins.allow`，請包含 `codex`。
- Codex 應用程式伺服器 `0.125.0` 或更新版本。隨附的外掛程式預設會管理相容的 Codex 應用程式伺服器二進位檔，因此在 `PATH` 上的本機 `codex` 指令不會影響一般介接器啟動。
- 透過 `openclaw models auth login --provider openai-codex`、代理程式 Codex 家目錄中的應用程式伺服器帳戶，或明確的 Codex API 金鑰驗證設定檔提供 Codex 驗證。

如需瞭解驗證優先順序、環境隔離、自訂應用程式伺服器指令、模型探索以及所有設定欄位，請參閱 [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 快速入門

大多數想要在 OpenClaw 中使用 Codex 的使用者都希望採用此途徑：使用 ChatGPT/Codex 訂閱登入，啟用隨附的 `codex` 外掛程式，並使用標準的 `openai/gpt-*` 模型參考。

使用 Codex OAuth 登入：

```bash
openclaw models auth login --provider openai-codex
```

啟用隨附的 `codex` 外掛程式並選取 OpenAI 代理程式模型：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

如果您的設定檔使用 `plugins.allow`，請也在該處新增 `codex`：

```json5
{
  plugins: {
    allow: ["codex"],
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

變更外掛程式設定後請重新啟動閘道。如果現有的對話已經有會話，請在測試執行階段變更之前使用 `/new` 或 `/reset`，這樣下一輪就會根據目前的設定解析此控制程式。

## 設定

快速入門設定是最小可運行的 Codex harness 設定。在 OpenClaw 設定中設定 Codex harness 選項，並僅將 CLI 用於 Codex 驗證：

| 需要                                        | 設定                                                                    | 位置                           |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 啟用 harness                                | `plugins.entries.codex.enabled: true`                                   | OpenClaw 設定                  |
| 保留已列入允許清單的外掛安裝                | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 設定                  |
| 透過 Codex 路由 OpenAI agent 輪次           | 將 `agents.defaults.model` 或 `agents.list[].model` 作為 `openai/gpt-*` | OpenClaw agent 設定            |
| 使用 Codex OAuth 登入                       | `openclaw models auth login --provider openai-codex`                    | CLI 驗證設定檔                 |
| 為 Codex 執行新增 API 金鑰備援              | 在 `auth.order.openai` 的訂閱驗證之後列出的 `openai:*` API 金鑰設定檔   | CLI 驗證設定檔 + OpenClaw 設定 |
| 當 Codex 無法使用時關閉並失敗 (fail closed) | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者設定       |
| 使用直接的 OpenAI API 流量                  | 具有一般 OpenAI 驗證的提供者或模型 `agentRuntime.id: "pi"`              | OpenClaw 模型/提供者設定       |
| 調整應用程式伺服器行為                      | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛設定                 |
| 啟用原生 Codex 外掛應用程式                 | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛設定                 |
| 啟用 Codex 電腦使用                         | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛設定                 |

對 Codex 支援的 OpenAI 代理程式輪次使用 `openai/gpt-*` 模型參照。若為訂閱優先/API 金鑰備份的順序，建議優先使用 `auth.order.openai`。現有的 `openai-codex:*` 驗證設定檔和 `auth.order.openai-codex` 仍然有效，但請勿撰寫新的 `openai-codex/gpt-*` 模型參照。

除非選取的內容引擎擁有壓縮功能，否則請勿在 Codex 支援的代理程式上設定 `compaction.model` 或 `compaction.provider`。如果沒有擁有的內容引擎，Codex 會透過其原生應用程式伺服器執行緒狀態進行壓縮，因此 OpenClaw 會在執行階段忽略這些本機總結器覆寫，並在代理程式使用 Codex 時由 `openclaw doctor --fix` 將其移除。

Lossless 仍支援作為內容引擎。請透過 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 進行設定，而不是透過 `agents.defaults.compaction.provider`。當 Codex 是啟用的執行階段時，`openclaw doctor --fix` 會將舊的 `compaction.provider: "lossless-claw"` 結構遷移至 Lossless 內容引擎插槽。

當活動的情境引擎報告 `ownsCompaction: true` 時，`/compact` 會執行該引擎的壓縮生命週期並使已綁定的 Codex 應用伺服器執行緒失效。下一個 Codex 輪次會啟動一個新的後端執行緒，並從情境引擎重新載入它，而不是在引擎擁有的語意摘要之上層疊 Codex 原生壓縮。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在該情境下，這兩個設定檔仍然會透過 Codex 執行 `openai/gpt-*` 代理程式輪次。API 金鑰僅作為驗證備援方案，而非切換至 PI 或純 OpenAI Responses 的請求。

本頁其餘部分涵蓋使用者必須選擇的常見變體：部署形狀、故障封閉路由、監護人核准策略、原生 Codex 外掛程式，以及電腦使用方式。如需完整的選項清單、預設值、列舉、探索、環境隔離、逾時和應用伺服器傳輸欄位，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 驗證 Codex 執行時

在您預期使用 Codex 的聊天中使用 `/status`。由 Codex 支援的 OpenAI 代理程式輪次會顯示：

```text
Runtime: OpenAI Codex
```

然後檢查 Codex 應用伺服器狀態：

```text
/codex status
/codex models
```

`/codex status` 會回報應用伺服器連線、帳戶、速率限制、MCP 伺服器和技能。`/codex models` 會列出此 harness 和帳戶的即時 Codex 應用伺服器目錄。如果 `/status` 的結果出乎意料，請參閱 [疑難排解](#troubleshooting)。

## 路由和模型選擇

請將提供者參照和執行時期策略分開管理：

- 使用 `openai/gpt-*` 透過 Codex 執行 OpenAI 代理程式輪次。
- 請勿在設定中使用 `openai-codex/gpt-*`。執行 `openclaw doctor --fix` 以修復舊版參照和過時的會話路由釘選。
- `agentRuntime.id: "codex"` 對於一般的 OpenAI 自動模式是選用的，但在 Codex 無法使用時部署應封閉故障的情況下很有用。
- 當刻意為之時，`agentRuntime.id: "pi"` 會讓提供者或模型選擇直接 PI 行為。
- `/codex ...` 控制來自聊天的原生 Codex 應用伺服器對話。
- ACP/acpx 是一個獨立的外部 harness 路徑。僅當使用者要求 ACP/acpx 或外部 harness 配接器時才使用它。

常見的命令路由：

| 使用者意圖                              | 使用                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加目前聊天                            | `/codex bind [--cwd <path>]`                                                                          |
| 繼續現有的 Codex 執行緒                 | `/codex resume <thread-id>`                                                                           |
| 列出或篩選 Codex 執行緒                 | `/codex threads [filter]`                                                                             |
| 附加配對節點上的現有 Codex CLI 工作階段 | `/codex sessions --host <node> [filter]`，然後 `/codex resume <session-id> --host <node> --bind here` |
| 僅傳送 Codex 回饋                       | `/codex diagnostics [note]`                                                                           |
| 啟動 ACP/acpx 工作                      | ACP/acpx 工作階段指令，而非 `/codex`                                                                  |

| 使用案例                                   | 設定                                                        | 驗證                                   | 備註                      |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 使用原生 Codex 執行時的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上啟用的 `codex` 外掛程式                  | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑                  |
| 如果 Codex 無法使用則失敗關閉              | 供應商或模型 `agentRuntime.id: "codex"`                     | 輪次失敗而非退回到 PI                  | 僅用於 Codex 專屬部署     |
| 透過 PI 直接傳送 OpenAI API 金鑰流量       | 供應商或模型 `agentRuntime.id: "pi"` 以及正常的 OpenAI 驗證 | `/status` 顯示 PI 執行時               | 僅在有意使用 PI 時使用    |
| 舊版設定                                   | `openai-codex/gpt-*`                                        | `openclaw doctor --fix` 會重寫它       | 請勿以此方式撰寫新設定    |
| ACP/acpx Codex 配接器                      | ACP `sessions_spawn({ runtime: "acp" })`                    | ACP 工作/工作階段狀態                  | 與原生 Codex harness 分離 |

`agents.defaults.imageModel` 遵循相同的前綴拆分。使用 `openai/gpt-*`
進行正常的 OpenAI 路由，並僅在圖像理解應透過有界的 Codex app-server
輪次執行時使用 `codex/gpt-*`。請勿使用
`openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

當所有 OpenAI 代理輪次預設都應使用 Codex 時，請使用快速入門設定。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

### 混合供應商部署

此配置將 Claude 保留為預設代理，並新增一個具名的 Codex 代理：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
  agents: {
    defaults: {
      model: "anthropic/claude-opus-4-6",
    },
    list: [
      {
        id: "main",
        default: true,
        model: "anthropic/claude-opus-4-6",
      },
      {
        id: "codex",
        name: "Codex",
        model: "openai/gpt-5.5",
      },
    ],
  },
}
```

使用此設定時，`main` 代理使用其正常的供應商路徑，而
`codex` 代理使用 Codex app-server。

### 失敗關閉的 Codex 部署

對於 OpenAI agent 週期，當附帶的外掛程式可用時，`openai/gpt-*` 已解析為 Codex。當您需要書面化的故障關閉規則時，請新增明確的執行時期原則：

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: {
          id: "codex",
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

強制使用 Codex 後，如果 Codex 外掛程式已停用、app-server 版本太舊，或 app-server 無法啟動，OpenClaw 將會提早失敗。

## App-server 原則

根據預設，此外掛程式會在本機使用 stdio 傳輸啟動 OpenClaw 受管理的 Codex 二進位檔。僅當您有意執行不同的可執行檔時，才設定 `appServer.command`。僅當 app-server 已在其他地方執行時，才使用 WebSocket 傳輸：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
          },
        },
      },
    },
  },
}
```

本機 stdio app-server 工作階段預設為信任的本機操作員姿態：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該隱含的 YOLO 姿態，OpenClaw 會改為選擇允許的 guardian 權限。當 OpenClaw 沙箱對工作階段啟用時，OpenClaw 會將 Codex `danger-full-access` 縮減為 Codex `workspace-write`，讓原生的 Codex code-mode 週期保持在沙箱化工作區內。

當您希望 Codex 原生自動審查在沙箱逸出或額外權限之前執行時，請使用 guardian 模式：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Guardian 模式會擴充為 Codex app-server 核准，當本機需求允許這些值時，通常為 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有關每個 app-server 欄位、驗證順序、環境隔離、探索和逾時行為，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

附帶的外掛程式會在支援 OpenClaw 文字指令的任何頻道上將 `/codex` 註冊為斜線指令。

常見格式：

- `/codex status` 檢查 app-server 連線能力、模型、帳戶、速率限制、
  MCP 伺服器和技能。
- `/codex models` 列出作用中的 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex app-server 執行緒。
- `/codex resume <thread-id>` 將目前的 OpenClaw 工作階段附加至現有的
  Codex 執行緒。
- `/codex compact` 要求 Codex app-server 壓縮附加的執行緒。
- `/codex review` 啟動附加執行緒的 Codex 原生審查。
- `/codex diagnostics [note]` 在傳送附加執行緒的 Codex
  回饋前會詢問。
- `/codex account` 顯示帳戶與速率限制狀態。
- `/codex mcp` 列出 Codex 應用程式伺服器 MCP 伺服器狀態。
- `/codex skills` 列出 Codex 應用程式伺服器技能。

對於大多數支援報告，請在發生錯誤的對話中輸入 `/diagnostics [note]`。它會建立一份 Gateway 診斷報告，而對於 Codex
harness 工作階段，它會要求批准以傳送相關的 Codex 回饋套件。
請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics) 以了解隱私模型與群組
聊天行為。

僅當您特別想要為目前附加的執行緒上傳 Codex 回饋，而不需要完整的 Gateway
診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本機檢查 Codex 執行緒

檢查不良 Codex 執行最快速的方法通常是直接開啟原生 Codex
執行緒：

```bash
codex resume <thread-id>
```

從已完成的 `/diagnostics` 回覆、`/codex binding` 或
`/codex threads [filter]` 取得執行緒 ID。

關於上傳機制與執行時層級的診斷邊界，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證依以下順序選擇：

1. 代理程式的已排序 OpenAI 驗證設定檔，最好在
   `auth.order.openai` 之下。現有的 `openai-codex:*` 設定檔 ID 仍然有效。
2. 該代理程式 Codex home 中應用程式伺服器的現有帳戶。
3. 僅針對本機 stdio 應用程式伺服器啟動，當不存在應用程式伺服器帳戶且仍需要
   OpenAI 驗證時，會先 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 偵測到 ChatGPT 訂閱風格的 Codex 驗證設定檔時，它會從產生的 Codex 子程序中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這能確保
Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，而不會導致原生 Codex 應用程式伺服器輪詢意外透過 API 計費。
明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰備援會使用應用程式伺服器登入，而非繼承的子程序環境。WebSocket 應用程式伺服器連線不會收到 Gateway 環境 API 金鑰備援；請使用明確的驗證設定檔或
遠端應用程式伺服器自己的帳戶。

如果訂閱設定檔遇到 Codex 使用量限制，OpenClaw 會在 Codex 回報時記錄重設時間，並嘗試同一個 Codex 執行的下一個排序驗證設定檔。當重設時間過後，訂閱設定檔會再次變為可用，而無需變更所選的 `openai/gpt-*` 模型或 Codex 執行環境。

對於本機 stdio 應用程式伺服器啟動，OpenClaw 會將 `CODEX_HOME` 設定為每個代理程式的目錄，因此 Codex 設定、驗證/帳戶檔案、外掛快取/資料和原生執行緒狀態
預設不會讀取或寫入操作員個人的 `~/.codex`。OpenClaw 會保留正常的程序 `HOME`；Codex 執行的子程序仍然可以找到使用者主目錄設定和權杖，而且 Codex 可能會發現共用的
`$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 項目。

如果部署需要額外的環境隔離，請將這些變數新增到
`appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 僅影響產生的 Codex 應用程式伺服器子程序。
OpenClaw 會在本機啟動正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每個代理程式專屬，而 `HOME` 保持繼承，因此
子程序可以使用正常的使用者主目錄狀態。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開複製 Codex 原生工作區操作的動態工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。其餘的 OpenClaw
整合工具（例如訊息傳送、工作階段、媒體、cron、瀏覽器、節點、
閘道、`heartbeat_respond` 和 `web_search`）可透過 `openclaw` 命名空間下的 Codex 工具搜尋取得，讓初始模型語脈
保持較小。
`sessions_yield` 和僅使用訊息工具的來源回覆會保持直接，因為這些是回合控制合約。Heartbeat 協作指令會指示 Codex
在結束 heartbeat 回合前搜尋 `heartbeat_respond`（當該工具尚未載入時）。

僅在連接到無法搜尋延遲動態工具的自訂 Codex
應用程式伺服器，或在偵錯完整工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具語脈中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex 應用程式伺服器回合中省略的其他 OpenClaw 動態工具名稱。   |
| `codexPlugins`             | disabled       | 原生 Codex 外掛程式/應用程式支援，用於遷移的來源安裝精選外掛程式。  |

支援的 `appServer` 欄位：

| 欄位                          | 預設值                                    | 含義                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                 | `"stdio"` 會產生 (spawn) Codex；`"websocket"` 則連接到 `url`。                                                                                                                                       |
| `command`                     | 受管理的 Codex 二進位檔                   | stdio 傳輸的可執行檔。保留未設定以使用受管理的二進位檔；僅在需要明確覆寫時才進行設定。                                                                                                               |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | stdio 傳輸的引數。                                                                                                                                                                                   |
| `url`                         | 取消設定                                  | WebSocket 應用程式伺服器 URL。                                                                                                                                                                       |
| `authToken`                   | unset                                     | WebSocket 傳輸的 Bearer 權杖。                                                                                                                                                                       |
| `headers`                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                                                              |
| `clearEnv`                    | `[]`                                      | OpenClaw 建構繼承環境後，從產生的 stdio 應用程式伺服器程序中移除的額外環境變數名稱。OpenClaw 會保留本地啟動的每個代理程式 `CODEX_HOME` 和繼承的 `HOME`。                                             |
| `requestTimeoutMs`            | `60000`                                   | 應用程式伺服器控制平面呼叫的逾時時間。                                                                                                                                                               |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | Codex 接受輪次或針對輪次範圍的應用程式伺服器請求後，OpenClaw 等待 `turn/completed` 時的安靜視窗。若工具後或僅狀態的合成階段緩慢，請調高此設定。                                                      |
| `mode`                        | `"yolo"`，除非本地 Codex 需求不允許 YOLO  | 用於 YOLO 或守護者審查執行的預設。省略 `danger-full-access`、`never` 核准或 `user` 審查者的本地 stdio 需求，會使隱含的預設守護者生效。                                                               |
| `approvalPolicy`              | `"never"` 或允許的守護者核准策略          | 發送至執行緒啟動/恢復/輪次的 Native Codex 核准策略。若允許，守護者預設值偏好 `"on-request"`。                                                                                                        |
| `sandbox`                     | `"danger-full-access"` 或允許的守護者沙箱 | 發送至執行緒啟動/恢復的 Native Codex 沙箱模式。若允許，守護者預設值偏好 `"workspace-write"`，否則為 `"read-only"`。當 OpenClaw 沙箱處於作用中時，`danger-full-access` 會縮減為 `"workspace-write"`。 |
| `approvalsReviewer`           | `"user"` 或允許的守護者審查者             | 當允許時，使用 `"auto_review"` 讓 Codex 檢視原生核准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 保留為舊版別名。                                                               |
| `serviceTier`                 | 未設定                                    | 選用的 Codex 應用程式伺服器服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆寫，而舊版 `"fast"` 被接受為 `"priority"`。                                                  |

OpenClaw 擁有的動態工具呼叫獨立於 `appServer.requestTimeoutMs` 進行限制：Codex `item/tool/call` 請求預設使用 30 秒的 OpenClaw 監視程式。正數的單次呼叫 `timeoutMs` 引數會延長或縮短該特定工具預算。當工具呼叫未提供自己的逾時時，`image_generate` 工具也會使用 `agents.defaults.imageGenerationModel.timeoutMs`，而媒體理解 `image` 工具會使用 `tools.media.image.timeoutSeconds` 或其 60 秒的媒體預設值。動態工具預算上限為 600000 毫秒。發生逾時時，OpenClaw 會在支援的情況下中止工具信號，並傳回失敗的動態工具回應給 Codex，以便回合能夠繼續，而不是讓會話處於 `processing` 狀態。

在 Codex 接受一輪並且 OpenClaw 回應一個範圍限定的 app-server 請求後，harness 預期 Codex 能在當前輪次中取得進度，並最終以 `turn/completed` 完成原生輪次。如果 app-server 安靜了 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以免後續聊天訊息被卡在陳舊的原生輪次後面。同一輪次中的大多數非終結通知會解除該短監視計時器，因為 Codex 已證明該輪次仍存活；原始 `custom_tool_call_output` 完成會保持啟用工具後的短監視計時器，因為它們是範圍限定的工具結果傳遞。全域 app-server 通知（例如速率限制更新）不會重置輪次閒置進度。已完成的 `agentMessage` 項目與工具前原始助理 `rawResponseItem/completed` 項目會啟用助理輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下變得安靜，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後原始助理進度則會繼續等待 `turn/completed` 或終結監視計時器。逾時診斷包含最後一個 app-server 通知方法，若是原始助理回應項目，還包含項目類型、角色、id 與有界的助理文字預覽。

環境覆寫仍可用於本地測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_BIN` 會在 `appServer.command` 未設定時略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或針對一次性本地測試使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。對於可重複的部署，建議使用設定檔，因為這能讓外掛行為與 Codex harness 設定的其餘部分保持在同一個已審閱的檔案中。

## 原生 Codex 外掛

原生 Codex 外掛程式支援使用 Codex app-server 自身的應用程式和外掛程式功能，這與 OpenClaw harness 轉次位於同一個 Codex 執行緒中。OpenClaw 不會將 Codex 外掛程式轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的工作階段。它對 PI 執行、一般的 OpenAI 提供者執行、ACP 對話綁定或其他 harness 沒有影響。

最小的遷移設定：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
              },
            },
          },
        },
      },
    },
  },
}
```

執行緒應用程式設定是在 OpenClaw 建立 Codex harness 工作階段或替換過時的 Codex 執行緒綁定時計算的。它不會在每次轉次時重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 工作階段以更新後的應用程式集啟動。

關於遷移資格、應用程式清單、破壞性操作原則、引導以及原生外掛程式診斷，請參閱[原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用 (Computer Use)

電腦使用涵蓋在其專屬的設定指南中：
[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡言之：OpenClaw 並不包含桌面控制應用程式或自行執行桌面操作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式轉次期間擁有原生 MCP 工具呼叫。

## 執行時期邊界

Codex harness 僅變更低層級的嵌入式代理程式執行器。

- 支援 OpenClaw 動態工具。Codex 會要求 OpenClaw 執行這些
  工具，因此 OpenClaw 仍保留在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生應用程式工具由 Codex 擁有。
  OpenClaw 可以透過支援的中繼觀察或封鎖選取的原生事件，但它不會重寫原生工具引數。
- Codex 擁有原生壓縮，除非作用中的 OpenClaw 內容引擎
  宣告 `ownsCompaction: true`。OpenClaw 會為頻道歷程記錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness
  切換保留文字記錄鏡像。
- 媒體生成、媒體理解、TTS、審核和訊息工具
  輸出會繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的轉錄工具結果，而不適用於 Codex 原生工具結果記錄。

關於 Hook 層、支援的 V1 介面、原生權限處理、佇列引導、Codex 反饋上傳機制以及壓縮細節，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未顯示為一般的 `/model` 提供者：** 對於新設定來說，這是預期的行為。請選擇 `openai/gpt-*` 模型，啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保官方 OpenAI 提供者上的模型參考是 `openai/gpt-*`，且已安裝並啟用 Codex 外掛程式。如果您在測試時需要嚴格的證明，請設定提供者或模型 `agentRuntime.id: "codex"`。強制的 Codex 執行時會失敗，而不是回退到 PI。

**OpenAI Codex 執行時回退到 API 金鑰路徑：** 請收集經過編輯的閘道摘錄，其中顯示模型、執行時、選定的提供者以及失敗資訊。請要求受影響的協作者在各自的 OpenClaw 主機上執行此唯讀指令：

```bash
(
  pattern='openai/gpt-5\.[45]|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|openai-codex|resolveSelectedOpenAIPiRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

  if ls /tmp/openclaw/openclaw-*.log >/dev/null 2>&1; then
    grep -E -i -n "$pattern" /tmp/openclaw/openclaw-*.log 2>/dev/null || true
  else
    journalctl --user -u openclaw-gateway --since today --no-pager 2>/dev/null \
      | grep -E -i "$pattern" || true
  fi
) | sed -E \
    -e 's/(Authorization: Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(Bearer )[A-Za-z0-9._~+\/-]+/\1[REDACTED]/Ig' \
    -e 's/(api[_ -]?key[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/(OPENAI_API_KEY[=: ]+)[^ ,}"]+/\1[REDACTED]/Ig' \
    -e 's/sk-[A-Za-z0-9_-]{12,}/sk-[REDACTED]/g' \
    -e 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[EMAIL-REDACTED]/g' \
  | tail -200
```

有用的摘錄通常包括 `openai/gpt-5.5` 或 `openai/gpt-5.4`、`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或 `No API key` 結果。修正後的執行應顯示 `openai-codex` OAuth 路徑，而非單純的 OpenAI API 金鑰失敗。

**舊版 `openai-codex/*` 設定仍然存在：** 請執行 `openclaw doctor --fix`。Doctor 會將舊版模型參考重寫為 `openai/*`，移除過時的工作階段和全代理程式執行時釘選，並保留現有的認證設定檔覆寫。

**App-server 被拒絕：**請使用 `0.125.0` 或更新版本的 Codex app-server。
同版本預發布版或建置後綴版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 會測試穩定 `0.125.0` 協議底線。

**`/codex status` 無法連線：**請檢查內建的 `codex` 外掛程式是否已啟用、當設定了白名單時 `plugins.allow` 是否包含該外掛程式，以及任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索速度緩慢：**請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索功能。請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：**請檢查 `appServer.url`、`authToken`、
標頭，以及遠端 app-server 是否說明相同的 Codex app-server 協議版本。

**非 Codex 模型使用 PI：**除非供應商或模型執行階段策略將其路由到其他 harness，否則這是預期行為。純非 OpenAI 供應商參照在 `auto` 模式下會維持在一般的供應商路徑上。

**Computer Use 已安裝但工具無法執行：**請從全新的工作階段檢查
`/codex computer-use status`。如果工具回報 `Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果問題持續存在，請重新啟動閘道以清除過時的原生 hook 註冊。請參閱
[Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting)。

## 相關

- [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness 執行階段](/zh-Hant/plugins/codex-harness-runtime)
- [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [Agent 執行階段](/zh-Hant/concepts/agent-runtimes)
- [模型供應商](/zh-Hant/concepts/model-providers)
- [OpenAI 供應商](/zh-Hant/providers/openai)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [外掛程式 Hooks](/zh-Hant/plugins/hooks)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [狀態](/zh-Hant/cli/status)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
