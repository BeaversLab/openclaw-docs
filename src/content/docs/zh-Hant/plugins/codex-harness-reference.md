---
summary: "Codex harness 的設定、驗證、探索與應用伺服器參考"
title: "Codex harness 參考"
read_when:
  - You need every Codex harness config field
  - You are changing app-server transport, auth, discovery, or timeout behavior
  - You are debugging Codex harness startup, model discovery, or environment isolation
---

本參考涵蓋了隨附的 `codex`
外掛程式的詳細設定。如需設定和路由決策，請從
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

| 欄位                       | 預設值                    | 含義                                                                                                                                 |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `discovery`                | enabled                   | Codex 應用伺服器 `model/list` 的模型探索設定。                                                                                       |
| `appServer`                | 託管 stdio 應用程式伺服器 | 傳輸、指令、驗證、審批、沙盒和逾時設定。                                                                                             |
| `codexDynamicToolsLoading` | `"searchable"`            | 使用 `"direct"` 將 OpenClaw 動態工具直接放入初始 Codex 工具環境中。                                                                  |
| `codexDynamicToolsExclude` | `[]`                      | 要從 Codex 應用程式伺服器輪次中省略的其他 OpenClaw 動態工具名稱。                                                                    |
| `codexPlugins`             | disabled                  | 針對已遷移的來源安裝策展外掛程式的原生 Codex 外掛程式/應用程式支援。請參閱 [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins)。 |
| `computerUse`              | disabled                  | Codex Computer Use 設定。請參閱 [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)。                                               |

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

如果 Codex 的本地系統需求檔案不允許隱含的 YOLO 審核、
reviewer 或沙盒值，OpenClaw 會將隱含預設值改為 guardian
並選取允許的 guardian 權限。同一需求檔案中符合主機名稱的
`[[remote_sandbox_config]]` 條目會被納入沙盒預設決策的考量。

設定 `appServer.mode: "guardian"` 以進行 Codex guardian-reviewed 審核：

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

當那些值被允許時，`guardian` 預設組會展開為 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。
個別的 policy 欄位會覆寫 `mode`。較舊的
`guardian_subagent` reviewer 值仍會被接受為相容性別名，
但新設定應使用 `auto_review`。

當 OpenClaw 沙盒啟用時，本地 Codex app-server 程序仍
會在 Gateway 主機上執行。因此，OpenClaw 會在該輪次停用 Codex 原生 Code Mode、
使用者 MCP 伺服器以及 app-backed plugin 執行，而不是
將 Codex 主機端沙盒視為等同於 OpenClaw 沙盒
後端。當一般的 exec/process 工具可用時，Shell 存取權會透過
OpenClaw 沙盒支援的動態工具（例如 `sandbox_exec` 和 `sandbox_process`）公開。

