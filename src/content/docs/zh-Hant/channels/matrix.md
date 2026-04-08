---
summary: "Matrix 支援狀態、設定及設定範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 內建的 Matrix 頻道外掛。
它使用官方的 `matrix-js-sdk` 並支援私訊 (DM)、聊天室、主題串、媒體、回應、投票、位置和 E2EE。

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

請參閱 [外掛](/en/tools/plugin) 以了解外掛行為和安裝規則。

## 設定

1. 確保 Matrix 外掛可用。
   - 目前的 OpenClaw 打包版本已內建此外掛。
   - 較舊或自訂的安裝版本可使用上述指令手動新增。
2. 在您的 homeserver 上建立一個 Matrix 帳號。
3. 使用以下任一方式設定 `channels.matrix`：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重新啟動 gateway。
5. 與機器人開始私訊，或將其邀請至聊天室。

互動式設定步驟：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 精靈實際要求的項目：

- homeserver URL
- 驗證方式：access token 或密碼
- 僅在選擇密碼驗證時需要使用者 ID
- 選用的裝置名稱
- 是否啟用 E2EE
- 是否立即設定 Matrix 聊天室存取權

需要注意的精靈行為：

- 若選定帳號的 Matrix 驗證環境變數已存在，且該帳號尚未在設定中儲存驗證資訊，精靈會提供環境變數捷徑，並僅為該帳號寫入 `enabled: true`。
- 當您以互動方式新增另一個 Matrix 帳號時，輸入的帳號名稱會被正規化為設定和環境變數中使用的帳號 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- DM 許可清單提示會立即接受完整的 `@user:server` 值。顯示名稱僅在即時目錄查詢找到一個完全相符的項目時有效；否則精靈會要求您使用完整的 Matrix ID 重試。
- 房間允許清單提示直接接受房間 ID 和別名。它們也可以即時解析已加入房間的名稱，但未解析的名稱僅在設定期間按輸入保留，並在稍後的執行階段允許清單解析中被忽略。建議優先使用 `!room:server` 或 `#alias:server`。
- 執行階段的房間/會話身分使用穩定的 Matrix 房間 ID。房間宣告的別名僅用作查詢輸入，而非長期會話金鑰或穩定群組身分。
- 若要在儲存房間名稱之前解析它們，請使用 `openclaw channels resolve --channel matrix "Project Room"`。

基於 Token 的最小設定：

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

基於密碼的設定（登入後會快取 Token）：

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

Matrix 將快取的憑證儲存在 `~/.openclaw/credentials/matrix/` 中。
預設帳戶使用 `credentials.json`；具名帳戶使用 `credentials-<account>.json`。
當該處存在快取憑證時，即使目前的授權未直接在設定中設定，OpenClaw 也會將 Matrix 視為已設定好以用於設定、診斷和通道狀態探索。

對應的環境變數（當未設定配置金鑰時使用）：

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

帳戶 `ops` 的範例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

對於標準化的帳戶 ID `ops-bot`，請使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 會對帳戶 ID 中的標點符號進行跳脫，以保持範圍環境變數不衝突。
例如，`-` 會變成 `_X2D_`，因此 `ops-prod` 會對應到 `MATRIX_OPS_X2D_PROD_*`。

互動式精靈僅在這些授權環境變數已經存在，且選定的帳戶尚未在設定中儲存 Matrix 授權時，才會提供環境變數捷徑。

## 配置範例

這是一個實用的基線配置，包含 DM 配對、房間白名單並啟用了 E2EE：

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

## 串流預覽

Matrix 回覆串流為選用功能。

當您希望 OpenClaw 發送單個即時預覽回覆，在模型生成文字時就地編輯該預覽，並在回覆完成後將其定稿時，請將 `channels.matrix.streaming` 設定為 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是預設值。OpenClaw 等待最終回覆並發送一次。
- `streaming: "partial"` 使用標準 Matrix 文字訊息為當前助手區塊建立一個可編輯的預覽訊息。這保留了 Matrix 傳統的「預覽優先」通知行為，因此標準客戶端可能會在第一次串流預覽文字時而非完成的區塊時發送通知。
- `streaming: "quiet"` 為當前助手區塊建立一個可編輯的靜音預覽通知。僅當您同時為最終定稿的預覽編輯配置了接收者的推送規則時才使用此選項。
- `blockStreaming: true` 啟用獨立的 Matrix 進度訊息。啟用預覽串流後，Matrix 會保留當前區塊的即時草稿，並將已完成的區塊保留為獨立的訊息。
- 當預覽串流開啟且 `blockStreaming` 關閉時，Matrix 會就地編輯即時草稿，並在區塊或回合完成時將同一事件定稿。
- 如果預覽不再適合放入單一 Matrix 事件中，OpenClaw 將停止預覽串流並回退到正常的最終交付。
- 媒體回覆仍然正常發送附件。如果過時的預覽不再能安全地重用，OpenClaw 將在發送最終媒體回覆之前將其刪除。
- 預覽編輯會產生額外的 Matrix API 呼叫。如果您希望最保守的速率限制行為，請保持串流關閉。

