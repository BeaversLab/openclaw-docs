---
summary: "Matrix 支援狀態、設定及設定範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (外掛程式)

Matrix 是 OpenClaw 的 Matrix 頻道外掛程式。
它使用官方的 `matrix-js-sdk` 並支援 DM、聊天室、主題串、媒體、反應、投票、位置及 E2EE。

## 必要的外掛程式

Matrix 是一個外掛程式，並未隨附於核心 OpenClaw 中。

從 npm 安裝：

```bash
openclaw plugins install @openclaw/matrix
```

從本機簽出安裝：

```bash
openclaw plugins install ./extensions/matrix
```

請參閱 [Plugins](/en/tools/plugin) 以了解插件行為和安裝規則。

## 設定

1. 安裝此外掛程式。
2. 在您的 homeserver 上建立一個 Matrix 帳號。
3. 使用以下任一方式設定 `channels.matrix`：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重新啟動閘道。
5. 開始與機器人的 DM，或將其邀請至聊天室。

互動式設定路徑：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 精靈實際要求的項目：

- homeserver URL
- 驗證方法：存取權杖或密碼
- 僅在選擇密碼驗證時需要使用者 ID
- 選用的裝置名稱
- 是否啟用 E2EE
- 是否立即設定 Matrix 聊天室存取權

重要的精靈行為：

- 若所選帳號的 Matrix 驗證環境變數已存在，且該帳號尚未在設定中儲存驗證資訊，精靈將提供環境捷徑，且僅為該帳號寫入 `enabled: true`。
- 當您以互動方式新增另一個 Matrix 帳號時，輸入的帳號名稱會被正規化為設定與環境變數中使用的帳號 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- DM 允許清單提示會立即接受完整的 `@user:server` 值。僅在即時目錄查詢找到一個完全符合的項目時，顯示名稱才有效；否則精靈會要求您使用完整的 Matrix ID 重試。
- 聊天室允許清單提示會直接接受聊天室 ID 和別名。它們也可以即時解析已加入的聊天室名稱，但在設定期間未解析的名稱僅會保留為輸入的樣子，並會在之後的執行時期允許清單解析中被忽略。建議優先使用 `!room:server` 或 `#alias:server`。
- 運行時房間/會話身分使用穩定的 Matrix 房間 ID。房間宣告的別名僅用作查找輸入，不作為長期會話金鑰或穩定群組身分。
- 若要在儲存房間名稱之前解析它們，請使用 `openclaw channels resolve --channel matrix "Project Room"`。

最小權杖 設定：

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

基於密碼的設定（登入後會快取權杖）：

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
預設帳戶使用 `credentials.json`；命名帳戶使用 `credentials-<account>.json`。

對應的環境變數（在未設定配置金鑰時使用）：

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

對於正規化的帳戶 ID `ops-bot`，請使用：

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

只有在那些認證環境變數已經存在，且選定的帳戶尚未在配置中儲存 Matrix 認證時，互動式精靈才會提供環境變數捷徑。

## 配置範例

