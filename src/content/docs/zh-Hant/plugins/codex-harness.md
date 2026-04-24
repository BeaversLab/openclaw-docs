---
title: "Codex Harness"
summary: "透過內建的 Codex app-server harness 執行 OpenClaw 嵌入式代理程式回合"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Codex Harness

內建的 `codex` 外掛程式讓 OpenClaw 能透過 Codex app-server
而非內建的 PI harness 來執行嵌入式代理程式回合。

當您希望 Codex 接管低層級 agent 工作階段時，請使用此選項：模型
探索、原生執行緒恢復、原生壓縮，以及 app-server 執行。
OpenClaw 仍擁有聊天頻道、工作階段檔案、模型選擇、工具、
核准、媒體傳遞以及可見的逐字稿鏡像。

原生 Codex 回合也會遵守共享的外掛程式鉤子 (hooks)，因此提示填補 (prompt shims)、
感知壓縮的自動化、工具中介軟體和生命週期觀察器會與
PI harness 保持一致：

- `before_prompt_build`
- `before_compaction`, `after_compaction`
- `llm_input`, `llm_output`
- `tool_result`, `after_tool_call`
- `before_message_write`
- `agent_end`

內建的外掛程式也可以註冊 Codex app-server 擴充功能工廠，以新增
非同步 `tool_result` 中介軟體，而鏡像的 Codex 逐字稿寫入作業會透過
`before_message_write` 進行路由。

Harness 預設為關閉。只有在啟用 `codex` 外掛程式
且解析出的模型是 `codex/*` 模型時，或是當您明確
強制使用 `embeddedHarness.runtime: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex` 時，才會選用它。
如果您從未設定 `codex/*`，現有的 PI、OpenAI、Anthropic、Gemini、本機
和自訂提供者執行作業將會維持目前的行為。

## 選擇正確的模型前綴

OpenClaw 有針對 OpenAI 和 Codex 形式存取的獨立路由：

| Model ref              | Runtime path                          | Use when                                                       |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------- |
| `openai/gpt-5.4`       | 透過 OpenClaw/PI 管道的 OpenAI 提供者 | 您想要使用 `OPENAI_API_KEY` 直接存取 OpenAI Platform API。     |
| `openai-codex/gpt-5.4` | 透過 PI 的 OpenAI Codex OAuth 提供者  | 您想要 ChatGPT/Codex OAuth 而不使用 Codex app-server harness。 |
| `codex/gpt-5.4`        | 內建的 Codex 提供者與 Codex harness   | 您想要針對嵌入式代理程式回合執行原生 Codex app-server。        |

Codex harness 僅佔用 `codex/*` 模型引用。現有的 `openai/*`、
`openai-codex/*`、Anthropic、Gemini、xAI、本機及自訂提供者引用會
維持其正常路徑。

## 需求

- 具有可用之隨附 `codex` 外掛程式的 OpenClaw。
- Codex app-server `0.118.0` 或更新版本。
- App-server 程序可用的 Codex 驗證。

此外掛程式會封鎖較舊或未設定版本的 app-server 交握。這能確保
OpenClaw 維持在已測試過的通訊協定介面上。

對於即時和 Docker 煙霧測試，驗證通常來自 `OPENAI_API_KEY`，外加
選用的 Codex CLI 檔案，例如 `~/.codex/auth.json` 和
`~/.codex/config.toml`。請使用您本機 Codex app-server
所使用的相同驗證資料。

## 最精簡設定

使用 `codex/gpt-5.4`，啟用隨附的外掛程式，並強制使用 `codex` harness：

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
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

如果您的設定使用 `plugins.allow`，請一併在其中加入 `codex`：

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

將 `agents.defaults.model` 或代理程式模型設定為 `codex/<model>` 也會
自動啟用隨附的 `codex` 外掛程式。在共用設定中，明確的外掛程式條目
仍然有用，因為它讓部署意圖更加明確。

## 新增 Codex 而不取代其他模型

