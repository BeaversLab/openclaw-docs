---
summary: "Matrix 支援狀態、設定及配置範例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (外掛程式)

Matrix 是 OpenClaw 的 Matrix 頻道外掛。
它使用官方的 `matrix-js-sdk` 並支援 DM、房間、討論串、媒體、回應、投票、位置和 E2EE。

## 必要的外掛程式

Matrix 是一個外掛程式，並未隨附於核心 OpenClaw 中。

從 npm 安裝：

```bash
openclaw plugins install @openclaw/matrix
```

從本機簽出安裝：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

請參閱 [Plugins](/en/tools/plugin) 以了解外掛程式的行為和安裝規則。

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

- 若選取的帳戶已存在 Matrix 認證環境變數，且該帳戶尚未在設定中儲存認證資訊，精靈會提供一個環境變數捷徑，並僅為該帳戶寫入 `enabled: true`。
- 當您以互動方式新增另一個 Matrix 帳戶時，輸入的帳戶名稱會被正規化為設定和環境變數中使用的帳戶 ID。例如，`Ops Bot` 會變成 `ops-bot`。
- DM 允許清單提示會立即接受完整的 `@user:server` 值。只有當即時目錄查找找到一個完全匹配時，顯示名稱才有效；否則精靈會要求您使用完整的 Matrix ID 重試。
- 房間白名單提示直接接受房間 ID 和別名。它們也可以即時解析已加入房間的名稱，但未解析的名稱僅會在設定期間以輸入的狀態保留，稍後會被執行時的白名單解析忽略。建議優先使用 `!room:server` 或 `#alias:server`。
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

Matrix 會將快取的憑證儲存在 `~/.openclaw/credentials/matrix/` 中。
預設帳號使用 `credentials.json`；命名的帳號使用 `credentials-<account>.json`。

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

帳號 `ops` 的範例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

對於標準化帳號 ID `ops-bot`，請使用：

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

Matrix 回覆串流功能為選用。

當您希望 OpenClaw 發送單一草稿回覆、在模型生成文字時就地編輯該草稿，並在回覆完成後將其定稿時，請將 `channels.matrix.streaming` 設定為 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 為預設值。OpenClaw 會等待最終回覆並僅發送一次。
- `streaming: "partial"` 會建立一條可編輯的預覽訊息，而不是發送多條部分訊息。
- 如果預覽不再能容納於單一 Matrix 事件中，OpenClaw 將停止預覽串流並回退至正常的最終發送。
- 媒體回覆仍然會正常發送附件。如果過時的預覽不再能安全地重複使用，OpenClaw 將在發送最終媒體回覆之前將其撤回。
- 預覽編輯需要額外的 Matrix API 呼叫。如果您希望保持最保守的速率限制行為，請保持串流關閉。

## 加密與驗證

在加密 (E2EE) 房間中，傳出圖片事件使用 `thumbnail_file`，因此圖片預覽會與完整附件一起加密。未加密房間仍使用純文字 `thumbnail_url`。無需任何配置 — 外掛程式會自動檢測 E2EE 狀態。

### Bot 對 Bot 房間

預設情況下，來自其他已設定 OpenClaw Matrix 帳號的 Matrix 訊息將被忽略。

當您有意進行代理程式間的 Matrix 流量傳輸時，請使用 `allowBots`：

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

- `allowBots: true` 接受來自允許房間和私訊中其他已設定 Matrix 機器人帳號的訊息。
- `allowBots: "mentions"` 僅當這些訊息在房間中明確提及此機器人時才接受。私訊仍然允許。
- `groups.<room>.allowBots` 會覆蓋單一房間的帳號級設定。
- OpenClaw 仍然會忽略來自同一 Matrix 使用者 ID 的訊息，以避免自我回覆迴圈。
- Matrix 並未在此處公開原生的機器人標誌；OpenClaw 將「由機器人撰寫」視為「由此 OpenClaw 閘道上另一個已設定的 Matrix 帳號所傳送」。

在共用房間中啟用機器人對機器人的流量時，請使用嚴格的房間允許清單提及要求。

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

在機器可讀的輸出中包含儲存的復原金鑰：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引導交叉簽署與驗證狀態：

```bash
openclaw matrix verify bootstrap
```

