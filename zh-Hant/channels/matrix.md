---
summary: "Matrix 支援狀態、功能和設定"
read_when:
  - 正在處理 Matrix 頻道功能
title: "Matrix"
---

# Matrix (外掛程式)

Matrix 是一個開放、去中心化的訊息傳遞協定。OpenClaw 會以 Matrix **用戶** 身份
連線至任何主伺服器，因此您需要為機器人準備一個 Matrix 帳號。一旦登入後，您可以直接
與機器人傳送私訊，或將其邀請至房間（Matrix 「群組」）。Beeper 也是有效的用戶端選項，
但需要啟用 E2EE。

狀態：透過外掛 (@vector-im/matrix-bot-sdk) 支援。支援私訊、房間、討論串、媒體、反應、
投票（發送 + 將投票開始視為文字）、位置以及 E2EE（含加密支援）。

## 需要外掛程式

Matrix 以外掛程式形式提供，並未隨附於核心安裝中。

透過 CLI 安裝（npm registry）：

```bash
openclaw plugins install @openclaw/matrix
```

本地結帳（當從 git repo 執行時）：

```bash
openclaw plugins install ./extensions/matrix
```

如果您在設定期間選擇 Matrix 且偵測到 git 檢出，
OpenClaw 將自動提供本機安裝路徑。

詳細資訊：[外掛](/zh-Hant/tools/plugin)

## 設定

1. 安裝 Matrix 外掛程式：
   - 從 npm 安裝：`openclaw plugins install @openclaw/matrix`
   - 從本機檢出安裝：`openclaw plugins install ./extensions/matrix`
2. 在主伺服器上建立 Matrix 帳號：
   - 瀏覽 [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/) 上的託管選項
   - 或自行託管。
3. 取得機器人帳號的存取權杖：
   - 在您的主伺服器使用 Matrix 登入 API 並搭配 `curl`：

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - 將 `matrix.example.org` 替換為您的主伺服器 URL。
   - 或設定 `channels.matrix.userId` + `channels.matrix.password`：OpenClaw 會呼叫相同的
     登入端點，將存取權杖儲存在 `~/.openclaw/credentials/matrix/credentials.json` 中，
     並在下次啟動時重複使用。