這是一個包含 DM 配對、房間允許清單和已啟用 E2EE 的實用基線配置：

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
    },
  },
}
```

## E2EE 設定

## Bot 與 Bot 房間

根據預設，來自其他已設定 OpenClaw Matrix 帳戶的 Matrix 訊息會被忽略。

當您有意需要代理程式之間的 Matrix 流量時，請使用 `allowBots`：

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
- `groups.<room>.allowBots` 會針對單一房間覆寫帳戶層級的設定。
- OpenClaw 仍然會忽略來自相同 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 並未在此公開原生機器人旗標；OpenClaw 將「由機器人撰寫」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳號所傳送」。

在共用聊天室中啟用機器人對機器人通訊時，請使用嚴格的聊天室允許清單和提及要求。

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

在機器可讀輸出中包含儲存的復原金鑰：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導跨簽署和驗證狀態：

```bash
openclaw matrix verify bootstrap
```

多帳號支援：使用 `channels.matrix.accounts` 搭配各個帳號的憑證和可選的 `name`。請參閱 [Configuration reference](/en/gateway/configuration-reference#multi-account-all-channels) 以了解共用模式。

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導前強制重設為全新的跨簽署身分：

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

檢查聊天室金鑰備份健康狀況：

```bash
openclaw matrix verify backup status
```

詳細備份健康狀況診斷：

```bash
openclaw matrix verify backup status --verbose
```

從伺服器備份還原聊天室金鑰：

```bash
openclaw matrix verify backup restore
```

詳細還原診斷：

```bash
openclaw matrix verify backup restore --verbose
```

刪除目前的伺服器備份並建立全新的備份基線：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 指令預設為簡潔模式（包括安靜的內部 SDK 記錄），只有在加上 `--verbose` 時才會顯示詳細診斷。
在編寫腳本時，請使用 `--json` 以取得完整的機器可讀輸出。

在多帳號設定中，Matrix CLI 指令會使用隱含的 Matrix 預設帳號，除非您傳遞 `--account <id>`。
如果您設定了多個命名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將會停止並要求您明確選擇一個帳號。
每當您希望驗證或裝置操作明確以某個命名帳號為目標時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當某個命名帳號停用或無法使用加密時，Matrix 警告和驗證錯誤會指向該帳號的設定鍵，例如 `channels.matrix.accounts.assistant.encryption`。

### 「已驗證」的含義

OpenClaw 只有在 Matrix 裝置經過您自己的跨簽署身分驗證時，才會將其視為已驗證。
實務上，`openclaw matrix verify status --verbose` 公開了三種信任訊號：

- `Locally trusted`：此裝置僅受目前用戶端信任
- `Cross-signing verified`：SDK 報告該裝置已透過交叉簽署驗證
- `Signed by owner`：該裝置由您自己的自我簽署金鑰簽署

`Verified by owner` 僅在存在交叉簽署驗證或擁有者簽署時才會變為 `yes`。
單獨的本地信任不足以讓 OpenClaw 將該裝置視為完全驗證。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定加密 Matrix 帳號的指令。
它會依序執行以下所有操作：

- 引導秘密儲存，盡可能重複使用現有的復原金鑰
- 引導交叉簽署並上傳遺失的公開交叉簽署金鑰
- 嘗試標記並交叉簽署目前裝置
- 如果尚未存在伺服器端的房間金鑰備份，則建立一個新的

如果住宅伺服器需要互動式驗證才能上傳交叉簽署金鑰，OpenClaw 會先嘗試不經驗證上傳，然後在 `channels.matrix.password` 已設定時，依序嘗試使用 `m.login.dummy` 和 `m.login.password`。

僅當您有意丟棄目前的交叉簽署身分並建立新的身分時，才使用 `--force-reset-cross-signing`。

如果您有意丟棄目前的房間金鑰備份並為未來的訊息建立新的備份基準，請使用 `openclaw matrix verify backup reset --yes`。
僅當您接受無法復原的舊加密歷史記錄將保持無法存取的狀態時，才這樣做。

### 全新的備份基準

如果您希望讓未來的加密訊息能正常運作，並接受失去無法復原的舊歷史記錄，請依序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想要明確指定具名的 Matrix 帳號時，請在每個指令中加入 `--account <id>`。

### 啟動行為

當 `encryption: true` 時，Matrix 會將 `startupVerification` 預設為 `"if-unverified"`。
啟動時，如果此裝置尚未驗證，Matrix 將會在另一個 Matrix 客戶端中請求自我驗證，
在已有請求擱置時跳過重複請求，並在重啟後重試之前套用本機冷卻。
預設情況下，失敗的請嘗試會比成功建立請求更早重試。
將 `startupVerification: "off"` 設定為停用自動啟動請求，或者如果您想要更短或更長的重試間隔，請調整 `startupVerificationCooldownHours`。

啟動時也會自動執行保守的加密引導程序。
該程序會嘗試優先重用目前的祕密儲存和跨簽署身份，並且避免重置跨簽署，除非您執行明確的引導修復流程。

如果啟動時發現引導狀態損壞並且已設定 `channels.matrix.password`，OpenClaw 可以嘗試更嚴格的修復路徑。
如果目前的裝置已經由擁有者簽署，OpenClaw 將保留該身份而不是自動重置它。

從先前的公開 Matrix 外掛升級：

- OpenClaw 會在可能時自動重用相同的 Matrix 帳戶、存取權杖和裝置身份。
- 在任何可執行的 Matrix 遷移變更執行之前，OpenClaw 會在 `~/Backups/openclaw-migrations/` 下建立或重用還原快照。
- 如果您使用多個 Matrix 帳戶，請在從舊的平面儲存佈局升級之前設定 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪個帳戶應該接收該共享的舊版狀態。
- 如果先前的外掛在本機儲存了 Matrix 房間金鑰備份解密金鑰，啟動或 `openclaw doctor --fix` 將會自動將其匯入新的還原金鑰流程。
- 如果在準備遷移後 Matrix 存取權杖發生變更，啟動現在會在放棄自動備份還原之前，掃描同層級的權杖雜湊儲存根以尋找擱置的舊版還原狀態。
- 如果之後針對相同的帳戶、主機伺服器和用戶變更了 Matrix 存取權杖，OpenClaw 現在會傾向於重用最完整的現有權杖雜湊儲存根，而不是從空的 Matrix 狀態目錄重新開始。
- 在下一次閘道啟動時，備份的房間金鑰會自動還原到新的加密儲存中。
- 如果舊外掛程式有從未備份的僅限本機的房間金鑰，OpenClaw 將會發出明確警告。由於這些金鑰無法從先前的 rust crypto 存儲自動匯出，因此一些舊的加密歷史記錄可能會保持不可用，直到手動恢復。
- 請參閱 [Matrix migration](/en/install/migrating-matrix) 以了解完整的升級流程、限制、復原指令和常見的遷移訊息。

加密的運行時狀態是按帳號、按用戶令牌哈希根組織在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`
下。
該目錄包含同步存儲 (`bot-storage.json`)、加密存儲 (`crypto/`)、
恢復金鑰檔案 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
線程綁定 (`thread-bindings.json`) 和啟動驗證狀態 (`startup-verification.json`)
（當這些功能處於使用狀態時）。
當令牌發生更改但帳號身份保持不變時，OpenClaw 會為該帳號/主服務器/用戶元組重用最佳現有
根，以便先前的同步狀態、加密狀態、線程綁定
和啟動驗證狀態保持可見。

