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

`plugins install` 會註冊並啟用外掛，因此不需要額外的 `openclaw plugins enable matrix` 步驟。在您設定下方的頻道之前，該外掛仍然不會執行任何動作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為和安裝規則。

## 設定

1. 在您的家用伺服器 上建立 Matrix 帳號。
2. 使用 `homeserver` + `accessToken`，或是 `homeserver` + `userId` + `password` 來設定 `channels.matrix`。
3. 重新啟動閘道。
4. 開始與機器人的 DM，或邀請它至聊天室 (請參閱 [auto-join](#auto-join) - 只有當 `autoJoin` 允許時，新的邀請才會生效)。

### 互動式設定

```bash
openclaw channels add
openclaw configure --section channels
```

精靈會詢問：家用伺服器 URL、驗證方法 (存取權杖或密碼)、使用者 ID (僅限密碼驗證)、選用裝置名稱、是否啟用 E2EE，以及是否設定聊天室存取和自動加入。

如果相符的 `MATRIX_*` 環境變數已存在，且選取的帳號沒有已儲存的驗證，精靈會提供環境變數捷徑。若要在儲存允許清單之前解析聊天室名稱，請執行 `openclaw channels resolve --channel matrix "Project Room"`。當啟用 E2EE 時，精靈會寫入設定並執行與 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的引導程序。

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

- 私訊 (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`)：使用 `@user:server`。僅當主伺服器目錄傳回完全符合的結果時，顯示名稱才會被解析。
- 聊天室 (`groups`, `autoJoinAllowlist`)：使用 `!room:server` 或 `#alias:server`。名稱會針對已加入的聊天室進行最佳解析；無法解析的條目在執行時會被忽略。

### 帳號 ID 標準化

精靈會將易記的名稱轉換為標準化的帳號 ID。例如，`Ops Bot` 會變成 `ops-bot`。標點符號在範圍環境變數名稱中會被跳脫，以免兩個帳號發生衝突：`-` → `_X2D_`，因此 `ops-prod` 會對應到 `MATRIX_OPS_X2D_PROD_*`。

### 快取的憑證

Matrix 將快取的憑證儲存在 `~/.openclaw/credentials/matrix/` 下：

- 預設帳號： `credentials.json`
- 命名帳號： `credentials-<account>.json`

當該處存在快取的憑證時，即使存取權杖不在設定檔中，OpenClaw 也會將 Matrix 視為已設定——這涵蓋了設定、`openclaw doctor` 以及通道狀態探測。

### 環境變數

當未設定對應的設定鍵時使用。預設帳戶使用無前綴的名稱；命名帳戶則使用在後綴之前插入的帳戶 ID。

| 預設帳戶              | 命名帳戶 (`<ID>` 是正規化的帳戶 ID) |
| --------------------- | ----------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`            |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`          |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`               |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`              |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`             |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`           |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`          |

對於帳戶 `ops`，名稱會變成 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等等。當您透過 `--recovery-key-stdin` 管線輸入金鑰時，具備復原感知的 CLI 流程 (`verify backup restore`、`verify device`、`verify bootstrap`) 會讀取復原金鑰環境變數。

`MATRIX_HOMESERVER` 無法從工作區 `.env` 設定；請參閱 [工作區 `.env` 檔案](/zh-Hant/gateway/security)。

## 設定範例

具備 DM 配對、房間允許清單和 E2EE 的實用基準：

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

Matrix 回覆串流是可選的。`streaming` 控制開啟傳送中的助理回覆時 OpenClaw 的傳遞方式；`blockStreaming` 控制是否將每個完成的區塊保留為單獨的 Matrix 訊息。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

若要保留即時回答預覽但隱藏中間的工具/進度行，請使用物件
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

| `streaming`    | 行為                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `"off"` (預設) | 等待完整回覆，僅發送一次。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                                           |
| `"partial"`    | 在模型撰寫目前區塊時，就地編輯一則一般文字訊息。原版 Matrix 用戶端可能會在第一個預覽時通知，而不是在最終編輯時。              |
| `"quiet"`      | 與 `"partial"` 相同，但該訊息為不發送通知的提示。只有在針對使用者的推送規則符合最終編輯時，收件人才會收到一次通知（見下文）。 |

`blockStreaming` 獨立於 `streaming`：

| `streaming`             | `blockStreaming: true`                     | `blockStreaming: false`（預設值）        |
| ----------------------- | ------------------------------------------ | ---------------------------------------- |
| `"partial"` / `"quiet"` | 目前區塊的即時草稿，已完成的區塊保留為訊息 | 目前區塊的即時草稿，就地定稿             |
| `"off"`                 | 每個已完成區塊發送一則會通知的 Matrix 訊息 | 針對完整回覆發送一則會通知的 Matrix 訊息 |

註記：

- 如果預覽超過 Matrix 的單一事件大小限制，OpenClaw 會停止預覽串流，並回退為僅發送最終內容。
- 媒體回覆總是正常發送附件。如果過時的預覽不再能安全地重複使用，OpenClaw 會在發送最終媒體回覆之前將其撤回。
- 當啟用 Matrix 預覽串流時，工具進度預覽更新預設為開啟。設定 `streaming.preview.toolProgress: false` 以保留回答文字的預覽編輯，但讓工具進度維持在正常傳送路徑。
- 預覽編輯會產生額外的 API 呼叫。如果您希望使用最保守的速率限制配置，請保留 `streaming: "off"`。

## 核准元數據

Matrix 原生核准提示是正常的 `m.room.message` 事件，在 `com.openclaw.approval` 下包含 OpenClaw 專用的自訂事件內容。Matrix 允許自訂事件內容金鑰，因此原版用戶端仍會呈現文字內容，而支援 OpenClaw 的用戶端則可以讀取結構化的核准 ID、種類、狀態、可用決策以及執行/外掛詳細資訊。

當核准提示對於單一 Matrix 事件來說太長時，OpenClaw 會將可見文字分塊，並僅將 `com.openclaw.approval` 附加到第一個區塊。允許/拒絕決策的反應會綁定到該第一個事件，因此長提示會與單一事件提示保持相同的核准目標。

### 用於靜默已定稿預覽的自託管推送規則

`streaming: "quiet"` 僅在區塊或回合定稿後通知收件者 — 必須有一條針對使用者的推送規則符合已定稿預覽標記。如需完整配方（收件者權杖、推送者檢查、規則安裝、每個 homeserver 的注意事項），請參閱 [用於靜默預覽的 Matrix 推送規則](/zh-Hant/channels/matrix-push-rules)。

## Bot 對 Bot 房間

根據預設，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息會被忽略。

當您有意進行代理之間的 Matrix 通訊時，請使用 `allowBots`：

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

- `allowBots: true` 接受來自允許房間和 DM 中其他已設定 Matrix bot 帳號的訊息。
- `allowBots: "mentions"` 僅在房間中明確提及此 bot 時才接受這些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- OpenClaw 仍會忽略來自相同 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 在此不公開原生的 bot 標誌；OpenClaw 將「bot 所作」視為「由此 OpenClaw 閘道上的另一個已設定 Matrix 帳號所傳送」。

在共享房間中啟用 bot 對 bot 通訊時，請使用嚴格的房間允許清單和提及要求。

## 加密與驗證

在加密 (E2EE) 房間中，外發圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密房間仍使用純文字 `thumbnail_url`。無需設定 — 外掛程式會自動偵測 E2EE 狀態。

所有 `openclaw matrix` 指令都接受 `--verbose`（完整診斷）、`--json`（機器可讀輸出）和 `--account <id>`（多帳號設定）。預設情況下，輸出簡潔，且內部 SDK 記錄為靜默。以下範例顯示標準形式；請根據需要新增旗標。

### 啟用加密

```bash
openclaw matrix encryption setup
```

啟動秘密儲存和交叉簽署，如有需要會建立房間金鑰備份，然後列印狀態和後續步驟。實用旗標：

- `--recovery-key <key>` 在啟動前套用復原金鑰（建議優先使用下面記載的 stdin 形式）
- `--force-reset-cross-signing` 捨棄目前的交叉簽署身分並建立一個新的（僅在有意使用時使用）

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

### 狀態與信任訊號

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` 回報三個獨立的信任訊號（`--verbose` 會顯示所有這些訊號）：

- `Locally trusted`：僅受此用戶端信任
- `Cross-signing verified`：SDK 回報透過交叉簽署進行的驗證
- `Signed by owner`：由您自己的自我簽署金鑰簽署（僅供診斷使用）

`Verified by owner` 僅在 `Cross-signing verified` 為 `yes` 時才會變成 `yes`。僅有本地信任或擁有者簽章是不夠的。

`--allow-degraded-local-state` 會在未先準備 Matrix 帳號的情況下回報盡力而為的診斷資訊；適用於離線或部分設定的探測。

### 使用復原金鑰驗證此裝置

復原金鑰非常敏感——請透過 stdin 傳遞，而不是在命令列上傳遞。請設定 `MATRIX_RECOVERY_KEY`（或是 `MATRIX_<ID>_RECOVERY_KEY` 用於命名帳號）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

該指令會回報三種狀態：

- `Recovery key accepted`：Matrix 接受了用於秘密儲存或裝置信任的金鑰。
- `Backup usable`：可以使用受信任的復原資料載入房間金鑰備份。
- `Device verified by owner`：此裝置具有完整的 Matrix 交叉簽署身分信任。

當完整的身分信任不完整時，即使復原金鑰解鎖了備份資料，它也會以非零值退出。在這種情況下，請從另一個 Matrix 用戶端完成自我驗證：

```bash
openclaw matrix verify self
```

`verify self` 會在成功退出之前等待 `Cross-signing verified: yes`。請使用 `--timeout-ms <ms>` 來調整等待時間。

也接受金鑰字面形式 `openclaw matrix verify device "<recovery-key>"`，但金鑰最終會留在您的 shell 歷史記錄中。

### 引導或修復交叉簽署

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是用於加密帳號的修復和設定指令。按順序，它會：

- 引導秘密儲存，盡可能重複使用現有的復原金鑰
- 啟動交叉簽署並上傳遺失的公開金鑰
- 標記並交叉簽署目前的裝置
- 如果伺服器端尚未存在金鑰備份，則建立一個

如果主伺服器需要 UIA 才能上傳交叉簽署金鑰，OpenClaw 會先嘗試 no-auth，然後 `m.login.dummy`，接著 `m.login.password`（需要 `channels.matrix.password`）。

實用旗標：

- `--recovery-key-stdin`（與 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …` 搭配）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 以捨棄目前的交叉簽署身分（僅限故意操作）

### 房間金鑰備份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 顯示是否存在伺服器端備份，以及此裝置是否能將其解密。`backup restore` 將備份的房間金鑰匯入本機加密儲存空間；如果復原金鑰已經在磁碟上，您可以省略 `--recovery-key-stdin`。

若要以全新的基準取代損壞的備份（接受遺失無法復原的舊歷史記錄；如果目前的備份金鑰無法載入，也可以重新建立祕密儲存空間）：

```bash
openclaw matrix verify backup reset --yes
```

僅當您故意想要先前的復原金鑰停止解鎖新的備份基準時，才新增 `--rotate-recovery-key`。

### 列出、請求及回應驗證

```bash
openclaw matrix verify list
```

列出所選帳戶待處理的驗證請求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

從此 OpenClaw 帳戶發送驗證請求。`--own-user` 請求自我驗證（您在同一使用者的另一個 Matrix 用戶端中接受提示）；`--user-id`/`--device-id`/`--room-id` 則以其他人為目標。`--own-user` 不能與其他目標旗標搭配使用。

對於更低層級的生命週期處理——通常是在鏡像來自其他用戶端的傳入請求時——這些指令會針對特定的請求 `<id>`（由 `verify list` 和 `verify request` 列印）：

| 指令                                       | 用途                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受傳入請求                                                 |
| `openclaw matrix verify start <id>`        | 啟動 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 列印 SAS 表情符號或十進位數字                                |
| `openclaw matrix verify confirm-sas <id>`  | 確認 SAS 是否與另一個客戶端顯示的相符                        |
| `openclaw matrix verify mismatch-sas <id>` | 當表情符號或十進位數字不相符時拒絕 SAS                       |
| `openclaw matrix verify cancel <id>`       | 取消；接受選用的 `--reason <text>` 和 `--code <matrix-code>` |

當驗證綁定至特定直接訊息房間時，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作為 DM 後續提示。

### 多帳號註記

如果沒有 `--account <id>`，Matrix CLI 指令會使用隱含的預設帳號。如果您有多個已命名的帳號且尚未設定 `channels.matrix.defaultAccount`，它們會拒絕猜測並要求您選擇。當某個已命名帳號的 E2EE 停用或無法使用時，錯誤訊息會指向該帳號的設定金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="啟動行為">
    使用 `encryption: true` 時，`startupVerification` 預設為 `"if-unverified"`。啟動時，未驗證的裝置會在另一個 Matrix 客戶端中請求自我驗證，跳過重複項目並套用冷卻時間（預設為 24 小時）。使用 `startupVerificationCooldownHours` 調整或使用 `startupVerification: "off"` 停用。

    啟動也會執行保守的加密引導程序，重複使用目前的祕密儲存和交叉簽署身分。如果引導狀態損壞，OpenClaw 會嘗試受防護的修復，即使沒有 `channels.matrix.password`；如果主伺服器需要密碼 UIA，啟動會記錄警告並保持非致命狀態。已由擁有者簽署的裝置將會被保留。

    請參閱 [Matrix 遷移](/zh-Hant/channels/matrix-migration) 以瞭解完整的升級流程。

  </Accordion>

  <Accordion title="驗證通知">
    Matrix 會將驗證生命週期通知以 `m.notice` 訊息的形式發送到嚴格的 DM 驗證房間：請求、就緒（附帶「透過表情符號驗證」指引）、開始/完成，以及 SAS（表情符號/十進位）詳細資料（如有）。

    來自另一個 Matrix 用戶端的傳入請求會被追蹤並自動接受。對於自我驗證，OpenClaw 會自動啟動 SAS 流程，並在表情符號驗證可用時確認其自身的一端——您仍需在 Matrix 用戶端中比較並確認「相符」。

    驗證系統通知不會轉發至代理程式聊天管道。

  </Accordion>

  <Accordion title="已刪除或無效的 Matrix 裝置">
    如果 `verify status` 顯示目前的裝置已不再列在主伺服器上，請建立一個新的 OpenClaw Matrix 裝置。對於密碼登入：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    對於 Token 驗證，請在您的 Matrix 用戶端或管理員 UI 中建立一個新的存取 Token，然後更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    將 `assistant` 替換為失敗指令中的帳戶 ID，若為預設帳戶則可省略 `--account`。

  </Accordion>

  <Accordion title="裝置整理">
    舊的 OpenClaw 管理裝置可能會不斷累積。列出並修剪它們：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="加密儲存">
    Matrix E2EE 使用官方 `matrix-js-sdk` Rust 加密路徑，並以 `fake-indexeddb` 作為 IndexedDB 填充層。加密狀態會持久化至 `crypto-idb-snapshot.json`（限制性檔案權限）。

    加密的執行時狀態位於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包括同步儲存、加密儲存、復原金鑰、IDB 快照、執行緒綁定和啟動驗證狀態。當 Token 變更但帳戶身分保持不變時，OpenClaw 會重複使用現有的最佳根目錄，以便先前的狀態保持可見。

  </Accordion>
</AccordionGroup>

## 個人資料管理

更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次呼叫中傳遞這兩個選項。Matrix 直接接受 `mxc://` 頭像 URL；當您傳遞 `http://` 或 `https://` 時，OpenClaw 會先上傳檔案，並將解析後的 `mxc://` URL 儲存到 `channels.matrix.avatarUrl`（或每個帳戶的覆蓋設定）中。

## 串接

Matrix 支援原生的 Matrix 串接，適用於自動回覆和訊息工具發送。兩個獨立的選項控制行為：

### 會話路由 (`sessionScope`)

`dm.sessionScope` 決定了 Matrix 私訊房間如何對應到 OpenClaw 會話：

- `"per-user"`（預設值）：所有具有相同路由對端的私訊房間共用一個會話。
- `"per-room"`：每個 Matrix 私訊房間都有自己的會話金鑰，即使對端是同一人也是如此。

明確的對話綁定總是優先於 `sessionScope`，因此被綁定的房間和串接將保持其選定的目標會話。

### 回覆串接 (`threadReplies`)

`threadReplies` 決定了機器人在何處發佈其回覆：

- `"off"`：回覆位於頂層。傳入的串接訊息保留在父會話上。
- `"inbound"`：僅當傳入訊息已經在該串接中時，才在串接內回覆。
- `"always"`：在以觸發訊息為根的串接內回覆；該對話從第一次觸發開始透過匹配的串接範圍會話進行路由。

`dm.threadReplies` 僅針對私訊覆蓋此設定——例如，在保持私訊扁平化的同時，讓房間串接保持獨立。

### 串接繼承與斜線指令

- 傳入的串接訊息會將串接根訊息包含為額外的代理程式上下文。
- 當目標是同一個房間（或同一個私訊使用者目標）時，訊息工具發送會自動繼承當前的 Matrix 串接，除非提供了明確的 `threadId`。
- 僅當當前會話元數據證明是同一 Matrix 帳戶上的同一私訊對端時，才會啟用私訊使用者目標的重用；否則 OpenClaw 會回退到正常的使用者範圍路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和綁定線程的 `/acp spawn` 均可在 Matrix 房間和 DM 中使用。
- 當啟用 `threadBindings.spawnSessions` 時，頂層 `/focus` 會建立一個新的 Matrix 線程並將其綁定到目標工作階段。
- 在現有的 Matrix 線程中執行 `/focus` 或 `/acp spawn --thread here` 會將該線程就地綁定。

當 OpenClaw 偵測到 Matrix DM 房間與同一個共用工作階段上的另一個 DM 房間發生衝突時，它會在該房間中發布一次性的 `m.notice`，指向 `/focus` 逃逸出口並建議變更 `dm.sessionScope`。此通知僅在啟用線程綁定時顯示。

## ACP 對話綁定

Matrix 房間、DM 和現有的 Matrix 線程可以轉換為持久的 ACP 工作區，而無需變更聊天介面。

快速操作員流程：

- 在您想要繼續使用的 Matrix DM、房間或現有線程中執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix DM 或房間中，目前的 DM/房間保持為聊天介面，未來的訊息會路由到產生的 ACP 工作階段。
- 在現有的 Matrix 線程內，`--bind here` 會將該目前線程就地綁定。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 線程。
- `threadBindings.spawnSessions` 控制 `/acp spawn --thread auto|here`，因為 OpenClaw 需要建立或綁定子 Matrix 線程。

### 線程綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且也支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 線程綁定工作階段預設在以下情況產生：

- 設定 `threadBindings.spawnSessions: false` 以阻擋頂層 `/focus` 和 `/acp spawn --thread auto|here` 建立/綁定 Matrix 訊息串。
- 當原生子代理程式訊息串產生不應分叉父對話記錄時，請設定 `threadBindings.defaultSpawnContext: "isolated"`。

## 反應

Matrix 支援傳出反應、傳入反應通知和確認反應。

傳出反應工具是由 `channels.matrix.actions.reactions` 閘控的：

- `react` 為 Matrix 事件新增一個反應。
- `reactions` 列出 Matrix 事件的目前反應摘要。
- `emoji=""` 移除機器人在該事件上的自身反應。
- `remove: true` 僅移除機器人的指定 emoji 反應。

**解析順序**（先定義的值優先）：

| 設定                    | 順序                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| `ackReaction`           | per-account → channel → `messages.ackReaction` → agent identity emoji fallback   |
| `ackReactionScope`      | per-account → channel → `messages.ackReactionScope` → default `"group-mentions"` |
| `reactionNotifications` | per-account → channel → default `"own"`                                          |

`reactionNotifications: "own"` 會在新增的 `m.reaction` 事件目標為機器人發送的 Matrix 訊息時進行轉送；`"off"` 可停用反應系統事件。反應移除不會被合成為系統事件，因為 Matrix 將其呈現為撤銷，而非獨立的 `m.reaction` 移除。

## 歷史記錄脈絡

- `channels.matrix.historyLimit` 控制當 Matrix 聊天室訊息觸發代理程式時，包含多少最近的聊天室訊息作為 `InboundHistory`。會回退到 `messages.groupChat.historyLimit`；若兩者皆未設定，有效預設值為 `0`。設定 `0` 以停用。
- Matrix 聊天室歷史記錄僅限於聊天室內。DM 則繼續使用一般工作階段歷史記錄。
- Matrix 聊天室歷史記錄僅包含待處理項：OpenClaw 會緩衝尚未觸發回覆的聊天室訊息，然後在提及或其他觸發條件到達時擷取該時間視窗。
- 目前的觸發訊息並不包含在 `InboundHistory` 中；它會保留在該回合的主要入站主體中。
- 相同 Matrix 事件的重試會重用原始的歷史快照，而不是向前漂移到較新的房間訊息。

## 內容可見性

Matrix 支援共享的 `contextVisibility` 控制項，用於額外的房間內容，例如擷取的回覆文字、討論串根節點以及待處理的歷史記錄。

- `contextVisibility: "all"` 是預設值。額外內容會保持接收時的狀態。
- `contextVisibility: "allowlist"` 會根據啟用的房間/使用者允許清單檢查，將額外內容過濾為僅包含允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似於 `allowlist`，但仍會保留一個明確的引用回覆。

此設定影響的是額外內容的可見性，而非入站訊息本身是否能觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 和 DM 政策設定。

## DM 和房間政策

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

若要讓房間保持運作同時完全靜音 DM，請設定 `dm.enabled: false`：

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

請參閱 [群組](/zh-Hant/channels/groups) 以了解提及閘門和允許清單的行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息給您，OpenClaw 會重用相同的待處理配對代碼，並可能在短暫的冷卻時間後傳送提醒回覆，而不是鑄造新的代碼。

請參閱 [配對](/zh-Hant/channels/pairing) 以了解共享的 DM 配對流程和儲存佈局。

## 直接房間修復

如果直接訊息狀態不同步，OpenClaw 最終可能會出現過時的 `m.direct` 對應，指向舊的單人房間而非目前的 DM。請檢查對等方的目前對應：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修復它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

這兩個指令都接受 `--account <id>` 用於多帳號設定。修復流程：

- 偏好已經在 `m.direct` 中對應的嚴格 1:1 DM
- 退而求其次，選擇任何目前已加入的與該使用者的嚴格 1:1 DM
- 如果沒有健康的 DM，則建立一個新的直接房間並重寫 `m.direct`

它不會自動刪除舊的聊天室。它會選擇健康的直接訊息（DM）並更新映射，以便未來的 Matrix 發送、驗證通知和其他直接訊息流程都針對正確的聊天室。

## 執行核准

Matrix 可以充當原生的核准客戶端。在 `channels.matrix.execApprovals` 下進行配置（或者針對每個帳號的覆寫使用 `channels.matrix.accounts.<account>.execApprovals`）：

- `enabled`：透過 Matrix 原生提示傳送核准。當未設定或設定為 `"auto"` 時，一旦能夠解析出至少一位核准者，Matrix 就會自動啟用。設定 `false` 可明確停用。
- `approvers`：獲准核准執行請求的 Matrix 使用者 ID (`@owner:example.org`)。選填 - 預設回退至 `channels.matrix.dm.allowFrom`。
- `target`：提示訊息的發送位置。`"dm"`（預設）發送至核准者的直接訊息；`"channel"` 發送至原始 Matrix 聊天室或直接訊息；`"both"` 則發送至這兩者。
- `agentFilter` / `sessionFilter`：選用的允許名單，用於指定觸發 Matrix 傳送的代理程式/工作階段。

授權在不同類型的核准之間略有不同：

- **執行核准** 使用 `execApprovals.approvers`，並回退至 `dm.allowFrom`。
- **外掛程式核准** 僅透過 `dm.allowFrom` 進行授權。

這兩種類型都共用 Matrix 反應捷徑和訊息更新。核准者會在主要的核准訊息上看到反應捷徑：

- `✅` 允許一次
- `❌` 拒絕
- `♾️` 總是允許（當有效的執行策略允許時）

備用斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的核准者可以核准或拒絕。執行核准的頻道傳送包含指令文字 - 僅在受信任的聊天室中啟用 `channel` 或 `both`。

相關連結：[執行核准](/zh-Hant/tools/exec-approvals)。

## 斜線指令

斜線指令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）可在直接訊息（DM）中直接使用。在聊天室中，OpenClaw 也會辨識以機器人本身的 Matrix 提及作為前綴的指令，因此 `@bot:server /new` 會在無需自訂提及正則表達式的情況下觸發指令路徑。這能確保機器人對 Element 和類似客戶端在使用者輸入指令前透過 Tab 鍵自動補全機器人時所發出的聊天室風格 `@mention /command` 貼文保持回應。

授權規則仍然適用：指令發送者必須滿足與純文字訊息相同的 DM 或聊天室允許清單/擁有者政策。

## 多重帳號

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

- 頂層 `channels.matrix` 值會作為命名帳號的預設值，除非該帳號覆寫了這些值。
- 使用 `groups.<room>.account` 將繼承的聊天室條目限定在特定帳號。沒有 `account` 的條目會在帳號間共享；當在頂層設定預設帳號時，`account: "default"` 仍然有效。

**預設帳號選擇：**

- 設定 `defaultAccount` 以選取隱含路由、探測和 CLI 指令偏好的命名帳號。
- 如果您有多個帳號，且其中一個帳號的字面名稱剛好是 `default`，即使未設定 `defaultAccount`，OpenClaw 也會隱含地使用該帳號。
- 如果您有多個命名帳號且未選擇預設帳號，CLI 指令將拒絕猜測——請設定 `defaultAccount` 或傳遞 `--account <id>`。
- 只有在其驗證完成（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`）時，頂層 `channels.matrix.*` 區塊才會被視為隱含的 `default` 帳號。一旦快取的憑證涵蓋了驗證，命名帳號仍可從 `homeserver` + `userId` 中被發現。

**升級：**

- 當 OpenClaw 在修復或設定期間將單一帳戶配置升級為多帳戶配置時，如果現有命名帳戶存在或 `defaultAccount` 已指向一個，它將保留該命名帳戶。只有 Matrix 認證/啟動金鑰會移入升級後的帳戶；共享的傳遞策略金鑰保持在頂層。

有關共享多帳戶模式，請參閱 [配置參考](/zh-Hant/gateway/config-channels#multi-account-all-channels)。

## 私用/LAN 家庭伺服器

預設情況下，除非您針對每個帳戶明確選擇加入，否則 OpenClaw 會為了 SSRF 保護而封鎖私用/內部 Matrix 家庭伺服器。

如果您的家庭伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳戶啟用
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

此選擇加入僅允許受信任的私用/內部目標。公開明文家庭伺服器（例如
`http://matrix.example.org:8008`）仍會被封鎖。請盡可能優先使用 `https://`。

## Proxying Matrix 流量

如果您的 Matrix 部署需要明確的出站 HTTP(S) 代理，請設定 `channels.matrix.proxy`：

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

命名帳戶可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫頂層預設值。
OpenClaw 對運行時 Matrix 流量和帳戶狀態探測使用相同的代理設定。

## 目標解析

只要 OpenClaw 要求您提供房間或用戶目標，Matrix 就接受這些目標格式：

- 用戶： `@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間： `!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名： `#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房間 ID 區分大小寫。配置明確的傳遞目標、Cron 作業、綁定或允許清單時，請使用 Matrix 中的準確房間 ID 大小寫。
OpenClaw 在儲存時會將內部工作階段金鑰保持標準形式，因此這些小寫
金鑰不是 Matrix 傳遞 ID 的可靠來源。

即時目錄查詢使用已登入的 Matrix 帳戶：

- 用戶查詢會查詢該家庭伺服器上的 Matrix 用戶目錄。
- 房間查詢會直接接受明確的房間 ID 和別名，然後退而搜索該帳戶已加入的房間名稱。
- 已加入房間名稱查詢為盡力而為。如果房間名稱無法解析為 ID 或別名，則在運行時允許清單解析中會被忽略。

## 設定參考

Allowlist 風格的欄位（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 使用者 ID（最安全）。精確的目錄匹配會在啟動時以及監視器執行期間允許清單變更時進行解析；無法解析的項目在運行時會被忽略。出於同樣原因，房間允許清單偏好使用房間 ID 或別名。

### 帳戶與連線

- `enabled`：啟用或停用頻道。
- `name`：帳戶的選用顯示標籤。
- `defaultAccount`：當設定多個 Matrix 帳戶時，偏好的帳戶 ID。
- `accounts`：命名且按帳戶覆寫。頂層 `channels.matrix` 值會被繼承為預設值。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允許此帳戶連線至 `localhost`、LAN/Tailscale IP 或內部主機名稱。
- `proxy`：Matrix 流量的選用 HTTP(S) 代理 URL。支援按帳戶覆寫。
- `userId`：完整的 Matrix 使用者 ID（`@bot:example.org`）。
- `accessToken`：基於 Token 的驗證存取 Token。支援跨 env/file/exec 提供者使用純文字和 SecretRef 值（[秘密管理](/zh-Hant/gateway/secrets)）。
- `password`：基於密碼登入的密碼。支援純文字和 SecretRef 值。
- `deviceId`：明確的 Matrix 裝置 ID。
- `deviceName`：在密碼登入時使用的裝置顯示名稱。
- `avatarUrl`：用於設定檔同步和 `profile set` 更新的儲存自我大頭貼 URL。
- `initialSyncLimit`：啟動同步期間取得的最大事件數量。

### 加密

- `encryption`：啟用 E2EE。預設值：`false`。
- `startupVerification`：`"if-unverified"`（當開啟 E2EE 時的預設值）或 `"off"`。當此裝置未驗證時，在啟動時自動請求自我驗證。
- `startupVerificationCooldownHours`：下一次自動啟動請求前的冷卻時間。預設值：`24`。

### 存取與政策

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。預設值：`"allowlist"`。
- `groupAllowFrom`：用於房間流量的使用者 ID 白名單。
- `dm.enabled`：當 `false` 時，忽略所有 DM。預設值：`true`。
- `dm.policy`：`"pairing"`（預設值）、`"allowlist"`、`"open"` 或 `"disabled"`。在機器人已加入並將房間分類為 DM 後套用；不影響邀請處理。
- `dm.allowFrom`：用於 DM 流量的使用者 ID 白名單。
- `dm.sessionScope`：`"per-user"`（預設值）或 `"per-room"`。
- `dm.threadReplies`：僅限 DM 的回覆討論串覆寫（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受來自其他已設定 Matrix 機器人帳戶的訊息（`true` 或 `"mentions"`）。
- `allowlistOnly`：當 `true` 時，強制所有啟用的 DM 政策（`"disabled"` 除外）和 `"open"` 群組政策變為 `"allowlist"`。不改變 `"disabled"` 政策。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。預設值：`"off"`。套用於每個 Matrix 邀請，包括 DM 樣式的邀請。
- `autoJoinAllowlist`: 當 `autoJoin` 為 `"allowlist"` 時允許的房間/別名。別名條目是根據主伺服器解析的，而不是根據受邀房間聲稱的狀態。
- `contextVisibility`: 補充上下文可見性（`"all"` 預設，`"allowlist"`，`"allowlist_quote"`）。

### 回覆行為

- `replyToMode`: `"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`: `"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`: 每個頻道的執行緒綁定會話路由和生命週期覆蓋設定。
- `streaming`: `"off"`（預設）、`"partial"`、`"quiet"` 或物件形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`: 當設定為 `true` 時，已完成的助手區塊會保留為單獨的進度訊息。
- `markdown`: 輸出文字的可選 Markdown 渲染設定。
- `responsePrefix`: 附加在輸出回覆前的可選字串。
- `textChunkLimit`: 當 `chunkMode: "length"` 時的輸出區塊字元大小。預設值：`4000`。
- `chunkMode`: `"length"`（預設，按字元數分割）或 `"newline"`（在行邊界分割）。
- `historyLimit`: 當房間訊息觸發代理程式時，作為 `InboundHistory` 包含的最近房間訊息數量。回退至 `messages.groupChat.historyLimit`；有效預設值 `0`（已停用）。
- `mediaMaxMb`: 用於輸出發送和輸入處理的媒體大小上限（MB）。

### 反應設定

- `ackReaction`：此頻道/帳號的 ack 反應覆蓋。
- `ackReactionScope`：範圍覆蓋（`"group-mentions"` 預設，`"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：傳入反應通知模式（`"own"` 預設，`"off"`）。

### 工具與每房間覆蓋

- `actions`：個別動作的工具閘道（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：每房間政策對映。Session identity 在解析後使用穩定的房間 ID。（`rooms` 是舊版別名。）
  - `groups.<room>.account`：將一個繼承的房間條目限制為特定帳號。
  - `groups.<room>.allowBots`：頻道層級設定的每房間覆蓋（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：每房間發送者允許清單。
  - `groups.<room>.tools`：每房間工具允許/拒絕覆蓋。
  - `groups.<room>.autoReply`：每房間提及閘道覆蓋。`true` 會停用該房間的提及要求；`false` 會強制重新啟用。
  - `groups.<room>.skills`：每房間技能過濾器。
  - `groups.<room>.systemPrompt`：每房間系統提示詞片段。

### 執行核准設定

- `execApprovals.enabled`：透過 Matrix 原生提示傳遞執行核准。
- `execApprovals.approvers`：允許進行核准的 Matrix 使用者 ID。回退至 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（預設）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：傳遞的可選代理/會話允許清單。

## 相關

- [頻道總覽](/zh-Hant/channels) - 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) - 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) - 群組聊天行為與提及閘控
- [頻道路由](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) - 存取模型與強化防護
