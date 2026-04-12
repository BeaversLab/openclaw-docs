---
title: "Codex Harness"
summary: "透過內建的 Codex app-server harness 執行 OpenClaw 內嵌 agent 輪次"
read_when:
  - You want to use the bundled Codex app-server harness
  - You need Codex model refs and config examples
  - You want to disable PI fallback for Codex-only deployments
---

# Codex Harness

內建的 `codex` 外掛程式可讓 OpenClaw 透過
Codex app-server 執行內嵌 agent 輪次，而非使用內建的 PI harness。

當您希望 Codex 接管低層級 agent 工作階段時，請使用此選項：模型
探索、原生執行緒恢復、原生壓縮，以及 app-server 執行。
OpenClaw 仍擁有聊天頻道、工作階段檔案、模型選擇、工具、
核准、媒體傳遞以及可見的逐字稿鏡像。

此 harness 預設為關閉。只有在啟用 `codex` 外掛程式
且解析出的模型為 `codex/*` 模型時，或是當您明確
強制 `embeddedHarness.runtime: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex` 時，才會選擇它。
如果您從未設定 `codex/*`，既有的 PI、OpenAI、Anthropic、Gemini、本機
和自訂提供者執行將會維持其目前的行為。

## 選擇正確的模型前綴

OpenClaw 針對 OpenAI 和 Codex 形式的存取有各自的路由：

| Model ref              | Runtime path                          | 使用時機                                                           |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `openai/gpt-5.4`       | 透過 OpenClaw/PI 管道的 OpenAI 提供者 | 您希望使用 `OPENAI_API_KEY` 直接存取 OpenAI Platform API。         |
| `openai-codex/gpt-5.4` | 透過 PI 的 OpenAI Codex OAuth 提供者  | 您希望使用 ChatGPT/Codex OAuth 但不使用 Codex app-server harness。 |
| `codex/gpt-5.4`        | 內建的 Codex 提供者與 Codex harness   | 您希望針對內嵌 agent 輪次使用原生 Codex app-server 執行。          |

Codex harness 僅支援 `codex/*` 模型 ref。既有的 `openai/*`、
`openai-codex/*`、Anthropic、Gemini、xAI、本機和自訂提供者 ref 將
維持其正常路徑。

## 需求

- OpenClaw 已安裝內建的 `codex` 外掛程式。
- Codex app-server 為 `0.118.0` 或更新版本。
- App-server 程序可存取 Codex 驗證。

此外掛程式會封鎖舊版或無版本的 app-server 交握。這可確保
OpenClaw 維持在已測試過的通訊協定層級上。

對於即時和 Docker 煙霧測試，認證通常來自 `OPENAI_API_KEY`，加上可選的 Codex CLI 檔案，例如 `~/.codex/auth.json` 和 `~/.codex/config.toml`。請使用您的本機 Codex app-server 所使用的相同認證資料。

## 最小設定

使用 `codex/gpt-5.4`，啟用捆綁的外掛程式，並強制使用 `codex` harness：

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

如果您的設定使用 `plugins.allow`，也請在那裡包含 `codex`：

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

將 `agents.defaults.model` 或代理程式模型設定為 `codex/<model>` 也會自動啟用捆綁的 `codex` 外掛程式。在共用設定中，明確的外掛程式條目仍然很有用，因為它能讓部署意圖更加清晰。

## 新增 Codex 而不取代其他模型

當您希望 `codex/*` 模型使用 Codex 而其他所有模型使用 PI 時，請保留 `runtime: "auto"`：

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
- 如果選擇了非 Codex 模型，PI 將保持為相容性 harness。

## 僅 Codex 部署

當您需要證明每個嵌入式代理程式回合都使用 Codex harness 時，請停用 PI 備援：

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

在停用備援的情況下，如果停用了 Codex 外掛程式、請求的模型不是 `codex/*` ref、app-server 太舊或 app-server 無法啟動，OpenClaw 會提早失敗。

## 個別代理程式 Codex

您可以讓一個代理程式僅使用 Codex，而預設代理程式保持正常自動選擇：

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

使用正常的會話指令來切換代理程式和模型。`/new` 會建立一個全新的 OpenClaw 會話，而 Codex harness 會視需要建立或恢復其 sidecar app-server 執行緒。`/reset` 會清除該執行緒的 OpenClaw 會話綁定。

## 模型探索

根據預設，Codex 外掛程式會向 app-server 要求可用的模型。如果探索失敗或逾時，它會使用捆綁的備援目錄：

- `codex/gpt-5.4`
- `codex/gpt-5.4-mini`
- `codex/gpt-5.2`

您可以在 `plugins.entries.codex.config.discovery` 下調整探索：

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

當您希望啟動時避免探查 Codex 並堅持使用後備目錄時，請停用探索：

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

根據預設，外掛程式會使用以下設定在本地啟動 Codex：

```bash
codex app-server --listen stdio://
```

您可以保留該預設值，並僅調整 Codex 原生政策：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            approvalPolicy: "on-request",
            sandbox: "workspace-write",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

若要連線至正在執行的 app-server，請使用 WebSocket 傳輸：

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

