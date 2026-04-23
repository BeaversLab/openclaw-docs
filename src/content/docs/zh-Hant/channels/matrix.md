---
summary: "Matrix 支援狀態、設定與配置範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 的內建頻道外掛程式。
它使用官方的 `matrix-js-sdk`，並支援 DM、房間、主題串、媒體、回應、投票、位置和 E2EE。

## 內建外掛

Matrix 在目前的 OpenClaw 版本中作為內建外掛發布，因此一般的打包版本無需額外安裝。

如果您使用的是較舊的版本或未包含 Matrix 的自訂安裝版本，請
手動安裝：

從 npm 安裝：

```bash
openclaw plugins install @openclaw/matrix
```

從本地副本安裝：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解插件行為與安裝規則。

## 設定

1. 確保 Matrix 外掛可用。
   - 目前的 OpenClaw 打包版本已內建此外掛。
   - 較舊或自訂的安裝版本可使用上述指令手動新增。
2. 在您的 homeserver 上建立一個 Matrix 帳號。
3. 使用以下其中一種方式設定 `channels.matrix`：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重新啟動 gateway。
5. 與機器人開始私訊，或將其邀請至聊天室。
   - 新的 Matrix 邀請只有在 `channels.matrix.autoJoin` 允許時才有效。

互動式設定路徑：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 精靈會詢問：

- 主伺服器網址
- 驗證方式：存取權杖或密碼
- 使用者 ID（僅限密碼驗證）
- 選用的裝置名稱
- 是否啟用 E2EE
- 是否要設定房間存取權和邀請自動加入

關鍵精靈行為：

- 如果 Matrix 驗證的環境變數已經存在，且該帳戶尚未在設定中儲存驗證資訊，精靈會提供環境變數捷徑以將驗證資訊保留在環境變數中。
- 帳戶名稱會正規化為帳戶 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- DM 允許清單項目直接接受 `@user:server`；顯示名稱僅在即時目錄查詢找到一個完全相符的項目時才有效。
- 房間允許清單項目直接接受房間 ID 和別名。建議優先使用 `!room:server` 或 `#alias:server`；未解析的名稱會在執行時期被允許清單解析忽略。
- 在邀請自動加入允許清單模式下，請僅使用穩定的邀請目標：`!roomId:server`、`#alias:server` 或 `*`。純房間名稱會被拒絕。
- 若要在儲存前解析房間名稱，請使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 預設為 `off`。

如果您不設定它，機器人將不會加入受邀請的房間或新的 DM 式邀請，因此除非您先手動加入，否則它不會出現在新群組或受邀請的 DM 中。

設定 `autoJoin: "allowlist"` 搭配 `autoJoinAllowlist` 以限制其接受的邀請，或者如果您希望它加入每個邀請，請設定 `autoJoin: "always"`。

在 `allowlist` 模式下，`autoJoinAllowlist` 僅接受 `!roomId:server`、`#alias:server` 或 `*`。

</Warning>

允許清單範例：

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

加入每個邀請：

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

最基本的基於權杖的設定：

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

基於密碼的設定（權杖會在登入後快取）：

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

Matrix 會將快取的憑證儲存在 `~/.openclaw/credentials/matrix/` 中。
預設帳號使用 `credentials.json`；命名帳號使用 `credentials-<account>.json`。
當該處存在快取憑證時，即使當前授權未直接在 config 中設定，OpenClaw 也會將 Matrix 視為已設定，可用於 setup、doctor 和 channel-status discovery。

對應的環境變數（當未設定 config key 時使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

對於非預設帳號，請使用帳號範圍的環境變數：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

帳號 `ops` 的範例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

對於標準化的帳號 ID `ops-bot`，請使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 會對帳號 ID 中的標點符號進行跳脫，以確保範圍環境變數不會發生衝突。
例如，`-` 會變成 `_X2D_`，因此 `ops-prod` 會對應到 `MATRIX_OPS_X2D_PROD_*`。

互動式精靈僅在這些授權環境變數已存在，且選定的帳號尚未在 config 中儲存 Matrix 授權時，才會提供環境變數捷徑。

## 設定範例

這是一個具備 DM 配對、房間允許清單和已啟用 E2EE 的實用基線設定：

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
        "!roomid:example.org": {
          requireMention: true,
        },
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

`autoJoin` 適用於所有 Matrix 邀請，包括 DM 樣式的邀請。由於 OpenClaw 無法在收到邀請時可靠地將被邀請的房間分類為 DM 或群組，因此所有邀請都會先經過 `autoJoin`。`dm.policy` 會在機器人加入房間且該房間被分類為 DM 之後套用。

## 串流預覽

Matrix 回覆串流為選用功能。

