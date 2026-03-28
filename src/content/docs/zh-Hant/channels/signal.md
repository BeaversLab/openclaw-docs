---
summary: "透過 signal-cli (JSON-RPC + SSE) 的 Signal 支援、設定路徑以及號碼模型"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

# Signal (signal-cli)

狀態：外部 CLI 整合。Gateway 透過 HTTP JSON-RPC + SSE 與 `signal-cli` 通訊。

## 先決條件

- 您的伺服器上已安裝 OpenClaw（下方的 Linux 流程已在 Ubuntu 24 上測試）。
- 執行 Gateway 的主機上必須有 `signal-cli` 可用。
- 一個可以接收一則驗證簡訊的手機號碼（用於簡訊註冊路徑）。
- 註冊期間需要瀏覽器存取權以進行 Signal 驗證碼 (`signalcaptchas.org`) 驗證。

## 快速設定（初學者）

1. 使用**專屬的 Signal 號碼**給 bot（推薦）。
2. 安裝 `signal-cli`（若您使用 JVM 版本則需要 Java）。
3. 選擇一個設定路徑：
   - **路徑 A (QR 連結)：** `signal-cli link -n "OpenClaw"` 並用 Signal 掃描。
   - **路徑 B (SMS 註冊)：** 使用驗證碼 + SMS 驗證註冊一個專用號碼。
4. 設定 OpenClaw 並重新啟動閘道。
5. 傳送第一則私訊並批准配對 (`openclaw pairing approve signal <CODE>`)。

最小設定：

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

| 欄位        | 說明                                                  |
| ----------- | ----------------------------------------------------- |
| `account`   | E.164 格式的機器人電話號碼 (`+15551234567`)           |
| `cliPath`   | `signal-cli` 的路徑 (若在 `PATH` 上則為 `signal-cli`) |
| `dmPolicy`  | 私訊存取政策 (建議使用 `pairing`)                     |
| `allowFrom` | 允許傳送私訊的電話號碼或 `uuid:<id>` 值               |

## 簡介

- 透過 `signal-cli` 的 Signal 頻道 (非內嵌的 libsignal)。
- 確定性路由：回覆一律傳回 Signal。
- 私訊共用代理程式的主工作階段；群組則是隔離的 (`agent:<agentId>:signal:group:<groupId>`)。

## 設定檔寫入

預設情況下，允許 Signal 寫入由 `/config set|unset` 觸發的設定檔更新 (需要 `commands.config: true`)。

停用方式：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 號碼模型 (重要)

- 閘道會連線至一個 **Signal 裝置** (`signal-cli` 帳號)。
- 如果您在 **您的個人 Signal 帳號** 上執行機器人，它將會忽略您自己的訊息 (迴圈保護)。
- 若要實作「我傳訊給機器人並收到回覆」，請使用 **獨立的機器人號碼**。

## 設定途徑 A：連結既有 Signal 帳號 (QR Code)

1. 安裝 `signal-cli` (JVM 或原生建置版本)。
2. 連結一個機器人帳號：
   - `signal-cli link -n "OpenClaw"` 然後在 Signal 中掃描 QR Code。
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

多帳號支援：使用 `channels.signal.accounts` 搭配每個帳號的配置和選用的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/configuration-reference#multi-account-all-channels) 以了解共用模式。

## 設置路徑 B：註冊專用機器人號碼（SMS，Linux）

當您想要使用專用機器人號碼而不是連結現有 Signal 應用程式帳號時，請使用此選項。

1. 取得一個可以接收 SMS（或語音驗證，適用於市話）的號碼。
   - 使用專用機器人號碼以避免帳號/工作階段衝突。
2. 在閘道主機上安裝 `signal-cli`：

```exec
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本（`signal-cli-${VERSION}.tar.gz`），請先安裝 JRE 25+。
請保持 `signal-cli` 為最新版本；上游指出舊版本可能會因為 Signal 伺服器 API 變更而損壞。

3. 註冊並驗證號碼：

```exec
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要驗證碼：

