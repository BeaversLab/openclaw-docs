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

`plugins install` 會註冊並啟用外掛，因此不需要單獨的 `openclaw plugins enable matrix` 步驟。在您設定下方的頻道之前，該外掛不會執行任何操作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為和安裝規則。

## 設定

1. 在您的家用伺服器 上建立 Matrix 帳號。
2. 使用 `homeserver` + `accessToken`，或是 `homeserver` + `userId` + `password` 來設定 `channels.matrix`。
3. 重新啟動閘道。
4. 開始與機器人的私聊 (DM)，或邀請它加入房間（請參閱 [auto-join](#auto-join) - 只有當 `autoJoin` 允許時，新的邀請才會生效）。

### 互動式設定

```bash
openclaw channels add
openclaw configure --section channels
```

精靈會詢問：家用伺服器 URL、驗證方法 (存取權杖或密碼)、使用者 ID (僅限密碼驗證)、選用裝置名稱、是否啟用 E2EE，以及是否設定聊天室存取和自動加入。

如果匹配的 `MATRIX_*` 環境變數已存在，且選定的帳戶沒有已儲存的驗證資訊，精靈會提供一個環境變數捷徑。若要在儲存允許清單之前解析房間名稱，請執行 `openclaw channels resolve --channel matrix "Project Room"`。當啟用 E2EE 時，精靈會寫入設定並執行與 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的引導程序。

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

`MATRIX_HOMESERVER` 無法從工作區 `.env` 設定；請參閱[工作區 `.env` 檔案](/zh-Hant/gateway/security)。

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

`streaming: "quiet"` 僅在區塊或輪次定稿時通知收件人 —— 每用戶推送規則必須符合已定稿預覽標記。請參閱[用於安靜預覽的 Matrix 推送規則](/zh-Hant/channels/matrix-push-rules)以取得完整配方（收件者權杖、推送者檢查、規則安裝、每個主伺服器說明）。

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
- 為避免自我回覆迴圈，OpenClaw 仍會忽略來自相同 Matrix 使用者 ID 的訊息。
- Matrix 在此未公開原生機器人旗標；OpenClaw 將「機器人撰寫」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳戶所傳送」。

在共享房間中啟用 Bot 對 Bot 流量時，請使用嚴格的房間允許清單和提及要求。

## 加密與驗證

在加密 (E2EE) 房間中，出站圖像事件使用 `thumbnail_file`，因此圖像預覽會與完整附件一併加密。未加密房間仍使用純文字 `thumbnail_url`。不需要任何設定 —— 外掛程式會自動偵測 E2EE 狀態。

所有 `openclaw matrix` 指令都接受 `--verbose`（完整診斷）、`--json`（機器可讀輸出）和 `--account <id>`（多重帳戶設定）。輸出預設簡潔，並具有安靜的內部 SDK 記錄。以下範例顯示標準形式；請視需要新增旗標。

### 啟用加密

```bash
openclaw matrix encryption setup
```

啟動金鑰儲存與交叉簽署，視需要建立金鑰備份，接著列印狀態與後續步驟。實用旗標：

- `--recovery-key <key>` 在啟動前套用復原金鑰（建議優先使用下方文件所述的 stdin 形式）
- `--force-reset-cross-signing` 捨棄目前的交叉簽署身分並建立新的（請僅在刻意操作時使用）

對於新帳號，請在建立時啟用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的別名。

對等的手動設定：

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

- `Locally trusted`：僅受此用戶端信任
- `Cross-signing verified`：SDK 回報已透過交叉簽署驗證
- `Signed by owner`：由您自身的自我簽署金鑰所簽署（僅供診斷）

`Verified by owner` 僅在 `Cross-signing verified` 為 `yes` 時才會變成 `yes`。僅靠本地信任或擁有者簽章並不足夠。

`--allow-degraded-local-state` 會在不先行準備 Matrix 帳號的情況下回傳盡力的診斷資訊；適用於離線或部分設定的探測。

### 使用復原金鑰驗證此裝置

復原金鑰極為敏感——請透過 stdin 傳輸，而不要在指令列上傳遞。設定 `MATRIX_RECOVERY_KEY`（或是 `MATRIX_<ID>_RECOVERY_KEY` 供具名帳號使用）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

此指令會回報三種狀態：

- `Recovery key accepted`：Matrix 已接受該金鑰用於金鑰儲存或裝置信任。
- `Backup usable`：可用受信任的復原資料載入金鑰備份。
- `Device verified by owner`：此裝置已具備完整的 Matrix 交叉簽署身分信任。

若完整身分信任尚未完成，即使復原金鑰已解鎖備份資料，仍會以非零值結束。此時請從另一個 Matrix 用戶端完成自我驗證：

```bash
openclaw matrix verify self
```

`verify self` 會等候 `Cross-signing verified: yes` 後才會成功結束。使用 `--timeout-ms <ms>` 調整等待時間。

字面鍵形式 `openclaw matrix verify device "<recovery-key>"` 也是可接受的，但金鑰最終會出現在您的 shell 歷史記錄中。

### 引導或修復交叉簽署

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是用於加密帳戶的修復和設定指令。按順序，它：

- 引導秘密儲存，盡可能重複使用現有的復原金鑰
- 引導交叉簽署並上傳遺失的公開金鑰
- 標記並交叉簽署目前裝置
- 如果伺服器端的房間金鑰備份不存在，則建立一個

如果家庭伺服器需要 UIA 才能上傳交叉簽署金鑰，OpenClaw 會先嘗試 no-auth，然後 `m.login.dummy`，再來是 `m.login.password`（需要 `channels.matrix.password`）。

實用旗標：

- `--recovery-key-stdin`（與 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …` 搭配使用）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 以捨棄目前的交叉簽署身分（僅限有意為之的操作）

### 房間金鑰備份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 顯示伺服器端備份是否存在，以及此裝置是否能解密它。`backup restore` 將備份的房間金鑰匯入本機加密儲存區；如果復原金鑰已在磁碟上，您可以省略 `--recovery-key-stdin`。

若要以新的基準替換損壞的備份（接受遺失無法復原的舊歷史記錄；如果目前的備份秘密無法載入，也可以重建秘密儲存）：

```bash
openclaw matrix verify backup reset --yes
```

僅當您有意要讓先前的復原金鑰停止解鎖新的備份基準時，才新增 `--rotate-recovery-key`。

### 列出、請求和回應驗證

```bash
openclaw matrix verify list
```

列出所選帳戶的待處理驗證請求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

從此 OpenClaw 帳戶傳送驗證請求。`--own-user` 請求自我驗證（您在同一使用者的另一個 Matrix 客戶端中接受提示）；`--user-id`/`--device-id`/`--room-id` 則以其他人為目標。`--own-user` 不能與其他目標旗標結合使用。

對於較低層級的生命週期處理——通常在來自另一個客戶端的遮蔽傳入請求期間——這些命令針對特定的請求 `<id>`（由 `verify list` 和 `verify request` 列印）：

| 指令                                       | 用途                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受傳入請求                                                 |
| `openclaw matrix verify start <id>`        | 啟動 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 列印 SAS 表情符號或小數                                      |
| `openclaw matrix verify confirm-sas <id>`  | 確認 SAS 與另一個客戶端顯示的相符                            |
| `openclaw matrix verify mismatch-sas <id>` | 當表情符號或小數不符時拒絕 SAS                               |
| `openclaw matrix verify cancel <id>`       | 取消；接受可選的 `--reason <text>` 和 `--code <matrix-code>` |

`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作為 DM 後續提示，當驗證綁定到特定的直接訊息房間時。

### 多帳號注意事項

如果沒有 `--account <id>`，Matrix CLI 指令會使用隱含的預設帳號。如果您有多個命名帳號且尚未設定 `channels.matrix.defaultAccount`，它們將拒絕猜測並要求您選擇。當 E2EE 對命名帳號停用或不可用時，錯誤會指向該帳號的設定金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="啟動行為">
    使用 `encryption: true` 時，`startupVerification` 預設為 `"if-unverified"`。啟動時，未驗證的裝置會在另一個 Matrix 客戶端中請求自我驗證，跳過重複項並套用冷卻時間（預設為 24 小時）。使用 `startupVerificationCooldownHours` 進行調整，或使用 `startupVerification: "off"` 將其停用。

    啟動還會執行保守的加密引導程序，重複使用目前的秘密儲存和交叉簽署身分。如果引導狀態損壞，即使沒有 `channels.matrix.password`，OpenClaw 也會嘗試受防護的修復；如果住宅伺服器需要密碼 UIA，啟動會記錄警告並保持非致命狀態。已由擁有者簽署的裝置將會被保留。

    參閱 [Matrix 遷移](/zh-Hant/channels/matrix-migration) 以了解完整的升級流程。

  </Accordion>

  <Accordion title="驗證通知">
    Matrix 會將驗證生命週期通知以 `m.notice` 訊息的形式發布到嚴格的 DM 驗證房間中：請求、就緒（附帶「透過表情符號驗證」指引）、開始/完成，以及可用的 SAS（表情符號/十進位）詳細資料。

    來自其他 Matrix 客戶端的傳入請求會被追蹤並自動接受。對於自我驗證，OpenClaw 會自動啟動 SAS 流程，並在表情符號驗證可用時確認其自身的一端——您仍需在 Matrix 客戶端中比較並確認「相符」。

    驗證系統通知不會轉發到代理程式聊天管道。

  </Accordion>

  <Accordion title="已刪除或無效的 Matrix 裝置">
    如果 `verify status` 指出目前的裝置已不再列於住宅伺服器上，請建立一個新的 OpenClaw Matrix 裝置。對於密碼登入：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    對於權杖驗證，請在您的 Matrix 客戶端或管理員介面中建立新的存取權杖，然後更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    將 `assistant` 替換為失敗指令中的帳戶 ID，若是預設帳戶則可省略 `--account`。

  </Accordion>

  <Accordion title="裝置衛生">
    舊的由 OpenClaw 管理的裝置可能會累積。列出並清理：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="加密存儲">
    Matrix E2EE 使用官方的 `matrix-js-sdk` Rust 加密路徑，並以 `fake-indexeddb` 作為 IndexedDB shim。加密狀態持久化至 `crypto-idb-snapshot.json`（限制性檔案權限）。

    加密的執行時狀態位於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包括同步存儲、加密存儲、恢復金鑰、IDB 快照、執行緒綁定以及啟動驗證狀態。當 token 變更但帳戶身分保持不變時，OpenClaw 會重複使用最佳的現有根目錄，以便先前的狀態保持可見。

  </Accordion>
</AccordionGroup>

## 個人資料管理

更新所選帳戶的 Matrix 自我個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次呼叫中同時傳遞這兩個選項。Matrix 直接接受 `mxc://` 頭像 URL；當您傳遞 `http://` 或 `https://` 時，OpenClaw 會先上傳檔案，然後將解析出的 `mxc://` URL 存儲到 `channels.matrix.avatarUrl`（或每個帳戶的覆蓋設定）中。

## 討論串

Matrix 支援原生 Matrix 討論串，可用於自動回覆和訊息工具發送。兩個獨立的選項控制行為：

### 會話路由 (`sessionScope`)

`dm.sessionScope` 決定 Matrix 私訊房間如何對應到 OpenClaw 會話：

- `"per-user"` (預設值)：與同一路由對等方的所有私訊房間共用一個會話。
- `"per-room"`：每個 Matrix 私訊房間都有自己的會話金鑰，即使對等方是同一個。

明確的對話綁定總是優先於 `sessionScope`，因此綁定的房間和討論串會保留其選定的目標會話。

### 回覆討論串 (`threadReplies`)

`threadReplies` 決定機器人在何處發佈其回覆：

- `"off"`：回覆位於頂層。傳入的討論串訊息保留在父級會話上。
- `"inbound"`：僅當傳入訊息已經在該討論串中時，才在討論串內回覆。
- `"always"`: 在以觸發訊息為根的討論串內回覆；從第一次觸發開始，該對話會透過相符的討論串範圍會話進行路由。

`dm.threadReplies` 僅針對直接訊息（DM）覆寫此設定——例如，保持房間討論串獨立，同時讓直接訊息保持扁平化。

### 討論串繼承與斜線指令

- 傳入的討論串訊息會將討論串根訊息包含為額外的 Agent 上下文。
- 當目標為相同房間（或相同的直接訊息使用者目標）時，訊息工具發送會自動繼承目前的 Matrix 討論串，除非提供了明確的 `threadId`。
- 僅當目前會話中繼資料證明是同一 Matrix 帳號上的相同直接訊息對象時，才會啟用直接訊息使用者目標的重用；否則 OpenClaw 會回退到正常的使用者範圍路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及受討論串約束的 `/acp spawn` 均可在 Matrix 房間和直接訊息中使用。
- 當啟用 `threadBindings.spawnSessions` 時，頂層 `/focus` 會建立一個新的 Matrix 討論串並將其綁定到目標會話。
- 在現有的 Matrix 討論串中執行 `/focus` 或 `/acp spawn --thread here` 會將該討論串原地綁定。

當 OpenClaw 偵測到一個 Matrix 直接訊息房間在同一個共享會話中與另一個直接訊息房間衝突時，它會在該房間中發布一次性的 `m.notice`，指向 `/focus` 逃生門並建議變更 `dm.sessionScope`。此通知僅在啟用討論串綁定時出現。

## ACP 對話綁定

Matrix 房間、直接訊息和現有的 Matrix 討論串可以轉變為持久的 ACP 工作區，而無需變更聊天介面。

快速操作員流程：

- 在您想要繼續使用的 Matrix 直接訊息、房間或現有討論串中執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix 直接訊息或房間中，目前的直接訊息/房間會保持作為聊天介面，且未來的訊息會路由到生成的 ACP 會話。
- 在現有的 Matrix 討論串內，`--bind here` 會將該目前的討論串原地綁定。
- `/new` 和 `/reset` 就地重置相同的綁定 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

註記：

- `--bind here` 不會建立子 Matrix 討論串。
- `threadBindings.spawnSessions` 閘控 `/acp spawn --thread auto|here`，此時 OpenClaw 需要建立或綁定子 Matrix 討論串。

### 討論串綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 討論串綁定會話預設產生於：

- 設定 `threadBindings.spawnSessions: false` 以阻擋頂層 `/focus` 和 `/acp spawn --thread auto|here` 建立/綁定 Matrix 討論串。
- 當原生子代理程式討論串產生不應分叉父腳本時，請設定 `threadBindings.defaultSpawnContext: "isolated"`。

## 反應

Matrix 支援輸出反應、輸入反應通知以及確認（ack）反應。

輸出反應工具受 `channels.matrix.actions.reactions` 閘控：

- `react` 為 Matrix 事件新增反應。
- `reactions` 列出 Matrix 事件的目前反應摘要。
- `emoji=""` 移除機器人在該事件上的自身反應。
- `remove: true` 僅從機器人移除指定的 emoji 反應。

**解析順序**（第一個定義的值優先）：

| 設定                    | 順序                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `ackReaction`           | 每個帳戶 → 頻道 → `messages.ackReaction` → 代理程式身分 emoji 後備      |
| `ackReactionScope`      | 每個帳戶 → 頻道 → `messages.ackReactionScope` → 預設 `"group-mentions"` |
| `reactionNotifications` | 每個帳戶 → 頻道 → 預設 `"own"`                                          |

當 `reactionNotifications: "own"` 目標為機器人發送的 Matrix 訊息時，會轉發已新增的 `m.reaction` 事件；`"off"` 則會停用作為系統事件的反應。反應移除不會被合成为系統事件，因為 Matrix 將其顯示為刪除，而非獨立的 `m.reaction` 移除。

## 歷史背景

- `channels.matrix.historyLimit` 控制當 Matrix 房間訊息觸發代理程式時，有多少最近的房間訊息會包含為 `InboundHistory`。預設退回至 `messages.groupChat.historyLimit`；如果兩者皆未設定，有效的預設值為 `0`。設定 `0` 可停用此功能。
- Matrix 房間歷史僅限於房間內。直訊（DM）繼續使用一般的工作階段歷史。
- Matrix 房間歷史僅限於待處理項：OpenClaw 會緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時擷取該時間範圍的快照。
- 目前的觸發訊息不包含在 `InboundHistory` 中；它保留在該回合的主要輸入內容中。
- 同一 Matrix 事件的重試會重用原始的歷史快照，而不是向前飄移至較新的房間訊息。

## 內容可見性

Matrix 支援共用的 `contextVisibility` 控制，用於額外的房間內容，例如取得的回覆文字、討論串根節點和待處理歷史。

- `contextVisibility: "all"` 為預設值。額外內容將保持接收時的狀態。
- `contextVisibility: "allowlist"` 會根據作用中的房間/使用者允許清單檢查，過濾額外內容的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似於 `allowlist`，但仍保留一個明確的引用回覆。

此設定影響的是額外內容的可見性，而非輸入訊息本身是否能觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 和直訊原則設定。

## 直訊與房間原則

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

若要讓房間保持運作的同時完全靜音直訊，請設定 `dm.enabled: false`：

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

關於提及閘道和允許清單行為，請參閱 [群組](/zh-Hant/channels/groups)。

Matrix 直訊的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 使用者在批准之前不斷向您發送訊息，OpenClaw 將重複使用相同的待處理配對代碼，並可能會在短暫冷卻後發送提醒回覆，而不是生成新代碼。

請參閱 [配對](/zh-Hant/channels/pairing) 以了解共用 DM 配對流程和儲存佈局。

## 直接修復聊天室

如果直接訊息狀態失去同步，OpenClaw 可能會保留過時的 `m.direct` 對應，這些對應指向舊的單獨聊天室，而不是目前的 DM。請檢查對應端目前的對應關係：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

進行修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

這兩個指令都接受 `--account <id>` 以用於多帳號設定。修復流程如下：

- 優先使用已在 `m.direct` 中對應的嚴格 1:1 DM
- 如果沒有上述對應，則退而求其次使用任何目前加入的與該使用者的嚴格 1:1 DM
- 如果不存在健康的 DM，則建立一個新的直接聊天室並重寫 `m.direct`

它不會自動刪除舊聊天室。它會選擇健康的 DM 並更新對應關係，以便未來的 Matrix 傳送、驗證通知和其他直接訊息流程將目標鎖定正確的聊天室。

## Exec 批准

Matrix 可以充當原生的批准客戶端。在 `channels.matrix.execApprovals` 下進行設定 (或使用 `channels.matrix.accounts.<account>.execApprovals` 進行每個帳號的覆寫)：

- `enabled`：透過 Matrix 原生提示傳送批准。當未設定或設為 `"auto"` 時，一旦能夠解析至少一個批准者，Matrix 將自動啟用。設定 `false` 以明確停用。
- `approvers`：獲准批准 exec 請求的 Matrix 使用者 ID (`@owner:example.org`)。可選 - 退而求其次使用 `channels.matrix.dm.allowFrom`。
- `target`：提示的發送位置。`"dm"` (預設) 發送給批准者的 DM；`"channel"` 發送到原始 Matrix 聊天室或 DM；`"both"` 則發送到兩者。
- `agentFilter` / `sessionFilter`：用於觸發 Matrix 傳送的代理程式/會話的可選允許清單。

不同類型的批准之間，授權略有不同：

- **Exec 批准** 使用 `execApprovals.approvers`，並退而求其次使用 `dm.allowFrom`。
- **外掛程式核准** 僅透過 `dm.allowFrom` 進行授權。

這兩種類型共用 Matrix 反應捷徑和訊息更新。核准者會在主要的核准訊息上看到反應捷徑：

- `✅` 允許一次
- `❌` 拒絕
- `♾️` 總是允許（當有效的執行原則允許時）

後備斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的核准者可以核准或拒絕。執行核准的頻道傳遞包含指令文字 - 僅在信任的聊天室中啟用 `channel` 或 `both`。

相關：[執行核准](/zh-Hant/tools/exec-approvals)。

## 斜線指令

斜線指令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可直接在 DM 中運作。在聊天室中，OpenClaw 也會識別以機器人自身的 Matrix 提及作為前綴的指令，因此 `@bot:server /new` 會觸發指令路徑而不需要自訂提及正則表達式。這可確保機器人能回應 Element 和類似客戶端在用戶輸入指令前使用 Tab 鍵自動完成機器人時所發出的聊天室風格 `@mention /command` 貼文。

授權規則仍然適用：指令發送者必須滿足與純訊息相同的 DM 或聊天室允許清單/擁有者原則。

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

- 頂層 `channels.matrix` 值作為命名帳號的預設值，除非該帳號覆寫了它們。
- 使用 `groups.<room>.account` 將繼承的聊天室條目限定於特定帳號。沒有 `account` 的條目在帳號之間共享；當在頂層設定預設帳號時，`account: "default"` 仍然有效。

**預設帳號選擇：**

- 設定 `defaultAccount` 以選擇隱含路由、探測和 CLI 指令偏好的命名帳號。
- 如果您有多個帳號且其中一個字面命名為 `default`，即使未設定 `defaultAccount`，OpenClaw 也會隱含地使用它。
- 如果您有多個命名帳號且未選取預設帳號，CLI 指令將拒絕猜測——請設定 `defaultAccount` 或傳遞 `--account <id>`。
- 只有當頂層 `channels.matrix.*` 區塊的認證完成時（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`），它才會被視為隱含的 `default` 帳號。一旦快取憑證涵蓋了認證，命名帳號仍可從 `homeserver` + `userId` 探索。

**升級：**

- 當 OpenClaw 在修復或設定期間將單一帳號配置升級為多帳號時，如果存在現有的命名帳號或 `defaultAccount` 已指向某個帳號，它將保留該命名帳號。只有 Matrix 認證/啟動金鑰會移至升級後的帳號；共用的傳遞策略金鑰則保持在頂層。

請參閱 [配置參考](/zh-Hant/gateway/config-channels#multi-account-all-channels) 以了解共用的多帳號模式。

## 私人/LAN 主伺服器

預設情況下，為了防護 SSRF，OpenClaw 會封鎖私人/內部 Matrix 主伺服器，除非您針對每個帳號明確選擇加入。

如果您的主伺服器運行於 localhost、LAN/Tailscale IP 或內部主機名稱，請為該 Matrix 帳號啟用
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

此選擇加入僅允許受信任的私人/內部目標。諸如 `http://matrix.example.org:8008` 等公開明文主伺服器仍會被封鎖。請盡可能偏好使用 `https://`。

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

命名帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫頂層預設值。
OpenClaw 對執行時期的 Matrix 流量和帳號狀態探測使用相同的代理設定。

## 目標解析

在 OpenClaw 要求您提供房間或使用者目標的任何位置，Matrix 接受這些目標形式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房間 ID 區分大小寫。在設定明確的傳送目標、排程工作、綁定或允許清單時，請使用 Matrix 中的正確房間 ID 大小寫。
OpenClaw 會將內部工作階段金鑰正規化以進行儲存，因此這些小寫金鑰並非 Matrix 傳送 ID 的可靠來源。

即時目錄查詢使用已登入的 Matrix 帳號：

- 使用者查詢會向該主伺服器上的 Matrix 使用者目錄發出請求。
- 房間查詢直接接受明確的房間 ID 和別名。已加入房間的名稱查詢為盡力而為，且僅當設定 `dangerouslyAllowNameMatching: true` 時，才適用於執行時期房間允許清單。
- 如果房間名稱無法解析為 ID 或別名，它將會被執行時期允許清單解析忽略。

## 設定參考

允許清單風格的使用者欄位（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 使用者 ID（最安全）。預設會忽略非 ID 的使用者項目。如果您設定 `dangerouslyAllowNameMatching: true`，系統會在啟動時以及監視器執行期間允許清單變更時，解析精確的 Matrix 目錄顯示名稱符合項目；無法解析的項目會在執行時期被忽略。

房間允許清單金鑰（`groups`、舊版 `rooms`）應為房間 ID 或別名。純房間名稱金鑰預設會被忽略；`dangerouslyAllowNameMatching: true` 會恢復對已加入房間名稱的盡力而為查詢。

### 帳號與連線

- `enabled`：啟用或停用頻道。
- `name`：帳號的選用顯示標籤。
- `defaultAccount`：當設定多個 Matrix 帳號時，偏好的帳號 ID。
- `accounts`：命名的個別帳號覆寫值。頂層 `channels.matrix` 值會被繼承為預設值。
- `homeserver`: homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`: 允許此帳戶連線到 `localhost`、區域網路/Tailscale IP 或內部主機名稱。
- `proxy`: Matrix 流量的選用 HTTP(S) 代理伺服器 URL。支援每個帳戶的覆寫設定。
- `userId`: 完整 Matrix 使用者 ID (`@bot:example.org`)。
- `accessToken`: 用於基於 Token 身份驗證的存取權杖。支援 env/file/exec 提供者的純文字和 SecretRef 值 ([機密管理](/zh-Hant/gateway/secrets))。
- `password`: 用於基於密碼登入的密碼。支援純文字和 SecretRef 值。
- `deviceId`: 明確指定的 Matrix 裝置 ID。
- `deviceName`: 於密碼登入時使用的裝置顯示名稱。
- `avatarUrl`: 用於個人資料同步和 `profile set` 更新的已儲存自我大頭貼 URL。
- `initialSyncLimit`: 啟動同步期間擷取的事件數量上限。

### 加密

- `encryption`: 啟用 E2EE。預設值：`false`。
- `startupVerification`: `"if-unverified"` (啟用 E2EE 時的預設值) 或 `"off"`。當此裝置未驗證時，會在啟動時自動請求自我驗證。
- `startupVerificationCooldownHours`: 下一次自動啟動請求前的冷卻時間。預設值：`24`。

### 存取與政策

- `groupPolicy`: `"open"`、`"allowlist"` 或 `"disabled"`。預設值：`"allowlist"`。
- `groupAllowFrom`: 用於房間流量的使用者 ID 允許清單。
- `dm.enabled`: 當 `false` 時，忽略所有 DM。預設值：`true`。
- `dm.policy`: `"pairing"` (預設)、`"allowlist"`、`"open"` 或 `"disabled"`。在機器人加入並將房間分類為私人訊息 (DM) 後套用；不影響邀請處理。
- `dm.allowFrom`: 私人訊息 (DM) 流量的使用者 ID 允許名單。
- `dm.sessionScope`: `"per-user"` (預設) 或 `"per-room"`。
- `dm.threadReplies`: 僅限私人訊息 (DM) 的回覆串接覆寫 (`"off"`、`"inbound"`、`"always"`)。
- `allowBots`: 接受來自已設定之其他 Matrix 機器人帳號的訊息 (`true` 或 `"mentions"`)。
- `allowlistOnly`: 當設為 `true` 時，將所有啟用的私人訊息 (DM) 政策 (`"disabled"` 除外) 和 `"open"` 群組政策強制設為 `"allowlist"`。不會變更 `"disabled"` 政策。
- `dangerouslyAllowNameMatching`: 當設為 `true` 時，允許對使用者允許名單項目進行 Matrix 顯示名稱目錄查詢，並對房間允許名單金鑰進行已加入房間名稱查詢。建議優先使用完整的 `@user:server` ID 以及房間 ID 或別名。
- `autoJoin`: `"always"`、`"allowlist"` 或 `"off"`。預設值：`"off"`。套用於每個 Matrix 邀請，包括私人訊息 (DM) 樣式的邀請。
- `autoJoinAllowlist`: 當 `autoJoin` 為 `"allowlist"` 時允許的房間/別名。別名項目是針對主伺服器解析，而非針對受邀房間聲稱的狀態。
- `contextVisibility`: 補充內容的可見性 (`"all"` 預設、`"allowlist"`、`"allowlist_quote"`)。

### 回覆行為

- `replyToMode`：`"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`：針對執行緒繫結工作階段路由與生命週期的各頻道覆寫。
- `streaming`：`"off"`（預設）、`"partial"`、`"quiet"` 或物件形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`：當 `true` 時，完成的助手區塊會保留為個別的進度訊息。
- `markdown`：輸出文字的選用 Markdown 渲染設定。
- `responsePrefix`：附加到輸出回覆的選用字串。
- `textChunkLimit`：當 `chunkMode: "length"` 時的輸出區塊字元大小。預設值：`4000`。
- `chunkMode`：`"length"`（預設，依字元數分割）或 `"newline"`（在行邊界分割）。
- `historyLimit`：當房間訊息觸發代理時，作為 `InboundHistory` 包含的最近房間訊息數量。若無設定則回退為 `messages.groupChat.historyLimit`；有效預設值為 `0`（已停用）。
- `mediaMaxMb`：輸出傳送與輸入處理的媒體大小上限（單位為 MB）。

### 反應設定

- `ackReaction`：此頻道/帳號的 ack 反應覆寫。
- `ackReactionScope`：範圍覆寫（`"group-mentions"` 預設、`"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：入站反應通知模式（預設為 `"own"`，`"off"`）。

### 工具與每個房間的覆寫

- `actions`：每個動作的工具閘道（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：每個房間的策略映射。會話身分在解析後使用穩定的房間 ID。（`rooms` 是舊版別名。）
  - `groups.<room>.account`：將一個繼承的房間條目限制為特定帳戶。
  - `groups.<room>.allowBots`：頻道層級設定的逐房間覆寫（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：逐房間的發送者允許清單。
  - `groups.<room>.tools`：逐房間的工具允許/拒絕覆寫。
  - `groups.<room>.autoReply`：逐房間的提及閘門覆寫。`true` 會停用該房間的提及要求；`false` 則會強制重新啟用。
  - `groups.<room>.skills`：逐房間的技能過濾器。
  - `groups.<room>.systemPrompt`：逐房間的系統提示片段。

### Exec 核准設定

- `execApprovals.enabled`：透過 Matrix 原生提示傳遞 Exec 核准。
- `execApprovals.approvers`：被允許進行核准的 Matrix 使用者 ID。會回退至 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（預設）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：用於傳遞的可選代理/會話允許清單。

## 相關

- [通道概述](/zh-Hant/channels) - 所有支援的通道
- [配對](/zh-Hant/channels/pairing) - DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) - 群組聊天行為與提及閘控
- [通道路由](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) - 存取模型與加固
