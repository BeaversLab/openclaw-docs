---
summary: "Exec approvals, allowlists, and sandbox escape prompts"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# Exec 批准

Exec 批准是讓受沙箱限制的代理程式在真實主機（`gateway` 或 `node`）上執行指令時的**伴隨應用程式 / 節點主機防護機制**。您可以將其視為安全聯鎖：只有在政策 + 允許清單 +（可選）使用者批准都一致時，才允許執行指令。
Exec 批准是工具政策和提升權限管控**之外**的額外機制（除非將 elevated 設為 `full`，這會跳過批准）。
有效政策是 `tools.exec.*` 和批准預設值中**較嚴格**者；如果省略了批准欄位，則使用 `tools.exec` 值。

如果伴隨應用程式 UI **無法使用**，任何需要提示的要求都會由**詢問回退機制**（ask fallback，預設值：拒絕）來解決。

## 適用範圍

Exec 批准是在執行主機上本機強制執行的：

- **閘道主機** → 閘道機器上的 `openclaw` 程序
- **節點主機** → 節點執行器（macOS 伴隨應用程式或無頭節點主機）

信任模型注意事項：

- 經過閘道驗證的呼叫者是該閘道的受信任操作員。
- 配對的節點將該受信任操作員的功能擴展到節點主機上。
- Exec 批准可降低意外執行的風險，但並非每個使用者的驗證邊界。
- 獲批准的節點主機執行會綁定正規執行內容：正規 cwd、確切 argv、存在的 env
  綁定，以及適用時的固定可執行檔路徑。
- 對於 Shell 腳本和直接直譯器/執行期檔案叫用，OpenClaw 也會嘗試綁定
  一個具體的本機檔案運算元。如果綁定的檔案在批准後但在執行前發生變更，
  則該執行會被拒絕，而不是執行已變更的內容。
- 此檔案綁定是刻意盡力而為，並非每個直譯器/執行期載入器路徑的完整語意模型。
  如果批准模式無法識別確切的一個具體本機檔案進行綁定，它會拒絕建立以批准為依據的執行，
  而非假裝完全涵蓋。

macOS 分離：

- **節點主機服務**透過本機 IPC 將 `system.run` 轉發到 **macOS 應用程式**。
- **macOS app** 強制執行核准 + 在 UI 語境中執行命令。

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

## 政策控制選項

### 安全性 (`exec.security`)

- **deny**：封鎖所有主機執行請求。
- **allowlist**：僅允許已列入允許清單的命令。
- **full**：允許所有項目 (等同於提升權限)。

### 詢問 (`exec.ask`)

- **off**：從不提示。
- **on-miss**：僅在允許清單不符時提示。
- **always**：每個命令都提示。

### 詢問後備 (`askFallback`)

如果需要提示但無法連接 UI，則由後備決定：

- **deny**：封鎖。
- **allowlist**：僅在符合允許清單時允許。
- **full**：允許。

## 允許清單 (每個代理程式)

允許清單是**每個代理程式**專屬的。如果有多個代理程式存在，請在 macOS app 中切換您正在編輯的代理程式。模式為**不區分大小寫的 glob 符合**。模式應解析為**二進制路徑** (僅包含基本名稱的項目會被忽略)。舊版 `agents.default` 項目會在載入時遷移至 `agents.main`。

範例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每個允許清單項目會追蹤：

- **id** 用於 UI 身分識別的穩定 UUID (選用)
- **last used** 時間戳記
- **last used command**
- **last resolved path**

## 自動允許技能 CLI

當啟用 **Auto-allow skill CLIs** 時，已知技能參考的可執行檔會在節點 (macOS 節點或無頭節點主機) 上被視為已列入允許清單。這會透過 Gateway RPC 使用 `skills.bins` 來擷取技能 bin 清單。如果您需要嚴格的手動允許清單，請停用此功能。

重要的信任注意事項：

- 這是一個**隱含的便利允許清單**，與手動路徑允許清單項目分開。
- 此功能適用於 Gateway 和節點位於相同信任邊界內的受信任操作員環境。
- 如果您需要嚴格的明確信任，請保持 `autoAllowSkills: false` 停用，並僅使用手動路徑允許清單項目。

## 安全 bins (僅限 stdin)