1. 開啟 `https://signalcaptchas.org/registration/generate.html`。
2. 完成驗證碼驗證，從「Open Signal」複製 `signalcaptcha://...` 連結目標。
3. 盡可能從與瀏覽器工作階段相同的外部 IP 執行。
4. 立即再次執行註冊（驗證碼 token 過期很快）：

```exec
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 設定 OpenClaw，重新啟動閘道，驗證頻道：

```exec
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配對您的 DM 傳送者：
   - 傳送任何訊息至機器人號碼。
   - 在伺服器上核准程式碼： `openclaw pairing approve signal <PAIRING_CODE>`。
   - 將機器人號碼儲存在您的手機中為聯絡人，以避免「未知聯絡人」。

重要：使用 `signal-cli` 註冊電話號碼帳戶可能會取消該號碼主要 Signal 應用程式工作階段的驗證。建議使用專用的機器人號碼，如果您需要保留現有的手機應用程式設定，請使用 QR 連結模式。

上游參考：

- `signal-cli` README： `https://github.com/AsamK/signal-cli`
- 驗證碼流程： `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 連結流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守護程式模式 (httpUrl)

如果您想要自行管理 `signal-cli`（由於 JVM 冷啟動緩慢、容器初始化或共享 CPU），請單獨執行守護程式並將 OpenClaw 指向它：

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

這會跳過 OpenClaw 內的自動產生和啟動等待。若自動產生時啟動緩慢，請設定 `channels.signal.startupTimeoutMs`。

## 存取控制 (私訊 + 群組)

私訊 (DMs)：

- 預設：`channels.signal.dmPolicy = "pairing"`。
- 未知的傳送者會收到配對碼；在核准之前訊息會被忽略（配對碼在 1 小時後過期）。
- 透過以下方式核准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配對是 Signal 私訊的預設權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)
- 僅有 UUID 的傳送者（來自 `sourceUuid`）會以 `uuid:<id>` 的形式儲存在 `channels.signal.allowFrom` 中。

群組：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制誰可以在設定 `allowlist` 時在群組中觸發。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 覆蓋群組行為。
- 在多帳號設置中，使用 `channels.signal.accounts.<id>.groups` 進行每個帳號的覆蓋。
- 執行時注意：如果完全缺少 `channels.signal`，執行時將回退到 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

## 運作方式 (行為)

- `signal-cli` 作為守護程序運行；網關透過 SSE 讀取事件。
- 傳入訊息被正規化為共享通道信封。
- 回覆總是路由回相同的號碼或群組。

## 媒體 + 限制

- 外發文字會被分塊至 `channels.signal.textChunkLimit`（預設為 4000）。
- 可選的換行分塊：設定 `channels.signal.chunkMode="newline"` 以在長度分塊之前依據空行（段落邊界）進行分割。
- 支援附件（從 `signal-cli` 取得的 base64）。
- 預設媒體上限：`channels.signal.mediaMaxMb`（預設為 8）。
- 使用 `channels.signal.ignoreAttachments` 以跳過下載媒體。
- 群組歷史紀錄語境使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），並回退至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設為 50）。

## 輸入中 + 已讀回執

- **輸入中指示器**：OpenClaw 透過 `signal-cli sendTyping` 發送輸入中訊號，並在回覆執行時進行重新整理。
- **已讀回執**：當 `channels.signal.sendReadReceipts` 為 true 時，OpenClaw 會轉發允許的私訊（DM）的已讀回執。
- Signal-cli 不公開群組的已讀回執。

## 反應（訊息工具）

- 將 `message action=react` 與 `channel=signal` 一起使用。
- 目標：發送者 E.164 或 UUID（使用配對輸出中的 `uuid:<id>`；純 UUID 也可以）。
- `messageId` 是您正在反應的訊息的 Signal 時間戳記。
- 群組反應需要 `targetAuthor` 或 `targetAuthorUuid`。

範例：

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

設定：

- `channels.signal.actions.reactions`：啟用/停用反應動作（預設為 true）。
- `channels.signal.reactionLevel`：`off | ack | minimal | extensive`。
  - `off`/`ack` 會停用代理程式反應（訊息工具 `react` 將會報錯）。
  - `minimal`/`extensive` 啟用代理程式反應並設定指導層級。
- 每個帳號的覆寫：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 傳送目標 (CLI/cron)

- DM：`signal:+15551234567` (或純 E.164)。
- UUID DM：`uuid:<id>` (或裸 UUID)。
- 群組：`signal:group:<groupId>`。
- 使用者名稱：`username:<name>` (如果您的 Signal 帳號支援)。

## 疑難排解

先執行此程序：

```exec
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後在需要時確認 DM 配對狀態：

