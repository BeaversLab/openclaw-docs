---
summary: "透過 signal-cli (JSON-RPC + SSE) 支援 Signal、設定路徑以及號碼模型"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

# Signal (signal-cli)

狀態：外部 CLI 整合。Gateway 透過 HTTP JSON-RPC + SSE 與 `signal-cli` 通訊。

## 先決條件

- 伺服器上已安裝 OpenClaw（以下 Linux 流程已在 Ubuntu 24 上測試）。
- 執行 gateway 的主機上須有 `signal-cli` 可用。
- 一個能接收一條驗證簡訊的手機號碼（用於 SMS 註冊路徑）。
- 在註冊期間能使用瀏覽器存取 Signal 驗證碼 (`signalcaptchas.org`)。

## 快速設定（初學者）

1. 為機器人使用**獨立的 Signal 號碼**（建議）。
2. 安裝 `signal-cli`（如果您使用 JVM 版本則需要 Java）。
3. 選擇一種設定路徑：
   - **路徑 A (QR 連結)：** `signal-cli link -n "OpenClaw"` 並用 Signal 掃描。
   - **路徑 B (SMS 註冊)：** 使用驗證碼 + SMS 驗證來註冊專用號碼。
4. 設定 OpenClaw 並重新啟動 gateway。
5. 發送第一則 DM 並核准配對 (`openclaw pairing approve signal <CODE>`)。

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

| 欄位        | 描述                                                   |
| ----------- | ------------------------------------------------------ |
| `account`   | E.164 格式的機器人手機號碼 (`+15551234567`)            |
| `cliPath`   | `signal-cli` 的路徑（若在 `PATH` 上則為 `signal-cli`） |
| `dmPolicy`  | DM 存取原則（建議 `pairing`）                          |
| `allowFrom` | 允許 DM 的手機號碼或 `uuid:<id>` 值                    |

## 它是什麼

- 透過 `signal-cli` 的 Signal 頻道（非內嵌 libsignal）。
- 決定性路由：回覆總是會傳回 Signal。
- DM 共用代理程式的主要工作階段；群組則是隔離的 (`agent:<agentId>:signal:group:<groupId>`)。

## 設定寫入

根據預設，Signal 被允許寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 號碼模型（重要）

- Gateway 會連接到一個 **Signal 裝置**（即 `signal-cli` 帳號）。
- 如果您在**您的個人 Signal 帳號**上運行機器人，它將忽略您自己的訊息（迴圈保護）。
- 對於「我發訊息給機器人並收到回覆」，請使用**獨立的機器人號碼**。

## 設定路徑 A：連結現有的 Signal 帳號（QR 碼）

1. 安裝 `signal-cli`（JVM 或原生版本）。
2. 連結機器人帳號：
   - `signal-cli link -n "OpenClaw"` 然後在 Signal 中掃描 QR 碼。
3. 設定 Signal 並啟動網關。

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

多帳號支援：使用 `channels.signal.accounts` 配合每個帳號的設定與可選的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/configuration-reference#multi-account-all-channels) 了解共享模式。

## 設定路徑 B：註冊專用機器人號碼（簡訊，Linux）

當您想要一個專用的機器人號碼而不是連結現有的 Signal 應用程式帳號時，請使用此方法。

1. 取得一個可以接收簡訊的號碼（或是市話的語音驗證）。
   - 使用專用的機器人號碼以避免帳號/衝突會衝突。
2. 在網關主機上安裝 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本（`signal-cli-${VERSION}.tar.gz`），請先安裝 JRE 25+。
請保持 `signal-cli` 更新；上游指出舊版本可能會因 Signal 伺服器 API 變更而損壞。

3. 註冊並驗證號碼：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要驗證碼：

1. 開啟 `https://signalcaptchas.org/registration/generate.html`。
2. 完成驗證碼驗證，從「開啟 Signal」複製 `signalcaptcha://...` 連結目標。
3. 盡可能從與瀏覽器階段相同的外部 IP 執行。
4. 立即再次執行註冊（驗證碼權杖很快就會過期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 設定 OpenClaw，重新啟動網關，驗證頻道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配對您的 DM 發送者：
   - 傳送任何訊息給機器人號碼。
   - 在伺服器上通過代碼： `openclaw pairing approve signal <PAIRING_CODE>`。
   - 將機器人號碼儲存在您的手機通訊錄中，以避免顯示「未知連絡人」。

重要：使用 `signal-cli` 註冊電話號碼帳號可能會取消該號碼主要 Signal 應用程式階段的驗證。建議使用專用的機器人號碼，或者如果您需要保留現有的手機應用程式設定，請使用 QR 連結模式。

上游參考資料：

- `signal-cli` README： `https://github.com/AsamK/signal-cli`
- 驗證碼流程： `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 連結流程： `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守護程式模式 (httpUrl)

如果您想自行管理 `signal-cli`（緩慢的 JVM 冷啟動、容器初始化或共用 CPU），請單獨執行守護程式並讓 OpenClaw 指向它：

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

這會跳過 OpenClaw 內的自動生成和啟動等待。如果自動生成時啟動緩慢，請設定 `channels.signal.startupTimeoutMs`。

## 存取控制（DM + 群組）

私訊 (DM)：

- 預設值：`channels.signal.dmPolicy = "pairing"`。
- 未知的發送者會收到配對代碼；在批准之前訊息會被忽略（代碼在 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配對是 Signal 私訊的預設代幣交換方式。詳情：[配對](/zh-Hant/channels/pairing)
- 僅 UUID 的發送者（來自 `sourceUuid`）會以 `uuid:<id>` 格式儲存在 `channels.signal.allowFrom` 中。

