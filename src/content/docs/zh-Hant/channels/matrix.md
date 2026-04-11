---
summary: "Matrix 支援狀態、設定與配置範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 內建的 Matrix 頻道外掛程式。
它使用官方的 `matrix-js-sdk`，並支援私訊、房間、討論串、媒體、反應、投票、位置與 E2EE。

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

請參閱 [外掛程式](/en/tools/plugin) 以了解外掛程式的行為與安裝規則。

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

Matrix 精靈實際要求的內容：

- 主伺服器網址
- 驗證方式：存取權杖或密碼
- 使用者 ID（僅在選擇密碼驗證時需要）
- 選用的裝置名稱
- 是否啟用 E2EE
- 是否現在設定 Matrix 房間存取權
- 是否現在設定 Matrix 邀請自動加入
- 當啟用邀請自動加入時，其行為應為 `allowlist`、`always` 或 `off`

重要的精靈行為：

- 如果所選帳戶的 Matrix 驗證環境變數已存在，且該帳戶尚未在設定中儲存驗證資訊，精靈會提供環境變數捷徑，讓設定能將驗證資訊保留在環境變數中，而不是將機密複製到設定中。
- 當您以互動方式新增另一個 Matrix 帳戶時，輸入的帳戶名稱會被正規化為設定與環境變數中使用的帳戶 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- 私訊允許清單提示會立即接受完整的 `@user:server` 值。顯示名稱只有在即時目錄查詢找到一個完全相符的項目時才有效；否則精靈會要求您使用完整的 Matrix ID 重試。
- 房間允許清單提示會直接接受房間 ID 和別名。它們也可以即時解析已加入房間名稱，但未解析的名稱在設定期間僅會保留輸入的樣子，之後會被執行時期允許清單解析忽略。建議優先使用 `!room:server` 或 `#alias:server`。
- 嚮導現在會在邀請自動加入步驟之前顯示明確的警告，因為 `channels.matrix.autoJoin` 預設為 `off`；除非您進行設定，否則代理程式不會加入被邀請的房間或新的直接訊息 (DM) 樣式邀請。
- 在邀請自動加入白名單模式中，僅使用穩定的邀請目標：`!roomId:server`、`#alias:server` 或 `*`。純房間名稱將被拒絕。
- 執行時期的房間/工作階段身分使用穩定的 Matrix 房間 ID。房間宣告的別名僅用於查詢輸入，而非長期的工作階段金鑰或穩定的群組身分。
- 若要在儲存房間名稱之前解析它們，請使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 預設為 `off`。

如果您不設定它，機器人將不會加入被邀請的房間或新的 DM 樣式邀請，因此除非您先手動加入，否則它不會出現在新群組或被邀請的 DM 中。

設定 `autoJoin: "allowlist"` 搭配 `autoJoinAllowlist` 以限制其接受的邀請，或者如果您希望它加入所有邀請，請設定 `autoJoin: "always"`。

在 `allowlist` 模式下，`autoJoinAllowlist` 僅接受 `!roomId:server`、`#alias:server` 或 `*`。

</Warning>

白名單範例：

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

加入所有邀請：

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

最小化基於 Token 的設定：

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

基於密碼的設定 (登入後會快取 Token)：

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

Matrix 將快取的認證資訊儲存在 `~/.openclaw/credentials/matrix/` 中。
預設帳戶使用 `credentials.json`；命名帳戶使用 `credentials-<account>.json`。
當該處存在快取的認證資訊時，即使目前未在設定中直接設定認證，OpenClaw 也會將 Matrix 視為已設定以供設定、doctor 和通道狀態發現使用。

對應的環境變數 (當未設定設定金鑰時使用)：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

對於非預設帳戶，請使用帳戶範圍的環境變數：

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

Matrix 會對帳號 ID 中的標點符號進行轉義，以保持範圍環境變數不發生衝突。
例如，`-` 會變成 `_X2D_`，因此 `ops-prod` 會對應到 `MATRIX_OPS_X2D_PROD_*`。

僅當這些授權環境變數已經存在，且所選帳號的設定中尚未儲存 Matrix 授權資訊時，互動式精靈才會提供環境變數捷徑。

## 設定範例

這是一個包含 DM 配對、房間允許清單並啟用 E2EE 的實用基準設定：

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

`autoJoin` 適用於一般的 Matrix 邀請，而不僅限於房間/群組邀請。
這包括新的 DM 風格邀請。在邀請時，OpenClaw 無法可靠地得知
被邀請的房間最終會被視為 DM 還是群組，因此所有邀請首先都會經過相同的
`autoJoin` 決策。在機器人加入且房間被
分類為 DM 後，`dm.policy` 仍然適用，因此 `autoJoin` 控制加入行為，而 `dm.policy` 控制回覆/存取
行為。

## 串流預覽

Matrix 回覆串流功能為選用。

