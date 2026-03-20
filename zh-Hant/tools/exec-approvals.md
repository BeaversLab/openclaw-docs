---
summary: "執行批准、允許清單與沙箱逃逸提示"
read_when:
  - 配置執行批准或允許清單
  - 在 macOS 應用程式中實作執行批准 UX
  - 審查沙箱逃逸提示及其影響
title: "執行批准"
---

# 執行批准

執行批准是 **伴隨應用程式 / 節點主機防護機制**，用於允許沙箱化代理程式在真實主機 (`gateway` 或 `node`) 上執行指令。可以將其視為一種安全聯鎖：只有當策略 + 允許清單 + (可選) 使用者批准三者一致時，才允許執行指令。
執行批准是工具策略與提升層級閘門的 **額外** 機制 (除非提升層級設定為 `full`，這會跳過批准)。
有效策略是 `tools.exec.*` 與批准預設值中 **較嚴格** 的那一個；如果省略了批准欄位，則會使用 `tools.exec` 值。

如果伴隨應用程式 UI **不可用**，任何需要提示的請求將由 **詢問回退** (預設：拒絕) 解決。

## 適用範圍

執行批准是在執行主機上本地執行的：

- **閘道主機** → 閘道機器上的 `openclaw` 程序
- **節點主機** → 節點執行器 (macOS 伴隨應用程式或無頭節點主機)

信任模型備註：

- 經閘道驗證的呼叫者是該閘道的信任操作員。
- 配對的節點將此信任操作員能力擴展到節點主機上。
- 執行批准降低了意外執行的風險，但並非每個使用者的驗證邊界。
- 獲批准的節點主機執行會綁定標準執行內容：標準 cwd、確切的 argv、
  存在時的 env 綁定，以及適用時的固定可執行檔路徑。
- 對於 Shell 腳本和直接直譯器/執行階段檔案調用，OpenClaw 也會嘗試綁定
  一個具體的本地檔案操作數。如果綁定的檔案在批准之後、執行之前發生變更，
  則會拒絕執行，而不是執行偏離的內容。
- 此檔案綁定是有意為之的盡力而為，而非每個直譯器/執行階段載入器路徑的完整語意模型。
  如果批准模式無法識別恰好一個要綁定的具體本地檔案，它會拒絕建立批准支援的執行，
  而不是假設完全覆蓋。

macOS 分割：

- **node host service** 透過本機 IPC 將 `system.run` 轉發至 **macOS app**。
- **macOS app** 會執行核准並在 UI 語境中執行指令。

## Settings and storage

核准資料儲存在執行主機上的一個本機 JSON 檔案中：

`~/.openclaw/exec-approvals.json`

綱要範例：

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

## Policy knobs

### Security (`exec.security`)

- **deny**：阻擋所有主機執行請求。
- **allowlist**：僅允許已加入允許清單的指令。
- **full**：允許所有項目（等同於提升權限）。

### Ask (`exec.ask`)

- **off**：絕不提示。
- **on-miss**：僅在允許清單未符合時提示。
- **always**：在每個指令上提示。

### Ask fallback (`askFallback`)

如果需要提示但無法連線至 UI，則由 fallback 決定：

- **deny**：阻擋。
- **allowlist**：僅在符合允許清單時允許。
- **full**：允許。

## Allowlist (per agent)

允許清單是**針對每個代理程式 (per agent)** 的。如果有多個代理程式，請在 macOS app 中切換您正在編輯的代理程式。模式為**不區分大小寫的 glob 比對**。模式應解析為**二進位路徑**（僅包含 basename 的項目會被忽略）。舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單項目會追蹤：

- **id** 用於 UI 身份識別的穩定 UUID（選用）
- **last used** 時間戳記
- **last used command**
- **last resolved path**

## Auto-allow skill CLIs

當啟用 **Auto-allow skill CLIs** 時，已知技能參考的可執行檔會在節點（macOS 節點或無頭節點主機）上視為已加入允許清單。這會使用透過 Gateway RPC 的 `skills.bins` 來擷取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要信任說明：

- 這是一個**隱含的便利允許清單**，與手動路徑允許清單項目分開。
- 它適用於 Gateway 和節點位於相同信任邊界內的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 並僅使用手動路徑允許清單項目。

## Safe bins (stdin-only)

