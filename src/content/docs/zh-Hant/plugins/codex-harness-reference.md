---
summary: "Codex harness 的設定、驗證、探索和應用程式伺服器參考"
title: "Codex harness 參考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本參考文件涵蓋了隨附的 `codex`
外掛程式的詳細設定。有關設定和路由決策，請從
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

| 欄位                       | 預設值                    | 含義                                                                                                                                  |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | enabled                   | Codex 應用程式伺服器的模型探索設定 `model/list`。                                                                                     |
| `appServer`                | 託管 stdio 應用程式伺服器 | 傳輸、指令、驗證、審批、沙盒和逾時設定。                                                                                              |
| `codexDynamicToolsLoading` | `"searchable"`            | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具上下文中。                                                                 |
| `codexDynamicToolsExclude` | `[]`                      | 要從 Codex 應用程式伺服器輪次中省略的其他 OpenClaw 動態工具名稱。                                                                     |
| `codexPlugins`             | disabled                  | 針對已遷移的來源安裝策展外掛程式的原生 Codex 外掛程式/應用程式支援。請參閱 [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled                  | Codex Computer Use 設定。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。                                                |

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
| `turnCompletionIdleTimeoutMs` | `60000`                                   | 在回合範圍的應用伺服器請求之後，OpenClaw 等待 `turn/completed` 時的安靜時間視窗。                                                                      |
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

Stdio 應用程式伺服器啟動預設會繼承 OpenClaw 的程序環境，但 OpenClaw 擁有 Codex 應用程式伺服器帳戶橋接器，並將 `CODEX_HOME` 和 `HOME` 都設定為該代理程式 OpenClaw 狀態下的每個代理程式專屬目錄。Codex 自己的技能載入器會讀取 `$CODEX_HOME/skills` 和 `$HOME/.agents/skills`，因此這兩個值對於本機應用程式伺服器啟動是隔離的。這使得 Codex 原生技能、外掛程式、設定、帳戶和執行緒狀態的範圍限定為 OpenClaw 代理程式，而不是從操作員的個人 Codex CLI 家目錄滲漏進來。

OpenClaw 外掛程式和 OpenClaw 技能快照仍然流經 OpenClaw 自己的外掛程式註冊表和技能載入器。個人 Codex CLI 資產則不會。如果您有有用的 Codex CLI 技能或外掛程式應該成為 OpenClaw 代理程式的一部分，請明確地將其列入庫存：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

如果部署需要額外的環境隔離，請將這些變數新增至 `appServer.clearEnv`：

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

`appServer.clearEnv` 僅影響產生的 Codex 應用程式伺服器子程序。`CODEX_HOME` 和 `HOME` 在本機啟動時仍保留給 OpenClaw 的每個代理程式 Codex 隔離使用。

## 動態工具

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區操作的動態工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

其餘的 OpenClaw 整合工具，例如訊息傳遞、會話、媒體、cron、瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`，可透過 Codex 工具搜尋在 `openclaw` 命名空間下取得。這能讓初始的模型語境維持較小。`sessions_yield` 和僅限訊息工具的來源回覆會保持直接，因為這些是輪次控制合約。

僅在連接至無法搜尋延遲動態工具的自訂 Codex 應用程式伺服器，或正在偵錯完整工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

## 逾時

OpenClaw 擁有的動態工具呼叫會獨立於 `appServer.requestTimeoutMs` 進行限制。每個 Codex `item/tool/call` 請求會依以下順序使用第一個可用的逾時設定：

- 正數的單次呼叫 `timeoutMs` 引數。
- 對於 `image_generate`，則是 `agents.defaults.imageGenerationModel.timeoutMs`。
- 對於媒體理解 `image` 工具，則是轉換為毫秒的 `tools.media.image.timeoutSeconds`，或預設的 60 秒媒體逾時。
- 預設的 30 秒動態工具逾時。

動態工具預算上限為 600000 毫秒。發生逾時時，OpenClaw 會在支援的情況下中止工具訊號，並將失敗的動態工具回應傳回給 Codex，以便輪次能夠繼續，而不會讓會話處於 `processing` 狀態。

在 OpenClaw 回應 Codex 輪次範圍的應用程式伺服器請求後，繫線也預期 Codex 能以 `turn/completed` 完成原生輪次。如果應用程式伺服器在該回應後 `appServer.turnCompletionIdleTimeoutMs` 內保持靜默，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以免後續聊天訊息被卡在陳舊的原生輪次後面排隊。

針對同一輪次的任何非終端通知，包括 `rawResponseItem/completed`，都會解除該短期監看程式，因為 Codex 已證明該輪次仍運作中。較長的終端監看程式會繼續保護真正卡住的輪次。逾時診斷包含最後的應用程式伺服器通知方法，以及針對原始助理回應項目，包含項目類型、角色、ID 和有限的助理文字預覽。

## 模型探索

根據預設，Codex 外掛程式會向應用程式伺服器詢問可用的模型。模型的可用性由 Codex 應用程式伺服器管理，因此當 OpenClaw 升級隨附的 `@openai/codex` 版本，或是當部署將 `appServer.command` 指向不同的 Codex 二進位檔時，清單可能會變更。可用性也可能取決於帳戶範圍。在執行中的閘道上使用 `/codex models`，以查看該套件與帳戶的即時目錄。

如果探索失敗或逾時，OpenClaw 會針對以下項目使用隨附的後援目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

目前的隨附套件是 `@openai/codex` `0.130.0`。針對該隨附應用程式伺服器進行的 `model/list` 探測傳回：

| 模型 ID               | 預設 | 隱藏 | 輸入模式   | 推理強度         |
| --------------------- | ---- | ---- | ---------- | ---------------- |
| `gpt-5.5`             | 是   | 否   | 文字、圖片 | 低、中、高、超高 |
| `gpt-5.4`             | 否   | 否   | 文字、圖片 | 低、中、高、超高 |
| `gpt-5.4-mini`        | 否   | 否   | 文字、圖片 | 低、中、高、超高 |
| `gpt-5.3-codex`       | 否   | 否   | 文字、圖片 | 低、中、高、超高 |
| `gpt-5.3-codex-spark` | 否   | 否   | 文字       | 低、中、高、超高 |
| `gpt-5.2`             | 否   | 否   | 文字、圖片 | 低、中、高、超高 |

應用程式伺服器目錄可以為內部或特殊流程傳回隱藏模型，但它們不是一般的模型選擇器選項。

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

當您希望啟動程序避免探測 Codex 且僅使用後援目錄時，請停用探索：

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

## 工作區啟動檔案

Codex 會透過原生專案文件探索自行處理 `AGENTS.md`。OpenClaw 不會撰寫合成的 Codex 專案文件，也不依賴 Codex 後援檔名做為 persona 檔案，因為 Codex 後援僅在缺少 `AGENTS.md` 時適用。

為了與 OpenClaw 工作區保持一致，Codex harness 會解析其他啟動檔案，包括 `SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md`（如果存在的話），並透過 `thread/start` 和 `thread/resume` 上的 Codex 開發者指示將其轉發出去。
這使得工作區角色和設定檔內容在原生 Codex 的行為塑造通道上保持可見，而無需重複 `AGENTS.md`。

## 環境覆寫

環境覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當未設定 `appServer.command` 時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會繞過受管理的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用設定檔，因為它將外掛程式行為與 Codex harness 設定的其餘部分保持在同一個已審查的檔案中。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [OpenAI provider](/zh-Hant/providers/openai)
- [Configuration reference](/zh-Hant/gateway/configuration-reference)
