---
summary: "Exec approvals, allowlists, and sandbox escape prompts"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# 執行核准

Exec approvals 是讓沙箱化代理程式在真實主機 (`gateway` 或 `node`) 上執行命令的 **companion app / node host guardrail**。您可以將其視為安全互鎖：只有當政策 + 允許清單 + (可選的) 使用者核准都一致時，才允許執行命令。
Exec approvals 是工具政策和提升閘門 **之外** 的額外措施 (除非 elevated 設定為 `full`，這會跳過核准)。
有效的政策是 `tools.exec.*` 和核准預設值中 **較嚴格** 的一方；如果省略了核准欄位，則使用 `tools.exec` 值。
Host exec 也會使用該機器上的本機核准狀態。即使 session 或 config 預設值請求 `ask: "on-miss"`，主機本機的 `ask: "always"` 在 `~/.openclaw/exec-approvals.json` 中仍會持續提示。
使用 `openclaw approvals get`、`openclaw approvals get --gateway` 或
`openclaw approvals get --node <id|name|ip>` 來檢查請求的政策、主機政策來源和有效結果。
對於本機機器，`openclaw exec-policy show` 會公開相同的合併檢視，
且 `openclaw exec-policy set|preset` 可以一步將本機請求的政策與本機主機核准檔同步。當本機範圍請求 `host=node` 時，
`openclaw exec-policy show` 會在執行時將該範圍回報為 node-managed，而不是
假裝本機核准檔是有效的事實來源。

如果**無法使用**伴隨應用程式 UI，任何需要提示的請求都會由**詢問回退機制**（預設：拒絕）來解析。

原生聊天核准客戶端還可以在待核准訊息上公開特定頻道的功能。例如，Matrix 可以在核准提示上預設反應捷徑 (`✅` 允許一次，`❌` 拒絕，以及 `♾️` 總是允許，當可用時)，
同時仍保留訊息中的 `/approve ...` 指令作為後備方案。

## 適用範圍

執行核准是在執行主機上本機執行的：

- **gateway host** → `openclaw` 程序在 gateway 機器上
- **節點主機** → 節點執行器（macOS 伴隨應用程式或無頭節點主機）

信任模型備註：

- 經過閘道驗證的呼叫者是該閘道的受信任操作員。
- 配對的節點會將該受信任操作員的功能擴展到節點主機上。
- 執行核准可降低意外執行的風險，但並非每個使用者的驗證邊界。
- 已核准的 node-host 執行會綁定規範執行上下文：規範 cwd、精確 argv、env
  綁定（如果存在），以及固定可執行檔路徑（如適用）。
- 對於 Shell 腳本和直譯器/執行時期檔案的直接呼叫，OpenClaw 也會嘗試綁定
  一個具體的本機檔案運算元。如果綁定的檔案在核准後、執行前發生變更，
  則會拒絕執行，而不是執行已變更的內容。
- 此檔案綁定是刻意盡力而為的，並非對每個
  直譯器/執行時期載入器路徑的完整語意模型。如果核准模式無法識別恰好一個具體的本機
  檔案進行綁定，它會拒絕建立支援核准的執行，而不是假設完全覆蓋。

macOS 區分：

- **node host service** 會透過本機 IPC 將 `system.run` 轉發至 **macOS app**。
- **macOS app** 在 UI 上下文中執行核准 + 執行指令。

## 設定與儲存

核准存在於執行主機上的本機 JSON 檔案中：

`~/.openclaw/exec-approvals.json`

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
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 免核准 "YOLO" 模式

如果您希望主機 exec 在無需核准提示的情況下執行，您必須開啟**兩者**原則層級：

- OpenClaw 配置中請求的 exec 原則 (`tools.exec.*`)
- `~/.openclaw/exec-approvals.json` 中的主機本機批准原則

這現在是預設的主機行為，除非您明確收緊它：

- `tools.exec.security`：`gateway`/`node` 上設為 `full`
- `tools.exec.ask`：`off`
- 主機 `askFallback`：`full`

重要區別：

