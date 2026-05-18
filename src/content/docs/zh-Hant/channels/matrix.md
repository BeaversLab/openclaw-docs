---
summary: "Matrix 支援狀態、設定和設定範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

Matrix 是一個可下載的 OpenClaw 頻道外掛。
它使用官方的 `matrix-js-sdk`，並支援 DM、聊天室、話題串、媒體、反應、投票、位置和 E2EE。

## 安裝

在設定頻道之前，請先從 ClawHub 安裝 Matrix：

```bash
openclaw plugins install @openclaw/matrix
```

裸外掛規格會先嘗試 ClawHub，然後是 npm 備援。若要強制使用註冊表來源，請使用 `openclaw plugins install clawhub:@openclaw/matrix` 或 `openclaw plugins install npm:@openclaw/matrix`。

從本機結帳：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 會註冊並啟用外掛，因此不需要單獨的 `openclaw plugins enable matrix` 步驟。在您配置下方頻道之前，該外掛仍不執行任何操作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為和安裝規則。

## 設定

1. 在您的家用伺服器 上建立 Matrix 帳號。
2. 使用 `homeserver` + `accessToken`，或是 `homeserver` + `userId` + `password` 來設定 `channels.matrix`。
3. 重新啟動閘道。
4. 開啟與機器人的私人訊息 (DM)，或邀請其加入房間（請參閱 [auto-join](#auto-join) — 只有在 `autoJoin` 允許的情況下，新的邀請才會送達）。

### 互動式設定

```bash
openclaw channels add
openclaw configure --section channels
```

精靈會詢問：家用伺服器 URL、驗證方法 (存取權杖或密碼)、使用者 ID (僅限密碼驗證)、選用裝置名稱、是否啟用 E2EE，以及是否設定聊天室存取和自動加入。

如果相符的 `MATRIX_*` 環境變數已存在，且選定的帳戶沒有已儲存的認證資訊，精靈會提供一個環境變數捷徑。若要在儲存允許清單前解析房間名稱，請執行 `openclaw channels resolve --channel matrix "Project Room"`。當啟用 E2EE 時，精靈會寫入配置並執行與 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的啟動程序。

### 最小設定

基於權杖：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

基於密碼 (權杖會在首次登入後快取)：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

### 自動加入

`channels.matrix.autoJoin` 預設為 `off`。使用預設值時，機器人在您手動加入之前，不會出現在新的聊天室或新邀請的私訊 (DM) 中。

OpenClaw 在收到邀請時無法判斷被邀請的聊天室是私訊還是群組，因此所有邀請（包括私訊風格的邀請）都會先經過 `autoJoin`。`dm.policy` 僅在機器人加入並對聊天室進行分類之後才會套用。

<Warning>
設定 `autoJoin: "allowlist"` 加上 `autoJoinAllowlist` 以限制機器人接受的邀請，或者設定 `autoJoin: "always"` 以接受所有邀請。

`autoJoinAllowlist` 僅接受穩定的目標：`!roomId:server`、`#alias:server` 或 `*`。純聊天室名稱會被拒絕；別名條目是針對主伺服器 解析，而非針對被邀請聊天室聲稱的狀態。

</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

要接受所有邀請，請使用 `autoJoin: "always"`。

### 允許清單目標格式

私訊和聊天室允許清單最好填入穩定的 ID：

- 私聊 (DMs) (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`)：請使用 `@user:server`。由於顯示名稱是可變的，預設會忽略它們；僅在您明確需要與顯示名稱條目相容時，才設定 `dangerouslyAllowNameMatching: true`。
- 房間允許清單金鑰 (`groups`, 舊版 `rooms`)：請使用 `!room:server` 或 `#alias:server`。純文字房間名稱預設會被忽略；僅在您明確需要與已加入房間名稱查詢相容時，才設定 `dangerouslyAllowNameMatching: true`。
- 邀請允許清單 (`autoJoinAllowlist`)：請使用 `!room:server`、`#alias:server` 或 `*`。純文字房間名稱會被拒絕。

### 帳戶 ID 標準化

精靈會將易記名稱轉換為標準化的帳戶 ID。例如，`Ops Bot` 會變成 `ops-bot`。標點符號在範圍環境變數名稱中會被跳脫，以免兩個帳戶發生衝突：`-` → `_X2D_`，因此 `ops-prod` 對應到 `MATRIX_OPS_X2D_PROD_*`。

### 快取的認證資訊

Matrix 將快取的認證資訊儲存在 `~/.openclaw/credentials/matrix/` 下：

- 預設帳戶：`credentials.json`
- 命名帳戶：`credentials-<account>.json`

當那裡存在快取的憑證時，即使存取令牌不在設定檔中，OpenClaw 也會將 Matrix 視為已設定——這涵蓋了設定、`openclaw doctor` 和通道狀態探測。

### 環境變數

當未設定對應的設定鍵時使用。預設帳戶使用無前綴的名稱；命名帳戶使用插入在後綴之前的帳戶 ID。

| 預設帳戶              | 命名帳戶（`<ID>` 是正規化的帳戶 ID） |
| --------------------- | ------------------------------------ |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`             |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`           |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`               |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`              |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`            |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`           |

對於帳戶 `ops`，名稱變為 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等。當您透過 `--recovery-key-stdin` 管線輸入金鑰時，復原金鑰環境變數會由具備復原感知的 CLI 流程（`verify backup restore`、`verify device`、`verify bootstrap`）讀取。

無法從工作區 `.env` 設定 `MATRIX_HOMESERVER`；請參閱 [Workspace `.env` files](/zh-Hant/gateway/security)。

## 設定範例

包含 DM 配對、房間允許清單和 E2EE 的實用基準：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

## 串流預覽

Matrix 回覆串流為選用功能。`streaming` 控制OpenClaw 如何傳送進行中的助理回覆；`blockStreaming` 控制每個完成的區塊是否保留為其自己的 Matrix 訊息。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

若要保留即時答案預覽但隱藏臨時工具/進度行，請使用物件
形式：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

| `streaming`       | 行為                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（預設值） | 等待完整回覆，僅發送一次。 `true` ↔ `"partial"`, `false` ↔ `"off"`。                                                          |
| `"partial"`       | 當模型撰寫目前區塊時，就地編輯一條普通文字訊息。原版 Matrix 用戶端可能會在第一次預覽時發出通知，而非最終編輯時。              |
| `"quiet"`         | 與 `"partial"` 相同，但該訊息為非通知性提示。接收者只有在針對每位使用者的推送規則符合最終編輯時，才會收到一次通知（見下文）。 |

`blockStreaming` 獨立於 `streaming`：

| `streaming`             | `blockStreaming: true`                   | `blockStreaming: false` (預設)         |
| ----------------------- | ---------------------------------------- | -------------------------------------- |
| `"partial"` / `"quiet"` | 目前區塊的即時草稿，完成的區塊保留為訊息 | 目前區塊的即時草稿，就地定稿           |
| `"off"`                 | 每個完成的區塊發送一條通知性 Matrix 訊息 | 針對完整回覆發送一條通知性 Matrix 訊息 |

註：

- 如果預覽增長超過 Matrix 的單一事件大小限制，OpenClaw 將停止預覽串流並回退為僅發送最終內容。
- 媒體回覆總是正常發送附件。如果過期的預覽不再能安全重複使用，OpenClaw 會在發送最終媒體回覆之前將其撤回。
- 當啟用 Matrix 預覽串流時，工具進度預覽更新預設為開啟。設定 `streaming.preview.toolProgress: false` 可保留答案文字的預覽編輯，但讓工具進度維持在一般傳遞路徑。
- 預覽編輯會產生額外的 API 呼叫。如果您希望使用最保守的速率限制設定，請保留 `streaming: "off"`。

## 核准元資料

Matrix 原生核准提示是普通的 `m.room.message` 事件，在 `com.openclaw.approval` 下包含 OpenClaw 專屬的自訂事件內容。Matrix 允許自訂事件內容金鑰，因此原版用戶端仍然會呈現文字內容，而支援 OpenClaw 的用戶端則可以讀取結構化的核准 ID、類型、狀態、可用決策以及執行/外掛程式詳細資訊。

當審核提示對於單一 Matrix 事件而言過長時，OpenClaw 會將可見文字分塊，並僅將 `com.openclaw.approval` 附加到第一個分塊。允許/拒絕決定的回應綁定到該第一個事件，因此長提示會保持與單一事件提示相同的審核目標。

### 用於安靜已定稿預覽的自託管推送規則

`streaming: "quiet"` 僅在區塊或回合定稿後通知收件者 — 必須有針對使用者的推送規則符合該定稿預覽標記。請參閱 [Matrix push rules for quiet previews](/zh-Hant/channels/matrix-push-rules) 以取得完整配方（收件者權杖、推送者檢查、規則安裝、各家庭伺服器注意事項）。

## Bot 對 Bot 房間

依預設，來自其他已設定 OpenClaw Matrix 帳戶的 Matrix 訊息會被忽略。

當您刻意需要代理之間的 Matrix 流量時，請使用 `allowBots`：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` 接受來自允許房間和 DM 中其他已設定 Matrix 機器人帳戶的訊息。
- `allowBots: "mentions"` 僅在房間中明確提及此機器人時才接受這些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳戶層級設定。
- 已接受的已配置機器人訊息使用共用的 [bot loop protection](/zh-Hant/channels/bot-loop-protection)。請設定 `channels.defaults.botLoopProtection`，然後在某一個房間需要不同的預算時，使用 `channels.matrix.botLoopProtection` 或 `channels.matrix.groups.<room>.botLoopProtection` 進行覆寫。
- OpenClaw 仍然會忽略來自相同 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 此處未公開原生的機器人旗標；OpenClaw 將「機器人作者」視為「由此 OpenClaw 閘道上的另一個已配置 Matrix 帳戶所發送」。

在共用房間中啟用機器人對機器人的流量時，請使用嚴格的房間允許清單和提及要求。

## 加密與驗證

在加密（E2EE）房間中，傳出圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密房間仍使用普通的 `thumbnail_url`。無需配置 — 外掛程式會自動偵測 E2EE 狀態。

所有 `openclaw matrix` 指令都接受 `--verbose`（完整診斷）、`--json`（機器可讀輸出）和 `--account <id>`（多帳號設定）。預設輸出簡潔，且內部 SDK 日誌為安靜模式。以下範例顯示標準形式；請視需要新增旗標。

### 啟用加密

```bash
openclaw matrix encryption setup
```

引導秘密儲存和交叉簽署，建立房間金鑰備份（如有需要），然後列印狀態和後續步驟。實用旗標：

- `--recovery-key <key>` 在引導前套用復原金鑰（建議使用下方記載的 stdin 形式）
- `--force-reset-cross-signing` 捨棄目前的交叉簽署身分並建立一個新的（請僅在有意時使用）

對於新帳號，請在建立時啟用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的別名。

手動設定等效項：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

### 狀態與信任信號

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` 回報三個獨立的信任信號（`--verbose` 會顯示全部）：

- `Locally trusted`：僅由此客戶端信任
- `Cross-signing verified`：SDK 回報透過交叉簽署的驗證
- `Signed by owner`：由您自己的自我簽署金鑰簽署（僅供診斷）

僅當 `Cross-signing verified` 為 `yes` 時，`Verified by owner` 才會變成 `yes`。僅有本地信任或擁有者簽章是不夠的。

`--allow-degraded-local-state` 會在不先準備 Matrix 帳號的情況下回傳盡力的診斷資訊；適用於離線或部分配置的探測。

### 使用復原金鑰驗證此裝置

復原金鑰是敏感資訊 — 請透過 stdin 傳送，而不要在指令列上傳遞。請設定 `MATRIX_RECOVERY_KEY`（或為命名帳號設定 `MATRIX_<ID>_RECOVERY_KEY`）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

該指令會回報三種狀態：

- `Recovery key accepted`：Matrix 已接受用於秘密儲存或裝置信任的金鑰。
- `Backup usable`：可以使用受信任的復原資料載入 room-key 備份。
- `Device verified by owner`：此裝置具有完整的 Matrix 交叉簽署身分信任。

當完整的身分信任不完整時，即使復原金鑰解鎖了備份資料，它也會以非零狀態碼退出。在這種情況下，請從另一個 Matrix 用戶端完成自我驗證：

```bash
openclaw matrix verify self
```

`verify self` 在成功退出前會等待 `Cross-signing verified: yes`。使用 `--timeout-ms <ms>` 來調整等待時間。

也接受金鑰字面形式 `openclaw matrix verify device "<recovery-key>"`，但金鑰最終會出現在您的 shell 歷史記錄中。

### 引導或修復交叉簽署

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是用於加密帳戶的修復和設定指令。按順序，它會：

- 引導秘密儲存，盡可能重複使用現有的復原金鑰
- 引導交叉簽署並上傳缺失的公開金鑰
- 標記並交叉簽署當前裝置
- 如果不存在，則建立伺服器端的 room-key 備份

如果主要伺服器需要 UIA 才能上傳交叉簽署金鑰，OpenClaw 會先嘗試 no-auth，然後 `m.login.dummy`，接著 `m.login.password`（需要 `channels.matrix.password`）。

有用的旗標：

- `--recovery-key-stdin`（搭配 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 以捨棄當前的交叉簽署身分（僅限有意為之）

### Room-key 備份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 顯示伺服器端備份是否存在以及此裝置能否解密它。`backup restore` 將備份的 room 金鑰匯入本地加密儲存；如果復原金鑰已經在磁碟上，則可以省略 `--recovery-key-stdin`。

要使用新的基準替換損壞的備份（接受丟失無法復原的舊歷史記錄；如果當前備份密鑰無法載入，也可以重新建立秘密儲存）：

```bash
openclaw matrix verify backup reset --yes
```

僅當您有意讓先前的復原金鑰停止解鎖新的備份基準時，才新增 `--rotate-recovery-key`。

### 列出、請求和回應驗證

```bash
openclaw matrix verify list
```

列出所選帳號的待驗證請求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

從此 OpenClaw 帳號發送驗證請求。`--own-user` 請求自我驗證（您在同一使用者的另一個 Matrix 客戶端中接受提示）；`--user-id`/`--device-id`/`--room-id` 以其他人為目標。`--own-user` 不能與其他目標標誌結合使用。

對於較低層級的生命週期處理——通常是在從另一個客戶端跟隨傳入請求時——這些指令作用於特定的請求 `<id>`（由 `verify list` 和 `verify request` 列印）：

| 指令                                       | 目的                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受傳入請求                                                 |
| `openclaw matrix verify start <id>`        | 啟動 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 列印 SAS 表情符號或十進位數                                  |
| `openclaw matrix verify confirm-sas <id>`  | 確認 SAS 與另一個客戶端顯示的相符                            |
| `openclaw matrix verify mismatch-sas <id>` | 當表情符號或十進位數不符時拒絕 SAS                           |
| `openclaw matrix verify cancel <id>`       | 取消；接受可選的 `--reason <text>` 和 `--code <matrix-code>` |

當驗證綁定到特定直接訊息房間時，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作為直接訊息後續提示。

### 多帳號說明

如果沒有 `--account <id>`，Matrix CLI 指令會使用隱含的預設帳號。如果您有多個命名帳號且尚未設定 `channels.matrix.defaultAccount`，它們將拒絕猜測並要求您選擇。當 E2EE 對某個命名帳號停用或無法使用時，錯誤會指向該帳號的配置金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="啟動行為">
    使用 `encryption: true` 時，`startupVerification` 預設為 `"if-unverified"`。啟動時，未驗證的裝置會在另一個 Matrix 用戶端中請求自我驗證，跳過重複請求並套用冷卻時間（預設 24 小時）。可使用 `startupVerificationCooldownHours` 進行調整，或使用 `startupVerification: "off"` 停用。

    啟動過程也會執行保守的加密引導程序，重複使用目前的秘密儲存和交叉簽署身分。如果引導狀態損壞，即使沒有 `channels.matrix.password`，OpenClaw 也會嘗試進行防護修復；如果 Homeserver 需要密碼 UIA，啟動程序會記錄警告並保持非致命性。已由擁有者簽署的裝置將會被保留。

    請參閱 [Matrix 遷移](/zh-Hant/channels/matrix-migration) 以了解完整的升級流程。

  </Accordion>

  <Accordion title="驗證通知">
    Matrix 會將驗證生命週期通知以 `m.notice` 訊息的形式發布到嚴格的 DM 驗證房間：請求、就緒（附帶「透過 Emoji 驗證」指引）、開始/完成，以及可用的 SAS（emoji/十進位）詳細資訊。

    來自另一個 Matrix 用戶端的傳入請求會被追蹤並自動接受。對於自我驗證，OpenClaw 會自動啟動 SAS 流程，並在 Emoji 驗證可用時確認其自身的一方——您仍需在 Matrix 用戶端中比較並確認「相符」。

    驗證系統通知不會轉發至代理程式聊天管道。

  </Accordion>

  <Accordion title="已刪除或無效的 Matrix 裝置">
    如果 `verify status` 顯示目前的裝置已不再列於 Homeserver 上，請建立一個新的 OpenClaw Matrix 裝置。若是密碼登入：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    若是 Token 驗證，請在您的 Matrix 用戶端或管理 UI 中建立新的存取 Token，然後更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    將 `assistant` 替換為失敗指令中的帳戶 ID，若是預設帳戶則可省略 `--account`。

  </Accordion>

  <Accordion title="裝置衛生">
    舊的 OpenClaw 管理裝置可能會累積。列出並修剪：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="加密儲存">
    Matrix E2EE 使用官方的 `matrix-js-sdk` Rust 加密路徑，並以 `fake-indexeddb` 作為 IndexedDB 填充層。加密狀態會持續保存到 `crypto-idb-snapshot.json`（具有限制性檔案權限）。

    加密的執行時狀態位於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 之下，並包含同步儲存、加密儲存、恢復金鑰、IDB 快照、執行緒綁定和啟動驗證狀態。當權杖變更但帳戶身分保持不變時，OpenClaw 會重複使用現有的最佳根目錄，因此先前的狀態仍然可見。

  </Accordion>
</AccordionGroup>

## 個人資料管理

更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次呼叫中傳遞這兩個選項。Matrix 直接接受 `mxc://` 大頭貼 URL；當您傳遞 `http://` 或 `https://` 時，OpenClaw 會先上傳檔案，並將解析後的 `mxc://` URL 儲存到 `channels.matrix.avatarUrl`（或個別帳戶的覆寫設定）。

## 執行緒

Matrix 支援原生 Matrix 執行緒，用於自動回覆和訊息工具發送。兩個獨立的旋鈕控制行為：

### 會話路由 (`sessionScope`)

`dm.sessionScope` 決定 Matrix DM 房間如何對應到 OpenClaw 會話：

- `"per-user"` (預設值)：所有具有相同路由對等點的 DM 房間共用一個會話。
- `"per-room"`：每個 Matrix DM 房間都有自己的會話金鑰，即使對等點是同一個也是如此。

明確的對話綁定總是優先於 `sessionScope`，因此綁定的房間和執行緒會保留其選定的目標會話。

### 回覆執行緒 (`threadReplies`)

`threadReplies` 決定機器人在何處發佈其回覆：

- `"off"`：回覆位於頂層。傳入的執行緒訊息保留在父會話上。
- `"inbound"`：僅當傳入訊息已經在該執行緒中時，才在執行緒內回覆。
- `"always"`：在以觸發訊息為根的討論串中回覆；該對話從第一次觸發開始透過匹配的討論串範圍會話進行路由。

`dm.threadReplies` 僅對私訊 (DM) 覆蓋此設定——例如，保持房間討論串獨立，同時保持私訊扁平化。

### 討論串繼承與斜線指令

- 傳入的討論串訊息包含討論串根訊息作為額外的代理程式上下文。
- 當目標為相同的房間（或相同的私訊使用者目標）時，Message-tool 發送會自動繼承目前的 Matrix 討論串，除非提供了明確的 `threadId`。
- 只有當目前會詮釋據證明是相同 Matrix 帳戶上的相同私訊對象時，才會觸發私訊使用者目標的重用；否則 OpenClaw 會退回到正常的使用者範圍路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定討論串的 `/acp spawn` 均可在 Matrix 房間和私訊中使用。
- 當啟用 `threadBindings.spawnSessions` 時，頂層 `/focus` 會建立一個新的 Matrix 討論串並將其綁定到目標會話。
- 在現有的 Matrix 討論串中執行 `/focus` 或 `/acp spawn --thread here` 會將該討論串就地綁定。

當 OpenClaw 偵測到 Matrix 私訊房間在同一個共享會話上與另一個私訊房間衝突時，它會在該房間中發布一次性 `m.notice`，指向 `/focus` 逃生門並建議進行 `dm.sessionScope` 變更。此通知僅在啟用討論串綁定時出現。

## ACP 對話綁定

Matrix 房間、私訊和現有的 Matrix 討論串可以在不變更聊天介面的情況下轉變為持久的 ACP 工作區。

快速操作員流程：

- 在您想要繼續使用的 Matrix 私訊、房間或現有討論串內執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix 私訊或房間中，目前的私訊/房間保持為聊天介面，未來的訊息會路由到生成的 ACP 會話。
- 在現有的 Matrix 討論串內，`--bind here` 會就地綁定該目前的討論串。
- `/new` 和 `/reset` 會原地重設相同的綁定 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 討論串。
- `threadBindings.spawnSessions` 會控制 `/acp spawn --thread auto|here`，即 OpenClaw 需要建立或綁定子 Matrix 討論串的情況。

### 討論串綁定配置

Matrix 繼承來自 `session.threadBindings` 的全域預設值，並且支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 討論串綁定會話預設產生於：

- 設定 `threadBindings.spawnSessions: false` 以阻擋頂層 `/focus` 和 `/acp spawn --thread auto|here` 建立/綁定 Matrix 討論串。
- 當原生子代理程式討論串產生不應分岔父級文字記錄時，設定 `threadBindings.defaultSpawnContext: "isolated"`。

## 反應

Matrix 支援輸出反應、輸入反應通知和 ack 反應。

輸出反應工具受 `channels.matrix.actions.reactions` 控制：

- `react` 會新增反應至 Matrix 事件。
- `reactions` 會列出 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人在該事件上的反應。
- `remove: true` 僅移除機器人指定的表情符號反應。

**解析順序**（最先定義的值優先）：

| 設定                    | 順序                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `ackReaction`           | per-account → channel → `messages.ackReaction` → agent identity emoji fallback   |
| `ackReactionScope`      | per-account → channel → `messages.ackReactionScope` → default `"group-mentions"` |
| `reactionNotifications` | per-account → channel → default `"own"`                                          |

`reactionNotifications: "own"` 在目標是機器人發送的 Matrix 訊息時，會轉發新增的 `m.reaction` 事件；`"off"` 則停用回應系統事件。回應移除不會被合成為系統事件，因為 Matrix 將其呈現為撤銷，而非獨立的 `m.reaction` 移除。

## 歷史記錄上下文

- `channels.matrix.historyLimit` 控制當 Matrix 房間訊息觸發代理程式時，包含多少最近的房間訊息作為 `InboundHistory`。回退至 `messages.groupChat.historyLimit`；如果兩者皆未設定，有效的預設值為 `0`。設定 `0` 以停用。
- Matrix 房間歷史記錄僅限於房間。私訊 (DM) 繼續使用正常的階段歷史記錄。
- Matrix 房間歷史記錄僅限於待處理訊息：OpenClaw 會緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時擷取該視窗的快照。
- 當前的觸發訊息不包含在 `InboundHistory` 中；它保留在該回合的主要輸入主體中。
- 相同 Matrix 事件的重試會重用原始的歷史記錄快照，而不是向前飄移至較新的房間訊息。

## 上下文可見性

Matrix 支援通用的 `contextVisibility` 控制，用於額外的房間上下文，例如擷取的回覆文字、討論串根節點和待處理歷史記錄。

- `contextVisibility: "all"` 是預設值。額外的上下文會保留接收時的狀態。
- `contextVisibility: "allowlist"` 會過濾額外的上下文，僅保留由啟用的房間/使用者允許清單檢查所允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍會保留一個明確的引用回覆。

此設定會影響額外上下文的可見性，而不影響輸入訊息本身是否能觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 和私訊政策設定。

## 私訊和房間政策

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

若要完全讓私訊靜音但保持房間正常運作，請設定 `dm.enabled: false`：

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

關於提及閘控和允許清單行為，請參閱 [群組](/zh-Hant/channels/groups)。

Matrix 私訊的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未獲批准的 Matrix 使用者在批准前不斷向您發送訊息，OpenClaw 將重複使用相同的待處理配對代碼，並可能會在短暫的冷卻後發送提醒回覆，而不是生成新代碼。

請參閱 [配對](/zh-Hant/channels/pairing) 以了解共享的 DM 配對流程和儲存佈局。

## 直接房間修復

如果直接訊息狀態不同步，OpenClaw 最終可能會出現過時的 `m.direct` 對應，指向舊的單獨房間而非即時 DM。檢查對等端的目前對應：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

進行修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

這兩個指令都支援多帳號設定的 `--account <id>`。修復流程：

- 優先使用已在 `m.direct` 中對應的嚴格 1:1 DM
- 退而求其次，使用任何目前加入的與該使用者的嚴格 1:1 DM
- 如果沒有正常的 DM，則建立一個新的直接房間並重寫 `m.direct`

它不會自動刪除舊房間。它會選擇正常的 DM 並更新對應，以便未來的 Matrix 發送、驗證通知和其他直接訊息流程將目標設為正確的房間。

## 執行審核

Matrix 可以充當原生審核客戶端。在 `channels.matrix.execApprovals` 下進行設定（或針對每個帳號覆寫使用 `channels.matrix.accounts.<account>.execApprovals`）：

- `enabled`：透過 Matrix 原生提示傳送審核。當未設定或設定為 `"auto"` 時，一旦能解析至少一位審核者，Matrix 將自動啟用。設定 `false` 以明確停用。
- `approvers`：獲准審核執行請求的 Matrix 使用者 ID (`@owner:example.org`)。可選 - 退而求其次使用 `channels.matrix.dm.allowFrom`。
- `target`：提示的發送位置。`"dm"` (預設) 發送給審核者 DM；`"channel"` 發送至原始 Matrix 房間或 DM；`"both"` 發送至兩者。
- `agentFilter` / `sessionFilter`：選用的允許清單，用於指定觸發 Matrix 傳送的代理程式/工作階段。

授權在不同類型的審核之間略有不同：

- **執行審核** 使用 `execApprovals.approvers`，退而求其次使用 `dm.allowFrom`。
- **外掛程式核准**僅透過 `dm.allowFrom` 進行授權。

這兩種類型都共用 Matrix 反應捷徑和訊息更新。核准者會在主要的核准訊息上看到反應捷徑：

- `✅` 允許一次
- `❌` 拒絕
- `♾️` 總是允許（當有效的執行策略允許時）

備用斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的核准者可以核准或拒絕。執行核准的頻道遞送包含指令文字——請僅在受信任的房間中啟用 `channel` 或 `both`。

相關：[執行核准](/zh-Hant/tools/exec-approvals)。

## 斜線指令

斜線指令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可直接在 DM 中運作。在房間中，OpenClaw 也會識別以機器人自身的 Matrix 提及為前綴的指令，因此 `@bot:server /new` 會在無需自訂提及正則表達式的情況下觸發指令路徑。這能讓機器人回應 Element 和類似客戶端在使用者輸入指令前 Tab 鍵自動補全機器人時所發出的房間風格 `@mention /command` 貼文。

授權規則仍然適用：指令傳送者必須滿足與普通訊息相同的 DM 或房間允許清單/擁有者策略。

## 多帳號

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

**繼承：**

- 頂層 `channels.matrix` 值充當命名帳號的預設值，除非該帳號覆寫了它們。
- 使用 `groups.<room>.account` 將繼承的房間條目限定於特定帳號。沒有 `account` 的條目會在帳號之間共享；當在頂層設定預設帳號時，`account: "default"` 仍然有效。

**預設帳號選擇：**

- 設定 `defaultAccount` 來選取隱含路由、探查和 CLI 指令偏好的命名帳號。
- 如果您有多個帳號，且其中一個的字面名稱為 `default`，即使未設定 `defaultAccount`，OpenClaw 也會隱含地使用它。
- 如果您有多個已命名的帳號且未選取預設帳號，CLI 指令將拒絕猜測 —— 請設定 `defaultAccount` 或傳遞 `--account <id>`。
- 只有當頂層 `channels.matrix.*` 區塊的驗證完成時（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`），它才會被視為隱含的 `default` 帳號。一旦快取的憑證涵蓋了驗證，已命名的帳號仍可透過 `homeserver` + `userId` 被發現。

**升級：**

- 當 OpenClaw 在修復或設定期間將單一帳號配置升級為多帳號時，如果存在已命名的帳號或 `defaultAccount` 已指向其中一個，它將保留現有的已命名帳號。只有 Matrix 驗證/啟動金鑰會移入升級後的帳號；共享的傳遞原則金鑰則保留在頂層。

請參閱 [Configuration reference](/zh-Hant/gateway/config-channels#multi-account-all-channels) 以了解共享的多帳號模式。

## 私有/LAN 家庭伺服器

預設情況下，除非您針對每個帳號明確選擇加入，否則 OpenClaw 會為了防範 SSRF 攻擊而封鎖私有/內部 Matrix 家庭伺服器。

如果您的家庭伺服器運行於 localhost、LAN/Tailscale IP 或內部主機名稱上，請為該 Matrix 帳號啟用
`network.dangerouslyAllowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

CLI 設定範例：

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

此選擇加入僅允許受信任的私有/內部目標。公開的明文家庭伺服器（例如
`http://matrix.example.org:8008`）仍會被封鎖。請盡可能優先使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要明確的傳出 HTTP(S) 代理，請設定 `channels.matrix.proxy`：

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

已命名的帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫頂層預設值。
OpenClaw 對於執行時期的 Matrix 流量和帳號狀態探測會使用相同的代理設定。

## 目標解析

只要 OpenClaw 要求您提供房間或使用者目標，Matrix 都接受以下目標格式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房間 ID 區分大小寫。在設定明確傳送目標、排程工作、綁定或允許清單時，請使用矩陣中確切的房間 ID 大小寫。OpenClaw 會將內部工作階段金鑰保留為標準形式以進行儲存，因此這些小寫金鑶並非 Matrix 傳送 ID 的可靠來源。

即時目錄查詢會使用已登入的 Matrix 帳號：

- 使用者查詢會向該家伺服器上的 Matrix 使用者目錄發出請求。
- 房間查詢直接接受明確的房間 ID 和別名。已加入房間的名稱查詢為盡力而為，且僅在設定 `dangerouslyAllowNameMatching: true` 時套用於執行時期房間允許清單。
- 如果房間名稱無法解析為 ID 或別名，它將會被執行時期允許清單解析忽略。

## 設定參考

允許清單風格的使用者欄位（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 使用者 ID（最安全）。非 ID 使用者項目預設會被忽略。如果您設定 `dangerouslyAllowNameMatching: true`，則 Matrix 目錄顯示名稱的完全符合項目會在啟動時以及監視器執行時允許清單變更時進行解析；無法解析的項目會在執行時期被忽略。

房間允許清單金鑰（`groups`、舊版 `rooms`）應為房間 ID 或別名。純房間名稱金鑰預設會被忽略；`dangerouslyAllowNameMatching: true` 會恢復對已加入房間名稱的盡力而為查詢。

### 帳號與連線

- `enabled`：啟用或停用通道。
- `name`：帳號的選用顯示標籤。
- `defaultAccount`：當設定多個 Matrix 帳號時的偏好帳號 ID。
- `accounts`：具名個別帳號的覆寫。頂層 `channels.matrix` 值會繼承為預設值。
- `homeserver`: homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`: 允許此帳號連線至 `localhost`、區域網路/Tailscale IP 或內部主機名稱。
- `proxy`: Matrix 流量的選用 HTTP(S) 代理 URL。支援每個帳號的覆寫設定。
- `userId`: 完整 Matrix 使用者 ID (`@bot:example.org`)。
- `accessToken`: 基於 Token 的驗證存取 Token。支援跨 env/file/exec 提供者的純文字與 SecretRef 值 ([Secrets Management](/zh-Hant/gateway/secrets))。
- `password`: 基於密碼登入的密碼。支援純文字與 SecretRef 值。
- `deviceId`: 明確指定的 Matrix 裝置 ID。
- `deviceName`: 在密碼登入時使用的裝置顯示名稱。
- `avatarUrl`: 儲存的自我大頭像 URL，用於個人檔案同步與 `profile set` 更新。
- `initialSyncLimit`: 啟動同步期間擷取的事件最大數量。

### 加密

- `encryption`: 啟用 E2EE。預設值：`false`。
- `startupVerification`: `"if-unverified"` (E2EE 開啟時的預設值) 或 `"off"`。當此裝置未驗證時，會在啟動時自動請求自我驗證。
- `startupVerificationCooldownHours`: 下一次自動啟動請求前的冷卻時間。預設值：`24`。

### 存取與政策

- `groupPolicy`: `"open"`、`"allowlist"` 或 `"disabled"`。預設值：`"allowlist"`。
- `groupAllowFrom`: 房間流量的使用者 ID 白名單。
- `dm.enabled`: 當 `false` 時，忽略所有 DM。預設值：`true`。
- `dm.policy`: `"pairing"` (預設)、`"allowlist"`、`"open"` 或 `"disabled"`。在機器人加入並將房間分類為私人訊息 (DM) 後套用；不影響邀請處理。
- `dm.allowFrom`: 私人訊息流量的使用者 ID 白名單。
- `dm.sessionScope`: `"per-user"` (預設) 或 `"per-room"`。
- `dm.threadReplies`: 僅限私人訊息的回覆串接覆寫 (`"off"`、`"inbound"`、`"always"`)。
- `allowBots`: 接受來自已配置的其他 Matrix 機器人帳戶的訊息 (`true` 或 `"mentions"`)。
- `allowlistOnly`: 當設定為 `true` 時，會強制將所有作用中的私人訊息原則 (`"disabled"` 除外) 和 `"open"` 群組原則設為 `"allowlist"`。不會改變 `"disabled"` 原則。
- `dangerouslyAllowNameMatching`: 當設定為 `true` 時，允許針對使用者白名單項目進行 Matrix 顯示名稱目錄查詢，並針對房間白名單金鑰進行已加入房間名稱查詢。建議優先使用完整的 `@user:server` ID 和房間 ID 或別名。
- `autoJoin`: `"always"`、`"allowlist"` 或 `"off"`。預設值：`"off"`。套用於每個 Matrix 邀請，包括私人訊息風格的邀請。
- `autoJoinAllowlist`: 當 `autoJoin` 為 `"allowlist"` 時允許的房間/別名。別名項目是針對主伺服器解析，而非針對受邀房間所聲稱的狀態。
- `contextVisibility`: 補充內容可見性 (`"all"` 預設、`"allowlist"`、`"allowlist_quote"`)。

### 回覆行為

- `replyToMode`: `"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`: `"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`: 每個頻道針對執行緒繫結的會話路由與生命週期的覆寫設定。
- `streaming`: `"off"` (預設)、`"partial"`、`"quiet"` 或物件形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`: 當 `true` 時，已完成的助手區塊會保留為獨立的進度訊息。
- `markdown`: 輸出文字的選用 Markdown 轉譯設定。
- `responsePrefix`: 附加至輸出回覆的選用字串。
- `textChunkLimit`: 當 `chunkMode: "length"` 時的輸出區塊大小（以字元計）。預設值：`4000`。
- `chunkMode`: `"length"` (預設，依字元數分割) 或 `"newline"` (在行邊界分割)。
- `historyLimit`: 當房間訊息觸發代理程式時，包含為 `InboundHistory` 的最近房間訊息數量。回退至 `messages.groupChat.historyLimit`；有效預設值 `0` (已停用)。
- `mediaMaxMb`: 輸出傳送與輸入處理的媒體大小上限 (MB)。

### Reaction settings

- `ackReaction`: 此頻道/帳號的 ack reaction 覆寫。
- `ackReactionScope`: 範圍覆寫 (`"group-mentions"` 預設，`"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`)。
- `reactionNotifications`：入站回應通知模式（`"own"` 預設，`"off"`）。

### 工具與各房間覆寫

- `actions`：各動作工具閘道（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：各房間原則映射。Session identity 在解析後使用穩定的房間 ID。（`rooms` 是舊版別名。）
  - `groups.<room>.account`：將一個繼承的房間條目限制為特定帳戶。
  - `groups.<room>.allowBots`：通道層級設定的各房間覆寫（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：各房間傳送者允許清單。
  - `groups.<room>.tools`：各房間工具允許/拒絕覆寫。
  - `groups.<room>.autoReply`：各房間提及閘道覆寫。`true` 停用該房間的提及要求；`false` 將其重新強制開啟。
  - `groups.<room>.skills`：各房間技能篩選器。
  - `groups.<room>.systemPrompt`：各房間系統提示片段。

### Exec 審核設定

- `execApprovals.enabled`：透過 Matrix 原生提示傳遞 exec 審核。
- `execApprovals.approvers`：獲准審核的 Matrix 使用者 ID。回退至 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（預設）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：用於傳遞的選用 Agent/Session 允許清單。

## 相關

- [通道概述](/zh-Hant/channels) - 所有支援的通道
- [配對](/zh-Hant/channels/pairing) - DM 驗證與配對流程
- [群組](/zh-Hant/channels/groups) - 群組聊天行為與提及閘道
- [通道路由](/zh-Hant/channels/channel-routing) - 訊息的 Session 路由
- [安全性](/zh-Hant/gateway/security) - 存取模型與加固