4. 設定憑證：
   - 環境變數：`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN` (或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`)
   - 或設定檔：`channels.matrix.*`
   - 如果兩者皆已設定，以設定檔為優先。
   - 使用存取權杖：用戶 ID 會透過 `/whoami` 自動擷取。
   - 設定時，`channels.matrix.userId` 應為完整的 Matrix ID (例如：`@bot:example.org`)。
5. 重新啟動閘道 (或完成設定)。
6. 從任何 Matrix 用戶端啟動與機器人的私訊，或將其邀請至房間
   (Element, Beeper 等；請參閱 [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/))。Beeper 需要 E2EE，
   因此請設定 `channels.matrix.encryption: true` 並驗證裝置。

最基本設定（存取權杖，使用者 ID 自動取得）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" },
    },
  },
}
```

E2EE 設定（已啟用端對端加密）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

## 加密 (E2EE)

透過 Rust crypto SDK **支援**端對端加密。

使用 `channels.matrix.encryption: true` 啟用：

- 如果加密模組載入，加密房間將會自動解密。
- 傳送至加密房間時，外傳媒體會被加密。
- 首次連線時，OpenClaw 會要求您的其他工作階段驗證裝置。
- 在另一個 Matrix 客戶端（Element 等）中驗證裝置以啟用金鑰共用。
- 如果無法載入加密模組，E2EE 將會停用且加密房間將無法解密；
  OpenClaw 會記錄警告。
- 如果您看到缺少加密模組錯誤（例如 `@matrix-org/matrix-sdk-crypto-nodejs-*`），
  請允許 `@matrix-org/matrix-sdk-crypto-nodejs` 的建置腳本並執行
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` 或使用
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 取得二進位檔。

加密狀態是根據每個帳號 + 存取令牌儲存在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
（SQLite 資料庫）中。同步狀態與其一起儲存在 `bot-storage.json` 中。
如果存取令牌（裝置）變更，會建立一個新的儲存空間，且必須為加密房間重新驗證機器人。

**裝置驗證：**
當啟用 E2EE 時，機器人會在啟動時向您的其他工作階段請求驗證。
請開啟 Element（或另一個用戶端）並核准驗證請求以建立信任。
一旦驗證完成，機器人即可在加密房間中解密訊息。

## 多重帳號

多帳號支援：使用 `channels.matrix.accounts` 搭配每個帳號的憑證和選用的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 以了解共用模式。

每個帳號都會在任何主伺服器上作為獨立的 Matrix 使用者執行。每個帳號的設定
會繼承自頂層 `channels.matrix` 設定，並且可以覆寫任何選項
（DM 政策、群組、加密等）。

```json5
{
  channels: {
    matrix: {
      enabled: true,
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          name: "Main assistant",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_***",
          encryption: true,
        },
        alerts: {
          name: "Alerts bot",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_***",
          dm: { policy: "allowlist", allowFrom: ["@admin:example.org"] },
        },
      },
    },
  },
}
```

備註：

- 帳號啟動已序列化，以避免與並行模組匯入產生的競爭條件。
- 環境變數（`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN` 等）僅適用於 **預設** 帳號。
- 基礎頻道設定（DM 政策、群組政策、提及閘門等）適用於所有帳號，除非針對個別帳號進行覆寫。
- 使用 `bindings[].match.accountId` 將每個帳號路由到不同的代理程式。
- 加密狀態是依據帳號 + 存取權杖儲存的（每個帳號有獨立的金鑰儲存庫）。

## 路由模型

- 回覆一律傳回 Matrix。
- DM 共用代理程式的主工作階段；房間則對應至群組工作階段。

## 存取控制（DM）

- 預設值：`channels.matrix.dm.policy = "pairing"`。未知的發送者會收到配對碼。
- 透過以下方式核准：
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- 公開 DM：`channels.matrix.dm.policy="open"` 加上 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 接受完整的 Matrix 使用者 ID（例如：`@user:server`）。當目錄搜尋找到單一完全符合的項目時，精靈會將顯示名稱解析為使用者 ID。
- 請勿使用顯示名稱或純本地部分（例如：`"Alice"` 或 `"alice"`）。它們具有歧義，且會被允許清單匹配忽略。請使用完整的 `@user:server` ID。

## 房間（群組）

- 預設值：`channels.matrix.groupPolicy = "allowlist"`（提及限制）。當未設定時，使用 `channels.defaults.groupPolicy` 來覆寫預設值。
- 執行時注意：如果 `channels.matrix` 完全缺失，執行時會回退到 `groupPolicy="allowlist"` 進行房間檢查（即使設定了 `channels.defaults.groupPolicy`）。
- 使用 `channels.matrix.groups` 將房間加入允許清單（房間 ID 或別名；當目錄搜尋找到單個完全符合的項目時，名稱會解析為 ID）：

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
      groupAllowFrom: ["@owner:example.org"],
    },
  },
}
```

- `requireMention: false` 可在該房間內啟用自動回覆。
- `groups."*"` 可為跨房間的提及閘控設定預設值。
- `groupAllowFrom` 限制哪些傳送者可以在房間內觸發機器人（完整的 Matrix 使用者 ID）。
- 各房間的 `users` 允許清單可以進一步限制特定房間內的傳送者（請使用完整的 Matrix 使用者 ID）。
- 設定精靈會提示輸入房間允許清單（房間 ID、別名或名稱），並且僅在找到單一精確符合時才解析名稱。
- 在啟動時，OpenClaw 會將允許清單中的房間/使用者名稱解析為 ID 並記錄映射關係；未解析的條目將在允許清單匹配時被忽略。
- 預設會自動加入邀請；使用 `channels.matrix.autoJoin` 和 `channels.matrix.autoJoinAllowlist` 進行控制。
- 若不允許任何房間，請設定 `channels.matrix.groupPolicy: "disabled"`（或保持允許清單為空）。
- 舊版金鑰：`channels.matrix.rooms`（形狀與 `groups` 相同）。