- `tools.exec.host=auto` 決定 exec 在何處執行：可用時在沙箱中執行，否則在閘道上執行。
- YOLO 決定如何批准主機 exec：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不會在設定的主機 exec 原則之上額外增加獨立的啟發式指令混淆核准閘門。
- `auto` 不會讓閘道路由成為從沙箱工作階段進行的免費覆寫。從 `auto` 允許每次呼叫的 `host=node` 請求，且僅當沒有沙箱執行環境處於作用中時，才允許從 `auto` 進行 `host=gateway`。如果您想要穩定的非自動預設值，請設定 `tools.exec.host` 或明確使用 `/exec host=...`。

如果您想要更保守的設定，請將任一層級縮緊回 `allowlist` / `on-miss`
或 `deny`。

持續性閘道主機「永不提示」設定：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

然後設定主機核准檔案以符合：

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

目前機器上相同閘道-主機原則的本機捷徑：

```bash
openclaw exec-policy preset yolo
```

該本機捷徑會同時更新兩者：

- 本機 `tools.exec.host/security/ask`
- 本機 `~/.openclaw/exec-approvals.json` 預設值

它被有意設計為僅限本機。如果您需要遠端變更閘道-主機或節點-主機的批准，
請繼續使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

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

重要的僅限本機限制：

- `openclaw exec-policy` 不會同步節點批准
- `openclaw exec-policy set --host node` 會被拒絕
- 節點 exec 批准會在執行時從節點獲取，因此以節點為目標的更新必須使用 `openclaw approvals --node ...`

僅限工作階段的捷徑：

- `/exec security=full ask=off` 僅會變更目前的工作階段。
- `/elevated full` 是一種緊急捷徑，也會跳過該工作階段的執行核准。

如果主機核准檔案比配置更嚴格，則較嚴格的主機政策優先適用。

## 政策控制選項

### 安全性 (`exec.security`)

- **deny**：阻止所有主機執行請求。
- **allowlist**：僅允許在允許清單中的命令。
- **full**：允許所有操作（等同於提升權限）。

### 詢問 (`exec.ask`)

- **off**：從不提示。
- **on-miss**：僅在允許清單未匹配時提示。
- **always**：在每個命令上都提示。
- 當有效的詢問模式為 `always` 時，`allow-always` 持久信任不會抑制提示

### 詢問回退 (`askFallback`)

如果需要提示但無法存取 UI，則由回退決定：

- **deny**：阻止。
- **allowlist**：僅在允許清單匹配時允許。
- **full**：允許。

### 內嵌直譯器 eval 加固 (`tools.exec.strictInlineEval`)

當 `tools.exec.strictInlineEval=true` 時，OpenClaw 會將內嵌程式碼評估表單視為僅需核准，即使直譯器二進位檔本身已在允許清單中。

範例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

這是針對無法乾淨映射到單一穩定檔案操作數的直譯器載入器之深度防禦。在嚴格模式下：

- 這些命令仍需要明確核准；
- `allow-always` 不會自動為它們持久化新的允許清單條目。

## 允許清單（每個代理程式）

允許清單是**每個代理程式** 的。如果存在多個代理程式，請在 macOS 應用程式中切換您正在編輯的代理程式。模式是**不區分大小寫的 glob 匹配**。
模式應解析為**二進位路徑**（僅含基本名稱的條目會被忽略）。
舊版 `agents.default` 條目會在載入時遷移至 `agents.main`。
諸如 `echo ok && pwd` 之類的 Shell 鏈仍需每個頂層片段都符合允許清單規則。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單項目追蹤：

- **id** 用於 UI 識別的穩定 UUID（可選）
- **上次使用** 時間戳記
- **上次使用的指令**
- **上次解析的路徑**

## 自動允許技能 CLI

啟用 **自動允許技能 CLI** 時，已知技能參照的可執行檔會被視為已在節點（macOS 節點或無頭節點主機）上的允許清單中。這會使用 `skills.bins` 透過 Gateway RPC 來擷取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要的信任備註：

