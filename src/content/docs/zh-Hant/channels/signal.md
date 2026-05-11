---
summary: "透過 signal-cli (JSON-RPC + SSE) 支援 Signal、設定路徑以及號碼模型"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

狀態：外部 CLI 整合。Gateway 透過 HTTP JSON-RPC + SSE 與 `signal-cli` 通訊。

## 先決條件

- 您的伺服器上已安裝 OpenClaw（以下的 Linux 流程已在 Ubuntu 24 上測試）。
- 執行 gateway 的主機上須有可用的 `signal-cli`。
- 一個可以接收一條驗證簡訊的手機號碼（用於 SMS 註冊路徑）。
- 在註冊期間需要瀏覽器存取權以進行 Signal 驗證碼 (`signalcaptchas.org`) 驗證。

## 快速設定（初學者）

1. 為機器人使用**專屬的 Signal 號碼**（建議）。
2. 安裝 `signal-cli`（如果使用 JVM 版本則需要 Java）。
3. 選擇一種設定路徑：
   - **路徑 A (QR 連結):** `signal-cli link -n "OpenClaw"` 並使用 Signal 掃描。
   - **路徑 B (SMS 註冊):** 使用驗證碼 + SMS 驗證註冊一個專用號碼。
4. 設定 OpenClaw 並重新啟動 gateway。
5. 發送第一條私訊 (DM) 並批准配對 (`openclaw pairing approve signal <CODE>`)。

最小配置：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

欄位參考：

| 欄位        | 說明                                                      |
| ----------- | --------------------------------------------------------- |
| `account`   | 機器人的 E.164 格式電話號碼 (`+15551234567`)              |
| `cliPath`   | `signal-cli` 的路徑 (如果是在 `PATH` 上則為 `signal-cli`) |
| `dmPolicy`  | 私訊 (DM) 存取原則 (建議使用 `pairing`)                   |
| `allowFrom` | 被允許發送私訊的電話號碼或 `uuid:<id>` 值                 |

## 它是什麼

- 透過 `signal-cli` 的 Signal 頻道（非內嵌 libsignal）。
- 確定性路由：回覆總是發回 Signal。
- 私訊共用 agent 的主要會話；群組則是隔離的 (`agent:<agentId>:signal:group:<groupId>`)。

## 配置寫入

預設情況下，允許 Signal 寫入由 `/config set|unset` 觸發的配置更新（需要 `commands.config: true`）。

禁用方式：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 號碼模型（重要）

- Gateway 連接到一個 **Signal 裝置**（即 `signal-cli` 帳號）。
- 如果您在**您的個人 Signal 帳號**上運行機器人，它將忽略您自己的訊息（迴圈保護）。
- 對於「我發訊息給機器人並收到回覆」，請使用**專屬的機器人號碼**。

## 設定路徑 A：連結現有 Signal 帳號 (QR)

1. 安裝 `signal-cli` (JVM 或原生版本)。
2. 連結機器人帳號：
   - `signal-cli link -n "OpenClaw"` 然後在 Signal 中掃描 QR 碼。
3. 設定 Signal 並啟動閘道。

範例：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

多重帳號支援：使用 `channels.signal.accounts` 搭配每個帳號的設定與可選的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/config-channels#multi-account-all-channels) 瞭解共用模式。

## 設定路徑 B：註冊專用機器人號碼 (SMS, Linux)

當您想要專用機器人號碼而不是連結現有 Signal 應用程式帳號時，請使用此方法。

1. 取得一個可以接收簡訊的號碼（或是固定電話的語音驗證）。
   - 使用專用機器人號碼以避免帳號/工作階段衝突。
2. 在閘道主機上安裝 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本 (`signal-cli-${VERSION}.tar.gz`)，請先安裝 JRE 25+。
請保持 `signal-cli` 更新；上游提到舊版本可能會因為 Signal 伺服器 API 變更而損壞。

3. 註冊並驗證號碼：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要驗證碼：

