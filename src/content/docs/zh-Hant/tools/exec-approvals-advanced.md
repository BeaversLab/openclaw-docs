---
summary: "進階執行核准：安全二進位檔、直譯器綁定、核准轉寄、原生交付"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "執行核准 — 進階"
---

進階執行核准主題：`safeBins` 快速路徑、直譯器/執行階段綁定，以及將核准轉發到聊天頻道（包括原生傳遞）。關於核心原則和核准流程，請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

## 安全二進位檔（僅限 stdin）

`tools.exec.safeBins` 定義了一份僅含少量 **僅限 stdin** 二進位檔（例如 `cut`）的清單，這些檔案可以在無需明確允許清單項目的情況下於允許清單模式中執行。安全二進位檔會拒絕位置檔案引數和類似路徑的記號，因此它們只能對輸入串流進行操作。請將其視為串流篩選器的狹隘快速路徑，而非一般的信任清單。

<Warning>
請**勿**將直譯器或執行時期二進位檔（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）新增至 `safeBins`。如果指令可以評估程式碼、
執行子指令或依照設計讀取檔案，建議使用明確的允許清單項目並保持啟用核准提示。自訂安全二進位檔必須在 `tools.exec.safeBinProfiles.<bin>` 中定義明確的設定檔。
</Warning>

預設安全二進位檔：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在預設清單中。如果您選擇加入，請為其非 stdin 工作流程保留明確的允許清單項目。針對安全二進位檔模式下的 `grep`，請使用 `-e`/`--regexp` 提供模式；由於會拒絕位置參數形式，因此無法將檔案操作數偽裝為不明確的位置參數。

### Argv 驗證與拒絕的旗標

驗證僅根據 argv 的形式進行（不檢查主機檔案系統是否存在），這可以防止因允許/拒絕差異而導致的檔案存在預測行為。針對預設的安全二進位檔會拒絕檔案導向的選項；長選項的驗證採取失效安全原則（未知標誌和模糊的縮寫都會被拒絕）。

各安全二進位檔設定檔的被拒絕標誌：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`： `--dereference-recursive`、 `--directories`、 `--exclude-from`、 `--file`、 `--recursive`、 `-R`、 `-d`、 `-f`、 `-r`
- `jq`： `--argfile`、 `--from-file`、 `--library-path`、 `--rawfile`、 `--slurpfile`、 `-L`、 `-f`
- `sort`： `--compress-program`、 `--files0-from`、 `--output`、 `--random-source`、 `--temporary-directory`、 `-T`、 `-o`
- `wc`： `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

對於僅限 stdin 的區段，Safe bins 還會強制在執行時將 argv 權杖視為 **字面文字**（無 glob 且無 `$VARS` 擴展），因此像 `*` 或 `$HOME/...` 這類模式無法被用來走私檔案讀取。

### 受信任的二進位檔目錄

Safe bins 必須從受信任的二進位目錄（系統預設值加上可選的 `tools.exec.safeBinTrustedDirs`）解析。`PATH` 項目絕不會自動受信任。預設受信任目錄是有意設得極少的： `/bin`、 `/usr/bin`。如果您的 safe-bin 可執行檔位於套件管理器/使用者路徑（例如 `/opt/homebrew/bin`、 `/usr/local/bin`、 `/opt/local/bin`、 `/snap/bin`），請將其明確新增至 `tools.exec.safeBinTrustedDirs`。

### Shell 鏈結、包裝程式與多工器

當每個頂層區段都滿足允許清單（包括安全 bins 或 skill auto-allow）時，允許使用 Shell 連鎖（`&&`、`||`、`;`）。在允許清單模式下不支援重導向。在允許清單解析期間會拒絕指令替換（`$()` / 反引號），包括在雙引號內；如果您需要字面上的 `$()` 文字，請使用單引號。

在 macOS 伴隨應用程式審核中，除非 Shell 二進位檔案本身位於允許清單中，否則包含 Shell 控制或擴充語法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文字將被視為不符合允許清單。