- 這是一個 **隱含的便利允許清單**，與手動路徑允許清單項目分開。
- 此功能適用於 Gateway 和節點位於相同信任邊界內的信任操作員環境。
- 如果您需要嚴格的明確信任，請將 `autoAllowSkills: false` 保持關閉，並僅使用手動路徑允許清單項目。

## 安全的 bins（僅 stdin）

`tools.exec.safeBins` 定義了一小部分 **僅 stdin** 的二進位檔（例如 `cut`），
它們可以在允許清單模式 **下無需** 明確的允許清單條目即可執行。安全二進位檔會拒絕
位置檔案參數和類似路徑的 token，因此它們只能對傳入串流進行操作。
請將此視為串流篩選器的狹窄快速路徑，而非一般的信任清單。
請**勿**將直譯器或執行時期二進位檔（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。
如果指令可以評估程式碼、執行子指令或依設計讀取檔案，請偏好使用明確的允許清單條目並保持審核提示已啟用。
自訂安全二進位檔必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
驗證僅根據 argv 形狀決定（不檢查主機檔案系統是否存在），這
可防止因允許/拒絕差異而產生的檔案存在預測行為。
預設安全二進位檔會拒絕檔案導向選項（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二進位檔也會對破壞僅 stdin 行為的選項執行明確的各別二進位檔旗標策略（例如 `sort -o/--output/--compress-program` 和 grep 遞迴旗標）。
長選項在安全二進位檔模式下會以「預設封閉（fail-closed）」方式進行驗證：未知旗標和歧義縮寫會被拒絕。
根據安全二進位檔設定檔拒絕的旗標：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins also force argv tokens to be treated as **literal text** at execution time (no globbing
and no `$VARS` expansion) for stdin-only segments, so patterns like `*` or `$HOME/...` cannot be
used to smuggle file reads.
Safe bins must also resolve from trusted binary directories (system defaults plus optional
`tools.exec.safeBinTrustedDirs`). `PATH` entries are never auto-trusted.
Default trusted safe-bin directories are intentionally minimal: `/bin`, `/usr/bin`.
If your safe-bin executable lives in package-manager/user paths (for example
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), add them explicitly
to `tools.exec.safeBinTrustedDirs`.
Shell chaining and redirections are not auto-allowed in allowlist mode.

當每個頂層片段都滿足允許清單時（包括安全 bins 或技能自動允許），允許 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重定向仍然不受支援。在允許清單解析期間，會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面 `$()` 文字，請使用單引號。在 macOS 伴隨應用程式核准中，包含 Shell 控制或擴充語法的原始 Shell 文字（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）將被視為不符合允許清單，除非 Shell 二進位檔本身已被加入允許清單。對於 Shell 包裝程式（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會縮減為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。對於允許清單模式下的「一律允許」決策，已知的分派包裝程式（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會儲存內部可執行檔路徑而非包裝程式路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會儲存內部可執行檔而非多工器二進位檔。如果包裝程式或多工器無法安全解包，將不會自動儲存任何允許清單項目。如果您將直譯器（如 `python3` 或 `node`）加入允許清單，建議優先使用 `tools.exec.strictInlineEval=true`，這樣內嵌評估仍需明確核准。在嚴格模式下，`allow-always` 仍可儲存良性的直譯器/腳本叫用，但不會自動儲存內嵌評估載體。

預設安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用，請為它們的非 stdin 工作流程保留明確的允許清單條目。
對於安全 bin 模式下的 `grep`，請提供帶有 `-e`/`--regexp` 的模式；位置參數形式會被拒絕，以防止檔案操作數被作為模糊的位置參數走私進去。

### 安全 bins 與允許清單的比較