在 Ubuntu/AppArmor 主機上，當您故意在沒有啟用 OpenClaw 沙箱的情況下執行原生 Codex
`workspace-write` 時，Codex bwrap 可能在 shell 指令啟動前的
`workspace-write` 下失敗。如果您看到
`bwrap: setting up uid map: Permission denied` 或
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`，請執行
`openclaw doctor` 並修復 OpenClaw
服務使用者的回報主機命名空間策略，而不是授予更廣泛的 Docker 容器權限。最好為服務程序使用範圍限定的 AppArmor 設定檔；
`kernel.apparmor_restrict_unprivileged_userns=0` 後備選項是主機範圍的，並且
具有安全性取捨。

## 沙箱化原生執行

穩定的預設值是「失敗關閉」(fail-closed)：啟用 OpenClaw 沙箱會停用原生
Codex 執行介面，否則這些介面將會從 Codex app-server
主機執行。僅當您想
嘗試 Codex 的遠端環境支援與 OpenClaw 的沙箱後端時，才使用
`appServer.experimental.sandboxExecServer: true`。此
預覽路徑需要 Codex app-server 0.132.0 或更新版本。

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
3. 僅限本機 stdio app-server 啟動，`CODEX_API_KEY`，接著
   `OPENAI_API_KEY`，當不存在 app-server 帳戶且仍需要
   OpenAI 身分驗證時。

當 OpenClaw 看到 ChatGPT 訂閱風格的 Codex 身分驗證設定檔時，它會從產生的 Codex 子程序中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。這
保留了 Gateway 層級的 API 金鑰供嵌入或直接 OpenAI 模型
使用，而不會讓原生 Codex app-server 回合意外透過 API 計費。

明確的 Codex API 金鑰設定檔和本機 stdio 環境金鑰後援使用應用程式伺服器登入，而非繼承的子程序環境。WebSocket 應用程式伺服器連線不會收到 Gateway 環境 API 金鑰後援；請使用明確的授權設定檔或遠端應用程式伺服器自己的帳戶。

Stdio 應用程式伺服器啟動預設會繼承 OpenClaw 的程序環境。OpenClaw 擁有 Codex 應用程式伺服器帳戶橋接器，並將 `CODEX_HOME` 設定為該代理程式 OpenClaw 狀態下針對每個代理程式的目錄。這使得 Codex 設定、帳戶、外掛程式快取/資料和執行緒狀態的範圍限制在 OpenClaw 代理程式，而不會從操作員個人的 `~/.codex` home 洩漏進來。

OpenClaw 不會針對正常的本機應用程式伺服器啟動重寫 `HOME`。Codex 執行的子程序（例如 `openclaw`、`gh`、`git`、雲端 CLI 和 shell 指令）會看到正常的程序 home 並且可以找到 user-home 設定和權杖。Codex 也可能會探索 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；該 `.agents` 探索是有意與操作員 home 共享的，並且與隔離的 `~/.codex` 狀態分開。

OpenClaw 外掛程式和 OpenClaw 技能快照仍然流經 OpenClaw 自己的外掛程式登錄檔和技能載入器。個人 Codex `~/.codex` 資產則不會。如果您有來自 Codex home 的實用 Codex CLI 技能或外掛程式應該成為 OpenClaw 代理程式的一部分，請明確地將其列入庫存：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

如果部署需要額外的環境隔離，請將這些變數新增到 `appServer.clearEnv`：

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

`appServer.clearEnv` 只會影響產生的 Codex 應用程式伺服器子程序。OpenClaw 會在本機啟動正規化期間從此清單中移除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持針對每個代理程式，而 `HOME` 保持繼承，以便子程序可以使用正常的 user-home 狀態。

## 動態工具

Codex 動態工具預設為 `searchable` 載入。OpenClaw 不會公開重複 Codex 原生工作區作業的動態工具：

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`

其餘大部分 OpenClaw 整合工具，例如訊息、媒體、Cron、瀏覽器、節點、閘道、`heartbeat_respond` 和 `web_search`，皆可透過 `openclaw` 命名空間下的 Codex 工具搜尋取得。這能讓初始模型情境維持較小。`sessions_yield` 和僅使用訊息工具的來源回覆會保持直接，因為這些屬於輪次控制合約。`sessions_spawn` 仍維持可搜尋，因此 Codex 原生的 `spawn_agent` 仍是主要的 Codex 子代理程式介面，而明確的 OpenClaw 或 ACP 委派則仍可透過 `openclaw` 動態工具命名空間使用。

僅在連接至無法搜尋延遲動態工具的自訂 Codex 應用伺服器，或正在對完整工具承載進行除錯時，才設定 `codexDynamicToolsLoading: "direct"`。

## 逾時

OpenClaw 擁有的動態工具呼叫會獨立於 `appServer.requestTimeoutMs` 進行限制。每個 Codex `item/tool/call` 請求會依序使用第一個可用的逾時設定：

- 每次呼叫的正數 `timeoutMs` 引數。
- 針對 `image_generate`，`agents.defaults.imageGenerationModel.timeoutMs`。
- 針對未設定逾時的 `image_generate`，使用 120 秒的影像生成預設值。
- 針對媒體理解 `image` 工具，使用 `tools.media.image.timeoutSeconds` 轉換後的毫秒數，或 60 秒的媒體預設值。
- 30 秒的動態工具預設值。

動態工具預算上限為 600000 毫秒。發生逾時時，OpenClaw 會在支援的情況下中止工具訊號，並向 Codex 傳回失敗的動態工具回應，以便輪次能繼續進行，而不是讓工作階段處於 `processing` 狀態。

