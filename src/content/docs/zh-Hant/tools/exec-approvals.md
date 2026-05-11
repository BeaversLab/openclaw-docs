---
summary: "主機執行核准：政策控制、允許清單以及 YOLO/嚴格工作流程"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "執行核准"
sidebarTitle: "執行核准"
---

執行核准是讓沙盒化代理程式在真實主機（`gateway` 或 `node`）上執行命令的**伴隨應用程式 / 節點主機防護機制**。這是一個安全聯鎖裝置：只有當政策 + 允許清單 + （可選）使用者核准都一致同意時，才允許執行命令。執行核准堆疊在工具政策和提升權限閘門之上（除非 elevated 設為 `full`，這會跳過核准）。

<Note>有效政策是 `tools.exec.*` 與核准預設值中**較嚴格**的一方；如果省略了某個核准欄位，則會使用 `tools.exec` 值。主機執行也會使用該機器上的本機核准狀態——即使工作階段或設定預設值請求 `ask: "on-miss"`，在 `~/.openclaw/exec-approvals.json` 中設定的主機本機 `ask: "always"` 仍會持續提示。</Note>

## 檢查有效政策

| 指令                                                             | 顯示內容                                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 請求的政策、主機政策來源以及有效結果。             |
| `openclaw exec-policy show`                                      | 本機機器的合併檢視。                               |
| `openclaw exec-policy set` / `preset`                            | 將本機請求的政策與本機主機核准檔案同步，一步完成。 |

當本機範圍請求 `host=node` 時，`exec-policy show` 會在執行時將該範圍回報為節點管理，而不是假裝本機核准檔案是真相來源。

如果伴隨應用程式 UI **無法使用**，任何通常會提示的請求將由 **詢問後備機制** 解決（預設值：`deny`）。

<Tip>原生聊天審批客戶端可以在待審批訊息上針對特定頻道設置操作方式。例如，Matrix 會預設反應捷徑（`✅` 允許一次，`❌` 拒絕，`♾️` 始終允許），同時仍保留訊息中的 `/approve ...` 指令作為備用方案。</Tip>

## 適用範圍

Exec approvals（執行審批）是在執行主機上本地強制執行的：

- **Gateway host（閘道主機）** → 閘道機器上的 `openclaw` 程序。
- **Node host（節點主機）** → node runner（macOS 伴隨應用程式或無頭節點主機）。

### 信任模型

- 經過 Gateway 驗證的呼叫者是該 Gateway 的受信任操作員。
- 配對的節點將該受信任操作員能力擴展到節點主機上。
- 執行審批降低了意外執行的風險，但**並非**使用者級別的授權邊界。
- 經批准的節點主機運行會綁定規範的執行上下文：規範 cwd、精確 argv、env 綁定（如果存在），以及固定的可執行檔路徑（如果適用）。
- 對於 Shell 腳本和直譯器/執行時檔案直接調用，OpenClaw 也會嘗試綁定一個具體的本地檔案操作數。如果綁定的檔案在批准後但在執行前發生變更，該運行將被拒絕，而不是執行已偏離的內容。
- 檔案綁定是刻意為之的盡力而為，**並非**每個直譯器/執行時載入器路徑的完整語意模型。如果批准模式無法識別確切的一個具體本地檔案進行綁定，它將拒絕建立經批准的運行，而不是假設完全覆蓋。

### macOS 分離

- **node host service（節點主機服務）** 透過本地 IPC 將 `system.run` 轉發給 **macOS app**。
- **macOS app** 會強制執行審批並在 UI 上下文中執行指令。

## 設定與儲存

審批記錄儲存在執行主機上的本地 JSON 檔案中：

```text
~/.openclaw/exec-approvals.json
```

架構範例：

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

## 政策控制

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` — 封鎖所有主機執行請求。 - `allowlist` — 僅允許已列入白名單的指令。 - `full` — 允許所有操作（等同於已提升權限）。
</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` — 永不提示。 - `on-miss` — 僅在允許清單（allowlist）不匹配時提示。 - `always` — 每次執行指令時都提示。當有效的詢問模式為 `always` 時，`allow-always` 的持久信任**並不**會抑制提示。
</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  當需要提示但無法存取 UI 時的解決方式。

- `deny` — 封鎖。
- `allowlist` — 僅在允許清單匹配時允許。
- `full` — 允許。
  </ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  當設為 `true` 時，即使直譯器二進位檔本身已在允許清單中，OpenClaw 仍會將內聯程式碼求值形式視為僅需批准。這是針對無法清晰對應到單一穩定檔案操作數的直譯器載入器的縱深防禦。
