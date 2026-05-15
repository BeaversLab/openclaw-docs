---
summary: "透過 signal-cli 的 Signal 支援（原生守護程式或 bbernhard 容器）、設定路徑與號碼模型"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "Signal"
---

狀態：外部 CLI 整合。Gateway 透過 HTTP 與 `signal-cli` 通訊 —— 可選擇原生守護程式（JSON-RPC + SSE）或 bbernhard/signal-cli-rest-api 容器（REST + WebSocket）。

## 先決條件

- 您的伺服器上已安裝 OpenClaw（以下的 Linux 流程已在 Ubuntu 24 上測試）。
- 擇一：
  - 主機上可用的 `signal-cli`（原生模式），**或**
  - `bbernhard/signal-cli-rest-api` Docker 容器（容器模式）。
- 一個能接收一條驗證簡訊的手機號碼（用於 SMS 註冊路徑）。
- 註冊期間瀏覽器存取權限以用於 Signal 驗證碼（`signalcaptchas.org`）。

## 快速設定（初學者）

1. 為機器人使用**專屬的 Signal 號碼**（建議）。
2. 安裝 `signal-cli`（若使用 JVM 建置則需要 Java）。
3. 選擇一條設定路徑：
   - **路徑 A（QR 連結）：** `signal-cli link -n "OpenClaw"` 並用 Signal 掃描。
   - **路徑 B（SMS 註冊）：** 透過驗證碼 + SMS 驗證註冊專用號碼。
4. 設定 OpenClaw 並重啟 gateway。
5. 發送第一則 DM 並批准配對（`openclaw pairing approve signal <CODE>`）。

最簡設定：

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

| 欄位        | 說明                                                   |
| ----------- | ------------------------------------------------------ |
| `account`   | E.164 格式的機器人電話號碼（`+15551234567`）           |
| `cliPath`   | `signal-cli` 的路徑（若在 `PATH` 上則為 `signal-cli`） |
| `dmPolicy`  | DM 存取原則（建議 `pairing`）                          |
| `allowFrom` | 允許發送 DM 的電話號碼或 `uuid:<id>` 值                |

## 它是什麼

- 透過 `signal-cli` 的 Signal 頻道（非內嵌 libsignal）。
- 確定性路由：回覆總是會回到 Signal。
- DM 共用代理程式的主要工作階段；群組則是隔離的（`agent:<agentId>:signal:group:<groupId>`）。

## 設定寫入

預設情況下，允許 Signal 寫入由 `/config set|unset` 觸發的設定更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 號碼模型（重要）

- 閘道會連接到一個 **Signal 裝置**（即 `signal-cli` 帳號）。
- 如果您在 **您的個人 Signal 帳號** 上執行機器人，它將會忽略您自己的訊息（迴圈保護）。
- 若要實現「我傳訊息給機器人並收到回覆」，請使用 **獨立的機器人號碼**。

## 設置路徑 A：連結現有 Signal 帳號 (QR)

1. 安裝 `signal-cli`（JVM 或原生版本）。
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

多帳號支援：使用 `channels.signal.accounts` 並搭配每個帳號的設定與可選的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/config-channels#multi-account-all-channels) 以了解共享模式。

## 設置路徑 B：註冊專用機器人號碼 (SMS, Linux)

當您想要一個專用的機器人號碼，而不是連結現有的 Signal 應用程式帳號時，請使用此方法。

1. 取得一個可以接收簡訊的號碼（或是有語音驗證功能的市內電話號碼）。
   - 使用專用的機器人號碼以避免帳號/工作階段衝突。
2. 在閘道主機上安裝 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本 (`signal-cli-${VERSION}.tar.gz`)，請先安裝 JRE 25+。
請保持 `signal-cli` 為最新狀態；上游版本註記指出，舊版本可能會因為 Signal 伺服器 API 的變更而失效。

3. 註冊並驗證號碼：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要驗證碼：

1. 開啟 `https://signalcaptchas.org/registration/generate.html`。
2. 完成驗證碼驗證，從「Open Signal」中複製 `signalcaptcha://...` 連結目標。
3. 盡可能從與瀏覽器工作階段相同的外部 IP 執行。
4. 立即再次執行註冊（驗證碼權杖很快過期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 設定 OpenClaw，重新啟動閘道，驗證頻道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配對您的 DM 傳送者：
   - 傳送任何訊息給機器人號碼。
   - 在伺服器上核准代碼：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 將機器人號碼儲存在您的手機通訊錄中，以避免顯示「Unknown contact」（未知連絡人）。

<Warning>使用 `signal-cli` 註冊電話號碼帳號可能會導致該號碼的主要 Signal 應用程式工作階段被取消驗證。建議使用專用的機器人號碼，或者如果您需要保留現有的手機應用程式設置，請使用 QR 連結模式。</Warning>

上游參考資料：

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 驗證碼流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 連結流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守護程式模式 (httpUrl)

如果您想自行管理 `signal-cli`（緩慢的 JVM 冷啟動、容器初始化或共享 CPU），請單獨執行守護程式並將 OpenClaw 指向它：

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

## 容器模式 (bbernhard/signal-cli-rest-api)

