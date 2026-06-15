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

若要查看 `deny`、`allowlist`、`ask`、`auto`、`full`、
Codex Guardian 對應以及 ACPX harness 權限的優先模式概述，請參閱
[權限模式](/zh-Hant/tools/permission-modes)。

<Note>有效原則是 `tools.exec.*` 與批准 預設值中**較嚴格**者；如果省略了批准欄位，則會使用 `tools.exec` 的值。 主機執行也會使用該機器上的本機批准狀態 - 即使工作階段或組態預設要求 `ask: "on-miss"`， `~/.openclaw/exec-approvals.json` 中的 主機本機 `ask: "always"` 仍會持續提示。</Note>

## 檢查有效原則

| 指令                                                             | 顯示內容                                     |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 請求的原則、主機原則來源以及有效結果。       |
| `openclaw exec-policy show`                                      | 本機合併檢視。                               |
| `openclaw exec-policy set` / `preset`                            | 將本機請求的原則與本機主機批准檔案一步同步。 |

當本機範圍請求 `host=node` 時，`exec-policy show` 會在執行時將該範圍回報為節點管理，
而不是假裝本機批准檔案是事實來源。

如果隨附應用程式 UI **無法使用**，任何通常會提示的請求將由
**詢問後援 (ask fallback)** 解決 (預設值：`deny`)。

<Tip>原生聊天批准用戶端可以在待批准訊息上植入特定管道的輔助功能。 例如，Matrix 會植入反應捷徑 (`✅` 允許一次，`❌` 拒絕，`♾️` 總是允許)，同時仍然保留 訊息中的 `/approve ...` 指令作為後援。</Tip>

## 適用範圍

執行批准會在本機於執行主機上強制執行：

- **Gateway host** → 閘道機器上的 `openclaw` 處理程序。
- **Node host** → 節點執行器 (macOS 隨附應用程式或無介面節點主機)。

### 信任模型

- 經過 Gateway 驗證的呼叫者是該 Gateway 的受信任操作員。
- 配對節點將該受信任操作員的能力擴展到了節點主機上。
- 執行批准降低了意外執行的風險，但並**非**每個使用者的驗證邊界或檔案系統唯讀策略。
- 一旦獲得批准，命令可以根據所選主機或沙盒檔案系統權限來修改檔案。
- 已批准的節點主機執行會綁定標準執行上下文：標準 cwd、精確的 argv、env 綁定（如果存在），以及固定的可執行檔案路徑（如適用）。
- 對於 Shell 腳本和直譯器/執行時檔案的直接調用，OpenClaw 也會嘗試綁定一個具體的本機檔案操作數。如果綁定的檔案在批准之後但在執行之前發生變更，執行將被拒絕，而不會執行發生偏移的內容。
- 檔案綁定是刻意的「盡力而為」，並**非**對每個直譯器/執行時載入器路徑的完整語意模型。如果批准模式無法識別要綁定的確切一個具體本機檔案，它將拒絕建立支援批准的執行，而不是假設完全覆蓋。

### macOS 分離

- **節點主機服務**透過本機 IPC 將 `system.run` 轉發到 **macOS 應用程式**。
- **macOS 應用程式**執行批准並在 UI 上下文中執行命令。

## 設定與儲存

批准儲存在執行主機上的一個本機 JSON 檔案中：

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

## 策略控制

### `tools.exec.mode`

`tools.exec.mode` 是用於主機執行的首選標準化策略介面。數值包括：

- `deny` - 封鎖主機執行。
- `allowlist` - 僅執行允許清單中的命令而不詢問。
- `ask` - 使用允許清單策略，並在未命中時詢問。
- `auto` - 使用允許清單策略，直接執行確定性匹配，並在回退到人工批准路徑之前，將批准未匹配項透過 OpenClaw 的原生自動審核器發送。
- `full` - 在無批准提示的情況下執行主機執行。