| 主題     | `tools.exec.safeBins`               | 允許清單 (`exec-approvals.json`)            |
| -------- | ----------------------------------- | ------------------------------------------- |
| 目標     | 自動允許狹窄的 stdin 過濾器         | 明確信任特定的可執行檔                      |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策   | 已解析的可執行檔路徑 glob 模式              |
| 引數範圍 | 受安全 bin 設定檔和字面符號規則限制 | 僅路徑比對；引數由您自行負責                |
| 典型範例 | `head`, `tail`, `tr`, `wc`          | `jq`, `python3`, `node`, `ffmpeg`, 自訂 CLI |
| 最佳用途 | 管線中的低風險文字轉換              | 任何具有更廣泛行為或副作用的工具            |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或每個代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或每個代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或每個代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔金鑰會覆寫全域金鑰。
- 允許清單條目位於 `agents.<id>.allowlist` 下的主機本機 `~/.openclaw/exec-approvals.json` 中 (或透過 Control UI / `openclaw approvals allowlist ...`)。
- `openclaw security audit` 會在 `safeBins` 中出現直譯器/執行時期 bins 但沒有明確的設定檔時，以 `tools.exec.safe_bins_interpreter_unprofiled` 發出警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 項目以 `{}` 的形式鷹架（之後請審查並收緊）。直譯器/執行時期 bins 不會自動產生鷹架。

自訂設定檔範例：

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

如果您明確選擇將 `jq` 加入 `safeBins`，OpenClaw 仍會在安全 bin 模式下拒絕 `env` 內建指令，因此 `jq -n env` 無法在沒有明確的允許清單路徑或批准提示的情況下傾印主機處理序環境。

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、每個 Agent 的覆寫值以及允許清單。選擇一個範圍（預設值或某個 Agent）、調整原則、新增/移除允許清單模式，然後按一下 **Save**。UI 會顯示每個模式的 **last used** 中繼資料，方便您整理清單。

目標選擇器會選擇 **Gateway** (本機批准) 或 **Node**。節點必須宣佈支援 `system.execApprovals.get/set` (macOS app 或無頭節點主機)。如果節點尚未宣佈支援執行批准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯 (請參閱 [Approvals CLI](/zh-Hant/cli/approvals))。

## 批准流程

當需要提示時，閘道會向操作員客戶端廣播 `exec.approval.requested`。Control UI 和 macOS app 會透過 `exec.approval.resolve` 解析它，然後閘道會將批准的請求轉發至節點主機。

對於 `host=node`，批准請求包含標準的 `systemRunPlan` payload。當轉發已批准的 `system.run` 請求時，閘道會使用該計畫作為授權的 command/cwd/session 上下文。

這對於非同步批准延遲很重要：

- 節點執行路徑會預先準備一個標準計畫
- 批准記錄會儲存該計畫及其繫結中繼資料
- 一旦批准，最終轉發的 `system.run` 呼叫會重複使用儲存的計畫，
  而不是信任後續呼叫者的編輯
- 如果呼叫者在建立審核請求後變更了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，閘道會將轉送的執行拒絕為審核不符

## 直譯器/執行階段命令

具備審核支援的直譯器/執行階段執行採取刻意保守的策略：

- 精確的 argv/cwd/env 內容始終綁定。
- 直接的 shell 腳本和直接執行階段檔案形式會盡力綁定至一個具體的本機檔案快照。
- 仍可解析為單一直接本機檔案的常見套件管理器包裝形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前解除包裝。
- 如果 OpenClaw 無法為直譯器/執行階段命令識別出確切的一個具體本機檔案（例如套件腳本、eval 形式、執行階段特定的載入器鏈結或模糊的多檔案形式），將拒絕具備審核支援的執行，而非聲稱其不具備的語意涵蓋範圍。
- 對於這些工作流程，建議優先使用沙箱、獨立的主機邊界，或是明確的可信許可清單/完整工作流程，讓操作者接受更廣泛的執行階段語意。

當需要審核時，exec 工具會立即傳回一個審核 ID。使用該 ID 關聯後續的系統事件（`Exec finished` / `Exec denied`）。如果在逾時前未收到決定，該請求將被視為審核逾時，並顯示為拒絕原因。

### 後續傳遞行為

在經過核准的非同步 exec 完成後，OpenClaw 會將後續 `agent` 輪次傳送至同一個工作階段。