當您希望 OpenClaw 發送單一即時預覽
回覆、在模型生成文字時就地編輯該預覽，並在
回覆完成時將其定稿時，請將 `channels.matrix.streaming` 設定為 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是預設值。OpenClaw 會等待最終回覆並僅發送一次。
- `streaming: "partial"` 使用正常的 Matrix 文字訊息為目前的助手區塊建立一個可編輯的預覽訊息。這保留了 Matrix 的傳統預覽優先通知行為，因此標準客戶端可能會在第一次串流預覽文字而非完成的區塊時發出通知。
- `streaming: "quiet"` 會為當前助手區塊建立一個可編輯的靜音預覽通知。僅當您也為最終預覽編輯設定了接收者推送規則時，才使用此選項。
- `blockStreaming: true` 啟用獨立的 Matrix 進度訊息。啟用預覽串流後，Matrix 會保留當前區塊的即時草稿，並將已完成的區塊保留為獨立的訊息。
- 當預覽串流開啟且 `blockStreaming` 關閉時，Matrix 會就地編輯即時草稿，並在區塊或輪次結束時將同一事件定稿。
- 如果預覽不再適合放入單一 Matrix 事件中，OpenClaw 將停止預覽串流並回退到正常的最終傳遞。
- 媒體回覆仍會正常傳送附件。如果過期的預覽無法再安全地重複使用，OpenClaw 將在傳送最終媒體回覆之前將其撤回。
- 預覽編輯需要額外的 API 呼叫。如果您想要最保守的速率限制行為，請將串流保持關閉。

`blockStreaming` 本身並不啟用草稿預覽。
使用 `streaming: "partial"` 或 `streaming: "quiet"` 進行預覽編輯；然後僅當您也希望已完成的助手區塊保持為獨立的進度訊息時，才新增 `blockStreaming: true`。

如果您需要標準 Matrix 通知而不需要自訂推送規則，請使用 `streaming: "partial"` 以獲得預覽優先行為，或者關閉 `streaming` 以僅進行最終傳遞。使用 `streaming: "off"` 時：

- `blockStreaming: true` 會將每個完成的區塊作為正常的 Matrix 通知訊息傳送。
- `blockStreaming: false` 僅將最終完成的回覆作為正常的 Matrix 通知訊息傳送。

### 針對靜音最終預覽的自託管推送規則

如果您執行自己的 Matrix 基礎設施，並希望靜音預覽僅在區塊或最終回覆完成時通知，請設定 `streaming: "quiet"` 並為最終預覽編輯新增針對使用者的推送規則。

這通常是接收者的設定，而不是主伺服器的全域設定變更：

開始之前的快速對應：

- 接收者使用者 = 應該接收通知的人
- 機器人使用者 = 傳送回覆的 OpenClaw Matrix 帳戶
- 對以下 API 呼叫使用接收者使用者的存取權杖
- 在推送規則中將 `sender` 與機器人使用者的完整 MXID 進行匹配

1. 將 OpenClaw 配置為使用安靜預覽：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 確保接收者帳戶已經接收正常的 Matrix 推送通知。安靜預覽
   規則只有在該使用者已有有效的推送器/裝置時才會生效。

3. 取得接收使用者的存取權杖。
   - 使用接收使用者的權杖，而不是機器人的權杖。
   - 重複使用現有的客戶端會話權杖通常是最簡單的。
   - 如果您需要建立新的權杖，可以透過標準的 Matrix 客戶端-伺服器 API 登入：

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

4. 驗證接收者帳戶是否已經有推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果這沒有傳回任何有效的推送器/裝置，請先修正正常的 Matrix 通知，然後再新增下方的
OpenClaw 規則。

OpenClaw 會將最終純文字預覽編輯標記為：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 為每個應接收這些通知的接收者帳戶建立一個覆寫推送規則：

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

在執行指令前替換這些值：

- `https://matrix.example.org`: 您的住宅伺服器基礎 URL
- `$USER_ACCESS_TOKEN`: 接收使用者的存取權杖
- `openclaw-finalized-preview-botname`: 對於此接收者而言，此機器人唯一的規則 ID
- `@bot:example.org`: 您的 OpenClaw Matrix 機器人 MXID，而不是接收使用者的 MXID

對於多機器人設置很重要：

- 推送規則是以 `ruleId` 為鍵值。針對相同的規則 ID 重新執行 `PUT` 會更新該規則。
- 如果一個接收者應針對多個 OpenClaw Matrix 機器人帳戶接收通知，請為每個機器人建立一個規則，並為每個發送者匹配使用唯一的規則 ID。
- 一個簡單的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

該規則是針對事件發送者進行評估的：

- 使用接收使用者的權杖進行驗證
- 將 `sender` 與 OpenClaw 機器人 MXID 進行匹配

6. 驗證規則是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 測試串流回覆。在安靜模式下，房間應顯示安靜的草稿預覽，並且當區塊或輪次完成時，最終的就地編輯應通知一次。

如果您稍後需要移除該規則，請使用接收使用者的權杖刪除相同的規則 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

備註：