</ParamField>

嚴格模式可攔截的範例：

- `python -c`
- `node -e`， `node --eval`， `node -p`
- `ruby -e`
- `perl -e`， `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在嚴格模式下，這些指令仍需要明確批准，且
`allow-always` 不會自動為它們保留新的允許清單條目。

## YOLO 模式（無需批准）

如果您希望主機執行（host exec）在無需批准提示的情況下執行，您必須開啟
**這兩層** 策略 — OpenClaw 設定中請求的執行策略
(`tools.exec.*`) **以及** `~/.openclaw/exec-approvals.json` 中的主機本機批准策略。

除非您明確收緊設定，否則 YOLO 是預設的主機行為：

| 層                    | YOLO 設定                    |
| --------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上的 `full` |
| `tools.exec.ask`      | `off`                        |
| 主機 `askFallback`    | `full`                       |

<Warning>
**重要區別：**

- `tools.exec.host=auto` 決定 exec **在哪裡**執行：如果可用則在沙箱中，否則在閘道中。
- YOLO 決定主機 exec **如何**被批准：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不會**在設定的主機 exec 原則之上增加額外的啟發式命令混淆批准閘門或指令稿預檢拒絕層。
- `auto` 並不會讓從沙箱會話進行閘道路由成為免費的覆寫。允許從 `auto` 發出單次呼叫的 `host=node` 請求；僅當沒有沙箱執行時期處於活動狀態時，才允許從 `auto` 進行 `host=gateway`。若要設定穩定的非自動預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。
  </Warning>

暴露其自身非互動權限模式的 CLI 支援供應商可以遵循此原則。當 OpenClaw 請求的
exec 原則為 YOLO 時，Claude CLI 會新增
`--permission-mode bypassPermissions`。您可以使用明確的 Claude 參數在
`agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下覆寫該後端行為 —
例如 `--permission-mode default`、`acceptEdits` 或
`bypassPermissions`。

如果您想要更保守的設定，請將任一層調回
`allowlist` / `on-miss` 或 `deny`。

### 持續性的閘道主機「永不提示」設定

<Steps>
  <Step title="設定請求的組態原則">
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

它被特意設計為僅限本機。若要從遠端變更閘道主機或節點主機的
批准，請使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

### 節點主機

對於節點主機，請改在該節點上套用相同的批准檔案：

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
**�限本地的限制：**

- `openclaw exec-policy` 不會同步節點批准。
- `openclaw exec-policy set --host node` 會被拒絕。
- 節點執行批准會在執行時從節點取得，因此針對節點的更新必須使用 `openclaw approvals --node ...`。
  </Note>

### 僅限目前階段的捷徑

- `/exec security=full ask=off` 僅變更目前的階段。
- `/elevated full` 是一個緊急應變捷徑，也會略過該階段的執行批准。

如果主機批准檔案維持比設定更嚴格，則較嚴格的主機原則仍會優先生效。

## 允許清單（每個代理程式）

允許清單是**每個代理程式**的。如果有多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式為 glob 比對。

模式可以是已解析的二進位路徑 glob 或純指令名稱 glob。
純名稱僅匹配透過 `PATH` 叫用的指令，因此 `rg` 可以在指令為 `rg` 時匹配 `/opt/homebrew/bin/rg`，但**不會**匹配 `./rg` 或
`/tmp/rg`。當您想要信任某個特定的二進位位置時，請使用路徑 glob。

舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。
諸如 `echo ok && pwd` 之類的 Shell 鏈仍然需要每個頂層區段符合允許清單規則。

範例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單項目會追蹤：

| 欄位               | 含義                        |
| ------------------ | --------------------------- |
| `id`               | 用於 UI 身分識別的穩定 UUID |
| `lastUsedAt`       | 最後使用時間戳記            |
| `lastUsedCommand`  | 最後匹配的指令              |
| `lastResolvedPath` | 最後解析的二進位路徑        |

## 自動允許技能 CLI

當啟用**自動允許技能 CLI** 時，已知技能參考的可執行檔會在節點（macOS 節點或無頭節點主機）上被視為已加入允許清單。這會使用透過 Gateway RPC 的 `skills.bins` 來擷取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