群組：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制當設定 `allowlist` 時，誰可以在群組中觸發動作。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 來覆寫群組行為。
- 在多帳號設定中，使用 `channels.signal.accounts.<id>.groups` 進行每個帳號的覆寫。
- 執行時注意：如果 `channels.signal` 完全缺失，執行時會退回到 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

## 運作方式（行為）

- `signal-cli` 作為守護程式運行；閘道透過 SSE 讀取事件。
- 傳入訊息會被正規化為共用的頻道封裝格式。
- 回覆總是會路由回相同的號碼或群組。

## 媒體 + 限制

- 傳出文字會被分割成 `channels.signal.textChunkLimit`（預設為 4000）。
- 可選的換行分割：設定 `channels.signal.chunkMode="newline"` 以在長度分割之前依空白行（段落邊界）分割。
- 支援附件（從 `signal-cli` 取得的 base64）。
- 預設媒體上限：`channels.signal.mediaMaxMb`（預設為 8）。
- 使用 `channels.signal.ignoreAttachments` 以跳過下載媒體。
- 群組歷史紀錄語境使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），並回退到 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設為 50）。

## 輸入 + 已讀回執

- **輸入指示器**：OpenClaw 透過 `signal-cli sendTyping` 發送輸入訊號，並在回覆執行期間重新整理。
- **已讀回執**：當 `channels.signal.sendReadReceipts` 為 true 時，OpenClaw 會轉發允許的私人訊息（DM）的已讀回執。
- Signal-cli 不會公開群組的已讀回執。

## 回應（訊息工具）

- 將 `message action=react` 與 `channel=signal` 搭配使用。
- 目標：發送者的 E.164 或 UUID（使用配對輸出中的 `uuid:<id>`；僅 UUID 也可以）。
- `messageId` 是您正在回應的訊息的 Signal 時間戳記。
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
  - `off`/`ack` 會停用代理程式回應（訊息工具 `react` 將會出錯）。
  - `minimal`/`extensive` 會啟用代理程式回應並設定指引等級。
- 每個帳戶的覆寫：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 傳遞目標 (CLI/cron)

- 私人訊息：`signal:+15551234567`（或純 E.164）。
- UUID 私人訊息：`uuid:<id>`（或僅 UUID）。
- 群組：`signal:group:<groupId>`。
- 使用者名稱：`username:<name>`（如果您的 Signal 帳戶支援）。

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

- 可連線至 Daemon 但無回覆：請驗證帳戶/Daemon 設定（`httpUrl`、`account`）及接收模式。
- 私人訊息被忽略：發送者正在等候配對批准。
- 群組訊息被忽略：群組發送者/提及閘門阻擋了傳遞。
- 編輯後出現設定驗證錯誤：請執行 `openclaw doctor --fix`。
- 診斷中缺少 Signal：請確認 `channels.signal.enabled: true`。

額外檢查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

如需分診流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 安全備註

- `signal-cli` 會在本機儲存帳戶金鑰（通常是 `~/.local/share/signal-cli/data/`）。
- 在伺服器遷移或重建之前，請備份 Signal 帳戶狀態。
- 保持 `channels.signal.dmPolicy: "pairing"`，除非您明確想要更廣泛的私人訊息存取權限。
- SMS 驗證僅在註冊或復原流程時需要，但失去對號碼/帳戶的控制可能會使重新註冊變得複雜。

## 設定參考 (Signal)

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.signal.enabled`：啟用/停用通道啟動。
- `channels.signal.account`：機器人帳戶的 E.164 編號。
- `channels.signal.cliPath`：`signal-cli` 的路徑。
- `channels.signal.httpUrl`：完整的 daemon URL（會覆蓋 host/port）。
- `channels.signal.httpHost`, `channels.signal.httpPort`：daemon 綁定（預設為 127.0.0.1:8080）。
- `channels.signal.autoStart`：自動產生 daemon（若未設定 `httpUrl` 則預設為 true）。
- `channels.signal.startupTimeoutMs`：啟動等待逾時時間，以毫秒為單位（上限為 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳過附件下載。
- `channels.signal.ignoreStories`：忽略來自 daemon 的動態。
- `channels.signal.sendReadReceipts`：轉發已讀回執。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（預設：pairing）。
- `channels.signal.allowFrom`：DM 允許清單（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 沒有用戶名稱；請使用電話/UUID ID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（預設：allowlist）。
- `channels.signal.groupAllowFrom`：群組傳送者允許清單。
- `channels.signal.groups`：以 Signal 群組 ID（或 `"*"`）為鍵值的各群組覆寫設定。支援的欄位：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`：用於多帳號設定的 `channels.signal.groups` 之各帳號版本。
- `channels.signal.historyLimit`：要作為上下文包含的群組訊息數量上限（設為 0 則停用）。
- `channels.signal.dmHistoryLimit`：以使用者回合為單位的 DM（私訊）歷史記錄限制。各使用者的覆寫設定：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：傳出區塊大小（字元數）。
- `channels.signal.chunkMode`：`length`（預設值）或 `newline`，表示在按長度切分區塊前先依空行（段落邊界）進行分割。
- `channels.signal.mediaMaxMb`：傳入/傳出媒體大小上限（MB）。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支援原生提及功能）。
- `messages.groupChat.mentionPatterns`（全域後備值）。
- `messages.responsePrefix`。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及控制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
