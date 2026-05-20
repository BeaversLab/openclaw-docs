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

關於更廣泛的模型/提供者/運行時分工，請從
[Agent runtimes](/zh-Hant/concepts/agent-runtimes) 開始。簡而言之：
`openai/gpt-5.5` 是模型引用，`codex` 是運行時，而 Telegram、
Discord、 Slack 或其他通道則仍是通訊介面。

## 需求

- OpenClaw 並已提供內建的 `codex` 外掛程式。
- 如果您的設定使用 `plugins.allow`，請加入 `codex`。
- Codex 應用伺服器 `0.125.0` 或更新版本。內建外掛程式預設會管理相容的
  Codex 應用伺服器二進位檔案，因此在 `PATH` 上執行的本機 `codex` 指令不會
  影響正常的 harness 啟動。
- 可透過 `openclaw models auth login --provider openai-codex` 取得 Codex 驗證、
  位於代理程式 Codex 家目錄中的應用伺服器帳戶，或明確的 Codex API 金鑰
  驗證設定檔。

關於驗證優先順序、環境隔離、自訂應用伺服器指令、模型
探索以及所有設定欄位，請參閱
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

本頁其餘部分涵蓋了使用者必須選擇的常見變體：部署形狀、封閉式故障路由、監護人審批策略、原生 Codex 外掛程式以及 Computer Use。如需完整的選項列表、預設值、列舉、發現、環境隔離、逾時和應用程式伺服器傳輸欄位，請參閱 [Codex harness 參考資料](/zh-Hant/plugins/codex-harness-reference)。

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