`tools.exec.safeBins` 定義了一小部分的 **stdin-only** 二進位檔案（例如 `jq`），它們可以在允許清單模式下運作，而**無需**明確的允許清單條目。Safe bins 會拒絕位置檔案參數和類似路徑的標記，因此它們只能對輸入流進行操作。請將此視為串流過濾器的狹窄快速路徑，而非一般的信任清單。請**勿**將解釋器或執行時期二進位檔案（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。如果指令可以評估程式碼、執行子指令或依照設計讀取檔案，請優先使用明確的允許清單條目，並保持核准提示啟用。自訂 safe bins 必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。驗證僅根據 argv 形狚決定（不檢查主機檔案系統是否存在），這可防止因允許/拒絕差異而產生的檔案存在預言行為。預設 safe bins 會拒絕檔案導向的選項（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。Safe bins 也會針對破壞 stdin-only 行為的選項執行明確的個別二進位檔旗標策略（例如 `sort -o/--output/--compress-program` 和 grep 遞迴旗標）。長選項在 safe-bin 模式下以故障關閉（fail-closed）方式進行驗證：未知旗標和模糊縮寫會被拒絕。Safe-bin 設定檔拒絕的旗標：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`： `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins 也強制在執行時將 argv 標記視為**純文字**（針對 stdin-only 片段，不進行萬用字元展開和 `$VARS` 擴充），因此像 `*` 或 `$HOME/...` 這類模式無法用來偷偷讀取檔案。
Safe bins 也必須來自受信任的二進位目錄（系統預設值加上選用的 `tools.exec.safeBinTrustedDirs`）。`PATH` 項目絕不自動受信。
預設的受信任 safe-bin 目錄刻意保持極簡：`/bin`、`/usr/bin`。
如果你的 safe-bin 可執行檔位於套件管理器/使用者路徑中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），請將它們明確新增到 `tools.exec.safeBinTrustedDirs`。
Shell 鏈結和重新導向在 allowlist 模式下不會自動允許。

當每個頂層區段都符合允許清單（包括安全 bins 或技能自動允許）時，允許使用 Shell 鏈結（`&&`、`||`、`;`）。在允許清單模式下，重新導向仍然不受支援。在允許清單解析期間會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面 `$()` 文字，請使用單引號。
在 macOS 伴隨應用程式核准中，包含 Shell 控制或擴充語法的原始 Shell 文字（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 將被視為允許清單不符，除非 Shell 二進位檔本身在允許清單中。
對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的 env 覆寫會減少為一個小型明確的允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
對於允許清單模式下的「一律允許」決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保存內部可執行檔路徑，而非包裝器路徑。Shell 多工器（`busybox`、`toybox`）也會針對 Shell 小程式（`sh`、`ash` 等）進行解包，因此會保存內部可執行檔，而非多工器二進位檔。如果無法安全地解包包裝器或多工器，則不會自動保存任何允許清單項目。

預設安全 bin：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在預設清單中。如果您選擇啟用，請為其非 stdin 工作流程保留明確的允許清單條目。
對於安全 bin 模式下的 `grep`，請提供帶有 `-e`/`--regexp` 的模式；會拒絕位置參數形式，以防止檔案操作數被夾帶為模糊的位置參數。

### 安全 bin 與允許清單

| 主題     | `tools.exec.safeBins`                  | 允許清單 (`exec-approvals.json`)      |
| -------- | -------------------------------------- | ------------------------------------- |
| 目標     | 自動允許狹窄的 stdin 過濾器            | 明確信任特定可執行檔                  |
| 比對類型 | 可執行檔名稱 + 安全 bin argv 政策      | 解析後的可執行檔路徑 glob 模式        |
| 引數範圍 | 受安全 bin 設定檔和字面 token 規則限制 | 僅路徑比對；引數需由您自行負責        |
| 典型範例 | `jq`、`head`、`tail`、`wc`             | `python3`、`node`、`ffmpeg`、自訂 CLI |
| 最佳用途 | 管線中的低風險文字轉換                 | 具有更廣泛行為或副作用的任何工具      |

設定位置：