在 Codex 接受一輪對話，且 OpenClaw 回應一個範圍限於該輪對話的 app-server 請求後，harness 預期 Codex 會在當前輪次中取得進度，並最終使用 `turn/completed` 完成原生輪次。如果 app-server 安靜 `appServer.turnCompletionIdleTimeoutMs`，OpenClaw 會盡力中斷 Codex 輪次，記錄診斷逾時，並釋放 OpenClaw 會話通道，以免後續的聊天訊息被卡在過時的原生輪次後面排隊。

對於同一輪次的大多數非終端通知都會解除該短監視器的設定，因為 Codex 已證明該輪次仍然活躍。原始 `custom_tool_call_output` 完成會保持短暫的工具後監視器處於啟用狀態，因為它們是該輪次的工具結果交接。已完成的 `agentMessage` 項目和工具前的原始助理 `rawResponseItem/completed` 項目會啟動助理輸出釋放：如果 Codex 隨後在沒有 `turn/completed` 的情況下保持安靜，OpenClaw 會盡力中斷原生輪次並釋放會話通道。工具後的原始助理進度會持續等待 `turn/completed`，同時完成閒置防護保持啟用；該防護在已設定時使用 `appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否則會退回到助理完成閒置逾時。逾時診斷包括最後一個 app-server 通知方法，而對於原始助理回應項目，則包括項目類型、角色、ID 和有限的助理文字預覽。

## 模型探索

根據預設，Codex 外掛程式會向 app-server 要求可用的模型。模型可用性由 Codex app-server 管理，因此當 OpenClaw 升級隨附的 `@openai/codex` 版本，或是當部署將 `appServer.command` 指向不同的 Codex 二進位檔時，清單可能會變更。可用性也可能受限於帳戶範圍。在執行中的閘道上使用 `/codex models`，以查看該 harness 和帳戶的即時目錄。

如果探索失敗或逾時，OpenClaw 會針對以下情況使用隨附的備用目錄：

- GPT-5.5
- GPT-5.4 mini
- GPT-5.2

目前的隨附 harness 是 `@openai/codex` `0.132.0`。對該隨附 app-server 進行的 `model/list` 探測傳回：

| Model id            | 預設 | 隱藏 | 輸入模式    | 推理強度                 |
| ------------------- | ---- | ---- | ----------- | ------------------------ |
| `gpt-5.5`           | 是   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4`           | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.4-mini`      | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.3-codex`     | 否   | 否   | text, image | low, medium, high, xhigh |
| `gpt-5.2`           | 否   | 否   | text, image | low, medium, high, xhigh |
| `codex-auto-review` | 否   | 是   | text, image | low, medium, high, xhigh |

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

Codex 透過原生專案文件探索自行處理 `AGENTS.md`。OpenClaw 不會寫入合成 Codex 專案文件，也不依賴 Codex 後備檔案名稱來處理 persona 檔案，因為 Codex 後備僅在 `AGENTS.md` 缺失時適用。

為了與 OpenClaw 工作區保持一致，Codex harness 會解析其他啟動檔案。`SOUL.md`、`IDENTITY.md`、`TOOLS.md` 和 `USER.md` 會作為 OpenClaw Codex 開發者指令被轉發，因為它們定義了作用中的代理、可用的工作區指引和使用者設定檔。`HEARTBEAT.md` 的內容不會被注入；heartbeat 週期會獲得一個協作模式指標，以便在該檔案存在且非空白時讀取它。當存在時，`BOOTSTRAP.md` 和 `MEMORY.md` 會作為 OpenClaw 週期輸入參考上下文被轉發。

## 環境覆寫

環境覆寫仍可用於本機測試：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

當 `appServer.command` 未設定時，`OPENCLAW_CODEX_APP_SERVER_BIN` 會略過受控的二進位檔案。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已移除。請改用 `plugins.entries.codex.config.appServer.mode: "guardian"`，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 進行一次性本地測試。對於可重複的部署，建議使用設定，因為這能將外掛程式行為與 Codex harness 設定的其餘部分保留在同一個經過審查的檔案中。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Codex harness runtime](/zh-Hant/plugins/codex-harness-runtime)
- [Native Codex plugins](/zh-Hant/plugins/codex-native-plugins)
- [Codex Computer Use](/zh-Hant/plugins/codex-computer-use)
- [OpenAI provider](/zh-Hant/providers/openai)
- [Configuration reference](/zh-Hant/gateway/configuration-reference)
