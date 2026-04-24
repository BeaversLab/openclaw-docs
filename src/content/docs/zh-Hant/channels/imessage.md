---
summary: "透過 imsg 支援 iMessage（透過 stdio 進行 JSON-RPC 通訊）。新安裝應使用 BlueBubbles。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage (舊版：imsg)

<Warning>
對於新的 iMessage 部署，請使用 <a href="/zh-Hant/channels/bluebubbles">BlueBubbles</a>。

`imsg` 整合功能已過時，可能會在未來版本中移除。

</Warning>

狀態：舊版的外部 CLI 整合。閘道會產生 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊（無需獨立的 daemon/port）。

<CardGroup cols={3}>
  <Card title="BlueBubbles (recommended)" icon="message-circle" href="/zh-Hant/channels/bluebubbles">
    新設定的首選 iMessage 方案。
  </Card>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    iMessage 私訊預設為配對模式。
  </Card>
  <Card title="組態參考" icon="settings" href="/zh-Hant/gateway/configuration-reference#imessage">
    完整的 iMessage 欄位參考。
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Local Mac (fast path)">
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
      dbPath: "/Users/user/Library/Messages/chat.db",
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

      <Step title="批准首次 DM 配對（預設 dmPolicy）">

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

    如果未設定 `remoteHost`，OpenClaw 將嘗試透過解析 SSH 包裝腳本來自動偵測。
    `remoteHost` 必須是 `host` 或 `user@host`（不得包含空格或 SSH 選項）。
    OpenClaw 會針對 SCP 使用嚴格的主機金鑰檢查，因此轉送主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- 必須在執行 `imsg` 的 Mac 上登入訊息。
- 執行 OpenClaw/`imsg` 的進程上下文需要「完全磁碟存取權限」（存取訊息資料庫）。
- 透過 Messages.app 傳送訊息需要「自動化」權限。

<Tip>
權限是針對每個進程上下文授予的。如果閘道無頭運作（LaunchAgent/SSH），請在相同的上下文中執行一次互動式指令以觸發提示視窗：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單條目可以是 handles 或 chat targets (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`)。

  </Tab>

  <Tab title="群組政策與提及">
    `channels.imessage.groupPolicy` 控制群組處理：

    - `allowlist` (設定時的預設值)
    - `open`
    - `disabled`

    群組發送者允許清單：`channels.imessage.groupAllowFrom`。

    執行時期回退：如果 `groupAllowFrom` 未設定，iMessage 群組發送者檢查會在可用時回退至 `allowFrom`。
    執行時期備註：如果 `channels.imessage` 完全缺失，執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告 (即使已設定 `channels.defaults.groupPolicy`)。

    群組的提及閘控：

    - iMessage 沒有原生的提及元資料
    - 提及偵測使用正規表示式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 如果沒有設定模式，則無法強制執行提及閘控

    來自授權發送者的控制指令可以繞過群組中的提及閘控。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私訊使用直接路由；群組使用群組路由。
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會合併到代理主會話中。
    - 群組會話是隔離的（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回覆會使用原始頻道/目標元數據路由回 iMessage。

    類群組執行緒行為：

    某些多參與者的 iMessage 執行緒可能會帶有 `is_group=false`。
    如果該 `chat_id` 在 `channels.imessage.groups` 下有明確配置，OpenClaw 會將其視為群組流量（群組過濾 + 群組會話隔離）。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 會話。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 之後同一個 iMessage 對話中的訊息會路由到產生的 ACP 連線階段。
- `/new` 和 `/reset` 會就地重置同一個已綁定的 ACP 連線階段。
- `/acp close` 會關閉 ACP 連線階段並移除綁定。

透過頂層 `bindings[]` 項目並包含 `type: "acp"` 和 `match.channel: "imessage"`，可支援設定的持久綁定。

`match.peer.id` 可以使用：

- 正規化的 DM 識別碼，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`（建議用於穩定的群組綁定）
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

範例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解共享 ACP 綁定行為。

## 部署模式

<AccordionGroup>
  <Accordion title="專用機器人 macOS 使用者（獨立的 iMessage 身份）">
    使用專用的 Apple ID 和 macOS 使用者，以便將機器人流量與您的個人訊息設定檔隔離。

    典型流程：

    1. 建立/登入專用的 macOS 使用者。
    2. 使用該使用者的機器人 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝器，以便 OpenClaw 可以在該使用者語境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在那個機器人使用者工作階段中進行 GUI 核准（Automation + 完全磁碟存取權）。

  </Accordion>

  <Accordion title="透過 Tailscale 連線的遠端 Mac (範例)">
    常見的拓樸：

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

    使用 SSH 金鑰，讓 SSH 和 SCP 都是非互動式的。
    確保主機金鑰先被信任 (例如 `ssh bot@mac-mini.tailnet-1234.ts.net`)，這樣 `known_hosts` 才會被填入。

  </Accordion>

  <Accordion title="Multi-account pattern">
    iMessage 支援在 `channels.imessage.accounts` 下進行帳戶特定設定。

    每個帳戶都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定以及附件根目錄允許清單。

  </Accordion>
</AccordionGroup>

## 媒體、分塊與傳送目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 接收附件的擷取是選用的：`channels.imessage.includeAttachments`
    - 當設定 `remoteHost` 時，可以透過 SCP 取得遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本地)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 傳出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)
  </Accordion>

<Accordion title="Outbound chunking">- 文字區塊限制：`channels.imessage.textChunkLimit`（預設為 4000） - 區塊模式：`channels.imessage.chunkMode` - `length`（預設） - `newline`（段落優先分割）</Accordion>

  <Accordion title="Addressing formats">
    首選的明確目標：

    - `chat_id:123`（建議用於穩定的路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支援 Handle 目標：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 設定寫入

iMessage 預設允許通道發起的設定寫入（針對 `/config set|unset` 當 `commands.config: true` 時）。

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

    如果探測回報不支援 RPC，請更新 `imsg`。

  </Accordion>

  <Accordion title="DMs are ignored">
    檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對核准 (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="群組訊息被忽略">
    檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 白名單行為
    - 提及模式配置 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="遠端附件失敗">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從閘道主機進行的 SSH/SCP 金鑰認證
    - 主機金鑰存在於閘道主機的 `~/.ssh/known_hosts` 中
    - 執行訊息 (Messages) 的 Mac 上遠端路徑的可讀性

  </Accordion>

  <Accordion title="macOS 權限提示被錯過">
    在相同的使用者/工作階段內容中，於互動式 GUI 終端機內重新執行並批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    確認執行 OpenClaw/`imsg` 的程序內容已獲得完全磁碟存取權 + 自動化權限。

  </Accordion>
</AccordionGroup>

## 設定參考指引

- [設定參考 - iMessage](/zh-Hant/gateway/configuration-reference#imessage)
- [Gateway 設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)
- [BlueBubbles](/zh-Hant/channels/bluebubbles)

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [配對](/zh-Hant/channels/pairing) — 直接訊息認證和配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為和提及控制
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型和強化防護