舊版 `tools.exec.security` / `tools.exec.ask` 仍然受支援，且在較窄的 session 或 agent 範圍內設定時仍然優先適用。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 封鎖所有主機執行請求。
  - `allowlist` - 僅允許允許清單中的命令。
  - `full` - 允許所有內容（等同於提升權限）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 永不提示。
  - `on-miss` - 僅在允許清單不匹配時提示。
  - `always` - 在每個命令上提示。 `allow-always` 持久信任**不會**在有效詢問模式為 `always` 時抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  當需要提示但無法連接 UI 時的解決方式。

- `deny` - 封鎖。
- `allowlist` - 僅在允許清單匹配時允許。
- `full` - 允許。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  當 `true` 時，OpenClaw 會將內聯代碼求值形式視為僅需批准 即使解釋器二進制文件本身在允許清單中。這是針對那些 無法整潔映射到一個穩定文件操作數的解釋器加載器的縱深防禦。
</ParamField>

嚴格模式會攔截的範例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在嚴格模式下，這些命令仍需要明確批准，並且
`allow-always` 不會自動為它們持久化新的允許清單條目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  僅控制執行批准提示中的呈現。啟用後， OpenClaw 可能會附加解析器衍生的命令範圍，以便 Web 批准 提示可以醒目顯示命令標記。將其設定為 `true` 以啟用 命令文字醒目顯示。
</ParamField>

此設定**不會**改變 `security`、`ask`、允許清單匹配、嚴格的內聯求值行為、核准轉發或指令執行。它可以在 `tools.exec.commandHighlighting` 下全域設定，或針對每個代理程式在 `agents.list[].tools.exec.commandHighlighting` 下設定。

## YOLO 模式（無需核准）

如果您希望主機 exec 在無需核准提示的情況下執行，您必須開啟**這兩層**策略 - OpenClaw 設定中請求的 exec 策略 (`tools.exec.*`) **以及** `~/.openclaw/exec-approvals.json` 中的主機本機核准策略。

除非您明確收緊，否則 YOLO 是預設的主機行為：

| 層級                  | YOLO 設定                    |
| --------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上的 `full` |
| `tools.exec.ask`      | `off`                        |
| 主機 `askFallback`    | `full`                       |

<Warning>
**重要區別：**

- `tools.exec.host=auto` 選擇 exec 執行的**位置**：如果有沙箱則在沙箱中，否則在閘道中。
- YOLO 選擇主機 exec 獲得核准的**方式**：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不會**在設定的主機 exec 策略之上，新增獨立的啟發式指令混淆核准閘門或腳本預檢拒絕層。
- `auto` 並不會讓從沙箱會話進行閘道路由成為免費的覆蓋。從 `auto` 允許每次呼叫的 `host=node` 請求；僅當沒有沙箱執行時期處於活動狀態時，才允許從 `auto` 進行 `host=gateway`。若要設定穩定的非自動預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

</Warning>

公開自身非互動式權限模式的 CLI 支援供應商可以遵循此策略。當 OpenClaw 的有效執行策略為 YOLO 時，Claude CLI 會新增
`--permission-mode bypassPermissions`。對於由 OpenClaw 管理的 Claude Live 會話，OpenClaw 的有效執行策略優先於 Claude 的原生權限模式：
YOLO 會將 Live 啟動標準化為 `--permission-mode bypassPermissions`，而
嚴格的有效執行策略會將 Live 啟動標準化為
`--permission-mode default`，即使原始的 Claude 後端參數指定了另一個
模式。

如果您想要更保守的設定，請將 OpenClaw 執行策略調整回
`allowlist` / `on-miss` 或 `deny`。

### 持久化閘道主機「永不提示」設定

<Steps>
  <Step title="設定請求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="符合主機核准檔案">
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

此功能僅限於本機使用。若要遠端變更閘道主機或節點主機的
核准，請使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

### 節點主機

對於節點主機，請改為在該節點上套用相同的核准檔案：

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
- 節點執行核准會在執行時從節點取得，因此以節點為目標的更新必須使用 `openclaw approvals --node ...`。

</Note>