### Node 加密存儲模型

此外掛程式中的 Matrix E2EE 使用官方 `matrix-js-sdk` Node 中的 Rust crypto 路徑。
當您希望加密狀態在重啟後保持有效時，該路徑預期使用 IndexedDB 支持的持久化。

OpenClaw 目前在 Node 中通過以下方式提供此功能：

- 使用 `fake-indexeddb` 作為 SDK 預期的 IndexedDB API shim
- 在 `initRustCrypto` 之前，從 `crypto-idb-snapshot.json` 恢復 Rust crypto IndexedDB 內容
- 在初始化後和運行時，將更新的 IndexedDB 內容持久化回 `crypto-idb-snapshot.json`

這是兼容性/存儲管道，而不是自定義的加密實現。
快照檔案是敏感的運行時狀態，並以限制性檔案權限存儲。
在 OpenClaw 的安全模型下，網關主機和本地 OpenClaw 狀態目錄已經位於受信任的操作員邊界內，因此這主要是操作持久性問題，而不是單獨的遠程信任邊界。

計劃的改進：

- 新增對持久化 Matrix 金鑰素材的 SecretRef 支援，以便恢復金鑰和相關的商店加密秘密可以從 OpenClaw 秘密提供者來源取得，而不僅限於本地檔案

## 自動驗證通知

Matrix 現在會將驗證生命週期通知直接發布到嚴格的 DM 驗證房間中，作為 `m.notice` 訊息。
其中包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過表情符號驗證」指引）
- 驗證開始和完成通知
- SAS 詳細資料（表情符號和十進位）

來自另一個 Matrix 用戶端的傳入驗證請求會被 OpenClaw 追蹤並自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認自己這一方。
對於來自其他 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受該請求，然後等待 SAS 流程正常進行。
您仍然需要在 Matrix 用戶端中比較表情符號或十進位 SAS，並在那裡確認「相符」以完成驗證。

