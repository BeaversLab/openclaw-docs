---
summary: "透過內建的 Codex app-server harness 執行 OpenClaw 內嵌 agent 輪次"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

內建的 `codex` 外掛程式讓 OpenClaw 透過 Codex app-server 執行內嵌的 OpenAI agent 輪次，而非使用內建的 PI harness。

當您希望 Codex 掌管底層 agent 工作階段時，請使用 Codex harness：原生執行緒恢復、原生工具接續、原生壓縮以及 app-server 執行。OpenClaw 仍然掌管聊天頻道、工作階段檔案、模型選擇、OpenClaw 動態工具、審核、媒體傳輸以及可見的逐字稿鏡像。

一般設定使用標準的 OpenAI 模型參照，例如 `openai/gpt-5.5`。請勿設定 `openai-codex/gpt-*` 模型參照。`openai-codex` 是 Codex OAuth 或 Codex API 金鑰設定檔的驗證設定檔提供者，而非新 agent 設定的模型提供者前綴。

關於更廣泛的模型/提供者/執行時期區分，請從 [Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單的說法是：`openai/gpt-5.5` 是模型參照，`codex` 是執行時期，而 Telegram、Discord、Slack 或其他頻道則保持為通訊介面。

## 需求

- 具備可用內建 `codex` 外掛程式的 OpenClaw。
- 如果您的設定使用 `plugins.allow`，請包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。內建外掛程式預設會管理相容的 Codex app-server 執行檔，因此在 `PATH` 上的本機 `codex` 指令不會影響正常的 harness 啟動。
- 透過 `openclaw models auth login --provider openai-codex`、agent Codex home 中的 app-server 帳戶，或明確的 Codex API 金鑰驗證設定檔，提供可用的 Codex 驗證。

關於驗證優先順序、環境隔離、自訂 app-server 指令、模型探索以及所有設定欄位，請參閱 [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 快速入門

大多數想要在 OpenClaw 中使用 Codex 的用戶都會選擇此路徑：使用 ChatGPT/Codex 訂閱登入，啟用內建的 `codex` 外掛程式，並使用標準的 `openai/gpt-*` 模型參照。

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

如果您的設定使用 `plugins.allow`，請也在那裡新增 `codex`：

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

變更外掛程式設定後請重新啟動閘道。如果現有的聊天已經有會話，請在測試執行時變更前使用 `/new` 或 `/reset`，這樣下一輪才會從目前的設定解析控管程式。

## 組態

快速入門設定是最小可行的 Codex 控管程式設定。在 OpenClaw 設定中設定 Codex 控管程式選項，並僅將 CLI 用於 Codex 驗證：

| 需要                              | 設定                                                                    | 其中                     |
| --------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| 啟用控管程式                      | `plugins.entries.codex.enabled: true`                                   | OpenClaw 配置            |
| 保持允許清單外掛程式安裝          | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 配置            |
| 透過 Codex 路由 OpenAI 代理回合   | 將 `agents.defaults.model` 或 `agents.list[].model` 設為 `openai/gpt-*` | OpenClaw 代理配置        |
| 使用 Codex OAuth 登入             | `openclaw models auth login --provider openai-codex`                    | CLI 認證設定檔           |
| 當 Codex 無法使用時以封閉模式失敗 | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者配置 |
| 使用直接 OpenAI API 流量          | 使用標準 OpenAI 認證的提供者或模型 `agentRuntime.id: "pi"`              | OpenClaw 模型/提供者配置 |
| 調整應用伺服器行為                | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛程式配置       |
| 啟用原生 Codex 外掛程式應用程式   | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛程式配置       |
| 啟用 Codex 電腦使用               | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛程式設定       |

對於 Codex 支援的 OpenAI 代理程式回合，請使用 `openai/gpt-*` 模型參考。
`openai-codex` 僅是 Codex OAuth 和 Codex API 金鑰設定檔的 auth-profile 提供者名稱。請勿撰寫新的 `openai-codex/gpt-*` 模型參考。

本頁其餘部分涵蓋使用者必須選擇的常見變體：
部署形狀、封閉失效路由、守護者核准政策、原生 Codex
外掛程式和電腦使用。如需完整的選項清單、預設值、列舉、探索、
環境隔離、逾時和應用程式伺服器傳輸欄位，請參閱
[Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

## 驗證 Codex 執行時期

在您預期會出現 Codex 的聊天中使用 `/status`。Codex 支援的 OpenAI 代理程式
回合會顯示：

```text
Runtime: OpenAI Codex
```

然後檢查 Codex 應用程式伺服器狀態：

```text
/codex status
/codex models
```

`/codex status` 回報應用伺服器連線、帳戶、速率限制、MCP 伺服器和技能。`/codex models` 列出適用於 harness 和帳戶的即時 Codex 應用伺服器目錄。如果 `/status` 的結果出乎意料，請參閱 [疑難排解](#troubleshooting)。

## 路由與模型選擇

請將提供者參照與執行時期原則分開：

- 對於透過 Codex 執行的 OpenAI 代理程式回合，請使用 `openai/gpt-*`。
- 請勿在設定中使用 `openai-codex/gpt-*`。請執行 `openclaw doctor --fix` 以修復舊版參照和過時的工作階段路由釘選。
- `agentRuntime.id: "codex"` 對於一般的 OpenAI 自動模式而言是可選的，但當 Codex 無法使用時部署應以封閉式失敗，這就很有用。
- 當屬意採用直接 PI 行為時，`agentRuntime.id: "pi"` 可選擇讓提供者或模型採用該行為。
- `/codex ...` 從聊天控制原生的 Codex 應用程式伺服器對話。
- ACP/acpx 是一個獨立的外部掛接路徑。僅當使用者要求
  使用 ACP/acpx 或外部掛接轉接器時才使用它。

常見指令路由：

| 使用者意圖              | 使用                                 |
| ----------------------- | ------------------------------------ |
| 附加目前聊天            | `/codex bind [--cwd <path>]`         |
| 恢復現有的 Codex 執行緒 | `/codex resume <thread-id>`          |
| 列出或篩選 Codex 執行緒 | `/codex threads [filter]`            |
| 僅發送 Codex 反饋       | `/codex diagnostics [note]`          |
| 啟動 ACP/acpx 任務      | ACP/acpx 工作階段指令，而非 `/codex` |

| 使用案例                                   | 設定                                                      | 驗證                                   | 備註                     |
| ------------------------------------------ | --------------------------------------------------------- | -------------------------------------- | ------------------------ |
| 具有原生 Codex 執行時的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上已啟用的 `codex` 外掛程式              | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑                 |
| 如果 Codex 無法使用，則失敗關閉            | 提供者或模型 `agentRuntime.id: "codex"`                   | 回合失敗，而不是退回到 PI              | 用於僅 Codex 的部署      |
| 透過 PI 直接傳送 OpenAI API 金鑰流量       | 提供者或模型 `agentRuntime.id: "pi"` 和正常的 OpenAI 驗證 | `/status` 顯示 PI 執行時               | 僅在有意使用 PI 時使用   |
| 舊版配置                                   | `openai-codex/gpt-*`                                      | `openclaw doctor --fix` 會將其重寫     | 請勿以這種方式編寫新配置 |
| ACP/acpx Codex 轉接器                      | ACP `sessions_spawn({ runtime: "acp" })`                  | ACP 任務/工作階段狀態                  | 與原生 Codex 複合器分開  |

`agents.defaults.imageModel` 遵循相同的前綴分割。使用 `openai/gpt-*` 作為正常的 OpenAI 路由，並僅當圖像理解應透過受限制的 Codex 應用程式伺服器回合執行時才使用 `codex/gpt-*`。請勿使用 `openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

## 部署模式

### 基本 Codex 部署

當所有 OpenAI 代理回合預設都應使用 Codex 時，請使用快速入門組態。

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

此配置將 Claude 保留為預設代理，並新增一個命名的 Codex 代理：

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

使用此組態時，`main` 代理會使用其正常的提供者路徑，而 `codex` 代理會使用 Codex 應用程式伺服器。

### 失效關閉的 Codex 部署

對於 OpenAI 代理輪次，當內建插件可用時，`openai/gpt-*` 已解析為 Codex。當您需要書面的失效關閉（fail-closed）規則時，新增明確的執行時期原則：

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

在強制使用 Codex 的情況下，如果 Codex 插件被停用、應用伺服器過舊，或應用伺服器無法啟動，OpenClaw 將會提早失敗。

## 應用伺服器原則

預設情況下，該插件會透過 stdio 傳輸在本機啟動 OpenClaw 管理的 Codex 二進位檔。僅當您刻意想要執行不同的可執行檔時，才設定 `appServer.command`。僅當應用伺服器已在其他地方執行時，才使用 WebSocket 傳輸：

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

本地 stdio 應用程式伺服器階段作業預設為受信任的本機操作員姿態：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 需求不允許該隱含的 YOLO 姿態，OpenClaw 將改為選擇允許的監護人權限。

當您希望 Codex 在沙箱逸出或額外權限之前進行原生自動審查時，請使用監護人模式：

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

監護人模式擴展為 Codex 應用程式伺服器核准，通常當本地需求允許這些值時，為 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有關每個應用程式伺服器欄位、驗證順序、環境隔離、探索和逾時行為，請參閱 [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

隨附的外掛程式會在支援 OpenClaw 文字指令的任何頻道上將 `/codex` 註冊為斜線指令。

常見格式：

- `/codex status` 會檢查應用程式伺服器連線、模型、帳戶、速率限制、MCP 伺服器和技能。
- `/codex models` 列出即時的 Codex 應用程式伺服器模型。
- `/codex threads [filter]` 列出最近的 Codex 應用程式伺服器執行緒。
- `/codex resume <thread-id>` 將目前的 OpenClaw 階段作業附加至現有的 Codex 執行緒。
- `/codex compact` 要求 Codex 應用程式伺服器壓縮附加的執行緒。
- `/codex review` 針對附加的執行緒啟動 Codex 原生審查。
- `/codex diagnostics [note]` 在針對附加的執行緒傳送 Codex 回饋之前詢問。
- `/codex account` 顯示帳戶和速率限制狀態。
- `/codex mcp` 列出 Codex 應用程式伺服器 MCP 伺服器狀態。
- `/codex skills` 列出 Codex 應用程式伺服器技能。

對於大多數支援報告，請在發生錯誤的對話中從 `/diagnostics [note]` 開始。它會建立一份 Gateway 診斷報告，並針對 Codex harness 階段作業，詢問是否核准傳送相關的 Codex 回饋套件。關於隱私模型和群組聊天行為，請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics)。

僅在您特別想要目前連接執行緒的 Codex
意見回饋上傳，而不需要完整的 Gateway
診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本機檢查 Codex 執行緒

檢查不良 Codex 執行的最快方式通常是直接開啟原生的 Codex
執行緒：

```bash
codex resume <thread-id>
```

從完成的 `/diagnostics` 回覆、`/codex binding` 或
`/codex threads [filter]` 取得執行緒 ID。

關於上傳機制和執行時層級的診斷邊界，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證依下列順序選取：

1. 代理程式的明確 OpenClaw Codex 驗證設定檔。
2. 應用程式伺服器在該代理程式 Codex 家目錄中的現有帳戶。
3. 僅針對本機 stdio 應用程式伺服器啟動，當沒有應用程式伺服器帳戶且仍需
   OpenAI 驗證時，先 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 看到 ChatGPT 訂閱風格的 Codex 驗證設定檔時，它會從產生的
Codex 子程序中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。這
能讓 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，
而不會意外地讓原生 Codex 應用程式伺服器轉向透過 API 計費。
明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後備會使用應用程式伺服器
登入，而不是繼承的子程序環境。WebSocket 應用程式伺服器連線
不會收到 Gateway 環境 API 金鑰後備；請使用明確的驗證設定檔或
遠端應用程式伺服器自己的帳戶。

如果部署需要額外的環境隔離，請將這些變數新增至
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

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區操作的動態工具：`read`、`write`、`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。其餘的 OpenClaw 整合工具（例如訊息傳遞、工作階段、媒體、cron、瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`）可透過 Codex 工具搜尋在 `openclaw` 命名空間下取得，以保持初始模型語境較小。`sessions_yield` 和僅限訊息工具的來源回覆會保持直接，因為這些是回合控制合約。Heartbeat 協作指示會告訴 Codex 在結束 heartbeat 回合之前搜尋 `heartbeat_respond`（當該工具尚未載入時）。

僅在連接到無法搜尋延遲動態工具的自訂 Codex 應用程式伺服器，或正在偵錯完整工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具語境中。 |
| `codexDynamicToolsExclude` | `[]`           | 其他要從 Codex 應用程式伺服器回合中省略的 OpenClaw 動態工具名稱。   |
| `codexPlugins`             | 已停用         | 原生 Codex 外掛/應用程式對已遷移來源安裝的策展外掛的支援。          |

支援的 `appServer` 欄位：

| 欄位                          | 預設值                                          | 含義                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                       | `"stdio"` 會產生 Codex；`"websocket"` 會連線到 `url`。                                                                                                                     |
| `command`                     | 受控 Codex 二進位檔                             | 用於 stdio 傳輸的可執行檔。保持未設定以使用受控二進位檔；僅針對明確覆寫時進行設定。                                                                                        |
| `args`                        | `["app-server", "--listen", "stdio://"]`        | 用於 stdio 傳輸的引數。                                                                                                                                                    |
| `url`                         | 未設定                                          | WebSocket 應用程式伺服器 URL。                                                                                                                                             |
| `authToken`                   | 未設定                                          | WebSocket 傳輸的 Bearer token。                                                                                                                                            |
| `headers`                     | `{}`                                            | 額外的 WebSocket 標頭。                                                                                                                                                    |
| `clearEnv`                    | `[]`                                            | OpenClaw 建構繼承環境後，從產生的 stdio 應用程式伺服器程序中移除的額外環境變數名稱。`CODEX_HOME` 和 `HOME` 保留給 OpenClaw 在本機啟動時針對每個代理程式的 Codex 隔離使用。 |
| `requestTimeoutMs`            | `60000`                                         | 應用程式伺服器控制平面呼叫的逾時時間。                                                                                                                                     |
| `turnCompletionIdleTimeoutMs` | `60000`                                         | 在輪次範圍的 Codex 應用程式伺服器請求之後的安靜視窗，此時 OpenClaw 正在等待 `turn/completed`。如果工具後或僅狀態的合成階段緩慢，請增加此設定。                             |
| `mode`                        | 除非本機 Codex 需求不允許 YOLO，否則為 `"yolo"` | YOLO 或守護者審閱執行的預設設定。省略 `danger-full-access`、`never` 核准或 `user` 審閱者的本機 stdio 需求會將隱含的預設守護者設為此設定。                                  |
| `approvalPolicy`              | `"never"` 或允許的守護者核准策略                | 傳送到執行緒啟動/恢復/輪次的原生 Codex 核准策略。如果允許，守護者預設值偏好 `"on-request"`。                                                                               |
| `sandbox`                     | `"danger-full-access"` 或允許的守護者沙箱       | 傳送到執行緒啟動/恢復的原生 Codex 沙箱模式。如果允許，守護者預設值偏好 `"workspace-write"`，否則為 `"read-only"`。                                                         |
| `approvalsReviewer`           | `"user"` 或允許的守護者審閱者                   | 如果允許，使用 `"auto_review"` 讓 Codex 審閱原生核准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍為傳統別名。                                       |
| `serviceTier`                 | 未設定                                          | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆寫，而傳統的 `"fast"` 會被接受為 `"priority"`。                       |

OpenClaw 擁有的動態工具呼叫與 `appServer.requestTimeoutMs` 無關，各自獨立受限：Codex `item/tool/call` 請求預設使用 30 秒的 OpenClaw 看門狗計時器。正數的單次呼叫 `timeoutMs` 引數可延長或縮短該特定工具的預算。`image_generate` 工具也會在工具呼叫未提供自己的逾時設定時使用 `agents.defaults.imageGenerationModel.timeoutMs`，而媒體理解 `image` 工具則使用 `tools.media.image.timeoutSeconds` 或其 60 秒的媒體預設值。動態工具預算上限為 600000 毫秒。發生逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便輪次能繼續進行，而不是讓會議停留在 `processing` 狀態。

在 OpenClaw 回應 Codex 輪次範圍的 app-server 請求後，harness 也預期 Codex 會用 `turn/completed` 完成原生輪次。如果 app-server 在該回應後 `appServer.turnCompletionIdleTimeoutMs` 內保持沈默，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會議通道，以免後續聊天訊息被卡在陳舊的原生輪次後面。任何針對同一輪次的非終止通知（包括 `rawResponseItem/completed`）都會解除這個短看門狗，因為 Codex 已證明該輪次仍存活；較長的終止看門狗則繼續保護真正卡住的輪次。逾時診斷包含最後一個 app-server 通知方法，若是原始助理回應項目，則還包含項目類型、角色、ID 以及有限的助理文字預覽。

環境變數覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用設定，因為這能將外掛行為與 Codex harness 設定的其餘部分保持在同一個經過審查的檔案中。

## 原生 Codex 外掛

原生 Codex 外掛支援會在與 OpenClaw harness 週期相同的 Codex 執行緒中，使用 Codex app-server 本身的應用程式和外掛功能。OpenClaw 不會將 Codex 外掛轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的階段。它對 PI 執行、一般的 OpenAI 提供者執行、ACP 對話綁定或其他 harness 沒有影響。

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
            allow_destructive_actions: false,
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

執行緒應用程式設定是在 OpenClaw 建立 Codex harness 階段或替換過時的 Codex 執行緒綁定時計算的。它不會在每個週期重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 階段以更新後的應用程式集啟動。

關於遷移資格、應用程式清單、破壞性動作原則、誘導以及原生外掛診斷，請參閱[原生 Codex 外掛](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用

電腦使用涵蓋在其專屬的設定指南中：
[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡單來說：OpenClaw 不提供桌面控制應用程式，也不自行執行桌面動作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式週期期間擁有原生 MCP 工具呼叫。

## 執行時邊界

Codex harness 僅變更底層的嵌入式代理程式執行器。

- 支援 OpenClaw 動態工具。Codex 會要求 OpenClaw 執行這些工具，因此 OpenClaw 仍位於執行路徑中。
- Codex 原生 shell、修補程式 (patch)、MCP 和原生應用程式工具由 Codex 擁有。
  OpenClaw 可以透過支援的中繼觀察或阻擋選取的原生事件，但它不會重寫原生工具引數。
- Codex 擁有原生壓縮功能。OpenClaw 會保留一份抄本鏡像以用於頻道記錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。
- 媒體生成、媒體理解、TTS、審核以及訊息工具輸出會繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的抄本工具結果，而不適用於 Codex 原生工具結果記錄。

關於 Hook 層、支援的 V1 介面、原生權限處理、佇列引導、Codex 反饋上傳機制以及壓縮詳情，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未顯示為正常的 `/model` 提供者：** 對於新設定這是預期的。請選取一個 `openai/gpt-*` 模型，啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保在官方 OpenAI 提供者上的模型參照是 `openai/gpt-*`，並且已安裝並啟用 Codex 外掛。如果您在測試時需要嚴格的驗證，請設定提供者或模型 `agentRuntime.id: "codex"`。強制的 Codex 執行時會失敗，而不會回退到 PI。

**舊版 `openai-codex/*` 設定仍然存在：** 請執行 `openclaw doctor --fix`。Doctor 會將舊版模型參照重寫為 `openai/*`，移除過時的會話和全代理執行時釘選，並保留現有的 auth-profile 覆蓋設定。

**App-server 被拒絕：** 請使用 Codex app-server `0.125.0` 或更新版本。同版本的預發行版或建置後綴版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 會測試穩定的 `0.125.0` 通訊協議底線。

**`/codex status` 無法連線：** 請檢查內建的 `codex` 外掛程式是否已啟用，`plugins.allow` 在設定允許清單時是否包含它，以及任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索過慢：** 請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`、標頭，以及遠端應用程式伺服器是否使用相同的 Codex 應用程式伺服器通訊協定版本。

**非 Codex 模型使用 PI：** 除非提供者或模型執行時間原則將其路由到另一個 harness，否則這是預期的行為。純非 OpenAI 提供者參照在 `auto` 模式下會停留在其正常的提供者路徑上。

**已安裝 Computer Use 但工具未執行：** 請從全新工作階段檢查 `/codex computer-use status`。如果工具回報 `Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果問題持續，請重新啟動閘道以清除過時的原生 hook 註冊。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting)。

## 相關

- [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness 執行時間](/zh-Hant/plugins/codex-harness-runtime)
- [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [Agent 執行時間](/zh-Hant/concepts/agent-runtimes)
- [模型提供者](/zh-Hant/concepts/model-providers)
- [OpenAI 提供者](/zh-Hant/providers/openai)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
- [外掛程式 hooks](/zh-Hant/plugins/hooks)
- [診斷匯出](/zh-Hant/gateway/diagnostics)
- [狀態](/zh-Hant/cli/status)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
