---
summary: "Codex harness 的設定、驗證、探索與應用伺服器參考"
title: "Codex harness 參考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

此參考文件涵蓋了隨附的 `codex`
外掛程式的詳細組態。若要進行設定和路由決策，請從
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
| `discovery`                | enabled                   | Codex 應用伺服器 `model/list` 的模型探索設定。                                                                                        |
| `appServer`                | 託管 stdio 應用程式伺服器 | 傳輸、指令、驗證、審批、沙盒和逾時設定。                                                                                              |
| `codexDynamicToolsLoading` | `"searchable"`            | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具環境中。                                                                   |
| `codexDynamicToolsExclude` | `[]`                      | 要從 Codex 應用程式伺服器輪次中省略的其他 OpenClaw 動態工具名稱。                                                                     |
| `codexPlugins`             | disabled                  | 對於已遷移的來源安裝精選外掛程式的原生 Codex 外掛程式/應用程式支援。請參閱 [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled                  | Codex Computer Use 設定。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。                                                |

## 應用程式伺服器傳輸

預設情況下，OpenClaw 會啟動隨附外掛程式附帶的受管理 Codex 二進位檔案：

```bash
codex app-server --listen stdio://
```

這會讓應用伺服器版本與隨附的 `codex` 外掛程式綁定，而不是使用本機安裝的任何獨立 Codex CLI。僅在您刻意想要執行不同的可執行檔時，才設定
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

| 欄位                                          | 預設值                                    | 含義                                                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                 | `"stdio"` 會產生 (spawn) Codex；`"websocket"` 會連線至 `url`。                                                                                                                                                                                    |
| `command`                                     | 受管 Codex 二進位檔案                     | 用於 stdio 傳輸的可執行檔。保留未設定以使用受管二進位檔案。                                                                                                                                                                                       |
| `args`                                        | `["app-server", "--listen", "stdio://"]`  | stdio 傳輸的引數。                                                                                                                                                                                                                                |
| `url`                                         | 未設定                                    | WebSocket 應用伺服器 URL。                                                                                                                                                                                                                        |
| `authToken`                                   | 未設定                                    | 用於 WebSocket 傳輸的 Bearer token。                                                                                                                                                                                                              |
| `headers`                                     | `{}`                                      | 額外的 WebSocket 標頭。                                                                                                                                                                                                                           |
| `clearEnv`                                    | `[]`                                      | 在 OpenClaw 建構繼承的環境之後，從產生的 stdio 應用伺服器程序中移除的額外環境變數名稱。                                                                                                                                                           |
| `requestTimeoutMs`                            | `60000`                                   | 應用伺服器控制平面呼叫的逾時時間。                                                                                                                                                                                                                |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                   | Codex 接受一輪對話或特定於輪次的 app-server 要求後，OpenClaw 等待 `turn/completed` 時的安靜視窗。                                                                                                                                                 |
| `postToolRawAssistantCompletionIdleTimeoutMs` | 未設定                                    | 在工具移交後使用的完成空閒防護，當 Codex 發出原始助理完成或進度但未發送 `turn/completed` 時。未設定時，預設為助理完成空閒逾時。對於受信任或繁重的工作負載使用此選項，因為在這些情況下，工具後合成合理地保持安靜的時間可能比最終助理釋放預算更長。 |
| `mode`                                        | `"yolo"`，除非本機 Codex 要求不允許 YOLO  | 用於 YOLO 或守護者審閱執行的預設。                                                                                                                                                                                                                |
| `approvalPolicy`                              | `"never"` 或允許的守護者核准策略          | 發送到執行緒啟動、恢復和輪次的原生 Codex 核准策略。                                                                                                                                                                                               |
| `sandbox`                                     | `"danger-full-access"` 或允許的守護者沙箱 | 發送到執行緒啟動和恢復的原生 Codex 沙箱模式。作用中的 OpenClaw 沙箱會將 `danger-full-access` 輪次限制為 Codex `workspace-write`；輪次網路旗標遵循 OpenClaw 沙箱出口。                                                                             |
| `approvalsReviewer`                           | `"user"` 或允許的守護者審閱者             | 當允許時，使用 `"auto_review"` 讓 Codex 審閱原生核准提示。                                                                                                                                                                                        |
| `defaultWorkspaceDir`                         | 目前行程目錄                              | 當省略 `--cwd` 時，由 `/codex bind` 使用的工作區。                                                                                                                                                                                                |
| `serviceTier`                                 | 未設定                                    | 選用的 Codex app-server 服務層級。`"priority"` 啟用快速模式路由，`"flex"` 請求彈性處理，而 `null` 清除覆寫。舊版 `"fast"` 被接受為 `"priority"`。                                                                                                 |
| `experimental.sandboxExecServer`              | `false`                                   | 預覽選用功能，向 Codex app-server 0.132.0 或更新版本註冊由 OpenClaw 沙箱支援的 Codex 環境，以便原生 Codex 執行可以在作用中的 OpenClaw 沙箱內運行。                                                                                                |

此插件會阻擋較舊或無版本控制的 app-server 握手。Codex app-server 必須回報穩定版本 `0.125.0` 或更新版本。

## 審核與沙盒模式

本地 stdio app-server 工作階段預設為 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和
`sandbox: "danger-full-access"`。此受信任的本地操作員姿態允許
無人看管的 OpenClaw 輪次與心跳在沒有原生審核提示的情況下繼續進行，
而無須回答無人能回應的提示。

如果 Codex 的本機系統需求檔案不允許隱含的 YOLO 核准、
審查者或沙箱值，OpenClaw 會將隱含預設值改為 guardian
並選取允許的 guardian 權限。`tools.exec.mode: "auto"`
也會強制執行需經 guardian 審查的 Codex 核准，且不保留不安全的
舊版 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆寫；
請設定 `tools.exec.mode: "full"` 以採用刻意的不需核准姿態。
主機名稱匹配
`[[remote_sandbox_config]]` 項目在相同的需求檔案中會被遵守，
用於沙箱預設決策。

設定 `appServer.mode: "guardian"` 以進行需經 guardian 審查的 Codex 核准：

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

當這些值被允許時，`guardian` 預設值會展開為 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。
個別政策欄位會覆寫 `mode`。較舊的
`guardian_subagent` 審查者值仍作為相容性別名被接受，
但新組態應使用 `auto_review`。

當 OpenClaw 沙箱作用中時，本機 Codex 應用程式伺服器程序仍
會在 Gateway 主機上執行。因此，OpenClaw 會針對該回合停用 Codex 原生 Code Mode、
使用者 MCP 伺服器和應用程式支援的外掛程式執行，而不是將
Codex 主機端沙箱視為等同於 OpenClaw 沙箱後端。
Shell 存取權是透過 OpenClaw 沙箱支援的動態工具（例如
當正常的 exec/process 工具可用時，透過 `sandbox_exec` 和 `sandbox_process`）來公開。

在 Ubuntu/AppArmor 主機上，當您有意在沒有啟用 OpenClaw 沙箱的情況下執行原生 Codex `workspace-write` 時，Codex bwrap 可能會在 shell 指令啟動前的 `workspace-write` 下失敗。如果您看到 `bwrap: setting up uid map: Permission denied` 或 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`，請執行 `openclaw doctor` 並修復針對 OpenClaw 服務使用者回報的主機命名空間策略，而不是授予更廣泛的 Docker 容器權限。建議為服務程序使用範圍化的 AppArmor 設定檔；`kernel.apparmor_restrict_unprivileged_userns=0` 後備方案是主機範圍的，並且具有安全性權衡。

## 沙箱化原生執行

穩定的預設值是 fail-closed：啟用 OpenClaw 沙箱會停用原本會從 Codex app-server 主機執行的原生 Codex 執行介面。僅當您想使用 OpenClaw 的沙箱後端嘗試 Codex 的遠端環境支援時，才使用 `appServer.experimental.sandboxExecServer: true`。此預覽路徑需要 Codex app-server 0.132.0 或更新版本。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

當旗標開啟且目前的 OpenClaw 工作階段處於沙箱中時，OpenClaw
會啟動一個由現有沙箱支援的本機回送 exec-server，將其
向 Codex app-server 註冊，並使用該
OpenClaw 擁有的環境啟動 Codex 執行緒和回合。如果 app-server 無法註冊該環境，
執行將會失敗關閉，而不是無聲地回退到主機執行。

此預覽路徑僅限本機。遠端 WebSocket app-server 無法到達
回送 exec-server，除非它執行於同一主機上，因此 OpenClaw 會拒絕
該組合。

## 身分驗證與環境隔離

身分驗證按以下順序選擇：

1. 代理程式的明確 OpenClaw Codex 身分驗證設定檔。
2. app-server 在該代理程式 Codex 家目錄中的現有帳戶。
3. 僅適用於本機 stdio app-server 啟動，當不存在 app-server 帳戶且仍需要 OpenAI 認證時，先 `CODEX_API_KEY`，然後 `OPENAI_API_KEY`。

當 OpenClaw 看到類似 ChatGPT 訂閱的 Codex 認證設定檔時，它會從產生的 Codex 子程序中移除 `CODEX_API_KEY` 和 `OPENAI_API_KEY`。這使 Gateway 層級的 API 金鑰可用於嵌入或直接 OpenAI 模型，而不會讓原生 Codex app-server 回合意外透過 API 計費。

明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後援使用應用程式伺服器登入，而非繼承的子程序環境。WebSocket 應用程式伺服器連線不會收到 Gateway 環境 API 金鑰後援；請使用明確的授權設定檔或遠端應用程式伺服器自己的帳戶。

Stdio app-server 啟動預設會繼承 OpenClaw 的程序環境。OpenClaw 擁有 Codex app-server 帳戶橋接器，並將 `CODEX_HOME` 設定為該代理程式 OpenClaw 狀態下的每個代理程式目錄。這使 Codex 設定、帳戶、外掛程式快取/資料和執行緒狀態的範圍限制在 OpenClaw 代理程式，而不是從操作員的個人 `~/.codex` home 洩漏進來。

OpenClaw 不會為一般本機 app-server 啟動重寫 `HOME`。Codex-run 子程序，例如 `openclaw`、`gh`、`git`、cloud CLI 和 shell 指令，會看到一般程序的家目錄，並且能找到使用者家目錄設定和權杖。Codex 也可能會探索 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；該 `.agents` 探索是有意與操作員家目錄共享的，並且與隔離的 `~/.codex` 狀態分開。

OpenClaw 外掛程式和 OpenClaw 技能快照仍然流經 OpenClaw 自己的外掛程式註冊表和技能載入器。個人 Codex `~/.codex` 資產則不會。如果您有來自 Codex 家目錄的有用 Codex CLI 技能或外掛程式應該成為 OpenClaw 代理程式的一部分，請明確地將其列入清單：

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

`appServer.clearEnv` 只會影響產生的 Codex app-server 子程序。OpenClaw 會在本機啟動正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持每個代理程式獨立，而 `HOME` 保持繼承，以便子程序可以使用一般的使用者家目錄狀態。

## 動態工具

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開複製 Codex 原生工作區操作的動態工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

大部分剩餘的 OpenClaw 整合工具（例如 messaging、media、cron、browser、nodes、gateway、`heartbeat_respond` 和 `web_search`）都可以透過 Codex 工具搜尋在 `openclaw` 命名空間下取得。這能保持初始的模型語境較小。`sessions_yield` 和僅限訊息工具來源的回覆會保持直接，因為這些是輪詢控制合約。`sessions_spawn` 保持可搜尋狀態，因此 Codex 原生的 `spawn_agent` 仍是主要的 Codex 子代理介面，而明確的 OpenClaw 或 ACP 委派仍可透過 `openclaw` 動態工具命名空間取得。

僅當連接到無法搜尋延遲動態工具的自訂 Codex app-server，或正在偵錯完整的工具承載時，才設定 `codexDynamicToolsLoading: "direct"`。

## 逾時

OpenClaw 擁有的動態工具呼叫是獨立於 `appServer.requestTimeoutMs` 進行限制的。每個 Codex `item/tool/call` 請求會依此順序使用第一個可用的逾時：

- 每次呼叫正向的 `timeoutMs` 引數。
- 對於 `image_generate`，`agents.defaults.imageGenerationModel.timeoutMs`。
- 對於未設定逾時的 `image_generate`，使用 120 秒的圖像生成預設值。
- 對於媒體理解 `image` 工具，使用 `tools.media.image.timeoutSeconds` 轉換為毫秒，或 60 秒的媒體預設值。
- 90 秒的動態工具預設值。

動態工具預算上限為 600000 毫秒。逾時時，OpenClaw 會在支援的情況下中止工具訊號，並傳回失敗的動態工具回應給 Codex，以便對話輪次能繼續進行，而不是將工作階段留在 `processing`。

Codex 接受輪次後，以及 OpenClaw 回應輪次範圍的 app-server 請求後，繫線會預期 Codex 製作當前輪次的進度，並最終以 `turn/completed` 完成原生輪次。如果 app-server 安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 工作階段通道，使後續的聊天訊息不會卡在陳舊的原生輪次後面。

大多數針對同一輪次的非終端通知會解除該短暫監視，因為 Codex 已證明該輪次仍然活躍。原始 `custom_tool_call_output` 完成會保持工具後短暫監視的啟用狀態，因為它們是輪次範圍的工具結果移交。已完成的 `agentMessage` 項目和工具前原始助理 `rawResponseItem/completed` 項目會啟用助理輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下變得安靜，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後原始助理進度會繼續等待 `turn/completed`，同時完成閒置防護保持啟用；如果已配置，該防護會使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否則會回退到助理完成閒置逾時。逾時診斷包括最後一個應用伺服器通知方法，對於原始助理回應項目，則包括項目類型、角色、ID 和有限的助理文字預覽。

## 模型探索

預設情況下，Codex 外掛程式會向應用伺服器請求可用的模型。模型可用性由 Codex 應用伺服器管理，因此當 OpenClaw 升級隨附的 `@openai/codex` 版本或部署將 `appServer.command` 指向不同的 Codex 二進位檔案時，清單可能會變更。可用性也可能受限於帳戶範圍。在正在執行的閘道上使用 `/codex models` 以查看該 harness 和帳戶的即時目錄。

如果探索失敗或逾時，OpenClaw 會針對以下情況使用隨附的備用目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

目前的隨附 harness 是 `@openai/codex` `0.134.0`。針對該隨附應用伺服器的 `model/list` 探測傳回：

| Model id              | 預設 | 隱藏 | 輸入模式    | 推理強度                 |
| --------------------- | ---- | ---- | ----------- | ------------------------ |
| `gpt-5.5`             | 是   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4`             | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4-mini`        | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex`       | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | 否   | 否   | 文字        | low, medium, high, xhigh |
| `gpt-5.2`             | 否   | 否   | text, image | low, medium, high, xhigh |

隱藏模型可以由應用伺服器目錄針對內部或特殊流程返回，但它們不是正常的模型選擇器選項。

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

當您希望啟動時避免探測 Codex 並僅使用後備目錄時，請停用探索：

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

Codex 透過原生專案文件探索自行處理 `AGENTS.md`。OpenClaw 不會撰寫合成 Codex 專案文件，也不依賴 Codex 針對 persona 檔案的後備檔名，因為 Codex 後備機制僅在缺少 `AGENTS.md` 時適用。

為了與 OpenClaw 工作區保持一致，Codex harness 會解析其他啟動檔案。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 會被轉發為 OpenClaw Codex 開發者指令，因為它們定義了啟用代理程式、可用的工作區指引和使用者設定檔。`HEARTBEAT.md` 內容不會被注入；心跳輪次會取得一個協作模式指標，以便在該檔案存在且非空時讀取它。來自已設定代理程式工作區的 `MEMORY.md` 內容，當該工作區有可用的記憶體工具時，不會貼上到原生 Codex 輪次輸入中；當它存在時，harness 會新增一個小型工作區記憶體指標，並且 Codex 在與持久記憶體相關時應使用 `memory_search` 或 `memory_get`。如果工具已停用、記憶體搜尋不可用，或啟用的工作區與代理程式記憶體工作區不同，`MEMORY.md` 會使用正常的有界輪次內容路徑。`BOOTSTRAP.md` 在存在時會被轉發為 OpenClaw 輪次輸入參考內容。

## 環境覆寫

環境覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當 `appServer.command` 未設定時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受管理的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。請改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本機測試。對於可重複的部署，建議使用設定，因為它能將外掛程式行為與 Codex harness 設定的其餘部分保留在同一個受審查的檔案中。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [OpenAI provider](/zh-Hant/providers/openai)
- [Configuration reference](/zh-Hant/gateway/configuration-reference)
