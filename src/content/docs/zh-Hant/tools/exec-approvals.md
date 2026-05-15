---
summary: "主機執行審核：原則控制參數、允許清單及 YOLO/嚴格工作流程"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "執行審核"
sidebarTitle: "執行審核"
---

執行審核是允許沙盒化代理程式在真實主機（`gateway` 或 `node`）上執行命令的**伴隨應用程式 / 節點主機防護機制**。這是一項安全互鎖裝置：僅當原則 + 允許清單 +（可選的）使用者審核全部一致時，才允許執行命令。執行審核會**疊加在**工具原則與提昇權限閘門之上（除非提昇權限設定為 `full`，這會跳過審核）。

<Note>有效原則是 `tools.exec.*` 與審核預設值中**較嚴格**者；如果省略了審核欄位，則會使用 `tools.exec` 值。主機執行也會使用該機器上的本機審核狀態 - 即使會話或設定預設值要求 `ask: "on-miss"`，`~/.openclaw/exec-approvals.json` 中的主機本機 `ask: "always"` 仍會持續提示。</Note>

## 檢查有效政策

| 指令                                                             | 顯示內容                                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 請求的政策、主機政策來源以及有效結果。             |
| `openclaw exec-policy show`                                      | 本機機器的合併檢視。                               |
| `openclaw exec-policy set` / `preset`                            | 將本機請求的政策與本機主機核准檔案同步，一步完成。 |

當本機範圍請求 `host=node` 時，`exec-policy show` 會在執行時將該範圍回報為節點管理的，而不是假裝本機審核檔案是事實來源。

如果伴隨應用程式 UI **無法使用**，任何通常會提示的請求都會由 **詢問後援**（預設值：`deny`）來解決。

<Tip>原生聊天審核客戶端可以在待審核訊息上植入特定通道的輔助功能。例如，Matrix 會植入反應捷徑（`✅` 允許一次，`❌` 拒絕，`♾️` 總是允許），同時仍將訊息中的 `/approve ...` 指令作為後援。</Tip>

## 適用範圍

Exec approvals（執行審批）是在執行主機上本地強制執行的：

- **閘道主機** → 閘道機器上的 `openclaw` 程序。
- **Node host（節點主機）** → node runner（macOS 伴隨應用程式或無頭節點主機）。

### 信任模型

- 經過 Gateway 驗證的呼叫者是該 Gateway 的受信任操作員。
- 配對的節點將該受信任操作員能力擴展到節點主機上。
- 執行核准可降低意外執行的風險，但**並非**使用者層級的驗證邊界或檔案系統唯讀原則。
- 一旦獲得核准，指令即可根據所選的主機或沙箱檔案系統權限來修改檔案。
- 獲得核准的 node-host 執行作業會綁定標準執行環境：標準 cwd、精確 argv、存在時的 env 綁定，以及適用時的固定可執行檔路徑。
- 對於 Shell 腳本和直譯器/執行時期檔案的直接調用，OpenClaw 也會嘗試綁定一個具體的本機檔案運算元。如果綁定的檔案在核准後、執行前發生變更，該執行作業將會被拒絕，而不會執行已變動的內容。
- 檔案綁定是刻意採取「盡力而為」的策略，**並非**針對每個直譯器/執行時期載入器路徑的完整語意模型。如果核准模式無法識別要綁定的確切一個具體本機檔案，它會拒絕建立支援核准的執行作業，而不會假裝擁有完整覆蓋。

### macOS 分離

- **node host service** 會透過本機 IPC 將 `system.run` 轉發至 **macOS app**。
- **macOS app** 會執行核准並在 UI 語境中執行指令。

## 設定與儲存

核准項目儲存在執行主機上的一個本機 JSON 檔案中：

```text
~/.openclaw/exec-approvals.json
```

範例架構：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 原則控制

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 封鎖所有主機執行請求。
  - `allowlist` - 僅允許已列入允許清單的指令。
  - `full` - 允許所有內容（等同於已提升權限）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 永不提示。
  - `on-miss` - 僅在允許清單不符時提示。
  - `always` - 對每個指令都進行提示。當有效的詢問模式為 `always` 時，`allow-always` 持久性信任**並不會**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  當需要提示但無法存取 UI 時的處理方式。

- `deny` - 封鎖。
- `allowlist` - 僅在允許清單相符時允許。
- `full` - 允許。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  當 `true` 時，OpenClaw 會將內嵌程式碼評估表單視為僅需批准， 即使直譯器二進位檔案本身已列在允許清單中。這是針對 無法整潔對應至單一穩定檔案運算元的直譯器載入器的縱深防禦。
</ParamField>

嚴格模式可攔截的範例：

