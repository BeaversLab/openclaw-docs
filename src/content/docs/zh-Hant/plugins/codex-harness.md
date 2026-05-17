---
summary: "透過內建的 Codex app-server harness 執行 OpenClaw 嵌入式 Agent 週期"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

內建的 `codex` 外掛程式讓 OpenClaw 透過 Codex app-server 執行嵌入式 OpenAI Agent 週期，而非使用內建的 PI harness。

當您希望 Codex 掌管底層 agent 工作階段時，請使用 Codex harness：原生執行緒恢復、原生工具接續、原生壓縮以及 app-server 執行。OpenClaw 仍然掌管聊天頻道、工作階段檔案、模型選擇、OpenClaw 動態工具、審核、媒體傳輸以及可見的逐字稿鏡像。

一般設定使用標準的 OpenAI 模型參照，例如 `openai/gpt-5.5`。請勿設定 `openai-codex/gpt-*` 模型參照。請將 OpenAI Agent 的驗證順序置於 `auth.order.openai` 之下；較舊的 `openai-codex:*` 設定檔與 `auth.order.openai-codex` 項目仍支援既有的安裝。

OpenClaw 會啟動 Codex app-server 執行緒，並啟用 Codex 原生程式碼模式與僅程式碼模式。這能將延遲/可搜尋的 OpenClaw 動態工具保留在 Codex 自己的程式碼執行與工具搜尋介面中，而不是在 Codex 之上加上 PI 風格的工具搜尋包裝器。