- 如果存在有效的外部傳遞目標（可傳遞頻道加上目標 `to`），後續傳遞會使用該頻道。
- 在僅限網頁聊天或內部工作階段且沒有外部目標的流程中，後續傳遞僅限於工作階段內（`deliver: false`）。
- 如果呼叫者明確要求嚴格的外部傳遞但沒有可解析的外部頻道，請求將會失敗並回傳 `INVALID_REQUEST`。
- 如果啟用了 `bestEffortDeliver` 且無法解析外部頻道，則傳送會降級為僅限會話 (session-only)，而不是失敗。

確認對話方塊包含：

- 指令 + 引數 (command + args)
- 工作目錄 (cwd)
- 代理程式 ID (agent id)
- 解析的可執行檔路徑
- 主機 + 策略元數據

動作：

- **允許一次** → 現在執行
- **總是允許** → 新增至允許清單並執行
- **拒絕** → 封鎖

## 將審核轉發至聊天頻道

您可以將執行審核提示轉發至任何聊天頻道 (包括外掛程式頻道)，並使用 `/approve` 進行審核。這使用正常的輸出傳送管道。

組態：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

在聊天中回覆：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

`/approve` 指令同時處理執行審核和外掛程式審核。如果 ID 不符合待處理的執行審核，它會自動檢查外掛程式審核。

### 外掛程式審核轉發

外掛程式審核轉發使用與執行審核相同的傳送管道，但在 `approvals.plugin` 下有其獨立的組態。啟用或停用其中一個不會影響另一個。

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

組態形狀與 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的運作方式相同。

支援共用互動式回覆的頻道會為執行和外掛程式審核呈現相同的審核按鈕。不支援共用互動式 UI 的頻道會回退為純文字，並附上 `/approve`
說明。

### 在任何頻道進行同聊天視窗審核

當執行或外掛程式審核請求是來自可傳送的聊天介面時，預設情況下，同一個聊天現在可以使用 `/approve` 進行審核。這適用於 Slack、Matrix 和 Microsoft Teams 等頻道，以及現有的 Web UI 和終端機 UI 流程。

這個共用的文字指令路徑使用該對話的正常頻道驗證模型。如果來源聊天已經可以傳送指令並接收回覆，則審核請求不再需要單獨的原生傳送配接器來保持待處理狀態。

Discord 和 Telegram 也支援同聊天室 `/approve`，但即使停用原生審核傳遞，這些頻道仍會使用其解析的審核者列表進行授權。

對於 Telegram 和其他直接呼叫 Gateway 的原生審核客戶端，此後援機制特意限制在「找不到審核」的失敗情況下。真正的 exec 審核拒絕或錯誤不會無聲重試為外掛程式審核。

### 原生審核傳遞

某些頻道也可以作為原生審核客戶端。原生客戶端在共享的同聊天室 `/approve` 流程之上，新增了審核者 DM、原始聊天室分發以及特定頻道的互動式審核 UX。

當可使用原生審核卡片/按鈕時，該原生 UI 是主要的代理程式面向路徑。除非工具結果顯示聊天室審核不可用，或是手動審核是唯一剩餘的路徑，否則代理程式不應重複回顯一般的聊天室 `/approve` 指令。

通用模型：

- host exec policy 仍決定是否需要 exec 審核
- `approvals.exec` 控制是否將審核提示轉發到其他聊天目的地
- `channels.<channel>.execApprovals` 控制該頻道是否作為原生審核客戶端

當以下所有條件皆符合時，原生審核客戶端會自動啟用「DM 優先」傳遞：

- 該頻道支援原生審核傳遞
- 可以從明確的 `execApprovals.approvers` 或該頻道記載的後援來源解析審核者
- `channels.<channel>.execApprovals.enabled` 未設定或為 `"auto"`

設定 `enabled: false` 以明確停用原生審核客戶端。設定 `enabled: true` 以在解析出審核者時強制啟用。公開的原始聊天室傳遞則透過 `channels.<channel>.execApprovals.target` 保持明確。

