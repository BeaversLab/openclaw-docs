---
summary: "Matrix 支援狀態、安裝和配置範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (外掛程式)

Matrix 是 OpenClaw 的 Matrix 頻道外掛程式。
它使用官方的 `matrix-js-sdk` 並支援 DM、聊天室、主題串、媒體、回應、投票、位置和 E2EE。

## 需要外掛程式

Matrix 是一個外掛程式，並未隨附於 OpenClaw 核心中。

從 npm 安裝：

```bash
openclaw plugins install @openclaw/matrix
```

從本機副本安裝：

```bash
openclaw plugins install ./extensions/matrix
```

請參閱 [外掛程式](/zh-Hant/tools/plugin) 以了解外掛程式行為和安裝規則。

## 設定

1. 安裝此外掛程式。
2. 在您的 homeserver 上建立一個 Matrix 帳號。
3. 使用以下任一方式配置 `channels.matrix`：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重新啟動 gateway。
5. 與機器人開始 DM 或將其邀請至房間。

互動式設定路徑：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 精靈實際詢問的內容：

- homeserver URL
- 認證方法：access token 或 password
- 僅在選擇 password auth 時需要使用者 ID
- 選用的裝置名稱
- 是否啟用 E2EE
- 是否現在設定 Matrix 房間存取權

重要的精靈行為：

- 如果所選帳戶的 Matrix auth 環境變數已存在，且該帳戶尚未在設定中儲存 auth，精靈會提供環境變數捷徑，且僅為該帳戶寫入 `enabled: true`。
- 當您以互動方式新增另一個 Matrix 帳戶時，輸入的帳戶名稱會被正規化為設定和環境變數中使用的帳戶 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- DM 許可清單提示會立即接受完整的 `@user:server` 值。顯示名稱僅在即時目錄查詢找到一個完全符合的項目時有效；否則精靈會要求您使用完整的 Matrix ID 重試。
- 房間許可清單提示會直接接受房間 ID 和別名。它們也可以即時解析已加入房間的名稱，但未解析的名稱僅會在設定期間保持輸入的狀態，稍後會被執行時期許可清單解析忽略。建議使用 `!room:server` 或 `#alias:server`。
- 執行時期的房間/會話身分使用穩定的 Matrix 房間 ID。房間宣告的別名僅用作查詢輸入，不會作為長期會話金鑰或穩定群組身分。
- 若要在儲存房間名稱之前先解析它們，請使用 `openclaw channels resolve --channel matrix "Project Room"`。

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

Matrix 會將快取的憑證儲存在 `~/.openclaw/credentials/matrix/` 中。
預設帳號使用 `credentials.json`；命名帳號使用 `credentials-<account>.json`。

對應的環境變數（當未設定設定金鑰時使用）：

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

對於標準化的帳戶 ID `ops-bot`，請使用：

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

僅當這些授權環境變數已存在，且所選帳戶尚未在設定中儲存 Matrix 授權時，互動式精靈才會提供環境變數捷徑。

## 設定範例

這是一個包含 DM 配對、房間允許清單和已啟用 E2EE 的實用基準設定：

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

## Bot 對 Bot 房間

根據預設，來自其他已設定 OpenClaw Matrix 帳戶的 Matrix 訊息將會被忽略。

當您有意要進行代理之間的 Matrix 通訊時，請使用 `allowBots`：

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

- `allowBots: true` 會接受來自允許房間和 DM 中其他已設定 Matrix bot 帳戶的訊息。
- `allowBots: "mentions"` 僅當房間中可見提及此 bot 時才接受這些訊息。DM 仍然被允許。
- `groups.<room>.allowBots` 會覆寫單一房間的帳號層級設定。
- OpenClaw 仍然會忽略來自同一 Matrix 使用者 ID 的訊息，以避免自我回覆循環。
- Matrix 並未在此公開原生的 Bot 標記；OpenClaw 將「Bot 原作」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳號所發送」。

在共用房間中啟用 Bot 對 Bot 流量時，請使用嚴格的房間白名單及提及要求。

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

在機器可讀的輸出中包含儲存的修復金鑰：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導交叉簽署與驗證狀態：

```bash
openclaw matrix verify bootstrap
```