### 僅限會話的捷徑

- `/exec security=full ask=off` 僅會變更目前會話。
- `/elevated full` 是一個緊急捷徑，僅當
  請求的策略和主機核准檔案皆解析為
  `security: "full"` 和 `ask: "off"` 時，才會略過執行核准。更嚴格的主機檔案，例如
  `ask: "always"`，仍然會提示。

如果主機核准檔案比配置更嚴格，則較嚴格的主機
策略仍然優先。

## 允許清單 （每個 Agent）

允許清單是**針對每個代理程式**的。如果存在多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式是 glob 比對。

模式可以是解析後的二進位路徑 glob 或純指令名稱 glob。純名稱僅匹配透過 `PATH` 叫用的指令，因此當指令是 `rg` 時，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不**匹配 `./rg` 或 `/tmp/rg`。當您想要信任某個特定的二進位位置時，請使用路徑 glob。

舊版的 `agents.default` 項目會在載入時遷移至 `agents.main`。諸如 `echo ok && pwd` 之類的 Shell 鏈仍然需要每個頂層區段都符合允許清單規則。

範例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制引數

當允許清單項目應該匹配二進位檔案和特定的引數形狀時，請新增 `argPattern`。OpenClaw 會根據解析後的指令引數評估正規表示式，不包括可執行檔 token (`argv[0]`)。對於手動撰寫的項目，引數會以單一空格連接，因此當您需要完全匹配時，請錨定模式。

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

該項目允許 `python3 safe.py`；`python3 other.py` 則是允許清單未命中。如果存在相同二進位檔案的僅路徑項目，未匹配的引數仍然可以回退到該僅路徑項目。當目標是將二進位檔案限制為宣告的引數時，請省略僅路徑項目。

由核准流程儲存的項目可以使用內部分隔符格式進行精確的 argv 匹配。建議優先使用 UI 或核准流程來重新產生這些項目，而不是手動編輯編碼後的值。如果 OpenClaw 無法解析指令區段的 argv，則帶有 `argPattern` 的項目將不會匹配。

每個允許清單項目支援：

| 欄位               | 含義                                       |
| ------------------ | ------------------------------------------ |
| `pattern`          | 解析後的二進位路徑 glob 或純指令名稱 glob  |
| `argPattern`       | 選用的 argv 正規表示式；省略的項目為僅路徑 |
| `id`               | 用於 UI 身份的穩定 UUID                    |
| `source`           | 條目來源，例如 `allow-always`              |
| `commandText`      | 建立此條目時擷取的指令文字                 |
| `lastUsedAt`       | 最後使用的時間戳                           |
| `lastUsedCommand`  | 最後相符的指令                             |
| `lastResolvedPath` | 最後解析的二進位路徑                       |

## 自動允許技能 CLI

當啟用 **Auto-allow skill CLIs** 時，已知技能參照的可執行檔會被視為節點上的已允許清單（macOS 節點或無頭節點主機）。這會使用 `skills.bins` 透過 Gateway RPC 來取得技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

<Warning>
- 這是一個 **隱含的便利性允許清單**，與手動路徑允許清單條目分開。
- 這適用於 Gateway 和節點位於相同信任邊界的信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單條目。

</Warning>

## 安全 bins 與審核轉發

關於安全 bins（僅 stdin 的快速路徑）、直譯器綁定細節，以及如何將審核提示轉發至 Slack/Discord/Telegram（或將其作為原生審核用戶端執行），請參閱 [Exec approvals - advanced](/zh-Hant/tools/exec-approvals-advanced)。

## Control UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、個別代理的覆寫值和允許清單。選擇一個範圍（Defaults 或某個代理），調整原則，新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的最近使用中繼資料，讓您保持清單整潔。

目標選擇器會選擇 **Gateway**（本機審核）或 **Node**。節點必須通告 `system.execApprovals.get/set`（macOS app 或無頭節點主機）。如果節點尚未通告執行審核，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援 gateway 或 node 編輯 - 請參閱 [Approvals CLI](/zh-Hant/cli/approvals)。