對於 Shell 包裝器（`bash|sh|zsh ... -c/-lc`），請求範圍的環境變數覆寫會減少為一個小的明確允許清單（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

對於允許清單模式下的 `allow-always` 決策，已知的分派包裝器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）會保留內部可執行檔路徑，而不是包裝器路徑。Shell 多工器（`busybox`、`toybox`）會以相同方式針對 Shell 小程式（`sh`、`ash` 等）進行解包。如果無法安全地解包包裝器或多工器，將不會自動保留任何允許清單項目。

如果您將 `python3` 或 `node` 等直譯器加入允許清單，建議
優先使用 `tools.exec.strictInlineEval=true`，這樣內聯求值仍需要明確的
批准。在嚴格模式下，`allow-always` 仍可保留良性
的直譯器/腳本調用，但不會自動保留內聯求值的載體。

### 安全二進制檔案與允許清單

| 主題     | `tools.exec.safeBins`                      | 允許清單 (`exec-approvals.json`)                                   |
| -------- | ------------------------------------------ | ------------------------------------------------------------------ |
| 目標     | 自動允許狹窄的 stdin 過濾器                | 明確信任特定可執行檔                                               |
| 匹配類型 | 可執行檔名稱 + 安全二進制檔案 argv 策略    | 已解析的可執行檔路徑 glob，或透過 PATH 呼叫之命令的純命令名稱 glob |
| 參數範圍 | 受安全二進制檔案設定檔和字面值令牌規則限制 | 預設為路徑比對；可選的 `argPattern` 可限制已解析的 argv            |
| 典型範例 | `head`、`tail`、`tr`、`wc`                 | `jq`、`python3`、`node`、`ffmpeg`、自訂 CLI                        |
| 最佳用途 | 管道中的低風險文字轉換                     | 任何具有更廣泛行為或副作用 的工具                                  |

設定位置：