多帳號支援：使用 `channels.matrix.accounts` 搭配各帳號的憑證與選用的 `name`。請參閱 [Configuration reference](/zh-Hant/gateway/configuration-reference#multi-account-all-channels) 了解共用模式。

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導之前強制執行全新的交叉簽署身分重置：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢復金鑰驗證此裝置：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

詳細的裝置驗證資訊：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

檢查房間金鑰備份健康狀態：

```bash
openclaw matrix verify backup status
```

詳細的備份健康診斷：

```bash
openclaw matrix verify backup status --verbose
```

從伺服器備份還原房間金鑰：

```bash
openclaw matrix verify backup restore
```

詳細的還原診斷：

```bash
openclaw matrix verify backup restore --verbose
```

刪除目前的伺服器備份並建立全新的備份基準：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 指令預設都是簡潔的（包括安靜的內部 SDK 記錄），並且僅在 `--verbose` 時顯示詳細診斷。在撰寫腳本時，使用 `--json` 以獲得完整的機器可讀輸出。

在多帳號設置中，Matrix CLI 指令使用隱含的 Matrix 預設帳號，除非您傳遞 `--account <id>`。
如果您配置了多個命名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將停止並要求您明確選擇一個帳號。
每當您希望驗證或裝置操作以特定命名帳號為目標時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當某個命名帳號停用加密或加密不可用時，Matrix 警告和驗證錯誤會指向該帳號的配置金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

### 「已驗證」的含義

只有當此 Matrix 裝置受到您自己的跨簽署身份驗證時，OpenClaw 才會將其視為已驗證。
實務上，`openclaw matrix verify status --verbose` 會公開三種信任訊號：

- `Locally trusted`：此裝置僅受目前用戶端信任
- `Cross-signing verified`：SDK 透過交叉簽署回報裝置已驗證
- `Signed by owner`：裝置由您自己的自我簽署金鑰所簽署

`Verified by owner` 僅在存在交叉簽署驗證或擁有者簽署時才會變成 `yes`。
單憑本機信任不足以讓 OpenClaw 將該裝置視為完全驗證。

### 啟動程序 (bootstrap) 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定已加密 Matrix 帳號的指令。
它會依序執行以下所有操作：

- 啟動秘密儲存，盡可能重複使用現有的復原金鑰
- 啟動交叉簽署並上傳遺失的公開交叉簽署金鑰
- 嘗試標記並交叉簽署目前的裝置
- 如果尚不存在，則建立新的伺服器端金鑰備份

如果 homeserver 需要互動式驗證才能上傳跨簽署金鑰，OpenClaw 會先嘗試不上傳驗證，然後在配置 `channels.matrix.password` 時，嘗試使用 `m.login.dummy`，接著是 `m.login.password`。

僅在您有意丟棄目前的跨簽署身份並建立新身份時，才使用 `--force-reset-cross-signing`。

如果您有意丟棄目前的金鑰備份，並為未來的訊息建立新的備份基準，請使用 `openclaw matrix verify backup reset --yes`。
僅當您接受無法恢復的舊加密歷史記錄將持續無法使用時，才執行此操作。

### 全新備份基準

如果您希望保持未來加密訊息正常運作並接受失去無法恢復的舊歷史記錄，請按順序執行這些指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想要明確指定具名的 Matrix 帳戶時，請將 `--account <id>` 新增到每個指令中。

### 啟動行為

當 `encryption: true` 時，Matrix 將 `startupVerification` 預設為 `"if-unverified"`。
在啟動時，如果此裝置仍未驗證，Matrix 將會在另一個 Matrix 客戶端中請求自我驗證，
在有一個請求待處理時跳過重複請求，並在重新啟動後重試之前套用本機冷卻時間。
預設情況下，失敗的請求嘗試比成功建立請求更早重試。
設定 `startupVerification: "off"` 以停用自動啟動請求，或者調整 `startupVerificationCooldownHours`
如果您想要更短或更長的重試時間窗。

啟動時也會自動執行保守的加密引導程序。
該程序會嘗試優先重用目前的金鑰儲存和跨簽署身分，並且除非您執行明確的引導修復流程，否則會避免重置跨簽署。

如果啟動時發現引導狀態損壞且已設定 `channels.matrix.password`，OpenClaw 可以嘗試更嚴格的修復路徑。
如果目前裝置已經擁有者簽署，OpenClaw 將保留該身分而不是自動重設。

從先前的公開 Matrix 外掛升級：

- OpenClaw 會在可能的情況下自動重用相同的 Matrix 帳戶、存取權杖和裝置身分。
- 在執行任何可操作的 Matrix 遷移變更之前，OpenClaw 會在 `~/Backups/openclaw-migrations/` 下建立或重用復原快照。
- 如果您使用多個 Matrix 帳戶，請在從舊的平面儲存佈局升級之前設定 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪個帳戶應該接收該共用舊版狀態。
- 如果先前的插件在本機儲存了 Matrix 房間金鑰備份解密金鑰，啟動時或 `openclaw doctor --fix` 會將其自動匯入新的復原金鑰流程。
- 如果在準備遷移後 Matrix 存取權杖發生了變更，啟動程序現在會在放棄自動備份還原之前，掃描同層級的權杖雜湊儲存根目錄以尋找待處理的舊版還原狀態。
- 如果之後同一個帳戶、住所伺服器和使用者的 Matrix 存取權杖發生變更，OpenClaw 現在會傾向於重複使用最完整的現有權杖雜湊儲存根目錄，而不是從空的 Matrix 狀態目錄重新開始。
- 在下次閘道啟動時，備份的房間金鑰會自動還原到新的加密儲存中。
- 如果舊版外掛擁有從未備份的僅限本地的房間金鑰，OpenClaw 將會發出明確警告。由於無法從先前的 rust crypto store 自動匯出這些金鑰，因此部分舊的加密歷史記錄可能會一直處於無法存取的狀態，直到手動復原為止。
- 請參閱 [Matrix 遷移](/zh-Hant/install/migrating-matrix) 以了解完整的升級流程、限制、復原指令以及常見的遷移訊息。

加密的运行時狀態是按帳戶、按用戶令牌哈希根目錄組織的，位於 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中。
該目錄包含同步存儲（`bot-storage.json`）、加密存儲（`crypto/`）、
恢復密鑰文件（`recovery-key.json`）、IndexedDB 快照（`crypto-idb-snapshot.json`）、
線程綁定（`thread-bindings.json`）和啟動驗證狀態（`startup-verification.json`）
當這些功能被使用時。
當令牌更改但帳戶身份保持不變時，OpenClaw 會為該帳戶/主服務器/用戶元組重用最佳的現有
根目錄，以便先前的同步狀態、加密狀態、線程綁定
和啟動驗證狀態保持可見。

### Node 加密存儲模型

此外掛程式中的 Matrix E2EE 使用 Node 中官方的 `matrix-js-sdk` Rust 加密路徑。
當您希望加密狀態在重啟後仍然保留時，該路徑需要 IndexedDB 支援的持久性。

OpenClaw 目前在 Node 中透過以下方式提供該功能：

- 使用 `fake-indexeddb` 作為 SDK 預期的 IndexedDB API shim
- 在 `initRustCrypto` 之前，從 `crypto-idb-snapshot.json` 還原 Rust 加密 IndexedDB 的內容
- 在初始化後和執行期間，將更新的 IndexedDB 內容持久化回 `crypto-idb-snapshot.json`

這是相容性/儲存基礎設施，而非自訂加密實作。
快照檔案是敏感的執行時期狀態，並且以受限的檔案權限儲存。
在 OpenClaw 的安全模型下，閘道主機和本機 OpenClaw 狀態目錄已經位於受信任的操作者邊界內，因此這主要是一個操作持久性（operational durability）的考量，而非一個獨立的遠端信任邊界。

計畫中的改進：

- 新增 SecretRef 支援以用於持續性 Matrix 金鑰材料，使恢復金鑰和相關的儲存加密秘密可以從 OpenClaw 秘密提供者取得，而不僅僅是來自本機檔案

## 自動驗證通知

Matrix 現在會將驗證生命週期通知直接以 `m.notice` 訊息的形式發佈到嚴格的 DM 驗證房間中。
這包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過表情符號驗證」指導）
- 驗證開始與完成通知
- SAS 詳細資訊（表情符號與小數）（如有提供）

來自另一個 Matrix 用戶端的驗證請求會被 OpenClaw 追蹤並自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認自己這一側。
對於來自另一個 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受請求，然後等待 SAS 流程正常進行。
您仍然需要在您的 Matrix 用戶端中比對表情符號或小數 SAS，並在那裡確認「相符」以完成驗證。

OpenClaw 不會盲目地自動接受自我發起的重複流程。當自我驗證請求已經在等待時，啟動程序會跳過建立新請求。

驗證協議/系統通知不會轉發到代理程式聊天管道，因此它們不會產生 `NO_REPLY`。

### 裝置衛生

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳號上累積，使得加密聊天室的信任關係更難以判斷。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除過時的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 私聊修復

如果私聊狀態失去同步，OpenClaw 可能會保留過時的 `m.direct` 映射，指向舊的單人聊天室而非目前有效的私聊。使用以下指令檢查對象目前的映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下指令修復：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復過程將 Matrix 特有的邏輯保留在插件內部：

- 它優先選擇已在 `m.direct` 中映射的嚴格 1:1 私聊
- 否則它會退而求其次，選擇任何目前加入的與該使用者的嚴格 1:1 私聊
- 如果不存在正常的私聊，它會建立一個新的私聊並重寫 `m.direct` 以指向該聊天室

修復流程不會自動刪除舊的房間。它只會選擇健康的直接訊息（DM）並更新對應關係，以便新的 Matrix 發送、驗證通知和其他直接訊息流程再次以正確的房間為目標。

## 串列

Matrix 支援原生 Matrix 串列，適用於自動回覆和訊息工具發送。

- `threadReplies: "off"` 將回覆保持在頂層。
- `threadReplies: "inbound"` 僅當 inbound 訊息已經在該串列中時，才在串列內回覆。
- `threadReplies: "always"` 將房間回覆保持在以觸發訊息為根的串列中。
- Inbound 串列訊息包含串列根訊息作為額外的代理程式上下文。
- 當目標是同一房間或同一 DM 使用者目標時，訊息工具發送現在會自動繼承當前的 Matrix 串列，除非提供了明確的 `threadId`。
- Matrix 支援執行時緒綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和綁定到緒的 `/acp spawn` 現在可在 Matrix 房間和 DM 中運作。
- 頂層 Matrix 房間/DM `/focus` 會建立一個新的 Matrix 緒，並在 `threadBindings.spawnSubagentSessions=true` 時將其綁定到目標工作階段。
- 在現有 Matrix 線程中執行 `/focus` 或 `/acp spawn --thread here` 會改為綁定該當前緒。

### 緒綁定設定

Matrix 繼承 `session.threadBindings` 的全域預設值，並且支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 線程綁定的生成標誌是選擇加入的：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 線程。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 會話綁定到 Matrix 線程。

## 反應

Matrix 支援傳出反應動作、傳入反應通知以及傳入確認反應。

- 傳出反應工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 會對特定的 Matrix 事件新增反應。
- `reactions` 會列出特定 Matrix 事件的目前反應摘要。
- `emoji=""` 會移除機器人帳戶在該事件上的自身反應。
- `remove: true` 僅從機器人帳戶中移除指定的 emoji 反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備

Ack 反應範圍按以下順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式按以下順序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 預設值： `own`

目前行為：

- 當目標為機器人發送的 Matrix 訊息時，`reactionNotifications: "own"` 會轉發新增的 `m.reaction` 事件。
- `reactionNotifications: "off"` 停用反應系統事件。
- 移除回應尚未被合成為系統事件，因為 Matrix 將這些呈現為撤銷，而非獨立的 `m.reaction` 移除。

## 私訊與房間策略範例

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

請參閱 [群組](/zh-Hant/channels/groups) 以了解提及閘控與允許清單行為。

Matrix 私訊的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未核准的 Matrix 使用者在核准前持續傳送訊息給您，OpenClaw 將重複使用相同的待處理配對代碼，並可能在短暫冷卻後再次發送提醒回覆，而不會產生新的代碼。

請參閱 [配對](/zh-Hant/channels/pairing) 以了解共用的私訊配對流程與儲存佈局。

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

頂層 `channels.matrix` 值充當命名帳號的預設值，除非帳號覆寫它們。
當您希望 OpenClaw 對於隱式路由、探查和 CLI 操作優先使用一個命名的 Matrix 帳號時，請設定 `defaultAccount`。
如果您設定了多個命名帳號，請設定 `defaultAccount` 或為依賴隱式帳號選擇的 CLI 指令傳遞 `--account <id>`。
當您想要針對單一指令覆寫該隱式選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私有/LAN 家用伺服器

預設情況下，OpenClaw 為了 SSRF 防護會封鎖私有/內部 Matrix 家用伺服器，除非您
針對每個帳號明確選擇加入。

如果您的主伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳戶啟用
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

此選項僅允許受信任的私人/內部目標。諸如
`http://matrix.example.org:8008` 的公開明文主伺服器仍會被封鎖。請盡可能優先使用 `https://`。

## 目標解析

Matrix 在任何 OpenClaw 要求您提供房間或使用者目標的地方都接受以下目標形式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查詢使用已登入的 Matrix 帳戶：

- 用戶查找會查詢該主伺服器上的 Matrix 用戶目錄。
- 房間查找會直接接受明確的房間 ID 和別名，然後退而搜尋該帳號已加入的房間名稱。
- 已加入房間名稱的查找是盡力而為的。如果房間名稱無法解析為 ID 或別名，它將在運行時允許清單解析中被忽略。

## 配置參考

- `enabled`：啟用或停用頻道。
- `name`：帳號的可選標籤。
- `defaultAccount`：當配置了多個 Matrix 帳號時的首選帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允許此 Matrix 帳號連線至私人/內部 homeserver。當 homeserver 解析為 `localhost`、LAN/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此選項。
- `userId`：完整的 Matrix 使用者 ID，例如 `@bot:example.org`。
- `accessToken`：基於 Token 之驗證的存取權杖。
- `password`：基於密碼登入的密碼。
- `deviceId`：明確指定的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於個人資料同步和 `set-profile` 更新的已儲存自我大頭貼 URL。
- `initialSyncLimit`：啟動同步事件限制。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：強制對 DM 和聊天室實施僅允許清單行為。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `groupAllowFrom`：聊天室流量的使用者 ID 允許清單。
- `groupAllowFrom` 條目應為完整的 Matrix 使用者 ID。未解析的名稱將在執行時被忽略。
- `replyToMode`：`off`、`first` 或 `all`。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：針對執行緒綁定會話路由與生命週期的個別頻道覆寫。
- `startupVerification`：啟動時的自動自我驗證請求模式 (`if-unverified`, `off`)。
- `startupVerificationCooldownHours`：重試自動啟動驗證請求前的冷卻時間。
- `textChunkLimit`：訊息輸出的區塊大小。
- `chunkMode`：`length` 或 `newline`。
- `responsePrefix`：輸出回覆的可選訊息前綴。
- `ackReaction`：此頻道/帳戶的可選 ack 回應覆蓋設定。
- `ackReactionScope`：選用的 ack 反應範圍覆寫 (`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`)。
- `reactionNotifications`：入站反應通知模式 (`own`、`off`)。
- `mediaMaxMb`：出站媒體大小上限（單位：MB）。
- `autoJoin`：邀請自動加入政策 (`always`、`allowlist`、`off`)。預設值：`off`。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時，允許使用 room/alias。別名條目會在邀請處理期間解析為 Room ID；OpenClaw 不信任受邀房間聲稱的別名狀態。
- `dm`：DM 區塊（`enabled`、`policy`、`allowFrom`）。
- `dm.allowFrom` 條目應為完整的 Matrix 使用者 ID，除非您已透過即時目錄查詢解析過它們。
- `accounts`：命名之帳號層級覆寫。頂層 `channels.matrix` 值作為這些條目的預設值。
- `groups`：按房間設定的策略映射。優先使用房間 ID 或別名；未解析的房間名稱在執行時會被忽略。會話/群組身份在解析後使用穩定的房間 ID，而人類可讀的標籤仍來自房間名稱。
- `rooms`：`groups` 的舊版別名。
- `actions`：按動作設定的工具閘道 (`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