- `safeBins` 來自設定 (`tools.exec.safeBins` 或每代理程式 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自設定 (`tools.exec.safeBinTrustedDirs` 或每代理程式 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自設定 (`tools.exec.safeBinProfiles` 或每代理程式 `agents.list[].tools.exec.safeBinProfiles`)。每代理程式設定檔金鑰會覆寫全域金鑰。
- 允許清單條目位於主機本地的 `~/.openclaw/exec-approvals.json` 中的 `agents.<id>.allowlist` 之下 (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當解譯器/執行時期 bins 出現在 `safeBins` 中而沒有明確的 profile 時，`openclaw security audit` 會發出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以將缺少的自訂 `safeBinProfiles.<bin>` 項目組合成 `{}`（事後請審閱並收緊）。解譯器/執行時期 bins 不會自動組合。

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

使用 **控制 UI → 節點 → 執行核准** 卡片來編輯預設值、每個代理程式的覆寫和允許清單。選擇一個範圍（預設值或代理程式），調整原則，新增/移除允許清單模式，然後按一下 **儲存**。UI 會顯示每個模式的 **上次使用** 中繼資料，讓您可以保持清單整潔。

目標選擇器會選擇 **閘道**（本機核准）或 **節點**。節點必須廣告 `system.execApprovals.get/set`（macOS 應用程式或無頭節點主機）。如果節點尚未廣告執行核准，請直接編輯其本機 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支援閘道或節點編輯（請參閱 [核准 CLI](/zh-Hant/cli/approvals)）。

## 核准流程

當需要提示時，閘道會向操作員用戶端廣播 `exec.approval.requested`。控制 UI 和 macOS 應用程式會透過 `exec.approval.resolve` 解析它，然後閘道會將已核准的要求轉送至節點主機。

對於 `host=node`，核准要求包含一個標準 `systemRunPlan` 載荷。當轉送已核准的 `system.run` 要求時，閘道會使用該計畫作為授權指令/cwd/工作階段內容。

## 解譯器/執行時期指令

具有核准支援的解譯器/執行時期執行作業經過特意保守設計：

- 精確的 argv/cwd/env 內容一律會受到綁定。
- 直接 Shell 指令碼和直接執行時期檔案格式會盡力綁定至一個具體的本機檔案快照。
- 仍然解析為一個直接本機檔案的常見套件管理程式包裝函式格式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前先解包。
- 如果 OpenClaw 無法為直譯器/執行時命令識別出唯一具體的本地檔案（例如套件腳本、eval 形式、特定於執行時的載入器鏈，或不明確的多檔案形式），則會拒絕基於核准的執行，而不是聲稱其不具備的語義涵蓋範圍。
- 對於這些工作流程，建議優先使用沙箱、獨立的主機邊界，或明確的信任允許清單/完整工作流程，其中操作員接受更廣泛的執行時語義。

當需要核准時，exec 工具會立即傳回一個核准 ID。使用該 ID 來關聯後續的系統事件 (`Exec finished` / `Exec denied`)。如果在逾時前沒有收到決定，該請求將被視為核准逾時，並作為拒絕原因呈現。

確認對話方塊包括：

- 指令 + 引數
- 工作目錄
- 代理程式 ID
- 解析後的可執行檔路徑
- 主機 + 策略元資料

動作：

- **允許一次** → 立即執行
- **總是允許** → 加入允許清單 + 執行
- **拒絕** → 封鎖

## 將核准轉發至聊天頻道

您可以將 exec 核准提示轉發到任何聊天頻道（包括外掛程式頻道）並使用 `/approve` 進行核准。這使用正常的輸出傳遞管道。

設定：

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

### 內建聊天核准客戶端

Discord 和 Telegram 也可以透過特定頻道的設定作為明確的 exec 核准客戶端。

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

這些客戶端是選擇加入的。如果頻道未啟用 exec 核准，僅因為對話發生在該頻道，OpenClaw 不會將該頻道視為核准介面。

共用行為：

- 只有已設定的核准者可以核准或拒絕
- 請求者不需要是核准者
- 啟用頻道傳遞時，核准提示包含指令文字
- 如果沒有操作員 UI 或設定的核准客戶端可以接受請求，提示將回退至 `askFallback`

Telegram 預設為審核者私人訊息 (`target: "dm"`)。當您希望審核提示也出現在來源的 Telegram 聊天/主題中時，您可以切換到 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會保留審核提示和審核後後續追蹤的主題。

參閱：

- [Discord](/zh-Hant/channels/discord#exec-approvals-in-discord)
- [Telegram](/zh-Hant/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全說明：

- Unix socket 模式 `0600`，token 儲存於 `exec-approvals.json`。
- 相同 UID 對等端檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短 TTL。

## 系統事件

Exec 生命週期以系統訊息呈現：

- `Exec running` (僅當指令超過執行通知閾值時)
- `Exec finished`
- `Exec denied`

這些會在節點報告事件後發佈至代理的階段作業。當指令完成時 (以及可選擇性地在執行超過閾值時)，託管於 Gateway 的 exec 審核會發出相同的生命週期事件。受審核控管的 exec 會在這些訊息中重複使用審核 id 作為 `runId`，以便於關聯。

## 影響

- **full** 很強大；盡可能優先使用允許清單。
- **ask** 讓您掌握狀況，同時仍允許快速審核。
- 各代理的允許清單可防止某個代理的審核外洩到其他代理。
- 審核僅適用於來自**授權傳送者**的主機 exec 請求。未授權的傳送者無法發出 `/exec`。
- `/exec security=full` 是授權操作員的階段作業層級便利功能，設計上會略過審核。
  若要完全封鎖主機 exec，請將審核安全性設定為 `deny` 或透過工具原則拒絕 `exec` 工具。

相關：

- [Exec 工具](/zh-Hant/tools/exec)
- [提升模式](/zh-Hant/tools/elevated)
- [技能](/zh-Hant/tools/skills)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
