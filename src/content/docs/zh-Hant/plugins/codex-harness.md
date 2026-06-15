---
summary: "透過隨附的 Codex 應用程式伺服器介接器執行 OpenClaw 嵌入式代理程式回合"
title: "Codex 介接器"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to OpenClaw
---

隨附的 `codex` 插件讓 OpenClaw 透過 Codex 應用程式伺服器來執行內嵌的 OpenAI agent 輪次，而不是使用內建的 OpenClaw harness。

當您希望 Codex 掌管底層 agent 工作階段時，請使用 Codex harness：原生執行緒恢復、原生工具接續、原生壓縮以及 app-server 執行。OpenClaw 仍然掌管聊天頻道、工作階段檔案、模型選擇、OpenClaw 動態工具、審核、媒體傳輸以及可見的逐字稿鏡像。

標準設定使用標準的 OpenAI 模型參照，例如 `openai/gpt-5.5`。
請勿設定舊版 Codex GPT 參照。將 OpenAI agent 驗證順序放在
`auth.order.openai` 下；較舊的舊版 Codex 驗證設定檔 ID 和
舊版 Codex 驗證順序項目是舊版狀態，會由
`openclaw doctor --fix` 修復。

當沒有啟用 OpenClaw 沙箱時，OpenClaw 會啟動 Codex app-server 執行緒，
並啟用 Codex 原生程式碼模式，同時預設關閉僅程式碼模式。
這讓 Codex 原生工作區和程式碼功能保持可用，同時
OpenClaw 動態工具透過 app-server `item/tool/call` 橋樑繼續運作。
啟用 OpenClaw 沙箱和受限工具政策會完全停用原生程式碼模式，
除非您選擇加入實驗性沙箱 exec-server 路徑。

這項 Codex 原生功能與
[OpenClaw code mode](/zh-Hant/reference/code-mode) 分開，後者是一個選用的 QuickJS-WASI
執行時期，用於一般 OpenClaw 執行，並具有不同的 `exec` 輸入形狀。

