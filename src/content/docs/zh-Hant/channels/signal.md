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

| 欄位         | 說明                                                   |
| ------------ | ------------------------------------------------------ |
| `account`    | E.164 格式的機器人電話號碼（`+15551234567`）           |
| `cliPath`    | `signal-cli` 的路徑（若在 `PATH` 上則為 `signal-cli`） |
| `configPath` | 作為 `--config` 傳遞的 signal-cli 配置目錄             |
| `dmPolicy`   | DM 存取原則（建議使用 `pairing`）                      |
| `allowFrom`  | 允許發送 DM 的電話號碼或 `uuid:<id>` 值                |

## 它是什麼

- 透過 `signal-cli` 的 Signal 頻道（非嵌入式 libsignal）。
- 確定性路由：回覆總是傳回 Signal。
- DM 共用 agent 的主要 session；群組則是隔離的（`agent:<agentId>:signal:group:<groupId>`）。

## 配置寫入

預設情況下，允許 Signal 寫入由 `/config set|unset` 觸發的配置更新（需要 `commands.config: true`）。

停用方式：

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## 號碼模式（重要）

- 閘道連線到 **Signal 裝置**（`signal-cli` 帳號）。
- 如果您在 **您的個人 Signal 帳號** 上執行 bot，它將會忽略您自己的訊息（迴圈保護）。
- 若要實現「我傳訊息給 bot 而它回覆」，請使用 **專用的 bot 號碼**。

## 設定路徑 A：連結現有 Signal 帳號（QR）

1. 安裝 `signal-cli`（JVM 或原生版本）。
2. 連結 bot 帳號：
   - `signal-cli link -n "OpenClaw"` 然後在 Signal 中掃描 QR code。
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

