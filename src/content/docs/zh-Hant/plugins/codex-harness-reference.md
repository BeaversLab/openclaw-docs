---
summary: "Codex harness 的設定、驗證、探索和應用程式伺服器參考"
title: "Codex harness 參考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本參考資料涵蓋了隨附 `codex`
外掛程式的詳細組態設定。若要進行設定和路由決策，請從
[Codex harness](/zh-Hant/plugins/codex-harness) 開始。

## 外掛程式設定介面

所有 Codex harness 設定都位於 `plugins.entries.codex.config` 之下。

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
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

支援的頂層欄位：

| 欄位                       | 預設值                    | 含義                                                                                                                                      |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                   | Codex 應用程式伺服器的模型探索設定 `model/list`。                                                                                         |
| `appServer`                | 託管 stdio 應用程式伺服器 | 傳輸、指令、驗證、審批、沙盒和逾時設定。                                                                                                  |
| `codexDynamicToolsLoading` | `"searchable"`            | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具上下文中。                                                                     |
| `codexDynamicToolsExclude` | `[]`                      | 要從 Codex 應用程式伺服器輪次中省略的其他 OpenClaw 動態工具名稱。                                                                         |
| `codexPlugins`             | disabled                  | 對於已遷移的來源安裝策展外掛程式，提供原生 Codex 外掛程式/應用程式支援。請參閱 [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled                  | Codex Computer Use 設定。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。                                                    |

## 應用程式伺服器傳輸

預設情況下，OpenClaw 會啟動隨附外掛程式附帶的受管理 Codex 二進位檔案：

```bash
codex app-server --listen stdio://
```

這確保應用程式伺服器版本與隨附的 `codex` 外掛程式保持一致，而不是依賴本機安裝的任何獨立 Codex CLI。僅當您有意執行不同的
可執行檔時，才設定
`appServer.command`。

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
            url: "ws://gateway-host:39175",
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

| 欄位                          | 預設值                                    | 含義                                                                                                                                                                  |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                   | `"stdio"`                                 | `"stdio"` 會產生 (spawn) Codex；`"websocket"` 則連線至 `url`。                                                                                                        |
| `command`                     | 受管 Codex 二進位檔案                     | 用於 stdio 傳輸的可執行檔。保留未設定以使用受管二進位檔案。                                                                                                           |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | stdio 傳輸的引數。                                                                                                                                                    |
| `url`                         | 未設定                                    | WebSocket 應用伺服器 URL。                                                                                                                                            |
| `authToken`                   | 未設定                                    | 用於 WebSocket 傳輸的 Bearer token。                                                                                                                                  |
| `headers`                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                               |
| `clearEnv`                    | `[]`                                      | 在 OpenClaw 建構繼承的環境之後，從產生的 stdio 應用伺服器程序中移除的額外環境變數名稱。                                                                               |
| `requestTimeoutMs`            | `60000`                                   | 應用伺服器控制平面呼叫的逾時時間。                                                                                                                                    |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在 Codex 接受一次輪次或在一次輪次範圍的應用程式伺服器請求之後，當 OpenClaw 等待 `turn/completed` 時的安靜視窗。                                                       |
| `mode`                        | `"yolo"`，除非本地 Codex 需求不允許 YOLO  | 用於 YOLO 或監護人審查執行的預設值。                                                                                                                                  |
| `approvalPolicy`              | `"never"` 或允許的監護人核准策略          | 傳送至執行緒啟動、恢復和回合的原生 Codex 核准策略。                                                                                                                   |
| `sandbox`                     | `"danger-full-access"` 或允許的監護人沙箱 | 傳送至執行緒啟動和恢復的原生 Codex 沙箱模式。作用中的 OpenClaw 沙箱會將 `danger-full-access` 回合限制為 Codex `workspace-write`；回合網路標誌遵循 OpenClaw 沙箱出口。 |
| `approvalsReviewer`           | `"user"` 或允許的守護者審查者             | 當允許時，使用 `"auto_review"` 讓 Codex 審查原生核准提示。                                                                                                            |
| `defaultWorkspaceDir`         | 目前程序目錄                              | 當省略 `--cwd` 時，`/codex bind` 所使用的工作區。                                                                                                                     |
| `serviceTier`                 | 未設定                                    | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，而 `null` 則清除覆寫。舊版的 `"fast"` 會被接受為 `"priority"`。               |

此外掛程式會封鎖較舊或無版本的 app-server 交握。Codex app-server
必須回報穩定版本 `0.125.0` 或更新版本。

## 審核與沙箱模式

本機 stdio app-server 工作階段預設為 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。這種受信任的本機操作員姿態可讓
無人看管的 OpenClaw 回合和心跳持續進行，而不需要無人回應的
原生核准提示。

如果 Codex 的本機系統需求檔案不允許隱含的 YOLO 核准、
審查者或沙箱值，OpenClaw 會將隱含預設值視為守護者
並改為選擇允許的守護者權限。同一需求檔案中符合主機名稱的
`[[remote_sandbox_config]]` 項目會受尊重以用於
沙箱預設決策。

針對 Codex 守護者審查的核准，請設定 `appServer.mode: "guardian"`：

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

當允許這些值時，`guardian` 預設會展開為 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。
個別策略欄位會覆寫 `mode`。舊的
`guardian_subagent` reviewer 值為了相容性仍被接受，
但新組態應使用 `auto_review`。

當 OpenClaw 沙箱啟用時，本機 Codex app-server 程序仍然
在 Gateway 主機上執行。因此 OpenClaw 會為原生程式碼模式回合保留 Codex 自己的檔案系統
沙箱。`danger-full-access` 回合會縮減為
Codex `workspace-write`，而 `workspace-write` 回合的 `networkAccess` 則衍生
自 OpenClaw 沙箱出口設定：Docker `network: "none"` 保持
離線，而 `network: "bridge"` 或自訂 Docker 網路則允許
對外連線。

## Auth 與環境隔離

Auth 依以下順序選擇：

1. 針對代理程式的明確 OpenClaw Codex auth 設定檔。
2. app-server 在該代理程式 Codex 家目錄中的既有帳戶。
3. 僅限本機 stdio app-server 啟動，當沒有 app-server 帳戶且仍需要 OpenAI auth 時，
   依序為 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 偵測到 ChatGPT 訂閱式的 Codex auth 設定檔時，它會從產生的
Codex 子程序中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。這能
讓 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，
而不會讓原生 Codex app-server 回合意外透過 API 計費。

明確的 Codex API 金鑰設定檔和本機 stdio env-key 後援會使用 app-server
登入，而非繼承的子程序環境。WebSocket app-server 連線
不會收到 Gateway 環境 API 金鑰後援；請使用明確的 auth 設定檔或
遠端 app-server 自己的帳戶。

Stdio app-server 啟動預設會繼承 OpenClaw 的程序環境。
OpenClaw 擁有 Codex app-server 帳號橋接器，並將 `CODEX_HOME` 設定為該
agent OpenClaw 狀態下的個別 agent 目錄。這使得 Codex 設定、
帳號、外掛快取/資料和執行緒狀態的範圍限制在 OpenClaw agent 內，
而不是從操作員的個人 `~/.codex` home 洩漏進來。

OpenClaw 不會針對一般的本機 app-server 啟動重寫 `HOME`。Codex 執行的
子程序，例如 `openclaw`、`gh`、`git`、cloud CLI 和 shell 指令，會看見
正常的程序 home，並且可以找到使用者 home 的設定和權杖。Codex 也可能
探索 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；
該 `.agents` 探索是有意與操作員 home 共享，並且是
與隔離的 `~/.codex` 狀態分開的。

OpenClaw 外掛和 OpenClaw 技能快照仍然流經 OpenClaw 自己的
外掛註冊表和技能載入器。個人的 Codex `~/.codex` 資產則不會。如果您
有來自 Codex home 的實用 Codex CLI 技能或外掛，應該成為
OpenClaw agent 的一部分，請明確將其列入庫存：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

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

`appServer.clearEnv` 僅影響產生的 Codex app-server 子程序。
OpenClaw 會在本地啟動
正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持為個別 agent，而 `HOME` 保持繼承，因此
子程序可以使用一般的使用者 home 狀態。

## 動態工具

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開
複製 Codex 原生工作區操作的動態工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

大多數其餘的 OpenClaw 整合工具，例如訊息傳遞、媒體、cron、瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`，均可透過 `openclaw` 命名空間下的 Codex 工具搜尋取得。這能保持初始模型語境較小。`sessions_yield` 和僅限訊息工具的來源回覆會保持直接，因為這些是輪次控制合約。`sessions_spawn` 保持可搜尋，因此 Codex 原生的 `spawn_agent` 仍是主要的 Codex 子代理介面，而明確的 OpenClaw 或 ACP 委派仍可透過 `openclaw` 動態工具命名空間使用。

僅在連線至無法搜尋延遲動態工具的自訂 Codex 應用程式伺服器，或正在偵錯完整工具負載時，才設定 `codexDynamicToolsLoading: "direct"`。

## 逾時

OpenClaw 擁有的動態工具呼叫與 `appServer.requestTimeoutMs` 分別受限。每個 Codex `item/tool/call` 請求會依此順序使用第一個可用的逾時設定：

- 正數的單次呼叫 `timeoutMs` 引數。
- 針對 `image_generate`，為 `agents.defaults.imageGenerationModel.timeoutMs`。
- 對於未設定逾時的 `image_generate`，使用 120 秒的
  影像生成預設值。
- 對於媒體理解 `image` 工具，使用 `tools.media.image.timeoutSeconds`
  轉換為毫秒的值，或是 60 秒的媒體預設值。
- 30 秒的動態工具預設值。

動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止
工具訊號，並將失敗的動態工具回應傳回給 Codex，
以便對話輪次能繼續進行，而不會將工作階段留在 `processing`。

在 Codex 接受輪次之後，且在 OpenClaw 回應輪次範圍的
應用程式伺服器要求之後，harness 預期 Codex 會在當前輪次中繼續推進
並最終以 `turn/completed` 完成原生輪次。如果應用程式伺服器
安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力
中斷 Codex 輪次，記錄診斷逾時，並釋放
OpenClaw 工作階段通道，讓後續的聊天訊息不會被排在陳舊的
原生輪次之後。

對於同一輪次，大多數非終止通知都會解除該短暫的看門狗設定，因為 Codex 已證明該輪次仍然運作中。原始 `custom_tool_call_output` 完成會讓短暫的後續工具看門狗保持啟用，因為它們是輪次範圍內的工具結果傳遞。已完成的 `agentMessage` 項目和工具前的原始助手 `rawResponseItem/completed` 項目會啟用助手輸出釋放：如果 Codex 之後在沒有 `turn/completed` 的情況下變得靜默，OpenClaw 會盡力中斷原生輪次並釋放工作階段通道。工具後的原始助手進度會繼續等待 `turn/completed` 或終止看門狗。超時診斷包含最後一個應用程式伺服器通知方法，而對於原始助手回應項目，則包含項目類型、角色、ID 和有限的助手文字預覽。

## 模型探索

預設情況下，Codex 外掛程式會向應用程式伺服器請求可用模型。模型的可用性由 Codex 應用程式伺服器決定，因此當 OpenClaw 升級隨附的 `@openai/codex` 版本，或是當部署將 `appServer.command` 指向不同的 Codex 二進位檔時，清單可能會變更。可用性也可能受限於帳戶範圍。在執行中的閘道上使用 `/codex models`，以查看該駝具和帳戶的即時目錄。

如果探索失敗或逾時，OpenClaw 會針對以下項目使用隨附的後援目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

目前的隨附駝具為 `@openai/codex` `0.130.0`。針對該隨附應用程式伺服器的 `model/list` 探測傳回：

| 模型 ID               | 預設 | 隱藏 | 輸入模式   | 推理強度         |
| --------------------- | ---- | ---- | ---------- | ---------------- |
| `gpt-5.5`             | 是   | 否   | 文字、影像 | 低、中、高、超高 |
| `gpt-5.4`             | 否   | 否   | 文字、影像 | 低、中、高、超高 |
| `gpt-5.4-mini`        | 否   | 否   | 文字、影像 | 低、中、高、超高 |
| `gpt-5.3-codex`       | 否   | 否   | 文字、影像 | 低、中、高、超高 |
| `gpt-5.3-codex-spark` | 否   | 否   | 文字       | 低、中、高、超高 |
| `gpt-5.2`             | 否   | 否   | 文字、影像 | 低、中、高、超高 |

隱藏模型可以由應用程式伺服器目錄返回，用於內部或特定流程，但它們不是正常的模型選擇器選項。

在 `plugins.entries.codex.config.discovery` 下調整探索：

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

當您希望啟動程序避免探測 Codex 且僅使用後備目錄時，請停用探索：

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

## 工作區引導檔案

Codex 透過原生專案文件探索自行處理 `AGENTS.md`。OpenClaw 不會寫入合成的 Codex 專案文件，也不依賴 Codex 後備檔案名稱來尋找 persona 檔案，因為 Codex 後備機制僅在 `AGENTS.md` 缺失時適用。

為了與 OpenClaw 工作區保持一致，Codex harness 會解析其他引導檔案。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 會作為 OpenClaw Codex 開發者指令轉發，因為它們定義了啟動中的代理程式、可用的工作區指引和使用者設定檔。`HEARTBEAT.md` 內容不會被注入；心跳輪次會獲得一個協作模式指標，以在該檔案存在且非空時讀取它。`BOOTSTRAP.md` 和 `MEMORY.md` 在存在時會作為 OpenClaw 輸入參考上下文轉發。

## 環境覆寫

環境覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用配置，因為它能將外掛程式行為與 Codex harness 設定的其餘部分保持在同一個受審查的檔案中。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [OpenAI provider](/zh-Hant/providers/openai)
- [設定參考](/zh-Hant/gateway/configuration-reference)