`tools.exec.safeBins` 定義了一小部分的 **stdin-only** 二進位檔案（例如 `jq`），它們可以在無需明確允許清單項目的情況下以允許清單模式執行。安全二進位檔案會拒絕位置檔案參數和類似路徑的標記，因此它們只能對輸入流進行操作。請將其視為串流過濾器的狹窄快速路徑，而非一般的信任清單。請**勿**將直譯器或執行期二進位檔案（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。如果某個指令在設計上可以評估程式碼、執行子指令或讀取檔案，請優先使用明確的允許清單項目並保持核准提示已啟用。自訂安全二進位檔案必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。驗證僅根據 argv 形狚進行決定性判斷（不檢查主機檔案系統是否存在），這可防止因允許/拒絕差異而產生的檔案存在預測行為。針對預設的安全二進位檔案，會拒絕檔案導向的選項（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。安全二進位檔案也會針對破壞 stdin-only 行為的選項（例如 `sort -o/--output/--compress-program` 和 grep 遞迴標記）執行明確的每個二進位檔案標記政策。在安全二進位檔案模式下，長選項的驗證採取「封閉式失敗」原則：未知標記和模糊縮寫會被拒絕。依安全二進位檔案設定檔拒絕的標記：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全可執行檔也會強制在執行時將 argv 標記視為**純文字**（無 globbing 且無 `$VARS` 擴充），針對僅限 stdin 的區段，因此像 `*` 或 `$HOME/...` 這類模式無法用於偷取檔案讀取。
安全可執行檔也必須從受信任的二進位目錄解析（系統預設值加上選用的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目永遠不會被自動信任。
預設受信任的安全可執行檔目錄刻意保持精簡：`/bin`、`/usr/bin`。
如果您有安全可執行檔位於套件管理器/使用者路徑中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。
在允許清單模式下，Shell 串接和重新導向不會被自動允許。

當每個頂層區段都滿足允許清單
（包括安全二進位檔或技能自動允許）時，允許 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重新導向仍然不受支援。
在解析允許清單期間會拒絕指令替換（`$()` / 反引號），包括在
雙引號內；如果您需要字面 `$()` 文字，請使用單引號。
在 macOS 伴隨應用程式核准中，包含 Shell 控制或擴充語法的原始 Shell 文字
（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）會被視為未通過允許清單，除非
Shell 二進位檔本身已在允許清單中。
對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會縮減為
一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
對於允許清單模式下的「始終允許」決策，已知的分派包裝器
（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會儲存內部可執行檔路徑，而不是包裝器
路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash`、
等）進行解包，因此會儲存內部可執行檔而不是多工器二進位檔。如果無法安全地解開包裝器
或多工器，則不會自動儲存任何允許清單項目。

預設的安全 bin：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用，請為其非 stdin 工作流程保留明確的允許清單條目。
對於安全 bin 模式下的 `grep`，請使用 `-e`/`--regexp` 提供模式；位置參數模式形式會被拒絕，以防止檔案操作數被作為不明確的位置參數偷偷輸入。

### 安全 bin 與允許清單

| 主題     | `tools.exec.safeBins`                  | 允許清單 (`exec-approvals.json`)      |
| -------- | -------------------------------------- | ------------------------------------- |
| 目標     | 自動允許狹窄的 stdin 過濾器            | 明確信任特定可執行檔                  |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策      | 已解析的可執行檔路徑 glob 模式        |
| 引數範圍 | 受安全 bin 設定檔和字面 token 規則限制 | 僅比對路徑；引數責任由您自行承擔      |
| 典型範例 | `jq`、`head`、`tail`、`wc`             | `python3`、`node`、`ffmpeg`、自訂 CLI |
| 最佳用途 | 管線中的低風險文字轉換                 | 任何具有更廣泛行為或副作用的工具      |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或每個代理程式的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或每個代理程式的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或每個代理程式的 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔金鑰會覆寫全域金鑰。
- 允許清單條目位於 `agents.<id>.allowlist` 下的主機本機 `~/.openclaw/exec-approvals.json` 中 (或透過控制 UI / `openclaw approvals allowlist ...`)。
- 當解釋器/執行時 bins 出現在 `safeBins` 中且沒有明確的 profiles 時，`openclaw security audit` 會發出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以將缺失的自訂 `safeBinProfiles.<bin>` 條目組合為 `{}`（之後請審查並收緊）。解釋器/執行時 bins 不會自動組合。

自訂 profile 範例：

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

## 控制 UI 編輯

使用 **Control UI → Nodes → Exec approvals** 卡片來編輯預設值、每個 Agent 的覆寫以及允許清單。選擇一個範圍（Defaults 或某個 Agent），調整策略，新增/移除允許清單模式，然後按 **Save**。UI 會顯示每個模式的 **last used** 中繼資料，讓您能保持清單整潔。

目標選擇器會選擇 **Gateway**（本機核准）或 **Node**。Nodes 必須宣佈 `system.execApprovals.get/set`（macOS app 或無頭 node host）。如果某個 node 尚未宣佈 exec approvals，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援 gateway 或 node 編輯（請參閱 [Approvals CLI](/zh-Hant/cli/approvals)）。

## 核准流程

當需要提示時，gateway 會向 operator 用戶端廣播 `exec.approval.requested`。Control UI 和 macOS app 會透過 `exec.approval.resolve` 解析它，然後 gateway 會將已核准的請求轉發至 node host。

對於 `host=node`，核准請求包含標準的 `systemRunPlan` payload。當轉發已核准的 `system.run` 請求時，gateway 會將該計畫作為權威的 command/cwd/session 上下文。

## 解釋器/執行時指令

具有核准支援的解釋器/執行時執行作業是刻意保守的：

- 精確的 argv/cwd/env 上下文始終受到綁定。
- 直接 shell script 和直接執行時檔案形式會盡最大努力綁定到一個具體的本機檔案快照。
- 仍然解析為一個直接本機檔案的常見 package-manager wrapper 形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定之前被展開。
- 如果 OpenClaw 無法為直譯器/執行階段命令確切識別單一具體的本機檔案（例如 package 腳本、eval 表單、特定執行階段的載入器鏈結，或不明確的多檔案表單），將拒絕依賴審核的執行，而不是宣稱其並不具備的語意涵蓋範圍。
- 對於那些工作流程，建議優先使用沙箱化、獨立的主機邊界，或是操作員接受更廣泛執行階段語意的明確信任允許清單/完整工作流程。

當需要審核時，exec 工具會立即傳回一個審核 ID。使用該 ID 來關聯後續的系統事件 (`Exec finished` / `Exec denied`)。如果在逾時前未收到決定，該請求將被視為審核逾時，並作為拒絕原因顯示。

確認對話方塊包括：

- command + args
- cwd
- agent id
- resolved executable path
- host + policy metadata

Actions：

- **Allow once** → run now
- **Always allow** → add to allowlist + run
- **Deny** → block

## 將審核轉發至聊天頻道

您可以將 exec 審核提示轉發至任何聊天頻道（包括外掛程式頻道），並使用 `/approve` 進行審核。這會使用正常的傳出傳遞管線。

Config：

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

Reply in chat：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### 內建聊天審核客戶端

Discord 和 Telegram 也可以透過特定頻道的設定作為明確的 exec 審核客戶端。

- Discord：`channels.discord.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