多帳號支援：使用 `channels.signal.accounts` 搭配每個帳號的設定與選用的 `name`。請參閱 [`gateway/configuration`](/zh-Hant/gateway/config-channels#multi-account-all-channels) 以了解共用模式。

## 設定路徑 B：註冊專用 bot 號碼（SMS，Linux）

當您想要專用 bot 號碼而不是連結現有 Signal 應用程式帳號時使用此選項。

1. 取得一個可以接收 SMS 的號碼（或是對於座機的語音驗證）。
   - 使用專用 bot 號碼以避免帳號/session 衝突。
2. 在閘道主機上安裝 `signal-cli`：

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

如果您使用 JVM 版本（`signal-cli-${VERSION}.tar.gz`），請先安裝 JRE 25+。
保持 `signal-cli` 更新；上游指出，舊版本可能會因為 Signal 伺服器 API 變更而損壞。

3. 註冊並驗證號碼：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

如果需要驗證碼：

1. 開啟 `https://signalcaptchas.org/registration/generate.html`。
2. 完成驗證碼，從「Open Signal」複製 `signalcaptcha://...` 連結目標。
3. 盡可能從與瀏覽器階段相同的外部 IP 執行。
4. 立即再次執行註冊（驗證碼 token 很快就會過期）：

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. 設定 OpenClaw，重新啟動 gateway，驗證通道：

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. 配對您的 DM 傳送端：
   - 傳送任何訊息至機器人號碼。
   - 在伺服器上通過代碼：`openclaw pairing approve signal <PAIRING_CODE>`。
   - 將機器人號碼儲存為您手機中的聯絡人，以避免出現「未知聯絡人」。

<Warning>使用 `signal-cli` 註冊電話號碼帳戶可能會導致該號碼的主要 Signal 應用程式階段取消驗證。建議使用專用的機器人號碼，或者如果您需要保留現有的手機應用程式設定，請使用 QR 連結模式。</Warning>

上游參考：

- `signal-cli` README：`https://github.com/AsamK/signal-cli`
- 驗證碼流程：`https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- 連結流程：`https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## 外部守護程式模式 (httpUrl)

如果您想自行管理 `signal-cli`（緩慢的 JVM 冷啟動、容器初始化或共用 CPU），請單獨執行守護程式並將 OpenClaw 指向它：

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

## 容器模式 (bbernhard/signal-cli-rest-api)

除了原生執行 `signal-cli`，您也可以使用 [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) Docker 容器。這會將 `signal-cli` 包裝在 REST API 與 WebSocket 介面之後。

需求：

- 容器**必須**以 `MODE=json-rpc` 執行才能即時接收訊息。
- 在連接 OpenClaw 之前，請先在容器內註冊或連結您的 Signal 帳戶。

範例 `docker-compose.yml` 服務：

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

`apiMode` 欄位控制 OpenClaw 使用的通訊協定：

| 數值          | 行為                                                                                |
| ------------- | ----------------------------------------------------------------------------------- |
| `"auto"`      | （預設）探測兩種傳輸方式；串流會驗證容器 WebSocket 接收                             |
| `"native"`    | 強制使用原生 signal-cli（JSON-RPC 於 `/api/v1/rpc`，SSE 於 `/api/v1/events`）       |
| `"container"` | 強制使用 bbernhard 容器（REST 於 `/v2/send`，WebSocket 於 `/v1/receive/{account}`） |

當 `apiMode` 為 `"auto"` 時，OpenClaw 會將偵測到的模式快取 30 秒，以避免重複探測。只有在 `/v1/receive/{account}` 升級到 WebSocket（這需要 `MODE=json-rpc`）之後，才會為串流選擇容器接收。

只要容器公開相符的 API，容器模式就支援與原生模式相同的 Signal 頻道操作：傳送、接收、附件、輸入指示器、已讀/已查收回執、反應、群組和樣式文字。OpenClaw 會將其原生 Signal RPC 呼叫轉換為容器的 REST 載荷，包括 `group.{base64(internal_id)}` 群組 ID 和用於格式化文字的 `text_mode: "styled"`。

操作注意事項：

- 搭配容器模式使用 `autoStart: false`。當選擇 `apiMode: "container"` 時，OpenClaw 不應啟動原生守護程序。
- 使用 `MODE=json-rpc` 進行接收。`MODE=normal` 可以讓 `/v1/about` 看起來正常，但 `/v1/receive/{account}` 不會升級到 WebSocket，因此 OpenClaw 不會在 `auto` 模式下選擇容器接收串流。
- 當您知道 `httpUrl` 指向 bbernhard 的 REST API 時，請設定 `apiMode: "container"`。當您知道它指向原生 `signal-cli` JSON-RPC/SSE 時，請設定 `apiMode: "native"`。當部署可能有所不同時，請使用 `"auto"`。
- 容器附件下載遵循與原生模式相同的媒體位元組限制。當伺服器傳送 `Content-Length` 時，過大的回應會在完全緩衝之前被拒絕；其他情況下則會在串流時拒絕。

## 存取控制（私訊 + 群組）

私訊 (DMs)：

- 預設值：`channels.signal.dmPolicy = "pairing"`。
- 未知的發送者會收到配對碼；在核准之前，訊息將被忽略（配對碼會在 1 小時後過期）。
- 透過以下方式核准：
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- 配對是 Signal 私訊 (DM) 的預設權杖交換方式。詳情：[配對](/zh-Hant/channels/pairing)
- 僅含 UUID 的發送者（來自 `sourceUuid`）會被儲存為 `uuid:<id>` 在 `channels.signal.allowFrom` 中。

群組：

- `channels.signal.groupPolicy = open | allowlist | disabled`。
- `channels.signal.groupAllowFrom` 控制當設定 `allowlist` 時，哪些群組或傳送者可以觸發群組回覆；條目可以是 Signal 群組 ID（原始、`group:<id>` 或 `signal:group:<id>`）、傳送者電話號碼、`uuid:<id>` 值或 `*`。
- `channels.signal.groups["<group-id>" | "*"]` 可以使用 `requireMention`、`tools` 和 `toolsBySender` 覆寫群組行為。
- 在多帳號設定中，使用 `channels.signal.accounts.<id>.groups` 進行每個帳號的覆寫。
- 透過 `groupAllowFrom` 將 Signal 群組加入允許清單並不會自動停用提及閘門。除非設定了 `requireMention=true`，否則特定配置的 `channels.signal.groups["<group-id>"]` 條目會處理每個群組訊息。
- 執行時注意：如果完全缺少 `channels.signal`，執行時會回退到使用 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

## 運作方式（行為）

- 原生模式：`signal-cli` 作為守護程式執行；閘道透過 SSE 讀取事件。
- 容器模式：閘道透過 REST API 發送並透過 WebSocket 接收。
- 傳入訊息會被正規化為共用通道信封。
- 回覆總是會路由回同一個號碼或群組。

## 媒體與限制

- 傳出文字會分割為 `channels.signal.textChunkLimit`（預設為 4000）。
- 可選的換行分割：設定 `channels.signal.chunkMode="newline"` 以在長度分割前根據空行（段落邊界）進行分割。
- 支援附件（從 `signal-cli` 取得 base64）。
- 語音備忘錄附件在缺少 `contentType` 時，會使用 `signal-cli` 檔名作為 MIME 備援，以便音訊轉錄仍能分類 AAC 語音備忘錄。
- 預設媒體上限：`channels.signal.mediaMaxMb`（預設為 8）。
- 使用 `channels.signal.ignoreAttachments` 跳過下載媒體。
- 群組歷史記錄上下文使用 `channels.signal.historyLimit` (或 `channels.signal.accounts.*.historyLimit`)，並回退至 `messages.groupChat.historyLimit`。設定 `0` 以停用（預設 50）。

## 輸入 + 已讀回執

- **輸入指示器**：OpenClaw 透過 `signal-cli sendTyping` 發送輸入信號，並在執行回覆時重新整理它們。
- **已讀回執**：當 `channels.signal.sendReadReceipts` 為 true 時，OpenClaw 會轉發允許的私人訊息 (DM) 的已讀回執。
- Signal-cli 不會公開群組的已讀回執。

## 回應 (訊息工具)

- 使用 `message action=react` 搭配 `channel=signal`。
- 目標：發送者的 E.164 或 UUID（使用配對輸出中的 `uuid:<id>`；僅使用 UUID 也可以）。
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
  - `off`/`ack` 停用 Agent 回應（訊息工具 `react` 將會報錯）。
  - `minimal`/`extensive` 啟用 Agent 回應並設定指導層級。
- 每個帳號的覆寫：`channels.signal.accounts.<id>.actions.reactions`、`channels.signal.accounts.<id>.reactionLevel`。

## 核准回應

Signal 執行與插件核准提示使用頂層 `approvals.exec` 和
`approvals.plugin` 路由區塊。Signal 沒有
`channels.signal.execApprovals` 區塊。

- `👍` 核准一次。
- `👎` 拒絕。
- 當請求提供持久性核准時，請使用 `/approve <id> allow-always`。

核准回應解析需要來自
`channels.signal.allowFrom`、`channels.signal.defaultTo` 或相符帳號層級欄位的明確 Signal 核准者。
直接的相同聊天執行核准提示仍可隱藏重複的本地 `/approve` 後援
而無需明確核准者；無核准者的群組核准則會讓本地後援保持可見。

## 傳送目標 (CLI/cron)

- 私訊 (DM)：`signal:+15551234567` (或純 E.164)。
- UUID 私訊：`uuid:<id>` (或純 UUID)。
- 群組：`signal:group:<groupId>`。
- 使用者名稱：`username:<name>` (如果您的 Signal 帳號支援)。

## 疑難排解

請先執行此階段：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然後在需要時確認私訊配對狀態：

```bash
openclaw pairing list signal
```

常見失敗：

- 可連接 Daemon 但無回應：請驗證帳號/Daemon 設定 (`httpUrl`、`account`) 與接收模式。
- 私訊被忽略：傳送者正等待配對核准。
- 群組訊息被忽略：群組傳送者/提及門控阻擋了傳遞。
- 編輯後出現設定驗證錯誤：請執行 `openclaw doctor --fix`。
- 診斷中缺少 Signal：請確認 `channels.signal.enabled: true`。

額外檢查：

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

如需分診流程：[/channels/troubleshooting](/zh-Hant/channels/troubleshooting)。

## 安全注意事項

- `signal-cli` 會在本機儲存帳戶金鑰（通常是 `~/.local/share/signal-cli/data/`）。
- 在伺服器遷移或重建之前，請備份 Signal 帳戶狀態。
- 除非您明確想要更廣泛的私人訊息 (DM) 存取權限，否則請保持 `channels.signal.dmPolicy: "pairing"` 不變。
- SMS 驗證僅在註冊或恢復流程時需要，但失去對號碼/帳戶的控制可能會使重新註冊變得複雜。

## 組態參考 (Signal)

完整組態：[Configuration](/zh-Hant/gateway/configuration)

提供者選項：

- `channels.signal.enabled`：啟用/停用通道啟動。
- `channels.signal.apiMode`：`auto | native | container` (預設：auto)。請參閱 [Container mode](#container-mode-bbernhardsignal-cli-rest-api)。
- `channels.signal.account`：機器人帳戶的 E.164 格式號碼。
- `channels.signal.cliPath`：`signal-cli` 的路徑。
- `channels.signal.configPath`：選用的 `signal-cli --config` 目錄。
- `channels.signal.httpUrl`：完整的守護程式 URL (會覆寫 host/port)。
- `channels.signal.httpHost`, `channels.signal.httpPort`：守護程式綁定位址 (預設 127.0.0.1:8080)。
- `channels.signal.autoStart`：自動產生守護程式 (若未設定 `httpUrl` 則預設為 true)。
- `channels.signal.startupTimeoutMs`：啟動等待逾時時間，單位為毫秒 (上限 120000)。
- `channels.signal.receiveMode`：`on-start | manual`。
- `channels.signal.ignoreAttachments`：跳過附件下載。
- `channels.signal.ignoreStories`：忽略來自守護程式的故事 (Stories)。
- `channels.signal.sendReadReceipts`：轉送已讀回執。
- `channels.signal.dmPolicy`：`pairing | allowlist | open | disabled` (預設：pairing)。
- `channels.signal.allowFrom`：私人訊息 (DM) 許可清單 (E.164 或 `uuid:<id>`)。`open` 需要 `"*"`。Signal 沒有使用者名稱；請使用電話/UUID ID。
- `channels.signal.groupPolicy`：`open | allowlist | disabled` (預設：allowlist)。
- `channels.signal.groupAllowFrom`：群組允許清單；接受 Signal 群組 ID（原始、`group:<id>` 或 `signal:group:<id>`）、發送者 E.164 號碼或 `uuid:<id>` 值。
- `channels.signal.groups`：以 Signal 群組 ID（或 `"*"`）為鍵的逐群組覆寫。支援的欄位：`requireMention`、`tools`、`toolsBySender`。
- `channels.signal.accounts.<id>.groups`：用於多帳號設定的 `channels.signal.groups` 逐帳號版本。
- `channels.signal.historyLimit`：要包含為上下文的群組訊息最大數量（0 表示停用）。
- `channels.signal.dmHistoryLimit`：以使用者輪次為單位的 DM 歷史記錄限制。逐使用者覆寫：`channels.signal.dms["<phone_or_uuid>"].historyLimit`。
- `channels.signal.textChunkLimit`：傳出區塊大小（字元數）。
- `channels.signal.chunkMode`：`length`（預設值）或 `newline`，以便在長度分割前於空白行（段落邊界）進行分割。
- `channels.signal.mediaMaxMb`：傳入/傳出媒體上限（MB）。

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns`（Signal 不支援原生提及）。
- `messages.groupChat.mentionPatterns`（全域後備）。
- `messages.responsePrefix`。

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — DM 認證和配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及閘門
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型和加固