<Warning>- 這是一個**隱含的便利允許清單**，與手動路徑允許清單條目分開。 - 這適用於受信任的操作員環境，其中 Gateway 和節點位於相同的信任邊界內。 - 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單條目。</Warning>

## 安全 bins 與批准轉發

有關安全 bins（僅 stdin 的快速路徑）、直譯器綁定詳細資訊，以及如何將批准提示轉發到 Slack/Discord/Telegram（或將其作為原生批准客戶端執行），請參閱
[Exec approvals — advanced](/zh-Hant/tools/exec-approvals-advanced)。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、
個別代理覆寫和允許清單。選擇一個範圍（預設值或某個代理），
調整策略，新增/移除允許清單模式，然後按一下 **Save**。UI
會顯示每個模式最後使用的元數據，以便您保持清單整潔。

目標選擇器會選擇 **Gateway**（本地批准）或 **Node**。
節點必須通告 `system.execApprovals.get/set`（macOS app 或
無頭節點主機）。如果節點尚未通告 exec approvals，
請直接編輯其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援 gateway 或 node 編輯 — 請參閱
[Approvals CLI](/zh-Hant/cli/approvals)。

## 批准流程

當需要提示時，gateway 會將
`exec.approval.requested` 廣播給操作員客戶端。Control UI 和 macOS
app 透過 `exec.approval.resolve` 解決它，然後 gateway 將
已批准的請求轉發到節點主機。

對於 `host=node`，批准請求包含一個標準的 `systemRunPlan`
負載。在轉發已批准的 `system.run`
請求時，gateway 將該計劃用作權威的
command/cwd/session 上下文。

這對於非同步批准延遲很重要：

- 節點 exec 路徑會預先準備一個標準計劃。
- 批准記錄會儲存該計劃及其綁定元數據。
- 獲得批准後，最終轉發的 `system.run` 呼叫會重複使用儲存的計劃，而不是信任後續的呼叫者編輯。
- 如果呼叫者在建立批准請求後變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會將轉發的執行請求作為批准不符拒絕。

## 系統事件

Exec 生命週期以系統訊息形式呈現：

- `Exec running`（僅當指令超過執行通知閾值時）。
- `Exec finished`。
- `Exec denied`。

這些會在節點回報事件後發布至代理程式的階段。
由閘道主控的 Exec 批准會在指令完成時（以及可選地在執行時間超過閾值時）發出相同的生命週期事件。
受批准控管的 Exec 會重複使用批准 ID 作為這些訊息中的 `runId`，以便於關聯。

## 拒絕批准的行為

當非同步 Exec 批准被拒絕時，OpenClaw 會防止代理程式
重複使用階段中同一指令先前的任何執行輸出。
拒絕原因會附帶明確指引，指出沒有指令輸出
可用，這能阻止代理程式聲稱有新輸出或
使用先前成功執行的過時結果重複執行被拒絕的指令。

## 影響

- **`full`** 功能強大；請盡可能優先使用允許清單。
- **`ask`** 能讓您掌握狀況，同時仍允許快速批准。
- 依代理程式的允許清單可防止一個代理程式的批准洩漏至其他代理程式。
- 批准僅適用於來自**授權傳送者**的主機 Exec 請求。未授權的傳送者無法發出 `/exec`。
- `/exec security=full` 是供授權操作員使用的階段層級便利功能，且設計上會略過批准。若要完全封鎖主機 Exec，請將批准安全性設為 `deny` 或透過工具政策拒絕 `exec` 工具。

## 相關

<CardGroup cols={2}>
  <Card title="Exec approvals — advanced" href="/zh-Hant/tools/exec-approvals-advanced" icon="gear">
    安全二進位檔、解釋器綁定以及將批准轉發至聊天。
  </Card>
  <Card title="Exec tool" href="/zh-Hant/tools/exec" icon="terminal">
    Shell 指令執行工具。
  </Card>
  <Card title="Elevated mode" href="/zh-Hant/tools/elevated" icon="shield-exclamation">
    緊急路徑，也會跳過核准。
  </Card>
  <Card title="Sandboxing" href="/zh-Hant/gateway/sandboxing" icon="box">
    沙盒模式和工作區存取。
  </Card>
  <Card title="Security" href="/zh-Hant/gateway/security" icon="lock">
    安全模型與防護強化。
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何時使用各項控制。
  </Card>
  <Card title="Skills" href="/zh-Hant/tools/skills" icon="sparkles">
    由 Skills 支援的自動允許行為。
  </Card>
</CardGroup>