當您希望 OpenClaw 發送單個即時預覽回覆、在模型生成文字時就地編輯該預覽，並在回覆完成時將其最終確定時，請將 `channels.matrix.streaming` 設定為 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是預設值。OpenClaw 會等待最終回覆並發送一次。
- `streaming: "partial"` 使用一般 Matrix 文字訊息為目前的助手區塊建立一個可編輯的預覽訊息。這保留了 Matrix 舊有的「預覽優先」通知行為，因此原版客戶端可能會在第一次串流預覽文字時通知，而不是在完成的區塊時通知。
- `streaming: "quiet"` 會為目前的助手區塊建立一個可編輯的靜默預覽通知。僅在您也為已最終確定的預覽編輯設定了接收者推送規則時才使用此選項。
- `blockStreaming: true` 啟用獨立的 Matrix 進度訊息。啟用預覽串流後，Matrix 會保留目前區塊的即時草稿，並將已完成的區塊保留為單獨的訊息。
- 當預覽串流開啟且 `blockStreaming` 關閉時，Matrix 會就地編輯即時草稿，並在區塊或輪次完成時最終確定該事件。
- 如果預覽不再適合放入單一 Matrix 事件中，OpenClaw 將停止預覽串流並回退到一般的最終傳送。
- 媒體回覆仍會正常發送附件。如果過期的預覽無法再被安全重複使用，OpenClaw 將在發送最終媒體回覆之前將其撤回。
- 預覽編輯會產生額外的 Matrix API 呼叫。如果您希望最保守的速率限制行為，請將串流保持關閉。

`blockStreaming` 本身並不啟用草稿預覽。
請使用 `streaming: "partial"` 或 `streaming: "quiet"` 進行預覽編輯；然後僅在您也希望已完成的助手區塊保持可見作為單獨的進度訊息時，才加入 `blockStreaming: true`。

如果您需要不需自訂推送規則的原版 Matrix 通知，請使用 `streaming: "partial"` 進行預覽優先行為，或將 `streaming` 保持關閉以僅在最終階段傳送。若使用 `streaming: "off"`：

- `blockStreaming: true` 會將每個完成的區塊作為一般的通知 Matrix 訊息發送。
- `blockStreaming: false` 僅將最終完成的回覆作為一般的 Matrix 通知訊息發送。

### 用於安靜完成預覽的自託管推送規則

如果您自行託管 Matrix 基礎設施，並且希望安靜預覽僅在區塊或最終回覆完成時發出通知，請設定 `streaming: "quiet"` 並為完成的預覽編輯新增針對個別使用者的推送規則。

這通常是接收使用者的設定，而不是主伺服器的全域配置變更：

開始之前的快速對應：

- recipient user = 應該接收通知的人
- bot user = 發送回覆的 OpenClaw Matrix 帳號
- 在以下 API 呼叫中使用接收使用者的存取權杖
- 將推送規則中的 `sender` 與機器人使用者的完整 MXID 進行比對

1. 設定 OpenClaw 使用安靜預覽：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 請確保接收帳號已經能接收正常的 Matrix 推送通知。安靜預覽規則只有在該使用者已有可運作的推送器/裝置時才會生效。

3. 取得接收使用者的存取權杖。
   - 使用接收使用者的權杖，而不是機器人的權杖。
   - 重複使用現有的客戶端工作階段權杖通常是最簡單的方法。
   - 如果您需要產生新的權杖，可以透過標準的 Matrix Client-Server API 登入：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": {
      "type": "m.id.user",
      "user": "@alice:example.org"
    },
    "password": "REDACTED"
  }'
```

4. 驗證接收帳號是否已有推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果此操作未傳回任何使用中的推送器/裝置，請先修正正常的 Matrix 通知，然後再新增以下的 OpenClaw 規則。

OpenClaw 會以以下標記標示完成的純文字預覽編輯：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 為每個應接收這些通知的接收帳號建立一個覆寫推送規則：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

執行指令前請替換這些值：

- `https://matrix.example.org`：您的主伺服器基礎 URL
- `$USER_ACCESS_TOKEN`：接收使用者的存取權杖
- `openclaw-finalized-preview-botname`：一個對於此機器人與此接收使用者而言唯一的規則 ID
- `@bot:example.org`：您的 OpenClaw Matrix 機器人 MXID，而非接收使用者的 MXID

多機器人設定的重要事項：

- 推送規則是以 `ruleId` 為鍵值。對相同的規則 ID 重新執行 `PUT` 會更新該規則。
- 如果一個接收使用者應對多個 OpenClaw Matrix 機器人帳號發出通知，請為每個機器人建立一個規則，並為每個發送者比對使用唯一的規則 ID。
- 一個簡單的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

該規則是根據事件發送者進行評估的：

- 使用接收使用者的 token 進行驗證
- 將 `sender` 與 OpenClaw bot 的 MXID 進行比對