常見問題：[為什麼針對聊天室審核有兩個 exec 審核設定？](/zh-Hant/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

這些原生審核客戶端在共享的同聊天室 `/approve` 流程和共享審核按鈕之上，新增了 DM 路由和可選的頻道分發。

共享行為：

- Slack、Matrix、Microsoft Teams 和類似的可傳遞聊天使用正常的頻道授權模型
  針對同一聊天中的 `/approve`
- 當原生審批客戶端自動啟用時，預設的原生傳遞目標是審批者的 DM
- 對於 Discord 和 Telegram，只有已解析的審批者可以批准或拒絕
- Discord 審批者可以是明確指定的 (`execApprovals.approvers`) 或從 `commands.ownerAllowFrom` 推斷
- Telegram 審批者可以是明確指定的 (`execApprovals.approvers`) 或從現有的擁有者設定推斷 (`allowFrom`，加上直接訊息 `defaultTo`，在支援的情況下)
- Slack 審批者可以是明確指定的 (`execApprovals.approvers`) 或從 `commands.ownerAllowFrom` 推斷
- Slack 原生按鈕保留審批 ID 類型，因此 `plugin:` ID 可以解析外掛程式審批
  而不需要第二層 Slack 本機後援層
- Matrix 原生 DM/頻道路由和反應捷徑處理執行和外掛程式審批；
  外掛程式授權仍來自 `channels.matrix.dm.allowFrom`
- 請求者不需要是審批者
- 當該聊天已經支援指令和回覆時，原始聊天可以直接使用 `/approve` 進行批准
- 原生 Discord 審批按鈕按審批 ID 類型路由：`plugin:` ID 直接
  前往外掛程式審批，其他所有內容都前往執行審批
- 原生 Telegram 審批按鈕遵循與 `/approve` 相同的有界執行到外掛程式後援
- 當原生 `target` 啟用原始聊天傳遞時，審批提示包含指令文字
- 待處理的執行審批預設在 30 分鐘後過期
- 如果沒有操作員 UI 或設定的審批客戶端可以接受請求，提示將後援到 `askFallback`

Telegram 預設為審批者 DM (`target: "dm"`)。當您
希望審批提示也出現在原始 Telegram 聊天/主題中時，您可以切換到 `channel` 或 `both`。對於 Telegram 論壇
主題，OpenClaw 會為審批提示和批准後的後續追蹤保留主題。

請參閱：

- [Discord](/zh-Hant/channels/discord)
- [Telegram](/zh-Hant/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全性備註：

- Unix socket 模式 `0600`，token 儲存於 `exec-approvals.json`。
- Same-UID 對等檢查。
- 挑戰/回應 (nonce + HMAC token + 請求 hash) + 短 TTL。

## 系統事件

Exec 生命週期以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些訊息會在節點回報事件後發布至代理程式的 session。
Gateway 託管的 exec 核准會在指令完成時（以及可選的執行時間超過閾值時）發出相同的生命週期事件。
需經核准的 exec 會重複使用核准 ID 作為這些訊息中的 `runId`，以便於關聯。

## 拒絕核准的行為

當非同步 exec 核准被拒絕時，OpenClaw 會防止代理程式重複使用 session 中先前執行相同指令的任何輸出。拒絕原因會隨附明確指引，說明沒有可用的指令輸出，這能阻止代理程式聲稱有新輸出，或使用先前成功執行的過時結果重複執行被拒絕的指令。

## 影響

- **full** 功能強大；盡可能優先使用允許清單。
- **ask** 讓您保持知情，同時仍允許快速核准。
- 各代理程式的允許清單可防止一個代理程式的核准洩漏給其他代理程式。
- 核准僅適用於來自**授權發送者**的主機 exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員在 session 層級的便利功能，設計上會跳過核准。
  若要強制封鎖主機 exec，請將核准安全性設定為 `deny` 或透過工具原則拒絕 `exec` 工具。

相關：

- [Exec 工具](/zh-Hant/tools/exec)
- [提權模式](/zh-Hant/tools/elevated)
- [技能](/zh-Hant/tools/skills)

## 相關

- [Exec](/zh-Hant/tools/exec) — shell 指令執行工具
- [沙箱機制](/zh-Hant/gateway/sandboxing) — 沙箱模式與工作區存取
- [安全性](/zh-Hant/gateway/security) — 安全模型與加固
- [沙盒與工具策略與提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated) — 何時使用各項