`blockStreaming` 本身並不啟用草稿預覽。
請使用 `streaming: "partial"` 或 `streaming: "quiet"` 進行預覽編輯；然後僅當您還希望完成的助手區塊保留為獨立的進度訊息時，才新增 `blockStreaming: true`。

如果您需要標準 Matrix 通知而不需要自定義推送規則，請使用 `streaming: "partial"` 來獲得預覽優先行為，或者關閉 `streaming` 以僅進行最終交付。使用 `streaming: "off"` 時：

- `blockStreaming: true` 將每個完成的區塊作為正常的 Matrix 通知訊息發送。
- `blockStreaming: false` 僅將最終完成的回覆作為正常的 Matrix 通知訊息發送。

### 針對靜默最終預覽的自託管推送規則

如果您運行自己的 Matrix 基礎設施，並且希望靜默預覽僅在區塊或最終回覆完成時通知，請設定 `streaming: "quiet"` 並為最終預覽編輯添加每用戶推送規則。

這通常是接收用戶的設置，而不是主伺服器 全局配置的更改：

開始之前的快速對應關係：

- 接收用戶 = 應該接收通知的人
- 機器人用戶 = 發送回覆的 OpenClaw Matrix 帳戶
- 對以下的 API 呼叫使用接收用戶的存取權杖
- 將推送規則中的 `sender` 與機器人用戶的完整 MXID 進行匹配

1. 配置 OpenClaw 以使用靜默預覽：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 確保接收帳戶已經能夠接收正常的 Matrix 推送通知。靜默預覽規則只有在該用戶已經有工作的推送器/裝置時才有效。

3. 獲取接收用戶的存取權杖。
   - 使用接收用戶的權杖，而不是機器人的權杖。
   - 重複使用現有的客戶端會話權杖通常是最簡單的。
   - 如果您需要建立一個新的權杖，您可以透過標準的 Matrix 客戶端-伺服器 API 登入：

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

4. 驗證接收帳戶已經有推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果此操作未返回任何有效的推送器/裝置，請先修復正常的 Matrix 通知，然後再新增以下的 OpenClaw 規則。

OpenClaw 使用以下標記標記最終的純文字預覽編輯：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 為每個應接收這些通知的接收帳戶建立一個覆寫推送規則：

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

在執行指令之前替換這些值：

- `https://matrix.example.org`：您的主伺服器基礎 URL
- `$USER_ACCESS_TOKEN`：接收用戶的存取權杖
- `openclaw-finalized-preview-botname`：針對此接收用戶的此機器人唯一的規則 ID
- `@bot:example.org`：您的 OpenClaw Matrix 機器人 MXID，而非接收用戶的 MXID

對於多機器人設置很重要：

- 推送規則是按 `ruleId` 鍵入的。對同一個規則 ID 重新執行 `PUT` 將更新該規則。
- 如果一個接收使用者應該針對多個 OpenClaw Matrix 機器人帳戶接收通知，請為每個機器人建立一條規則，並為每個發送者匹配使用唯一的規則 ID。
- 一個簡單的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

該規則是根據事件發送者進行評估的：

- 使用接收使用者的 token 進行驗證
- 將 `sender` 與 OpenClaw 機器人的 MXID 進行比對

6. 驗證規則是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 測試串流回覆。在安靜模式下，房間應顯示安靜的草稿預覽，且當區塊或輪次完成時，最終的就地編輯應通知一次。

如果您稍後需要移除該規則，請使用接收使用者的 token 刪除同一個規則 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

備註：

- 請使用接收使用者的存取 token 建立規則，而不是機器人的 token。
- 新的使用者定義 `override` 規則會插入在預設的抑制規則之前，因此不需要額外的排序參數。
- 這僅影響 OpenClaw 可以安全地就地完成的純文字預覽編輯。媒體後備和過時預覽後備仍使用正常的 Matrix 傳遞。
- 如果 `GET /_matrix/client/v3/pushers` 顯示沒有推送器，則該使用者此帳戶/裝置尚未有運作正常的 Matrix 推送傳遞。

#### Synapse

對於 Synapse，上述設定通常本身就足夠了：

- 對於最終的 OpenClaw 預覽通知，不需要特殊的 `homeserver.yaml` 變更。
- 如果您的 Synapse 部署已經發送正常的 Matrix 推送通知，則上述的使用者 token + `pushrules` 呼叫是主要的設定步驟。
- 如果您在反向代理或工作程式後面執行 Synapse，請確保 `/_matrix/client/.../pushrules/` 正確到達 Synapse。
- 如果您執行 Synapse 工作程式，請確保推送器健康。推送傳遞由主要程式或 `synapse.app.pusher` / 已設定的推送器工作程式處理。