`/codex status` 回報應用程式伺服器連線、帳戶、速率限制、MCP 伺服器和技能。`/codex models` 列出 harness 和帳戶的即時 Codex 應用程式伺服器目錄。如果 `/status` 顯示的結果出乎意料，請參閱 [疑難排解](#troubleshooting)。

## 路由和模型選擇

請將提供者參照和執行時期策略分開管理：

- 對於透過 Codex 的 OpenAI 代理程式輪次，請使用 `openai/gpt-*`。
- 請勿在設定中使用 `openai-codex/gpt-*`。請執行 `openclaw doctor --fix` 以修復舊版參照和過時的會話路由釘選。
- `agentRuntime.id: "codex"` 對於正常的 OpenAI 自動模式是可選的，但在 Codex 無法使用時部署應失敗封閉的情況下很有用。
- `agentRuntime.id: "pi"` 在出於意圖時，將提供者或模型選擇加入直接的 PI 行為。
- `/codex ...` 從聊天控制原生 Codex 應用程式伺服器對話。
- ACP/acpx 是一個獨立的外部 harness 路徑。僅當使用者要求 ACP/acpx 或外部 harness 配接器時才使用它。

常見的命令路由：

| 使用者意圖                              | 使用                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 附加目前聊天                            | `/codex bind [--cwd <path>]`                                                                          |
| 繼續現有的 Codex 執行緒                 | `/codex resume <thread-id>`                                                                           |
| 列出或篩選 Codex 執行緒                 | `/codex threads [filter]`                                                                             |
| 附加配對節點上的現有 Codex CLI 工作階段 | `/codex sessions --host <node> [filter]`，然後 `/codex resume <session-id> --host <node> --bind here` |
| 僅傳送 Codex 回饋                       | `/codex diagnostics [note]`                                                                           |
| 啟動 ACP/acpx 工作                      | ACP/acpx 會話指令，而非 `/codex`                                                                      |

| 使用案例                                   | 設定                                                        | 驗證                                   | 備註                      |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------- | ------------------------- |
| 使用原生 Codex 執行時的 ChatGPT/Codex 訂閱 | `openai/gpt-*` 加上已啟用的 `codex` 外掛程式                | `/status` 顯示 `Runtime: OpenAI Codex` | 建議路徑                  |
| 如果 Codex 無法使用則失敗關閉              | 提供者或模型 `agentRuntime.id: "codex"`                     | 輪次失敗而非退回到 PI                  | 僅用於 Codex 專屬部署     |
| 透過 PI 直接傳送 OpenAI API 金鑰流量       | 提供者或模型 `agentRuntime.id: "pi"` 以及正常的 OpenAI 驗證 | `/status` 顯示 PI 執行時期             | 僅在有意使用 PI 時使用    |
| 舊版設定                                   | `openai-codex/gpt-*`                                        | `openclaw doctor --fix` 會重寫它       | 請勿以此方式撰寫新設定    |
| ACP/acpx Codex 配接器                      | ACP `sessions_spawn({ runtime: "acp" })`                    | ACP 工作/工作階段狀態                  | 與原生 Codex harness 分離 |

`agents.defaults.imageModel` 遵循相同的前綴拆分。對於正常的 OpenAI 路由使用 `openai/gpt-*`，並且僅當圖像理解應透過有界的 Codex app-server 輪次執行時才使用 `codex/gpt-*`。請勿使用 `openai-codex/gpt-*`；doctor 會將該舊版前綴重寫為 `openai/gpt-*`。

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

使用此配置時，`main` 代理使用其正常的提供者路徑，而 `codex` 代理使用 Codex app-server。

### 失敗關閉的 Codex 部署

對於 OpenAI 代理輪次，當附帶的外掛程式可用時，`openai/gpt-*` 已解析為 Codex。當您需要書面失效關閉規則時，請新增明確的執行時期策略：

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

預設情況下，該外掛程式會在本機使用 stdio 傳輸啟動 OpenClaw 受管理的 Codex 二進位檔。僅當您有意執行不同的可執行檔時，才設定 `appServer.command`。僅當 app-server 已在其他地方執行時，才使用 WebSocket 傳輸：

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

本機 stdio app-server 工作階段預設為受信任的本機操作員姿態：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本機 Codex 需求不允許該隱式 YOLO 姿態，OpenClaw 會改為選擇允許的守護者權限。當為工作階段啟用 OpenClaw 沙箱時，OpenClaw 會將 Codex `danger-full-access` 縮小至 Codex `workspace-write`，以便原生 Codex 程式碼模式輪次保留在沙箱工作區內。Codex 輪次網路旗標遵循 OpenClaw 沙箱出口策略：Docker `network: "none"` 保持離線，而 `network: "bridge"` 或自訂 Docker 網路允許出站存取。明確的 Codex `workspace-write` 輪次使用相同的出口衍生網路旗標。

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

守護者模式會擴展為 Codex app-server 核准，通常當本機需求允許這些值時為 `approvalPolicy: "on-request"`、`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。

有關每個 app-server 欄位、驗證順序、環境隔離、探索和逾時行為，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)。

## 指令與診斷

隨附外掛程式會在任何支援 OpenClaw 文字指令的頻道上，將 `/codex` 註冊為斜線指令。

常見格式：

- `/codex status` 會檢查應用程式伺服器連線、模型、帳戶、速率限制、
  MCP 伺服器以及技能。
- `/codex models` 會列出目前的 Codex 應用程式伺服器模型。
- `/codex threads [filter]` 會列出最近的 Codex 應用程式伺服器執行緒。
- `/codex resume <thread-id>` 會將目前的 OpenClaw 工作階段附加到
  現有的 Codex 執行緒。
- `/codex compact` 會要求 Codex 應用程式伺服器壓縮附加的執行緒。
- `/codex review` 會針對附加的執行緒啟動 Codex 原生審閱。
- `/codex diagnostics [note]` 會在傳送附加執行緒的 Codex 回饋之前
  先進行詢問。
- `/codex account` 會顯示帳戶和速率限制狀態。
- `/codex mcp` 會列出 Codex 應用程式伺服器 MCP 伺服器狀態。
- `/codex skills` 會列出 Codex 應用程式伺服器技能。

對於大多數支援報告，請在發生錯誤的對話中從 `/diagnostics [note]` 開始。
它會建立一份 Gateway 診斷報告，而對於 Codex
harness 工作階段，它會請求核准以傳送相關的 Codex 回饋套件。
請參閱 [Diagnostics export](/zh-Hant/gateway/diagnostics) 以了解隱私模型和群組
聊天行為。

僅當您特別想要上傳目前附加執行緒的 Codex
回饋，而不需要完整的 Gateway
診斷套件時，才使用 `/codex diagnostics [note]`。

### 在本機檢查 Codex 執行緒

檢查不良 Codex 執行最快速的方法通常是直接開啟原生 Codex
執行緒：

```bash
codex resume <thread-id>
```

請從已完成的 `/diagnostics` 回覆、`/codex binding` 或
`/codex threads [filter]` 中取得執行緒 ID。

關於上傳機制和執行時層級的診斷界限，請參閱
[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime#codex-feedback-upload)。

驗證依以下順序選擇：

1. 代理程式的已排序 OpenAI 設定檔，最好位於
   `auth.order.openai` 之下。現有的 `openai-codex:*` 設定檔 ID 仍然有效。
2. 該代理程式 Codex home 中應用程式伺服器的現有帳戶。
3. 僅適用於本機 stdio 應用程式伺服器啟動，當沒有應用程式伺服器帳戶且仍需要
   OpenAI 驗證時，請先 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 發現 ChatGPT 訂閱風格的 Codex 授權設定檔時，它會從產生的 Codex 子程序中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這樣做可讓 Gateway 層級的 API 金鑰保持可用於嵌入或直接 OpenAI 模型，
而不會讓原生 Codex app-server 輪次意外地透過 API 計費。
明確的 Codex API 金鑰設定檔和本地 stdio env-key 後援會使用 app-server
登入，而不是繼承的子程序環境。WebSocket app-server 連線
不會收到 Gateway 環境 API 金鑰後援；請使用明確的授權設定檔或
遠端 app-server 自己的帳戶。

如果訂閱設定檔達到 Codex 使用量限制，OpenClaw 會在 Codex 回報時記錄重置
時間，並對於相同的
Codex 執行嘗試下一個排序的授權設定檔。當重置時間過去後，訂閱設定檔將再次變為可用，
而不會變更已選取的 `openai/gpt-*` 模型或 Codex 執行時期。

對於本地 stdio app-server 啟動，OpenClaw 會將 `CODEX_HOME` 設定為每個 agent
專屬的目錄，以免 Codex 設定、授權/帳戶檔案、外掛程式快取/資料和原生
執行緒狀態預設讀寫操作者的個人 `~/.codex`。
OpenClaw 會保留正常的程序 `HOME`；Codex 執行的子程序
仍然可以找到使用者主目錄設定和 token，而 Codex 可能會發現共享的
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

`appServer.clearEnv` 僅影響產生的 Codex app-server 子程序。
OpenClaw 會在本地啟動
正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每個 agent 專屬，而 `HOME` 保持繼承，以便
子程序可以使用正常的使用者主目錄狀態。

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區操作的動態工具：`read`、`write`、
`edit`、`apply_patch`、`exec`、`process` 和 `update_plan`。大多數剩餘的
OpenClaw 整合工具（例如訊息傳遞、媒體、cron、瀏覽器、節點、
閘道、`heartbeat_respond` 和 `web_search`）可透過 `openclaw` 命名空間下的 Codex 工具
搜尋取得，以保持初始模型內容
較小。
`sessions_yield` 和僅限訊息工具的來源回覆保持直接，因為
這些是輪次控制合約。`sessions_spawn` 保持可搜尋，因此 Codex 的
原生 `spawn_agent` 仍是主要的 Codex 子代理介面，而明確的
OpenClaw 或 ACP 委派仍可透過 `openclaw` 動態
工具命名空間使用。心跳協作指示會指示 Codex 在結束心跳輪次時搜尋
`heartbeat_respond`（如果該工具尚未載入）。

僅在連線至無法搜尋延遲動態工具的自訂 Codex
應用伺服器，或正在對完整工具酬載進行偵錯時，才設定 `codexDynamicToolsLoading: "direct"`。

支援的頂層 Codex 外掛欄位：

| 欄位                       | 預設值         | 含義                                                                |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具內容中。 |
| `codexDynamicToolsExclude` | `[]`           | 要從 Codex 應用程式伺服器回合中省略的其他 OpenClaw 動態工具名稱。   |
| `codexPlugins`             | disabled       | 原生 Codex 外掛程式/應用程式支援，用於遷移的來源安裝精選外掛程式。  |

支援的 `appServer` 欄位：

| 欄位                          | 預設值                                          | 含義                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                       | `"stdio"` 會產生 Codex；`"websocket"` 會連線至 `url`。                                                                                                                                                                                                    |
| `command`                     | 受管理的 Codex 二進位檔                         | stdio 傳輸的可執行檔。保留未設定以使用受管理的二進位檔；僅在需要明確覆寫時才進行設定。                                                                                                                                                                    |
| `args`                        | `["app-server", "--listen", "stdio://"]`        | stdio 傳輸的引數。                                                                                                                                                                                                                                        |
| `url`                         | 取消設定                                        | WebSocket 應用程式伺服器 URL。                                                                                                                                                                                                                            |
| `authToken`                   | unset                                           | WebSocket 傳輸的 Bearer 權杖。                                                                                                                                                                                                                            |
| `headers`                     | `{}`                                            | 額外的 WebSocket 標頭。                                                                                                                                                                                                                                   |
| `clearEnv`                    | `[]`                                            | OpenClaw 建構繼承的環境變數後，從產生的 stdio app-server 程序中移除額外的環境變數名稱。OpenClaw 會為本機啟動保留每個代理程式的 `CODEX_HOME` 和繼承的 `HOME`。                                                                                             |
| `requestTimeoutMs`            | `60000`                                         | 應用程式伺服器控制平面呼叫的逾時時間。                                                                                                                                                                                                                    |
| `turnCompletionIdleTimeoutMs` | `60000`                                         | Codex 接受一輪對話或範圍限定為輪次的 app-server 請求後的安靜窗口，此時 OpenClaw 正在等待 `turn/completed`。針對緩慢的工具後階段或僅狀態合成階段，請調高此值。                                                                                             |
| `mode`                        | 除非本地 Codex 需求不允許 YOLO，否則為 `"yolo"` | 用於 YOLO 或監護人審查執行的預設。省略 `danger-full-access`、`never` 核准或 `user` 審查者的本地 stdio 需求，會將隱含的預設監護人設為預設值。                                                                                                              |
| `approvalPolicy`              | `"never"` 或允許的監護人核准策略                | 傳送至執行緒啟動/恢復/輪次的原生 Codex 核准策略。如果允許，監護人預設值偏好 `"on-request"`。                                                                                                                                                              |
| `sandbox`                     | `"danger-full-access"` 或允許的監護人沙箱       | 傳送至執行緒啟動/恢復的原生 Codex 沙箱模式。如果允許，監護人預設值偏好 `"workspace-write"`，否則為 `"read-only"`。當 OpenClaw 沙箱處於作用中時，`danger-full-access` 輪次會使用衍生自 OpenClaw 沙箱出口設定的網路存取權限來執行 Codex `workspace-write`。 |
| `approvalsReviewer`           | `"user"` 或允許的監護人審查者                   | 如果允許，使用 `"auto_review"` 讓 Codex 審查原生核准提示，否則使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是舊版別名。                                                                                                                      |
| `serviceTier`                 | 未設定                                          | 選用的 Codex 應用程式伺服器服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，`null` 清除覆寫，而傳統的 `"fast"` 則被接受為 `"priority"`。                                                                                                   |

OpenClaw 擁有的動態工具呼叫有獨立的限制，不同於 `appServer.requestTimeoutMs`：Codex `item/tool/call` 請求預設使用 30 秒的 OpenClaw 看門狗計時器。正數的每次呼叫 `timeoutMs` 引數會延長或縮短該特定工具的預算。`image_generate` 工具也會在工具呼叫未提供自己的逾時時使用 `agents.defaults.imageGenerationModel.timeoutMs`，而媒體理解 `image` 工具則使用 `tools.media.image.timeoutSeconds` 或其預設的 60 秒媒體逾時。動態工具預算上限為 600000 毫秒。若發生逾時，OpenClaw 會在支援的情況下中止工具訊號，並向 Codex 傳回失敗的動態工具回應，以便對話能繼續進行，而不是讓會話處於 `processing` 狀態。

在 Codex 接受一個輪次，且 OpenClaw 回應一個輪次範圍的 app-server 請求後，harness 預期 Codex 會在當前輪次取得進度，並最終以 `turn/completed` 完成原生輪次。如果 app-server 靜默 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以便後續聊天訊息不會被排在過時的原生輪次之後。大多數同一輪次的非終止通知會解除該短暫監看程序，因為 Codex 已證明該輪次仍處於活躍狀態；原始 `custom_tool_call_output` 完成會保持工具後的短暫監看程序處於啟用狀態，因為它們是輪次範圍的工具結果交接。全域 app-server 通知（例如速率限制更新）不會重置輪次閒置進度。已完成的 `agentMessage` 項目和工具前原始助理 `rawResponseItem/completed` 項目會啟動助理輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下靜默，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後的原始助理進度會繼續等待 `turn/completed` 或終止監看程序。逾時診斷包含最後一個 app-server 通知方法，以及針對原始助理回應項目的項目類型、角色、ID 和有限的助理文字預覽。

環境覆寫仍可用於本地測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。建議使用組態進行可重複的部署，因為它能將外掛行為與 Codex harness 設定的其餘部分保持在同一個經過審查的檔案中。

## 原生 Codex 外掛

原生 Codex 外掛支援在與 OpenClaw harness 輪次相同的 Codex 執行緒中使用 Codex app-server 自身的應用程式和外掛功能。OpenClaw 不會將 Codex 外掛轉譯為合成的 `codex_plugin_*` OpenClaw 動態工具。

`codexPlugins` 僅影響選擇原生 Codex harness 的階段。它對 PI 運行、一般 OpenAI 提供者運行、ACP 對話綁定或其他 harness 沒有影響。

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

執行緒應用程式設定是在 OpenClaw 建立 Codex harness 階段或替換過時的 Codex 執行緒綁定時計算的。它不會在每次輪詢時重新計算。變更 `codexPlugins` 後，請使用 `/new`、`/reset` 或重新啟動閘道，以便未來的 Codex harness 階段以更新後的應用程式集啟動。

關於遷移資格、應用程式清單、破壞性操作原則、引導提示以及原生外掛程式診斷，請參閱[原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)。

## 電腦使用 (Computer Use)

電腦使用 (Computer Use) 在其獨立的設定指南中有說明：[Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。

簡單來說：OpenClaw 不提供桌面控制應用程式，也不自行執行桌面操作。它會準備 Codex app-server，驗證 `computer-use` MCP 伺服器是否可用，然後讓 Codex 在 Codex 模式輪詢期間擁有原生 MCP 工具呼叫。

## 執行時期邊界

Codex harness 僅變更低層級的嵌入式代理程式執行器。

- 支援 OpenClaw 動態工具。Codex 會要求 OpenClaw 執行這些
  工具，因此 OpenClaw 仍保留在執行路徑中。
- Codex 原生 shell、patch、MCP 和原生應用程式工具由 Codex 擁有。
  OpenClaw 可以透過支援的中繼觀察或封鎖選取的原生事件，但它不會重寫原生工具引數。
- 除非作用的 OpenClaw 內容引擎宣告 `ownsCompaction: true`，否則 Codex 擁有原生壓縮。OpenClaw 會保留文字記錄鏡像用於管道歷史、搜尋、`/new`、`/reset` 以及未來的模型或 harness 切換。
- 媒體生成、媒體理解、TTS、審核和訊息工具
  輸出會繼續透過相符的 OpenClaw 提供者/模型設定進行。
- `tool_result_persist` 適用於 OpenClaw 擁有的文字記錄工具結果，而非 Codex 原生工具結果記錄。

關於 Hook 層、支援的 V1 介面、原生權限處理、佇列引導、Codex 回饋上傳機制以及壓縮詳細資訊，請參閱[Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)。

## 疑難排解

**Codex 不會以一般 `/model` 提供者出現：** 這對於新設定是正常的。選擇 `openai/gpt-*` 模型，啟用 `plugins.entries.codex.enabled`，並檢查 `plugins.allow` 是否排除 `codex`。

**OpenClaw 使用 PI 而非 Codex：** 請確保模型參考為官方 OpenAI 提供者上的 `openai/gpt-*`，並且已安裝並啟用 Codex 外掛。如果您在測試時需要嚴格證明，請設定提供者或模型 `agentRuntime.id: "codex"`。強制的 Codex 執行時期將會失敗，而不是退回至 PI。

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

有用的摘錄通常包含 `openai/gpt-5.5` 或 `openai/gpt-5.4`、`Runtime: OpenAI Codex`、`agentRuntime.id` 或 `harnessRuntime`、`candidateProvider: "openai"`，以及 `401`、`Incorrect API key` 或 `No API key` 結果。修正後的執行應顯示 `openai-codex` OAuth 路徑，而非普通的 OpenAI API 金鑰失敗。

**遺留的 `openai-codex/*` 設定仍然存在：** 請執行 `openclaw doctor --fix`。Doctor 會將遺留的模型參考重寫為 `openai/*`，移除過時的會話和全代理執行時期釘選，並保留現有的身分驗證設定檔覆寫。

**應用伺服器被拒絕：** 請使用 Codex 應用伺服器 `0.125.0` 或更新版本。同版本的預發布版本或建置後綴版本（例如 `0.125.0-alpha.2` 或 `0.125.0+custom`）會被拒絕，因為 OpenClaw 測試穩定的 `0.125.0` 協議底限。

**`/codex status` 無法連線：** 請檢查隨附的 `codex` 外掛是否已啟用、設定允許清單時 `plugins.allow` 是否包含它，以及任何自訂的 `appServer.command`、`url`、`authToken` 或標頭是否有效。

**模型探索速度緩慢：** 請降低 `plugins.entries.codex.config.discovery.timeoutMs` 或停用探索。請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference#model-discovery)。

**WebSocket 傳輸立即失敗：** 請檢查 `appServer.url`、`authToken`、標頭，以及遠端應用伺服器是否使用相同的 Codex 應用伺服器通訊協定版本。

**非 Codex 模型使用 PI：** 除非提供者或模型執行時間策略將其路由到另一個 harness，否則這是預期的行為。純非 OpenAI 提供者參照在 `auto` 模式下會保持在它們正常的提供者路徑上。

**已安裝 Computer Use 但工具未執行：** 從新的會話檢查 `/codex computer-use status`。如果工具回報 `Native hook relay unavailable`，請使用 `/new` 或 `/reset`；如果持續存在，請重新啟動 gateway 以清除過時的原生 hook 註冊。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use#troubleshooting)。

## 相關

- [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)
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