6. 驗證規則是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 測試串流回應。在靜音模式下，房間應顯示靜音的草稿預覽，且當區塊或輪次完成時，最終的原地編輯應發送一次通知。

如果您稍後需要移除該規則，請使用接收使用者的 token 刪除相同的規則 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

備註：

- 使用接收使用者的存取 token 建立規則，而非 bot 的 token。
- 新的使用者自定義 `override` 規則會插入在預設抑制規則之前，因此不需要額外的排序參數。
- 這僅影響 OpenClaw 可以安全地原地完成的純文字預覽編輯。媒體回退和過時預覽回退仍使用正常的 Matrix 傳遞。
- 如果 `GET /_matrix/client/v3/pushers` 顯示沒有 pushers，則該使用者此帳號/裝置尚未有運作正常的 Matrix 推送傳遞。

#### Synapse

對於 Synapse，上述設定通常就已足夠：

- 針對已完成的 OpenClaw 預覽通知，不需要特殊的 `homeserver.yaml` 變更。
- 如果您的 Synapse 部署已發送正常的 Matrix 推送通知，則上述使用者 token + `pushrules` 呼叫是主要的設定步驟。
- 如果您在反向代理或 worker 後方執行 Synapse，請確保 `/_matrix/client/.../pushrules/` 正確到達 Synapse。
- 如果您執行 Synapse worker，請確保 pushers 運作正常。推送傳遞由主程序或 `synapse.app.pusher` / 已設定的 pusher worker 處理。

#### Tuwunel

對於 Tuwunel，請使用上述顯示的相同設定流程和 push-rule API 呼叫：

- 對於已完成的預覽標記本身，不需要 Tuwunel 特有的設定。
- 如果正常的 Matrix 通知已對該使用者運作，則上述使用者 token + `pushrules` 呼叫是主要的設定步驟。
- 如果使用者在另一台裝置上活動時通知似乎消失，請檢查是否已啟用 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 版本中新增了此選項，當一台裝置處於活動狀態時，它會刻意抑制推送到其他裝置的通知。

## Bot 對 Bot 房間

預設情況下，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息會被忽略。

當您刻意需要代理程式之間的 Matrix 流量時，請使用 `allowBots`：

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

- `allowBots: true` 會在允許的房間和 DM 中接受來自其他已設定 Matrix 機器人帳號的訊息。
- `allowBots: "mentions"` 僅在房間中明確提及此機器人時才接受這些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- 為了避免自我回覆迴圈，OpenClaw 仍會忽略來自相同 Matrix 使用者 ID 的訊息。
- Matrix 在此處未公開原生機器人旗標；OpenClaw 將「機器人撰寫」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳號傳送」。

在共用房間中啟用 Bot 對 Bot 流量時，請使用嚴格的房間允許清單和提及要求。

## 加密與驗證

在加密 (E2EE) 房間中，傳出圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密房間仍使用純文字 `thumbnail_url`。不需要任何設定 — 外掛程式會自動檢測 E2EE 狀態。

啟用加密：

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

檢查驗證狀態：

```bash
openclaw matrix verify status
```

詳細狀態 (完整診斷)：

```bash
openclaw matrix verify status --verbose
```

在機器可讀的輸出中包含儲存的復原金鑰：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導交叉簽署和驗證狀態：

```bash
openclaw matrix verify bootstrap
```

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導之前強制重設全新的交叉簽署身分：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用復原金鑰驗證此裝置：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

詳細裝置驗證資訊：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

檢查房間金鑰備份健康狀況：

```bash
openclaw matrix verify backup status
```

詳細備份健康狀況診斷：

```bash
openclaw matrix verify backup status --verbose
```

從伺服器備份還原房間金鑰：

```bash
openclaw matrix verify backup restore
```

詳細還原診斷：

```bash
openclaw matrix verify backup restore --verbose
```

刪除目前的伺服器備份並建立全新的備份基準。如果儲存的備份金鑰無法乾淨地載入，此重設也可以重建秘密儲存空間，以便未來的冷啟動可以載入新的備份金鑰：

```bash
openclaw matrix verify backup reset --yes
```

預設情況下，所有 `verify` 指令皆為精簡模式（包括安靜的內部 SDK 記錄），並且僅在使用 `--verbose` 時顯示詳細診斷資訊。
在編寫腳本時，請使用 `--json` 以取得完整的機器可讀輸出。

在多重帳號設定中，Matrix CLI 指令會使用隱含的 Matrix 預設帳號，除非您傳入 `--account <id>`。
如果您設定了多個具名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將會停止並要求您明確選擇一個帳號。
每當您希望驗證或裝置操作以特定具名帳號為目標時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當具名帳號停用加密或無法使用加密時，Matrix 警告和驗證錯誤會指向該帳號的設定鍵，例如 `channels.matrix.accounts.assistant.encryption`。

