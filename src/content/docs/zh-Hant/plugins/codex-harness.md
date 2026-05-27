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

當未啟用 OpenClaw 沙箱時，OpenClaw 會在啟用 Codex 原生程式碼模式的情況下啟動 Codex app-server 執行緒，同時預設關閉僅程式碼模式。這讓 Codex 原生工作區和程式碼功能保持可用，同時 OpenClaw 動態工具繼續透過 app-server `item/tool/call` 橋接器運作。啟用的 OpenClaw 沙箱和受限制的工具政策會完全停用原生程式碼模式，除非您選擇採用實驗性的沙箱 exec-server 路徑。

這項 Codex 原生功能與 [OpenClaw code mode](/zh-Hant/reference/code-mode) 是分開的，後者是一個適用於通用 OpenClaw 執行的選用 QuickJS-WASI 執行階段，具有不同的 `exec` 輸入形狀。

關於更廣泛的模型/提供者/執行階段劃分，請從 [Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡而言之：`openai/gpt-5.5` 是模型參照，`codex` 是執行階段，而 Telegram、Discord、Slack 或其他通道則保持為通訊介面。

## 需求

- 具備可用的內建 `codex` 外掛程式之 OpenClaw。
- 如果您的設定使用 `plugins.allow`，請包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。內建外掛程式預設會管理相容的 Codex app-server 二進位檔，因此在 `PATH` 上的本機 `codex` 指令不會影響正常的 harness 啟動。
- 透過 `openclaw models auth login --provider openai-codex`、代理程式 Codex home 中的 app-server 帳戶，或明確的 Codex API 金鑰認證設定檔提供的 Codex 認證。

關於認證優先順序、環境隔離、自訂 app-server 指令、模型探索以及所有設定欄位，請參閱 [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 快速開始

大多數想在 OpenClaw 中使用 Codex 的使用者都希望採用此路徑：使用 ChatGPT/Codex 訂閱登入，啟用內建的 `codex` 外掛程式，並使用標準的 `openai/gpt-*` 模型參照。

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

變更外掛程式設定後請重新啟動閘道。如果現有的對話已有工作階段，請在測試執行時變更前使用 `/new` 或 `/reset`，這樣下一輪就會從目前的設定解析此線束。

## 設定

快速入門設定是最小可行的 Codex 線束設定。在 OpenClaw 設定中設定 Codex 線束選項，並僅使用 CLI 進行 Codex 驗證：

| 需要                                | 設定                                                                    | 位置                           |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 啟用線束                            | `plugins.entries.codex.enabled: true`                                   | OpenClaw 設定                  |
| 保留允許清單中的外掛程式安裝        | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 設定                  |
| 透過 Codex 路由 OpenAI 代理程式輪次 | 將 `agents.defaults.model` 或 `agents.list[].model` 設為 `openai/gpt-*` | OpenClaw 代理程式設定          |
| 使用 Codex OAuth 登入               | `openclaw models auth login --provider openai-codex`                    | CLI 驗證設定檔                 |
| 為 Codex 執行新增 API 金鑰備援      | 在 `auth.order.openai` 中列出訂閱驗證之後的 `openai:*` API 金鑰設定檔   | CLI 驗證設定檔 + OpenClaw 設定 |
| 當 Codex 無法使用時關閉並失敗       | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者設定       |
| 使用直接 OpenAI API 流量            | 搭配正常 OpenAI 驗證的提供者或模型 `agentRuntime.id: "pi"`              | OpenClaw 模型/提供者設定       |
| 調整應用程式伺服器行為              | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛程式設定             |
| 啟用原生 Codex 外掛程式應用程式     | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛程式設定             |
| 啟用 Codex Computer Use             | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛程式設定             |

針對 Codex 支援的 OpenAI 代理程式輪次使用 `openai/gpt-*` 模型參照。偏好使用 `auth.order.openai` 進行訂閱優先/API 金鑰備援排序。現有的 `openai-codex:*` 驗證設定檔和 `auth.order.openai-codex` 仍然有效，但請勿撰寫新的 `openai-codex/gpt-*` 模型參照。

除非選取的內容引擎擁有壓縮權限，否則請勿在 Codex 支援的代理上設定 `compaction.model` 或 `compaction.provider`。若沒有擁有的內容引擎，Codex 會透過其原生 app-server 執行緒狀態進行壓縮，因此 OpenClaw 會在執行時忽略這些本機摘要器覆寫，並在代理使用 Codex 時由 `openclaw doctor --fix` 將其移除。

Lossless 仍受支援為內容引擎。透過 `plugins.slots.contextEngine: "lossless-claw"` 和 `plugins.entries.lossless-claw.config.summaryModel` 進行設定，而非透過 `agents.defaults.compaction.provider`。當 Codex 為作用中的執行時期時，`openclaw doctor --fix` 會將舊的 `compaction.provider: "lossless-claw"` 結構遷移至 Lossless 內容引擎插槽。

原生 Codex app-server harness 支援需要預先提示組裝的內容引擎。包括 `codex-cli` 在內的泛型 CLI 後端並不提供該主機功能。

當作用中的內容引擎回報 `ownsCompaction: true` 時，`/compact` 會執行該引擎的壓縮生命週期並使綁定的 Codex app-server 執行緒失效。下一個 Codex 回合會啟動一個全新的後端執行緒並從內容引擎重新補充它，而不是在引擎擁有的語意摘要之上分層 Codex 原生壓縮。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在該結構中，兩個設定檔仍會透過 Codex 執行 `openai/gpt-*` 代理回合。API 金鑰僅是驗證備援，而非切換至 PI 或純 OpenAI Responses 的請求。

本頁其餘部分涵蓋使用者必須選擇的常見變體：部署結構、失敗封閉路由、監護人核准原則、原生 Codex 外掛程式，以及電腦使用方式。如需完整的選項清單、預設值、列舉、探索、環境隔離、逾時和 app-server 傳輸欄位，請參閱 [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 驗證 Codex 執行時期

在您預期使用 Codex 的聊天中使用 `/status`。Codex 支援的 OpenAI 代理回合會顯示：

```text
Runtime: OpenAI Codex
```

然後檢查 Codex app-server 狀態：

```text
/codex status
/codex models
```

`/codex status` 回報 app-server 連線性、帳戶、速率限制、MCP
伺服器和技能。`/codex models` 列出 harness 和帳戶的即時 Codex app-server 目錄。如果 `/status` 結果令人意外，請參閱
[疑難排解](#troubleshooting)。

## 路由與模型選擇

將提供者參照與執行時期策略分開：

- 使用 `openai/gpt-*` 透過 Codex 進行 OpenAI agent 輪次。
- 請勿在組態中使用 `openai-codex/gpt-*`。執行 `openclaw doctor --fix` 以
  修復舊版參照和過期的會話路由釘選。
- `agentRuntime.id: "codex"` 對於正常的 OpenAI 自動模式是可選的，但在
  若 Codex 無法使用時部署應失敗封閉的情況下很有用。
- `agentRuntime.id: "pi"` 當有此意圖時，選擇提供者或模型進行直接 PI 行為。
- `/codex ...` 從聊天控制原生 Codex app-server 對話。
- ACP/acpx 是一條獨立的外部 harness 路徑。僅在使用者要求
  ACP/acpx 或外部 harness 配接器時使用。

常見指令路由：

| 使用者意圖                              | 使用                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加目前聊天                            | `/codex bind [--cwd <path>]`                                                                          |
| 恢復現有的 Codex 執行緒                 | `/codex resume <thread-id>`                                                                           |
| 列出或篩選 Codex 執行緒                 | `/codex threads [filter]`                                                                             |
| 列出原生 Codex 外掛程式                 | `/codex plugins list`                                                                                 |
| 啟用或停用已設定的原生 Codex 外掛程式   | `/codex plugins enable <name>`， `/codex plugins disable <name>`                                      |
| 附加配對節點上的現有 Codex CLI 工作階段 | `/codex sessions --host <node> [filter]`，然後 `/codex resume <session-id> --host <node> --bind here` |
| 僅傳送 Codex 意見回饋                   | `/codex diagnostics [note]`                                                                           |
| 啟動 ACP/acpx 任務                      | ACP/acpx 工作階段指令，而非 `/codex`                                                                  |

| 使用案例                                     | 設定                                                        | 驗證                                   | 備註                      |
| -------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 具有原生 Codex 執行時期的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上已啟用的 `codex` 外掛程式                | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑                  |
| 如果 Codex 無法使用則失敗封閉                | 提供者或模型 `agentRuntime.id: "codex"`                     | 輪次失敗而非 PI 備援                   | 僅用於 Codex 專用部署     |
| 透過 PI 直接傳送 OpenAI API-key 流量         | 提供者或模型 `agentRuntime.id: "pi"` 以及標準的 OpenAI 認證 | `/status` 顯示 PI 執行時               | 僅在有意使用 PI 時使用    |
| 舊版配置                                     | `openai-codex/gpt-*`                                        | `openclaw doctor --fix` 會重寫它       | 請勿以此方式撰寫新配置    |
| ACP/acpx Codex 配接器                        | ACP `sessions_spawn({ runtime: "acp" })`                    | ACP 任務/工作階段狀態                  | 與原生 Codex harness 分離 |

`agents.defaults.imageModel` 遵循相同的前綴拆分。對於標準的 OpenAI 路由請使用 `openai/gpt-*`，而當圖像理解應透過有界的 Codex app-server 輪次執行時，則僅使用 `codex/gpt-*`。請勿使用 `openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

當所有 OpenAI agent 輪次預設應使用 Codex 時，請使用快速入門配置。

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

### 混合提供者部署

此配置保留 Claude 作為預設 agent，並新增一個具名的 Codex agent：

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

使用此配置時，`main` agent 使用其正常的提供者路徑，而 `codex` agent 則使用 Codex app-server。

### 故障關閉 (Fail-closed) Codex 部署

對於 OpenAI agent 輪次，當可用隨附外掛時，`openai/gpt-*` 已解析為 Codex。當您需要書面的故障關閉規則時，請新增明確的執行時原則：

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

在強制使用 Codex 的情況下，如果 Codex 外掛已停用、app-server 太舊或 app-server 無法啟動，OpenClaw 會提早失敗。

## App-server 原則

預設情況下，此外掛會在本地使用 stdio 傳輸啟動 OpenClaw 的受管理 Codex 二進位檔。僅當您有意執行不同的可執行檔時，才設定 `appServer.command`。僅當 app-server 已在其他位置執行時，才使用 WebSocket 傳輸：

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

本機 stdio 應用程式伺服器工作階段預設為受信任的本機操作員姿態：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該
隱含 YOLO 姿態，OpenClaw 會改為選擇允許的 guardian 權限。
當 OpenClaw 沙盒對該工作階段啟用時，OpenClaw 會針對該
輪次停用 Codex 原生 Code Mode、使用者 MCP 伺服器和應用程式支援的外掛程式執行，而不是依賴 Codex 主機端沙盒。當一般的 exec/process 工具可用時，Shell 存取權會透過 OpenClaw 沙盒支援的動態工具（例如 `sandbox_exec` 和
`sandbox_process`）公開。

當您希望在沙盒逃逸或額外權限之前進行 Codex 原生自動審查時，請使用 guardian 模式：

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

Guardian 模式會擴展為 Codex 應用程式伺服器核准，通常為
`approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和
`sandbox: "workspace-write"`（當本機需求允許這些值時）。

有關每個應用程式伺服器欄位、驗證順序、環境隔離、探索和
逾時行為，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

內建外掛程式會在任何支援 OpenClaw 文字指令的頻道上，將 `/codex` 註冊為斜線指令。

常見形式：

- `/codex status` 會檢查應用程式伺服器連線、模型、帳戶、速率限制、
  MCP 伺服器和技能。
- `/codex models` 會列出即時的 Codex 應用程式伺服器模型。
- `/codex threads [filter]` 會列出最近的 Codex 應用程式伺服器執行緒。
- `/codex resume <thread-id>` 會將目前的 OpenClaw 工作階段附加至
  現有的 Codex 執行緒。
- `/codex compact` 會要求 Codex 應用程式伺服器壓縮附加的執行緒。
- `/codex review` 會針對附加的執行緒啟動 Codex 原生審查。
- `/codex diagnostics [note]` 會在針對附加的執行緒傳送 Codex 回饋之前
  詢問。
- `/codex account` 會顯示帳戶和速率限制狀態。
- `/codex mcp` 會列出 Codex 應用程式伺服器 MCP 伺服器狀態。
- `/codex skills` 會列出 Codex 應用程式伺服器技能。

對於大多數支援報告，請在發生錯誤的對話中從 `/diagnostics [note]` 開始。它會建立一個 Gateway 診斷報告，並對於 Codex harness 會話，詢問是否發送相關的 Codex 反饋套件。有關隱私模型和群組聊天行為，請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics)。

僅當您特別需要為目前附加的執行緒上傳 Codex 反饋，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本地檢查 Codex 執行緒

檢查錯誤的 Codex 執行最快的方法通常是直接開啟原生 Codex 執行緒：

```bash
codex resume <thread-id>
```

從完成的 `/diagnostics` 回覆、`/codex binding` 或 `/codex threads [filter]` 中獲取執行緒 ID。

有關上傳機制和執行時級別診斷邊界，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

Auth 的選擇順序如下：

1. 代理的有序 OpenAI auth 設定檔，最好位於 `auth.order.openai` 下。現有的 `openai-codex:*` 設定檔 ID 仍然有效。
2. 應用伺服器在該代理的 Codex home 中的現有帳戶。
3. 僅適用於本地 stdio 應用伺服器啟動，當沒有應用伺服器帳戶且仍需要 OpenAI auth 時，先 `CODEX_API_KEY`，然後 `OPENAI_API_KEY`。

當 OpenClaw 發現 ChatGPT 訂閱類型的 Codex auth 設定檔時，它會從產生的 Codex 子進程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。這確保 Gateway 級別的 API 金鑰可用於嵌入或直接 OpenAI 模型，而不會意外地讓原生 Codex 應用伺服器輪次通過 API 計費。明確的 Codex API 金鑰設定檔和本地 stdio 環境金鑰回退使用應用伺服器登入，而不是繼承的子進程環境。WebSocket 應用伺服器連線不會收到 Gateway 環境 API 金鑰回退；請使用明確的 auth 設定檔或遠端應用伺服器自己的帳戶。

如果訂閱配置檔案達到 Codex 使用限制，當 Codex 回報時，OpenClaw 會記錄重設時間，並嘗試同一個 Codex 執行的下一個排序驗證配置檔案。當重設時間過後，訂閱配置檔案再次變為符合資格，而不會變更所選的 `openai/gpt-*` 模型或 Codex 執行階段。

對於本機 stdio 應用程式伺服器啟動，OpenClaw 會將 `CODEX_HOME` 設定為每個代理程式的目錄，因此 Codex 配置、驗證/帳戶檔案、外掛程式快取/資料和原生執行緒狀態預設不會讀取或寫入操作員的個人 `~/.codex`。OpenClaw 會保留正常的程序 `HOME`；Codex 執行的子程序仍然可以找到使用者主目錄配置和權杖，且 Codex 可能會發現共用的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 項目。

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

`appServer.clearEnv` 僅影響產生的 Codex 應用程式伺服器子程序。OpenClaw 會在本機啟動正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每個代理程式專屬，而 `HOME` 保持繼承，以便子程序可以使用正常的使用者主目錄狀態。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區操作的動態工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。大多數剩餘的
OpenClaw 整合工具，例如訊息傳遞、媒體、cron、瀏覽器、節點、
閘道、`heartbeat_respond` 和 `web_search`，都可以透過 `openclaw` 命名空間下的 Codex 工具
搜尋來取得，以保持初始模型內容較小。
`sessions_yield` 和僅限訊息工具的來源回覆保持直接，因為
這些是輪次控制合約。`sessions_spawn` 保持可搜尋，因此 Codex 的
原生 `spawn_agent` 仍是主要的 Codex 子代理介面，而明確的
OpenClaw 或 ACP 委派仍然可透過 `openclaw` 動態
工具命名空間使用。Heartbeat 協作指示會告訴 Codex 在工具尚未載入時，
在結束 heartbeat 輪次之前先搜尋 `heartbeat_respond`。

僅在連接到無法搜尋延遲動態工具的自訂 Codex
app-server 或除錯完整工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具內容中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex app-server 輪次中省略的其他 OpenClaw 動態工具名稱。      |
| `codexPlugins`             | disabled       | 對已遷移的來源安裝策展外掛的原生 Codex 外掛/應用程式支援。          |

支援的 `appServer` 欄位：

| 欄位                                          | 預設值                                    | 含義                                                                                                                                                                                                                                                  |
| --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                 | `"stdio"` 會產生 Codex；`"websocket"` 會連接到 `url`。                                                                                                                                                                                                |
| `command`                                     | 受管理的 Codex 二進位檔                   | 用於 stdio 傳輸的可執行檔。保持未設定以使用受管理的二進位檔；僅在明確覆寫時設定。                                                                                                                                                                     |
| `args`                                        | `["app-server", "--listen", "stdio://"]`  | stdio 傳輸的引數。                                                                                                                                                                                                                                    |
| `url`                                         | 未設定                                    | WebSocket 應用伺服器 URL。                                                                                                                                                                                                                            |
| `authToken`                                   | 未設定                                    | WebSocket 傳輸的持有人令牌 (Bearer token)。                                                                                                                                                                                                           |
| `headers`                                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                                                                                                               |
| `clearEnv`                                    | `[]`                                      | 在 OpenClaw 建構繼承環境後，從產生的 stdio 應用伺服器程序中移除的額外環境變數名稱。OpenClaw 會針對本機啟動保留每個代理程式的 `CODEX_HOME` 和繼承的 `HOME`。                                                                                           |
| `codeModeOnly`                                | `false`                                   | 選擇啟用 Codex 僅限程式碼模式的工具介面。OpenClaw 動態工具仍向 Codex 註冊，因此巢狀 `tools.*` 呼叫會透過應用伺服器 `item/tool/call` 橋接器傳回。                                                                                                      |
| `requestTimeoutMs`                            | `60000`                                   | 應用伺服器控制平面呼叫的逾時時間。                                                                                                                                                                                                                    |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                   | 在 Codex 接受一輪或在一輪範圍的應用伺服器請求後，OpenClaw 等待 `turn/completed` 時的安靜時間視窗。如果工具後或僅狀態的合成階段緩慢，請調高此值。                                                                                                      |
| `postToolRawAssistantCompletionIdleTimeoutMs` | 未設定                                    | 在工具移交後使用的完成閒置防護，當 Codex 發出原始助理完成或進度但未傳送 `turn/completed` 時。未設定時預設為助理完成閒置逾時。將此用於受信任或繁重的工作負載，其中工具後合成可以合法地保持安靜的時間長於最終助理釋放預算。                             |
| `mode`                                        | `"yolo"`，除非本機 Codex 需求不允許 YOLO  | 針對 YOLO 或守護者審核執行的預設。省略 `danger-full-access`、`never` 核准或 `user` 審核者的本機 stdio 要求，會使隱含的預設守護者生效。                                                                                                                |
| `approvalPolicy`                              | `"never"` 或允許的守護者核准政策          | 傳送至執行緒啟動/恢復/回合的原生 Codex 核准政策。當允許時，守護者預設值偏好 `"on-request"`。                                                                                                                                                          |
| `sandbox`                                     | `"danger-full-access"` 或允許的守護者沙箱 | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。當允許時，守護者預設值偏好 `"workspace-write"`，否則為 `"read-only"`。當 OpenClaw 沙箱處於啟用狀態時，`danger-full-access` 回合會使用衍生自 OpenClaw 沙箱出口設定之網路存取權的 Codex `workspace-write`。 |
| `approvalsReviewer`                           | `"user"` 或允許的守護者審核者             | 使用 `"auto_review"` 讓 Codex 在允許時審核原生核准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍為舊版別名。                                                                                                                    |
| `serviceTier`                                 | unset                                     | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆寫，且舊版 `"fast"` 會被接受為 `"priority"`。                                                                                                    |
| `experimental.sandboxExecServer`              | `false`                                   | 預覽選用功能，向 Codex app-server 0.132.0 或更新版本註冊由 OpenClaw 沙箱支援的 Codex 環境，以便原生 Codex 執行可在作用中的 OpenClaw 沙箱內執行。                                                                                                      |

OpenClaw 擁有的動態工具呼叫會獨立於 `appServer.requestTimeoutMs` 進行邊界限制：Codex `item/tool/call` 請求預設使用 30 秒的 OpenClaw 看門狗。正數的單次呼叫 `timeoutMs` 引數會延長或縮短該特定工具的預算。`image_generate` 工具會在工具呼叫未提供自己的逾時時使用 `agents.defaults.imageGenerationModel.timeoutMs`，否則使用 120 秒的影像生成預設值。媒體理解的 `image` 工具會使用 `tools.media.image.timeoutSeconds` 或其 60 秒的媒體預設值。動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便對話能繼續進行，而不是讓會話處於 `processing` 狀態。

在 Codex 接受輪次，且 OpenClaw 回應輪次範圍的應用程式伺服器請求後，harness 預期 Codex 會推動當前輪次的進度，並最終使用 `turn/completed` 完成原生輪次。如果應用程式伺服器靜默 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以便後續聊天訊息不會排在過時的原生輪次之後。對於同一輪次，大多數非終端通知會解除該短期看門狗，因為 Codex 已證明該輪次仍然活躍；原始 `custom_tool_call_output` 完成會讓短期工具後看門狗保持啟用，因為它們是輪次範圍的工具結果移交。全域應用程式伺服器通知（例如速率限制更新）不會重置輪次閒置進度。已完成的 `agentMessage` 項目和工具前原始助理 `rawResponseItem/completed` 項目會啟用助理輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下變得靜默，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後原始助理進度會繼續等待 `turn/completed`，同時完成閒置防護保持啟用；該防護在經過配置時使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否則回退到助理完成閒置逾時。逾時診斷包含最後一個應用程式伺服器通知方法，而對於原始助理回應項目，則包含項目類型、角色、ID 和有限的助理文字預覽。

環境變數覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用設定，因為這能將外掛程式行為與 Codex harness 設定的其餘部分保留在同一個已審閱的檔案中。

## 原生 Codex 外掛程式

原生 Codex 外掛程式支援使用 Codex 應用程式伺服器自身的應用程式和外掛程式功能，功能位於與 OpenClaw harness 輪次相同的 Codex 執行緒中。OpenClaw 不會將 Codex 外掛程式轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的工作階段。它對 PI 執行、正常的 OpenAI 提供者執行、ACP 對話綁定或其他 harness 沒有影響。

最小遷移設定：

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

執行緒應用程式設定是在 OpenClaw 建立 Codex harness 工作階段或替換過期的 Codex 執行緒綁定時計算的。它不會在每次輪次時重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 工作階段以更新後的應用程式集啟動。

關於遷移資格、應用程式清單、破壞性動作策略、引導以及原生外掛程式診斷，請參閱 [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用 (Computer Use)

電腦使用涵蓋在其專屬的設定指南中：[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡單來說：OpenClaw 不提供桌面控制應用程式，也不會自行執行桌面動作。它會準備 Codex 應用程式伺服器，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式輪次期間擁有原生 MCP 工具呼叫。

## 執行時期邊界

Codex harness 僅變更低層級的嵌入式代理程式執行器。

- 支援 OpenClaw 動態工具。Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 仍保持在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生應用程式工具由 Codex 擁有。OpenClaw 可以透過支援的中繼觀察或封鎖選取的原生事件，但它不會重寫原生工具引數。
- 除非作用中的 OpenClaw 內容引擎宣告 `ownsCompaction: true`，否則 Codex 擁有原生壓縮。OpenClaw 會保留對話紀錄鏡像以用於通道歷程、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。
- 媒體生成、媒體理解、TTS、審核和訊息工具輸出會繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的文字紀錄工具結果，而非
  Codex 原生工具結果記錄。

若要了解 Hook 層、支援的 V1 介面、原生權限處理、佇列
引導、Codex 反饋上傳機制以及壓縮詳情，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未顯示為正常的 `/model` 提供者：** 對於
新組態來說這是預期的。選擇一個 `openai/gpt-*` 模型，啟用
`plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除
`codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保模型參考是
官方 OpenAI 提供者上的 `openai/gpt-*`，並且 Codex 外掛程式已
安裝並啟用。如果您在測試時需要嚴格的證明，請設定提供者或
模型 `agentRuntime.id: "codex"`。強制執行的 Codex 執行時會失敗，而不是
退回到 PI。

**OpenAI Codex 執行時退回到 API 金鑰路徑：** 收集一個已編輯
的閘道摘要，其中顯示模型、執行時、選定的提供者和失敗。
請要求受影響的協作者在其 OpenClaw 主機上執行此唯讀指令：

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

有用的摘要通常包括 `openai/gpt-5.5` 或 `openai/gpt-5.4`、
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、
`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或
`No API key` 結果。修正後的執行應顯示 `openai-codex` OAuth
路徑，而不是單純的 OpenAI API 金鑰失敗。

**舊版 `openai-codex/*` 組態仍然存在：** 請執行 `openclaw doctor --fix`。
Doctor 會將舊版模型參考重寫為 `openai/*`，移除過時的階段作業和
全代理程式執行時釘選，並保留現有的驗證設定檔覆寫。

**應用程式伺服器被拒絕：**請使用 Codex 應用程式伺服器 `0.125.0` 或更新版本。
同版本的预發布版本或帶有構建後綴的版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 測試的是穩定版 `0.125.0` 協議下限。

**`/codex status` 無法連線：**請檢查內建的 `codex` 外掛程式是否已啟用、`plugins.allow` 在配置了允許清單時是否包含它，以及任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索緩慢：**請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：**請檢查 `appServer.url`、`authToken`、標頭，以及遠端應用程式伺服器是否說明相同的 Codex 應用程式伺服器通訊協定版本。

**非 Codex 模型使用 PI：**除非提供者或模型執行時期原則將其路由到其他 harness，否則這是預期的行為。純非 OpenAI 提供者參照在 `auto` 模式下會保持在正常的提供者路徑上。

**已安裝 Computer Use 但工具未執行：**請從新的工作階段檢查 `/codex computer-use status`。如果工具回報 `Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果問題仍然存在，請重新啟動閘道以清除過時的原生 hook 註冊。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting)。

## 相關

- [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness 執行時期](/zh-Hant/plugins/codex-harness-runtime)
- [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [Agent 執行時期](/zh-Hant/concepts/agent-runtimes)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [OpenAI 提供者](/zh-Hant/providers/openai)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [外掛程式 hooks](/zh-Hant/plugins/hooks)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [狀態](/zh-Hant/cli/status)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