- 使用接收使用者的存取權杖建立規則，而不是機器人的。
- 新的使用者定義 `override` 規則會插入在預設抑制規則之前，因此不需要額外的排序參數。
- 這僅影響 OpenClaw 可以安全地就地完成的純文字預覽編輯。媒體後備和過時預覽後備仍使用正常的 Matrix 傳遞方式。
- 如果 `GET /_matrix/client/v3/pushers` 顯示沒有推送器（pushers），則該使用者在此帳號/裝置上尚未有可用的 Matrix 推送傳遞。

#### Synapse

對於 Synapse，上述設定通常就足夠了：

- 對於已完成的 OpenClaw 預覽通知，不需要進行特殊的 `homeserver.yaml` 變更。
- 如果您的 Synapse 部署已經發送正常的 Matrix 推送通知，那麼使用者權杖 + 上述 `pushrules` 呼叫是主要的設定步驟。
- 如果您在反向代理或 Worker 後方執行 Synapse，請確保 `/_matrix/client/.../pushrules/` 能正確到達 Synapse。
- 如果您執行 Synapse Worker，請確保推送器狀況良好。推送傳遞由主程序或 `synapse.app.pusher` / 已設定的推送器 Worker 處理。

#### Tuwunel

對於 Tuwunel，請使用上述顯示的相同設定流程和推送規則 API 呼叫：

- 對於已完成的預覽標記本身，不需要特定的 Tuwunel 設定。
- 如果該使用者的正常 Matrix 通知已經可以運作，那麼使用者權杖 + 上述 `pushrules` 呼叫是主要的設定步驟。
- 如果當使用者在另一個裝置上處於活動狀態時通知似乎消失了，請檢查是否啟用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 版本中新增了此選項，並且當某個裝置處於活動狀態時，它可以刻意抑制對其他裝置的推送。

## 加密與驗證

在加密（E2EE）房間中，傳出的圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密的房間仍使用純文字 `thumbnail_url`。不需要任何設定 — 外掛程式會自動檢測 E2EE 狀態。

### Bot 到 Bot 房間

根據預設，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息會被忽略。

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

- `allowBots: true` 接受來自其他已設定 Matrix 機器人帳號在允許的房間和私訊中的訊息。
- `allowBots: "mentions"` 僅在房間中明確提及此機器人時才接受那些訊息。私訊仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- OpenClaw 仍然會忽略來自相同 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 在此不公開原生的機器人旗標；OpenClaw 將「機器人作者」視為「由同一個 OpenClaw 閘道上另一個已設定的 Matrix 帳號所發送」。

在共享房間中啟用機器人對機器人通訊時，請使用嚴格的房間允許清單和提及要求。

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

詳細狀態（完整診斷）：

```bash
openclaw matrix verify status --verbose
```

將儲存的恢復金鑰包含在機器可讀的輸出中：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導交叉簽署和驗證狀態：

```bash
openclaw matrix verify bootstrap
```