OpenClaw 不會盲目地自動接受自我啟動的重複流程。當自我驗證請求已經待處理時，啟動過程會跳過建立新請求。

驗證協定/系統通知不會轉發到代理程式聊天管道，因此它們不會產生 `NO_REPLY`。

### 裝置衛生

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳戶上累積，使得加密房間的信任更難以推斷。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除陳舊的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 直接房間修復

如果直接訊息狀態不同步，OpenClaw 最終可能會擁有過時的 `m.direct` 對應，指向舊的獨立房間而不是目前的 DM。使用以下指令檢查對端的目前對應：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下指令進行修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復過程將 Matrix 特有的邏輯保留在插件內部：

- 它優先使用已經在 `m.direct` 中對應的嚴格 1:1 DM
- 否則，它會回退到任何目前已加入的與該使用者的嚴格 1:1 DM
- 如果沒有正常的 DM 存在，它會建立一個新的直接房間並重寫 `m.direct` 以指向它

修復流程不會自動刪除舊的聊天室。它只會選擇健全的私訊並更新映射，以便新的 Matrix 傳送、驗證通知和其他直接訊息流程再次針對正確的聊天室。

## 主題串

Matrix 支援原生 Matrix 主題串，適用於自動回覆和訊息工具傳送。

- `threadReplies: "off"` 會將回覆保持在頂層。
- `threadReplies: "inbound"` 僅在傳入訊息已經位於該主題串中時，才會在主題串內回覆。
- `threadReplies: "always"` 將聊天室回覆保留在以觸發訊息為根的主題串中。
- 傳入的主題串訊息會將主題串根訊息包含為額外的代理程式上下文。
- 當目標是同一個聊天室或同一個私訊使用者目標時，訊息工具傳送現在會自動繼承目前的 Matrix 主題串，除非提供了明確的 `threadId`。
- Matrix 支援執行時期主題串綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定至主題串的 `/acp spawn` 現在可在 Matrix 聊天室和私訊中運作。
- 頂層 Matrix 聊天室/私訊 `/focus` 會建立一個新的 Matrix 主題串，並在 `threadBindings.spawnSubagentSessions=true` 時將其綁定到目標工作階段。
- 在現有的 Matrix 主題串中執行 `/focus` 或 `/acp spawn --thread here` 會改為綁定目前的主題串。

### 主題串綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且也支援個別通道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 主題串綁定衍生旗標為選用加入：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 主題串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 工作階段綁定到 Matrix 主題串。

## 回應

Matrix 支援傳出回應動作、傳入回應通知以及傳入 ack 回應。

- 輸出反應工具由 `channels["matrix"].actions.reactions` 閘控。
- `react` 會對特定的 Matrix 事件新增反應。
- `reactions` 會列出特定 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人帳號在該事件上所有的反應。
- `remove: true` 僅會從機器人帳號移除指定的 emoji 反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- agent identity emoji 後備

Ack 反應範圍依照以下順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式依照以下順序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 預設值： `own`

目前行為：

- 當 `reactionNotifications: "own"` 以機器人發送的 Matrix 訊息為目標時，會轉發新增的 `m.reaction` 事件。
- `reactionNotifications: "off"` 會停用反應系統事件。
- 反應移除操作目前仍未合成為系統事件，因為 Matrix 將這些操作顯示為撤銷，而非獨立的 `m.reaction` 移除。

## DM 與房間政策範例

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
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

請參閱 [Groups](/en/channels/groups) 以了解提及閘控和允許清單行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息給您，OpenClaw 將會重複使用相同的待處理配對碼，並可能會在短暫冷卻後再次發送提醒回覆，而不是鑄造新的代碼。

