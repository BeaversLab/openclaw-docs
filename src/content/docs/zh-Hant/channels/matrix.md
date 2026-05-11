---
summary: "Matrix 支援狀態、設定與設定範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

Matrix 是 OpenClaw 的內建頻道外掛。
它使用官方的 `matrix-js-sdk`，並支援 DM、聊天室、串回、媒體、反應、投票、位置與 E2EE。

## 內建外掛

目前封裝的 OpenClaw 發行版本已內建 Matrix 外掛。您無需安裝任何東西；只需設定 `channels.matrix.*`（請參閱[設定](#setup)）即可啟動它。

對於排除 Matrix 的舊版建置或自訂安裝，請先手動安裝：

```bash
openclaw plugins install @openclaw/matrix
# or, from a local checkout
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 會註冊並啟用此外掛，因此不需要額外的 `openclaw plugins enable matrix` 步驟。除非您在下方設定頻道，否則此外掛仍不會執行任何動作。關於一般外掛行為與安裝規則，請參閱 [外掛](/zh-Hant/tools/plugin)。

## 設定

1. 在您的 homeserver 上建立 Matrix 帳號。
2. 使用 `homeserver` + `accessToken`，或 `homeserver` + `userId` + `password` 來設定 `channels.matrix`。
3. 重新啟動閘道。
4. 開始與機器人進行 DM，或將其邀請至聊天室（請參閱[自動加入](#auto-join) — 只有在 `autoJoin` 允許的情況下，新的邀請才會生效）。

### 互動式設定

```bash
openclaw channels add
openclaw configure --section channels
```

精靈會詢問：homeserver URL、驗證方式（存取權杖或密碼）、使用者 ID（僅限密碼驗證）、選用裝置名稱、是否啟用 E2EE，以及是否設定聊天室存取與自動加入。

如果相符的 `MATRIX_*` 環境變數已存在，且所選帳號沒有已儲存的驗證資訊，精靈會提供環境變數捷徑。若要在儲存允許清單之前解析聊天室名稱，請執行 `openclaw channels resolve --channel matrix "Project Room"`。當啟用 E2EE 時，精靈會寫入設定並執行與 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的啟動程序。

### 最精簡設定

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

基於密碼（首次登入後會快取權杖）：

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

`channels.matrix.autoJoin` 預設為 `off`。在預設情況下，機器人不會出現在全新邀請的新房間或私訊（DM）中，除非您手動加入。

OpenClaw 在收到邀請時無法分辨受邀房間是私訊還是群組，因此所有邀請——包括私訊風格的邀請——都會先經過 `autoJoin`。`dm.policy` 只會在機器人加入並且房間被分類之後才會套用。

<Warning>
設定 `autoJoin: "allowlist"` 加上 `autoJoinAllowlist` 以限制機器人接受的邀請，或者設定 `autoJoin: "always"` 以接受所有邀請。

`autoJoinAllowlist` 僅接受穩定的目標：`!roomId:server`、`#alias:server` 或 `*`。純房間名稱會被拒絕；別名條目是針對主伺服器解析，而不是針對受邀房間所聲稱的狀態。

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

私訊和房間的允許清單最好填入穩定的 ID：

- 私訊（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。顯示名稱只有在主伺服器目錄傳回完全一致的匹配時才會解析。
- 房間（`groups`、`autoJoinAllowlist`）：使用 `!room:server` 或 `#alias:server`。名稱會盡力根據已加入的房間進行解析；未解析的條目會在執行時被忽略。

### 帳號 ID 正規化

精靈會將易記名稱轉換為正規化的帳號 ID。例如，`Ops Bot` 會變成 `ops-bot`。標點符號在範圍環境變數名稱中會被跳脫，因此兩個帳號不會衝突：`-` → `_X2D_`，所以 `ops-prod` 對應到 `MATRIX_OPS_X2D_PROD_*`。

### 快取認證

Matrix 將快取認證儲存在 `~/.openclaw/credentials/matrix/` 下：

- 預設帳號：`credentials.json`
- 具名帳號：`credentials-<account>.json`

當那裡存在快取的憑證時，即使存取權杖不在設定檔中，OpenClaw 也會將 Matrix 視為已設定——這涵蓋了設定、`openclaw doctor` 以及通道狀態探測。

### 環境變數

當未設定對應的設定鍵時使用。預設帳號使用無前綴的名稱；命名帳號則使用在後綴之前插入的帳號 ID。

| 預設帳號              | 命名帳號（`<ID>` 是正規化的帳號 ID） |
| --------------------- | ------------------------------------ |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`             |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`           |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`               |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`              |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`            |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`           |

對於帳號 `ops`，名稱會變成 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN` 等等。復原金鑰環境變數會在您透過 `--recovery-key-stdin` 管線輸入金鑰時，由具備復原感知的 CLI 流程（`verify backup restore`、`verify device`、`verify bootstrap`）讀取。

`MATRIX_HOMESERVER` 無法從工作區 `.env` 設定；請參閱 [工作區 `.env` 檔案](/zh-Hant/gateway/security)。

## 設定範例

一個包含 DM 配對、房間允許清單和 E2EE 的實用基準：

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

Matrix 回覆串流為選用功能。`streaming` 控制OpenClaw 如何傳送進行中的助手回覆；`blockStreaming` 控制是否將每個完成的區塊保留為其自己的 Matrix 訊息。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

| `streaming`     | 行為                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `"off"`（預設） | 等待完整回覆，傳送一次。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                                         |
| `"partial"`     | 當模型撰寫當前區塊時，就地編輯一條普通文字訊息。標準 Matrix 客戶端可能會在第一次預覽時發送通知，而不是在最終編輯完成時。  |
| `"quiet"`       | 與 `"partial"` 相同，但該訊息為不發送通知的通告。接收者僅在針對使用者的推送規則符合最終編輯時才會收到一次通知（見下文）。 |

`blockStreaming` 獨立於 `streaming`：

| `streaming`             | `blockStreaming: true`                     | `blockStreaming: false` (預設)     |
| ----------------------- | ------------------------------------------ | ---------------------------------- |
| `"partial"` / `"quiet"` | 當前區塊的即時草稿，已完成的區塊保留為訊息 | 當前區塊的即時草稿，就地完成       |
| `"off"`                 | 每個完成區塊一條發送通知的 Matrix 訊息     | 完整回覆一條發送通知的 Matrix 訊息 |

備註：

- 如果預覽超過 Matrix 的單一事件大小限制，OpenClaw 將停止預覽串流並回退至僅傳送最終內容。
- 媒體回覆總是正常傳送附件。如果過時的預覽不再能安全重用，OpenClaw 會在傳送最終媒體回覆之前將其撤回。
- 預覽編輯會產生額外的 Matrix API 呼叫。如果您希望使用最保守的速率限制設定，請保留 `streaming: "off"`。

### 自託管推送規則以實現安靜的最終預覽

`streaming: "quiet"` 僅在區塊或回合完成時通知接收者 — 針對使用者的推送規則必須符合最終預覽標記。請參閱 [Matrix push rules for quiet previews](/zh-Hant/channels/matrix-push-rules) 以取得完整指南（接收者權杖、推送者檢查、規則安裝、各個主伺服器備註）。

## Bot-to-bot rooms

預設情況下，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息會被忽略。

當您有意要進行代理之間的 Matrix 流量傳輸時，請使用 `allowBots`：

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

- `allowBots: true` 接受來自在允許的房間和 DM 中其他已設定 Matrix 機器人帳號的訊息。
- `allowBots: "mentions"` 僅當它們在房間中明確提及此機器人時才接受這些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- OpenClaw 仍然會忽略來自同一 Matrix 使用者 ID 的訊息，以避免自我回覆的迴圈。
- Matrix 在此處不公開原生的機器人標誌；OpenClaw 將「由機器人撰寫」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳戶所傳送」。

在共享房間中啟用機器人對機器人通訊時，請使用嚴格的房間白名單和提及要求。

## 加密與驗證

在加密（E2EE）房間中，出站圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一併加密。未加密的房間仍使用純文字 `thumbnail_url`。不需要任何組態 — 外掛程式會自動偵測 E2EE 狀態。

所有 `openclaw matrix` 指令都接受 `--verbose`（完整診斷）、`--json`（機器可讀輸出）和 `--account <id>`（多重帳戶設定）。預設情況下，輸出簡潔，且內部 SDK 記錄為安靜模式。以下範例顯示標準形式；請根據需要加入旗標。

### 啟用加密

```bash
openclaw matrix encryption setup
```

啟動金鑰儲存和交叉簽署，在需要時建立房間金鑰備份，然後列印狀態和後續步驟。實用旗標：

- `--recovery-key <key>` 在啟動前套用復原金鑰（建議優先使用下列文件說明的 stdin 形式）
- `--force-reset-cross-signing` 捨棄目前的交叉簽署身分並建立一個新的（請僅在有意為之情況下使用）

對於新帳戶，請在建立時啟用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的別名。

手動組態對等項：

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

`verify status` 回報三個獨立的信任信號（`--verbose` 會顯示所有信號）：

- `Locally trusted`：僅受此客戶端信任
- `Cross-signing verified`：SDK 回報透過交叉簽署進行驗證
- `Signed by owner`：由您自己的自我簽署金鑰簽署（僅供診斷使用）

`Verified by owner` 只有在 `Cross-signing verified` 為 `yes` 時才會變成 `yes`。僅靠本機信任或擁有者簽章是不夠的。

`--allow-degraded-local-state` 會在不準備 Matrix 帳戶的情況下傳回盡力而為的診斷；適用於離線或部分配置的探測。

### 使用復原金鑰驗證此裝置

復原金鑰非常敏感 — 請透過 stdin 傳遞，而不是在命令列上傳遞。設定 `MATRIX_RECOVERY_KEY`（或為具名帳戶設定 `MATRIX_<ID>_RECOVERY_KEY`）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

該命令會報告三種狀態：

- `Recovery key accepted`：Matrix 已接受用於機密儲存或裝置信任的金鑰。
- `Backup usable`：可以使用信任的復原資料載入房間金鑰備份。
- `Device verified by owner`：此裝置具有完整的 Matrix 交叉簽署身分信任。

當完整的身分信任不完整時，即使復原金鑰解鎖了備份資料，它也會以非零狀態碼結束。在這種情況下，請從另一個 Matrix 用戶端完成自我驗證：

```bash
openclaw matrix verify self
```

`verify self` 會等待 `Cross-signing verified: yes` 才會成功結束。使用 `--timeout-ms <ms>` 來調整等待時間。

也接受字面金鑰形式 `openclaw matrix verify device "<recovery-key>"`，但金鑰會保留在您的 shell 歷史記錄中。

### 引導或修復交叉簽署

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是加密帳戶的修復和設定命令。按順序，它會：

- 引導機密儲存，盡可能重複使用現有的復原金鑰
- 引導交叉簽署並上傳遺失的公開金鑰
- 標記並交叉簽署目前的裝置
- 建立伺服器端的房間金鑰備份（如果尚未存在）

如果主伺服器需要 UIA 才能上傳交叉簽署金鑰，OpenClaw 會先嘗試 no-auth，然後是 `m.login.dummy`，接著是 `m.login.password`（需要 `channels.matrix.password`）。

實用的旗標：

- `--recovery-key-stdin`（搭配 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 以捨棄目前的交叉簽署身分（僅限有意為之）

### 房間金鑰備份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 顯示是否存在伺服器端備份以及此裝置能否對其進行解密。`backup restore` 將備份的房間金鑰匯入到本機加密存放區；如果復原金鑰已在磁碟上，您可以省略 `--recovery-key-stdin`。

若要使用新的基準替換損壞的備份（接受遺失無法復原的舊歷史記錄；如果目前的備份機密無法載入，也可以重建秘密存放區）：

```bash
openclaw matrix verify backup reset --yes
```

僅當您有意讓先前的復原金鑰停止解鎖新的備份基準時，才新增 `--rotate-recovery-key`。

### 列出、請求及回應驗證

```bash
openclaw matrix verify list
```

列出所選帳戶待處理的驗證請求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

從此 OpenClaw 帳戶傳送驗證請求。`--own-user` 請求自我驗證（您在同一使用者的另一個 Matrix 用戶端中接受提示）；`--user-id`/`--device-id`/`--room-id` 則以其他人為目標。`--own-user` 不能與其他目標標記一起使用。

對於較低層級的生命週期處理——通常是在監控來自其他用戶端的傳入請求時——這些指令針對特定的請求 `<id>`（由 `verify list` 和 `verify request` 列印）：

| 指令                                       | 用途                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受傳入請求                                                 |
| `openclaw matrix verify start <id>`        | 啟動 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 列印 SAS 表情符號或十進位數字                                |
| `openclaw matrix verify confirm-sas <id>`  | 確認 SAS 與另一個用戶端顯示的相符                            |
| `openclaw matrix verify mismatch-sas <id>` | 當表情符號或十進位數字不符時拒絕 SAS                         |
| `openclaw matrix verify cancel <id>`       | 取消；接受可選的 `--reason <text>` 和 `--code <matrix-code>` |

當驗證綁定至特定的直接訊息房間時，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 均接受 `--user-id` 和 `--room-id` 作為直接訊息後續提示。

### 多帳號說明

如果沒有 `--account <id>`，Matrix CLI 指令會使用隱含的預設帳號。如果您有多個命名帳號且未設定 `channels.matrix.defaultAccount`，它們將拒絕猜測並要求您選擇。當 E2EE 對命名帳號停用或無法使用時，錯誤訊息會指向該帳號的設定鍵，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="Startup behavior">
    有了 `encryption: true`，`startupVerification` 預設為 `"if-unverified"`。啟動時，未驗證的裝置會請求在另一個 Matrix 用戶端中進行自我驗證，跳過重複項並套用冷卻時間（預設為 24 小時）。可以使用 `startupVerificationCooldownHours` 調整，或使用 `startupVerification: "off"` 停用。

    啟動過程也會執行保守的加密引導程序，重複使用目前的金鑰儲存和跨簽署身分。如果引導狀態損壞，即使沒有 `channels.matrix.password`，OpenClaw 也會嘗試受控修復；如果主伺服器需要密碼 UIA，啟動會記錄警告並保持非致命性。已由擁有者簽署的裝置將被保留。

    請參閱 [Matrix migration](/zh-Hant/channels/matrix-migration) 以瞭解完整的升級流程。

  </Accordion>

  <Accordion title="驗證通知">
    Matrix 會將驗證生命週期通知以 `m.notice` 訊息的形式發佈到嚴格的 DM 驗證房間：請求、準備就緒（帶有「透過表情符號驗證」指引）、開始/完成，以及可用的 SAS（表情符號/十進位）詳細資料。

    來自其他 Matrix 用戶端的傳入請求會被追蹤並自動接受。對於自我驗證，OpenClaw 會自動啟動 SAS 流程，並在表情符號驗證可用時確認其自身的一方 — 您仍然需要在 Matrix 用戶端中比較並確認「它們相符」。

    驗證系統通知不會轉發到代理程式聊天管道。

  </Accordion>

  <Accordion title="已刪除或無效的 Matrix 裝置">
    如果 `verify status` 指出目前裝置已不再列於主伺服器上，請建立一個新的 OpenClaw Matrix 裝置。對於密碼登入：

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

    將 `assistant` 替換為失敗指令中的帳戶 ID，若是預設帳戶則可省略 `--account`。

  </Accordion>

  <Accordion title="裝置維護">
    舊的 OpenClaw 管理裝置可能會累積。列出並修剪：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="加密儲存">
    Matrix E2EE 使用官方的 `matrix-js-sdk` Rust 加密路徑，並以 `fake-indexeddb` 作為 IndexedDB 填充層。加密狀態會持久化至 `crypto-idb-snapshot.json`（限制性檔案權限）。

    加密執行時狀態位於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 之下，包含同步儲存、加密儲存、復原金鑰、IDB 快照、執行緒繫結以及啟動驗證狀態。當 Token 變更但帳戶身分保持不變時，OpenClaw 會重複使用最佳的現有根路徑，以便先前的狀態保持可見。

  </Accordion>
</AccordionGroup>

## 個人資料管理

更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次呼叫中傳遞這兩個選項。Matrix 直接接受 `mxc://` 頭像 URL；當您傳遞 `http://` 或 `https://` 時，OpenClaw 會先上傳檔案，並將解析出的 `mxc://` URL 儲存到 `channels.matrix.avatarUrl`（或帳號特定覆蓋設定）中。

## 主題串

Matrix 支援原生 Matrix 主題串，適用於自動回覆和訊息工具發送。有兩個獨立的選項控制此行為：

### 會話路由 (`sessionScope`)

`dm.sessionScope` 決定了 Matrix DM 房間如何對應到 OpenClaw 會話：

- `"per-user"`（預設值）：所有具有相同路由對等端 DM 房間共用一個會話。
- `"per-room"`：每個 Matrix DM 房間都有自己的會話金鑰，即使對等端相同也是如此。

明確的對話綁定總是優先於 `sessionScope`，因此綁定的房間和主題串會保留其選定的目標會話。

### 回覆主題串 (`threadReplies`)

`threadReplies` 決定了機器人發布回覆的位置：

- `"off"`：回覆位於頂層。傳入的主題串訊息保留在父會話上。
- `"inbound"`：僅當傳入訊息已經在該主題串中時，才在該主題串內回覆。
- `"always"`：在以觸發訊息為根的主題串內回覆；該對話從第一次觸發開始通過匹配的主題串範圍會話進行路由。

`dm.threadReplies` 僅針對 DM 覆蓋此設定 — 例如，保持房間主題串隔離，同時保持 DM 扁平化。

### 主題串繼承和斜線指令

- 傳入的主題串訊息包含主題串根訊息作為額外的代理程式上下文。
- 當目標是同一個房間（或同一個 DM 使用者目標）時，訊息工具發送會自動繼承目前的 Matrix 主題串，除非提供了明確的 `threadId`。
- DM 使用者目標重用僅在當前會話元資料證明同一 Matrix 帳戶上的同一 DM 對等端時才會生效；否則 OpenClaw 會回退到正常的使用者範圍路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定執行緒的 `/acp spawn` 均可在 Matrix 房間和 DM 中使用。
- 頂層 `/focus` 會建立一個新的 Matrix 執行緒，並在 `threadBindings.spawnSubagentSessions: true` 時將其綁定到目標工作階段。
- 在現有的 Matrix 執行緒中執行 `/focus` 或 `/acp spawn --thread here` 會將該執行緒原地綁定。

當 OpenClaw 偵測到 Matrix DM 房間與同一共用工作階段上的另一個 DM 房間衝突時，它會在該房間中張貼一次性的 `m.notice`，指向 `/focus` 逃生門，並建議進行 `dm.sessionScope` 變更。此通知僅在啟用執行緒綁定時顯示。

## ACP 對話綁定

Matrix 房間、DM 和現有的 Matrix 執行緒可以轉換為持久的 ACP 工作區，而無需變更聊天介面。

快速操作員流程：

- 在您想要繼續使用的 Matrix DM、房間或現有執行緒內執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix DM 或房間中，目前的 DM/房間保持為聊天介面，且未來的訊息會路由到生成的 ACP 工作階段。
- 在現有的 Matrix 執行緒內，`--bind here` 會將目前的執行緒原地綁定。
- `/new` 和 `/reset` 會在原地重設相同的綁定 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 執行緒。
- `threadBindings.spawnAcpSessions` 僅對 `/acp spawn --thread auto|here` 是必需的，在此情況下 OpenClaw 需要建立或綁定子 Matrix 執行緒。

### 執行緒綁定設定

Matrix 繼承來自 `session.threadBindings` 的全域預設值，並且也支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 執行緒綁定的生成旗標為選用：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 訊息串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 會話綁定到 Matrix 訊息串。

## 反應

Matrix 支援傳出反應、傳入反應通知以及 ack 反應。

傳出反應工具受 `channels.matrix.actions.reactions` 控制：

- `react` 會對 Matrix 事件新增反應。
- `reactions` 會列出 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人在該事件上的自身反應。
- `remove: true` 僅會移除機器人指定的 emoji 反應。

**解析順序**（先定義的值優先）：

| 設定                    | 順序                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `ackReaction`           | 每個帳戶 → 頻道 → `messages.ackReaction` → 代理身份 emoji 備援          |
| `ackReactionScope`      | 每個帳戶 → 頻道 → `messages.ackReactionScope` → 預設 `"group-mentions"` |
| `reactionNotifications` | 每個帳戶 → 頻道 → 預設 `"own"`                                          |

`reactionNotifications: "own"` 會在新增的 `m.reaction` 事件目標為機器人發送的 Matrix 訊息時進行轉發；`"off"` 會停用反應系統事件。反應移除不會被合成為系統事件，因為 Matrix 將其顯示為撤回，而非獨立的 `m.reaction` 移除。

## 歷史紀錄上下文

- `channels.matrix.historyLimit` 控制當 Matrix 房間訊息觸發代理時，有多少最近的房間訊息會包含為 `InboundHistory`。會回退到 `messages.groupChat.historyLimit`；若兩者均未設定，有效預設值為 `0`。設定 `0` 可停用。
- Matrix 房間歷史紀錄僅限房間。DM 會繼續使用一般會話歷史紀錄。
- Matrix 房間歷史紀錄僅限未決訊息：OpenClaw 會緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時擷取該視窗的快照。
- 目前的觸發訊息並未包含在 `InboundHistory` 中；它會保留在該回合的主要輸入內容中。
- 相同 Matrix 事件的重試會重用原始的歷史快照，而不是向前漂移到較新的房間訊息。

## 內容可見性

Matrix 支援共用的 `contextVisibility` 控制項，用於額外的房間內容，例如擷取的回覆文字、討論串根節點和待處理歷史記錄。

- `contextVisibility: "all"` 是預設值。額外內容會保留接收時的樣子。
- `contextVisibility: "allowlist"` 會過濾額外內容，僅保留有效房間/使用者允許清單檢查所允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍保留一則明確的引用回覆。

此設定會影響額外內容的可見性，而不影響輸入訊息本身是否能觸發回覆。
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

若要在保持房間運作的同時完全靜音 DM，請設定 `dm.enabled: false`：

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

請參閱 [群組](/zh-Hant/channels/groups) 以了解提及封鎖和允許清單行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 使用者在批准前持續傳送訊息給您，OpenClaw 會重用相同的待處理配對碼，並可能經過短暫冷卻後發送提醒回覆，而不是產生新代碼。

請參閱 [配對](/zh-Hant/channels/pairing) 以了解共用的 DM 配對流程和儲存佈局。

## 直接修復房間

如果直接訊息狀態漂移不同步，OpenClaw 可能會保留過時的 `m.direct` 對應，指向舊的單獨房間而非目前使用的 DM。檢查對象目前的對應：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

進行修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

這兩個指令都接受 `--account <id>` 以用於多帳號設定。修復流程：

- 偏好已於 `m.direct` 中對應的嚴格 1:1 DM
- 退而求其次，使用任何目前已加入的與該使用者的嚴格 1:1 DM
- 如果沒有健全的 DM，則建立全新的直接房間並重寫 `m.direct`

它不會自動刪除舊房間。它會選擇健康的私訊並更新對應，以便未來的 Matrix 傳送、驗證通知和其他私訊流程將目標鎖定在正確的房間。

## 執行審核

Matrix 可充當原生審核用戶端。在 `channels.matrix.execApprovals` 下設定（或使用 `channels.matrix.accounts.<account>.execApprovals` 進行每個帳號的覆寫）：

- `enabled`：透過 Matrix 原生提示傳遞審核。當未設定或設為 `"auto"` 時，一旦能解析至少一位審核者，Matrix 將會自動啟用。設定 `false` 以明確停用。
- `approvers`：允許批准執行請求的 Matrix 使用者 ID（`@owner:example.org`）。可選 — 預設為 `channels.matrix.dm.allowFrom`。
- `target`：提示發送的位置。`"dm"`（預設）發送給審核者的私訊；`"channel"` 發送到原始 Matrix 房間或私訊；`"both"` 發送到兩者。
- `agentFilter` / `sessionFilter`：可選的允許清單，用於指定哪些代理/會話觸發 Matrix 傳遞。

不同種類的審核，其授權方式略有不同：

- **執行審核** 使用 `execApprovals.approvers`，並回退到 `dm.allowFrom`。
- **外掛程式審核** 僅透過 `dm.allowFrom` 進行授權。

這兩種類型都共用 Matrix 反應捷徑和訊息更新。審核者會在主要審核訊息上看到反應捷徑：

- `✅` 允許一次
- `❌` 拒絕
- `♾️` 總是允許（當有效的執行策略允許時）

備用斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的審核者才能批准或拒絕。執行審核的頻道傳遞包含指令文字 — 僅在受信任的房間中啟用 `channel` 或 `both`。

相關：[執行審核](/zh-Hant/tools/exec-approvals)。

## 斜線指令

斜線指令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）在 DM 中可直接使用。在房間中，OpenClaw 也識別以機器人自己的 Matrix 提及為前綴的指令，因此 `@bot:server /new` 會在不使用自訂提及正則表達式的情況下觸發指令路徑。這使機器人能夠回應 Element 和類似客戶端在使用者輸入指令前自動補全機器人時所發出的房間風格 `@mention /command` 訊息。

授權規則仍然適用：指令發送者必須滿足與普通訊息相同的 DM 或房間允許清單/所有者政策。

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

- 頂層 `channels.matrix` 值作為命名帳號的預設值，除非該帳號覆寫了它們。
- 使用 `groups.<room>.account` 將繼承的房間條目限定於特定帳號。沒有 `account` 的條目在帳號之間共享；當在頂層配置預設帳號時，`account: "default"` 仍然有效。

**預設帳號選擇：**

- 設定 `defaultAccount` 以選取隱式路由、探測和 CLI 指令偏好的命名帳號。
- 如果您有多個帳號且其中一個字面上被命名為 `default`，即使未設定 `defaultAccount`，OpenClaw 也會隱式使用它。
- 如果您有多個命名帳號且未選擇預設帳號，CLI 指令將拒絕猜測 — 請設定 `defaultAccount` 或傳遞 `--account <id>`。
- 當頂層 `channels.matrix.*` 區塊的授權完成（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`）時，它才會被視為隱式 `default` 帳號。一旦快取的憑證涵蓋了授權，命名帳號仍可從 `homeserver` + `userId` 發現。

**升級：**

- 當 OpenClaw 在修復或設定期間將單一帳號配置升級為多帳號時，如果存在現有的命名帳號或 `defaultAccount` 已經指向一個帳號，它將保留該帳號。只有 Matrix 授權/啟動金鑰會移至升級後的帳號；共用的遞送策略金鑰保留在頂層。

請參閱 [設定參考](/zh-Hant/gateway/config-channels#multi-account-all-channels) 以了解共用的多帳號模式。

## 私人/LAN 主伺服器

預設情況下，為了防止 SSRF 攻擊，OpenClaw 會封鎖私人/內部 Matrix 主伺服器，除非您
針對每個帳號明確選擇加入。

如果您的主伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳號啟用
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

此選擇加入僅允許受信任的私人/內部目標。公開的明文主伺服器（例如
`http://matrix.example.org:8008`）仍會被封鎖。請盡可能偏好 `https://`。

## Proxying Matrix 流量

如果您的 Matrix 部署需要明確的傳出 HTTP(S) Proxy，請設定 `channels.matrix.proxy`：

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
OpenClaw 對執行時 Matrix 流量和帳號狀態探測使用相同的 Proxy 設定。

## 目標解析

Matrix 接受這些目標格式，無論 OpenClaw 何時要求您提供房間或使用者目標：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房間 ID 區分大小寫。在設定明確的遞送目標、Cron 工作、綁定或允許清單時，請使用 Matrix 中的確切房間 ID 大小寫。
OpenClaw 將內部會話金鑰保持規範形式以便儲存，因此這些小寫
金鑰不是 Matrix 遞送 ID 的可靠來源。

即時目錄查詢使用已登入的 Matrix 帳號：

- 使用者查詢會查詢該主伺服器上的 Matrix 使用者目錄。
- 房間查詢直接接受明確的房間 ID 和別名，然後回退到搜尋該帳號已加入的房間名稱。
- 已加入房間名稱查詢為盡力而為。如果房間名稱無法解析為 ID 或別名，則在運行時允許清單解析中會將其忽略。

## 設定參考

Allowlist 樣式的欄位（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`）接受完整的 Matrix 使用者 ID（最安全）。確切的目錄匹配項會在啟動時以及監視器運行期間允許清單變更時進行解析；無法解析的項目在運行時會被忽略。基於同樣的原因，房間允許清單優先使用房間 ID 或別名。

### 帳戶與連線

- `enabled`：啟用或停用此頻道。
- `name`：帳戶的選用顯示標籤。
- `defaultAccount`：當設定了多個 Matrix 帳戶時，優先使用的帳戶 ID。
- `accounts`：具名每個帳戶的覆寫。頂層 `channels.matrix` 值會被繼承為預設值。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允許此帳戶連線至 `localhost`、LAN/Tailscale IP 或內部主機名稱。
- `proxy`：Matrix 流量的選用 HTTP(S) 代理伺服器 URL。支援每個帳戶的覆寫。
- `userId`：完整的 Matrix 使用者 ID（`@bot:example.org`）。
- `accessToken`：基於 Token 驗證的存取 Token。支援跨 env/file/exec 提供者的純文字與 SecretRef 值（[Secrets Management](/zh-Hant/gateway/secrets)）。
- `password`：基於密碼登入的密碼。支援純文字與 SecretRef 值。
- `deviceId`：明確指定的 Matrix 裝置 ID。
- `deviceName`：在密碼登入時使用的裝置顯示名稱。
- `avatarUrl`：儲存的自我頭像 URL，用於個人資料同步與 `profile set` 更新。
- `initialSyncLimit`：在啟動同步期間取得的事件最大數量。

### 加密

- `encryption`：啟用 E2EE。預設值：`false`。
- `startupVerification`：`"if-unverified"`（E2EE 開啟時的預設值）或 `"off"`。當此裝置未驗證時，在啟動時自動請求自我驗證。
- `startupVerificationCooldownHours`：下一次自動啟動請求前的冷卻時間。預設值：`24`。

### 存取與政策

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。預設值：`"allowlist"`。
- `groupAllowFrom`：用於房間流量的使用者 ID 白名單。
- `dm.enabled`：當 `false` 時，忽略所有 DM。預設值：`true`。
- `dm.policy`：`"pairing"`（預設值）、`"allowlist"`、`"open"` 或 `"disabled"`。在機器人加入並將房間分類為 DM 後套用；不影響邀請處理。
- `dm.allowFrom`：用於 DM 流量的使用者 ID 白名單。
- `dm.sessionScope`：`"per-user"`（預設值）或 `"per-room"`。
- `dm.threadReplies`：僅限 DM 的回覆主題串覆寫（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受來自其他已設定 Matrix 機器人帳戶的訊息（`true` 或 `"mentions"`）。
- `allowlistOnly`：當 `true` 時，強制將所有作用中的 DM 政策（`"disabled"` 除外）和 `"open"` 群組政策設為 `"allowlist"`。不變更 `"disabled"` 政策。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。預設值：`"off"`。套用於每個 Matrix 邀請，包括 DM 樣式的邀請。
- `autoJoinAllowlist`：當 `autoJoin` 為 `"allowlist"` 時允許的房間/別名。別名條目是根據主伺服器解析的，而不是根據被邀請房間聲稱的狀態。
- `contextVisibility`：補充上下文可見性（`"all"` 預設，`"allowlist"`，`"allowlist_quote"`）。

### 回覆行為

- `replyToMode`：`"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`：針對綁定線程的會話路由和生命週期的每頻道覆蓋設定。
- `streaming`：`"off"`（預設）、`"partial"`、`"quiet"`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`：當 `true` 時，完成的助手區塊將保留為單獨的進度訊息。
- `markdown`：用於輸出文本的可選 Markdown 渲染設定。
- `responsePrefix`：附加到輸出回覆的可選字串。
- `textChunkLimit`：當 `chunkMode: "length"` 時的輸出區塊大小（以字元計）。預設值：`4000`。
- `chunkMode`：`"length"`（預設，按字元計數分割）或 `"newline"`（在行邊界分割）。
- `historyLimit`：當房間訊息觸發代理時，包含為 `InboundHistory` 的最近房間訊息數量。回退至 `messages.groupChat.historyLimit`；有效預設值 `0`（已停用）。
- `mediaMaxMb`：用於輸出傳送和輸入處理的媒體大小上限（MB）。

### 回應設定

- `ackReaction`：此通道/帳號的 ack 反應覆寫。
- `ackReactionScope`：範圍覆寫（`"group-mentions"` 預設、`"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`：傳入反應通知模式（`"own"` 預設、`"off"`）。

### 工具與各房間覆寫

- `actions`：依動作控制的工具閘道（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：各房間原則映射。Session identity 在解析後使用穩定的房間 ID。（`rooms` 是舊版別名。）
  - `groups.<room>.account`：將一個繼承的房間項目限制在特定帳號。
  - `groups.<room>.allowBots`：通道層級設定的各房間覆寫（`true` 或 `"mentions"`）。
  - `groups.<room>.users`：各房間傳送者允許清單。
  - `groups.<room>.tools`：各房間工具允許/拒絕覆寫。
  - `groups.<room>.autoReply`：各房間提及閘道覆寫。`true` 會停用該房間的提及要求；`false` 則會強制重新啟用。
  - `groups.<room>.skills`：各房間技能篩選器。
  - `groups.<room>.systemPrompt`：各房間系統提示片段。

### 執行審核設定

- `execApprovals.enabled`：透過 Matrix 原生提示傳送執行審核。
- `execApprovals.approvers`：允許審核的 Matrix 使用者 ID。會回退至 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（預設）、`"channel"`，或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：選用的傳遞代理/會話允許清單。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘控
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