當您希望 Codex 用於 `codex/*` 模型，而 PI 用於
其他所有模型時，請保留 `runtime: "auto"`：

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
      model: {
        primary: "codex/gpt-5.4",
        fallbacks: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
      },
      models: {
        "codex/gpt-5.4": { alias: "codex" },
        "codex/gpt-5.4-mini": { alias: "codex-mini" },
        "openai/gpt-5.4": { alias: "gpt" },
        "anthropic/claude-opus-4-6": { alias: "opus" },
      },
      embeddedHarness: {
        runtime: "auto",
        fallback: "pi",
      },
    },
  },
}
```

使用此結構：

- `/model codex` 或 `/model codex/gpt-5.4` 使用 Codex app-server harness。
- `/model gpt` 或 `/model openai/gpt-5.4` 使用 OpenAI 提供者路徑。
- `/model opus` 使用 Anthropic 提供者路徑。
- 如果選取了非 Codex 模型，PI 將維持為相容性 harness。

## 僅限 Codex 的部署

當您需要證明每個內嵌代理程式輪次都使用 Codex harness 時，請停用 PI 回退：

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

環境覆寫：

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

停用回退後，如果 Codex 外掛程式已停用、
要求的模型不是 `codex/*` 引用、app-server 太舊或
app-server 無法啟動，OpenClaw 將會提早失敗。

## 個別代理程式的 Codex

您可以讓其中一個代理程式僅使用 Codex，而預設代理程式則保持正常的
自動選擇：

```json5
{
  agents: {
    defaults: {
      embeddedHarness: {
        runtime: "auto",
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
        model: "codex/gpt-5.4",
        embeddedHarness: {
          runtime: "codex",
          fallback: "none",
        },
      },
    ],
  },
}
```

使用正常的 session 指令來切換代理程式和模型。`/new` 會建立一個全新的
OpenClaw session，而 Codex harness 會視需要建立或恢復其 sidecar app-server
執行緒。`/reset` 會清除該執行緒的 OpenClaw session 繫結。

## 模型探索

根據預設，Codex 外掛程式會向 app-server 要求可用的模型。如果
探索失敗或逾時，它會使用內建的後援目錄：

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

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

## App-server 連線與政策

根據預設，此外掛程式會在本地啟動 Codex，設定如下：

```bash
codex app-server --listen stdio://
```

根據預設，OpenClaw 會以 YOLO 模式啟動本地 Codex harness sessions：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。這是用於自主心跳的受信任本地操作員姿態：
Codex 可以使用 shell 和網路工具，而不會在無人在場回應的原生核准提示上停止。

若要選擇採用 Codex guardian 審查的核准，請設定 `appServer.mode:
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

Guardian 模式展開為：

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
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

Guardian 是一個原生 Codex 核准審查者。當 Codex 要求離開
沙箱、在工作區之外寫入，或新增權限（例如網路存取）時，
Codex 會將該核准要求路由傳送到審查者子代理程式，而不是人類
提示。審查者會收集內容並套用 Codex 的風險框架，然後
核准或拒絕特定請求。當您想要比 YOLO 模式更多的
防護機制，但仍需要無人值守的代理程式和心跳
來取得進展時，Guardian 很有用。

Docker live harness 包含 Guardian 探測，當
`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1` 時。它會以 Guardian 模式啟動 Codex harness，
驗證良性的升級 shell 指令已獲核准，並
驗證上傳假密祕到不受信任的外部目的地會
被拒絕，以便代理程式回頭要求明確核准。

個別的政策欄位仍會覆蓋 `mode`，因此進階部署可以
將預設設定與明確選擇混合使用。

對於已經運行的應用伺服器，請使用 WebSocket 傳輸：

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
| `transport`         | `"stdio"`                                | `"stdio"` 生成 Codex；`"websocket"` 連線至 `url`。                                        |
| `command`           | `"codex"`                                | 用於 stdio 傳輸的可執行檔。                                                               |
| `args`              | `["app-server", "--listen", "stdio://"]` | 用於 stdio 傳輸的參數。                                                                   |
| `url`               | 未設定                                   | WebSocket 應用伺服器 URL。                                                                |
| `authToken`         | 未設定                                   | WebSocket 傳輸的 Bearer token。                                                           |
| `headers`           | `{}`                                     | 額外的 WebSocket 標頭。                                                                   |
| `requestTimeoutMs`  | `60000`                                  | 應用程式伺服器控制平面呼叫的逾時時間。                                                    |
| `mode`              | `"yolo"`                                 | 用於 YOLO 或守護者審查執行的預設值。                                                      |
| `approvalPolicy`    | `"never"`                                | 傳送至執行緒啟動/恢復/輪次的原生 Codex 審核政策。                                         |
| `sandbox`           | `"danger-full-access"`                   | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。                                              |
| `approvalsReviewer` | `"user"`                                 | 使用 `"guardian_subagent"` 讓 Codex Guardian 審查提示詞。                                 |
| `serviceTier`       | 未設定                                   | 選用的 Codex 應用程式伺服器服務等級：`"fast"`、`"flex"` 或 `null`。無效的舊版值將被忽略。 |

較舊的環境變數在未設定相符的設定欄位時，仍可作為本機測試的備援方案：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。請改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。對於可重複的部署，建議使用配置，因為它可以將外掛行為與 Codex harness 設定的其他部分保持在同一個經過審查的檔案中。

## 常見配方

具有預設 stdio 傳輸的本地 Codex：

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

僅限 Codex 的 harness 驗證，並停用 PI 備援：

```json5
{
  embeddedHarness: {
    fallback: "none",
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

經 Guardian 審查的 Codex 核准：

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
            approvalsReviewer: "guardian_subagent",
            sandbox: "workspace-write",
          },
        },
      },
    },
  },
}
```

具有明確標頭的遠端 app-server：

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

模型切換仍由 OpenClaw 控制。當 OpenClaw 會話附加到現有 Codex 執行緒時，下一輪會將目前選取的
`codex/*` 模型、提供者、核准策略、沙箱和服務層級再次傳送給 app-server。從 `codex/gpt-5.4` 切換到 `codex/gpt-5.2` 會保持執行緒綁定，但要求 Codex 使用新選取的模型繼續。

## Codex 指令

隨附的外掛會註冊 `/codex` 為已授權的斜線指令。它是通用的，適用於任何支援 OpenClaw 文字指令的頻道。

常見形式：

- `/codex status` 顯示即時 app-server 連線、模型、帳戶、速率限制、MCP 伺服器和技能。
- `/codex models` 列出即時 Codex app-server 模型。
- `/codex threads [filter]` 列出最近的 Codex 執行緒。
- `/codex resume <thread-id>` 將目前的 OpenClaw 會話附加到現有 Codex 執行緒。
- `/codex compact` 要求 Codex app-server 壓縮附加的執行緒。
- `/codex review` 對附加的執行緒啟動 Codex 原生審查。
- `/codex account` 顯示帳戶和速率限制狀態。
- `/codex mcp` 列出 Codex app-server MCP 伺服器狀態。
- `/codex skills` 列出 Codex app-server 技能。

`/codex resume` 寫入與 harness 用於正常輪次相同的 sidecar 綁定檔案。在下一則訊息中，OpenClaw 會恢復該 Codex 執行緒，將目前選取的 OpenClaw `codex/*` 模型傳遞給 app-server，並保持啟用延伸歷史記錄。

指令表面需要 Codex app-server `0.118.0` 或更新版本。如果未來或自訂的 app-server 未公開該 JSON-RPC 方法，則個別控制方法會被回報為 `unsupported by this Codex app-server`。

## 工具、媒體和壓縮

Codex harness 僅變更低層級的嵌入式代理程式執行器。

OpenClaw 仍然會建置工具清單並從 harness 接收動態工具結果。文字、圖像、影片、音樂、TTS、審核和訊息工具輸出會繼續透過正常的 OpenClaw 傳遞路徑進行。

當 Codex 將 `_meta.codex_approval_kind` 標記為 `"mcp_tool_call"` 時，Codex MCP 工具審核請求會透過 OpenClaw 的外掛程式審核流程進行路由；其他請求和自由格式輸入請求仍然會以失敗關閉。

當選取的模型使用 Codex harness 時，原生執行緒壓縮會委派給 Codex app-server。OpenClaw 會保留一份文字紀錄鏡像，用於頻道歷程記錄、搜尋、`/new`、`/reset`，以及未來的模型或 harness 切換。當 app-server 發出資料時，該鏡像會包含使用者提示、最終助理文字，以及輕量級的 Codex 推理或計畫記錄。目前，OpenClaw 僅記錄原生壓縮的開始和完成訊號。它尚未公開可閱讀的壓縮摘要或可稽核的清單，以顯示 Codex 在壓縮後保留了哪些項目。

媒體生成不需要 PI。圖像、影片、音樂、PDF、TTS 和媒體理解會繼續使用相符的供應商/模型設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 疑難排解

**Codex 未出現在 `/model` 中：** 啟用 `plugins.entries.codex.enabled`，設定 `codex/*` 模型參考，或檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 如果沒有 Codex harness 宣告承接該執行，
OpenClaw 可能會使用 PI 作為相容性後端。設定
`embeddedHarness.runtime: "codex"` 以在測試時強制選擇 Codex，或
設定 `embeddedHarness.fallback: "none"` 以在沒有插件 harness 匹配時失敗。一旦
選擇了 Codex app-server，其失敗將直接顯示，而不會有額外的
備用配置。

**App-server 被拒絕：** 升級 Codex，使 app-server 握手
回報的版本為 `0.118.0` 或更新。

**模型探索速度緩慢：** 降低 `plugins.entries.codex.config.discovery.timeoutMs`
或停用探索。

**WebSocket 傳輸立即失敗：** 檢查 `appServer.url`、`authToken`，
並確認遠端 app-server 使用相同的 Codex app-server 通訊協定版本。

**非 Codex 模型使用 PI：** 這是預期行為。Codex harness 僅宣告承接
`codex/*` 模型參照。

## 相關

- [Agent Harness Plugins](/zh-Hant/plugins/sdk-agent-harness)
- [Model Providers](/zh-Hant/concepts/model-providers)
- [Configuration Reference](/zh-Hant/gateway/configuration-reference)
- [Testing](/zh-Hant/help/testing#live-codex-app-server-harness-smoke)