### 「已驗證」的含義

僅當此 Matrix 裝置經過您自己的跨簽署 身份驗證時，OpenClaw 才會將其視為已驗證。
實際上，`openclaw matrix verify status --verbose` 揭示了三種信任訊號：

- `Locally trusted`：此裝置僅受目前用戶端信任
- `Cross-signing verified`：SDK 報告該裝置已透過跨簽署驗證
- `Signed by owner`：該裝置由您自己的自我簽署金鑰 簽署

`Verified by owner` 僅在存在跨簽署驗證或擁有者簽署 時才會變成 `yes`。
單獨的本地信任不足以讓 OpenClaw 將該裝置視為完全已驗證。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定已加密 Matrix 帳號的指令。
它會依序執行以下所有操作：

- 啟動秘密儲存，並在可能時重複使用現有的復原金鑰
- 啟動跨簽署並上傳遺失的公開跨簽署金鑰
- 嘗試標記並跨簽署目前的裝置
- 如果伺服器端房間金鑰備份不存在，則建立新的備份

如果主伺服器需要互動式驗證才能上傳跨簽署金鑰，OpenClaw 會先嘗試在不驗證的情況下上傳，然後使用 `m.login.dummy`，接著在設定 `channels.matrix.password` 時使用 `m.login.password`。

僅當您有意捨棄目前的交叉簽署身分並建立新的身分時，才使用 `--force-reset-cross-signing`。

如果您有意捨棄目前的金鑰備份並為未來的訊息建立新的備份基準，請使用 `openclaw matrix verify backup reset --yes`。
僅當您接受無法恢復的舊加密歷史將保持不可用，且若目前的備份密鑰無法安全載入，OpenClaw 可能會重建秘密儲存時，才執行此操作。

### 全新的備份基準

如果您想讓未來的加密訊息正常運作並接受遺失無法恢復的舊歷史，請依序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想要明確指定命名的 Matrix 帳號時，請在每個指令中加入 `--account <id>`。

### 啟動行為

當 `encryption: true` 時，Matrix 預設將 `startupVerification` 設為 `"if-unverified"`。
啟動時，若此裝置仍未驗證，Matrix 將會在另一個 Matrix 用戶端中請求自我驗證，
在請求已待處理時跳過重複請求，並在重啟後重試前套用本機冷卻。
預設情況下，失敗的請求嘗試比成功建立請求更早重試。
設定 `startupVerification: "off"` 以停用自動啟動請求，或調整 `startupVerificationCooldownHours`
如果您想要更短或更長的重試視窗。

啟動時也會自動執行保守的加密引導流程。
該流程會嘗試優先重用目前的秘密儲存和交叉簽署身分，並避免重置交叉簽署，除非您執行明確的引導修復流程。

如果啟動時仍然發現引導狀態損壞，即使未配置 `channels.matrix.password`，OpenClaw 也會嘗試受保護的修復路徑。
如果主伺服器要求基於密碼的 UIA 來進行該修復，OpenClaw 會記錄警告並保持啟動不致嚴重失敗，而不是中止機器人。
如果目前裝置已由擁有者簽署，OpenClaw 將保留該身分，而不是自動重設它。

請參閱 [Matrix migration](/zh-Hant/install/migrating-matrix) 以了解完整的升級流程、限制、恢復指令與常見的遷移訊息。

### 驗證通知

Matrix 會將驗證生命週期通知直接以 `m.notice` 訊息的形式發佈到嚴格的 DM 驗證房間中。
這包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過表情符號驗證」指引）
- 驗證開始與完成通知
- 可用的 SAS 詳細資訊（表情符號與十進位數字）

來自另一個 Matrix 客戶端的驗證請求會被 OpenClaw 追蹤並自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認自身這一方。
對於來自另一個 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受該請求，然後等待 SAS 流程正常進行。
您仍然需要在您的 Matrix 客戶端中比較表情符號或十進位 SAS，並在那裡確認「相符」以完成驗證。

OpenClaw 不會盲目地自動接受自我發起的重複流程。當自我驗證請求已經處於擱置狀態時，啟動過程會跳過建立新請求。

驗證協議/系統通知不會轉發到代理程式聊天管道，因此它們不會產生 `NO_REPLY`。

### 裝置清理

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳戶上累積，使得加密聊天室的信任更難以判斷。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除過時的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 加密儲存

Matrix E2EE 使用官方的 `matrix-js-sdk` Rust 加密路徑（於 Node 中），並以 `fake-indexeddb` 作為 IndexedDB shim。加密狀態會持久化到快照檔案 (`crypto-idb-snapshot.json`) 並在啟動時還原。快照檔案是儲存在具有嚴格檔案權限下的敏感執行時狀態。