- `safeBins` 來自配置 (`tools.exec.safeBins` 或每個代理程式 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 來自配置 (`tools.exec.safeBinTrustedDirs` 或每個代理程式 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 來自配置 (`tools.exec.safeBinProfiles` 或每個代理程式 `agents.list[].tools.exec.safeBinProfiles`)。每個代理程式的設定檔鍵會覆寫全域鍵。
- 允許清單條目位於主機本地的 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` 中 (或透過 Control UI / `openclaw approvals allowlist ...`)。
- 當直譯器/執行時期二進位檔出現在 `safeBins` 中但沒有明確的設定檔時，`openclaw security audit` 會發出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以將遺失的自訂 `safeBinProfiles.<bin>` 條目建構為 `{}` (事後請審閱並收緊)。直譯器/執行時期二進位檔不會自動建構。

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

如果您明確選擇將 `jq` 加入 `safeBins`，OpenClaw 在安全二進位檔
模式下仍會拒絕 `env` 內建指令，因此 `jq -n env` 無法在沒有明確的允許清單路徑
或批准提示的情況下傾印主機處理程序環境。

## 直譯器/執行時期指令

經批准的直譯器/執行時期執行作業刻意採取保守策略：

- 精確的 argv/cwd/env 環境始終會受到綁定。
- 直接 shell 腳本和直接執行時期檔案格式會盡力綁定至一個具體的本機檔案快照。
- 仍解析為單一直接本地檔案的常見套件管理器包裝器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）會在綁定前被解包。
- 如果 OpenClaw 無法為直譯器/執行時期指令識別出確切的一個具體本機檔案（例如套件腳本、eval 格式、特定執行時期的載入器鏈結，或歧義的多檔案格式），將會拒絕經批准的執行，而非聲稱其不具備的語意涵蓋範圍。
- 對於這些工作流程，建議優先採用沙盒、獨立的主機邊界，或是操作員接受更廣泛執行時期語意的明確信任允許清單/完整工作流程。

當需要審批時，exec 工具會立即傳回一個審批 ID。使用該 ID 來關聯後續已批准執行的系統事件（`Exec finished`，以及已配置時的 `Exec running`）。
如果在逾時前仍未收到決定，該請求將被視為審批逾時，
並顯示為終止拒絕，而非喚醒代理程式的系統事件。

### 後續傳遞行為

在已批准的非同步 exec 完成後，OpenClaw 會向同一個工作階段發送後續 `agent` 回合。

- 如果存在有效的外部傳遞目標（可傳遞頻道加上目標 `to`），後續傳遞將使用該頻道。
- 在僅限網頁聊天或內部工作階段且沒有外部目標的流程中，後續傳遞將僅限於工作階段內部（`deliver: false`）。
- 如果呼叫者明確要求嚴格的外部傳遞但沒有可解析的外部頻道，請求將會失敗並傳回 `INVALID_REQUEST`。
- 如果啟用了 `bestEffortDeliver` 且無法解析外部頻道，傳遞將降級為僅限工作階段內部，而不是失敗。

## 將審核轉發至聊天頻道

您可以將 exec 審批提示轉發到任何聊天頻道（包括外掛頻道）並使用 `/approve` 進行審批。
這使用正常的輸出傳遞管道。

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

`/approve` 指令同時處理 exec 審批和外掛審批。如果 ID 不符合待處理的 exec 審批，它會自動改為檢查外掛審批。

### 外掛審核轉發

外掛程式核准轉發使用與執行核准相同的傳遞管線，但在 `approvals.plugin` 下有其獨立的設定。啟用或停用其中一個不會影響另一個。關於外掛程式撰寫行為、請求欄位和決策語意，請參閱 [Plugin permission requests](/zh-Hant/plugins/plugin-permission-requests)。

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

設定形狀與 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的運作方式相同。

支援共享互動回覆的頻道會為 exec 和
plugin 審核呈現相同的審核按鈕。不支援共享互動 UI 的頻道會退回到純文字 `/approve`
指令。
Plugin 審核請求可能會限制可用的決策選項。審核介面會使用請求中
宣告的決策集，且 Gateway 會拒絕提交未提供之決策的嘗試。

### 在任何頻道上進行同聊天審核

當 exec 或 plugin 審核請求是源自可傳遞的聊天介面時，預設情況下，
同一個聊天現在可以透過 `/approve` 進行審核。這適用於 Slack、Matrix 和
Microsoft Teams 等頻道，以及現有的 Web UI 和終端機 UI 流程。

這個共用的文字指令路徑使用該對話的正常頻道驗證模型。如果來源聊天已經可以發送指令並接收回覆，審核請求不再需要單獨的原生傳遞配接器來保持待處理狀態。

Discord 和 Telegram 也支援同頻道 `/approve`，但即使停用了原生審核傳遞，
這些頻道仍會使用其解析出的審核者清單進行授權。

對於 Telegram 和其他直接呼叫 Gateway 的原生審核客戶端，此後備機制有意限制在「找不到審核」失敗的情況下。真正的執行審核拒絕/錯誤不會以外掛程式審核的方式靜默重試。

### 原生審核傳送

某些頻道也可以充當原生審核用戶端。原生用戶端在共享的同頻道 `/approve`
流程之上，新增了審核者 DM、原始聊天散佈 以及頻道特定的互動審核 UX。

當原生審核卡片/按鈕可用時，該原生 UI 是
Agent 面向的主要路徑。Agent 不應重複顯示額外的純聊天
`/approve` 指令，除非工具結果指出聊天審核不可用或
手動審核是僅存的路徑。

如果設定了原生審核用戶端，但對於來源頻道沒有啟用原生執行時，
OpenClaw 會保持本地確定性 `/approve`
提示可見。如果原生執行時啟用並嘗試傳遞但沒有
目標收到卡片，OpenClaw 會發送同頻道後援通知，並附上
確切的 `/approve <id> <decision>` 指令，以便該請求仍能被解決。

通用模型：

- 主機執行政策仍然決定是否需要執行核准
- `approvals.exec` 控制將審核提示轉發到其他聊天目的地
- `channels.<channel>.execApprovals` 控制是否啟用 Discord、Slack、Telegram 和類似的特定頻道原生用戶端
- 當請求來自 Slack 且 Slack 外掛程式審批者解決時，Slack 外掛程式審批可以使用 Slack 的原生審批客戶端；`approvals.plugin` 也可以將外掛程式審批路由到 Slack 工作階段或目標，即使停用 Slack 執行審批
- WhatsApp 和 Signal 反應核准傳遞受 `approvals.exec` 和 `approvals.plugin` 限制；它們沒有 `channels.<channel>.execApprovals` 區塊

當所有以下條件均符合時，原生審批客戶端會自動啟用「DM 優先」傳遞：

- 頻道支援原生審批傳遞
- 可以從明確的 `execApprovals.approvers` 或擁有者身分（例如 `commands.ownerAllowFrom`）解析核准者
- `channels.<channel>.execApprovals.enabled` 未設定或為 `"auto"`

設定 `enabled: false` 以明確停用原生核准用戶端。設定 `enabled: true` 以在解析出核准者時強制啟用它。公開原始聊天傳遞透過 `channels.<channel>.execApprovals.target` 保持明確狀態。

常見問題：[Why are there two exec approval configs for chat approvals?](/zh-Hant/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`
- WhatsApp：使用 `approvals.exec` 和 `approvals.plugin` 將核准提示路由到 WhatsApp
- Signal：使用 `approvals.exec` 和 `approvals.plugin` 將核准提示路由到 Signal

這些原生核准用戶端在共享的同聊天 `/approve` 流程和共享核准按鈕之上，新增了 DM 路由和可選的頻道擴散。

共享行為：

- Slack、Matrix、Microsoft Teams 和類似的可傳遞聊天使用正常的頻道授權模型進行同聊天 `/approve`
- 當原生審批用戶端自動啟用時，預設的原生傳遞目標是審批者的私訊
- 對於 Discord 和 Telegram，只有解析出的審批者可以批准或拒絕
- Discord 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從 `commands.ownerAllowFrom` 推斷得出的
- Telegram 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從 `commands.ownerAllowFrom` 推斷得出的
- Slack 審批者可以是明確指定的 (`execApprovals.approvers`) 或是從 `commands.ownerAllowFrom` 推斷得出的
- Slack 外掛程式審批私訊使用來自 `allowFrom` 的 Slack 外掛程式審批者和帳戶預設
  路由，而非 Slack 執行 審批者
- Slack 原生按鈕會保留審批 ID 類型，因此 `plugin:` ID 可以解析外掛程式審批
  而不需要第二層 Slack 本地後援機制
- WhatsApp 表情符號審批僅在當匹配的頂層
  轉發系列已啟用並路由至 WhatsApp 時，才會處理執行 和外掛程式 提示；僅目標 WhatsApp 的轉發保持
  在共享轉發路徑上，除非它匹配相同的原生來源目標
- Signal 反應審批僅在當匹配的頂層
  轉發系列已啟用並路由至 Signal 時，才會處理執行 和外掛程式 提示。直接的同一聊天 Signal 執行 審批可以
  在沒有明確審批者的情況下抑制本地 `/approve` 後援；Signal 反應解析
  仍然需要來自 `channels.signal.allowFrom` 或 `defaultTo` 的明確 Signal 審批者。
- Matrix 原生私訊/頻道路由和反應捷徑處理執行 和外掛程式 審批；
  外掛程式授權仍然來自 `channels.matrix.dm.allowFrom`
- Matrix 原生提示在第一個提示
  事件中包含 `com.openclaw.approval` 自訂事件內容，以便支援 OpenClaw 的 Matrix 用戶端可以讀取結構化審批狀態，而標準
  用戶端則保留純文字 `/approve` 後援
- 請求者不需要是審批者
- 當該聊天已經支援指令和回覆時，來源聊天可以直接使用 `/approve` 進行審批
- 原生 Discord 核准按鈕依據核准 ID 種類路由：`plugin:` ID 直接前往外掛程式核准，其他則前往 exec 核准
- 原生 Telegram 核準按鈕遵循與 `/approve` 相同的受限 exec 至外掛程式後備邏輯
- 當原生 `target` 啟用來源聊天遞送時，核准提示會包含指令文字
- 待處理的 exec 核准預設在 30 分鐘後過期
- 如果沒有操作員 UI 或已設定的核准用戶端可以接受請求，提示會後備至 `askFallback`

敏感的僅限擁有者群組指令（例如 `/diagnostics` 和 `/export-trajectory`）會使用私有擁有者路由來發送核准提示和最終結果。OpenClaw 會先嘗試在擁有者執行指令的相同表面上使用私有路由。如果該表面沒有私有擁有者路由，它會後備至 `commands.ownerAllowFrom` 中第一個可用的擁有者路由，因此當 Telegram 是設定的主要私有介面時，Discord 群組指令仍可將核准和結果發送給擁有者的 Telegram DM。群組聊天只會收到一個簡短的確認通知。

Telegram 預設為核准者 DM (`target: "dm"`)。當您希望核准提示也出現在原始 Telegram 聊天/主題中時，您可以切換至 `channel` 或 `both`。對於 Telegram 論壇主題，OpenClaw 會為核准提示和核准後的後續追蹤保留該主題。

參閱：

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

- Unix socket 模式 `0600`，token 儲存在 `exec-approvals.json`。
- 相同 UID 對端檢查。
- 挑戰/回應 (nonce + HMAC token + 請求雜湊) + 短暫 TTL。

## 常見問題

### 何時會在核准目標上使用 `accountId` 和 `threadId`？

當通道設定了多個身分，且核准提示必須透過特定帳號發送時，請使用 `accountId`。當目標支援主題或討論串，且提示應留在該討論串內而非頂層聊天時，請使用 `threadId`。

一個具體的 Telegram 範例是擁有論壇主題和兩個 Telegram 機器人帳號的營運超級群組。`to` 值指定超級群組名稱，`accountId` 選擇機器人帳號，而 `threadId` 選擇論壇主題：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        {
          channel: "telegram",
          to: "-1001234567890",
          accountId: "ops-bot",
          threadId: "77",
        },
      ],
    },
  },
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "env:TELEGRAM_PRIMARY_BOT_TOKEN",
        },
        "ops-bot": {
          name: "Operations bot",
          botToken: "env:TELEGRAM_OPS_BOT_TOKEN",
        },
      },
    },
  },
}
```

在此設定下，轉發的 exec 核准會由 `ops-bot` Telegram 帳號發布至聊天 `-1001234567890` 的主題 `77` 中。沒有 `accountId` 的目標會使用通道的預設帳號，而沒有 `threadId` 的目標則會發布至頂層目的地。

### 當核准被發送到工作階段時，該工作階段中的任何人都可以核准嗎？

不。工作階段傳送僅控制提示顯示的位置。它本身並未授權該聊天中的每個參與者進行核准。

對於一般的同頻道 `/approve`，發送者必須已獲得該通道工作階段中指令的授權。如果通道公開了明確的核准核准者，這些核准者即使未獲得該工作階段中的其他指令授權，也可以授權 `/approve` 動作。

部分通道較為嚴格。Discord、Telegram、Matrix、Slack 原生核准私訊和類似的原生核准用戶端會使用其解析出的核准者清單進行核准授權。例如，Telegram 論壇主題核准提示可能對主題中的所有人可見，但只有從 `channels.telegram.execApprovals.approvers` 或 `commands.ownerAllowFrom` 解析出的數位 Telegram 使用者 ID 才能核准或拒絕它。

## 相關

- [Exec approvals](/zh-Hant/tools/exec-approvals) — 核心原則與核准流程
- [Exec tool](/zh-Hant/tools/exec)
- [Elevated mode](/zh-Hant/tools/elevated)
- [Skills](/zh-Hant/tools/skills) — 技能支援的自動允許行為
