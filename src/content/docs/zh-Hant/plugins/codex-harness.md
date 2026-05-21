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

OpenClaw 在啟用 Codex 原生代碼模式的情況下啟動 Codex 應用伺服器執行緒，同時預設將僅代碼模式保持關閉。這使得 Codex 原生工作區和代碼功能保持可用，同時 OpenClaw 動態工具繼續通過應用伺服器 `item/tool/call` 橋接器運行。受限的工具策略仍然會完全停用原生代碼模式。

關於更廣泛的 model/provider/runtime 分割，請從
[Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單來說是：
`openai/gpt-5.5` 是 model ref，`codex` 是 runtime，而 Telegram、
Discord、Slack 或其他 channel 則維持為通訊表面。

## 需求

- OpenClaw 並已提供內建的 `codex` 外掛程式。
- 如果您的設定使用 `plugins.allow`，請加入 `codex`。
- Codex 應用伺服器 `0.125.0` 或更新版本。內建外掛程式預設會管理相容的
  Codex 應用伺服器二進位檔案，因此在 `PATH` 上執行的本機 `codex` 指令不會
  影響正常的 harness 啟動。
- 可透過 `openclaw models auth login --provider openai-codex` 取得 Codex 驗證、
  位於代理程式 Codex 家目錄中的應用伺服器帳戶，或明確的 Codex API 金鑰
  驗證設定檔。

關於 auth 優先順序、環境隔離、自訂 app-server 指令、model
探索以及所有 config 欄位，請參閱
[Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 快速入門

大多數想在 OpenClaw 中使用 Codex 的使用者都會選擇此路徑：使用 ChatGPT/Codex 訂閱登入，啟用內建的 `codex` 外掛程式，並使用
標準的 `openai/gpt-*` 模型引用。

使用 Codex OAuth 登入：

```bash
openclaw models auth login --provider openai-codex
```

啟用內建的 `codex` 外掛程式並選擇一個 OpenAI 代理程式模型：

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

如果您的設定使用 `plugins.allow`，請在那裡也加入 `codex`：

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

變更外掛程式設定後請重新啟動閘道。如果現有的聊天已經
有工作階段，請在測試運行時變更前使用 `/new` 或 `/reset`，這樣下一
輪就會從目前的設定解析 harness。

## 設定

快速入門設定是最小可運行的 Codex harness 設定。在 OpenClaw 設定中設定 Codex harness 選項，並僅將 CLI 用於 Codex 驗證：

| 需要                                        | 設定                                                                    | 位置                           |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 啟用 harness                                | `plugins.entries.codex.enabled: true`                                   | OpenClaw 設定                  |
| 保留已列入允許清單的外掛安裝                | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 設定                  |
| 透過 Codex 路由 OpenAI agent 輪次           | `agents.defaults.model` 或 `agents.list[].model` 作為 `openai/gpt-*`    | OpenClaw agent 設定            |
| 使用 Codex OAuth 登入                       | `openclaw models auth login --provider openai-codex`                    | CLI 驗證設定檔                 |
| 為 Codex 執行新增 API 金鑰備援              | 在 `auth.order.openai` 中的訂閱驗證之後列出的 `openai:*` API 金鑰設定檔 | CLI 驗證設定檔 + OpenClaw 設定 |
| 當 Codex 無法使用時關閉並失敗 (fail closed) | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者設定       |
| 使用直接的 OpenAI API 流量                  | 具有一般 OpenAI 驗證的提供者或模型 `agentRuntime.id: "pi"`              | OpenClaw 模型/提供者設定       |
| 調整應用程式伺服器行為                      | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛設定                 |
| 啟用原生 Codex 外掛應用程式                 | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛設定                 |
| 啟用 Codex 電腦使用                         | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛設定                 |

對於由 Codex 支援的 OpenAI Agent 輪次，請使用 `openai/gpt-*` 模型參照。若要
採用訂閱優先/API 金鑰備份的順序，請優先使用
`auth.order.openai`。現有的
`openai-codex:*` 驗證設定檔和 `auth.order.openai-codex` 仍然有效，但
請勿撰寫新的 `openai-codex/gpt-*` 模型參照。

除非選取的內容引擎擁有壓縮權限，否則請勿在 Codex 支援的 Agent 上
設定 `compaction.model` 或 `compaction.provider`。
在沒有擁有者內容引擎的情況下，Codex 會透過其原生 App-Server 執行緒狀態進行壓縮，因此 OpenClaw
會在執行時忽略這些本機摘要器覆寫值，並且當 Agent 使用 Codex 時，`openclaw doctor --fix`
會將其移除。

Lossless 仍獲支援作為內容引擎。請透過
`plugins.slots.contextEngine: "lossless-claw"` 和
`plugins.entries.lossless-claw.config.summaryModel` 進行設定，而不要透過
`agents.defaults.compaction.provider`。當 Codex 為作用中執行階段時，`openclaw doctor --fix` 會將舊的
`compaction.provider: "lossless-claw"` 結構遷移至 Lossless 內容引擎插槽。

當作用中的內容引擎回報 `ownsCompaction: true` 時，`/compact` 會執行
該引擎的壓縮生命週期並使綁定的 Codex App-Server
執行緒失效。下一個 Codex 輪次會啟動一個新的後端執行緒，並從
內容引擎重新注入它，而不是將 Codex 原生壓縮疊加在
引擎擁有的語意摘要之上。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在該結構中，這兩個設定檔仍然透過 Codex 執行 `openai/gpt-*` Agent
輪次。API 金鑰僅作為驗證備援，而非切換至 PI 或
純 OpenAI Responses 的請求。

本頁其餘部分涵蓋使用者必須選擇的常見變體：
deployment 形狀、fail-closed 路由、guardian 審核策略、原生 Codex
plugins 以及 Computer Use。若要查看完整選項列表、預設值、enums、探索、
環境隔離、逾時 和 app-server 傳輸欄位，請參閱
[Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

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

`/codex status` 回報 app-server 連線、帳戶、速率限制、MCP
伺服器 和 skills。`/codex models` 列出該 harness 和帳戶的即時 Codex app-server catalog。如果 `/status` 的結果出乎意料，請參閱
[Troubleshooting](#troubleshooting)。

## 路由和模型選擇

請將提供者參照和執行時期策略分開管理：

- 對於透過 Codex 的 OpenAI 代理程式輪次，請使用 `openai/gpt-*`。
- 請勿在設定中使用 `openai-codex/gpt-*`。請執行 `openclaw doctor --fix` 以修復舊版參照和過時的會話路由釘選。
- `agentRuntime.id: "codex"` 對於正常的 OpenAI 自動模式是可選的，但在 Codex 無法使用時部署應失敗封閉的情況下很有用。
- `agentRuntime.id: "pi"` 在出於意圖時，將提供者或模型選擇加入直接的 PI 行為。
- `/codex ...` 從聊天控制原生 Codex 應用程式伺服器對話。
- ACP/acpx 是一個獨立的外部 harness 路徑。僅當使用者要求 ACP/acpx 或外部 harness 配接器時才使用它。

常見的命令路由：

| 使用者意圖                             | 使用                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加目前聊天                           | `/codex bind [--cwd <path>]`                                                                          |
| 繼續現有的 Codex 執行緒                | `/codex resume <thread-id>`                                                                           |
| 列出或篩選 Codex 執行緒                | `/codex threads [filter]`                                                                             |
| 列出原生 Codex plugins                 | `/codex plugins list`                                                                                 |
| 啟用或停用已設定的原生 Codex plugin    | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| 連接配對節點上既有的 Codex CLI session | `/codex sessions --host <node> [filter]`, 然後 `/codex resume <session-id> --host <node> --bind here` |
| 僅傳送 Codex 回饋                      | `/codex diagnostics [note]`                                                                           |
| 啟動 ACP/acpx 任務                     | ACP/acpx session 指令，而非 `/codex`                                                                  |

| 使用案例                                     | 設定                                                           | 驗證                                   | 備註                      |
| -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 具備原生 Codex runtime 的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上啟用的 `codex` plugin                       | `/status` 顯示 `Runtime: OpenAI Codex` | 推薦路徑                  |
| 若 Codex 無法使用則 Fail closed              | Provider 或 model `agentRuntime.id: "codex"`                   | Turn 失敗而非 PI 備援                  | 用於僅 Codex 的部署       |
| 直接透過 PI 傳送 OpenAI API-key 流量         | Provider 或 model `agentRuntime.id: "pi"` 和正常的 OpenAI auth | `/status` 顯示 PI runtime              | 僅在有意使用 PI 時使用    |
| 舊版設定                                     | `openai-codex/gpt-*`                                           | `openclaw doctor --fix` 會將其重寫     | 請勿以此方式撰寫新設定    |
| ACP/acpx Codex 配接器                        | ACP `sessions_spawn({ runtime: "acp" })`                       | ACP 工作/工作階段狀態                  | 與原生 Codex harness 分離 |

`agents.defaults.imageModel` 遵循相同的前綴分割方式。針對一般 OpenAI 路由使用 `openai/gpt-*`，僅在影像理解應透過受限 Codex app-server 執行時使用 `codex/gpt-*`。請勿使用 `openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

當所有 OpenAI agent 輪次預設應使用 Codex 時，請使用快速入門設定。

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

### 混合提供商部署

此配置將 Claude 保留為預設 agent，並新增一個具名 Codex agent：

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

使用此設定時，`main` agent 會使用其一般提供商路徑，而 `codex` agent 則使用 Codex app-server。

### 失效封閉式 Codex 部署

對於 OpenAI agent 輪次，當內建外掛程式可用時，`openai/gpt-*` 已解析為 Codex。當您需要書面失效封閉規則時，請新增明確的執行時期原則：

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

在強制使用 Codex 的情況下，如果 Codex 外掛程式已停用、app-server 版本過舊或 app-server 無法啟動，OpenClaw 將會提早失敗。

## App-server 原則

預設情況下，外掛程式會在本機使用 stdio 傳輸啟動 OpenClaw 的受管理 Codex 二進位檔。僅在您有意執行不同的可執行檔時，才設定 `appServer.command`。僅在 app-server 已在其他地方執行時，才使用 WebSocket 傳輸：

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

本機 stdio app-server 會話預設為受信任的本機操作員姿態：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該
隱含 YOLO 姿態，OpenClaw 會改為選擇允許的 guardian 權限。
當 OpenClaw 沙箱處於啟用狀態時，OpenClaw 會將 Codex
`danger-full-access` 縮小為 Codex `workspace-write`，以便原生 Codex 代碼模式輪次
保持在沙箱工作區內。Codex 輪次網路標誌遵循
OpenClaw 沙箱出口策略：Docker `network: "none"` 保持離線，而
`network: "bridge"` 或自訂 Docker 網路則允許出站存取。
明確的 Codex `workspace-write` 輪次使用相同的衍生自出口策略的網路標誌。

當您希望在沙箱逃逸或額外權限之前進行 Codex 原生自動審查時，
請使用 guardian 模式：

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

Guardian 模式會擴展為 Codex app-server 批准，通常為
`approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和
`sandbox: "workspace-write"`（當本機需求允許這些值時）。

有關每個 app-server 欄位、驗證順序、環境隔離、探索和
逾時行為，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

內建外掛程式會將 `/codex` 註冊為斜線指令，
適用於任何支援 OpenClaw 文字指令的頻道。

常見格式：

- `/codex status` 會檢查 app-server 連線性、模型、帳戶、速率限制、
  MCP 伺服器和技能。
- `/codex models` 列出即時的 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex app-server 執行緒。
- `/codex resume <thread-id>` 將目前的 OpenClaw 會話附加至
  現有的 Codex 執行緒。
- `/codex compact` 要求 Codex app-server 壓縮附加的執行緒。
- `/codex review` 啟動附加執行緒的 Codex 原生審查。
- `/codex diagnostics [note]` 在傳送附加執行緒的 Codex 回饋前
  詢問。
- `/codex account` 顯示帳戶和速率限制狀態。
- `/codex mcp` 列出 Codex app-server MCP 伺服器狀態。
- `/codex skills` 列出 Codex app-server 技能。

對於大多數支援報告，請在發生錯誤的對話中從 `/diagnostics [note]` 開始。它會建立一份 Gateway 診斷報告，並且對於 Codex
harness 會話，會請求批准發送相關的 Codex 反饋捆綁包。
請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics) 以了解隱私模型和群組聊天行為。

僅當您特別想要針對目前附加的執行緒上傳 Codex 反饋，而不需要完整的 Gateway
診斷捆綁包時，才使用 `/codex diagnostics [note]`。

### 在本機檢查 Codex 執行緒

檢查不良 Codex 執行的最快方法通常是直接開啟原生 Codex
執行緒：

```bash
codex resume <thread-id>
```

從已完成的 `/diagnostics` 回覆、`/codex binding` 或
`/codex threads [filter]` 取得執行緒 ID。

關於上傳機制和執行時層級診斷邊界，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證依以下順序選擇：

1. 代理程式的已排序 OpenAI 驗證設定檔，最好在
   `auth.order.openai` 之下。現有的 `openai-codex:*` 設定檔 ID 保持有效。
2. 該代理程式的 Codex 首頁中現有的 app-server 帳戶。
3. 僅針對本機 stdio app-server 啟動，當不存在 app-server 帳戶且仍需
   OpenAI 驗證時，首先使用 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 看到 ChatGPT 訂閱風格的 Codex 驗證設定檔時，它會從產生的 Codex 子行程中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這樣可以
讓 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，而避免讓原生 Codex app-server 轉場意外透過 API 計費。
明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後備使用 app-server
登入，而不是繼承的子行程環境。WebSocket app-server 連線
不會接收 Gateway 環境 API 金鑰後備；請使用明確的驗證設定檔或
遠端 app-server 自己的帳戶。

如果訂閱配置檔案達到 Codex 使用限制，OpenClaw 會在 Codex 回報時記錄重置時間，並針對相同的 Codex 執行嘗試下一個有序的認證配置檔案。當重置時間過後，訂閱配置檔案將再次變為符合資格，而無需變更所選的 `openai/gpt-*` 模型或 Codex 執行環境。

對於本機 stdio 應用程式伺服器啟動，OpenClaw 會將 `CODEX_HOME` 設定為每個代理程式專屬的目錄，因此 Codex 設定、認證/帳戶檔案、外掛快取/資料和原生執行緒狀態預設不會讀取或寫入操作員個人的 `~/.codex`。OpenClaw 會保留正常的程序 `HOME`；Codex 執行的子程序仍然可以找到使用者主目錄設定和權杖，而 Codex 可能會發現共享的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 項目。

如果部署需要額外的環境隔離，請將這些變數新增到 `appServer.clearEnv`：

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

`appServer.clearEnv` 僅影響產生的 Codex 應用程式伺服器子程序。OpenClaw 會在本機啟動正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每個代理程式專屬，而 `HOME` 保持繼承狀態，以便子程序可以使用正常的使用者主目錄狀態。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開複製 Codex 原生工作區操作的動態工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。大多數其餘的
OpenClaw 整合工具（如訊息傳遞、媒體、cron、瀏覽器、節點、
閘道、`heartbeat_respond` 和 `web_search`）都可透過 Codex 工具
搜尋在 `openclaw` 命名空間下取得，使初始模型語境
保持較小。
`sessions_yield` 和僅限訊息工具的來源回覆會保持直接，因為
這些是輪次控制合約。`sessions_spawn` 保持可搜尋，因此 Codex 的
原生 `spawn_agent` 仍是主要的 Codex 子代理介面，而明確的
OpenClaw 或 ACP 委派仍可透過 `openclaw` 動態
工具命名空間使用。Heartbeat 協作指示會告知 Codex 在結束 heartbeat 輪次之前搜尋
`heartbeat_respond`（如果該工具尚未載入）。

僅當連接到無法搜尋延遲動態工具的自訂 Codex
app-server，或在偵錯完整工具
承載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具語境中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex app-server 輪次中省略的其他 OpenClaw 動態工具名稱。      |
| `codexPlugins`             | 停用           | 原生 Codex 外掛/應用程式支援，適用於已遷移的來源安裝精選外掛。      |

支援的 `appServer` 欄位：

| 欄位                          | 預設值                                        | 含義                                                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                   | `"stdio"`                                     | `"stdio"` 啟動 Codex；`"websocket"` 連接到 `url`。                                                                                                                                                                                                           |
| `command`                     | 受管理的 Codex 二進位檔                       | 用於 stdio 傳輸的可執行檔。保持未設定以使用受管理的二進位檔；僅在需要明確覆寫時設定。                                                                                                                                                                        |
| `args`                        | `["app-server", "--listen", "stdio://"]`      | 用於 stdio 傳輸的引數。                                                                                                                                                                                                                                      |
| `url`                         | 未設定                                        | WebSocket 應用伺服器 URL。                                                                                                                                                                                                                                   |
| `authToken`                   | 未設定                                        | 用於 WebSocket 傳輸的 Bearer token。                                                                                                                                                                                                                         |
| `headers`                     | `{}`                                          | 額外的 WebSocket 標頭。                                                                                                                                                                                                                                      |
| `clearEnv`                    | `[]`                                          | 在 OpenClaw 建構其繼承環境後，從產生的 stdio 應用伺服器進程中移除的額外環境變數名稱。OpenClaw 會針對本機啟動保留每個代理程式的 `CODEX_HOME` 和繼承的 `HOME`。                                                                                                |
| `codeModeOnly`                | `false`                                       | 選擇啟用 Codex 的僅程式碼模式工具介面。OpenClaw 動態工具仍會向 Codex 註冊，以便巢狀 `tools.*` 呼叫透過應用伺服器 `item/tool/call` 橋接器傳回。                                                                                                               |
| `requestTimeoutMs`            | `60000`                                       | 應用伺服器控制平面呼叫的逾時時間。                                                                                                                                                                                                                           |
| `turnCompletionIdleTimeoutMs` | `60000`                                       | 在 Codex 接受一個輪次或在輪次範圍的應用伺服器請求之後，OpenClaw 等待 `turn/completed` 時的靜默視窗。如果工具後或僅狀態合成階段緩慢，請調高此值。                                                                                                             |
| `mode`                        | `"yolo"`，除非本機 Codex 需求不允許 YOLO      | 用於 YOLO 或守護者審閱執行的預設設定。省略 `danger-full-access`、`never` 核准或 `user` 審閱者的本機 stdio 需求，會將隱含的預設守護者設為生效。                                                                                                               |
| `approvalPolicy`              | `"never"` 或允許的守護者核准原則              | 傳送至執行緒啟動/恢復/回合的原生 Codex 核可原則。如果允許，Guardian 預設值偏好 `"on-request"`。                                                                                                                                                              |
| `sandbox`                     | `"danger-full-access"` 或允許的 guardian 沙箱 | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。如果允許，Guardian 預設值偏好 `"workspace-write"`，否則為 `"read-only"`。當 OpenClaw 沙箱處於啟用狀態時，`danger-full-access` 回合使用衍生自 OpenClaw 沙箱出口設定的網路存取權限來執行 Codex `workspace-write`。 |
| `approvalsReviewer`           | `"user"` 或允許的 guardian 審閱者             | 使用 `"auto_review"` 讓 Codex 在允許時審閱原生核可提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是舊版別名。                                                                                                                           |
| `serviceTier`                 | 未設定                                        | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 要求彈性處理，`null` 清除覆寫，且舊版 `"fast"` 會被接受為 `"priority"`。                                                                                                           |

OpenClaw 擁有的動態工具呼叫與 `appServer.requestTimeoutMs` 獨立受限：Codex `item/tool/call` 要求預設使用 30 秒的 OpenClaw 看門狗。正數的單次呼叫 `timeoutMs` 引數會延長或縮短該特定工具預算。`image_generate` 工具在工具呼叫未提供自己的逾時時使用 `agents.defaults.imageGenerationModel.timeoutMs`，否則使用 120 秒的影像產生預設值。媒體理解 `image` 工具使用 `tools.media.image.timeoutSeconds` 或其 60 秒媒體預設值。動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便回合能繼續進行，而不是讓會話處於 `processing` 狀態。

在 Codex 接受一次輪次，且 OpenClaw 回應了一次輪次範圍的應用程式伺服器請求後，harness 預期 Codex 會推進當前輪次的進度，並最終以 `turn/completed` 完成原生輪次。如果應用程式伺服器安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以便後續的聊天訊息不會被排在過時的原生輪次後面。針對同一輪次的大多數非終止通知會解除該短暫看門狗的設定，因為 Codex 已證明該輪次仍存活；原始 `custom_tool_call_output` 完成會維持短暫的工具後看門狗啟用狀態，因為它們是輪次範圍的工具結果傳遞。全域應用程式伺服器通知（例如速率限制更新）不會重置輪次閒置進度。已完成的 `agentMessage` 項目和工具前的原始助手 `rawResponseItem/completed` 項目會啟動助手輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下安靜下來，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後的原始助手進度會持續等待 `turn/completed` 或終止看門狗。逾時診斷包括最後一個應用程式伺服器通知方法，而對於原始助手回應項目，則包括項目類型、角色、ID 和有限的助手文字預覽。

環境變數覆寫仍可用於本地測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或是使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。對於可重複的部署，建議使用設定，因為這能將外掛行為與 Codex harness 設定的其餘部分保持在同一個已審查的檔案中。

## 原生 Codex 外掛

原生 Codex 插件支援在與 OpenClaw 韁體回合相同的 Codex 執行緒中，使用 Codex app-server 自己的應用程式和插件功能。OpenClaw 不會將 Codex 插件轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex 韁體的階段。它對 PI 執行、正常的 OpenAI 提供者執行、ACP 對話綁定或其他韁體沒有影響。

最少的遷移配置：

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

當 OpenClaw 建立 Codex 韁體階段或替換過時的 Codex 執行緒綁定時，會計算執行緒應用程式配置。它不會在每個回合中重新計算。更改 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex 韁體階段使用更新後的應用程式集啟動。

如需瞭解遷移資格、應用程式清單、破壞性操作原則、引導以及原生插件診斷，請參閱[原生 Codex 插件](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用

電腦使用有其專屬的設定指南：[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡而言之：OpenClaw 不提供桌面控制應用程式本身，也不執行桌面動作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式回合期間擁有原生 MCP 工具呼叫。

## 執行時邊界

Codex 韁體僅更改底層的嵌入式代理執行器。

- 支援 OpenClaw 動態工具。Codex 會要求 OpenClaw 執行這些工具，因此 OpenClaw 仍在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生應用程式工具由 Codex 擁有。OpenClaw 可以透過支援的中繼觀察或阻擋選定的原生事件，但它不會重寫原生工具引數。
- 除非作用中的 OpenClaw 上下文引擎宣告 `ownsCompaction: true`，否則 Codex 擁有原生壓縮。OpenClaw 會保留對話紀錄鏡像，用於通道歷史記錄、搜尋、`/new`、`/reset` 以及未來的模型或韁體切換。
- 媒體產生、媒體理解、TTS、審核和訊息工具輸出會繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的逐字稿工具結果，而非
  Codex 原生工具結果記錄。

關於 Hook 層、支援的 V1 介面、原生權限處理、佇列
引導、Codex 反饋上傳機制和壓縮細節，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未顯示為正常的 `/model` 提供者：** 對於
新設定來說，這是預期行為。請選取 `openai/gpt-*` 模型，啟用
`plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除
`codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保模型參照在
官方 OpenAI 提供者上為 `openai/gpt-*`，且已安裝並啟用 Codex 外掛程式。如果您在測試時需要嚴格的證明，請設定提供者或
模型 `agentRuntime.id: "codex"`。強制的 Codex 執行時期會失敗，而不會
退回至 PI。

**OpenAI Codex 執行時期退回到 API-key 路徑：** 請收集顯示模型、執行時期、選取的提供者和失敗的
刪減後閘道摘要。
請要求受影響的合作物件在其 OpenClaw 主機上執行此唯讀指令：

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

有用的摘要通常包含 `openai/gpt-5.5` 或 `openai/gpt-5.4`、
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、
`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或
`No API key` 結果。修正後的執行應顯示 `openai-codex` OAuth
路徑，而非純 OpenAI API-key 失敗。

**舊版 `openai-codex/*` 設定仍然存在：** 請執行 `openclaw doctor --fix`。
Doctor 會將舊版模型參照重寫為 `openai/*`，移除過時的工作階段和
全代理程式執行時期釘選，並保留現有的 auth-profile 覆寫。

**應用程式伺服器被拒絕：** 請使用 Codex 應用程式伺服器 `0.125.0` 或更新版本。
相同版本的預發行版或建置後綴版本（例如
`0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 會測試
穩定的 `0.125.0` 協議底限。

**`/codex status` 無法連線：** 請檢查內建的 `codex` 外掛程式是否
已啟用、`plugins.allow` 在設定允許清單時是否包含它，以及
任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索速度過慢：** 請降低
`plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`、
標頭，以及遠端應用程式伺服器是否說明相同的 Codex 應用程式伺服器
協議版本。

**非 Codex 模型使用 PI：** 這是預期的行為，除非供應商或模型執行階段
策略將其路由到另一個 harness。純非 OpenAI 供應商參照在 `auto` 模式下
會保持在正常的供應商路徑上。

**已安裝 Computer Use 但工具未執行：** 請從新的工作階段檢查
`/codex computer-use status`。如果工具回報
`Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果問題持續，請重新啟動
閘道以清除過時的原生掛載註冊。請參閱
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
- [外掛程式掛載](/zh-Hant/plugins/hooks)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [狀態](/zh-Hant/cli/status)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