加密的執行時狀態存在於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中每個帳戶、每個使用者 token-hash 的根目錄下。
該目錄包含同步儲存 (`bot-storage.json`)、加密儲存 (`crypto/`)、
金鑰恢復檔案 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
執行緒綁定 (`thread-bindings.json`) 以及啟動驗證狀態 (`startup-verification.json`)。
當 token 變更但帳戶身分保持不變時，OpenClaw 會為該帳戶/家伺服器/使用者元組重用最佳的現有
根目錄，以便先前的同步狀態、加密狀態、執行緒綁定
和啟動驗證狀態保持可見。

## 個人資料管理

使用以下指令更新所選帳戶的 Matrix 自我個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

當您想要明確指定特定的 Matrix 帳戶時，請新增 `--account <id>`。

Matrix 直接接受 `mxc://` 頭像 URL。當您傳遞 `http://` 或 `https://` 頭像 URL 時，OpenClaw 會先將其上傳至 Matrix，並將解析後的 `mxc://` URL 儲存回 `channels.matrix.avatarUrl`（或選定的帳戶覆蓋設定）。

## 討論串

Matrix 支援原生 Matrix 討論串，適用於自動回覆和訊息工具傳送。

- `dm.sessionScope: "per-user"`（預設值）保持 Matrix DM 路由為傳送者範圍，因此當多個 DM 房間解析至同一對等方時，可以共享一個工作階段。
- `dm.sessionScope: "per-room"` 將每個 Matrix DM 房間隔離到其自己的工作階段金鑰中，同時仍使用正常的 DM 認證和允許清單檢查。
- 明確的 Matrix 對話綁定仍然優先於 `dm.sessionScope`，因此綁定的房間和討論串會保留其選定的目標工作階段。
- `threadReplies: "off"` 保持回覆位於頂層，並將傳入的討論串訊息保留在父工作階段上。
- `threadReplies: "inbound"` 僅在傳入訊息已經在該討論串中時，才在討論串內回覆。
- `threadReplies: "always"` 將房間回覆保持在以觸發訊息為根的討論串中，並透過來自第一個觸發訊息的相符討論串範圍工作階段來路由該對話。
- `dm.threadReplies` 僅針對 DM 覆蓋頂層設定。例如，您可以保持房間討論串隔離，同時保持 DM 為扁平結構。
- 傳入的討論串訊息包含討論串根訊息作為額外的代理程式上下文。
- 當目標是同一房間或同一 DM 使用者目標時，訊息工具傳送會自動繼承目前的 Matrix 討論串，除非提供了明確的 `threadId`。
- 僅當目前工作階段中繼資料證明在相同 Matrix 帳戶上具有相同的 DM 對等方時，才會啟用同工作階段 DM 使用者目標重複使用；否則 OpenClaw 會回退到正常的使用者範圍路由。
- 當 OpenClaw 發現 Matrix DM 聊天室與同一個共享 Matrix DM 會話中的另一個 DM 聊天室發生衝突時，如果在啟用執行緒綁定時並且有 `dm.sessionScope` 提示，它會在該聊天室中發佈一次性的 `m.notice`，其中包含 `/focus` 應急措施。
- Matrix 支援執行時期執行緒綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及執行緒綁定的 `/acp spawn` 在 Matrix 聊天室和 DM 中有效。
- 頂層 Matrix 聊天室/DM `/focus` 會在 `threadBindings.spawnSubagentSessions=true` 時建立一個新的 Matrix 執行緒並將其綁定到目標會話。
- 在現有的 Matrix 執行緒中執行 `/focus` 或 `/acp spawn --thread here` 則會綁定該當前執行緒。

## ACP 對話綁定

Matrix 聊天室、DM 和現有的 Matrix 執行緒可以轉換為持久的 ACP 工作區，而無需變更聊天介面。

快速操作員流程：

- 在您想要繼續使用的 Matrix DM、聊天室或現有執行緒中執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix DM 或聊天室中，當前的 DM/聊天室保持為聊天介面，且未來的訊息會路由到產生的 ACP 會話。
- 在現有的 Matrix 執行緒內部，`--bind here` 會就地綁定該當前執行緒。
- `/new` 和 `/reset` 會就地重設相同的綁定 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 執行緒。
- `threadBindings.spawnAcpSessions` 僅對 `/acp spawn --thread auto|here` 是必需的，在這種情況下 OpenClaw 需要建立或綁定子 Matrix 執行緒。

### 執行緒綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且也支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 執行緒綁定的產生標誌是選用的：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 討論串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 會話綁定到 Matrix 討論串。

## 反應

Matrix 支援輸出反應操作、輸入反應通知以及輸入 ack 反應。

- 輸出反應工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 會對特定的 Matrix 事件新增反應。
- `reactions` 會列出特定 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人帳戶在該事件上的所有反應。
- `remove: true` 僅會從機器人帳戶移除指定的 emoji 反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理程式身分 emoji 後備