多帳號支援：使用 `channels.matrix.accounts` 搭配各個帳號的憑證與選用的 `name`。請參閱 [Configuration reference](/en/gateway/configuration-reference#multi-account-all-channels) 以了解共用模式。

詳細引導診斷：

```bash
openclaw matrix verify bootstrap --verbose
```

在引導前強制重設全新的交叉簽署身分：

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

檢查房間金鑰備份健全度：

```bash
openclaw matrix verify backup status
```

詳細備份健全度診斷：

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

刪除目前的伺服器備份並建立全新的備份基線：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 指令預設皆為簡潔模式（包括安靜的內部 SDK 記錄），僅在使用 `--verbose` 時顯示詳細診斷。
在撰寫腳本時，請使用 `--json` 以取得完整的機器可讀輸出。

在多帳號設定中，Matrix CLI 指令會使用隱含的 Matrix 預設帳號，除非您傳遞 `--account <id>`。
如果您設定了多個具名帳號，請先設定 `channels.matrix.defaultAccount`，否則這些隱含的 CLI 操作將會停止並要求您明確選擇一個帳號。
每當您希望驗證或裝置操作明確針對某個具名帳號時，請使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

當某個具名帳號停用或無法使用加密時，Matrix 警告與驗證錯誤會指向該帳號的設定金鑰，例如 `channels.matrix.accounts.assistant.encryption`。

### 什麼是「已驗證」

OpenClaw 僅在 Matrix 裝置透過您自己的交叉簽署身分進行驗證時，才會將其視為已驗證。
實務上，`openclaw matrix verify status --verbose` 會公開三種信任訊號：

- `Locally trusted`：此裝置僅受目前用戶端信任
- `Cross-signing verified`：SDK 報告該裝置已透過交叉簽署驗證
- `Signed by owner`：該裝置由您自己的自我簽署金鑰簽署

`Verified by owner` 只有在存在交叉簽署驗證或擁有者簽署時才會變成 `yes`。
單靠本地信任不足以讓 OpenClaw 將該裝置視為完全驗證。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用於修復和設定加密 Matrix 帳號的指令。
它會依序執行以下所有操作：

- 啟動秘密儲存，盡可能重複使用現有的復原金鑰
- 啟動交叉簽署並上傳缺少的公開交叉簽署金鑰
- 嘗試標記並交叉簽署目前的裝置
- 如果伺服器端的房間金鑰備份尚不存在，則建立一個新的

如果住宅伺服器需要互動式驗證才能上傳交叉簽署金鑰，OpenClaw 會先嘗試不上傳驗證，然後使用 `m.login.dummy`，最後在設定 `channels.matrix.password` 時使用 `m.login.password`。

僅當您有意捨棄目前的交叉簽署身分並建立新身分時，才使用 `--force-reset-cross-signing`。

如果您有意捨棄目前的房間金鑰備份並為未來的訊息建立新的備份基準，請使用 `openclaw matrix verify backup reset --yes`。
請只在您接受無法復原的舊加密歷史紀錄將保持無法使用的狀態時才這樣做。

### 全新備份基準

如果您想讓未來的加密訊息正常運作，並接受失去無法復原的舊歷史紀錄，請依序執行以下指令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

當您想明確指定以具名的 Matrix 帳號為目標時，請將 `--account <id>` 加入每個指令。

### 啟動行為

當 `encryption: true` 時，Matrix 預設將 `startupVerification` 設為 `"if-unverified"`。
在啟動時，如果此裝置尚未驗證，Matrix 將會在另一個 Matrix 客戶端中請求自我驗證，
在已有請求待處理時跳過重複請求，並在重新啟動重試之前套用本機冷卻時間。
預設情況下，失敗的請求嘗試比成功建立請求後重試得更快。
設定 `startupVerification: "off"` 以停用自動啟動請求，或者如果您想要更短或更長的重試間隔，請調整 `startupVerificationCooldownHours`。

啟動時也會自動執行保守的加密引導程序。
該程序會嘗試優先重用目前的秘密儲存和跨簽署身分，並避免重置跨簽署，除非您執行明確的引導修復流程。

如果啟動時發現損壞的引導狀態且已配置 `channels.matrix.password`，OpenClaw 可以嘗試更嚴格的修復路徑。
如果目前的裝置已經由擁有者簽署，OpenClaw 將保留該身分而不是自動重置它。

從先前的公開 Matrix 外掛升級：

- OpenClaw 會在可能的情況下自動重用相同的 Matrix 帳戶、存取權杖和裝置身分。
- 在任何執行中的 Matrix 遷移變更運作之前，OpenClaw 會在 `~/Backups/openclaw-migrations/` 下建立或重用復原快照。
- 如果您使用多個 Matrix 帳戶，請在從舊的平面儲存佈局升級之前設定 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪個帳戶應該接收該共用的舊狀態。
- 如果先前的外掛在本機儲存了 Matrix 房間金鑰備份解密金鑰，啟動或 `openclaw doctor --fix` 將會自動將其匯入新的復原金鑰流程。
- 如果在準備遷移後 Matrix 存取權杖發生了變更，啟動程式現在會在放棄自動備份還原之前，掃描同層級的權杖雜湊儲存根以尋找待處理的舊版還原狀態。
- 如果之後針對同一個帳戶、主伺服器和使用者的 Matrix 存取權杖發生變更，OpenClaw 現在會偏好重用最完整的現有權杖雜湊儲存根，而不是從空的 Matrix 狀態目錄重新開始。
- 在下一次閘道啟動時，備份的房間金鑰會自動還原到新的加密儲存中。
- 如果舊的外掛程式擁有從未備份的僅限本機的房間金鑰，OpenClaw 將會發出明確的警告。由於這些金鑰無法先前的 rust crypto store 自動匯出，因此某些舊的加密歷史記錄可能會在進行手動復原之前保持無法存取的狀態。
- 請參閱 [Matrix 遷移](/en/install/migrating-matrix) 以了解完整的升級流程、限制、復原指令以及常見的遷移訊息。

加密的執行時期狀態是依照每個帳戶、每個使用者的 token-hash 根目錄組織在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下。
當啟用這些功能時，該目錄會包含同步 store (`bot-storage.json`)、crypto store (`crypto/`)、
復原金鑰檔案 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
執行緒綁定 (`thread-bindings.json`) 以及啟動驗證狀態 (`startup-verification.json`)。
當 token 變更但帳戶身分保持不變時，OpenClaw 會重複使用該帳戶/homeserver/使用者元組最佳現有的
根目錄，以便先前的同步狀態、加密狀態、執行緒綁定
和啟動驗證狀態保持可見。

### Node crypto store 模型

此外掛程式中的 Matrix E2EE 使用官方 `matrix-js-sdk` 在 Node 中的 Rust crypto 路徑。
當您希望加密狀態在重啟後仍然存在時，該路徑預期使用以 IndexedDB 為後端的持久性儲存。

OpenClaw 目前在 Node 中透過以下方式提供此功能：

- 使用 `fake-indexeddb` 作為 SDK 預期的 IndexedDB API shim
- 在 `initRustCrypto` 之前從 `crypto-idb-snapshot.json` 還原 Rust crypto IndexedDB 內容
- 在初始化後和執行期間將更新的 IndexedDB 內容持久化回 `crypto-idb-snapshot.json`

這是相容性/儲存管道，而非自訂的加密實作。
快照檔案是敏感的執行時期狀態，並且以限制性的檔案權限儲存。
在 OpenClaw 的安全模型下，閘道主機和本機 OpenClaw 狀態目錄已經位於受信任的操作員邊界內，因此這主要是一個操作上的持久性考量，而不是一個單獨的遠端信任邊界。

計畫中的改進：

- 新增對持久化 Matrix 金鑰材料的 SecretRef 支援，以便可以從 OpenClaw secrets 提供者取得恢復金鑰及相關的 store 加密密碼，而不僅限於本地檔案

## 個人資料管理

使用以下指令更新所選帳戶的 Matrix 個人資料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

當您想要明確指定某個命名的 Matrix 帳戶時，請新增 `--account <id>`。

Matrix 直接接受 `mxc://` 頭像 URL。當您傳遞 `http://` 或 `https://` 頭像 URL 時，OpenClaw 會先將其上傳至 Matrix，然後將解析後的 `mxc://` URL 儲存回 `channels.matrix.avatarUrl`（或所選的帳戶覆寫設定）。

## 自動驗證通知

Matrix 現在會將驗證生命週期通知以 `m.notice` 訊息的形式直接發布到嚴格的 DM 驗證房間中。
這包括：

- 驗證請求通知
- 驗證就緒通知（附帶明確的「透過表情符號驗證」指引）
- 驗證開始與完成通知
- SAS 詳細資訊（表情符號與十進位數字），如有提供

來自其他 Matrix 用戶端的傳入驗證請求會由 OpenClaw 追蹤並自動接受。
對於自我驗證流程，當表情符號驗證可用時，OpenClaw 也會自動啟動 SAS 流程並確認其自身端。
對於來自其他 Matrix 使用者/裝置的驗證請求，OpenClaw 會自動接受請求，然後等待 SAS 流程正常進行。
您仍需在 Matrix 用戶端中比對表情符號或十進位 SAS，並在那裡確認「相符」以完成驗證。

OpenClaw 不會盲目自動接受自我發起的重複流程。當自我驗證請求已在待處理時，啟動程序會略過建立新請求。

驗證協定/系統通知不會轉發至代理聊天管道，因此不會產生 `NO_REPLY`。

### 裝置衛生

舊的由 OpenClaw 管理的 Matrix 裝置可能會在帳戶上累積，並使得加密房間的信任更難以判斷。
使用以下指令列出它們：

```bash
openclaw matrix devices list
```

使用以下指令移除過時的 OpenClaw 管理裝置：

```bash
openclaw matrix devices prune-stale
```

### 直接房間修復

如果直訊狀態不同步，OpenClaw 最終可能會出現過時的 `m.direct` 對應，指向舊的單獨房間而不是目前的直訊。檢查對方的目前對應：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修復方法如下：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修復程序將 Matrix 特有的邏輯保留在插件內部：

- 它優先選擇已在 `m.direct` 中對應的嚴格 1:1 直訊
- 否則，它會回退到任何目前已加入的與該用戶的嚴格 1:1 直訊
- 如果不存在健康的直訊，它會建立一個新的直接房間並重寫 `m.direct` 以指向該房間

修復流程不會自動刪除舊房間。它只會選擇健康的直訊並更新對應，以便新的 Matrix 傳送、驗證通知和其他直訊流程再次針對正確的房間。

## 討論串

Matrix 支援原生 Matrix 討論串，用於自動回覆和訊息工具發送。

- `threadReplies: "off"` 將回覆保持在頂層，並將傳入的討論串訊息保留在父工作階段上。
- `threadReplies: "inbound"` 僅當傳入訊息已在該討論串中時，才在討論串內回覆。
- `threadReplies: "always"` 將房間回覆保持在以觸發訊息為根的討論串中，並透過第一條觸發訊息的匹配討論串範圍工作階段傳送該對話。
- `dm.threadReplies` 僅針對直訊覆蓋頂層設定。例如，您可以讓房間討論串保持隔離，同時保持直訊扁平化。
- 傳入的討論串訊息會將討論串根訊息作為額外的代理上下文包含在內。
- 當目標是同一房間或同一直訊用戶目標時，訊息工具發送現在會自動繼承目前的 Matrix 討論串，除非提供了明確的 `threadId`。
- Matrix 支援執行時討論串綁定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和討論串綁定的 `/acp spawn` 現在可在 Matrix 房間和直訊中使用。
- 頂層 Matrix 房間/直訊 `/focus` 會建立一個新的 Matrix 討論串並在 `threadBindings.spawnSubagentSessions=true` 時將其綁定到目標工作階段。
- 在現有的 Matrix 討論串中執行 `/focus` 或 `/acp spawn --thread here` 會綁定該目前的討論串。

## ACP 對話綁定

Matrix 房間、DM 和現有的 Matrix 討論串可以轉換為持久的 ACP 工作空間，而無需更改聊天介面。

快速操作員流程：

- 在您想要繼續使用的 Matrix DM、房間或現有討論串中執行 `/acp spawn codex --bind here`。
- 在頂層 Matrix DM 或房間中，目前的 DM/房間將保持為聊天介面，並且未來的訊息會路由到生成的 ACP 工作階段。
- 在現有的 Matrix 討論串內，`--bind here` 會就地綁定該目前的討論串。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

備註：

- `--bind here` 不會建立子 Matrix 討論串。
- `threadBindings.spawnAcpSessions` 僅在 `/acp spawn --thread auto|here` 時需要，這種情況下 OpenClaw 需要建立或綁定子 Matrix 討論串。

### 討論串綁定配置

Matrix 繼承自 `session.threadBindings` 的全域預設值，並且也支援每個頻道的覆寫：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 討論串綁定的生成旗標為選用：

- 設定 `threadBindings.spawnSubagentSessions: true` 以允許頂層 `/focus` 建立並綁定新的 Matrix 討論串。
- 設定 `threadBindings.spawnAcpSessions: true` 以允許 `/acp spawn --thread auto|here` 將 ACP 工作階段綁定到 Matrix 討論串。

## 反應

Matrix 支援輸出反應動作、輸入反應通知以及輸入 ack 反應。

- 輸出反應工具受 `channels["matrix"].actions.reactions` 控制。
- `react` 會對特定的 Matrix 事件新增反應。
- `reactions` 列出特定 Matrix 事件目前的反應摘要。
- `emoji=""` 移除機器人帳戶在該事件上自己的反應。
- `remove: true` 僅從機器人帳戶中移除指定的 emoji 反應。

Ack 反應使用標準的 OpenClaw 解析順序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- agent identity emoji fallback

Ack 反應範圍按以下順序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反應通知模式按以下順序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- default: `own`

目前行為：

- 當目標是機器人發送的 Matrix 訊息時，`reactionNotifications: "own"` 會轉發新增的 `m.reaction` 事件。
- `reactionNotifications: "off"` 會停用反應系統事件。
- 移除反應尚未被合成为系統事件，因為 Matrix 將其顯示為撤銷，而非獨立的 `m.reaction` 移除。

## 歷史記錄上下文

- 當 Matrix 房間訊息觸發 Agent 時，`channels.matrix.historyLimit` 控制作為 `InboundHistory` 包含多少最近的房間訊息。
- 它會回退到 `messages.groupChat.historyLimit`。設定 `0` 以停用。
- Matrix 房間歷史記錄僅限房間。DM 繼續使用正常的會話歷史記錄。
- Matrix 房間歷史記錄僅限待處理：OpenClaw 緩衝尚未觸發回覆的房間訊息，然後在提及或其他觸發條件到達時對該視窗進行快照。
- 當前的觸發訊息不包含在 `InboundHistory` 中；它保留在該回合的主要輸入內容中。
- 同一 Matrix 事件的重試會重用原始的歷史記錄快照，而不是向前漂移到較新的房間訊息。
- 擷取的房間上下文（包括回覆和線程上下文查詢）會由發送者允許清單（`groupAllowFrom`）進行過濾，因此非允許清單中的訊息會從 Agent 上下文中排除。

## DM 與房間策略範例

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

請參閱 [Groups](/en/channels/groups) 以了解提及閘控和允許清單行為。

Matrix DM 的配對範例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 使用者在批准前不斷傳送訊息給您，OpenClaw 將重複使用相同的待處理配對代碼，並且可能在短暫的冷卻時間後再次發送提醒回覆，而不是生成新代碼。

請參閱 [配對](/en/channels/pairing) 以了解共用 DM 配對流程和儲存佈局。

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

頂層 `channels.matrix` 值充當具名帳號的預設值，除非帳號覆寫了它們。
當您希望 OpenClaw 優先使用一個具名 Matrix 帳號進行隱式路由、探測和 CLI 操作時，請設定 `defaultAccount`。
如果您配置了多個具名帳號，請為依賴隱式帳號選擇的 CLI 命令設定 `defaultAccount` 或傳遞 `--account <id>`。
當您想要針對單個命令覆寫該隱式選擇時，請將 `--account <id>` 傳遞給 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私人/LAN 家庭伺服器

預設情況下，為了防範 SSRF 攻擊，OpenClaw 會阻擋私人/內部 Matrix 家庭伺服器，除非您
針對每個帳號明確選擇加入。

如果您的家庭伺服器運行在 localhost、LAN/Tailscale IP 或內部主機名上，請為該 Matrix 帳號啟用
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

此選擇加入僅允許信任的私人/內部目標。公開明文家庭伺服器（例如
`http://matrix.example.org:8008`）仍然會被阻擋。請盡可能優先選擇 `https://`。

## 代理 Matrix 流量

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

具名帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫頂層預設值。
OpenClaw 對運行時 Matrix 流量和帳號狀態探測使用相同的代理設定。

## 目標解析

無論 OpenClaw 何時要求您提供房間或使用者目標，Matrix 都接受以下目標形式：

- 使用者：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房間：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 別名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

即時目錄查閱使用已登入的 Matrix 帳號：

- 使用者查閱會查詢該家庭伺服器上的 Matrix 使用者目錄。
- 房間查找會直接接受明確的房間 ID 和別名，然後退而搜尋該帳號已加入的房間名稱。
- 已加入房間名稱的查找是盡力而為的。如果房間名稱無法解析為 ID 或別名，它會被執行時期允許清單解析忽略。

## 設定參考

- `enabled`：啟用或停用此頻道。
- `name`：帳號的選用標籤。
- `defaultAccount`：當設定多個 Matrix 帳號時，偏好的帳號 ID。
- `homeserver`：主伺服器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允許此 Matrix 帳號連接到私有/內部主伺服器。當主伺服器解析為 `localhost`、區域網路/Tailscale IP 或內部主機（例如 `matrix-synapse`）時，請啟用此功能。
- `proxy`：Matrix 流量的選用 HTTP(S) 代理 URL。命名帳號可以使用自己的 `proxy` 覆蓋頂層預設值。
- `userId`：完整的 Matrix 使用者 ID，例如 `@bot:example.org`。
- `accessToken`：基於 Token 之驗證的存取 Token。跨 env/file/exec 提供者，`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支援純文字值和 SecretRef 值。請參閱[密鑰管理](/en/gateway/secrets)。
- `password`：基於密碼之登入的密碼。支援純文字值和 SecretRef 值。
- `deviceId`：明確的 Matrix 裝置 ID。
- `deviceName`：密碼登入的裝置顯示名稱。
- `avatarUrl`：用於個人資料同步和 `set-profile` 更新的儲存自我頭像 URL。
- `initialSyncLimit`：啟動同步事件限制。
- `encryption`：啟用 E2EE。
- `allowlistOnly`：對 DM 和房間強制執行僅允許清單的行為。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `groupAllowFrom`: 用於房間流量的使用者 ID 允許清單。
- `groupAllowFrom` 項目應為完整的 Matrix 使用者 ID。未解析的名稱會在執行時被忽略。
- `historyLimit`: 作為群組歷史紀錄內容包含的房間訊息最大數量。若未設定則回退至 `messages.groupChat.historyLimit`。設定為 `0` 以停用。
- `replyToMode`: `off`、`first` 或 `all`。
- `streaming`: `off` (預設) 或 `partial`。`partial` 啟用具有原地更新功能的單一訊息草稿預覽。
- `threadReplies`: `off`、`inbound` 或 `always`。
- `threadBindings`: 針對執行緒繫結會話路由與生命週期的各頻道覆寫設定。
- `startupVerification`: 啟動時的自動自我驗證請求模式 (`if-unverified`、`off`)。
- `startupVerificationCooldownHours`: 重試自動啟動驗證請求前的冷卻時間。
- `textChunkLimit`: 外寄訊息區塊大小。
- `chunkMode`: `length` 或 `newline`。
- `responsePrefix`: 外寄回覆的選用訊息前綴。
- `ackReaction`: 此頻道/帳號的選用 ack 反應覆寫。
- `ackReactionScope`: 選用 ack 反應範圍覆寫 (`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`)。
- `reactionNotifications`: 連入反應通知模式 (`own`、`off`)。
- `mediaMaxMb`: Matrix 媒體處理的媒體大小上限 (MB)。此設定適用於外寄傳送與連入媒體處理。
- `autoJoin`：邀請自動加入原則（`always`、`allowlist`、`off`）。預設值：`off`。
- `autoJoinAllowlist`：當 `autoJoin` 為 `allowlist` 時允許的房間/別名。別名條目會在處理邀請時解析為房間 ID；OpenClaw 不信任被邀請房間聲稱的別名狀態。
- `dm`：DM 原則區塊（`enabled`、`policy`、`allowFrom`、`threadReplies`）。
- `dm.allowFrom` 條目應為完整的 Matrix 使用者 ID，除非您已透過即時目錄查詢解析過它們。
- `dm.threadReplies`：僅限 DM 的執行緒原則覆寫（`off`、`inbound`、`always`）。它會覆寫頂層 `threadReplies` 設定，適用於 DM 中的回覆放置和工作階段隔離。
- `accounts`：命名的帳號特定覆寫。頂層 `channels.matrix` 值會作為這些條目的預設值。
- `groups`：各房間原則對應表。建議優先使用房間 ID 或別名；未解析的房間名稱會在執行時被忽略。工作階段/群組身分使用解析後的穩定房間 ID，而可讀標籤仍來自房間名稱。
- `rooms`：`groups` 的舊版別名。
- `actions`：各動作工具閘門（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相關

- [頻道總覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — DM 認證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及閘門
- [通道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化防護
