---
summary: "主機執行審核：原則控制參數、允許清單及 YOLO/嚴格工作流程"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "執行審核"
sidebarTitle: "執行審核"
---

Exec approvals 是讓沙盒化代理程式在真實主機 (`gateway` 或 `node`) 上執行命令的 **companion app / node host guardrail**。這是一個安全聯鎖裝置：只有當原則 + 允許清單 + (可選) 使用者批准都一致時，才允許執行命令。Exec approvals 堆疊在工具原則和提升門控**之上** (除非 elevated 設定為 `full`，這會跳過批准流程)。

<Note>有效原則是 `tools.exec.*` 和批准預設值中**更嚴格**的一個；如果省略了批准欄位，則會使用 `tools.exec` 值。主機執行也會使用該機器上的本機批准狀態 - 即使會話或配置預設值請求 `ask: "on-miss"`，`~/.openclaw/exec-approvals.json` 中的主機本機 `ask: "always"` 仍會持續提示。</Note>

## 檢查有效政策

| 指令                                                             | 顯示內容                                           |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 請求的政策、主機政策來源以及有效結果。             |
| `openclaw exec-policy show`                                      | 本機機器的合併檢視。                               |
| `openclaw exec-policy set` / `preset`                            | 將本機請求的政策與本機主機核准檔案同步，一步完成。 |

當本機範圍請求 `host=node` 時，`exec-policy show` 會在執行時將該範圍回報為由節點管理，而不是假裝本機批准檔案是真相來源。

如果 companion app UI **不可用**，任何通常會提示的請求都將由 **ask fallback** 解決 (預設值：`deny`)。

<Tip>原生聊天批准用戶端可以在待批准訊息上植入特定管道的功能。例如，Matrix 植入了反應快捷方式 (`✅` 允許一次，`❌` 拒絕，`♾️` 總是允許)，同時仍在訊息中保留 `/approve ...` 指令作為備案。</Tip>

## 適用範圍

Exec approvals（執行審批）是在執行主機上本地強制執行的：

- **Gateway host** → Gateway 機器上的 `openclaw` 行程。
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

- **node host service** 透過本機 IPC 將 `system.run` 轉發給 **macOS app**。
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

### `tools.exec.mode`

`tools.exec.mode` 是用於主機執行的首選標準化原則介面。
值如下：

- `deny` - 封鎖主機執行。
- `allowlist` - 僅執行允許清單中的指令，不詢問。
- `ask` - 使用允許清單原則，並在未匹配時詢問。
- `auto` - 使用允許清單原則，直接執行確定性匹配，並在退回至人工審核途徑前，將未匹配的審核請求透過 OpenClaw 的原生自動審核者處理。
- `full` - 執行主機執行而不提示審核。

舊版的 `tools.exec.security` / `tools.exec.ask` 仍受支援，且在設定於較狹窄的工作階段或代理範圍時仍會優先套用。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 封鎖所有主機執行請求。
  - `allowlist` - 僅允許允許清單中的指令。
  - `full` - 允許所有指令（等同於提升權限）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 從不提示。
  - `on-miss` - 僅在允許清單未匹配時提示。
  - `always` - 在每個指令上提示。當有效的詢問模式為 `always` 時，`allow-always` 持久信任**並不會**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  當需要提示但無法連接 UI 時的解決方案。

- `deny` - 封鎖。
- `allowlist` - 僅在允許清單匹配時允許。
- `full` - 允許。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  當設為 `true` 時，即使解釋器二進位檔本身位於允許清單中，OpenClaw 也會將內嵌程式碼評估表單視為僅需審核。這是對於無法清晰對應到單一穩定檔案運算元的解釋器載入器的縱深防禦。
</ParamField>

嚴格模式會攔截的範例：