#### Tuwunel

對於 Tuwunel，請使用上述顯示的相同設定流程和推送規則 API 呼叫：

- 對於最終的預覽標記本身，不需要特定於 Tuwunel 的設定。
- 如果該使用者的正常 Matrix 通知已經運作，則上述的使用者 token + `pushrules` 呼叫是主要的設定步驟。
- 如果當使用者在另一台裝置上處於活躍狀態時通知似乎消失了，請檢查是否啟用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 版本中新增了此選項，當其中一台裝置處於活躍狀態時，它可以刻意抑制推送到其他裝置。

## 加密與驗證

在加密 (E2EE) 房間中，傳出的圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密的房間仍然使用純文字 `thumbnail_url`。不需要任何設定——外掛會自動檢測 E2EE 狀態。

### Bot 與 Bot 房間

預設情況下，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息會被忽略。

當您有意要進行代理之間的 Matrix 流量時，請使用 `allowBots`：

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

- `allowBots: true` 接受來自允許的房間和 DM 中其他已設定 Matrix bot 帳號的訊息。
- `allowBots: "mentions"` 僅在房間中明確提及此 bot 時才接受那些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- OpenClaw 仍然會忽略來自相同 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 在此處未公開原生 bot 標誌；OpenClaw 將「bot 撰寫」視為「由此 OpenClaw 閘道上的另一個已設定 Matrix 帳號傳送」。

在共享房間中啟用 bot 對 bot 流量時，請使用嚴格的房間允許清單和提及要求。

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

在機器可讀輸出中包含儲存的恢復金鑰：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導交叉簽署和驗證狀態：

```bash
openclaw matrix verify bootstrap
```

