---
summary: "Codex harness 的設定、驗證、探索和應用程式伺服器參考"
title: "Codex harness 參考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

此參考文件涵蓋隨附 `codex` 外掛程式的詳細設定。如需安裝和路由決策，請從 [Codex harness](/zh-Hant/plugins/codex-harness) 開始。

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

| 欄位                       | 預設值                    | 含義                                                                                                                                          |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                   | Codex 應用程式伺服器的模型探索設定 `model/list`。                                                                                             |
| `appServer`                | 託管 stdio 應用程式伺服器 | 傳輸、指令、驗證、審批、沙盒和逾時設定。                                                                                                      |
| `codexDynamicToolsLoading` | `"searchable"`            | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具上下文中。                                                                         |
| `codexDynamicToolsExclude` | `[]`                      | 要從 Codex 應用程式伺服器輪次中省略的其他 OpenClaw 動態工具名稱。                                                                             |
| `codexPlugins`             | disabled                  | 對於已遷移的原始碼安裝類精選外掛程式，提供原生 Codex 外掛程式/應用程式支援。請參閱 [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled                  | Codex Computer Use 設定。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。                                                        |

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

| 欄位                          | 預設值                                    | 含義                                                                                                                                                   |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transport`                   | `"stdio"`                                 | `"stdio"` 會產生 (spawn) Codex；`"websocket"` 則連線至 `url`。                                                                                         |
| `command`                     | 受管 Codex 二進位檔案                     | 用於 stdio 傳輸的可執行檔。保留未設定以使用受管二進位檔案。                                                                                            |
| `args`                        | `["app-server", "--listen", "stdio://"]`  | stdio 傳輸的引數。                                                                                                                                     |
| `url`                         | 未設定                                    | WebSocket 應用伺服器 URL。                                                                                                                             |
| `authToken`                   | 未設定                                    | 用於 WebSocket 傳輸的 Bearer token。                                                                                                                   |
| `headers`                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                |
| `clearEnv`                    | `[]`                                      | 在 OpenClaw 建構繼承的環境之後，從產生的 stdio 應用伺服器程序中移除的額外環境變數名稱。                                                                |
| `requestTimeoutMs`            | `60000`                                   | 應用伺服器控制平面呼叫的逾時時間。                                                                                                                     |
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在 Codex 接受一次輪次或在一次輪次範圍的應用程式伺服器請求之後，當 OpenClaw 等待 `turn/completed` 時的安靜視窗。                                        |
| `mode`                        | `"yolo"`，除非本地 Codex 需求不允許 YOLO  | 用於 YOLO 或監護人審查執行的預設值。                                                                                                                   |
| `approvalPolicy`              | `"never"` 或允許的監護人核准策略          | 傳送至執行緒啟動、恢復和回合的原生 Codex 核准策略。                                                                                                    |
| `sandbox`                     | `"danger-full-access"` 或允許的監護人沙箱 | 傳送至執行緒啟動和恢復的原生 Codex 沙箱模式。                                                                                                          |
| `approvalsReviewer`           | `"user"` 或允許的監護人審查者             | 在允許時，使用 `"auto_review"` 讓 Codex 審查原生核准提示。                                                                                             |
| `defaultWorkspaceDir`         | 目前程序目錄                              | 當省略 `--cwd` 時，`/codex bind` 使用的工作區。                                                                                                        |
| `serviceTier`                 | 未設定                                    | 選用的 Codex 應用伺服器服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，而 `null` 會清除覆寫。舊版的 `"fast"` 會被接受為 `"priority"`。 |

此外掛程式會封鎖舊版或無版本的應用程式伺服器交握。Codex 應用程式伺服器必須回報穩定版本 `0.125.0` 或更新版本。

## 審核與沙箱模式

本機 stdio 應用程式伺服器工作階段預設為 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。此受信任的本機操作員姿態允許
無人值守的 OpenClaw 迴圈與心跳在沒有本機審核提示的情況下繼續運作，
因為沒有人能夠回應這些提示。

如果 Codex 的本機系統需求檔案不允許隱含的 YOLO 審核、
審核者或沙箱值，OpenClaw 會將隱含的預設值視為 guardian
並選取允許的 guardian 權限。同一需求檔案中符合主機名的
`[[remote_sandbox_config]]` 項目會在沙箱預設決策中受到尊重。

設定 `appServer.mode: "guardian"` 以進行 Codex guardian 審核的核准：

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

`guardian` 預設值會在允許的情況下展開為 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。個別的
策略欄位會覆寫 `mode`。較舊的
`guardian_subagent` 審核者值仍被接受為相容性別名，
但新設定應使用 `auto_review`。

## 驗證與環境隔離

驗證按此順序選取：

1. 代理程式的明確 OpenClaw Codex 驗證設定檔。
2. 該代理程式 Codex 家目錄中應用程式伺服器的現有帳戶。
3. 僅針對本機 stdio 應用程式伺服器啟動，當沒有應用程式伺服器帳戶且仍需 OpenAI 驗證時，
   先 `CODEX_API_KEY`，然後
   `OPENAI_API_KEY`。

當 OpenClaw 看到 ChatGPT 訂閱風格的 Codex 驗證設定檔時，它會從產生的 Codex 子程序中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這樣可
讓閘道層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，
而避免本機 Codex 應用程式伺服器迴圈意外透過 API 計費。

明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後備會使用應用程式伺服器登入，而不是繼承的子程序環境。WebSocket 應用程式伺服器連線不會收到 Gateway 環境 API 金鑰後備；請使用明確的驗證設定檔或遠端應用程式伺服器自己的帳戶。

Stdio 應用程式伺服器啟動預設會繼承 OpenClaw 的處理程序環境。
OpenClaw 擁有 Codex 應用程式伺服器帳戶橋接器，並將 `CODEX_HOME` 設定為該代理人 OpenClaw 狀態下針對該代理人的目錄。這使 Codex 設定、
帳戶、外掛程式快取/資料和執行緒狀態的範圍限於 OpenClaw 代理人，
而不是從操作員的個人 `~/.codex` home 滲漏進來。

對於一般的本機應用程式伺服器啟動，OpenClaw 不會重寫 `HOME`。Codex 執行的
子處理程序，例如 `openclaw`、`gh`、`git`、雲端 CLI 和 shell 指令，會看到
一般的處理程序 home，並且可以找到使用者 home 的設定和權杖。Codex 也可能
探索 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；
該 `.agents` 探索是有意與操作員 home 共享的，並且與隔離的
`~/.codex` 狀態分開。

OpenClaw 外掛程式和 OpenClaw 技能快照仍然流經 OpenClaw 自己的
外掛程式註冊表和技能載入器。個人 Codex `~/.codex` 資產則不會。如果
您有來自 Codex home 的實用 Codex CLI 技能或外掛程式應該成為
OpenClaw 代理人的一部分，請明確地將其列為清單：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

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

`appServer.clearEnv` 僅影響產生的 Codex app-server 子行程。
OpenClaw 會在本機啟動標準化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：
`CODEX_HOME` 保持每個代理獨立，而 `HOME` 保持繼承，以便子行程可以使用
標準的使用者主目錄狀態。

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

剩餘的 OpenClaw 整合工具，例如訊息傳遞、會話、媒體、cron、
瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`，可在 `openclaw` 命名空間下透過 Codex 工具搜尋取得。這能讓初始
模型語境保持較小。`sessions_yield` 和僅限訊息工具的來源回覆
保持直接，因為這些是輪次控制合約。

僅當連接到無法搜尋延遲動態工具的自訂 Codex
app-server，或正在偵錯完整工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

## 逾時

OpenClaw 擁有的動態工具呼叫與 `appServer.requestTimeoutMs` 無關，獨立受限。
每個 Codex `item/tool/call` 請求會依此順序使用第一個
可用的逾時設定：

- 正值的每次呼叫 `timeoutMs` 引數。
- 對於 `image_generate`，則為 `agents.defaults.imageGenerationModel.timeoutMs`。
- 對於媒體理解 `image` 工具，則為 `tools.media.image.timeoutSeconds`
  轉換為毫秒，或 60 秒的媒體預設值。
- 30 秒的動態工具預設值。

動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止
工具信號，並將失敗的動態工具回應傳回給 Codex，
以便輪次能繼續進行，而不會讓會話處於 `processing` 狀態。

在 Codex 接受一輪對話之後，且在 OpenClaw 回應一輪範圍的 app-server 請求之後，harness 預期 Codex 能推進當前輪次的進度，並最終以 `turn/completed` 完成本機輪次。如果 app-server 安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄一個診斷逾時，並釋放 OpenClaw 會話通道，以免後續聊天訊息被卡在過期的本機輪次後面。

同一輪對話中的大多數非終結性通知會解除該短監視，因為 Codex 已證明該輪次仍然存活。原始 `custom_tool_call_output` 完成會讓工具後的短監視保持啟用，因為它們是輪次範圍的工具結果移交。已完成的 `agentMessage` 項目和工具前的原始 assistant `rawResponseItem/completed` 項目會啟用 assistant 輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下變得安靜，OpenClaw 會盡力中斷本機輪次並釋放會話通道。工具後的原始 assistant 進度則繼續等待 `turn/completed` 或終結監視。逾時診斷包含最後的 app-server 通知方法，若是原始 assistant 回應項目，則包含項目類型、角色、ID 和有限的 assistant 文字預覽。

## 模型探索

預設情況下，Codex 外掛程式會向 app-server 要求可用的模型。模型可用性是由 Codex app-server 掌控，因此當 OpenClaw 升級內建的 `@openai/codex` 版本，或當部署將 `appServer.command` 指向不同的 Codex 二進位檔時，清單可能會變更。可用性也可能受限於帳戶範圍。在執行中的閘道上使用 `/codex models`，以查看該 harness 和帳戶的即時目錄。

如果探索失敗或逾時，OpenClaw 會針對以下項目使用內建的後援目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

目前的內建 harness 是 `@openai/codex` `0.130.0`。針對該內建 app-server 的 `model/list` 探測傳回了：

| Model id              | 預設 | 隱藏 | 輸入模態    | 推理投入                 |
| --------------------- | ---- | ---- | ----------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | 文字、圖片  | low、medium、high、xhigh |
| `gpt-5.4`             | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4-mini`        | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex`       | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | 否   | 否   | text        | low, medium, high, xhigh |
| `gpt-5.2`             | 否   | 否   | text, image | low, medium, high, xhigh |

隱藏的模型可以由應用伺服器目錄返回，用於內部或專用流程，但它們不是正常的模型選擇器選項。

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

當您希望啟動時避免探查 Codex 並僅使用後備目錄時，請停用探索：

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

Codex 通過原生專案文件探索自行處理 `AGENTS.md`。OpenClaw
不會撰寫合成的 Codex 專案文件檔案或依賴 Codex 後備
檔案名稱來尋找 persona 檔案，因為 Codex 後備僅在
`AGENTS.md` 缺失時適用。

為了與 OpenClaw 工作區保持一致，Codex harness 會解析其他引導
檔案，包括 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、
`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`（如果存在），並透過 `thread/start` 和 `thread/resume` 上的 Codex 開發者指令將它們轉發。
這可以在不重複 `AGENTS.md` 的情況下，讓工作區 persona 和 profile 語境在原生 Codex
行為塑造通道上保持可見。

## 環境覆寫

環境覆寫仍可用於本地測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當
`appServer.command` 未設定時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。組態
是可重複部署的首選，因為它將插件行為與 Codex harness 設定的其餘部分保持在同一個已審查的檔案中。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [OpenAI provider](/zh-Hant/providers/openai)
- [Configuration reference](/zh-Hant/gateway/configuration-reference)