多帳號支援：使用 `channels.matrix.accounts` 搭配每個帳號的憑證和可選的 `name`。請參閱 [設定參考](/en/gateway/configuration-reference#multi-account-all-channels) 了解共用模式。

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導之前強制重置全新的交叉簽署身分：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢復金鑰驗證此裝置：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

詳細裝置驗證細節：

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

刪除目前的伺服器備份並建立全新的備份基準。如果儲存的備份金鑰無法乾淨地載入，此重置也可以重新建立秘密儲存，以便未來的冷啟動可以載入新的備份金鑰：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 指令預設都是簡潔的（包括安靜的內部 SDK 記錄），並且僅在使用 `--verbose` 時顯示詳細診斷。在編寫腳本時，請使用 `--json` 以獲得完整的機器可讀輸出。

在多重帳號設定中，Matrix CLI 指令會使用隱含的 Matrix 預設帳號，除非您傳入 `--account <id>`。如果您設定了多個具名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將會停止並要求您明確選擇一個帳號。當您希望驗證或裝置操作明確指向某個具名帳號時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當具名帳號的加密功能被停用或無法使用時，Matrix 警告和驗證錯誤會指向該帳號的設定鍵，例如 `channels.matrix.accounts.assistant.encryption`。

### 「已驗證」的含義

OpenClaw 只有在這個 Matrix 裝置經過您自己的交叉簽署 身份驗證後，才會將其視為已驗證。實際上，`openclaw matrix verify status --verbose` 公開了三種信任訊號：

- `Locally trusted`：此裝置僅受當前用戶端信任
- `Cross-signing verified`：SDK 回報該裝置已透過交叉簽署驗證
- `Signed by owner`：該裝置由您自己的自我簽署金鑰 所簽署

`Verified by owner` 只有在存在交叉簽署驗證或擁有者簽署 時才會變成 `yes`。僅有本地信任不足以讓 OpenClaw 將該裝置視為完全已驗證。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定加密 Matrix 帳號的指令。它會依序執行以下所有操作：

- 啟動秘密儲存，盡可能重複使用現有的復原金鑰
- 啟動交叉簽署並上傳遺失的公開交叉簽署金鑰
- 嘗試標記並交叉簽署當前裝置
- 如果尚未存在伺服器端的聊天室金鑰備份，則建立一個新的

如果住宅伺服器 (homeserver) 需要互動式驗證才能上傳交叉簽署金鑰，OpenClaw 會先嘗試在無驗證的情況下上傳，然後使用 `m.login.dummy`，當設定 `channels.matrix.password` 時則使用 `m.login.password`。

僅當您有意捨棄當前的交叉簽署身份並建立新身份時，才使用 `--force-reset-cross-signing`。

如果您有意捨棄目前的房間金鑰備份，並為未來的訊息建立新的備份基準，請使用 `openclaw matrix verify backup reset --yes`。
請僅在您接受無法復原的舊加密歷史將持續無法使用，且若目前的備份密鑰無法安全載入，OpenClaw 可能會重建秘密儲存時，才執行此操作。

### 全新的備份基準

如果您希望未來的加密訊息能正常運作並接受失去無法復原的舊歷史，請依序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想要明確指定具名的 Matrix 帳號時，請將 `--account <id>` 新增至每個指令中。

### 啟動行為

當 `encryption: true` 時，Matrix 預設將 `startupVerification` 設為 `"if-unverified"`。
在啟動時，如果此裝置尚未驗證，Matrix 將會在另一個 Matrix 用戶端中請求自我驗證，
在有一個請求待處理時跳過重複的請求，並在重啟後重試之前套用本機冷卻時間。
預設情況下，失敗的請求嘗試會比成功建立請求更早重試。
設定 `startupVerification: "off"` 以停用自動啟動請求，或者如果您想要縮短或延長重試視窗，請調整 `startupVerificationCooldownHours`。

啟動也會自動執行一次保守的加密引導程序。
該程序會嘗試優先重用目前的秘密儲存和交叉簽署身分，並且除非您執行明確的引導修復流程，否則避免重置交叉簽署。

如果啟動發現損壞的引導狀態並且設定了 `channels.matrix.password`，OpenClaw 可以嘗試更嚴格的修復路徑。
如果目前的裝置已經由擁有者簽署，OpenClaw 將保留該身分，而不是自動重置它。

從先前的公開 Matrix 外掛升級：

- OpenClaw 會在可能的情況下自動重用相同的 Matrix 帳號、存取權杖和裝置身分。
- 在執行任何可操作的 Matrix 遷移變更之前，OpenClaw 會在 `~/Backups/openclaw-migrations/` 下建立或重用復原快照。
- 如果您使用多個 Matrix 帳號，請在從舊的平面儲存佈局升級之前設定 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪個帳號應該接收該共用的遺留狀態。
- 如果先前的外掛程式在本機儲存了 Matrix 房間金鑰備份解密金鑰，啟動或 `openclaw doctor --fix` 將會自動將其匯入新的復原金鑰流程。
- 如果在準備遷移後 Matrix 存取權杖發生了變更，啟動時現在會在放棄自動備份還原之前，掃描同層級權杖雜湊儲存根目錄中是否有待處理的舊版還原狀態。
- 如果之後對於同一個帳戶、主伺服器和使用者，Matrix 存取權杖發生了變更，OpenClaw 現在傾向於重用最完整的現有權杖雜湊儲存根目錄，而不是從空的 Matrix 狀態目錄重新開始。
- 在下一次閘道啟動時，備份的房間金鑰會自動還原到新的加密儲存中。
- 如果舊外掛程式擁有從未備份過的僅限本機的房間金鑰，OpenClaw 將會發出明確的警告。這些金鑰無法從先前的 rust crypto store 自動匯出，因此某些舊的加密記錄可能會持續無法存取，直到手動復原為止。
- 請參閱 [Matrix 遷移](/en/install/migrating-matrix) 以了解完整的升級流程、限制、復原指令和常見的遷移訊息。

加密的執行時期狀態是依照每個帳戶、每個使用者的權杖雜湊根目錄組織在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中。
該目錄包含同步儲存 (`bot-storage.json`)、加密儲存 (`crypto/`)、
復原金鑰檔案 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
執行緒綁定 (`thread-bindings.json`) 和啟動驗證狀態 (`startup-verification.json`)
當這些功能在使用中時。
當權杖變更但帳戶身分保持不變時，OpenClaw 會重用該帳戶/主伺服器/使用者組合的最佳現有
根目錄，以便先前的同步狀態、加密狀態、執行緒綁定
和啟動驗證狀態保持可見。

### Node 加密儲存模型

此外掛程式中的 Matrix E2EE 使用官方 `matrix-js-sdk` 在 Node 中的 Rust crypto 路徑。
當您希望加密狀態在重啟後保留時，該路徑預期使用 IndexedDB 支援的持久性。

OpenClaw 目前在 Node 中透過以下方式提供該功能：

- 使用 `fake-indexeddb` 作為 SDK 預期的 IndexedDB API 模擬層
- 在 `initRustCrypto` 之前，從 `crypto-idb-snapshot.json` 還原 Rust crypto IndexedDB 內容
- 在初始化後和執行期間，將更新的 IndexedDB 內容持久化回 `crypto-idb-snapshot.json`
- 對 `crypto-idb-snapshot.json` 的快照還原和持久化操作進行序列化，並使用建議性檔案鎖，以防止閘道執行時持久化和 CLI 維護在同一個快照檔案上發生競爭

這是相容性/儲存層面的基礎建設，而非自訂的加密實作。
快照檔案是敏感的執行時狀態，並以限制性檔案權限儲存。
在 OpenClaw 的安全性模型下，閘道主機和本機 OpenClaw 狀態目錄已位於受信任的操作者邊界內，因此這主要是一個操作上的持久性考量，而非獨立的遠端信任邊界。

計畫中的改進：

- 為持久化的 Matrix 金鑰素材新增 SecretRef 支援，以便復原金鑰和相關的儲存加密機密可以從 OpenClaw 密鑰提供者取得，而不僅僅是從本機檔案

## 個人資料管理

使用以下內容更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

當您想要明確指定命名的 Matrix 帳戶時，新增 `--account <id>`。

Matrix 直接接受 `mxc://` 大頭貼 URL。當您傳遞 `http://` 或 `https://` 大頭貼 URL 時，OpenClaw 會先將其上傳至 Matrix，並將解析出的 `mxc://` URL 儲存回 `channels.matrix.avatarUrl`（或所選的帳戶覆寫）。

## 自動驗證通知

Matrix 現在會將驗證生命週期通知直接以 `m.notice` 訊息的形式發佈到嚴格的 DM 驗證房間。
這包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過 emoji 驗證」指引）
- 驗證開始和完成通知
- SAS 詳細資訊（emoji 和十進位）（如有提供）

來自其他 Matrix 客戶端的驗證請求會被追蹤並由 OpenClaw 自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認自身的一方。
對於來自其他 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受該請求，然後等待 SAS 流程正常進行。
您仍需在 Matrix 客戶端中比較表情符號或十進位 SAS，並在那裡確認「相符」以完成驗證。

OpenClaw 不會盲目地自動接受自我發起的重複流程。當自我驗證請求已經在待處理時，啟動過程會跳過建立新請求。

驗證協定/系統通知不會轉發至代理程式聊天管道，因此它們不會產生 `NO_REPLY`。

### 裝置衛生

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳戶上累積，並使加密房間的信任更難以推斷。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除陳舊的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 直接訊息房間修復

如果直接訊息狀態失去同步，OpenClaw 最終可能會出現陳舊的 `m.direct` 映射，指向舊的獨立房間而非目前的 DM。使用以下指令檢查對等端的目前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下指令修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復將 Matrix 特有的邏輯保留在插件內部：

- 它偏好已經在 `m.direct` 中映射的嚴格 1:1 DM
- 否則，它會回退到目前任何已加入的與該使用者的嚴格 1:1 DM
- 如果不存在健康的 DM，它會建立一個新的直接訊息房間並重寫 `m.direct` 以指向它

修復流程不會自動刪除舊房間。它只會選擇健康的 DM 並更新映射，以便新的 Matrix 傳送、驗證通知和其他直接訊息流程再次以正確的房間為目標。

## 串列

Matrix 支援原生 Matrix 串列，適用於自動回覆和訊息工具傳送。

- `dm.sessionScope: "per-user"` （預設值）保持 Matrix DM 路由為傳送者範圍，因此當多個 DM 房間解析為同一個對等端時，它們可以共用一個會話。
- `dm.sessionScope: "per-room"` 將每個 Matrix DM 房間隔離到其自己的會話金鑰中，同時仍使用正常的 DM 身份驗證和允許清單檢查。
- 明確的 Matrix 對話綁定仍然優先於 `dm.sessionScope`，因此已綁定的房間和串流會保留其選定的目標工作階段。
- `threadReplies: "off"` 將回覆保持在頂層，並將傳入的串流訊息保留在父工作階段上。
- `threadReplies: "inbound"` 僅在傳入訊息已位於該串流中時，才在串流內回覆。
- `threadReplies: "always"` 將房間回覆保持在以觸發訊息為根的串流中，並透過第一個觸發訊息的對應串流範圍工作階段來傳送該對話。
- `dm.threadReplies` 僅針對直接訊息 (DM) 覆寫頂層設定。例如，您可以讓房間串流保持獨立，同時讓直接訊息保持扁平。
- 傳入的串流訊息會將串流根訊息作為額外的代理程式內容包含在內。
- 當目標是同一個房間或同一個直接訊息使用者目標時，訊息工具傳送現在會自動繼承目前的 Matrix 串流，除非提供了明確的 `threadId`。
- 僅當目前工作階段元資料證明是同一個 Matrix 帳戶上的同一個直接訊息對等方時，才會啟用同工作階段直接訊息使用者目標重複使用；否則 OpenClaw 會回退到正常的使用者範圍傳送。
- 當 OpenClaw 發現 Matrix 直接訊息房間在同一個共用的 Matrix 直接訊息工作階段中與另一個直接訊息房間衝突時，它會在該房間中發布一次性 `m.notice`，並附帶 `/focus` 緊急逃生閥，條件是啟用了串流綁定並且使用了 `dm.sessionScope` 提示。
- Matrix 支援執行時期串流綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和串流綁定的 `/acp spawn` 現在可在 Matrix 房間和直接訊息中使用。
- 頂層 Matrix 房間/直接訊息 `/focus` 在 `threadBindings.spawnSubagentSessions=true` 時會建立新的 Matrix 串流並將其綁定到目標工作階段。
- 在現有的 Matrix 串流中執行 `/focus` 或 `/acp spawn --thread here` 會改為綁定該目前的串流。

## ACP 對話綁定

Matrix 房間、直接訊息和現有的 Matrix 串流可以在不改變聊天介面的情況下轉變為持久的 ACP 工作區。

快速操作流程：

- 在您想要繼續使用的 Matrix 私訊、房間或現有討論串內執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix 私訊或房間中，目前的私訊/房間會保持為聊天介面，且未來的訊息會路由到產生的 ACP 工作階段。
- 在現有的 Matrix 討論串內，`--bind here` 會將該目前的討論串就地綁定。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 討論串。
- `threadBindings.spawnAcpSessions` 僅在 `/acp spawn --thread auto|here` 時需要，此時 OpenClaw 需要建立或綁定子 Matrix 討論串。

### 討論串綁定設定

Matrix 繼承自 `session.threadBindings` 的全域預設值，並且支援各頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 討論串綁定的產生旗標為選用：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 討論串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 工作階段綁定到 Matrix 討論串。

## 反應

Matrix 支援輸出反應動作、輸入反應通知，以及輸入 Ack 反應。

- 輸出反應工具受 `channels["matrix"].actions.reactions` 控制。
- `react` 對特定的 Matrix 事件新增反應。
- `reactions` 列出特定 Matrix 事件的目前反應摘要。
- `emoji=""` 移除機器人帳戶在該事件上的所有反應。
- `remove: true` 僅移除機器人帳戶指定的 emoji 反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份 emoji 後備

Ack 反應範圍依此順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式按以下順序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- default: `own`

目前行為：

- 當新增的 `m.reaction` 事件目標為機器人發送的 Matrix 訊息時，`reactionNotifications: "own"` 會轉發這些事件。
- `reactionNotifications: "off"` 停用反應系統事件。
- 反應移除仍然不會合成為系統事件，因為 Matrix 將這些顯示為撤銷，而不是獨立的 `m.reaction` 移除。

## 歷史記錄上下文

- 當 Matrix 房間訊息觸發代理程式時，`channels.matrix.historyLimit` 控制作為 `InboundHistory` 包含的最近房間訊息數量。
- 它會回退到 `messages.groupChat.historyLimit`。如果兩者都未設定，有效的預設值為 `0`，因此提及閘道的房間訊息不會被緩衝。設定 `0` 以停用。
- Matrix 房間歷史記錄僅限於房間。DM 繼續使用一般工作階段歷史記錄。
- Matrix 房間歷史記錄僅限擱置中：OpenClaw 緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時擷取該視窗。
- 目前的觸發訊息不包含在 `InboundHistory` 中；它保留在該回合的主要輸入內容中。
- 相同 Matrix 事件的重試會重用原始的歷史記錄快照，而不是漂移到較新的房間訊息。

## 上下文可見性

Matrix 支援共享的 `contextVisibility` 控制，用於額外的房間上下文，例如擷取的回覆文字、討論串根和擱置歷史記錄。

- `contextVisibility: "all"` 是預設值。額外上下文會保持接收時的狀態。
- `contextVisibility: "allowlist"` 會根據作用中的房間/使用者允許清單檢查，過濾額外上下文的傳送者。
- `contextVisibility: "allowlist_quote"` 的行為類似於 `allowlist`，但仍保留一個明確的引用回覆。

此設定會影響補充內容的可見性，而不影響傳入訊息本身是否能觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 以及 DM 政策設定。

## DM 與房間政策範例

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

請參閱 [群組](/en/channels/groups) 以了解提及閘控與允許清單行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息給您，OpenClaw 會重複使用相同的待處理配對代碼，並可能在短暫冷卻後再次發送提醒回覆，而不是產生新代碼。

請參閱 [配對](/en/channels/pairing) 以了解共用的 DM 配對流程與儲存佈局。

## 執行核准

Matrix 可充當 Matrix 帳戶的原生核准客戶端。原生的
DM/頻道路由控制項仍位於執行核准設定之下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers`（選用；若未設定則回退至 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target`（`dm` | `channel` | `both`，預設值：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

核准者必須是 Matrix 使用者 ID，例如 `@owner:example.org`。當 `enabled` 未設定或為 `"auto"`，且至少可解析一位核准者時，Matrix 會自動啟用原生核准。執行核准會優先使用 `execApprovals.approvers`，並可回退至 `channels.matrix.dm.allowFrom`。外掛核准透過 `channels.matrix.dm.allowFrom` 進行授權。設定 `enabled: false` 可明確停用 Matrix 作為原生核准客戶端。否則，核准請求會回退至其他設定的核准路由或核准回退政策。

Matrix 原生路由現已支援這兩種核准類型：

- `channels.matrix.execApprovals.*` 控制矩陣核准提示的原生 DM/頻道分發模式。
- 執行核准使用來自 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 的執行核准者集合。
- 外掛核准使用來自 `channels.matrix.dm.allowFrom` 的 Matrix DM 允許清單。
- Matrix 反應快捷鍵和訊息更新同時適用於 exec 和外掛程式的審批。

傳送規則：

- `target: "dm"` 將審批提示發送到審批者的私人訊息
- `target: "channel"` 將提示發送回原始的 Matrix 房間或私人訊息
- `target: "both"` 發送給審批者私人訊息以及原始的 Matrix 房間或私人訊息

Matrix 審批提示會在主要的審批訊息上植入反應快捷鍵：

- `✅` = 允許一次
- `❌` = 拒絕
- `♾️` = 當有效的 exec 策略允許該決定時，總是允許

審批者可以對該訊息做出反應，或使用備用的斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的審批者才能批准或拒絕。對於 exec 審批，頻道傳送包含指令文字，因此僅在受信任的房間中啟用 `channel` 或 `both`。

Matrix 審批提示會重複使用共用的核心審排程器。Matrix 特有的原生介面會處理房間/私人訊息的路由、反應，以及訊息傳送/更新/刪除行為，這同時適用於 exec 和外掛程式的審批。

個別帳號覆寫：

- `channels.matrix.accounts.<account>.execApprovals`

相關文件：[Exec approvals](/en/tools/exec-approvals)

## 多帳號範例

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

頂層 `channels.matrix` 值充當命名帳戶的預設值，除非該帳戶覆寫了它們。
您可以使用 `groups.<room>.account`（或舊版的 `rooms.<room>.account`）將繼承的房條目限定在單一 Matrix 帳戶。
沒有 `account` 的條目在所有 Matrix 帳戶之間保持共享，而具有 `account: "default"` 的條目在直接於頂層 `channels.matrix.*` 配置預設帳戶時仍然有效。
部分共享的 auth 預設值本身不會建立單獨的隱式預設帳戶。OpenClaw 僅在該預設值具有全新的 auth（`homeserver` 加上 `accessToken`，或 `homeserver` 加上 `userId` 和 `password`）時才合成頂層 `default` 帳戶；當快取的憑證稍後滿足 auth 時，命名帳戶仍然可以從 `homeserver` 加上 `userId` 中被發現。
如果 Matrix 已經只有一個命名帳戶，或者 `defaultAccount` 指向現有的命名帳戶金鑰，單帳戶到多帳戶的修復/設置升級將保留該帳戶，而不是建立新的 `accounts.default` 條目。只有 Matrix auth/bootstrap 金鑰會移入該升級的帳戶；共享的 delivery-policy 金鑰保留在頂層。
當您希望 OpenClaw 偏好一個命名的 Matrix 帳戶進行隱式路由、探查和 CLI 操作時，請設定 `defaultAccount`。
如果您配置了多個命名帳戶，請設定 `defaultAccount` 或為依賴隱式帳戶選擇的 CLI 命令傳遞 `--account <id>`。
當您想要為某個命令覆寫該隱式選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私人/LAN 家伺服器

預設情況下，為了 SSRF 保護，OpenClaw 會阻擋私人/內部 Matrix 家伺服器，除非您
針對每個帳戶明確選擇加入。

如果您的家伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳戶啟用
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

此選項僅允許受信任的私人/內部目標。公開的明文主伺服器（例如
`http://matrix.example.org:8008`）仍會被封鎖。請盡可能優先使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要明確的輸出 HTTP(S) 代理，請設定 `channels.matrix.proxy`：

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
OpenClaw 對執行時期的 Matrix 流量和帳號狀態偵測使用相同的代理設定。

## 目標解析

在 OpenClaw 要求您提供房間或使用者目標的任何地方，Matrix 接受以下目標格式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查詢使用已登入的 Matrix 帳號：

- 使用者查詢會向該主伺服器上的 Matrix 使用者目錄發出請求。
- 房間查詢直接接受明確的房間 ID 和別名，然後回退為搜尋該帳號已加入的房間名稱。
- 已加入房間名稱查詢為盡力而為。如果房間名稱無法解析為 ID 或別名，將在執行時期允許清單解析中被忽略。

## 設定參考

- `enabled`：啟用或停用頻道。
- `name`：帳號的可選標籤。
- `defaultAccount`：當設定多個 Matrix 帳號時，為首選的帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允許此 Matrix 帳號連接至私人/內部主伺服器。當主伺服器解析為 `localhost`、LAN/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此選項。
- `proxy`：Matrix 流量的可選 HTTP(S) 代理 URL。命名帳號可以使用自己的 `proxy` 覆寫頂層預設值。
- `userId`：完整的 Matrix 用戶 ID，例如 `@bot:example.org`。
- `accessToken`：基於令牌進行驗證的存取令牌。在 env/file/exec 提供者中，支援對 `channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 使用純文字值和 SecretRef 值。請參閱[機密管理](/en/gateway/secrets)。
- `password`：基於密碼登入的密碼。支援純文字值和 SecretRef 值。
- `deviceId`：明確指定的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於個人資料同步和 `set-profile` 更新的儲存自我頭像 URL。
- `initialSyncLimit`：啟動同步事件限制。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：強制對私訊和房間實施僅允許清單行為。
- `allowBots`：允許來自其他已設定 OpenClaw Matrix 帳號（`true` 或 `"mentions"`）的訊息。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：額外房間上下文可見性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`：房間流量的用戶 ID 允許清單。
- `groupAllowFrom` 條目應為完整的 Matrix 用戶 ID。未解析的名稱將在執行時被忽略。
- `historyLimit`：作為群組歷史上下文包含的最大房間訊息數。回退至 `messages.groupChat.historyLimit`；如果兩者均未設定，有效預設值為 `0`。設定 `0` 以停用。
- `replyToMode`：`off`、`first`、`all` 或 `batched`。
- `markdown`：輸出 Matrix 文字的可選 Markdown 渲染設定。
- `streaming`： `off`（預設）、`partial`、`quiet`、`true` 或 `false`。`partial` 和 `true` 啟用優先預覽草稿更新，並使用標準 Matrix 文字訊息。`quiet` 使用非通知預覽通知，適用於自託管的推播規則設定。
- `blockStreaming`： `true` 在草稿預覽串流啟動時，為已完成的助理區塊啟用獨立的進度訊息。
- `threadReplies`： `off`、`inbound` 或 `always`。
- `threadBindings`： 每個頻道的綁定執行緒會話路由和生命週期的覆寫設定。
- `startupVerification`： 啟動時的自動自我驗證請求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`： 重試自動啟動驗證請求前的冷卻時間。
- `textChunkLimit`： 傳出訊息區塊大小。
- `chunkMode`： `length` 或 `newline`。
- `responsePrefix`： 傳出回覆的可選訊息前綴。
- `ackReaction`： 此頻道/帳戶的可選 ack 反應覆寫。
- `ackReactionScope`： 可選的 ack 反應範圍覆寫（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`： 傳入反應通知模式（`own`、`off`）。
- `mediaMaxMb`： Matrix 媒體處理的媒體大小上限（MB）。這適用於傳出傳送和傳入媒體處理。
- `autoJoin`：邀請自動加入政策（`always`、`allowlist`、`off`）。預設值：`off`。這適用於一般的 Matrix 邀請，包括 DM 樣式的邀請，而不僅限於房間/群組邀請。OpenClaw 會在邀請時做出此決定，此時它尚無法可靠地將已加入的房間分類為 DM 或群組。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時允許的房間/別名。別名條目會在邀請處理期間解析為房間 ID；OpenClaw 不信任被邀請房間所聲稱的別名狀態。
- `dm`：DM 政策區塊（`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`）。
- `dm.policy`：在 OpenClaw 加入房間並將其分類為 DM 後，控制 DM 的存取。它不會改變是否自動加入邀請。
- `dm.allowFrom` 條目應為完整的 Matrix 使用者 ID，除非您已透過即時目錄查詢解析了它們。
- `dm.sessionScope`：`per-user`（預設值）或 `per-room`。當您希望每個 Matrix DM 房間即使對象相同也保持獨立的上下文時，請使用 `per-room`。
- `dm.threadReplies`：僅限 DM 的執行緒政策覆寫（`off`、`inbound`、`always`）。它會覆寫頂層 `threadReplies` 設定，以用於 DM 中的回覆放置和會話隔離。
- `execApprovals`：Matrix 原生的執行核准傳遞（`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`）。
- `execApprovals.approvers`：被允許核准執行請求的 Matrix 使用者 ID。當 `dm.allowFrom` 已經識別出核准者時，此為可選項。
- `execApprovals.target`：`dm | channel | both`（預設：`dm`）。
- `accounts`：命名個別帳號的覆蓋。頂層 `channels.matrix` 值作為這些條目的預設值。
- `groups`：逐個房間的策略映射。建議優先使用房間 ID 或別名；未解析的房間名稱在執行時會被忽略。會話/群組身分使用解析後的穩定房間 ID，而人類可讀的標籤仍來自房間名稱。
- `groups.<room>.account`：在多帳號設定中，將一個繼承的房間條目限制為特定的 Matrix 帳號。
- `groups.<room>.allowBots`：針對已配置機器人發送者（`true` 或 `"mentions"`）的房間級別覆蓋。
- `groups.<room>.users`：逐個房間的發送者允許清單。
- `groups.<room>.tools`：逐個房間的工具允許/拒絕覆蓋。
- `groups.<room>.autoReply`：房間級別提及閘門覆蓋。`true` 停用該房間的提及要求；`false` 則強制重新啟用。
- `groups.<room>.skills`：選用的房間級別技能過濾器。
- `groups.<room>.systemPrompt`：選用的房間級別系統提示片段。
- `rooms`：`groups` 的舊版別名。
- `actions`：針對每個動作的工具閘門（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相關內容

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 身份驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘門
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化措施