Ack 反應範圍依以下順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式依以下順序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 預設：`own`

行為：

- 當新增的 `m.reaction` 事件目標為機器人發送的 Matrix 訊息時，`reactionNotifications: "own"` 會轉發這些事件。
- `reactionNotifications: "off"` 會停用反應系統事件。
- 反應移除不會被合成为系統事件，因為 Matrix 將其呈現為撤回，而非獨立的 `m.reaction` 移除。

## 歷史記錄上下文

- 當 Matrix 聊天室訊息觸發代理程式時，`channels.matrix.historyLimit` 控制作為 `InboundHistory` 包含的最近聊天室訊息數量。預設值回退至 `messages.groupChat.historyLimit`；如果兩者皆未設定，有效預設值為 `0`。設定 `0` 以停用。
- Matrix 聊天室歷史記錄僅限於聊天室內。DM（私訊）會繼續使用一般會話歷史記錄。
- Matrix 房間歷史記錄僅處理待處理訊息：OpenClaw 會緩衝尚未觸發回覆的房間訊息，然後在收到提及或其他觸發條件時對該視窗進行快照。
- 目前的觸發訊息不包含在 `InboundHistory` 中；它保留在該回合的主要輸入內容中。
- 同一 Matrix 事件的重試會重用原始的歷史快照，而不是向前推移到較新的房間訊息。

## 上下文可見性

Matrix 支援共享的 `contextVisibility` 控制選項，用於額外的房間上下文，例如獲取的回覆文字、討論串根節點和待處理歷史記錄。

- `contextVisibility: "all"` 是預設值。額外的上下文會按接收狀態保留。
- `contextVisibility: "allowlist"` 會根據有效的房間/使用者白名單檢查，過濾額外的上下文，僅保留允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似於 `allowlist`，但仍保留一個明確的引用回覆。

此設定影響的是額外上下文的可見性，而非輸入訊息本身是否能觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 以及 DM 政策設定。

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
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

請參閱 [Groups](/zh-Hant/channels/groups) 以了解提及閘控與允許清單行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息，OpenClaw 會重用相同的待處理配對代碼，並可能在短暫的冷卻後再次發送提醒回覆，而不是產生新的代碼。

請參閱 [Pairing](/zh-Hant/channels/pairing) 以了解共用 DM 配對流程與儲存佈局。

## 直接修復房間

如果直接訊息狀態不同步，OpenClaw 可能會保留過時的 `m.direct` 對映，指向舊的單獨房間而非目前的 DM。請使用以下指令檢查對端目前的對映：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下指令進行修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復流程：

- 優先使用已在 `m.direct` 中對映的嚴格 1:1 DM
- 退而求其次使用目前與該使用者加入的任何嚴格 1:1 DM
- 如果沒有健康的 DM，則建立一個新的直接房間並重寫 `m.direct`

修復流程不會自動刪除舊的房間。它只會選擇健康的私人訊息（DM）並更新映射，以便新的 Matrix 傳送、驗證通知和其他直接訊息流程再次定位到正確的房間。

## 執行核准