多帳號支援：使用 `channels.matrix.accounts` 搭配各個帳號的憑證和可選的 `name`。請參閱 [設定參考](/en/gateway/configuration-reference#multi-account-all-channels) 了解共用模式。

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導之前強制重設全新的交叉簽署身分：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢復金鑰驗證此裝置：

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

刪除目前的伺服器備份並建立全新的備份基準。如果無法乾淨地載入已儲存的備份金鑰，此重設作業也可以重新建立秘密儲存，以便未來的冷啟動可以載入新的備份金鑰：

```bash
openclaw matrix verify backup reset --yes
```

預設情況下，所有 `verify` 指令都很簡潔（包括安靜的內部 SDK 記錄），並且僅在使用 `--verbose` 時顯示詳細診斷。
在編寫腳本時，請使用 `--json` 來取得完整的機器可讀輸出。

在多帳號設定中，除非您傳遞 `--account <id>`，否則 Matrix CLI 指令會使用隱含的 Matrix 預設帳號。
如果您設定了多個命名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將會停止並要求您明確選擇一個帳號。
每當您希望驗證或裝置操作明確以命名帳號為目標時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當命名帳號停用加密或無法使用加密時，Matrix 警告和驗證錯誤會指向該帳號的設定金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

### 「已驗證」的含義

OpenClaw 僅當此 Matrix 裝置經過您自己的跨簽署 身份驗證時，才會將其視為已驗證。
實務上，`openclaw matrix verify status --verbose` 會公開三種信任訊號：

- `Locally trusted`：此裝置僅受目前用戶端信任
- `Cross-signing verified`：SDK 報告該裝置已透過跨簽署驗證
- `Signed by owner`：該裝置由您自己的自我簽署金鑰簽署

`Verified by owner` 只有在存在跨簽署驗證或擁有者簽署時才會變成 `yes`。
單靠本地信任不足以讓 OpenClaw 將該裝置視為完全驗證。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定加密 Matrix 帳號的指令。
它會依序執行以下所有操作：

- 啟動秘密儲存，並在可能時重複使用現有的復原金鑰
- 啟動跨簽署並上傳遺失的公開跨簽署金鑰
- 嘗試標記並跨簽署目前的裝置
- 如果不存在伺服器端的房間金鑰備份，則建立一個新的

如果主機端伺服器需要互動式驗證才能上傳交叉簽署金鑰，OpenClaw 會先嘗試不上傳驗證，接著使用 `m.login.dummy`，然後在配置了 `channels.matrix.password` 時使用 `m.login.password`。

僅當您有意捨棄目前的交叉簽署身分並建立一個新的時，才使用 `--force-reset-cross-signing`。

如果您有意捨棄目前的房間金鑰備份並為未來的訊息建立新的備份基線，請使用 `openclaw matrix verify backup reset --yes`。
僅當您接受無法恢復的舊加密歷史記錄將保持不可用，且如果目前的備份密碼無法安全載入，OpenClaw 可能會重新建立秘密儲存時，才執行此操作。

### 全新的備份基線

如果您希望保持未來的加密訊息正常運作並接受失去無法恢復的舊歷史記錄，請按順序執行以下指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想要明確以指定的 Matrix 帳號為目標時，請將 `--account <id>` 加入每個指令中。

### 啟動行為

當 `encryption: true` 時，Matrix 預設將 `startupVerification` 設定為 `"if-unverified"`。
啟動時，如果此裝置仍未驗證，Matrix 將在另一個 Matrix 用戶端中請求自我驗證，
在一個請求待處理時跳過重複請求，並在重啟後重試之前套用本機冷卻。
預設情況下，失敗的請求嘗試比成功建立請求更早重試。
設定 `startupVerification: "off"` 以停用自動啟動請求，或者如果您想要更短或更長的重試視窗，請調整 `startupVerificationCooldownHours`。

啟動也會自動執行保守的加密引導過程。
該過程會嘗試先重用目前的秘密儲存和交叉簽署身分，並避免重置交叉簽署，除非您執行明確的引導修復流程。

如果啟動發現引導狀態損壞並且配置了 `channels.matrix.password`，OpenClaw 可以嘗試更嚴格的修復路徑。
如果目前裝置已經由所有者簽署，OpenClaw 將保留該身分，而不是自動重置它。

從先前的公開 Matrix 外掛升級：

- OpenClaw 會在可能的情況下自動重用相同的 Matrix 帳號、存取權杖和裝置身分。
- 在執行任何可執行的 Matrix 遷移變更之前，OpenClaw 會在 `~/Backups/openclaw-migrations/` 下建立或重用還原快照。
- 如果您使用多個 Matrix 帳戶，請在從舊的平面存儲佈局升級之前設定 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪個帳戶應接收該共用舊版狀態。
- 如果先前的外掛程式在本機儲存了 Matrix 房間金鑰備份解密金鑰，啟動或 `openclaw doctor --fix` 將會自動將其匯入新的還原金鑰流程。
- 如果在準備遷移後 Matrix 存取權杖發生了變更，啟動時現在會掃描同層級的權杖雜湊儲存根以尋擱置中的舊版還原狀態，然後才會放棄自動備份還原。
- 如果稍後對於同一個帳戶、主機和使用者，Matrix 存取權杖發生變更，OpenClaw 現在會傾向於重用最完整的現有權杖雜湊儲存根，而不是從空的 Matrix 狀態目錄重新開始。
- 在下一次閘道啟動時，備份的房間金鑰會自動還原到新的加密存儲中。
- 如果舊的外掛程式擁有從未備份過的僅限本機的房間金鑰，OpenClaw 將會發出明確警告。這些金鑰無法從先前的 rust crypto store 自動匯出，因此某些舊的加密歷史記錄可能會持續無法存取，直到手動還原為止。
- 請參閱 [Matrix 遷移](/en/install/migrating-matrix) 以了解完整的升級流程、限制、還原指令和常見的遷移訊息。

加密的運行時狀態是按照 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中的每個帳戶、每個使用者的權杖雜湊根組織的。
該目錄包含同步存儲 (`bot-storage.json`)、加密存儲 (`crypto/`)、
還原金鑰檔案 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
執行緒綁定 (`thread-bindings.json`) 和啟動驗證狀態 (`startup-verification.json`)
當這些功能在使用時。
當權杖變更但帳戶身分保持不變時，OpenClaw 會重用該帳戶/主機/使用者元組最佳現有的
根，以便先前的同步狀態、加密狀態、執行緒綁定
和啟動驗證狀態保持可見。

### Node crypto store 模型

此外掛程式中的 Matrix E2EE 使用官方 `matrix-js-sdk` Node 中的 Rust 加密路徑。
當您希望加密狀態在重啟後保留時，該路徑預期使用 IndexedDB 支援的持久化。

OpenClaw 目前在 Node 中透過以下方式提供此功能：

- 使用 `fake-indexeddb` 作為 SDK 預期的 IndexedDB API 模擬層
- 在 `initRustCrypto` 之前，從 `crypto-idb-snapshot.json` 還原 Rust 加密 IndexedDB 內容
- 在初始化後和執行期間，將更新的 IndexedDB 內容持久化回 `crypto-idb-snapshot.json`
- 使用建議性檔案鎖定，針對 `crypto-idb-snapshot.json` 序列化快照還原與持久化操作，以便閘道執行時期持久化和 CLI 維護不會在同一個快照檔案上發生競爭

這是相容性/儲存基礎設施，而非自訂加密實作。
快照檔案是敏感的執行時期狀態，並以限制性的檔案權限儲存。
在 OpenClaw 的安全性模型下，閘道主機和本機 OpenClaw 狀態目錄已位於受信任的操作者邊界內，因此這主要是一個操作上的持久性問題，而非獨立的遠端信任邊界。

計畫中的改進：

- 為持久的 Matrix 金鑰資料新增 SecretRef 支援，以便還原金鑰和相關的儲存加密秘密可以從 OpenClaw 祕密提供者取得，而不僅僅是本機檔案

## 個人資料管理

使用以下內容更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

當您想要明確指定命名的 Matrix 帳戶時，請新增 `--account <id>`。

Matrix 直接接受 `mxc://` 大頭貼 URL。當您傳入 `http://` 或 `https://` 大頭貼 URL 時，OpenClaw 會先將其上傳至 Matrix，然後將解析後的 `mxc://` URL 儲存回 `channels.matrix.avatarUrl` （或所選的帳戶覆寫值）。

## 自動驗證通知

Matrix 現在會將驗證生命週期通知直接以 `m.notice` 訊息的形式發佈到嚴格的 DM 驗證房間。
其中包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過表情符號驗證」指引）
- 驗證開始和完成通知
- 可用時的 SAS 詳細資訊（表情符號與十進位）

來自其他 Matrix 用戶端的傳入驗證請求會被 OpenClaw 追蹤並自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認其自身的一端。
對於來自其他 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受請求，然後等待 SAS 流程正常進行。
您仍然需要在其 Matrix 用戶端中比對表情符號或十進位 SAS，並在那裡確認「它們相符」以完成驗證。

OpenClaw 不會盲目地自動接受自我發起的重複流程。當自我驗證請求已經處於待處理狀態時，啟動過程會跳過建立新請求。

驗證協定/系統通知不會轉發至代理程式聊天管道，因此它們不會產生 `NO_REPLY`。

### 裝置衛生

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳戶上累積，使得加密聊天室的信任更難以評估。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除過時的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 直接聊天室修復

如果直接訊息狀態失去同步，OpenClaw 可能會保留過時的 `m.direct` 對映，指向舊的獨立聊天室而不是目前的 DM。使用以下指令檢查對端的目前對映：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下指令修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復過程將 Matrix 特定的邏輯保留在插件內部：

- 它偏好已在 `m.direct` 中對映的嚴格 1:1 DM
- 否則，它會回退到任何目前已加入的與該使用者的嚴格 1:1 DM
- 如果沒有健康的 DM 存在，它會建立一個新的直接聊天室並重寫 `m.direct` 以指向它

修復流程不會自動刪除舊的聊天室。它只會選擇健康的 DM 並更新對映，以便新的 Matrix 傳送、驗證通知和其他直接訊息流程再次針對正確的聊天室。

## 討論串

Matrix 支援原生 Matrix 討論串，適用於自動回覆和訊息工具傳送。

- `dm.sessionScope: "per-user"`（預設值）將 DM 路由保持在發送者範圍內，因此當多個 DM 聊天室解析為同一個對端時，它們可以共用一個工作階段。
- `dm.sessionScope: "per-room"` 將每個 DM 聊天室隔離到其自己的工作階段金鑰中，同時仍使用正常的 DM 驗證和允許清單檢查。
- 明確的 Matrix 對話綁定仍然優先於 `dm.sessionScope`，因此已綁定的房間和串流將保持其選定的目標工作階段。
- `threadReplies: "off"` 會將回覆保持在頂層，並將傳入的串流訊息保留在父工作階段中。
- `threadReplies: "inbound"` 僅在傳入訊息已位於該串流中時，才在串流內進行回覆。
- `threadReplies: "always"` 會將房間回覆保持在以觸發訊息為根的串流中，並透過來自第一個觸發訊息的對應串流範圍工作階段來路由該對話。
- `dm.threadReplies` 僅針對 DM 覆寫頂層設定。例如，您可以讓房間串流保持獨立，同時讓 DM 保持扁平。
- 傳入的串流訊息會將串流根訊息包含在內，作為額外的 Agent 語境。
- 當目標是同一個房間或同一個 DM 使用者目標時，訊息工具發送現在會自動繼承目前的 Matrix 串流，除非提供了明確的 `threadId`。
- 僅當目前的工作階段元資料證明是同一個 Matrix 帳戶上的同一個 DM 對象時，才會啟用同工作階段 DM 使用者目標的重用；否則 OpenClaw 會回退到正常的使用者範圍路由。
- 當 OpenClaw 發現 Matrix DM 房間在同一個共享的 Matrix DM 工作階段上與另一個 DM 房間衝突時，如果啟用了串流綁定且具有 `dm.sessionScope` 提示，它會在該房間中發布一次性 `m.notice`，並附帶 `/focus` 緊急逃生開關。
- Matrix 支援執行時期串流綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和串流綁定的 `/acp spawn` 現在可在 Matrix 房間和 DM 中運作。
- 當 `threadBindings.spawnSubagentSessions=true` 時，頂層 Matrix 房間/DM 的 `/focus` 會建立一個新的 Matrix 串流並將其綁定到目標工作階段。
- 在現有的 Matrix 串流中執行 `/focus` 或 `/acp spawn --thread here` 會改為綁定該目前的串流。

## ACP 對話綁定

Matrix 房間、DM 和現有的 Matrix 串流可以在不改變聊天介面的情況下轉換為持久的 ACP 工作區。

快速操作員流程：

- 在您想要繼續使用的 Matrix 私訊、聊天室或現有討論串內執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix 私訊或聊天室中，當前的私訊/聊天室保持為聊天介面，且未來的訊息會路由到生成的 ACP 工作階段。
- 在現有的 Matrix 討論串內，`--bind here` 會將該當前討論串就地綁定。
- `/new` 和 `/reset` 會就地重設同一個已綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 討論串。
- 只有在 `/acp spawn --thread auto|here` 中才需要 `threadBindings.spawnAcpSessions`，因為此時 OpenClaw 需要建立或綁定子 Matrix 討論串。

### 討論串綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 討論串綁定生成標誌為選用功能：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 討論串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 工作階段綁定到 Matrix 討論串。

## 反應

Matrix 支援傳出反應動作、傳入反應通知以及傳入 ack 反應。

- 傳出反應工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 會對特定的 Matrix 事件新增反應。
- `reactions` 會列出特定 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人帳戶在該事件上的自身反應。
- `remove: true` 僅會從機器人帳戶移除指定的表情符號反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- agent identity emoji fallback

Ack 反應範圍按此順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式解析順序如下：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 預設值： `own`

目前行為：

- 當目標為機器人發送的 Matrix 訊息時，`reactionNotifications: "own"` 會轉發新增的 `m.reaction` 事件。
- `reactionNotifications: "off"` 會停用反應系統事件。
- 反應移除尚未合併為系統事件，因為 Matrix 將其顯示為撤銷 (redactions)，而非獨立的 `m.reaction` 移除。

## 歷史紀錄背景 (History context)

- `channels.matrix.historyLimit` 控制當 Matrix 房間訊息觸發代理程式 (agent) 時，包含多少最近的房間訊息作為 `InboundHistory`。
- 它會回退至 `messages.groupChat.historyLimit`。設定 `0` 以停用。
- Matrix 房間歷史紀錄僅限於房間。私訊 (DM) 會繼續使用一般的工作階段歷史紀錄。
- Matrix 房間歷史紀錄僅包含待處理訊息：OpenClaw 會緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時擷取該時間範圍的快照。
- 目前的觸發訊息不包含在 `InboundHistory` 中；它會保留在該回合的主要輸入內容中。
- 同一 Matrix 事件的重試會重用原始的歷史紀錄快照，而不是向前漂移至較新的房間訊息。

## 背景可見性

Matrix 支援共享的 `contextVisibility` 控制，用於額外的房間背景，例如擷取的回覆文字、討論串根節點和待處理歷史紀錄。

- `contextVisibility: "all"` 為預設值。額外的背景將保持接收時的狀態。
- `contextVisibility: "allowlist"` 會將額外的背景篩選為目前有效的房間/使用者白名單檢查所允許的發送者。
- `contextVisibility: "allowlist_quote"` 的行為類似 `allowlist`，但仍會保留一個明確的引用回覆。

此設定會影響額外背景的可見性，而非輸入訊息本身是否可以觸發回覆。
觸發授權仍來自 `groupPolicy`、`groups`、`groupAllowFrom` 和私訊 (DM) 政策設定。

## 私訊 (DM) 與房間政策範例

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

請參閱 [群組](/en/channels/groups) 以了解提及閘道和允許清單行為。

Matrix 私訊的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息給您，OpenClaw 會重複使用相同的待處理配對碼，並可能經過短暫冷卻後再次發送提醒回覆，而不是生成新碼。

請參閱 [配對](/en/channels/pairing) 以了解共用私訊配對流程和儲存佈局。

## Exec 核准

Matrix 可作為 Matrix 帳號的 exec 核准用戶端。

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers`（選用；若未設定則回退為 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target`（`dm` | `channel` | `both`，預設：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

核准者必須是 Matrix 使用者 ID，例如 `@owner:example.org`。當 `enabled` 未設定或為 `"auto"` 且可解析至少一個核准者（無論是來自 `execApprovals.approvers` 還是 `channels.matrix.dm.allowFrom`）時，Matrix 會自動啟用原生 exec 核准。設定 `enabled: false` 可明確停用 Matrix 作為原生核准用戶端。否則，核准請求會回退至其他設定的核准路由或 exec 核准回退政策。

目前原生 Matrix 路由僅限 exec：

- `channels.matrix.execApprovals.*` 僅控制 exec 核准的原生私訊/頻道路由。
- 外掛程式核准仍會使用共用的相同聊天 `/approve` 以及任何設定的 `approvals.plugin` 轉發。
- 當 Matrix 能夠安全推斷核准者時，仍可重複使用 `channels.matrix.dm.allowFrom` 進行外掛程式核准授權，但它不會公開獨立的原生外掛程式核准私訊/頻道分發路徑。

傳遞規則：

- `target: "dm"` 將核准提示傳送至核准者的私訊
- `target: "channel"` 將提示傳回原始的 Matrix 房間或私訊
- `target: "both"` 傳送至核准者的私訊以及原始的 Matrix 房間或私訊

Matrix 核准提示會在主要核准訊息上植入反應捷徑：

- `✅` = 允許一次
- `❌` = 拒絕
- `♾️` = 當有效的執行策略允許該決定時，始終允許

審核者可以對該訊息做出反應，或使用備用的斜線指令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的審核者可以批准或拒絕。頻道傳遞包含指令文字，因此僅在受信任的房間中啟用 `channel` 或 `both`。

Matrix 批准提示會重複使用共用的核心批准計畫器。Matrix 特定的原生介面僅作為執行批准的傳輸層：房間/DM 路由以及訊息傳送/更新/刪除行為。

每個帳號的覆寫：

- `channels.matrix.accounts.<account>.execApprovals`

相關文件：[執行批准](/en/tools/exec-approvals)

## 多重帳號範例

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

頂層 `channels.matrix` 值充當命名帳號的預設值，除非帳號覆寫了它們。
您可以使用 `groups.<room>.account`（或舊版 `rooms.<room>.account`）將繼承的房間條目限定於一個 Matrix 帳號。
沒有 `account` 的條目在所有 Matrix 帳號之間保持共享，而帶有 `account: "default"` 的條目在直接於頂層 `channels.matrix.*` 配置預設帳號時仍然有效。
部分共享的身份驗證預設值不會自行創建單獨的隱式預設帳號。OpenClaw 僅在該預設值具有新的身份驗證資訊（`homeserver` 加上 `accessToken`，或 `homeserver` 加上 `userId` 和 `password`）時才合成頂層 `default` 帳號；當快取的憑證稍後滿足身份驗證時，命名帳號仍然可以從 `homeserver` 加上 `userId` 中被發現。
如果 Matrix 已經只有一個命名帳號，或者 `defaultAccount` 指向現有的命名帳號金鑰，單帳號到多帳號的修復/設置升級將保留該帳號，而不是創建新的 `accounts.default` 條目。只有 Matrix 身份驗證/引導金鑰會移入該升級的帳號；共享的傳遞策略金鑰保留在頂層。
當您希望 OpenClaw 對隱式路由、探測和 CLI 操作偏好一個命名 Matrix 帳號時，請設定 `defaultAccount`。
如果您配置了多個命名帳號，請設定 `defaultAccount` 或為依賴隱式帳號選擇的 CLI 命令傳遞 `--account <id>`。
當您想為一個命令覆寫該隱式選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私人/LAN 家庭伺服器

預設情況下，除非您針對每個帳號明確選擇加入，否則 OpenClaw 為了 SSRF 保護會封鎖私人/內部 Matrix 家庭伺服器。

如果您的家庭伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳號啟用 `allowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      allowPrivateNetwork: true,
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

此選項僅允許受信任的私人/內部目標。公開的明文主伺服器（例如 `http://matrix.example.org:8008`）仍會被阻擋。請盡可能優先使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要指定的輸出 HTTP(S) 代理，請設定 `channels.matrix.proxy`：

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
OpenClaw 對於執行時 Matrix 流量和帳號狀態探測使用相同的代理設定。

## 目標解析

在 OpenClaw 要求您提供房間或使用者目標的任何地方，Matrix 接受以下目標格式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查詢使用已登入的 Matrix 帳號：

- 使用者查詢會向該主伺服器上的 Matrix 使用者目錄發出請求。
- 房間查詢會直接接受明確的房間 ID 和別名，然後退而搜尋該帳號已加入的房間名稱。
- 已加入房間名稱的查詢是盡力而為的。如果房間名稱無法解析為 ID 或別名，它將會被執行時允許清單解析忽略。

## 設定參考

- `enabled`：啟用或停用此頻道。
- `name`：帳號的選用標籤。
- `defaultAccount`：當設定了多個 Matrix 帳號時，優先使用的帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允許此 Matrix 帳號連線到私人/內部主伺服器。當主伺服器解析為 `localhost`、LAN/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此選項。
- `proxy`：Matrix 流量的選用 HTTP(S) 代理 URL。命名帳號可以使用自己的 `proxy` 覆蓋頂層預設值。
- `userId`：完整的 Matrix 使用者 ID，例如 `@bot:example.org`。
- `accessToken`：基於令牌驗證的存取權杖。在 env/file/exec 提供者中，支援純文字值和 SecretRef 值作為 `channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken`。請參閱[機密管理](/en/gateway/secrets)。
- `password`：基於密碼登入的密碼。支援純文字值和 SecretRef 值。
- `deviceId`：明確指定的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於設定檔同步和 `set-profile` 更新的已儲存自我大頭貼 URL。
- `initialSyncLimit`：啟動同步事件限制。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：對 DM 和房間強制執行僅允許清單行為。
- `allowBots`：允許來自其他已設定 OpenClaw Matrix 帳戶（`true` 或 `"mentions"`）的訊息。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：補充房間上下文可見性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`：房間流量的使用者 ID 允許清單。
- `groupAllowFrom` 項目應為完整的 Matrix 使用者 ID。執行時會忽略無法解析的名稱。
- `historyLimit`：作為群組歷史上下文包含的房間訊息數量上限。預設為 `messages.groupChat.historyLimit`。設為 `0` 以停用。
- `replyToMode`：`off`、`first` 或 `all`。
- `markdown`：傳出 Matrix 文字的可選 Markdown 渲染設定。
- `streaming`: `off` (預設)、`partial`、`quiet`、`true` 或 `false`。`partial` 和 `true` 啟用使用一般 Matrix 文字訊息的優先預覽草稿更新。`quiet` 使用自託管推送規則設定的非通知預覽通知。
- `blockStreaming`: `true` 啟用針對已完成助理區塊的個別進度訊息，同時維持草稿預覽串流啟用。
- `threadReplies`: `off`、`inbound` 或 `always`。
- `threadBindings`: 每個頻道的繫結會話路由與生命週期覆寫。
- `startupVerification`: 啟動時的自動自我驗證請求模式 (`if-unverified`、`off`)。
- `startupVerificationCooldownHours`: 重試自動啟動驗證請求前的冷卻時間。
- `textChunkLimit`: 外送訊息區塊大小。
- `chunkMode`: `length` 或 `newline`。
- `responsePrefix`: 外送回覆的選用訊息前綴。
- `ackReaction`: 此頻道/帳號的選用 ack 回應覆寫。
- `ackReactionScope`: 選用 ack 回應範圍覆寫 (`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`)。
- `reactionNotifications`: 內送回應通知模式 (`own`、`off`)。
- `mediaMaxMb`: Matrix 媒體處理的媒體大小上限 (單位 MB)。此上限套用於外送傳送和內送媒體處理。
- `autoJoin`：邀請自動加入策略 (`always`、`allowlist`、`off`)。預設值：`off`。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時允許的房間/別名。別名條目會在處理邀請時解析為房間 ID；OpenClaw 不信任受邀房間聲稱的別名狀態。
- `dm`：DM 政策區塊 (`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`)。
- `dm.allowFrom` 條目應為完整的 Matrix 使用者 ID，除非您已透過即時目錄查詢解析了它們。
- `dm.sessionScope`：`per-user` (預設值) 或 `per-room`。當您希望每個 Matrix DM 房間即使對象相同也保持獨立的語境時，請使用 `per-room`。
- `dm.threadReplies`：僅限 DM 的執行緒策略覆寫 (`off`、`inbound`、`always`)。它會覆寫頂層的 `threadReplies` 設定，適用於 DM 中的回覆放置和工作階段隔離。
- `execApprovals`：Matrix 原生執行批准傳遞 (`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`)。
- `execApprovals.approvers`：獲准批准執行請求的 Matrix 使用者 ID。當 `dm.allowFrom` 已識別批准者時為選填。
- `execApprovals.target`：`dm | channel | both` (預設值：`dm`)。
- `accounts`：命名的個別帳戶覆寫。頂層 `channels.matrix` 值作為這些條目的預設值。
- `groups`：每個房間的策略映射。建議優先使用房間 ID 或別名；無法解析的房間名稱會在執行時被忽略。會話/群組身分在解析後使用穩定的房間 ID，而人類可讀的標籤仍然來自房間名稱。
- `groups.<room>.account`：在多重帳號設定中，將繼承的房間條目限制為特定的 Matrix 帳號。
- `groups.<room>.allowBots`：針對已配置機器人發送者 (`true` 或 `"mentions"`) 的房間層級覆寫。
- `groups.<room>.users`：每個房間的發送者允許清單。
- `groups.<room>.tools`：每個房間的工具允許/拒絕覆寫。
- `groups.<room>.autoReply`：房間層級的提及閘門覆寫。`true` 會停用該房間的提及要求；`false` 則會強制重新啟用。
- `groups.<room>.skills`：選用的房間層級技能過濾器。
- `groups.<room>.systemPrompt`：選用的房間層級系統提示詞片段。
- `rooms`：`groups` 的舊版別名。
- `actions`：每個動作的工具閘門 (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`)。

## 相關

- [通道概述](/en/channels) — 所有支援的通道
- [配對](/en/channels/pairing) — DM 身份驗證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘門
- [通道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化