若要了解更廣泛的模型/提供者/執行時期區分，請從 [Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單來說：`openai/gpt-5.5` 是模型參照，`codex` 是執行時期，而 Telegram、Discord、Slack 或其他通道則保持為通訊介面。

## 需求

- 可用內建 `codex` 外掛程式的 OpenClaw。
- 如果您的設定使用 `plugins.allow`，請包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。內建外掛程式預設會管理相容的 Codex app-server 二進位檔，因此在 `PATH` 上的本機 `codex` 指令不會影響正常的 harness 啟動。
- 透過 `openclaw models auth login --provider openai-codex`、Agent Codex 主目錄中的 app-server 帳戶，或明確的 Codex API 金鑰驗證設定檔提供 Codex 驗證。

若要了解驗證優先順序、環境隔離、自訂 app-server 指令、模型探索以及所有設定欄位，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 快速入門

大多數想要在 OpenClaw 中使用 Codex 的使用者都選擇此路徑：使用 ChatGPT/Codex 訂閱登入，啟用內建的 `codex` 外掛，並使用標準的 `openai/gpt-*` 模型參照。

使用 Codex OAuth 登入：

```bash
openclaw models auth login --provider openai-codex
```

啟用內建的 `codex` 外掛並選擇一個 OpenAI agent 模型：

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

變更外掛設定後請重新啟動閘道。如果現有的對話已經有 session，請在測試執行階段變更前使用 `/new` 或 `/reset`，這樣下一輪才會從目前的設定解析 harness。

## 設定

快速入門設定是最小可運行的 Codex harness 設定。在 OpenClaw 設定中設定 Codex harness 選項，並僅將 CLI 用於 Codex 驗證：

| 需要                                        | 設定                                                                    | 位置                           |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 啟用 harness                                | `plugins.entries.codex.enabled: true`                                   | OpenClaw 設定                  |
| 保留已列入允許清單的外掛安裝                | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 設定                  |
| 透過 Codex 路由 OpenAI agent 輪次           | `agents.defaults.model` 或 `agents.list[].model` 作為 `openai/gpt-*`    | OpenClaw agent 設定            |
| 使用 Codex OAuth 登入                       | `openclaw models auth login --provider openai-codex`                    | CLI 驗證設定檔                 |
| 為 Codex 執行新增 API 金鑰備援              | 在 `auth.order.openai` 中，將 `openai:*` API 金鑰設定檔列在訂閱驗證之後 | CLI 驗證設定檔 + OpenClaw 設定 |
| 當 Codex 無法使用時關閉並失敗 (fail closed) | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者設定       |
| 使用直接的 OpenAI API 流量                  | 使用正常的 OpenAI 驗證的提供者或模型 `agentRuntime.id: "pi"`            | OpenClaw 模型/提供者設定       |
| 調整應用程式伺服器行為                      | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛設定                 |
| 啟用原生 Codex 外掛應用程式                 | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛設定                 |
| 啟用 Codex 電腦使用                         | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛設定                 |

針對由 Codex 支援的 OpenAI agent 週期，請使用 `openai/gpt-*` 模型參照。若要採用「訂閱優先/API 金鑰備援」的排序方式，請優先使用 `auth.order.openai`。現有的 `openai-codex:*` 驗證設定檔與 `auth.order.openai-codex` 仍然有效，但請勿撰寫新的 `openai-codex/gpt-*` 模型參照。

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在此形式下，這兩種設定檔的 `openai/gpt-*` agent 週期仍會透過 Codex 執行。API 金鑰僅作為驗證備援，並非要求切換至 PI 或純 OpenAI Responses。

本頁其餘內容涵蓋使用者必須選擇的常見變體：部署形式、故障封閉式路由、守護者核准政策、原生 Codex 外掛程式，以及電腦使用方式。若需完整的選項列表、預設值、列舉、探索、環境隔離、逾時設定與應用程式伺服器傳輸欄位，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 驗證 Codex 執行時

在您預期使用 Codex 的聊天中使用 `/status`。由 Codex 支援的 OpenAI agent 週期會顯示：

```text
Runtime: OpenAI Codex
```

然後檢查 Codex 應用程式伺服器狀態：

```text
/codex status
/codex models
```

`/codex status` 會回報應用程式伺服器連線、帳戶、速率限制、MCP 伺服器與技能。`/codex models` 會列出 harness 與帳戶的即時 Codex 應用程式伺服器目錄。如果 `/status` 的結果出乎預料，請參閱 [疑難排解](#troubleshooting)。

## 路由與模型選擇

請將提供者參照與執行時期政策分開：

- 針對透過 Codex 的 OpenAI agent 週期，請使用 `openai/gpt-*`。
- 請勿在設定中使用 `openai-codex/gpt-*`。請執行 `openclaw doctor --fix` 以修復舊版參照與過時的會話路由釘選。
- `agentRuntime.id: "codex"` 在一般的 OpenAI 自動模式下為選用項目，但如果部署在 Codex 無法使用時應故障封閉，則此項目很有用。
- 當有意為之時，`agentRuntime.id: "pi"` 會將提供者或模型設為直接 PI 行為。
- `/codex ...` 可從聊天控制原生 Codex 應用程式伺服器對話。
- ACP/acpx 是一條獨立的外部 harness 路徑。僅在使用者要求 ACP/acpx 或外部 harness 配接器時才使用。

常見指令路由：

| 使用者意圖              | 使用                                 |
| ----------------------- | ------------------------------------ |
| 附加目前聊天            | `/codex bind [--cwd <path>]`         |
| 恢復現有的 Codex 執行緒 | `/codex resume <thread-id>`          |
| 列出或篩選 Codex 執行緒 | `/codex threads [filter]`            |
| 僅傳送 Codex 回饋       | `/codex diagnostics [note]`          |
| 啟動 ACP/acpx 任務      | ACP/acpx 工作階段指令，而非 `/codex` |

| 使用案例                                     | 設定                                                      | 驗證                                   | 備註                   |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------- | ---------------------- |
| 具備原生 Codex 執行環境的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上已啟用的 `codex` 外掛程式              | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑               |
| 如果 Codex 無法使用則關閉                    | 提供者或模型 `agentRuntime.id: "codex"`                   | 回合失敗而非退回至 PI                  | 用於僅 Codex 的部署    |
| 透過 PI 導向 OpenAI API 金鑰流量             | 提供者或模型 `agentRuntime.id: "pi"` 及正常的 OpenAI 驗證 | `/status` 顯示 PI 執行環境             | 僅在刻意使用 PI 時使用 |
| 舊版設定                                     | `openai-codex/gpt-*`                                      | `openclaw doctor --fix` 會重寫它       | 請勿以此方式撰寫新設定 |
| ACP/acpx Codex 配接器                        | ACP `sessions_spawn({ runtime: "acp" })`                  | ACP 任務/工作階段狀態                  | 與原生 Codex 駕馭分開  |

`agents.defaults.imageModel` 遵循相同的前綴分割。對正常的 OpenAI 路由使用 `openai/gpt-*`，並僅當圖像理解應透過有界的 Codex 應用程式伺服器回合執行時使用 `codex/gpt-*`。請勿使用 `openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

當所有 OpenAI 代理回合預設應使用 Codex 時，請使用快速入門設定。

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

此設定將 Claude 保留為預設代理，並新增具名 Codex 代理：

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

使用此設定，`main` 代理使用其正常提供者路徑，而 `codex` 代理則使用 Codex 應用程式伺服器。

### 關閉式失敗 Codex 部署

對於 OpenAI 代理回合，當內建外掛程式可用時，`openai/gpt-*` 已解析為 Codex。當您需要書面的關閉式失敗規則時，請新增明確的執行時間政策：

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

強制使用 Codex 後，如果 Codex 外掛程式已停用、應用程式伺服器過舊或應用程式伺服器無法啟動，OpenClaw 將會提早失敗。

## App-server 原則

根據預設，此外掛程式會在本機透過 stdio 傳輸啟動 OpenClaw 管理的 Codex 二進位檔。僅當您刻意想要執行不同的可執行檔時，才設定 `appServer.command`。僅當 App-server 已在其他地方執行時，才使用 WebSocket 傳輸：

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

本機 stdio App-server 工作階段預設為信任的本機操作員姿態：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該隱含的 YOLO 姿態，OpenClaw 會改為選擇允許的守護者權限。當 OpenClaw 沙箱對工作階段啟用時，OpenClaw 會將 Codex `danger-full-access` 縮小為 Codex `workspace-write`，以便原生 Codex 程式碼模式回合停留在沙箱工作區內。

當您想要 Codex 原生自動審查（在沙箱逃逸或額外權限之前）時，請使用守護者模式：

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

守護者模式會展開為 Codex app-server 審核，通常當本機需求允許這些值時，包含 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有關每個 app-server 欄位、驗證順序、環境隔離、探索和逾時行為，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

隨附的外掛程式會將 `/codex` 註冊為任何支援 OpenClaw 文字指令之頻道上的斜線指令。

常見形式：

- `/codex status` 會檢查 app-server 連線、模型、帳戶、速率限制、MCP 伺服器和技能。
- `/codex models` 會列出運作中的 Codex app-server 模型。
- `/codex threads [filter]` 會列出最近的 Codex app-server 執行緒。
- `/codex resume <thread-id>` 會將目前的 OpenClaw 工作階段附加至現有的 Codex 執行緒。
- `/codex compact` 會要求 Codex app-server 壓縮附加的執行緒。
- `/codex review` 會針對附加的執行緒啟動 Codex 原生審查。
- `/codex diagnostics [note]` 會在傳送附加執行緒的 Codex 意見反應之前先詢問。
- `/codex account` 會顯示帳戶和速率限制狀態。
- `/codex mcp` 會列出 Codex app-server MCP 伺服器狀態。
- `/codex skills` 列出 Codex app-server 技能。

對於大多數支援報告，請從發生錯誤的對話中執行 `/diagnostics [note]` 開始。它會建立一個 Gateway 診斷報告，並且對於 Codex harness 會話，會詢問是否核准傳送相關的 Codex 反饋套件。請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics) 以了解隱私模型和群組聊天行為。

僅當您特別想要上傳目前附加線程的 Codex 反饋，而不需要完整的 Gateway 診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本地檢查 Codex 線程

檢查有問題的 Codex 執行的最快方法通常是直接開啟原生 Codex 線程：

```bash
codex resume <thread-id>
```

從完成的 `/diagnostics` 回覆、`/codex binding` 或 `/codex threads [filter]` 中取得 thread id。

關於上傳機制和執行時層級的診斷邊界，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證按以下順序選擇：

1. 代理程式的已排序 OpenAI 驗證設定檔，最好在
   `auth.order.openai` 之下。現有的 `openai-codex:*` 設定檔 ID 仍然有效。
2. 該代理程式的 Codex home 中 app-server 的現有帳戶。
3. 僅適用於本地 stdio app-server 啟動，當沒有 app-server 帳戶且仍需 OpenAI 驗證時，
   先使用 `CODEX_API_KEY`，然後使用 `OPENAI_API_KEY`。

當 OpenClaw 偵測到 ChatGPT 訂閱樣式的 Codex 驗證設定檔時，它會從產生的 Codex 子程序中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這樣可以保持 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，
而不會導致原生 Codex app-server 輪詢意外透過 API 計費。
明確的 Codex API 金鑰設定檔和本地 stdio env-key 後援使用 app-server
登入，而不是繼承的子程序環境。WebSocket app-server 連線
不會收到 Gateway 環境 API 金鑰後援；請使用明確的驗證設定檔或
遠端 app-server 自己的帳戶。

如果訂閱配置檔案達到 Codex 使用限制，OpenClaw 會在 Codex 回報時記錄重設時間，並嘗試同一 Codex 執行中的下一個已排序的驗證配置檔案。當重設時間過去後，訂閱配置檔案會再次變為符合資格，而不需變更已選取的 `openai/gpt-*` 模型或 Codex 執行環境。

如果部署需要額外的環境隔離，請將那些變數新增至 `appServer.clearEnv`：

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

`appServer.clearEnv` 僅影響產生的 Codex app-server 子行程。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區操作的動態工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。其餘的 OpenClaw 整合工具（例如訊息傳遞、工作階段、媒體、cron、瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`）可透過 Codex 工具搜尋在 `openclaw` 命名空間下取得，以保持初始模型內容較小。
`sessions_yield` 和僅限訊息工具來源的回覆會保持直接，因為這些是回合控制合約。Heartbeat 協作指令會告訴 Codex 在結束 heartbeat 回合前搜尋 `heartbeat_respond`（如果該工具尚未載入）。

僅在連線至無法搜尋延遲動態工具的自訂 Codex app-server，或除錯完整工具負載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具內容中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex app-server 回合中省略的其他 OpenClaw 動態工具名稱。      |
| `codexPlugins`             | 停用           | 對已遷移來源安裝策展外掛的原生 Codex 外掛/應用程式支援。            |

支援的 `appServer` 欄位：

| 欄位                          | 預設值                                    | 含義                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                   | `"stdio"`                                 | `"stdio"` 產生 Codex；`"websocket"` 連接至 `url`。                                                                                                                                                           |
| `command`                     | 受管理的 Codex 二進位檔                   | 用於 stdio 傳輸的可執行檔。保持未設定以使用受管理的二進位檔；僅在需要明確覆寫時設定。                                                                                                                        |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | 用於 stdio 傳輸的引數。                                                                                                                                                                                      |
| `url`                         | 未設定                                    | WebSocket 應用程式伺服器 URL。                                                                                                                                                                               |
| `authToken`                   | 未設定                                    | 用於 WebSocket 傳輸的 Bearer token。                                                                                                                                                                         |
| `headers`                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                                                                      |
| `clearEnv`                    | `[]`                                      | 從產生的 stdio 應用程式伺服器程序中移除的額外環境變數名稱，這是在 OpenClaw 建置其繼承的環境之後。`CODEX_HOME` 和 `HOME` 是保留給 OpenClaw 在本機啟動時針對每個代理程式的 Codex 隔離使用。                    |
| `requestTimeoutMs`            | `60000`                                   | 應用程式伺服器控制平面呼叫的逾時時間。                                                                                                                                                                       |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在一個輪次範圍的 Codex 應用程式伺服器請求之後的安靜時段，此時 OpenClaw 正在等待 `turn/completed`。如果工具後或僅狀態的合成階段較慢，請增加此值。                                                             |
| `mode`                        | `"yolo"`，除非本機 Codex 需求不允許 YOLO  | 用於 YOLO 或守護者審核執行的預設設定。省略 `danger-full-access`、`never` 核准或 `user` 審核者的本機 stdio 需求，會將隱含預設守護者設為該值。                                                                 |
| `approvalPolicy`              | `"never"` 或允許的守護者核准策略          | 傳送至執行緒啟動/恢復/輪次的原生 Codex 核准策略。當允許時，守護者預設偏好 `"on-request"`。                                                                                                                   |
| `sandbox`                     | `"danger-full-access"` 或允許的守護者沙箱 | 發送到執行緒啟動/恢復的原生 Codex 沙盒模式。Guardian 預設值在允許的情況下偏好 `"workspace-write"`，否則為 `"read-only"`。當 OpenClaw 沙盒處於活動狀態時，`danger-full-access` 會縮減為 `"workspace-write"`。 |
| `approvalsReviewer`           | `"user"` 或允許的 guardian 審查者         | 使用 `"auto_review"` 讓 Codex 在允許時審查原生批准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍為舊版別名。                                                                           |
| `serviceTier`                 | unset                                     | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆寫，且舊版 `"fast"` 被接受為 `"priority"`。                                                             |

OpenClaw 擁有的動態工具呼叫的界限獨立於 `appServer.requestTimeoutMs`：Codex `item/tool/call` 請求預設使用 30 秒的 OpenClaw 看門狗。正數的單次呼叫 `timeoutMs` 引數會延長或縮短該特定工具預算。`image_generate` 工具也會在工具呼叫未提供自己的逾時時使用 `agents.defaults.imageGenerationModel.timeoutMs`，且媒體理解 `image` 工具會使用 `tools.media.image.timeoutSeconds` 或其 60 秒的媒體預設值。動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便輪次能繼續進行，而不是讓會話處於 `processing` 狀態。

在 OpenClaw 回應 Codex 輪次範圍的 app-server 請求後，harness 也預期 Codex 會以 `turn/completed` 完成本機輪次。如果 app-server 在該回應後安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，讓後續聊天訊息不會排在過期的本機輪次後方。同一輪次的任何非終端通知（包括 `rawResponseItem/completed`）會解除該短期看門狗，因為 Codex 已證明該輪次仍存活；較長的終端看門狗則持續保護真正卡住的輪次。全域 app-server 通知（例如速率限制更新）不會重置輪次閒置進度。當 Codex 發出已完成的 `agentMessage` 項目後，在沒有 `turn/completed` 的情況下變得安靜，OpenClaw 會將助理輸出視為實質完成，盡力中斷本機 Codex 輪次，並釋放會話通道。逾時診斷包含最後的 app-server 通知方法；若是原始助理回應項目，則還包含項目類型、角色、ID，以及有界的助理文字預覽。

環境變數覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受控二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用設定，因為它能將外掛程式行為與 Codex harness 設定的其餘部分保持在同一個經過審查的檔案中。

## 本機 Codex 外掛程式

本機 Codex 外掛程式支援會在與 OpenClaw harness 輪次相同的 Codex 執行緒中，使用 Codex app-server 自身的應用程式與外掛程式功能。OpenClaw 不會將 Codex 外掛程式轉譯為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的階段。它對 PI 執行、一般 OpenAI 提供者執行、ACP 對話綁定或其他 harness 沒有影響。

最小遷移配置：

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

Thread app config 是在 OpenClaw 建立 Codex harness 階段或替換過時的 Codex thread 綁定時計算的。它不會在每次輪詢時重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動 gateway，以便未來的 Codex harness 階段以更新的 app set 啟動。

關於遷移資格、app 清單、破壞性操作策略、引導 (elicitations) 以及原生外掛程式診斷，請參閱[原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用

電腦使用涵蓋在其專屬的設定指南中：[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡單來說：OpenClaw 並不提供桌面控制 app 或自行執行桌面操作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式輪詢期間擁有原生 MCP 工具呼叫。

## 執行邊界

Codex harness 僅變更低階內嵌代理程式執行器。

- 支援 OpenClaw 動態工具。Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 仍保留在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生 app 工具由 Codex 擁有。OpenClaw 可以透過支援的轉送觀察或阻擋選定的原生事件，但它不會重寫原生工具參數。
- Codex 擁有原生壓縮。OpenClaw 會保留一份逐字稿鏡像，用於頻道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。
- 媒體產生、媒體理解、TTS、核准以及訊息工具輸出繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的逐字稿工具結果，而不適用於 Codex 原生工具結果記錄。

關於 Hook 層、支援的 V1 介面、原生權限處理、佇列導引、Codex 回饋上傳機制以及壓縮詳細資訊，請參閱[Codex harness 執行](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未顯示為正常的 `/model` 提供者：** 這對於新組態來說是預期的。選擇一個 `openai/gpt-*` 模型，啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保在官方 OpenAI 提供者上的模型參照是 `openai/gpt-*`，並且已安裝並啟用 Codex 外掛程式。如果您在測試時需要嚴格的證明，請設定提供者或模型 `agentRuntime.id: "codex"`。強制執行的 Codex 運行時會失敗，而不是回退到 PI。

**舊版 `openai-codex/*` 組態仍然存在：** 請執行 `openclaw doctor --fix`。Doctor 會將舊版模型參照重寫為 `openai/*`，移除過時的 session 和 whole-agent runtime 釘選，並保留現有的 auth-profile 覆寫。

**App-server 被拒絕：** 請使用 Codex app-server `0.125.0` 或更新版本。OpenClaw 會拒絕同版本的预發布版或建置後綴版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`），因為 OpenClaw 測試的是穩定的 `0.125.0` 協定底線。

**`/codex status` 無法連線：** 請檢查隨附的 `codex` 外掛程式是否已啟用，當設定允許清單時 `plugins.allow` 是否包含它，以及任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索速度較慢：** 請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`、標頭，以及遠端 app-server 是否使用相同的 Codex app-server 協定版本。

**非 Codex 模型使用 PI：** 除非提供者或模型運行時政策將其路由到另一個 harness，否則這是預期的。純非 OpenAI 提供者參照會在 `auto` 模式下保持在正常的提供者路徑上。

**Computer Use 已安裝但工具無法執行：**請從新會話檢查 `/codex computer-use status`。如果工具回報 `Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果問題持續，請重新啟動 gateway 以清除過時的 native hook 註冊。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting)。

## 相關

- [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness 執行時](/zh-Hant/plugins/codex-harness-runtime)
- [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [Agent 執行時](/zh-Hant/concepts/agent-runtimes)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [OpenAI 提供者](/zh-Hant/providers/openai)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [外掛程式 hooks](/zh-Hant/plugins/hooks)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [狀態](/zh-Hant/cli/status)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