1. 開啟 `https://signalcaptchas.org/registration/generate.html`。
2. 完成驗證碼，從「開啟 Signal」複製 `signalcaptcha://...` 連結目標。
3. 盡可能使用與瀏覽器工作階段相同的外部 IP 執行。
4. 立即再次執行註冊（驗證碼 token 很快過期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 設定 OpenClaw，重啟閘道，驗證頻道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配對您的私訊傳送者：
   - 傳送任何訊息給機器人號碼。
   - 在伺服器上通過程式碼：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 將機器人號碼儲存在您手機的聯絡人中，以避免「未知聯絡人」。

<Warning>使用 `signal-cli` 註冊電話號碼帳號可能會取消該號碼主要 Signal 應用程式工作階段的授權。建議使用專用機器人號碼，如果您需要保留現有手機應用程式設定，請使用 QR 連結模式。</Warning>

上游參考：

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 驗證碼流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 連結流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守護程序模式 (httpUrl)

如果您想自行管理 `signal-cli`（JVM 冷啟動緩慢、容器初始化或共用 CPU），請分開執行守護程序並讓 OpenClaw 指向它：

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false,
    },
  },
}
```

這會跳過 OpenClaw 內的自動生成和啟動等待。對於自動生成時的緩慢啟動，請設定 `channels.signal.startupTimeoutMs`。

## 存取控制 (DMs + 群組)

私訊 (DMs)：

- 預設值：`channels.signal.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；在批准之前，訊息會被忽略（配對碼於 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配對是 Signal 私訊的預設 Token 交換方式。詳情：[配對]/en/channels/pairing)
- 僅具備 UUID 的發送者（來自 `sourceUuid`）會以 `uuid:<id>` 格式儲存在 `channels.signal.allowFrom` 中。

群組：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制誰可以在設定了 `allowlist` 的群組中觸發操作。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 覆寫群組行為。
- 在多帳號設置中，使用 `channels.signal.accounts.<id>.groups` 進行各個帳號的覆寫。
- 執行時注意：如果完全缺少 `channels.signal`，執行時會回退到使用 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

## 運作方式 (行為)

- `signal-cli` 作為守護程序執行；閘道透過 SSE 讀取事件。
- 傳入訊息會被正規化為共享通道封裝。
- 回覆總是會路由回同一個號碼或群組。

## 媒體 + 限制

- 傳出文字會分割為 `channels.signal.textChunkLimit`（預設 4000）。
- 選用的換行分割：設定 `channels.signal.chunkMode="newline"` 以在長度分割前依空行（段落邊界）分割。
- 支援附件（從 `signal-cli` 擷取 base64）。
- 語音備忘錄附件會在缺少 `contentType` 時，使用 `signal-cli` 檔名作為 MIME 後備方案，以便音訊轉錄仍能分類 AAC 語音備忘錄。
- 預設媒體上限：`channels.signal.mediaMaxMb`（預設 8）。
- 使用 `channels.signal.ignoreAttachments` 跳過下載媒體。
- 群組歷史紀錄內容使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），並回退至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設 50）。

## 輸入 + 已讀回執

- **輸入指示器**：OpenClaw 透過 `signal-cli sendTyping` 發送輸入訊號，並在產生回覆時持續更新。
- **已讀回執**：當 `channels.signal.sendReadReceipts` 為 true 時，OpenClaw 會轉發允許的私訊（DM）之已讀回執。
- Signal-cli 不會公開群組的已讀回執。

## 回應（訊息工具）

- 使用 `message action=react` 搭配 `channel=signal`。
- 目標：發送者的 E.164 或 UUID（使用配對輸出中的 `uuid:<id>`；單純 UUID 也可行）。
- `messageId` 是您正在回應訊息的 Signal 時間戳記。
- 群組回應需要 `targetAuthor` 或 `targetAuthorUuid`。

範例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

設定：

