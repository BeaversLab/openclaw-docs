---
summary: "透過 imsg 支援舊版 iMessage（透過 stdio 的 JSON-RPC）。新安裝應使用 BlueBubbles。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage (legacy: imsg)

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
    新安裝的建議 iMessage 方案。
  </Card>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    iMessage 私訊預設為配對模式。
  </Card>
  <Card title="配置參考" icon="settings" href="/zh-Hant/gateway/configuration-reference#imessage">
    Full iMessage field reference.
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="本機 Mac (快速路徑)">
    <Steps>
      <Step title="安裝並驗證 imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="設定 OpenClaw">

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

      <Step title="啟動閘道">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次 DM 配對 (預設 dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配對請求會在 1 小時後過期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="透過 SSH 連線遠端 Mac">
    OpenClaw 僅需要相容於 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個透過 SSH 連線到遠端 Mac 並執行 `imsg` 的包裝腳本。

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

    如果未設定 `remoteHost`，OpenClaw 會嘗試透過解析 SSH 包裝腳本來自動偵測。
    `remoteHost` 必須是 `host` 或 `user@host`（不得包含空格或 SSH 選項）。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- 必須在執行 `imsg` 的 Mac 上登入 Messages。
- 執行 OpenClaw/`imsg` 的進程上下文需要「完全磁碟存取權限」（Full Disk Access）（存取 Messages 資料庫）。
- 需要「自動化」權限才能透過 Messages.app 傳送訊息。

<Tip>
權限是根據進程上下文授予的。如果閘道在無頭模式（LaunchAgent/SSH）下運行，請在同一個上下文中執行一次互動式指令以觸發提示視窗：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 存取控制和路由

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單項目可以是帳號代碼或聊天目標 (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`)。

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` 控制群組處理方式：

    - `allowlist`（配置時的預設選項）
    - `open`
    - `disabled`

    群組發送者允許清單：`channels.imessage.groupAllowFrom`。

    運行時回退：如果未設定 `groupAllowFrom`，當可用時，iMessage 群組發送者檢查將回退到 `allowFrom`。
    運行時備註：如果 `channels.imessage` 完全缺失，運行時將回退到 `groupPolicy="allowlist"` 並記錄警告（即使設定了 `channels.defaults.groupPolicy`）。

    群組的提及管控：

    - iMessage 沒有原生的提及元數據
    - 提及偵測使用正則表達式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果沒有配置模式，則無法執行提及管控

    來自授權發送者的控制指令可以在群組中繞過提及管控。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私訊 (DMs) 使用直接路由；群組使用群組路由。
    - 使用預設 `session.dmScope=main`，iMessage 私訊會合併至代理程式主工作階段。
    - 群組工作階段是隔離的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回覆使用原始通道/目標元數據路由回 iMessage。

    準群組執行緒行為：

    某些多參與者的 iMessage 執行緒可能帶有 `is_group=false`。
    如果該 `chat_id` 在 `channels.imessage.groups` 下有明確配置，OpenClaw 會將其視為群組流量 (群組閘門 + 群組工作階段隔離)。

  </Tab>
</Tabs>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated bot macOS user (separate iMessage identity)">
    使用專屬的 Apple ID 和 macOS 使用者，讓機器人流量與您的個人訊息設定檔隔離。

    一般流程：

    1. 建立/登入專屬的 macOS 使用者。
    2. 在該使用者中使用機器人的 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝程式，以便 OpenClaw 可以在該使用者環境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在該機器人使用者工作階段中進行 GUI 核准（自動化 + 完全磁碟存取權）。

  </Accordion>

  <Accordion title="透過 Tailscale 連線遠端 Mac（範例）">
    常見拓撲：

    - gateway 執行於 Linux/VM
    - iMessage + `imsg` 執行於您 tailnet 中的 Mac
    - `cliPath` 包裝器使用 SSH 來執行 `imsg`
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

    使用 SSH 金鑰，讓 SSH 和 SCP 都能以非互動方式執行。
    確保主機金鑰先被信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳戶模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行每個帳戶的配置。

    每個帳戶都可以覆寫諸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定和附件根目錄允許清單等欄位。

  </Accordion>
</AccordionGroup>

## 媒體、分塊和傳遞目標

<AccordionGroup>
  <Accordion title="Attachments and media">
    - inbound attachment ingestion is optional: `channels.imessage.includeAttachments`
    - remote attachment paths can be fetched via SCP when `remoteHost` is set
    - attachment paths must match allowed roots:
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (remote SCP mode)
      - default root pattern: `/Users/*/Library/Messages/Attachments`
    - SCP uses strict host-key checking (`StrictHostKeyChecking=yes`)
    - outbound media size uses `channels.imessage.mediaMaxMb` (default 16 MB)
  </Accordion>

<Accordion title="Outbound chunking">
  - text chunk limit: `channels.imessage.textChunkLimit` (預設值 4000) - chunk mode:
  `channels.imessage.chunkMode` - `length` (預設值) - `newline` (paragraph-first splitting)
</Accordion>

  <Accordion title="Addressing formats">
    Preferred explicit targets:

    - `chat_id:123` (recommended for stable routing)
    - `chat_guid:...`
    - `chat_identifier:...`

    Handle targets are also supported:

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 設定寫入

iMessage 預設允許通道發起的配置寫入（當 `commands.config: true` 時針對 `/config set|unset`）。

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
  <Accordion title="imsg not found or RPC unsupported">
    驗證二進位檔案和 RPC 支援：

```bash
imsg rpc --help
openclaw channels status --probe
```

    如果偵測回報不支援 RPC，請更新 `imsg`。

  </Accordion>

  <Accordion title="DMs are ignored">
    檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對核准 (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="群組訊息已被忽略">
    檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 顯式允許行為
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="遠端附件失敗">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從閘道主機進行的 SSH/SCP 金鑰驗證
    - 主機金鑰存在於閘道主機的 `~/.ssh/known_hosts` 中
    - 執行「訊息」的 Mac 上遠端路徑的可讀性

  </Accordion>

  <Accordion title="macOS 權限提示被錯過">
    在相同的用戶/會話上下文中，以互動式 GUI 終端機重新執行並批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    確認已授予執行 OpenClaw/`imsg` 的進程上下文完全磁碟存取權限 + 自動化權限。

  </Accordion>
</AccordionGroup>

## 組態參考指標

- [組態參考 - iMessage](/zh-Hant/gateway/configuration-reference#imessage)
- [閘道組態](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)
- [BlueBubbles](/zh-Hant/channels/bluebubbles)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