Matrix 可以充當 Matrix 帳戶的原生核准用戶端。原生的
私人訊息/頻道路由控制項仍位於執行核准配置下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` （可選；回退至 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target` （`dm` | `channel` | `both`，預設值： `dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

核准者必須是 Matrix 使用者 ID，例如 `@owner:example.org`。當 `enabled` 未設定或 `"auto"` 並且至少可以解析出一個核准者時，Matrix 會自動啟用原生核准。執行核准首先使用 `execApprovals.approvers`，並且可以回退至 `channels.matrix.dm.allowFrom`。外掛核准透過 `channels.matrix.dm.allowFrom` 進行授權。設定 `enabled: false` 以明確停用 Matrix 作為原生核准用戶端。否則，核准請求會回退至其他已配置的核准路由或核准回退策略。

Matrix 原生路由支援這兩種核准類型：

- `channels.matrix.execApprovals.*` 控制用於 Matrix 核准提示的原生私人訊息/頻道輸出模式。
- 執行核准使用來自 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 的執行核准者集合。
- 外掛核准使用來自 `channels.matrix.dm.allowFrom` 的 Matrix 私人訊息允許列表。
- Matrix 反應捷徑和訊息更新同時適用於執行和外掛核准。

傳遞規則：

- `target: "dm"` 將核准提示傳送給核准者的私人訊息
- `target: "channel"` 將提示傳送回來源的 Matrix 房間或私人訊息
- `target: "both"` 傳送給核准者的私人訊息以及來源的 Matrix 房間或私人訊息

Matrix 核准提示會在主要核准訊息上植入反應捷徑：

- `✅` = 允許一次
- `❌` = 否決
- `♾️` = 當有效的執行策略允許該決定時，總是允許

審批者可以對該訊息做出反應，或使用備用斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的審批者才能批准或否決。對於執行審批，頻道傳遞包含指令文字，因此僅在信任的房間中啟用 `channel` 或 `both`。

每個帳號的覆寫：

- `channels.matrix.accounts.<account>.execApprovals`

相關文件：[Exec approvals](/zh-Hant/tools/exec-approvals)

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

頂層 `channels.matrix` 值會作為命名帳號的預設值，除非該帳號覆寫了它們。
您可以使用 `groups.<room>.account` 將繼承的房間條目限定在單一 Matrix 帳號中。
沒有 `account` 的條目會在所有 Matrix 帳號之間保持共享，而具有 `account: "default"` 的條目在頂層 `channels.matrix.*` 直接設定預設帳號時仍然有效。
部分共享的身份驗證預設值本身不會建立單獨的隱含預設帳號。只有當該預設值具有新的身份驗證資訊（`homeserver` 加上 `accessToken`，或 `homeserver` 加上 `userId` 和 `password`）時，OpenClaw 才會合成頂層 `default` 帳號；當快取的憑證稍後滿足身份驗證時，命名帳號仍然可以透過 `homeserver` 加上 `userId` 來保持可被發現。
如果 Matrix 已經只有一個命名帳號，或者 `defaultAccount` 指向現有的命名帳號金鑰，則單帳號到多帳號的修復/設定升級會保留該帳號，而不是建立新的 `accounts.default` 條目。只有 Matrix 身份驗證/啟動金鑰會移入該升級的帳號；共享的傳遞策略金鑰會保留在頂層。
當您希望 OpenClaw 在隱含路由、探測和 CLI 操作中優先使用一個命名的 Matrix 帳號時，請設定 `defaultAccount`。
如果設定了多個 Matrix 帳號，並且其中一個帳號 ID 是 `default`，則即使未設定 `defaultAccount`，OpenClaw 也會隱含地使用該帳號。
如果您設定了多個命名帳號，請設定 `defaultAccount` 或為依賴隱含帳號選擇的 CLI 命令傳遞 `--account <id>`。
當您想要為單一命令覆寫該隱含選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

請參閱 [設定參考](/zh-Hant/gateway/configuration-reference#multi-account-all-channels) 以了解共享多帳號模式。

## 私人/LAN 主伺服器

預設情況下，為了 SSRF 保護，OpenClaw 會封鎖私人/內部 Matrix 主伺服器，除非您
針對每個帳號明確選擇加入。

如果您的主伺服器運行在 localhost、區域網路/Tailscale IP 或內部主機名上，請為該 Matrix 帳號啟用
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

此選項僅允許受信任的私有/內部目標。諸如
`http://matrix.example.org:8008` 之類的公開明文主伺服器仍會被阻止。請盡可能優先使用 `https://`。

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

命名帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆蓋頂層預設值。
OpenClaw 對於執行時 Matrix 流量和帳號狀態偵測使用相同的代理設定。

## 目標解析

Matrix 在 OpenClaw 要求您提供房間或使用者目標的任何地方都接受以下目標格式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查詢使用已登入的 Matrix 帳戶：

- 使用者查詢會查詢該主伺服器上的 Matrix 使用者目錄。
- 房間查詢直接接受明確的房間 ID 和別名，然後回退到搜尋該帳戶已加入的房間名稱。
- 已加入房間名稱查詢為盡力而為。如果房間名稱無法解析為 ID 或別名，它將在運行時允許清單解析中被忽略。

## 組態參考