除了原生執行 `signal-cli`，您也可以使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器。這會將 `signal-cli` 包裝在 REST API 和 WebSocket 介面之後。

需求：

- 為了即時接收訊息，容器**必須**使用 `MODE=json-rpc` 執行。
- 在連接 OpenClaw 之前，請先在容器內註冊或連結您的 Signal 帳號。

`docker-compose.yml` 服務範例：

```yaml
signal-cli:
  image: bbernhard/signal-cli-rest-api:latest
  environment:
    MODE: json-rpc
  ports:
    - "8080:8080"
  volumes:
    - signal-cli-data:/home/.local/share/signal-cli
```

OpenClaw 設定：

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      httpUrl: "http://signal-cli:8080",
      autoStart: false,
      apiMode: "container", // or "auto" to detect automatically
    },
  },
}
```

`apiMode` 欄位控制 OpenClaw 使用的協定：

| 數值          | 行為                                                                                    |
| ------------- | --------------------------------------------------------------------------------------- |
| `"auto"`      | （預設）探測兩種傳輸方式；串流驗證容器 WebSocket 接收                                   |
| `"native"`    | 強制使用原生 signal-cli（JSON-RPC 位於 `/api/v1/rpc`，SSE 位於 `/api/v1/events`）       |
| `"container"` | 強制使用 bbernhard 容器（REST 位於 `/v2/send`，WebSocket 位於 `/v1/receive/{account}`） |

當 `apiMode` 為 `"auto"` 時，OpenClaw 會快取偵測到的模式 30 秒以避免重複探測。只有在 `/v1/receive/{account}` 升級到 WebSocket 之後，才會選擇容器接收進行串流，這需要 `MODE=json-rpc`。

容器模式支援與原生模式相同的 Signal 頻道操作，前提是容器公開了相符的 API：發送、接收、附件、輸入指示器、已讀/已檢視回執、反應、群組和樣式文字。OpenClaw 會將其原生 Signal RPC 呼叫轉換為容器的 REST 載荷，包括 `group.{base64(internal_id)}` 群組 ID 和 `text_mode: "styled"` 用於格式化文字。

操作說明：

- 在容器模式下使用 `autoStart: false`。當選擇 `apiMode: "container"` 時，OpenClaw 不應啟動原生守護程式。
- 使用 `MODE=json-rpc` 進行接收。`MODE=normal` 可以使 `/v1/about` 看起來正常，但 `/v1/receive/{account}` 不會進行 WebSocket 升級，因此 OpenClaw 不會在 `auto` 模式下選擇容器接收串流。
- 當您知道 `httpUrl` 指向 bbernhard 的 REST API 時，請設定 `apiMode: "container"`。當您知道它指向原生 `signal-cli` JSON-RPC/SSE 時，請設定 `apiMode: "native"`。當部署可能變化時，請使用 `"auto"`。
- 容器附件下載遵守與原生模式相同的媒體位元組限制。當伺服器發送 `Content-Length` 時，過大的回應會在完全緩衝之前被拒絕，否則會在串流傳輸期間被拒絕。

## 存取控制（私訊 + 群組）

私訊：

- 預設值：`channels.signal.dmPolicy = "pairing"`。
- 未知發送者會收到配對碼；在獲批准之前，訊息將被忽略（配對碼在 1 小時後過期）。
- 透過以下方式批准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配對是 Signal 私訊的預設權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)
- 僅具 UUID 的發送者（來自 `sourceUuid`）會以 `uuid:<id>` 形式儲存在 `channels.signal.allowFrom` 中。

群組：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制當設定 `allowlist` 時，哪些群組或發送者可以觸發群組回覆；條目可以是 Signal 群組 ID（原始格式、`group:<id>` 或 `signal:group:<id>`）、發送者電話號碼、`uuid:<id>` 值或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 覆寫群組行為。
- 在多帳號設定中，使用 `channels.signal.accounts.<id>.groups` 進行每個帳號的覆寫。
- 透過 `groupAllowFrom` 將 Signal 群組加入允許清單，並不會單獨停用提及閘道。除非設定了 `requireMention=true`，否則一個特別設定的 `channels.signal.groups["<group-id>"]` 項目會處理每一則群組訊息。
- 執行時期備註：如果完全缺少 `channels.signal`，執行時期會針對群組檢查回退至 `groupPolicy="allowlist"`（即使已設定 `channels.defaults.groupPolicy`）。

## 運作方式（行為）

- 原生模式：`signal-cli` 作為守護程序執行；閘道透過 SSE 讀取事件。
- 容器模式：閘道透過 REST API 傳送並透過 WebSocket 接收。
- 傳入訊息會被正規化為共用的頻道信封。
- 回覆總是會路由回同一個號碼或群組。

## 媒體 + 限制

- 傳出文字會分塊至 `channels.signal.textChunkLimit`（預設 4000）。
- 可選的新行分塊：設定 `channels.signal.chunkMode="newline"` 以在長度分塊前於空白行（段落邊界）進行分割。
- 支援附件（從 `signal-cli` 取得 base64）。
- 語音備忘錄附件會在缺少 `contentType` 時使用 `signal-cli` 檔名作為 MIME 備案，因此音訊轉錄仍能分類 AAC 語音備忘錄。
- 預設媒體上限：`channels.signal.mediaMaxMb`（預設 8）。
- 使用 `channels.signal.ignoreAttachments` 來跳過下載媒體。
- 群組歷史脈絡使用 `channels.signal.historyLimit`（或 `channels.signal.accounts.*.historyLimit`），並回退至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設 50）。

## 輸入中 + 已讀回執

- **輸入中指示器**：OpenClaw 透過 `signal-cli sendTyping` 傳送輸入中訊號，並在回覆執行期間重新整理它們。
- **已讀回執**：當 `channels.signal.sendReadReceipts` 為 true 時，OpenClaw 會轉傳允許之私訊的已讀回執。
- Signal-cli 不會公開群組的已讀回執。

## 反應（訊息工具）

- 將 `message action=react` 與 `channel=signal` 搭配使用。
- 目標：傳送者 E.164 或 UUID（使用配對輸出中的 `uuid:<id>`；僅使用 UUID 亦可）。
- `messageId` 是您要回應之訊息的 Signal 時間戳記。
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
  - `minimal`/`extensive` 會啟用代理程式回應並設定指導等級。
- 每個帳戶的覆寫設定：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 傳遞目標 (CLI/cron)

- 私訊：`signal:+15551234567`（或純 E.164 格式）。
- UUID 私訊：`uuid:<id>`（或純 UUID）。
- 群組：`signal:group:<groupId>`。
- 使用者名稱：`username:<name>`（如果您的 Signal 帳戶支援）。

## 疑難排解

請先執行此排程：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後如有需要，確認私訊配對狀態：

```bash
openclaw pairing list signal
```

常見失敗原因：

- Daemon 可連線但無回應：請驗證帳戶/Daemon 設定（`httpUrl`、`account`）及接收模式。
- 私訊被忽略：發送者正在等待配對核准。
- 群組訊息被忽略：群組發送者/提及閘門阻擋了傳遞。
- 編輯後的設定驗證錯誤：請執行 `openclaw doctor --fix`。
- 診斷資訊中缺少 Signal：請確認 `channels.signal.enabled: true`。

額外檢查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

用於分診流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 安全性備註

- `signal-cli` 會在本機儲存帳戶金鑰（通常在 `~/.local/share/signal-cli/data/`）。
- 在伺服器遷移或重建前備份 Signal 帳戶狀態。
- 保持 `channels.signal.dmPolicy: "pairing"`，除非您明確想要更廣泛的私訊存取權。
- SMS 驗證僅在註冊或修復流程時需要，但失去對號碼/帳戶的控制可能會使重新註冊變得複雜。

## 設定參考 (Signal)

完整設定：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.signal.enabled`：啟用/停用頻道啟動。
- `channels.signal.apiMode`：`auto | native | container`（預設值：auto）。請參閱[容器模式](#container-mode-bbernhardsignal-cli-rest-api)。
- `channels.signal.account`：機器人帳號的 E.164 編號。
- `channels.signal.cliPath`：`signal-cli` 的路徑。
- `channels.signal.httpUrl`：完整的守護程式 URL（會覆寫 host/port）。
- `channels.signal.httpHost`、`channels.signal.httpPort`：守護程式綁定位址（預設值為 127.0.0.1:8080）。
- `channels.signal.autoStart`：自動產生守護程式（若未設定 `httpUrl` 則預設為 true）。
- `channels.signal.startupTimeoutMs`：啟動等待逾時時間，單位為毫秒（上限為 120000）。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳過附件下載。
- `channels.signal.ignoreStories`：忽略來自守護程式的動態。
- `channels.signal.sendReadReceipts`：轉發已讀回執。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled`（預設值：pairing）。
- `channels.signal.allowFrom`：DM 許可清單（E.164 或 `uuid:<id>`）。`open` 需要 `"*"`。Signal 沒有使用者名稱；請使用電話號碼/UUID ID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled`（預設值：allowlist）。
- `channels.signal.groupAllowFrom`：群組許可清單；接受 Signal 群組 ID（原始值、`group:<id>` 或 `signal:group:<id>`）、傳送者 E.164 號碼或 `uuid:<id>` 值。
- `channels.signal.groups`：依 Signal 群組 ID（或 `"*"`）索引的各群組覆寫設定。支援的欄位：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`：用於多帳號設定的 `channels.signal.groups` 之各帳號版本。
- `channels.signal.historyLimit`：要納入上下文的群組訊息數量上限（設為 0 則停用）。
- `channels.signal.dmHistoryLimit`：DM 歷史記錄限制，以使用者輪次為單位。各使用者覆寫設定：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`: 出站區塊大小（字元）。
- `channels.signal.chunkMode`: `length`（預設）或 `newline` 以在按長度分割前先依空行（段落邊界）分割。
- `channels.signal.mediaMaxMb`: 入站/出站媒體上限 (MB)。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns` (Signal 不支援原生提及)。
- `messages.groupChat.mentionPatterns` (全域後備)。
- `messages.responsePrefix`。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 私訊認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘控
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