- `python -c`
- `node -e`、`node --eval`、`node -p`
- `ruby -e`
- `perl -e`、`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在嚴格模式下，這些指令仍需明確批准，且
`allow-always` 不會自動為它們保存新的允許清單項目。

## YOLO 模式 (無須批准)

如果您希望主機執行在無需批准提示的情況下執行，您必須開啟
**這兩層** 策略 - OpenClaw 設定中的請求執行策略
(`tools.exec.*`) **以及**
`~/.openclaw/exec-approvals.json` 中的主機本機批准策略。

除非您明確收緊設定，否則 YOLO 是預設的主機行為：

| 層級                  | YOLO 設定                  |
| --------------------- | -------------------------- |
| `tools.exec.security` | `full` 於 `gateway`/`node` |
| `tools.exec.ask`      | `off`                      |
| 主機 `askFallback`    | `full`                     |

<Warning>
**重要區別：**

- `tools.exec.host=auto` 選擇 exec 在**何處**執行：有沙盒時使用沙盒，否則使用 gateway。
- YOLO 選擇主機 exec 獲得批准的**方式**：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不會**在配置的主機 exec 策略之上添加單獨的啟發式命令混淆批准閘門或腳本預檢拒絕層。
- `auto` 並不會使從沙盒會話進行的 gateway 路由成為免費的覆蓋。來自 `auto` 的每次調用 `host=node` 請求是被允許的；僅當沒有沙盒運行時處於活動狀態時，才允許從 `auto` 發出 `host=gateway`。對於穩定的非自動默認值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

</Warning>

暴露自身非互動式權限模式的 CLI 支援提供者可以遵循此策略。當 OpenClaw 請求的 exec 策略為 YOLO 時，Claude CLI 會新增 `--permission-mode bypassPermissions`。請使用 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下的明確 Claude 引數來覆蓋該後端行為 —— 例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果您想要更保守的設定，請將任一層調回 `allowlist` / `on-miss` 或 `deny`。

### 持續性 gateway 主機「永不提示」設定

<Steps>
  <Step title="設定請求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="符合主機批准檔案">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### 本機捷徑

```bash
openclaw exec-policy preset yolo
```

該本機捷徑會同時更新兩者：

- 本機 `tools.exec.host/security/ask`。
- 本機 `~/.openclaw/exec-approvals.json` 預設值。

它被刻意設計為僅限本機。若要遠端變更 gateway 主機或節點主機的批准，請使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### 節點主機

對於節點主機，請改為在該節點上套用相同的批准檔案：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**僅限本機的限制：**

- `openclaw exec-policy` 不會同步節點核准。
- `openclaw exec-policy set --host node` 會被拒絕。
- 節點執行核准會在執行時從節點取得，因此針對節點的更新必須使用 `openclaw approvals --node ...`。

</Note>

### 僅限工作階段的捷徑

- `/exec security=full ask=off` 僅變更目前的工作階段。
- `/elevated full` 是一個緊急捷徑，也會略過該工作階段的執行核准。

如果主機核准檔案保持比設定更嚴格，較嚴格的主機原則仍然會勝出。

## 允許清單（每個代理程式）

允許清單是**每個代理程式**各自的。如果有多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式是 glob 比對。

模式可以是解析後的二進位路徑 glob 或純指令名稱 glob。
純名稱僅符合透過 `PATH` 叫用的指令，因此 `rg` 可以在指令是 `rg` 時符合
`/opt/homebrew/bin/rg`，但**不符合** `./rg` 或
`/tmp/rg`。當您想要信任某個特定的二進位位置時，請使用路徑 glob。

舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。
諸如 `echo ok && pwd` 之類的 Shell 鏈仍然需要每個頂層區段
符合允許清單規則。

範例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制引數

當允許清單項目應符合某個二進位檔案和特定引數形狀時，請新增 `argPattern`。OpenClaw 會針對解析後的指令引數評估正規表示式，排除可執行檔權杖
(`argv[0]`)。對於手動撰寫的項目，引數會以單一空格連接，因此當您需要精確符合時，請將錨點加入模式。

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

該條目允許 `python3 safe.py`；`python3 other.py` 則是允許清單未命中。如果同一個二進位檔案也存在僅包含路徑的條目，未匹配的引數仍然可以回退到該僅路徑條目。當目標是將二進位檔案限制在宣告的引數時，請省略僅路徑條目。

由核准流程儲存的條目可以使用內部分隔符格式進行精確 argv 匹配。建議使用 UI 或核准流程來重新生成這些條目，而不是手動編輯編碼後的值。如果 OpenClaw 無法解析指令段的 argv，則帶有 `argPattern` 的條目將無法匹配。

每個允許清單條目支援：

| 欄位               | 含義                                       |
| ------------------ | ------------------------------------------ |
| `pattern`          | 已解析的二進位路徑 glob 或純指令名稱 glob  |
| `argPattern`       | 選用 argv 正則表示式；省略的條目視為僅路徑 |
| `id`               | 用於 UI 身分的穩定 UUID                    |
| `source`           | 條目來源，例如 `allow-always`              |
| `commandText`      | 當核准流程建立條目時捕獲的指令文字         |
| `lastUsedAt`       | 最後使用時間戳                             |
| `lastUsedCommand`  | 最後匹配的指令                             |
| `lastResolvedPath` | 最後解析的二進位路徑                       |

## 自動允許技能 CLI

當啟用 **自動允許技能 CLI** 時，已知技能參照的可執行檔會在節點（macOS 節點或無頭節點主機）上被視為已列入允許清單。這會透過 Gateway RPC 使用 `skills.bins` 來獲取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

<Warning>
- 這是一個 **隱含的便利允許清單**，與手動路徑允許清單條目分開。
- 它適用於 Gateway 和節點位於相同信任邊界內的可信操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單條目。

</Warning>

## 安全 bin 和核准轉發

關於安全 bin（僅 stdin 的快速路徑）、解釋器綁定詳細資訊，以及如何將核准提示轉發到 Slack/Discord/Telegram（或將其作為原生核准用戶端執行），請參閱
[Exec approvals - advanced](/zh-Hant/tools/exec-approvals-advanced)。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、每個代理的覆寫以及允許清單。選擇一個範圍（預設值或某個代理）、調整政策、新增/移除允許清單模式，然後按 **Save**。UI 會顯示每個模式最後使用的元數據，以便您保持清單整潔。

目標選擇器會選擇 **Gateway**（本機核准）或 **Node**。節點必須通告 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。如果節點尚未通告執行核准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯 — 請參閱 [Approvals CLI](/zh-Hant/cli/approvals)。

## 核准流程

當需要提示時，閘道會向操作員客戶端廣播 `exec.approval.requested`。Control UI 和 macOS 應用程式會透過 `exec.approval.resolve` 解析它，然後閘道會將已核准的請求轉發至節點主機。

對於 `host=node`，核准請求包含標準的 `systemRunPlan` 載荷。當轉發已核准的 `system.run` 請求時，閘道會將該計劃作為授權的 command/cwd/session 上下文。

這對於非同步核准延遲很重要：

- 節點執行路徑會預先準備一個標準計劃。
- 核准記錄會儲存該計劃及其綁定元數據。
- 一旦獲得核准，最終轉發的 `system.run` 呼叫會重複使用儲存的計劃，而不是信任後續呼叫者的編輯。
- 如果在建立核准請求後，呼叫者變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會將轉發的執行視為核准不符而予以拒絕。

## 系統事件

執行生命週期會以系統訊息呈現：

- `Exec running`（僅當指令超過執行通知閾值時）。
- `Exec finished`。
- `Exec denied`。

這些內容會在節點回報事件後發布至 Agent 的階段。Gateway 主機執行核准會在命令完成時（以及可選地，當執行時間超過閾值時）發出相同的生命週期事件。受核准閘道控管的執行指令會在這些訊息中重複使用核准 ID 作為 `runId`，以便於關聯。

## 拒絕核准的行為

當非同步執行核准被拒絕時，OpenClaw 會防止 Agent 重複使用在階段中先前執行相同命令的任何輸出。拒絕原因會隨附明確指引，指出沒有可用的命令輸出，這能阻止 Agent 聲稱有新輸出，或使用先前成功執行的過時結果重複執行被拒絕的命令。

## 影響

- **`full`** 功能強大；盡可能優先使用允許清單。
- **`ask`** 能讓您掌握狀況，同時仍允許快速核准。
- 個別 Agent 的允許清單可防止一個 Agent 的核准洩漏至其他 Agent。
- 核准僅適用於來自**已授權發送者**的主機執行請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是針對已授權操作員的階段層級便利功能，設計上會跳過核准。若要強制阻擋主機執行，請將核准安全性設為 `deny` 或透過工具原則拒絕 `exec` 工具。

## 相關內容

<CardGroup cols={2}>
  <Card title="執行核准 - 進階" href="/zh-Hant/tools/exec-approvals-advanced" icon="gear">
    安全 binaries、解譯器繫結，以及核准轉發至聊天。
  </Card>
  <Card title="執行工具" href="/zh-Hant/tools/exec" icon="terminal">
    Shell 命令執行工具。
  </Card>
  <Card title="提升模式" href="/zh-Hant/tools/elevated" icon="shield-exclamation">
    同樣跳過核准的緊急存取路徑。
  </Card>
  <Card title="Sandboxing" href="/zh-Hant/gateway/sandboxing" icon="box">
    沙盒模式與工作區存取。
  </Card>
  <Card title="Security" href="/zh-Hant/gateway/security" icon="lock">
    安全模型與強化防護。
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何時使用各項控制措施。
  </Card>
  <Card title="Skills" href="/zh-Hant/tools/skills" icon="sparkles">
    技能支援的自動允許行為。
  </Card>
</CardGroup>