關於更廣泛的模型/提供者/執行時期區分，請從
[Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單來說：
`openai/gpt-5.5` 是模型參照，`codex` 是執行時期，而 Telegram、
Discord、 Slack 或其他通道則保持為通訊介面。

## 需求

- OpenClaw 已安裝隨附的 `codex` 外掛程式。
- 如果您的設定使用 `plugins.allow`，請包含 `codex`。
- Codex app-server `0.125.0` 或更新版本。隨附的外掛程式預設會管理相容的
  Codex app-server 二進位檔，因此在 `PATH` 上的本機 `codex` 指令不會
  影響正常的 harness 啟動。
- Codex 驗證可透過 `openclaw models auth login --provider openai` 取得、
  agent Codex 主目錄中的 app-server 帳戶，或明確的 Codex API 金鑰
  驗證設定檔。

關於驗證優先順序、環境隔離、自訂 app-server 指令、模型
探索及所有設定欄位，請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 快速開始

大多數想要在 OpenClaw 中使用 Codex 的使用者都選擇這條路徑：使用 ChatGPT/Codex 訂閱登入，啟用內建的 `codex` 外掛程式，並使用標準的 `openai/gpt-*` 模型參照。

使用 Codex OAuth 登入：

```bash
openclaw models auth login --provider openai
```

啟用內建的 `codex` 外掛程式並選取一個 OpenAI 代理程式模型：

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

如果您的設定使用 `plugins.allow`，請也在那裡加入 `codex`：

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

變更外掛程式設定後請重新啟動閘道。如果現有的聊天已經有工作階段，請在測試執行階段變更之前使用 `/new` 或 `/reset`，這樣下一輪對話會從目前的設定解析駝具。

## 設定

快速入門設定是最小可行的 Codex 線束設定。在 OpenClaw 設定中設定 Codex 線束選項，並僅使用 CLI 進行 Codex 驗證：

| 需要                                | 設定                                                                    | 位置                           |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 啟用線束                            | `plugins.entries.codex.enabled: true`                                   | OpenClaw 設定                  |
| 保留允許清單中的外掛程式安裝        | 在 `plugins.allow` 中包含 `codex`                                       | OpenClaw 設定                  |
| 透過 Codex 路由 OpenAI 代理程式輪次 | 將 `agents.defaults.model` 或 `agents.list[].model` 設為 `openai/gpt-*` | OpenClaw 代理程式設定          |
| 使用 ChatGPT/Codex OAuth 登入       | `openclaw models auth login --provider openai`                          | CLI 驗證設定檔                 |
| 為 Codex 執行新增 API 金鑰備援      | 列在 `auth.order.openai` 中訂閱驗證之後的 `openai:*` API 金鑰設定檔     | CLI 驗證設定檔 + OpenClaw 設定 |
| 當 Codex 無法使用時關閉並失敗       | 提供者或模型 `agentRuntime.id: "codex"`                                 | OpenClaw 模型/提供者設定       |
| 使用直接 OpenAI API 流量            | 具有一般 OpenAI 驗證的提供者或模型 `agentRuntime.id: "openclaw"`        | OpenClaw 模型/提供者設定       |
| 調整應用程式伺服器行為              | `plugins.entries.codex.config.appServer.*`                              | Codex 外掛程式設定             |
| 啟用原生 Codex 外掛程式應用程式     | `plugins.entries.codex.config.codexPlugins.*`                           | Codex 外掛程式設定             |
| 啟用 Codex Computer Use             | `plugins.entries.codex.config.computerUse.*`                            | Codex 外掛程式設定             |

對於由 Codex 支援的 OpenAI 代理程式輪次，請使用 `openai/gpt-*` 模型參照。若偏好訂閱優先/API 金鑰備份的順序，請優先使用 `auth.order.openai`。現有的舊版 Codex 驗證設定檔 ID 和舊版 Codex 驗證順序僅為供醫生使用的舊版狀態；請勿撰寫新的舊版 Codex GPT 參照。

不要在由 Codex 支援的代理程式上設定 `compaction.model` 或 `compaction.provider`。Codex 透過其原生應用伺服器執行緒狀態進行壓縮，因此 OpenClaw 會在執行階段忽略那些本機摘要器覆寫，並且當代理程式使用 Codex 時，`openclaw doctor --fix` 會將其移除。

Lossless 仍支援作為上下文引擎，用於圍繞 Codex 輪次的組合、攝取和維護。請透過
`plugins.slots.contextEngine: "lossless-claw"` 和
`plugins.entries.lossless-claw.config.summaryModel` 進行配置，而不是透過
`agents.defaults.compaction.provider`。當 Codex 是運行時環境時，`openclaw doctor --fix` 會將舊的
`compaction.provider: "lossless-claw"` 結構遷移到 Lossless 上下文引擎插槽，但原生的 Codex 仍然擁有壓縮功能。

原生的 Codex 應用程式伺服器 harness 支援需要預先提示組合的上下文引擎。通用 CLI 後端（包括 `codex-cli`）不提供該主機功能。

對於由 Codex 支援的代理程式，`/compact` 會在綁定的執行緒上啟動原生的 Codex 應用程式伺服器壓縮。OpenClaw 不會等待完成、強制執行 OpenClaw 逾時、重新啟動共用的應用程式伺服器，或回退到上下文引擎或公開的 OpenAI 摘要器。如果原生的 Codex 執行緒綁定缺失或過期，該指令會以封閉式失敗（fail closed）結束，讓操作員看到真正的運行時邊界，而不是無聲地切換壓縮後端。

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

在該結構中，兩個設定檔仍透過 Codex 執行 `openai/gpt-*` 代理程式輪次。API 金鑰只是一個身份驗證回退機制，而非切換到 OpenClaw 或純 OpenAI 回應的請求。

本頁其餘部分涵蓋使用者必須選擇的常見變體：部署結構、封閉式失敗路由、監護人審核策略、原生 Codex 外掛程式，以及電腦使用。如需完整的選項列表、預設值、列舉、探索、環境隔離、逾時和應用程式伺服器傳輸欄位，請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 驗證 Codex 執行時期

在您預期會使用 Codex 的聊天中使用 `/status`。由 Codex 支援的 OpenAI 代理程式輪次會顯示：

```text
Runtime: OpenAI Codex
```

然後檢查 Codex app-server 狀態：

```text
/codex status
/codex models
```

`/codex status` 回報應用程式伺服器連線、帳戶、速率限制、MCP
伺服器和技能。`/codex models` 列出 harness 和帳戶的即時 Codex 應用程式伺服器目錄。如果 `/status` 的結果出乎意料，請參閱
[疑難排解](#troubleshooting)。

## 路由與模型選擇

將提供者參照與執行時期策略分開：

- 透過 Codex 進行 OpenAI 代理程式輪次時，請使用 `openai/gpt-*`。
- 請勿在設定中使用舊版 Codex GPT 參考。執行 `openclaw doctor --fix` 以
  修復舊版參考和過時的會話路由釘選。
- `agentRuntime.id: "codex"` 對於正常的 OpenAI 自動模式是選用的，但如果
  Codex 無法可用時部署應該失敗關閉，這會很有用。
- `agentRuntime.id: "openclaw"` 在刻意為之時，將提供者或模型選入
  OpenClaw 嵌入式執行時。
- `/codex ...` 從聊天控制原生 Codex 應用程式伺服器對話。
- ACP/acpx 是一條獨立的外部 harness 路徑。僅在使用者要求
  ACP/acpx 或外部 harness 配接器時使用。

常見指令路由：

| 使用者意圖                              | 使用                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加目前聊天                            | `/codex bind [--cwd <path>]`                                                                          |
| 恢復現有的 Codex 執行緒                 | `/codex resume <thread-id>`                                                                           |
| 列出或篩選 Codex 執行緒                 | `/codex threads [filter]`                                                                             |
| 列出原生 Codex 外掛程式                 | `/codex plugins list`                                                                                 |
| 啟用或停用已設定的原生 Codex 外掛程式   | `/codex plugins enable <name>`, `/codex plugins disable <name>`                                       |
| 附加配對節點上的現有 Codex CLI 工作階段 | `/codex sessions --host <node> [filter]`, 然後 `/codex resume <session-id> --host <node> --bind here` |
| 僅傳送 Codex 意見回饋                   | `/codex diagnostics [note]`                                                                           |
| 啟動 ACP/acpx 任務                      | ACP/acpx 會話指令，而非 `/codex`                                                                      |

| 使用案例                                     | 設定                                                            | 驗證                                   | 備註                         |
| -------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| 具有原生 Codex 執行時期的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上已啟用的 `codex` 外掛程式                    | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑                     |
| 如果 Codex 無法使用則失敗封閉                | 提供者或模型 `agentRuntime.id: "codex"`                         | 回合失敗，而非內嵌備援                 | 僅用於 Codex 專用部署        |
| 透過 OpenClaw 導向 OpenAI API 金鑰流量       | 提供者或模型 `agentRuntime.id: "openclaw"` 和正常的 OpenAI 認證 | `/status` 顯示 OpenClaw 執行時         | 僅在有意使用 OpenClaw 時使用 |
| 舊版配置                                     | 舊版 Codex GPT 參考                                             | `openclaw doctor --fix` 會重寫它       | 請勿以此方式撰寫新配置       |
| ACP/acpx Codex 配接器                        | ACP `sessions_spawn({ runtime: "acp" })`                        | ACP 任務/工作階段狀態                  | 與原生 Codex harness 分離    |

`agents.defaults.imageModel` 遵循相同的前綴分割。對於正常的 OpenAI 路由使用 `openai/gpt-*`，
並且僅當圖像理解應該透過受限制的 Codex 應用程式伺服器回合執行時才使用 `codex/gpt-*`。請勿使用
舊版 Codex GPT 參考；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

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

透過此設定，`main` 代理程式使用其正常的提供者路徑，而
`codex` 代理程式則使用 Codex 應用程式伺服器。

### 故障關閉 (Fail-closed) Codex 部署

對於 OpenAI 代理程式回合，當 bundled 外掛程式可用時，`openai/gpt-*` 已經解析為 Codex。當您想要書面
失敗關閉規則時，加入明確的執行時策略：

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

預設情況下，此外掛程式會在本機透過 stdio 傳輸啟動 OpenClaw 管理的 Codex 二進位檔。僅當您故意想要執行不同的可執行檔時，才設定 `appServer.command`。僅當應用程式伺服器已在其他地方執行時，才使用 WebSocket 傳輸：

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

本機 stdio 應用程式伺服器工作階段預設為受信任的本機操作員姿態：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該隱含的 YOLO 姿態，OpenClaw 會改為選擇允許的 Guardian 權限。當工作階段啟用 OpenClaw 沙箱時，OpenClaw 會停用 Codex 原生 Code Mode、使用者 MCP 伺服器以及應用程式支援的外掛程式執行，而不是依賴 Codex 主機端沙箱。當標準的 exec/process 工具可用時，Shell 存取權會透過 OpenClaw 沙箱支援的動態工具（例如 `sandbox_exec` 和 `sandbox_process`）暴露。

當您希望在沙箱逸出或額外權限之前先進行 Codex 原生自動審查時，請使用標準化的 OpenClaw exec 模式：

```json5
{
  tools: {
    exec: {
      mode: "auto",
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

對於 Codex 應用程式伺服器工作階段，OpenClaw 會將 `tools.exec.mode: "auto"` 對應到 Codex Guardian 審查的核准，通常在本地需求允許這些值時為 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。在 `tools.exec.mode: "auto"` 中，OpenClaw 不會保留舊版不安全的 Codex `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆寫；請使用 `tools.exec.mode: "full"` 來設定故意無需核准的 Codex 姿態。舊版的 `plugins.entries.codex.config.appServer.mode: "guardian"` 預設仍然有效，但 `tools.exec.mode: "auto"` 是標準化的 OpenClaw 介面。

有關主機執行核准與 ACPX 權限的模式層級比較，請參閱 [權限模式](/zh-Hant/tools/permission-modes)。

有關每個應用伺服器欄位、驗證順序、環境隔離、探索與逾時行為，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

內建外掛會在支援 OpenClaw 文字指令的任何頻道上，將 `/codex` 註冊為斜線指令。

常見格式：

- `/codex status` 會檢查應用伺服器的連線、模型、帳戶、速率限制、
  MCP 伺服器與技能。
- `/codex models` 會列出目前運作的 Codex 應用伺服器模型。
- `/codex threads [filter]` 會列出最近的 Codex 應用伺服器執行緒。
- `/codex resume <thread-id>` 會將目前的 OpenClaw 工作階段附加到
  現有的 Codex 執行緒。
- `/codex compact` 會要求 Codex 應用伺服器壓縮已附加的執行緒。
- `/codex review` 會針對已附加的執行緒啟動 Codex 原生檢閱。
- `/codex diagnostics [note]` 會在傳送已附加執行緒的 Codex 意見回饋前
  先進行詢問。
- `/codex account` 會顯示帳戶與速率限制狀態。
- `/codex mcp` 會列出 Codex 應用伺服器 MCP 伺服器狀態。
- `/codex skills` 會列出 Codex 應用伺服器技能。

針對大部分支援報告，請在發生錯誤的對話中使用 `/diagnostics [note]` 開始。它會建立一份 Gateway 診斷報告，若是 Codex
harness 工作階段，則會詢問是否核准傳送相關的 Codex 意見回饋套件。
如需隱私權模型與群組聊天行為，請參閱 [診斷匯出](/zh-Hant/gateway/diagnostics)。

只有在您特別需要為目前附加的執行緒上傳 Codex 意見回饋，而不需要完整的 Gateway
診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本機檢查 Codex 執行緒

檢查異常 Codex 執行的最快方式，通常是直接開啟原生 Codex
執行緒：

```bash
codex resume <thread-id>
```

請從已完成的 `/diagnostics` 回覆、`/codex binding` 或
`/codex threads [filter]` 取得執行緒 ID。

有關上傳機制與執行階段層級的診斷邊界，請參閱
[Codex harness 執行階段](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證依以下順序選擇：

1. 針對代理程式排序的 OpenAI 驗證設定檔，最好位於
   `auth.order.openai` 之下。執行 `openclaw doctor --fix` 以遷移較舊的
   舊版 Codex 驗證設定檔 ID 和舊版 Codex 驗證順序。
2. 該代理程式 Codex 家目錄中應用程式伺服器的現有帳戶。
3. 僅適用於本機 stdio 應用程式伺服器啟動，`CODEX_API_KEY`，然後
   `OPENAI_API_KEY`，當不存在應用程式伺服器帳戶且仍需要 OpenAI 驗證時。

當 OpenClaw 偵測到 ChatGPT 訂閱風格的 Codex 驗證設定檔時，它會從產生的
Codex 子行程中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。這能
讓 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，而
不會意外地讓原生 Codex 應用程式伺服器轉透過 API 計費。
明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後援使用
應用程式伺服器登入，而非繼承的子行程環境。WebSocket 應用程式伺服器
連線不會收到 Gateway 環境 API 金鑰後援；請使用明確的驗證設定檔或
遠端應用程式伺服器自己的帳戶。

如果訂閱設定檔達到 Codex 使用量限制，OpenClaw 會在 Codex 回報時
記錄重設時間，並針對相同的 Codex 執行嘗試下一個排序的驗證設定檔。
當重設時間過去後，訂閱設定檔再次變為符合資格，而無需變更所選的
`openai/gpt-*` 模型或 Codex 執行時期。

對於本機 stdio 應用程式伺服器啟動，OpenClaw 會將 `CODEX_HOME` 設定為
每個代理程式的目錄，以便 Codex 設定、驗證/帳戶檔案、外掛程式快取/資料
和原生執行緒狀態預設不會讀取或寫入操作員的個人 `~/.codex`。
OpenClaw 會保留正常的行程 `HOME`；Codex 執行的子行程
仍然可以找到使用者家目錄設定和權杖，而 Codex 可能會發現共用的
`$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 項目。

如果部署需要額外的環境隔離，請將那些變數新增至
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
OpenClaw 會在本機啟動
正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：
`CODEX_HOME` 保持每個代理程式獨立，而 `HOME` 保持繼承，以便
子程序可以使用一般的使用者主目錄狀態。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開
複製 Codex 原生工作區操作的動態工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。大多數剩餘的
OpenClaw 整合工具（例如訊息傳遞、媒體、cron、瀏覽器、節點、
閘道、`heartbeat_respond` 和 `web_search`）均可透過 `openclaw` 命名空間下的 Codex 工具
搜尋取得，使初始模型內容
更小。
`sessions_yield` 和僅限訊息工具的來源回覆會保持直接，因為
這些是回合控制合約。`sessions_spawn` 保持可搜尋狀態，因此 Codex 的
原生 `spawn_agent` 仍是主要的 Codex 子代理程式介面，而明確的
OpenClaw 或 ACP 委派仍可透過 `openclaw` 動態
工具命名空間使用。Heartbeat 協作指示會告訴 Codex 在工具尚未
載入時，在結束 heartbeat 回合之前先搜尋
`heartbeat_respond`。

僅在連接到無法搜尋延遲動態工具的自訂 Codex
應用程式伺服器，或偵錯完整
工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具內容中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex 應用程式伺服器回合中省略的其他 OpenClaw 動態工具名稱。   |
| `codexPlugins`             | disabled       | 對已設定的第一方 Codex 外掛程式/應用程式的原生 Codex 支援。         |

支援的 `appServer` 欄位：

| 欄位                                          | 預設值                                        | 含義                                                                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                     | `"stdio"` 會產生 Codex；`"websocket"` 會連線到 `url`。                                                                                                                                                                                                    |
| `command`                                     | 受管理的 Codex 執行檔                         | 用於 stdio 傳輸的可執行檔。保持未設定以使用受管理的二進位檔；僅在需要明確覆寫時設定。                                                                                                                                                                     |
| `args`                                        | `["app-server", "--listen", "stdio://"]`      | 用於 stdio 傳輸的引數。                                                                                                                                                                                                                                   |
| `url`                                         | unset                                         | WebSocket app-server URL。                                                                                                                                                                                                                                |
| `authToken`                                   | unset                                         | WebSocket 傳輸的 Bearer token。                                                                                                                                                                                                                           |
| `headers`                                     | `{}`                                          | 額外的 WebSocket 標頭。                                                                                                                                                                                                                                   |
| `clearEnv`                                    | `[]`                                          | 在 OpenClaw 建構繼承的環境之後，從產生的 stdio app-server 程序中移除額外的環境變數名稱。OpenClaw 會針對本機啟動保留每個代理程式的 `CODEX_HOME` 和繼承的 `HOME`。                                                                                          |
| `codeModeOnly`                                | `false`                                       | 選擇啟用僅限 Codex 程式碼模式的工具介面。OpenClaw 動態工具會向 Codex 註冊，因此巢狀 `tools.*` 呼叫會透過 app-server `item/tool/call` 橋接器傳回。                                                                                                         |
| `requestTimeoutMs`                            | `60000`                                       | app-server 控制平面呼叫的逾時時間。                                                                                                                                                                                                                       |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                       | 在 Codex 接受一次輪次，或在 OpenClaw 等待 `turn/completed` 時的輪次範圍 app-server 請求之後的安靜視窗。                                                                                                                                                   |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                      | 在工具移交、原生工具完成或工具後原始助手進度之後使用的完成閒置與進度防護，當 OpenClaw 等待 `turn/completed` 時。將其用於受信任或繁重的工作負載，其中工具後的綜合處理可以合法地保持安靜時間長於最終助手發布預算。                                          |
| `mode`                                        | 除非本地 Codex 需求不允許 YOLO，否則 `"yolo"` | 用於 YOLO 或守護者審核執行的預設。如果省略 `danger-full-access`、`never` 核准或 `user` 審核者的本地 stdio 需求，則會使其成為隱含的預設守護者。                                                                                                            |
| `approvalPolicy`                              | `"never"` 或允許的守護者核准策略              | 發送到執行緒啟動/恢復/輪次的原生 Codex 核准策略。如果允許，守護者預設值優先使用 `"on-request"`。                                                                                                                                                          |
| `sandbox`                                     | `"danger-full-access"` 或允許的守護者沙箱     | 發送到執行緒啟動/恢復的原生 Codex 沙箱模式。如果允許，守護者預設值優先使用 `"workspace-write"`，否則使用 `"read-only"`。當 OpenClaw 沙箱處於活動狀態時，`danger-full-access` 輪次使用 Codex `workspace-write`，其網絡存取權限源自 OpenClaw 沙箱出口設定。 |
| `approvalsReviewer`                           | `"user"` 或允許的守護者審核者                 | 使用 `"auto_review"` 讓 Codex 在允許時審核原生核准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍然是傳統的別名。                                                                                                                    |
| `serviceTier`                                 | 未設定                                        | 可選的 Codex 應用伺服器服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆蓋，而傳統的 `"fast"` 被接受為 `"priority"`。                                                                                                         |
| `experimental.sandboxExecServer`              | `false`                                       | 預覽選用功能，向 Codex 應用伺服器 0.132.0 或更新版本註冊由 OpenClaw 沙盒支援的 Codex 環境，以便原生 Codex 執行可以在作用中的 OpenClaw 沙盒內執行。                                                                                                        |

OpenClaw 擁有的動態工具呼叫會獨立於 `appServer.requestTimeoutMs` 進行限制：Codex `item/tool/call` 請求預設使用 90 秒的 OpenClaw 看門狗。正向的個別呼叫 `timeoutMs` 引數會延長或縮短該特定工具的預算。`image_generate` 工具在工具呼叫未提供其自身逾時時使用 `agents.defaults.imageGenerationModel.timeoutMs`，否則使用 120 秒的影像生成預設值。媒體理解 `image` 工具使用 `tools.media.image.timeoutSeconds` 或其 60 秒的媒體預設值。動態工具預算上限為 600000 毫秒。發生逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便輪次能夠繼續，而不是讓會話處於 `processing` 狀態。

在 Codex 接受一輪對話，且 OpenClaw 回應一輪範圍的 app-server 請求後，harness 預期 Codex 會推進當前輪次的進度，並最終以 `turn/completed` 完成原生輪次。如果 app-server 安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以便後續聊天訊息不會被排在過時的原生輪次後面。同一輪次的大部分非終端通知會解除該短時間看門狗，因為 Codex 已證明該輪次仍存活。工具切換使用較長的工具後閒置預算：在 OpenClaw 回傳 `item/tool/call` 回應後、在 `commandExecution` 等原生工具項目完成後、在原始 `custom_tool_call_output` 完成後，以及在工具後原始助手進度後。該守衛在設定時會使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否則預設為五分鐘。相同的工具後預算也會延長 Codex 發出下一個當前輪次事件前無聲合成視窗的進度看門狗。全域 app-server 通知（例如速率限制更新）不會重置輪次閒置進度。推理完成、註解 `agentMessage` 完成，以及工具前原始推理或助手進度之後可以接自動最終回覆，因此它們使用進度後回覆守衛，而不是立即釋放會話通道。只有最終/非註解的已完成 `agentMessage` 項目和工具前原始助手完成會啟動助手輸出釋放：如果 Codex 之後在沒有 `turn/completed` 的情況下安靜下來，OpenClaw 會盡力中斷原生輪次並釋放會話通道。可安全重試的 stdio app-server 失敗，包括沒有助手、工具、有效項目或副作用證據的輪次完成閒置逾時，會在新的 app-server 嘗試上重試一次。不安全的逾時仍然會淘汰卡住的 app-server 客戶端並釋放 OpenClaw 會話通道。它們也會清除過時的原生執行緒綁定，並顯示可恢復的逾時訊息供使用者或維護者判斷，而不是自動重試。逾時診斷包括最後一個 app-server 通知方法，以及對於原始助手回應項目，包括項目類型、角色、ID 和有限的助手文字預覽。

環境覆寫仍可用於本地測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。對於可重複的部署，建議使用設定，因為這能將外掛行為與 Codex harness 設定的其他部分保留在同一個已審查的檔案中。

## 原生 Codex 外掛

原生 Codex 外掛支援使用 Codex app-server 自身的應用程式和外掛功能，並與 OpenClaw harness 週期位於同一個 Codex 執行緒中。OpenClaw 不會將 Codex 外掛轉換為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的工作階段。它對內建 harness 執行、一般 OpenAI 提供者執行、ACP 對話繫結或其他 harness 沒有影響。

最簡遷移設定：

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

當 OpenClaw 建立 Codex harness 工作階段或取代過時的 Codex 執行緒繫結時，會計算執行緒應用程式設定。它不會在每個週期重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 工作階段以更新的應用程式集啟動。

如需遷移資格、應用程式庫存、破壞性操作原則、誘導和原生外掛診斷，請參閱[原生 Codex 外掛](/zh-Hant/plugins/codex-native-plugins)。

OpenAI 端的應用程式和外掛存取權是由登入的 Codex 帳戶，以及針對 Business 和 Enterprise/Edu 工作區的工作區應用程式控制項所控制。如需 OpenAI 的帳戶和工作區控制項概覽，請參閱[將 Codex 與您的 ChatGPT 方案搭配使用](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

## 電腦使用

電腦使用已在其專屬的設定指南中說明：[Codex 電腦使用](/zh-Hant/plugins/codex-computer-use)。

簡而言之：OpenClaw 並未包含 desktop-control 應用程式，也不會自行執行桌面操作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式回合中擁有原生 MCP 工具呼叫的權限。

## 執行時邊界

Codex harness 僅變更低階的嵌入式 agent 執行器。

- 支援 OpenClaw 動態工具。Codex 會要求 OpenClaw 執行這些工具，因此 OpenClaw 仍保留在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生應用工具由 Codex 擁有。OpenClaw 可以透過支援的轉送觀察或封鎖選定的原生事件，但它不會重寫原生工具引數。
- Codex 擁有原生壓縮。OpenClaw 會為通道歷史記錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換保留轉錄本鏡像，但它不會用 OpenClaw 或 context-engine 摘要器取代 Codex 壓縮。
- 媒體生成、媒體理解、TTS、審核和訊息工具輸出繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的轉錄本工具結果，而不適用於 Codex 原生工具結果記錄。

關於 hook 層、支援的 V1 介面、原生權限處理、佇列引導、Codex 回饋上傳機制和壓縮詳細資訊，請參閱 [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 未以正常的 `/model` 提供者顯示：**這對於新設定是預期的行為。選擇 `openai/gpt-*` 模型，啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用內建 harness 而非 Codex：**請確保模型參照是官方 OpenAI 提供者上的 `openai/gpt-*`，且已安裝並啟用 Codex 外掛。如果您在測試時需要嚴格的證明，請設定提供者或模型 `agentRuntime.id: "codex"`。強制的 Codex 執行時會失敗，而不是回退到 OpenClaw。

**OpenAI Codex runtime 回退至 API-key 路徑：** 收集一份經過編輯的 gateway 摘錄，其中顯示模型、runtime、選取的提供者以及失敗資訊。
請要求受影響的協作者在其 OpenClaw 主機上執行此唯讀指令：

```bash
(
  pattern='openai/gpt-5\.[45]|openai[-]codex|agentRuntime(\.id)?|harnessRuntime|Runtime: OpenAI Codex|legacy OpenAI Codex prefix|resolveSelectedOpenAIRuntimeProvider|candidateProvider[": ]+openai|status[": ]+401|Incorrect API key|No API key|api-key path|API-key path|OAuth'

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

有用的摘錄通常包含 `openai/gpt-5.5` 或 `openai/gpt-5.4`、
`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、
`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或
`No API key` 的結果。修正後的執行應顯示 OpenAI OAuth
路徑，而非單純的 OpenAI API-key 失敗。

**舊版 Codex 模型參考配置仍保留：** 執行 `openclaw doctor --fix`。
Doctor 會將舊版模型參考重寫為 `openai/*`，移除過時的 session 和
whole-agent runtime 釘選，並保留現有的 auth-profile 覆寫。

**App-server 被拒絕：** 請使用 Codex app-server `0.125.0` 或更新版本。
OpenClaw 會拒絕相同版本的 pre-release 或建置後綴版本，例如
`0.125.0-alpha.2` 或 `0.125.0+custom`，因為 OpenClaw 測試的是
穩定的 `0.125.0` 協議底限。

**`/codex status` 無法連線：** 請檢查內建的 `codex` 外掛程式是否
已啟用，當設定允許清單時 `plugins.allow` 是否包含它，以及
任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索速度慢：** 降低
`plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱
[Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`、
標頭，以及遠端 app-server 是否使用相同的 Codex app-server
協議版本。

**Native shell or patch tools are blocked with `Native hook relay unavailable`:**
the Codex thread is still trying to use a native hook relay id that OpenClaw no
longer has registered. This is a native Codex hook transport problem, not an ACP
backend, provider, GitHub, or shell-command failure. Start a fresh session in
the affected chat with `/new` or `/reset`, then retry a harmless command. If that
works once but the next native tool call fails again, treat `/new` as a temporary
workaround only: copy the prompt into a fresh session after restarting the Codex
app-server or OpenClaw Gateway so old threads are dropped and native hook
registrations are recreated.

**A non-Codex model uses the built-in harness:** that is expected unless
provider or model runtime policy routes it to another harness. Plain non-OpenAI
provider refs stay on their normal provider path in `auto` mode.

**Computer Use is installed but tools do not run:** check
`/codex computer-use status` from a fresh session. If a tool reports
`Native hook relay unavailable`, use the native hook relay recovery above. See
[Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting).

## Related

- [Codex harness reference](/zh-Hant/plugins/codex-harness-reference)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [Agent runtimes](/zh-Hant/concepts/agent-runtimes)
- [Model providers](/zh-Hant/concepts/model-providers)
- [OpenAI provider](/zh-Hant/providers/openai)
- [OpenAI Codex help](https://help.openai.com/en/collections/14937394-codex)
- [Agent harness plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Plugin hooks](/zh-Hant/plugins/hooks)
- [Diagnostics export](/zh-Hant/gateway/diagnostics)
- [Status](/zh-Hant/cli/status)
- [Testing](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