## 審核流程

當需要提示時，閘道會向操作員客戶端廣播
`exec.approval.requested`。Control UI 和 macOS
應用程式會透過 `exec.approval.resolve` 解析它，然後閘道會將
已批准的請求轉發至節點主機。

對於 `host=node`，批准請求包含一個標準 `systemRunPlan`
Payload。當轉發已批准的 `system.run`
請求時，閘道會使用該計劃作為授權的
command/cwd/session 上下文。

這對於非同步批准延遲很重要：

- 節點 exec 路徑會預先準備一個標準計劃。
- 批准記錄會儲存該計劃及其綁定中繼資料。
- 一旦獲得批准，最終轉發的 `system.run` 呼叫會重複使用儲存的計劃，而不是信任後續呼叫者的編輯。
- 如果在建立批准請求後，呼叫者變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會將轉發的執行作為批准不符而拒絕。

## 系統事件

Exec 生命週期會顯示為系統訊息：

- `Exec running` (僅當指令超過執行通知臨界值時)。
- `Exec finished`。

這些會在節點回報事件後發布至 Agent 的工作階段。
被拒絕的 exec 批准對於主機指令本身而言是終結性的：該指令
不會執行。對於具有來源工作階段的主 Agent 非同步批准，
OpenClaw 會將拒絕作為內部後續追蹤發布回該工作階段，以便
Agent 停止等待非同步指令並避免遺失結果修復。
如果沒有工作階段或無法恢復工作階段，OpenClaw 仍然可以
向操作員或直接聊天路徑回報簡明的拒絕。針對
子 Agent 工作階段的拒絕不會發布回子 Agent。
託管於閘道的 exec 批准會在
指令完成時（以及可選地在執行時間超過臨界值時）發出相同的生命週期事件。
受批准管制的 exec 會在這些
訊息中重複使用批准 ID 作為 `runId` 以便於關聯。

## 拒絕批准行為

當非同步執行核准被拒絕時，OpenClaw 會將主機命令視為終止並失敗關閉。對於主要代理程式階段，拒絕會作為內部階段後續回應傳送，告知代理程式非同步命令未執行。這樣可在不暴露過時命令輸出的情況下保持記錄連續性。如果無法進行階段傳送，當存在安全路由時，OpenClaw 會退回到簡潔的操作員或直接聊天拒絕回應。

## 影響

- **`full`** 功能強大；請盡可能使用允許清單。
- **`ask`** 讓您保持掌握，同時仍允許快速核准。
- 每個代理程式的允許清單可防止一個代理程式的核准洩漏到其他代理程式。
- 核准僅適用於來自**授權寄件者**的主機執行請求。未授權的寄件者無法發出 `/exec`。
- `/exec security=full` 是供授權操作員使用的階段層級便利功能，設計上會跳過核准。若要完全封鎖主機執行，請將核准安全性設定為 `deny`，或透過工具政策拒絕 `exec` 工具。

## 相關

<CardGroup cols={2}>
  <Card title="執行核准 - 進階" href="/zh-Hant/tools/exec-approvals-advanced" icon="gear">
    安全二進位檔、解釋器綁定以及核准轉發至聊天。
  </Card>
  <Card title="Exec 工具" href="/zh-Hant/tools/exec" icon="terminal">
    Shell 命令執行工具。
  </Card>
  <Card title="提升模式" href="/zh-Hant/tools/elevated" icon="shield-exclamation">
    同樣跳過核准的緊急路徑。
  </Card>
  <Card title="沙盒化" href="/zh-Hant/gateway/sandboxing" icon="box">
    沙盒模式與工作區存取。
  </Card>
  <Card title="Security" href="/zh-Hant/gateway/security" icon="lock">
    安全模型與強化防護。
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何時使用各種控制項。
  </Card>
  <Card title="Skills" href="/zh-Hant/tools/skills" icon="sparkles">
    基於技能的自動允許行為。
  </Card>
</CardGroup>
