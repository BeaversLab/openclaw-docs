---
summary: "透過隨附的 Codex app-server harness 執行 OpenClaw 嵌入式代理回合"
title: "Codex harness"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex harness config examples
  - You want Codex-only deployments to fail instead of falling back to PI
---

隨附的 `codex` 外掛程式讓 OpenClaw 能透過 Codex app-server 而非內建的 PI harness 來執行嵌入式代理回合。

當您希望 Codex 擁有低階代理工作階段時請使用此功能：模型探索、原生執行續恢復、原生壓縮以及 app-server 執行。
OpenClaw 仍然擁有聊天頻道、工作階段檔案、模型選擇、工具、核准、媒體傳遞以及可見的逐字稿鏡像。

如果您正在摸索方向，請從
[Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡單來說：
`openai/gpt-5.5` 是模型參考，`codex` 是執行時期，而 Telegram、
Discord、 Slack 或其他頻道則仍是通訊介面。

## 此外掛程式的變更內容

隨附的 `codex` 外掛程式提供了數個獨立功能：

| 功能                         | 使用方式                                               | 作用                                                          |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 原生嵌入式執行時期           | `agentRuntime.id: "codex"`                             | 透過 Codex app-server 執行 OpenClaw 嵌入式代理回合。          |
| 原生聊天控制指令             | `/codex bind`、 `/codex resume`、 `/codex steer`、 ... | 從訊息對話中綁定並控制 Codex app-server 執行緒。              |
| Codex app-server 提供者/目錄 | `codex` 內部機制，透過 harness 呈現                    | 讓執行時期能夠探索並驗證 app-server 模型。                    |
| Codex 媒體理解路徑           | `codex/*` 影像模型相容性路徑                           | 針對支援的影像理解模型執行有界的 Codex app-server 回合。      |
| 原生 Hook 中繼               | 圍繞 Codex 原生事件的外掛程式 Hooks                    | 讓 OpenClaw 能夠觀察/封鎖支援的 Codex 原生工具/最終處理事件。 |

啟用此外掛程式即可使用這些功能。它**不會**：

- 開始對每個 OpenAI 模型使用 Codex
- 將 `openai-codex/*` 模型參考轉換為原生執行時期
- 將 ACP/acpx 設為預設的 Codex 路徑
- 熱切換已記錄 PI 執行時期的現有工作階段
- 取代 OpenClaw 頻道傳遞、工作階段檔案、設定檔儲存或
  訊息路由

同一個插件也擁有原生 `/codex` 聊天控制指令介面。如果
啟用該插件，且使用者要求從聊天中綁定、恢復、引導、停止或檢查
Codex 執行緒，Agent 應優先選擇 `/codex ...` 而非 ACP。當使用者要求
ACP/acpx 或正在測試 ACP Codex 配接器時，ACP 仍是明確的後備方案。

原生 Codex 輪次將 OpenClaw 插件掛鉤保持為公開相容層。
這些是程序內 OpenClaw 掛鉤，而非 Codex `hooks.json` 指令掛鉤：

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `before_tool_call`, `after_tool_call`
- 針對鏡像文字紀錄的 `before_message_write`
- 透過 Codex `Stop` 中繼的 `before_agent_finalize`
- `agent_end`

插件也可以註冊執行階段中立的工具結果中介軟體，以便在 OpenClaw 執行工具之後、結果傳回給 Codex 之前重寫
OpenClaw 動態工具結果。這與公開的
`tool_result_persist` 插件掛鉤分開，後者會轉換 OpenClaw 擁有的文字紀錄
工具結果寫入。

關於插件掛鉤語意本身，請參閱 [插件掛鉤](/zh-Hant/plugins/hooks)
與 [插件防護行為](/zh-Hant/tools/plugin)。

駝具預設為關閉。新設定應將 OpenAI 模型參照
保持為標準的 `openai/gpt-*`，並在需要
原生應用程式伺服器執行時明確強制使用
`agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。舊版 `codex/*` 模型參照為了相容性仍會自動選擇
駝具，但執行階段支援的舊版提供者前綴
不會顯示為正常的模型/提供者選項。

如果已啟用 `codex` 外掛程式，但主要模型仍然是
`openai-codex/*`，則 `openclaw doctor` 會發出警告，而不是變更路由。這是
刻意的設計：`openai-codex/*` 仍然是 PI Codex OAuth/訂閱路徑，
而原生應用程式伺服器執行則維持為明確的執行階段選擇。

## 路由圖

在變更設定之前，請使用此表：

| 預期行為                              | 模型參照             | 執行階段設定                              | 外掛程式需求              | 預期狀態標籤                   |
| ------------------------------------- | -------------------- | ----------------------------------------- | ------------------------- | ------------------------------ |
| 透過一般 OpenClaw 執行器的 OpenAI API | `openai/gpt-*`       | 省略或 `runtime: "pi"`                    | OpenAI 提供者             | `Runtime: OpenClaw Pi Default` |
| 透過 PI 的 Codex OAuth/訂閱           | `openai-codex/gpt-*` | 省略或 `runtime: "pi"`                    | OpenAI Codex OAuth 提供者 | `Runtime: OpenClaw Pi Default` |
| 原生 Codex 應用程式伺服器嵌入式回合   | `openai/gpt-*`       | `agentRuntime.id: "codex"`                | `codex` 外掛程式          | `Runtime: OpenAI Codex`        |
| 使用保守自動模式的混合提供者          | 特定提供者的參照     | `agentRuntime.id: "auto"`                 | 選用外掛程式執行階段      | 取決於選取的執行階段           |
| 明確的 Codex ACP 配接器工作階段       | 取決於 ACP 提示/模型 | 具有 `runtime: "acp"` 的 `sessions_spawn` | 健全的 `acpx` 後端        | ACP 工作/工作階段狀態          |

重要的區分在於提供者與執行階段：

- `openai-codex/*` 回答「PI 應該使用哪個提供者/驗證路由？」
- `agentRuntime.id: "codex"` 回答「哪個迴圈應該執行此
  嵌入式回合？」
- `/codex ...` 回答「此聊天應該綁定
  或控制哪個原生 Codex 對話？」
- ACP 回答「acpx 應該啟動哪個外部 harness 程序？」

## 選擇正確的模型前綴

OpenAI 系列路由是依據前綴區分的。當您想要
透過 PI 使用 Codex OAuth 時，請使用 `openai-codex/*`；當您想要直接存取 OpenAI API 或
當您正在強制使用原生 Codex 應用程式伺服器 harness 時，請使用 `openai/*`：

| 模型參照                                      | 執行階段路徑                               | 使用時機                                                                  |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `openai/gpt-5.4`                              | 透過 OpenClaw/PI 管道的 OpenAI 提供者      | 您希望透過 `OPENAI_API_KEY` 取得目前的直接 OpenAI Platform API 存取權限。 |
| `openai-codex/gpt-5.5`                        | 透過 OpenClaw/PI 進行的 OpenAI Codex OAuth | 您希望使用預設的 PI runner 進行 ChatGPT/Codex 訂閱驗證。                  |
| `openai/gpt-5.5` + `agentRuntime.id: "codex"` | Codex app-server harness                   | 您希望針對嵌入式 agent 週期執行原生 Codex app-server。                    |

GPT-5.5 在 OpenClaw 中目前僅支援訂閱/OAuth。請使用
`openai-codex/gpt-5.5` 進行 PI OAuth，或搭配 Codex
app-server harness 使用 `openai/gpt-5.5`。一旦 OpenAI 在公開 API 上啟用 GPT-5.5，
將支援對 `openai/gpt-5.5` 的直接 API 金鑰存取。

舊版 `codex/gpt-*` 參照仍被接受為相容性別名。Doctor
相容性移轉會將舊版主要 runtime 參照重寫為標準模型
參照，並單獨記錄 runtime 原則，而僅作為後援的舊版參照
則保持不變，因為 runtime 是針對整個 agent 容器設定的。
新的 PI Codex OAuth 設定應使用 `openai-codex/gpt-*`；新的原生
app-server harness 設定應使用 `openai/gpt-*` 加上
`agentRuntime.id: "codex"`。

`agents.defaults.imageModel` 遵循相同的前綴分割。當影像理解應透過 OpenAI
Codex OAuth 提供者路徑執行時，請使用
`openai-codex/gpt-*`。當影像理解應透過
受限制的 Codex app-server 週期執行時，請使用 `codex/gpt-*`。Codex app-server 模型必須
宣佈支援影像輸入；僅限文字的 Codex 模型會在媒體週期
啟動前失敗。

使用 `/status` 確認目前工作階段的有效 harness。如果
選擇出乎意料，請為 `agents/harness` 子系統啟用除錯記錄
並檢查閘道的結構化 `agent harness selected` 記錄。它
包含選取的 harness ID、選取原因、runtime/後援原則，以及
在 `auto` 模式下，每個外掛候選者的支援結果。

### Doctor 警告的含義

`openclaw doctor` 在以下所有情況皆為真時發出警告：

- 內建的 `codex` 外掛已啟用或獲允許
- 代理的主要模型是 `openai-codex/*`
- 該代理的有效運行時不是 `codex`

出現此警告是因為用戶通常期望「已啟用 Codex 外掛」意味著「原生 Codex 應用程式伺服器運行時」。OpenClaw 不會進行這種跳躍推斷。該警告的意思是：

- 如果您打算透過 PI 進行 ChatGPT/Codex OAuth，則**無需進行任何變更**。
- 如果您打算進行原生應用程式伺服器執行，請將模型變更為 `openai/<model>` 並設定
  `agentRuntime.id: "codex"`。
- 在變更運行時後，現有會話仍然需要 `/new` 或 `/reset`，
  因為會話運行時釘選具有黏性。

駝具選擇並非即時會話控制。當執行嵌入式輪次時，OpenClaw 會在該會話上記錄所選的駝具 ID，並在同一會話 ID 的後續輪次中繼續使用它。當您希望未來的會話使用另一個駝具時，請變更 `agentRuntime` 設定或
`OPENCLAW_AGENT_RUNTIME`；在現有對話於 PI 和 Codex 之間切換之前，請使用 `/new` 或 `/reset` 啟動一個新會話。這可以避免在兩個不相容的原生會話系統中重播同一份逐字稿。

在引入駝具釘選之前建立的舊版會話，一旦具備逐字稿歷史記錄，就會被視為釘選至 PI。變更設定後，請使用 `/new` 或 `/reset` 將該對話加入 Codex。

`/status` 顯示有效模型運行時。預設 PI 駝具顯示為
`Runtime: OpenClaw Pi Default`，而 Codex 應用程式伺服器駝具顯示為
`Runtime: OpenAI Codex`。

## 需求

- OpenClaw 可使用隨附的 `codex` 外掛。
- Codex 應用程式伺服器 `0.125.0` 或更新版本。隨附的外掛預設會管理相容的
  Codex 應用程式伺服器二進位檔，因此 `PATH` 上的本機 `codex` 指令不
  會影響正常的駝具啟動。
- 應用程式伺服器程序可使用 Codex 驗證。

該外掛會阻擋較舊或未設定版本的應用程式伺服器交握。這可確保 OpenClaw 維持在已測試過的通訊協定介面上運作。

對於即時和 Docker 煙霧測試，驗證通常來自 `OPENAI_API_KEY`，加上
選用的 Codex CLI 檔案，例如 `~/.codex/auth.json` 和
`~/.codex/config.toml`。請使用您的本機 Codex app-server 使用的
相同驗證資料。

## 最小設定

使用 `openai/gpt-5.5`，啟用隨附的外掛程式，並強制使用 `codex` 運行時：

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
      agentRuntime: {
        id: "codex",
      },
    },
  },
}
```

如果您的設定使用 `plugins.allow`，請一併在其中包含 `codex`：

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

設定 `agents.defaults.model` 或將代理模型設為
`codex/<model>` 的舊版設定仍會自動啟用隨附的 `codex` 外掛程式。新設定應
偏好使用 `openai/<model>` 加上上述明確的 `agentRuntime` 項目。

## 將 Codex 與其他模型並列

如果同一個代理應該在 Codex 和非 Codex 提供者模型之間自由切換，請勿全域設定 `agentRuntime.id: "codex"`。強制的運行時會套用到該代理或工作階段的每個嵌入式回合。如果您在強制該運行時時選取了 Anthropic 模型，OpenClaw 仍會嘗試 Codex 運行時並封閉式失敗，而不是無聲地透過 PI 路由該回合。

改用下列其中一種形式：

- 使用 `agentRuntime.id: "codex"` 將 Codex 放在專用代理上。
- 將預設代理保留在 `agentRuntime.id: "auto"` 上，並保留 PI 回退以用於
  一般混合提供者使用。
- 僅為了相容性而使用舊版 `codex/*` 參照。新設定應偏好
  `openai/*` 加上明確的 Codex 運行時原則。

例如，這會讓預設代理保持一般自動選取，並
新增一個獨立的 Codex 代理：

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
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
        },
      },
    ],
  },
}
```

採用此形式：

- 預設的 `main` 代理使用一般提供者路徑和 PI 相容性回退。
- `codex` 代理使用 Codex app-server 運行時。
- 如果 `codex` 代理缺少或不支援 Codex，回合將會失敗
  而不是無聲地使用 PI。

## 代理命令路由

代理應根據意圖路由使用者請求，而不僅僅是「Codex」這個字：

| 使用者要求...                                         | 代理應使用...                                 |
| ----------------------------------------------------- | --------------------------------------------- |
| 「將此聊天綁定至 Codex」                              | `/codex bind`                                 |
| 「在此繼續 Codex 執行緒 `<id>`」                      | `/codex resume <id>`                          |
| 「顯示 Codex 執行緒」                                 | `/codex threads`                              |
| 「使用 Codex 作為此代理程式的執行階段」               | 組態變更為 `agentRuntime.id`                  |
| 「搭配一般的 OpenClaw 使用我的 ChatGPT/Codex 訂閱」   | `openai-codex/*` 模型參考                     |
| 「透過 ACP/acpx 執行 Codex」                          | ACP `sessions_spawn({ runtime: "acp", ... })` |
| 「在執行緒中啟動 Claude Code/Gemini/OpenCode/Cursor」 | ACP/acpx，而非 `/codex` 且非原生子代理程式    |

僅當 ACP 已啟用、可分派且由已載入的執行階段後端支援時，OpenClaw 才會向代理程式通告 ACP 產生指引。如果 ACP 無法使用，系統提示和插件技能不應教導代理程式有關 ACP 路由的知識。

## 僅 Codex 部署

當您需要證明每個內嵌代理程式輪次都使用 Codex 時，請強制使用 Codex harness。明確的插件執行階段預設為不回退至 PI，因此 `fallback: "none"` 是選用的，但通常作為文件記錄很有用：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

環境覆寫：

```bash
OPENCLAW_AGENT_RUNTIME=codex openclaw gateway run
```

在強制使用 Codex 的情況下，如果 Codex 插件已停用、應用程式伺服器過舊或應用程式伺服器無法啟動，OpenClaw 會提早失敗。僅當您有意讓 PI 處理缺少的 harness 選擇時，才設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=pi`。

## 個別代理程式的 Codex

您可以讓一個代理程式僅使用 Codex，而預設代理程式保持一般的自動選取：

```json5
{
  agents: {
    defaults: {
      agentRuntime: {
        id: "auto",
        fallback: "pi",
      },
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
        agentRuntime: {
          id: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

使用一般的工作階段指令來切換代理程式和模型。`/new` 會建立全新的 OpenClaw 工作階段，且 Codex harness 會視需要建立或恢復其 sidecar 應用程式伺服器執行緒。`/reset` 會清除該執行緒的 OpenClaw 工作階段繫結，並讓下一輪再次從目前的組態中解析 harness。

## 模型探索

預設情況下，Codex 插件會向應用程式伺服器要求可用的模型。如果探索失敗或逾時，它會針對以下項目使用套件的後援目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

您可以在 `plugins.entries.codex.config.discovery` 下調整探索設定：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

當您希望啟動時避免探查 Codex 並堅持使用後援目錄時，請停用探索：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## 應用程式伺服器連線與原則

預設情況下，插件會在本機使用以下方式啟動 OpenClaw 受管理的 Codex 二進位檔：

```bash
codex app-server --listen stdio://
```

受控二進制檔案被宣告為隨附外掛程式執行時相依性，並與其餘的 `codex` 外掛程式相依性一起部署。這可確保應用程式伺服器版本與隨附外掛程式綁定，而非取決於本機安裝的個別 Codex CLI。僅在您刻意想要執行不同的可執行檔時，才設定 `appServer.command`。

根據預設，OpenClaw 會以 YOLO 模式啟動本機 Codex harness 工作階段：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。這是用於自主心跳運作的受信任本機操作員姿態：Codex 可以使用 shell 和網路工具，而不會在沒人回應的原生核准提示上停止。

若要選擇採用 Codex guardian-reviewed 核准，請設定 `appServer.mode:
"guardian"`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "fast",
          },
        },
      },
    },
  },
}
```

Guardian 模式使用 Codex 的原生自動審查核准路徑。當 Codex 要求
離開沙箱、在工作區外寫入或新增網路存取等權限時，Codex 會將該核准請求傳送至原生審查者，而非提示人工。審查者會套用 Codex 的風險架構，並核准或拒絕
該特定請求。當您需要比 YOLO 模式更多防護，但仍需無人值守的代理程式持續運作時，請使用 Guardian 模式。

`guardian` 預設會展開為 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。
個別的原則欄位仍會覆寫 `mode`，因此進階部署可以將預設與明確選項混合使用。較舊的 `guardian_subagent` 審查者值
仍會被接受為相容性別名，但新設定應使用
`auto_review`。

對於已執行的應用程式伺服器，請使用 WebSocket 傳輸：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://127.0.0.1:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

支援的 `appServer` 欄位：

| 欄位                | 預設值                                   | 含義                                                                                      |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 會產生 (spawn) Codex；`"websocket"` 會連接到 `url`。                            |
| `command`           | 受控 Codex 二進位檔                      | 用於 stdio 傳輸的可執行檔。保留未設置以使用受控二進位檔；僅在明確覆寫時進行設定。         |
| `args`              | `["app-server", "--listen", "stdio://"]` | stdio 傳輸的引數。                                                                        |
| `url`               | unset                                    | WebSocket 應用程式伺服器 URL。                                                            |
| `authToken`         | unset                                    | WebSocket 傳輸的 Bearer token。                                                           |
| `headers`           | `{}`                                     | 額外的 WebSocket 標頭。                                                                   |
| `requestTimeoutMs`  | `60000`                                  | 應用程式伺服器控制平面呼叫的逾時時間。                                                    |
| `mode`              | `"yolo"`                                 | 用於 YOLO 或守護者審查執行的預設設定。                                                    |
| `approvalPolicy`    | `"never"`                                | 傳送至執行緒啟動/恢復/回合的原生 Codex 核准策略。                                         |
| `sandbox`           | `"danger-full-access"`                   | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。                                              |
| `approvalsReviewer` | `"user"`                                 | 使用 `"auto_review"` 讓 Codex 審查原生核准提示。`guardian_subagent` 仍為舊版別名。        |
| `serviceTier`       | unset                                    | 選用的 Codex 應用程式伺服器服務層級：`"fast"`、`"flex"` 或 `null`。無效的舊版值會被忽略。 |

環境變數覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當 `appServer.command` 未設定時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或是使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。由於設定會將外掛程式行為保留在與 Codex harness 設定其餘部分相同的已審查檔案中，因此建議用於可重複的部署。

## 電腦使用

Computer Use 是一個 Codex 原生的 MCP 外掛程式。OpenClaw 並不附帶桌面控制應用程式，也不會自行執行桌面操作；它會啟用 Codex 應用程式伺服器外掛程式，在請求時安裝已設定的 Codex 市集外掛程式，檢查 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式輪次中處理原生的 MCP 工具呼叫。

當您希望 Codex 模式輪次需要 Computer Use 時，請設定 `plugins.entries.codex.config.computerUse`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      embeddedHarness: {
        runtime: "codex",
      },
    },
  },
}
```

如果沒有市集欄位，OpenClaw 會要求 Codex 應用程式伺服器使用其探索到的市集。在全新的 Codex 環境中，應用程式伺服器會植入官方策劃的市集，而 OpenClaw 遵循與 Codex 相同的載入形狀：在安裝期間輪詢 `plugin/list`，然後才將 Computer Use 視為不可用。預設的探索等待時間為 60 秒，可以使用 `marketplaceDiscoveryTimeoutMs` 進行調整。如果多個已知的 Codex 市集包含 Computer Use，OpenClaw 會在使用 Codex 市集偏好順序後，才因未知的不符配對而失敗關閉。

使用 `marketplaceSource` 指定應用程式伺服器可以新增的非預設 Codex 市集來源，或使用 `marketplacePath` 指定機器上已存在的本機市集檔案。如果市集已向 Codex 應用程式伺服器註冊，請改用 `marketplaceName`。預設值為 `pluginName: "computer-use"` 和 `mcpServerName: "computer-use"`。為了安全起見，輪次開始時的自動安裝僅使用應用程式伺服器已探索到的市集。使用 `/codex computer-use install` 從已設定的 `marketplaceSource` 或 `marketplacePath` 進行明確安裝。

相同的設定可以從指令介面檢查或安裝：

- `/codex computer-use status`
- `/codex computer-use install`
- `/codex computer-use install --source <marketplace-source>`
- `/codex computer-use install --marketplace-path <path>`

Computer Use 是 macOS 專用的，在 Codex MCP 伺服器控制應用程式之前，可能需要本機 OS 權限。如果 `computerUse.enabled` 為 true 且 MCP 伺服器不可用，則 Codex 模式輪次會在執行緒開始前失敗，而不是在沒有原生 Computer Use 工具的情況下靜默執行。

## 常見配方

具有預設 stdio 傳輸的本機 Codex：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

僅 Codex 套接驗證：

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
      },
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

Guardian 審閱的 Codex 批准：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            approvalPolicy: "on-request",
            approvalsReviewer: "auto_review",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

具有明確標頭的遠端應用伺服器：

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
            headers: {
              "X-OpenClaw-Agent": "main",
            },
          },
        },
      },
    },
  },
}
```

模型切換保持由 OpenClaw 控制。當 OpenClaw 會話附加到現有 Codex 執行緒時，下一輪會將當前選取的 OpenAI 模型、提供者、批准原則、沙盒和服務層級再次發送到應用伺服器。從 `openai/gpt-5.5` 切換到 `openai/gpt-5.2` 會保持執行緒綁定，但會要求 Codex 使用新選取的模型繼續。

## Codex 指令

隨附的插件將 `/codex` 註冊為已授權的斜線指令。它是通用的，適用於任何支援 OpenClaw 文字指令的頻道。

常見形式：

- `/codex status` 顯示即時應用伺服器連線、模型、帳戶、速率限制、MCP 伺服器和技能。
- `/codex models` 列出即時 Codex 應用伺服器模型。
- `/codex threads [filter]` 列出最近的 Codex 執行緒。
- `/codex resume <thread-id>` 將當前 OpenClaw 會話附加到現有 Codex 執行緒。
- `/codex compact` 要求 Codex 應用伺服器壓縮附加的執行緒。
- `/codex review` 啟動附加執行緒的 Codex 原生審閱。
- `/codex computer-use status` 檢查已設定的 Computer Use 插件和 MCP 伺服器。
- `/codex computer-use install` 安裝已設定的 Computer Use 插件並重新載入 MCP 伺服器。
- `/codex account` 顯示帳戶和速率限制狀態。
- `/codex mcp` 列出 Codex 應用伺服器 MCP 伺服器狀態。
- `/codex skills` 列出 Codex 應用伺服器技能。

`/codex resume` 寫入與套接用於正常回合相同的附屬綁定檔案。在下一則訊息中，OpenClaw 會恢復該 Codex 執行緒，將當前選取的 OpenClaw 模型傳遞給應用伺服器，並保持啟用擴充歷程記錄。

指令介面需要 Codex 應用伺服器 `0.125.0` 或更新版本。如果未來或自訂應用伺服器未公開該 JSON-RPC 方法，個別控制方法會被回報為 `unsupported by this Codex app-server`。

## Hook 邊界

Codex 套接有三層 Hook：

| 層                            | 擁有者                | 目的                                                 |
| ----------------------------- | --------------------- | ---------------------------------------------------- |
| OpenClaw 插件 Hook            | OpenClaw              | PI 和 Codex harness 之間的產品/外掛程式相容性。      |
| Codex app-server 擴充中介軟體 | OpenClaw 內建外掛程式 | 圍繞 OpenClaw 動態工具的每輪轉接器行為。             |
| Codex 原生 hooks              | Codex                 | 來自 Codex 設定的低階 Codex 生命週期和原生工具原則。 |

OpenClaw 不使用專案或全域 Codex `hooks.json` 檔案來路由
OpenClaw 外掛程式行為。對於支援的原生工具和權限橋接器，
OpenClaw 會為 `PreToolUse`、`PostToolUse`、
`PermissionRequest` 和 `Stop` 注入每個執行緒的 Codex 設定。其他 Codex hooks（例如 `SessionStart` 和
`UserPromptSubmit`）仍然是 Codex 層級的控制；它們不會作為
v1 合約中的 OpenClaw 外掛程式 hooks 來公開。

對於 OpenClaw 動態工具，OpenClaw 會在 Codex 要求呼叫後執行該工具，
因此 OpenClaw 會在其擁有的 harness 轉接器中觸發外掛程式和中介軟體行為。
對於 Codex 原生工具，Codex 擁有規範工具記錄。
OpenClaw 可以鏡像選定的事件，但除非 Codex 透過 app-server 或原生 hook
回呼公開該操作，否則它無法重寫原生 Codex 執行緒。

壓縮和 LLM 生命週期投影來自 Codex app-server 通知和
OpenClaw 轉接器狀態，而非原生 Codex hook 指令。
OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是轉接器層級的觀察結果，而非
Codex 內部請求或壓縮 payload 的逐位元組擷取。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知會
投影為 `codex_app_server.hook` 代理程式事件，用於軌跡和偵錯。
它們不會叫用 OpenClaw 外掛程式 hooks。

## V1 支援合約

Codex 模式並非在底下使用不同模型呼叫的 PI。Codex 擁有更多的
原生模型迴圈，而 OpenClaw 會圍繞該邊界調整其外掛程式和工作階段表面。

Codex runtime v1 支援項目：

| 表面                              | 支援                 | 原因                                                                                                                                                              |
| --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 透過 Codex 的 OpenAI 模型迴圈     | 已支援               | Codex app-server 擁有 OpenAI 輪次、原生執行緒恢復和原生工具接續。                                                                                                 |
| OpenClaw 頻道路由與傳遞           | 支援                 | Telegram、Discord、Slack、WhatsApp、iMessage 和其他通道保持在模型執行時之外。                                                                                     |
| OpenClaw 動態工具                 | 支援                 | Codex 要求 OpenClaw 執行這些工具，因此 OpenClaw 保持在執行路徑中。                                                                                                |
| 提示與上下文外掛                  | 支援                 | OpenClaw 在啟動或恢復執行緒之前，建構提示覆蓋層並將上下文投射到 Codex 回合中。                                                                                    |
| 上下文引擎生命週期                | 支援                 | 組裝、擷取或回合後維護，以及上下文引擎壓縮協調會針對 Codex 回合運行。                                                                                             |
| 動態工具掛鉤                      | 支援                 | `before_tool_call`、`after_tool_call` 和工具結果中介軟體圍繞 OpenClaw 擁有的動態工具運行。                                                                        |
| 生命週期掛鉤                      | 作為配接器觀察支援   | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 會以真實的 Codex 模式負載觸發。                                                 |
| 最終答案修訂閘門                  | 透過原生掛鉤中繼支援 | Codex `Stop` 會中繼到 `before_agent_finalize`；`revise` 會在完成前要求 Codex 再進行一次模型傳遞。                                                                 |
| 原生 Shell、修補和 MCP 封鎖或觀察 | 透過原生掛鉤中繼支援 | 針對已提交的原生工具介面（包括 Codex 應用程式伺服器 `0.125.0` 或更新版本上的 MCP 負載），Codex `PreToolUse` 和 `PostToolUse` 會被中繼。支援封鎖；不支援引數重寫。 |
| 原生權限政策                      | 透過原生掛鉤中繼支援 | Codex `PermissionRequest` 可以在執行時暴露的地方透過 OpenClaw 政策路由。如果 OpenClaw 未傳回決策，Codex 將繼續執行其正常的守護者或使用者核准路徑。                |
| 應用程式伺服器軌跡擷取            | 支援                 | OpenClaw 會記錄它傳送至應用程式伺服器的請求以及它收到的應用程式伺服器通知。                                                                                       |

Codex 執行時 v1 中不支援：

| 介面                                          | V1 界線                                                                                                 | 未來路徑                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 原生工具引數變異                              | Codex 原生前置工具掛鉤可以封鎖，但 OpenClaw 不會重寫 Codex 原生工具引數。                               | 需要 Codex hook/schema 支援才能進行工具輸入替換。               |
| 可編輯的 Codex 原生對話紀錄歷程               | Codex 擁有正規的原生執行緒歷程。OpenClaw 擁有一份鏡像並可投射未來的上下文，但不應變更不支援的內部結構。 | 如果需要進行原生執行緒手術，請新增明確的 Codex app-server API。 |
| `tool_result_persist` 用於 Codex 原生工具記錄 | 該 hook 轉換 OpenClaw 擁有的對話紀錄寫入，而非 Codex 原生工具記錄。                                     | 可以鏡像轉換後的記錄，但正規重寫需要 Codex 支援。               |
| 豐富的原生壓縮元資料                          | OpenClaw 觀察壓縮的開始與完成，但不會收到穩定的保留/丟棄清單、token 差異或摘要 payload。                | 需要更豐富的 Codex 壓縮事件。                                   |
| 壓縮介入                                      | 目前的 OpenClaw 壓縮 hooks 在 Codex 模式下屬於通知層級。                                                | 如果外掛需要否決或重寫原生壓縮，請新增 Codex 壓縮前/後 hooks。  |
| 逐位元組的模型 API 請求擷取                   | OpenClaw 可以擷取 app-server 請求和通知，但 Codex 核心會在內部建構最終的 OpenAI API 請求。              | 需要 Codex 模型請求追蹤事件或 debug API。                       |

## 工具、媒體與壓縮

Codex harness 僅變更底層的嵌入式代理程式執行器。

OpenClaw 仍會建構工具清單並從 harness 接收動態工具結果。文字、圖片、影片、音樂、TTS、核准與訊息工具輸出會繼續透過正常的 OpenClaw 傳遞路徑。

原生 hook 中繼器刻意設計為通用，但 v1 支援合約僅限於 OpenClaw 測試的 Codex 原生工具與權限路徑。在 Codex 執行時中，這包括 shell、patch 和 MCP `PreToolUse`、`PostToolUse` 與 `PermissionRequest` payload。在執行時合約命名之前，請勿假設每個未來的 Codex hook 事件都是 OpenClaw 外掛介面。

對於 `PermissionRequest`，OpenClaw 僅在政策決定時傳回明確的允許或拒絕決策。無決策結果並非允許。Codex 將其視為無 hook 決策，並回退至其自身的 guardian 或使用者核准路徑。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具批准請求會透過 OpenClaw 的外掛程式批准流程進行路由。Codex `request_user_input` 提示會被傳送回來源聊天，而下一個排隊的後續訊息將回應該原生伺服器請求，而不是被引導為額外的上下文。其他 MCP 請求仍然會以失敗關閉。

當選取的模型使用 Codex harness 時，原生執行緒壓縮會委派給 Codex app-server。OpenClaw 會保留一份文字記錄鏡像，用於頻道歷史記錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。該鏡像包括使用者提示、最終助理文字，以及當 app-server 發出時的輕量級 Codex 推理或計劃記錄。目前，OpenClaw 僅記錄原生壓縮的開始和完成訊號。它尚未公開可讀取的壓縮摘要或 Codex 在壓縮後保留哪些項目的可稽核清單。

由於 Codex 擁有標準的原生執行緒，因此 `tool_result_persist` 目前不會重寫 Codex 原生工具結果記錄。它僅在 OpenClaw 寫入 OpenClaw 擁有的會話文字記錄工具結果時適用。

媒體生成不需要 PI。圖片、影片、音樂、PDF、TTS 和媒體理解繼續使用相符的提供者/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 疑難排解

**Codex 未顯示為正常的 `/model` 提供者：** 對於新組態來說這是預期的。選取一個具有 `agentRuntime.id: "codex"` 的 `openai/gpt-*` 模型（或舊版 `codex/*` ref），啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 當沒有 Codex harness 宣告執行時，`agentRuntime.id: "auto"` 仍可使用 PI 作為相容性後端。在測試時設定 `agentRuntime.id: "codex"` 以強制選擇 Codex。除非您明確設定 `agentRuntime.fallback: "pi"`，否則強制的 Codex 執行階段現在會失敗，而不是退回到 PI。一旦選擇了 Codex app-server，其失敗會直接顯示，而不會有額外的後援配置。

**App-server 被拒絕：** 升級 Codex，使 app-server 交握報告的版本為 `0.125.0` 或更新。相同版本的預發布版本或帶有建置後綴的版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 測試的是穩定的 `0.125.0` 通訊協定底線。

**Model discovery 速度緩慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用 discovery。

**WebSocket 傳輸立即失敗：** 檢查 `appServer.url`、`authToken`，以及遠端 app-server 是否使用相同的 Codex app-server 通訊協定版本。

**非 Codex 模型使用 PI：** 除非您針對該 agent 強制設定了 `agentRuntime.id: "codex"` 或選擇了舊版 `codex/*` ref，否則這是預期行為。單純的 `openai/gpt-*` 和其他 provider ref 在 `auto` 模式下會維持其正常的 provider 路徑。如果您強制設定 `agentRuntime.id: "codex"`，該 agent 的每個嵌入式轉場都必須是 Codex 支援的 OpenAI 模型。

## 相關

- [Agent harness 外掛](/zh-Hant/plugins/sdk-agent-harness)
- [Agent runtimes](/zh-Hant/concepts/agent-runtimes)
- [Model providers](/zh-Hant/concepts/model-providers)
- [OpenAI provider](/zh-Hant/providers/openai)
- [狀態](/zh-Hant/cli/status)
- [外掛 hooks](/zh-Hant/plugins/hooks)
- [設定參考](/zh-Hant/gateway/configuration-reference)
- [測試](/zh-Hant/help/testing-live#live-codex-app-server-harness-smoke)