- `python -c`
- `node -e`、`node --eval`、`node -p`
- `ruby -e`
- `perl -e`、`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在嚴格模式下，這些指令仍需要明確批准，並且 `allow-always` 不會自動為它們保存新的允許清單項目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  僅控制執行核准提示中的呈現方式。啟用時，OpenClaw 可能會附加解析器衍生的指令範圍，讓 Web 核准提示能突顯指令記號。將其設為 `true` 以啟用指令文字突顯顯示。
</ParamField>

此設定**不會**變更 `security`、`ask`、允許清單比對、嚴格內聯求值行為、核准轉發或指令執行。它可以在 `tools.exec.commandHighlighting` 下全域設定，或在 `agents.list[].tools.exec.commandHighlighting` 下針對每個代理程式設定。

## YOLO 模式 (無需批准)

如果您希望主機執行作業在無需批准提示的情況下執行，您必須開啟**這兩個**策略層級 — OpenClaw 設定中請求的執行策略
(`tools.exec.*`) **以及** `~/.openclaw/exec-approvals.json` 中的本機主機批准策略。

除非您明確收緊，否則 YOLO 是預設的主機行為：

| 層級                  | YOLO 設定                    |
| --------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上的 `full` |
| `tools.exec.ask`      | `off`                        |
| 主機 `askFallback`    | `full`                       |

<Warning>
**重要區別：**

- `tools.exec.host=auto` 選擇 exec **在哪裡**運行：如果可用則在沙箱中，否則在網關中。
- YOLO 選擇主機 exec **如何**被批准：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不會**在設定的主機 exec 策略之上新增額外的啟發式命令混淆審核門檻或腳本前置檢查拒絕層。
- `auto` 並不會讓從沙箱會話進行的網關路由成為免費的覆寫。每次呼叫的 `host=node` 請求允許來自 `auto`；`host=gateway` 僅在沒有沙箱執行環境啟動時才允許來自 `auto`。若要設定穩定的非自動預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

</Warning>

暴露其自身非互動權限模式的 CLI 支援提供者可以遵循此策略。當 OpenClaw 的有效 exec 策略為 YOLO 時，Claude CLI 會新增
`--permission-mode bypassPermissions`。對於 OpenClaw 管理的 Claude 即時會話，OpenClaw 的有效 exec 策略高於 Claude 的原生權限模式：
YOLO 會將即時啟動標準化為 `--permission-mode bypassPermissions`，而
限制性的有效 exec 策略會將即時啟動標準化為
`--permission-mode default`，即使原始 Claude 後端參數指定了其他
模式也是如此。

如果您想要更保守的設定，請將 OpenClaw exec 策略重新收緊為
`allowlist` / `on-miss` 或 `deny`。

### 持續性網關主機「永不提示」設定

<Steps>
  <Step title="Set the requested config policy">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="Match the host approvals file">
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

這是有意設計為僅限本地的。若要遠端變更 Gateway 主機或 Node 主機的核准，請使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

### Node 主機

對於 Node 主機，請將相同的核准檔案套用至該節點上：

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
**僅限本地的限制：**

- `openclaw exec-policy` 不會同步 Node 核准。
- `openclaw exec-policy set --host node` 會被拒絕。
- Node 執行核准是在執行時期從該節點取得，因此以 Node 為目標的更新必須使用 `openclaw approvals --node ...`。

</Note>

### 僅限工作階段的捷徑

- `/exec security=full ask=off` 僅變更目前的工作階段。
- `/elevated full` 是一種緊急存取捷徑，僅在請求的原則與主機核准檔案都解析為
  `security: "full"` 和 `ask: "off"` 時，才會略過執行核准。較嚴格的主機檔案（例如
  `ask: "always"`）仍會顯示提示。

如果主機核准檔案維持比設定更嚴格，則較嚴格的主機原則仍然優先。

## 允許清單（每個 Agent）

允許清單是**每個 Agent** 的。如果存在多個 Agent，請在 macOS 應用程式中切換您正在編輯的 Agent。模式採用 glob 比對。

模式可以是已解析的二進位路徑 glob 或純指令名稱 glob。
純名稱僅符合透過 `PATH` 叫用的指令，因此當指令是 `rg` 時，`rg` 可以符合
`/opt/homebrew/bin/rg`，但**不**符合 `./rg` 或
`/tmp/rg`。當您想要信任某一個特定的二進位位置時，請使用路徑 glob。

舊版的 `agents.default` 項目會在載入時遷移至 `agents.main`。
諸如 `echo ok && pwd` 之類的 Shell 鍵仍然需要每個頂層區段符合允許清單規則。

範例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制引數

當允許清單條目需要匹配二元檔和特定參數形狀時，請加入 `argPattern`。OpenClaw 會根據解析後的指令參數評估正規表示式，但不包含可執行檔權杖 (`argv[0]`)。對於手動編寫的條目，參數會以單一空格連接，因此當您需要精確匹配時，請確定樣式。

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

該條目允許 `python3 safe.py`；`python3 other.py` 則是允許清單未命中。如果也存在同一個二元檔的僅路徑條目，未匹配的參數仍然可以退回到該僅路徑條目。當目標是將二元檔限制為宣告的參數時，請省略僅路徑條目。

由核准流程儲存的條目可以使用內部分隔符格式進行精確 argv 匹配。建議優先使用 UI 或核准流程來重新產生這些條目，而不是手動編輯編碼後的值。如果 OpenClaw 無法解析指令區段的 argv，則包含 `argPattern` 的條目將不會匹配。

每個允許清單條目支援：

| 欄位               | 含義                                       |
| ------------------ | ------------------------------------------ |
| `pattern`          | 已解析的二元檔路徑 glob 或純指令名稱 glob  |
| `argPattern`       | 選用的 argv 正規表示式；省略的條目僅為路徑 |
| `id`               | 用於 UI 識別的穩定 UUID                    |
| `source`           | 條目來源，例如 `allow-always`              |
| `commandText`      | 核准流程建立條目時擷取的指令文字           |
| `lastUsedAt`       | 上次使用時間戳記                           |
| `lastUsedCommand`  | 最後匹配的指令                             |
| `lastResolvedPath` | 最後解析的二元檔路徑                       |

## 自動允許技能 CLI

當啟用 **自動允許技能 CLI** 時，已知技能參考的可執行檔會被視為在節點（macOS 節點或無頭節點主機）上的允許清單中。這會透過 Gateway RPC 使用 `skills.bins` 來取得技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

<Warning>
- 這是一個 **隱含的便利許可清單**，與手動路徑許可清單項目分開。
- 它適用於 Gateway 和節點位於相同信任邊界內的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑許可清單項目。

</Warning>

## 安全二進制檔與審核轉發

關於安全二進位檔（僅 stdin 快速路徑）、解釋器綁定詳細資訊，以及如何將核准提示轉發到 Slack/Discord/Telegram（或將其作為原生核准客戶端執行），請參閱
[Exec approvals - advanced](/zh-Hant/tools/exec-approvals-advanced)。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、
個別代理覆寫和許可清單。選擇一個範圍（預設值或某個代理），
調整政策，新增/移除許可清單模式，然後按一下 **Save**。UI
會顯示每個模式上次使用的元數據，讓您保持清單整潔。

目標選擇器會選擇 **Gateway**（本地審核）或 **Node**。
節點必須宣告 `system.execApprovals.get/set`（macOS 應用程式或
無頭節點主機）。如果節點尚未宣告 exec approvals，
請直接編輯其本地的 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯 - 請參閱
[Approvals CLI](/zh-Hant/cli/approvals)。

## 審核流程

當需要提示時，gateway 會向操作員用戶端廣播
`exec.approval.requested`。Control UI 和 macOS
應用程式會透過 `exec.approval.resolve` 解析它，然後 gateway 會將
已批准的請求轉發到節點主機。

對於 `host=node`，審核請求包含一個標準 `systemRunPlan`
資料載荷。當轉發已批准的 `system.run`
請求時，gateway 會使用該計畫作為授權的
command/cwd/session 內容。

這對於非同步審核延遲很重要：

- 節點 exec 路徑會預先準備一個標準計畫。
- 審核記錄會儲存該計畫及其綁定元數據。
- 一旦獲得批准，最終轉發的 `system.run` 呼叫會重複使用儲存的計畫，而不是信任後續呼叫者的編輯。
- 如果在建立請求後，呼叫者變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會因為核對不一致而拒絕轉發的執行請求。

## 系統事件

Exec 生命週期會以系統訊息呈現：

- `Exec running`（僅當指令超過執行通知閾值時）。
- `Exec finished`。

這些會在節點回報事件後發佈到代理程式的工作階段。被拒絕的執行核准對主機命令本身而言是終止性的：該命令不會執行。對於具有來源工作階段的主代理程式非同步核准，OpenClaw 會將拒絕作為內部後續追蹤發回該工作階段，以便代理程式停止等待非同步命令並避免缺少結果的修復。如果沒有工作階段或無法恢復工作階段，OpenClaw 仍可向操作員或直接聊天路由回報簡潔的拒絕訊息。對於子代理程式工作階段的拒絕不會發回子代理程式。
閘道主機執行核准會在命令完成時發出相同的生命週期事件（並可選地在執行時間超過臨界值時發出）。受核准閘道的執行操作會在這些訊息中重複使用核准 ID 作為 `runId` 以便於關聯。

## 拒絕核准的行為

當非同步執行核准被拒絕時，OpenClaw 會將主機命令視為終止性並進行失效關閉。對於主代理程式工作階段，拒絕會作為內部工作階段後續追蹤傳遞，告知代理程式非同步命令未執行。這既保留了逐字稿的連續性，又不會暴露過期的命令輸出。如果無法進行工作階段傳遞，當存在安全路由時，OpenClaw 會退回至向操作員或直接聊天發送簡潔的拒絕訊息。

## 影響

- **`full`** 功能強大；盡可能優先使用允許清單。
- **`ask`** 讓您保持掌握情況，同時仍允許快速核准。
- 個別 agent 的允許清單可防止一個 agent 的核准洩漏至其他 agent。
- 核准僅適用於來自 **授權發送者** 的主機執行請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員在工作階段層級的便利功能，設計上會跳過核准。若要徹底封鎖主機執行，請將核准安全性設定為 `deny` 或透過工具政策拒絕 `exec` 工具。

## 相關

<CardGroup cols={2}>
  <Card title="執行核准 - 進階" href="/zh-Hant/tools/exec-approvals-advanced" icon="gear">
    安全的 bins、直譯器綁定，以及將核准轉發至聊天。
  </Card>
  <Card title="執行工具" href="/zh-Hant/tools/exec" icon="terminal">
    Shell 命令執行工具。
  </Card>
  <Card title="提昇模式" href="/zh-Hant/tools/elevated" icon="shield-exclamation">
    同時跳過核准的緊急逃生路徑。
  </Card>
  <Card title="沙盒化" href="/zh-Hant/gateway/sandboxing" icon="box">
    沙盒模式與工作區存取。
  </Card>
  <Card title="安全性" href="/zh-Hant/gateway/security" icon="lock">
    安全模型與強化防護。
  </Card>
  <Card title="沙盒 vs 工具原則 vs 提昇" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何時使用各項控制機制。
  </Card>
  <Card title="技能" href="/zh-Hant/tools/skills" icon="sparkles">
    由技能支援的自動允許行為。
  </Card>
</CardGroup>