這些客戶端為選擇加入。如果某個頻道未啟用 exec 審核，OpenClaw 僅因為對話發生在該處，並不會將該頻道視為審核介面。

共享行為：

- 只有設定的審核者可以審核或拒絕
- 請求者不需要是審核者
- 啟用頻道傳遞時，審核提示會包含指令文字
- 如果沒有操作員 UI 或設定的審核客戶端可以接受請求，提示會回退至 `askFallback`

Telegram 預設為審核者私訊 (`target: "dm"`)。當您希望審核提示也顯示在原始 Telegram 聊天/主題中時，您可以切換到 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會為審核提示和審核後的後續跟進保留該主題。

請參閱：

- [Discord](/zh-Hant/channels/discord#exec-approvals-in-discord)
- [Telegram](/zh-Hant/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全性備註：

- Unix socket 模式 `0600`，token 儲存在 `exec-approvals.json` 中。
- 相同 UID 對等檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短 TTL。

## 系統事件

Exec 生命週期會以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些會在節點回報事件後發佈到 agent 的 session 中。Gateway-host exec 審核在指令完成時（以及可選擇性地在執行時間超過閾值時）會發出相同的生命週期事件。受審核閘門限制的 exec 會重複使用審核 ID 作為這些訊息中的 `runId` 以方便關聯。

## 影響

- **full** (完整) 很強大；盡可能優先使用允許清單。
- **ask** (詢問) 讓您保持掌握，同時仍允許快速審核。
- Per-agent 允許清單可防止一個 agent 的審核洩漏到其他 agent。
- 審核僅適用於來自 **authorized senders** (授權發送者) 的 host exec 請求。未授權的發送者無法發出 `/exec`。
- `/exec security=full` 是供授權操作員使用的 session 層級便利功能，設計上會略過審核。若要完全阻擋 host exec，請將審核安全性設定為 `deny` 或透過工具政策拒絕 `exec` 工具。

相關連結：

- [Exec tool](/zh-Hant/tools/exec)
- [Elevated mode](/zh-Hant/tools/elevated)
- [Skills](/zh-Hant/tools/skills)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