```exec
openclaw pairing list signal
```

常見失敗：

- Daemon 可連線但無回覆：驗證帳號/daemon 設定 (`httpUrl`、`account`) 和接收模式。
- DM 被忽略：發送者正在等待配對批准。
- 群組訊息被忽略：群組發送者/提及閘門阻擋了傳送。
- 編輯後的設定驗證錯誤：請執行 `openclaw doctor --fix`。
- 診斷中缺少 Signal：請確認 `channels.signal.enabled: true`。

額外檢查：

```exec
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

排查流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 安全性備註

- `signal-cli` 會在本機儲存帳戶金鑰（通常為 `~/.local/share/signal-cli/data/`）。
- 在伺服器遷移或重建前，請備份 Signal 帳戶狀態。
- 除非您明確想要開放更廣泛的 DM 存取權，否則請保留 `channels.signal.dmPolicy: "pairing"`。
- 簡訊驗證僅在註冊或復原流程時需要，但失去號碼/帳戶的控制權可能會讓重新註冊變得複雜。

## 設定參考 (Signal)

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.signal.enabled`：啟用/停用頻道啟動。
- `channels.signal.account`：機器人帳戶的 E.164 編號。
- `channels.signal.cliPath`：`signal-cli` 的路徑。
- `channels.signal.httpUrl`：完整的守護程式 URL（覆蓋 host/port）。
- `channels.signal.httpHost`，`channels.signal.httpPort`：守護程式綁定（預設 127.0.0.1:8080）。
- `channels.signal.autoStart`：自動產生守護程式（若未設定 `httpUrl` 則預設為 true）。
- `channels.signal.startupTimeoutMs`：啟動等待逾時時間，以毫秒為單位（上限 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳過下載附件。
- `channels.signal.ignoreStories`：忽略來自守護程式的動態（stories）。
- `channels.signal.sendReadReceipts`：轉送已讀回執。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（預設：配對/pairing）。
- `channels.signal.allowFrom`: DM 許可清單 (E.164 或 `uuid:<id>`)。`open` 需要 `"*"`。Signal 沒有使用者名稱；請使用電話/UUID ID。
- `channels.signal.groupPolicy`: `open | allowlist | disabled` (預設: allowlist)。
- `channels.signal.groupAllowFrom`: 群組發送者許可清單。
- `channels.signal.groups`: 依 Signal 群組 ID (或 `"*"`) 鍵入的各群組覆寫設定。支援欄位: `requireMention`, `tools`, `toolsBySender`。
- `channels.signal.accounts.<id>.groups`: 多帳號設定中 `channels.signal.groups` 的各帳號版本。
- `channels.signal.historyLimit`: 要包含作為語境的群組訊息數量上限 (0 表示停用)。
- `channels.signal.dmHistoryLimit`：以使用者輪次為單位的 DM 歷史記錄限制。每位使用者的覆寫設定：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：傳出區塊大小（字元數）。
- `channels.signal.chunkMode`：`length`（預設）或 `newline`，以在按長度分割前依空行（段落邊界）進行分割。
- `channels.signal.mediaMaxMb`：傳入/傳出媒體大小上限（MB）。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支援原生提及）。
- `messages.groupChat.mentionPatterns`（全域後備值）。
- `messages.responsePrefix`。