## 串回

- 支援回覆串回。
- `channels.matrix.threadReplies` 控制回覆是否保留在討論串中：
  - `off`、`inbound`（預設）、`always`
- `channels.matrix.replyToMode` 控制不在討論串中回覆時的回覆目標元資料：
  - `off`（預設）、`first`、`all`

## 功能

| 功能         | 狀態                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| 直接訊息 | ✅ 已支援                                                                          |
| 房間           | ✅ 已支援                                                                          |
| 串回         | ✅ 已支援                                                                          |
| 媒體           | ✅ 已支援                                                                          |
| E2EE            | ✅ 已支援（需要 crypto 模組）                                                 |
| 反應       | ✅ 已支援（透過工具傳送/讀取）                                                    |
| 投票           | ✅ 傳送已支援；傳入的投票開始會轉換為文字（回覆/結束會被忽略） |
| 位置        | ✅ 已支援（geo URI；高度被忽略）                                              |
| 原生指令 | ✅ 已支援                                                                          |

## 疑難排解

請先執行此階梯：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後視需要確認 DM 配對狀態：

```bash
openclaw pairing list matrix
```

常見失敗情況：

- 已登入但房間訊息被忽略：房間被 `groupPolicy` 封鎖或受到房間允許清單限制。
- 私訊被忽略：當 `channels.matrix.dm.policy="pairing"` 時，傳送者等待核准。
- 加密房間失敗：crypto 支援或加密設定不匹配。

分診流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 組態參考

完整配置：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.matrix.enabled`：啟用/停用通道啟動。
- `channels.matrix.homeserver`：主伺服器 URL。
- `channels.matrix.userId`：Matrix 使用者 ID（若有存取權杖則為選用）。
- `channels.matrix.accessToken`：存取權杖。
- `channels.matrix.password`：登入密碼（權杖已儲存）。
- `channels.matrix.deviceName`：裝置顯示名稱。
- `channels.matrix.encryption`：啟用 E2EE（預設：false）。
- `channels.matrix.initialSyncLimit`：初始同步限制。
- `channels.matrix.threadReplies`：`off | inbound | always`（預設：inbound）。
- `channels.matrix.textChunkLimit`：輸出文字區塊大小（字元）。
- `channels.matrix.chunkMode`：`length`（預設）或 `newline`，以便在長度分割前依據空白行（段落邊界）分割。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.matrix.dm.allowFrom`：DM 許可名單（完整的 Matrix 使用者 ID）。`open` 需要 `"*"`。精靈會盡可能將名稱解析為 ID。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（預設：allowlist）。
- `channels.matrix.groupAllowFrom`：群組訊息的許可發送者（完整的 Matrix 使用者 ID）。
- `channels.matrix.allowlistOnly`：對 DM + 房間強制執行許可名單規則。
- `channels.matrix.groups`：群組許可名單 + 每個房間的設定對應。
- `channels.matrix.rooms`：舊版群組許可名單/設定。
- `channels.matrix.replyToMode`：執行緒/標籤的回覆模式。
- `channels.matrix.mediaMaxMb`：輸入/輸出媒體上限（MB）。
- `channels.matrix.autoJoin`：邀請處理方式（`always | allowlist | off`，預設：always）。
- `channels.matrix.autoJoinAllowlist`：允許自動加入的房間 ID/別名。
- `channels.matrix.accounts`：依帳戶 ID 索引的多帳戶設定（每個帳戶繼承頂層設定）。
- `channels.matrix.actions`：依動作的工具閘控（reactions/messages/pins/memberInfo/channelInfo）。

import en from "/components/footer/en.mdx";

<en />