- `channels.signal.actions.reactions`：啟用/停用回應動作（預設為 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 會停用代理程式回應（訊息工具 `react` 將會報錯）。
  - `minimal`/`extensive` 會啟用代理程式回應並設定指導層級。
- 個別帳號覆寫：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 傳遞目標 (CLI/cron)

- 私訊（DM）：`signal:+15551234567`（或純 E.164）。
- UUID 私訊：`uuid:<id>`（或單純 UUID）。
- 群組：`signal:group:<groupId>`。
- 使用者名稱：`username:<name>`（如果您的 Signal 帳號支援）。

## 疑難排解

請先執行此步驟：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後如有需要，確認私人訊息配對狀態：

```bash
openclaw pairing list signal
```

常見失敗原因：

- 可連上 Daemon 但沒有回覆：請確認帳號/Daemon 設定（`httpUrl`、`account`）及接收模式。
- 私人訊息被忽略：發送者正在等候配對批准。
- 群組訊息被忽略：群組發送者/提及閘門阻擋了傳遞。
- 編輯後的設定驗證錯誤：請執行 `openclaw doctor --fix`。
- 診斷中缺少 Signal：請確認 `channels.signal.enabled: true`。

額外檢查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

針對分診流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 安全備註

- `signal-cli` 會將帳號金鑰儲存在本地（通常是 `~/.local/share/signal-cli/data/`）。
- 在伺服器遷移或重建之前，請備份 Signal 帳戶狀態。
- 請保留 `channels.signal.dmPolicy: "pairing"`，除非您明確希望有更廣泛的私訊（DM）存取權。
- SMS 驗證僅在註冊或復原流程時需要，但失去對號碼/帳戶的控制可能會使重新註冊變得複雜。

## 設定參考 (Signal)

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.signal.enabled`：啟用/停用通道啟動。
- `channels.signal.account`：機器人帳號的 E.164。
- `channels.signal.cliPath`: `signal-cli` 的路徑。
- `channels.signal.httpUrl`: 完整的守護程序 URL（覆蓋 host/port）。
- `channels.signal.httpHost`, `channels.signal.httpPort`: 守護程序綁定位址（預設為 127.0.0.1:8080）。
- `channels.signal.autoStart`: 自動產生守護程序（若未設定 `httpUrl`，則預設為 true）。
- `channels.signal.startupTimeoutMs`: 啟動等待逾時時間，單位為毫秒（上限 120000）。
- `channels.signal.receiveMode`: `on-start | manual`。
- `channels.signal.ignoreAttachments`: 跳過附件下載。
- `channels.signal.ignoreStories`: 忽略來自守護程序的動態。
- `channels.signal.sendReadReceipts`: 轉發已讀回執。
- `channels.signal.dmPolicy`: `pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.signal.allowFrom`: 私訊許可清單（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 沒有使用者名稱；請使用電話/UUID ID。
- `channels.signal.groupPolicy`: `open | allowlist | disabled`（預設：allowlist）。
- `channels.signal.groupAllowFrom`: 群組發送者許可清單。
- `channels.signal.groups`: 依 Signal 群組 ID（或 `"*"`）索引的各群組覆寫。支援欄位：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`: 多帳號設定的 `channels.signal.groups` 逐帳號版本。
- `channels.signal.historyLimit`: 作為語境包含的群組訊息數量上限（0 表示停用）。
- `channels.signal.dmHistoryLimit`: 私訊歷史紀錄限制，以使用者輪次為單位。逐使用者覆寫：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 外傳區塊大小（字元）。
- `channels.signal.chunkMode`: `length`（預設）或 `newline` 在長度區塊分割前於空行（段落邊界）分割。
- `channels.signal.mediaMaxMb`: 入站/出站媒體上限（MB）。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns` (Signal 不支援原生提及)。
- `messages.groupChat.mentionPatterns` (全域後備)。
- `messages.responsePrefix`。

## 相關

- [通道總覽](/zh-Hant/channels) — 所有支援的通道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘控
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