- `enabled`：啟用或停用頻道。
- `name`：帳號的選用標籤。
- `defaultAccount`：當設定了多個 Matrix 帳號時的首選帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允許此 Matrix 帳號連線到私有/內部主伺服器。當主伺服器解析為 `localhost`、LAN/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此選項。
- `proxy`：Matrix 流量的選用 HTTP(S) 代理 URL。命名帳號可以使用自己的 `proxy` 覆蓋頂層預設值。
- `userId`：完整的 Matrix 使用者 ID，例如 `@bot:example.org`。
- `accessToken`：基於權杖的身分驗證的存取權杖。在 env/file/exec 提供者中，`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支援純文字值和 SecretRef 值。請參閱[機密管理](/zh-Hant/gateway/secrets)。
- `password`：基於密碼登入的密碼。支援純文字值和 SecretRef 值。
- `deviceId`：明確的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於個人資料同步和 `profile set` 更新的儲存自我大頭照 URL。
- `initialSyncLimit`：啟動同步期間取得的最大事件數量。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：當 `true` 時，將 `open` 房間策略升級為 `allowlist`，並強制所有使用中的 DM 策略（除了 `disabled`，包括 `pairing` 和 `open`）變更為 `allowlist`。不影響 `disabled` 策略。
- `allowBots`：允許來自其他已設定 OpenClaw Matrix 帳號（`true` 或 `"mentions"`）的訊息。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：額外的房間情境可見性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`: 房間流量的使用者 ID 白名單。完整的 Matrix 使用者 ID 最安全；精確的目錄匹配會在啟動時以及監視器執行期間白名單變更時進行解析。無法解析的名稱將被忽略。
- `historyLimit`：作為群組歷史情境包含的最大房間訊息數。會回退到 `messages.groupChat.historyLimit`；如果兩者皆未設定，有效預設值為 `0`。設定為 `0` 以停用。
- `replyToMode`：`off`、`first`、`all` 或 `batched`。
- `markdown`：傳出 Matrix 文字的可選 Markdown 渲染設定。
- `streaming`：`off`（預設值）、`"partial"`、`"quiet"`、`true` 或 `false`。`"partial"` 和 `true` 透過正常的 Matrix 文字訊息啟用預覽優先的草稿更新。`"quiet"` 針對自託管的推送規則設定使用不通知的預覽通知。`false` 相當於 `"off"`。
- `blockStreaming`：`true` 在草稿預覽串流啟用時，為已完成的助手區塊啟用獨立的進度訊息。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：綁定執行緒的會話路由與生命週期的逐通道覆寫。
- `startupVerification`：啟動時的自動自我驗證請求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重試自動啟動驗證請求前的冷卻時間。
- `textChunkLimit`：以字元為單位的出站訊息區塊大小（當 `chunkMode` 為 `length` 時適用）。
- `chunkMode`：`length` 依字元數分割訊息；`newline` 在行邊界分割。
- `responsePrefix`：預先附加至此通道所有出站回覆的可選字串。
- `ackReaction`：此通道/帳戶的可選 ack 表情覆寫。
- `ackReactionScope`：可選的 ack 表情範圍覆寫（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：入站表情通知模式（`own`、`off`）。
- `mediaMaxMb`：傳送和處理傳入媒體的媒體大小上限（單位為 MB）。
- `autoJoin`：邀請自動加入政策（`always`、`allowlist`、`off`）。預設值：`off`。適用於所有 Matrix 邀請，包括 DM 樣式的邀請。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時允許的房間/別名。別名項目會在處理邀請時解析為房間 ID；OpenClaw 不信任被邀請房間所聲稱的別名狀態。
- `dm`：DM 政策區塊（`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`）。
- `dm.policy`：在 OpenClaw 加入房間並將其分類為 DM 後，控制 DM 存取權。這不會變更邀請是否自動加入。
- `dm.allowFrom`: 直訊流量的使用者 ID 白名單。完整的 Matrix 使用者 ID 最安全；精確的目錄匹配會在啟動時以及監視器執行期間白名單變更時進行解析。無法解析的名稱將被忽略。
- `dm.sessionScope`：`per-user`（預設值）或 `per-room`。當您希望每個 Matrix DM 房間即使對象相同也保持獨立語境時，請使用 `per-room`。
- `dm.threadReplies`：僅限 DM 的執行緒政策覆寫（`off`、`inbound`、`always`）。它會覆寫頂層 `threadReplies` 設定，同時影響 DM 中的回覆放置和階段隔離。
- `execApprovals`：Matrix 原生執行核准傳遞（`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`）。
- `execApprovals.approvers`：獲准核准執行請求的 Matrix 使用者 ID。當 `dm.allowFrom` 已識別核准者時，此為選填。
- `execApprovals.target`：`dm | channel | both`（預設值：`dm`）。
- `accounts`：命名的每個帳號覆寫值。頂層 `channels.matrix` 值作為這些項目的預設值。
- `groups`：每個房間的原則映射。優先使用房間 ID 或別名；未解析的房間名稱會在執行時被忽略。會話/群組身分在解析後使用穩定的房間 ID。
- `groups.<room>.account`：在多帳號設定中，將一個繼承的房間項目限制為特定的 Matrix 帳號。
- `groups.<room>.allowBots`：針對設定好的機器人發送者（`true` 或 `"mentions"`）的房間級別覆寫。
- `groups.<room>.users`：每個房間的發送者允許清單。
- `groups.<room>.tools`：每個房間的工具允許/拒絕覆寫。
- `groups.<room>.autoReply`：房間級別的提及閘門覆寫。`true` 會停用該房間的提及要求；`false` 則會強制重新啟用。
- `groups.<room>.skills`：可選的房間級別技能過濾器。
- `groups.<room>.systemPrompt`：可選的房間級別系統提示詞片段。
- `rooms`：`groups` 的舊版別名。
- `actions`：每個動作的工具閘門（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘門
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