| 欄位                | 預設值                                   | 含義                                                           |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `transport`         | `"stdio"`                                | `"stdio"` 會衍生 (spawn) Codex；`"websocket"` 會連線至 `url`。 |
| `command`           | `"codex"`                                | 用於 stdio 傳輸的可執行檔。                                    |
| `args`              | `["app-server", "--listen", "stdio://"]` | 用於 stdio 傳輸的引數。                                        |
| `url`               | 未設定                                   | WebSocket app-server URL。                                     |
| `authToken`         | 未設定                                   | 用於 WebSocket 傳輸的 Bearer token。                           |
| `headers`           | `{}`                                     | 額外的 WebSocket 標頭。                                        |
| `requestTimeoutMs`  | `60000`                                  | App-server 控制平面呼叫的逾時時間。                            |
| `approvalPolicy`    | `"never"`                                | 傳送至執行緒啟動/恢復/回合的原生 Codex 審核政策。              |
| `sandbox`           | `"workspace-write"`                      | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。                   |
| `approvalsReviewer` | `"user"`                                 | 使用 `"guardian_subagent"` 讓 Codex guardian 審核原生核准。    |
| `serviceTier`       | 未設定                                   | 選用的 Codex 服務層級，例如 `"priority"`。                     |

當未設定相符的設定欄位時，較舊的環境變數仍可作為本地測試的後備選項：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`
- `OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1`

建議優先使用設定以確保可重複的部署。

## 常用配方

使用預設 stdio 傳輸的本地 Codex：

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

僅限 Codex 的掛載驗證，並停用 PI 備援：

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

具有明確標頭的遠端應用程式伺服器：

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

模型切換保持由 OpenClaw 控制。當 OpenClaw 工作階段附加到現有
Codex 執行緒時，下一輪會將目前選取的 `codex/*` 模型、提供者、核准原則、沙箱
和服務等級再次發送至應用程式伺服器。從 `codex/gpt-5.4` 切換到
`codex/gpt-5.2` 會保持執行緒綁定，但要求 Codex 以新選取的模型繼續執行。

## Codex 指令

隨附的插件將 `/codex` 註冊為經授權的斜線指令。它是通用的，
可在任何支援 OpenClaw 文字指令的頻道上運作。

常見形式：

- `/codex status` 顯示即時應用程式伺服器連線、模型、帳戶、速率限制、MCP 伺服器和技能。
- `/codex models` 列出即時 Codex 應用程式伺服器模型。
- `/codex threads [filter]` 列出最近的 Codex 執行緒。
- `/codex resume <thread-id>` 將目前的 OpenClaw 工作階段附加到現有的 Codex 執行緒。
- `/codex compact` 要求 Codex 應用程式伺服器壓縮附加的執行緒。
- `/codex review` 為附加的執行緒啟動 Codex 原生審查。
- `/codex account` 顯示帳戶和速率限制狀態。
- `/codex mcp` 列出 Codex 應用程式伺服器 MCP 伺服器狀態。
- `/codex skills` 列出 Codex 應用程式伺服器技能。

`/codex resume` 寫入與掛載用於正常輪次相同的附屬綁定檔案。
在下一則訊息中，OpenClaw 會恢復該 Codex 執行緒，將目前選取的 OpenClaw
`codex/*` 模型傳遞至應用程式伺服器，並保持已啟用擴充歷程記錄。

指令介面需要 Codex 應用程式伺服器 `0.118.0` 或更新版本。
如果未來或自訂的應用程式伺服器未公開該 JSON-RPC 方法，則個別控制方法會
回報為 `unsupported by this Codex app-server`。

## 工具、媒體和壓縮

Codex 掛載僅變更低層級的嵌入式代理程式執行器。

OpenClaw 仍然會建構工具清單，並從 harness 接收動態工具結果。文字、圖片、影片、音樂、TTS、核准和訊息工具輸出會繼續透過正常的 OpenClaw 傳遞路徑進行。

當選取的模型使用 Codex harness 時，原生執行緒壓縮會委派給 Codex app-server。OpenClaw 會保留一份對話記錄鏡像以供頻道紀錄、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換使用。當 app-server 發出時，該鏡像會包含使用者提示、最終助理文字，以及輕量級的 Codex 推理或計劃紀錄。

媒體生成不需要 PI。圖片、影片、音樂、PDF、TTS 和媒體理解會繼續使用相符的 provider/model 設定，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

## 疑難排解

**Codex 未出現在 `/model` 中：** 請啟用 `plugins.entries.codex.enabled`、設定 `codex/*` 模型參照，或檢查 `plugins.allow` 是否排除了 `codex`。

**OpenClaw 回退至 PI：** 測試時請設定 `embeddedHarness.fallback: "none"` 或 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`。

**App-server 被拒絕：** 請升級 Codex，讓 app-server 交握回報版本 `0.118.0` 或更新版本。

**模型探索速度緩慢：** 請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`，以及遠端 app-server 是否使用相同的 Codex app-server 通訊協定版本。

**非 Codex 模型使用 PI：** 這是預期行為。Codex harness 僅宣告 `codex/*` 模型參照。

## 相關

- [Agent Harness Plugins](/en/plugins/sdk-agent-harness)
- [Model Providers](/en/concepts/model-providers)
- [Configuration Reference](/en/gateway/configuration-reference)
- [Testing](/en/help/testing#live-codex-app-server-harness-smoke)