請參閱 [Pairing](/en/channels/pairing) 以了解共用的 DM 配對流程和儲存配置。

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
          },
        },
      },
    },
  },
}
```

頂層 `channels.matrix` 值會作為命名帳號的預設值，除非帳號覆寫了它們。
當您希望 OpenClaw 對於隱式路由、探測和 CLI 操作優先使用某個命名的 Matrix 帳號時，請設定 `defaultAccount`。
如果您設定了多個命名帳號，請設定 `defaultAccount` 或針對依賴隱式帳號選擇的 CLI 指令傳遞 `--account <id>`。
當您想要為單一指令覆寫該隱式選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私人/LAN 家庭伺服器

根據預設，為了 SSRF 保護，OpenClaw 會封鎖私人/內部 Matrix 家庭伺服器，除非您
針對每個帳號明確選擇加入。

如果您的主機伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名稱上，請為該 Matrix 帳號啟用
`allowPrivateNetwork`：

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

此選擇加入僅允許信任的私人/內部目標。諸如
`http://matrix.example.org:8008` 的公開明文家庭伺服器仍會被封鎖。請盡可能偏好使用 `https://`。

## 目標解析

Matrix 接受這些目標形式，無論 OpenClaw 何時要求您提供房間或使用者目標：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查詢使用已登入的 Matrix 帳號：

- 使用者查詢會查詢該家庭伺服器上的 Matrix 使用者目錄。
- 房間查詢直接接受明確的房間 ID 和別名，然後回退為搜尋該帳號已加入的房間名稱。
- 已加入房間名稱查詢是盡力的。如果房間名稱無法解析為 ID 或別名，它將會被執行時期允許清單解析所忽略。

## 設定參考

- `enabled`：啟用或停用頻道。
- `name`：帳號的選用標籤。
- `defaultAccount`：當設定多個 Matrix 帳號時的首選帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允許此 Matrix 帳號連線至私有/內部主伺服器。當主伺服器解析為 `localhost`、區域網路/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此選項。
- `userId`：完整的 Matrix 使用者 ID，例如 `@bot:example.org`。
- `accessToken`：用於基於令牌的身份驗證的存取令牌。env/file/exec 提供者支援 `channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 的純文字值和 SecretRef 值。請參閱[機密管理](/en/gateway/secrets)。
- `password`：用於基於密碼登入的密碼。支援純文字值和 SecretRef 值。
- `deviceId`：明確的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於個人資料同步和 `set-profile` 更新的儲存自我頭像 URL。
- `initialSyncLimit`：啟動同步事件限制。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：強制對 DM 和聊天室採用僅允許清單行為。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `groupAllowFrom`：針對房間通訊的使用者 ID 白名單。
- `groupAllowFrom` 項目應為完整的 Matrix 使用者 ID。未解析的名稱會在執行時被忽略。
- `replyToMode`：`off`、`first` 或 `all`。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：針對執行緒繫結會話路由與生命週期的各通道覆寫設定。
- `startupVerification`：啟動時的自動自我驗證請求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重試自動啟動驗證請求之前的冷卻時間。
- `textChunkLimit`：傳出訊息區塊大小。
- `chunkMode`：`length` 或 `newline`。
- `responsePrefix`：傳出回覆的可選訊息前綴。
- `ackReaction`：此頻道/帳戶的可選 ack 反應覆寫。
- `ackReactionScope`：可選的確認反應作用域覆蓋（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：傳入反應通知模式（`own`、`off`）。
- `mediaMaxMb`：傳出媒體大小上限（MB）。
- `autoJoin`：邀請自動加入策略（`always`、`allowlist`、`off`）。預設值：`off`。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時允許使用房間/別名。別名條目會在邀請處理期間解析為房間 ID；OpenClaw 不信任被邀請房間聲稱的別名狀態。
- `dm`：DM 政策區塊（`enabled`、`policy`、`allowFrom`）。
- `dm.allowFrom` 條目應為完整的 Matrix 使用者 ID，除非您已透過即時目錄查詢解析過它們。
- `accounts`：命名逐帳號覆寫。頂層 `channels.matrix` 值作為這些條目的預設值。
- `groups`：每個房間的策略映射。優先使用房間 ID 或別名；未解析的房間名稱會在執行時被忽略。會話/群組身分使用解析後的穩定房間 ID，而人類可讀的標籤仍來自房間名稱。
- `rooms`：`groups` 的舊版別名。
- `actions`：針對每個動作的工具閘道 (`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`)。
