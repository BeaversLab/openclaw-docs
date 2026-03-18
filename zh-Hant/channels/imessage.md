---
summary: "透過 imsg 支援舊版 iMessage（透過 stdio 進行 JSON-RPC 通訊）。新的安裝應使用 BlueBubbles。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage (舊版: imsg)

<Warning>
對於新的 iMessage 部署，請使用 <a href="/zh-Hant/channels/bluebubbles">BlueBubbles</a>。

`imsg` 整合功能屬於舊版，可能會在未來的版本中移除。

</Warning>

狀態：舊版外部 CLI 整合。Gateway 會產生 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊（沒有獨立的 daemon/port）。

<CardGroup cols={3}>
  <Card
    title="BlueBubbles (recommended)"
    icon="message-circle"
    href="/zh-Hant/channels/bluebubbles"
  >
    新設定的首選 iMessage 路徑。
  </Card>
  <Card title="Pairing" icon="link" href="/zh-Hant/channels/pairing">
    iMessage 私訊預設為配對模式。
  </Card>
  <Card
    title="Configuration reference"
    icon="settings"
    href="/zh-Hant/gateway/configuration-reference#imessage"
  >
    Full iMessage field reference.
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Local Mac (fast path)">
    <Steps>
      <Step title="Install and verify imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="Configure OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approve first DM pairing (default dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配對請求會在 1 小時後過期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="透過 SSH 連線遠端 Mac">
    OpenClaw 僅需要相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個透過 SSH 連線到遠端 Mac 並執行 `imsg` 的包裝腳本。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    啟用附件時的建議設定：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未設定 `remoteHost`，OpenClaw 會透過解析 SSH 包裝腳本嘗試自動偵測。
    `remoteHost` 必須是 `host` 或 `user@host`（不能有空格或 SSH 選項）。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- 執行 `imsg` 的 Mac 必須已登入訊息 (Messages)。
- 執行 OpenClaw/`imsg` 的進程內容需要「完全磁碟存取權限」（用於存取訊息資料庫）。
- 透過 Messages.app 傳送訊息需要「自動化」權限。

<Tip>
權限是針對每個進程內容授予的。如果閘道以無頭模式（LaunchAgent/SSH）執行，請在同一內容中執行一次性互動式指令以觸發提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單條目可以是帳柄或聊天目標 (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`)。

  </Tab>

  <Tab title="群組策略與提及">
    `channels.imessage.groupPolicy` 控制群組處理方式：

    - `allowlist` （配置時的預設值）
    - `open`
    - `disabled`

    群組發送者白名單：`channels.imessage.groupAllowFrom`。

    運行時回退：如果 `groupAllowFrom` 未設定，iMessage 群組發送者檢查會在可用時回退至 `allowFrom`。
    運行時備註：如果 `channels.imessage` 完全缺失，運行時會回退至 `groupPolicy="allowlist"` 並記錄警告（即使 `channels.defaults.groupPolicy` 已設定）。

    群組的提及閘控：

    - iMessage 沒有原生的提及元數據
    - 提及檢測使用正則表達式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果沒有配置模式，則無法執行提及閘控

    來自授權發送者的控制命令可以繞過群組中的提及閘控。

  </Tab>

  <Tab title="會話與確定性回覆">
    - 私訊使用直接路由；群組使用群組路由。
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會折疊至代理主會話中。
    - 群組會話是隔離的（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回覆使用原始通道/目標元數據路由回 iMessage。

    準群組執行緒行為：

    某些多方參與的 iMessage 執行緒可能會帶有 `is_group=false`。
    如果該 `chat_id` 在 `channels.imessage.groups` 下被明確配置，OpenClaw 會將其視為群組流量（群組閘控 + 群組會話隔離）。

  </Tab>
</Tabs>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated bot macOS user (separate iMessage identity)">
    使用專用的 Apple ID 和 macOS 使用者，以便將機器人流量與您的個人訊息設定檔隔離開來。

    一般流程：

    1. 建立/登入專用的 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝程式，以便 OpenClaw 可以在該使用者環境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要機器人使用者工作階段中的 GUI 核准（Automation + Full Disk Access）。

  </Accordion>

  <Accordion title="Remote Mac over Tailscale (example)">
    常見拓撲：

    - gateway 執行於 Linux/VM
    - iMessage + `imsg` 執行於您 tailnet 中的 Mac
    - `cliPath` 包裝程式使用 SSH 來執行 `imsg`
    - `remoteHost` 啟用 SCP 附件擷取

    範例：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

    使用 SSH 金鑰，讓 SSH 和 SCP 都是非互動式的。
    確保主機金鑰已受信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="Multi-account pattern">
    iMessage 支援 `channels.imessage.accounts` 下的帳號專屬設定。

    每個帳號都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史設定，以及附件根目錄允許清單。

  </Accordion>
</AccordionGroup>

## 媒體、分塊和傳送目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 接收附件擷取為可選：`channels.imessage.includeAttachments`
    - 當設定 `remoteHost` 時，可以透過 SCP 取得遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本機)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 傳出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)
  </Accordion>

<Accordion title="傳出分塊">
  - 文字分塊限制：`channels.imessage.textChunkLimit` (預設 4000) - 分塊模式：
  `channels.imessage.chunkMode` - `length` (預設) - `newline` (段落優先分割)
</Accordion>

  <Accordion title="定址格式">
    偏好的明確目標：

    - `chat_id:123` (建議用於穩定路由)
    - `chat_guid:...`
    - `chat_identifier:...`

    也支援識別碼目標：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 設定寫入

iMessage 預設允許通道發起的設定寫入 (當 `commands.config: true` 時針對 `/config set|unset`)。

停用：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## 疑難排解

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支援 RPC">
    驗證二進位檔和 RPC 支援：

```bash
imsg rpc --help
openclaw channels status --probe
```

    如果探測回報不支援 RPC，請更新 `imsg`。

  </Accordion>

  <Accordion title="私訊被忽略">
    檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對批准 (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="群組訊息被忽略">
    檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 允許清單行為
    - 提及模式設定 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="遠端附件失敗">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從閘道主機進行 SSH/SCP 金鑰驗證
    - 主機金鑰存在於閘道主機的 `~/.ssh/known_hosts` 中
    - 執行「訊息」App 的 Mac 上遠端路徑的可讀性

  </Accordion>

  <Accordion title="錯過 macOS 權限提示">
    在相同的使用者/工作階段環境中，於互動式 GUI 終端機內重新執行，並批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    確認已授權執行 OpenClaw/`imsg` 的程序環境完整磁碟存取權 + 自動化。

  </Accordion>
</AccordionGroup>

## 設定參考指標

- [設定參考 - iMessage](/zh-Hant/gateway/configuration-reference#imessage)
- [閘道設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)
- [BlueBubbles](/zh-Hant/channels/bluebubbles)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
