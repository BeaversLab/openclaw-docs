---
summary: "透過 imsg（透過 stdio 的 JSON-RPC）原生支援 iMessage，並提供用於回覆、點讚、特效、附件和群組管理的私人 API 操作。當主機要求符合時，這是新的 OpenClaw iMessage 設定的首選方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
對於 OpenClaw iMessage 部署，請在已登入的 macOS Messages 主機上使用 `imsg`。如果您的 Gateway 執行於 Linux 或 Windows，請將 `channels.imessage.cliPath` 指向一個在 Mac 上執行 `imsg` 的 SSH 包裝器。

**Gateway 停機期間的追趕是選用的。** 啟用後 (`channels.imessage.catchup.enabled: true`)，Gateway 會在下次啟動時重新播放當它離線時（當機、重啟、Mac 進入休眠）抵達 `chat.db` 的訊息。預設為停用 — 請參閱 [Gateway 停機後的追趕](#catching-up-after-gateway-downtime)。解決了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>已移除 BlueBubbles 支援。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClaw 僅透過 `imsg` 支援 iMessage。</Warning>

狀態：原生外部 CLI 整合。Gateway 會產生 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊（無需獨立的 daemon/port）。進階操作需要 `imsg launch` 以及成功的私人 API 探測。

<CardGroup cols={3}>
  <Card title="Private API actions" icon="wand-sparkles" href="#private-api-actions">
    回覆、點讚、特效、附件和群組管理。
  </Card>
  <Card title="Pairing" icon="link" href="/zh-Hant/channels/pairing">
    iMessage 私訊預設為配對模式。
  </Card>
  <Card title="Remote Mac" icon="terminal" href="#remote-mac-over-ssh">
    當 Gateway 未在 Messages Mac 上執行時，請使用 SSH 包裝器。
  </Card>
  <Card title="設定參考" icon="settings" href="/zh-Hant/gateway/config-channels#imessage">
    完整的 iMessage 欄位參考。
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
imsg launch
openclaw channels status --probe
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

      <Step title="啟動 gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次 DM 配對 (預設 dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配對請求在 1 小時後過期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="透過 SSH 連線遠端 Mac">
    OpenClaw 僅需要一個相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個 SSH 到遠端 Mac 並執行 `imsg` 的包裝腳本。

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

    如果未設定 `remoteHost`，OpenClaw 會嘗試透過解析 SSH 包裝腳本來自動偵測它。
    `remoteHost` 必須是 `host` 或 `user@host` (沒有空格或 SSH 選項)。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄 (`attachmentRoots` / `remoteAttachmentRoots`) 進行驗證。

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- 執行 `imsg` 的 Mac 上必須已登入 Messages。
- 執行 OpenClaw/`imsg` 的程序內容需要「完全磁碟存取權限」(存取 Messages 資料庫)。
- 透過 Messages.app 傳送訊息需要「自動化」權限。
- 若要使用進階操作（反應 / 編輯 / 取消傳送 / 貼文回覆 / 效果 / 群組操作），必須停用系統完整性保護（System Integrity Protection）——請參閱下方的[啟用 imsg 私有 API](#enabling-the-imsg-private-api)。基本的文字與媒體傳送/接收則不需要。

<Tip>
權限是依據進程情境授予的。如果閘道以無介面模式執行（LaunchAgent/SSH），請在同一個情境中執行一次互動式指令以觸發權限提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 啟用 imsg 私有 API

`imsg` 提供兩種操作模式：

- **基本模式**（預設，無需變更 SIP）：透過 `send` 傳送出站文字與媒體，以及監看/記錄入站訊息與聊天列表。這是您剛安裝 `brew install steipete/tap/imsg` 並加上上述標準 macOS 權限後，預設即可獲得的功能。
- **私有 API 模式**：`imsg` 會將一個輔助 dylib 注入 `Messages.app`，以呼叫內部的 `IMCore` 函式。這能解鎖 `react`、`edit`、`unsend`、`reply`（貼文回覆）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及輸入指示器和已讀回執。

若要達成本頻道頁面記載的進階操作功能，您需要使用私有 API 模式。`imsg` 的 README 明確指出了這項需求：

> 諸如 `read`、`typing`、`launch`、橋接支援的富內容傳送、訊息變更以及聊天管理等進階功能皆為選用。它們需要停用 SIP，並將一個輔助 dylib 注入 `Messages.app`。當 SIP 啟用時，`imsg launch` 將拒絕進行注入。

這種輔助注入技術使用 `imsg` 自身的 dylib 來存取 Messages 的私有 API。在 OpenClaw iMessage 路徑中，並沒有任何第三方伺服器或 BlueBubbles 執行環境。

<Warning>
**停用 SIP 是真正的安全權衡。** SIP 是 macOS 防止執行修改過的系統程式碼的核心保護機制之一；全系統關閉它會開啟額外的攻擊面和副作用。值得注意的是，**在 Apple Silicon Mac 上停用 SIP 也會停用在 Mac 上安裝和執行 iOS 應用程式的能力**。

請將此視為經過深思熟慮的操作選擇，而非預設選項。如果您的威脅模型無法容忍 SIP 被關閉，內建的 iMessage 將僅限於基本模式 — 僅限文字和媒體的發送/接收，沒有反應 / 編輯 / 取消傳送 / 效果 / 群組操作。

</Warning>

### 設定

1. **在執行 Messages.app 的 Mac 上安裝（或升級）`imsg`：**

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 輸出會報告 `bridge_version`、`rpc_methods` 和每個方法的 `selectors`，以便您在開始之前了解目前組建支援的內容。

2. **停用系統完整性保護。** 這會因 macOS 版本而異，因為底層的 Apple 需求取決於作業系統和硬體：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 透過終端機停用 Library Validation，重新啟動進入復原模式，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+ (Big Sur 及更新版本)，Intel：** 復原模式 (或網際網路復原)，`csrutil disable`，重新啟動。
   - **macOS 11+、Apple Silicon：** 電源按鍵啟動順序進入復原；在最近的 macOS 版本中，按一下「繼續」時按住 **Left Shift** 鍵，然後執行 `csrutil disable`。虛擬機器設定遵循單獨的流程 — 請先擷取 VM 快照。
   - **macOS 26 / Tahoe：** library-validation 政策和 `imagent` private-entitlement 檢查已進一步收緊；`imsg` 可能需要更新的組建才能跟上。如果 `imsg launch` 注入或特定的 `selectors` 在 macOS 主要升級後開始回傳 false，請先檢查 `imsg` 的發行說明，再假設 SIP 步驟已成功。

   在執行 `imsg launch` 之前，請遵循 Apple 的 Mac 復原模式流程來停用 SIP。

3. **注入輔助程式。** 在 SIP 已停用且 Messages.app 已登入的情況下：

   ```bash
   imsg launch
   ```

   `imsg launch` 在 SIP 仍啟用時會拒絕注入，因此這也可以確認步驟 2 已完成。

4. **從 OpenClaw 驗證橋接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 項目應該回報 `works`，而 `imsg status --json | jq '.selectors'` 應顯示 `retractMessagePart: true` 加上您的 macOS 版本所公開的任何編輯 / 輸入 / 已讀選取器。`actions.ts` 中 OpenClaw 外掛程式的每個方法閘道只會宣傳基礎選取器為 `true` 的動作，因此您在代理程式工具清單中看到的動作表面反映了該橋接在此主機上實際能執行的操作。

如果 `openclaw channels status --probe` 將頻道回報為 `works`，但特定動作在分派時拋出「iMessage `<action>` 需要 imsg 私有 API 橋接」，請再次執行 `imsg launch` —— 輔助程式可能會失效（Messages.app 重新啟動、作業系統更新等），而快取的 `available: true` 狀態會繼續宣傳動作，直到下一次探測重新整理。

### 當您無法停用 SIP 時

如果您的威脅模型無法接受停用 SIP：

- `imsg` 會退回至基本模式——僅限文字 + 媒體 + 接收。
- OpenClaw 外掛程式仍然會宣傳文字/媒體發送和入站監控；它只是會根據每個方法的功能閘道，從動作表面中隱藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群組操作。
- 您可以使用另一台非 Apple Silicon 的 Mac（或專用的機器人 Mac）並停用 SIP 來處理 iMessage 工作負載，同時在您的主要裝置上保持 SIP 啟用。請參閱下方的 [專用機器人 macOS 使用者（獨立的 iMessage 身分）](#deployment-patterns)。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing` （預設）
    - `allowlist`
    - `open` （要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允許清單欄位： `channels.imessage.allowFrom`。

    允許清單項目可以是代碼、靜態發送者存取群組（`accessGroup:<name>``chat_id:*`），或聊天目標（%%PH:INLINE_CODE:196:7f2194b%%， `chat_guid:*`， `chat_identifier:*`）。

  </Tab>

  <Tab title="群組政策 + 提及">
    `channels.imessage.groupPolicy` 控制群組處理：

    - `allowlist` (設定時的預設值)
    - `open`
    - `disabled`

    群組發送者允許清單：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 項目也可以參考靜態發送者存取群組 (`accessGroup:<name>`)。

    執行時期後備：如果 `groupAllowFrom` 未設定，iMessage 群組發送者檢查會在可用時回退到 `allowFrom`。
    執行時期備註：如果 `channels.imessage` 完全缺失，執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告 (即使設定了 `channels.defaults.groupPolicy`)。

    <Warning>
    群組路由有 **兩道** 連續執行的允許清單閘門，且兩者都必須通過：

    1. **發送者 / 聊天目標允許清單** (`channels.imessage.groupAllowFrom`) — 代碼、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群組註冊表** (`channels.imessage.groups`) — 在 `groupPolicy: "allowlist"` 模式下，此閘門需要有一個 `groups: { "*": { ... } }` 萬用字元項目 (設定 `allowAll = true`)，或在 `groups` 下有每個 `chat_id` 的明確項目。

    如果閘門 2 中沒有任何內容，每個群組訊息都會被丟棄。外掛程式在預設日誌層級會發出兩個 `warn` 層級的訊號：

    - 啟動時每個帳戶一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 執行時期每個 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    DM (直接訊息) 會繼續運作，因為它們走的是不同的程式碼路徑。

    在 `groupPolicy: "allowlist"` 模式下維持群組運作的最低設定：

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    如果那些 `warn` 行出現在 Gateway 日誌中，表示閘門 2 正在阻擋 — 請新增 `groups` 區塊。
    </Warning>

    群組的提及閘控：

    - iMessage 沒有原生的提及中繼資料
    - 提及偵測使用正規表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 如果沒有設定模式，無法強制執行提及閘控

    來自授權發送者的控制指令可以在群組中繞過提及閘控。

    各群組的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每個項目都接受一個可選的 `systemPrompt` 字串。該值會在每次處理該群組訊息的回合中注入到代理程式的系統提示詞。解析邏輯反映了 `channels.whatsapp.groups` 使用的各群組提示詞解析邏輯：

    1. **特定群組系統提示詞** (`groups["<chat_id>"].systemPrompt`)：當對應中存在特定群組項目 **且** 其 `systemPrompt` 鍵已定義時使用。如果 `systemPrompt` 是空字串 (`""`)，則會抑制萬用字元，且不會對該群組套用系統提示詞。
    2. **群組萬用字元系統提示詞** (`groups["*"].systemPrompt`)：當對應中完全缺少特定群組項目，或項目存在但未定義 `systemPrompt` 鍵時使用。

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    各群組提示詞僅適用於群組訊息 — 此頻道中的直接訊息不受影響。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私訊 (DM) 使用直接路由；群組使用群組路由。
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會合併到代理程式主工作階段中。
    - 群組工作階段是隔離的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回覆會使用原始通道/目標中繼資料路由回 iMessage。

    類群組執行緒行為：

    某些多參與者的 iMessage 執行緒可能會帶有 `is_group=false` 到達。
    如果該 `chat_id` 已在 `channels.imessage.groups` 下明確設定，OpenClaw 會將其視為群組流量 (群組閘道 + 群組工作階段隔離)。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 工作階段。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該同一 iMessage 對話中的後續訊息將路由到產生的 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

透過頂層 `bindings[]` 項目搭配 `type: "acp"` 和 `match.channel: "imessage"`，支援已設定的永久綁定。

`match.peer.id` 可以使用：

- 標準化的私訊代碼，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>` (建議用於穩定的群組綁定)
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

參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解共享 ACP 綁定行為。

## 部署模式

<AccordionGroup>
  <Accordion title="專屬機器人 macOS 使用者（獨立的 iMessage 身份）">
    使用專屬的 Apple ID 和 macOS 使用者，以便將機器人流量與您的個人「訊息」設定檔隔離。

    典型流程：

    1. 建立/登入一個專屬的 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入「訊息」。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝器，以便 OpenClaw 可以在該使用者內容中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在该機器人使用者工作階段中進行 GUI 核准（Automation + 完全磁碟存取權）。

  </Accordion>

  <Accordion title="透過 Tailscale 連線的遠端 Mac（範例）">
    常見拓撲：

    - gateway 在 Linux/VM 上執行
    - iMessage + `imsg` 在您 tailnet 中的 Mac 上執行
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
    確保主機金鑰先受信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳戶模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行每個帳戶的設定。

    每個帳戶都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定和附件根目錄允許清單。

  </Accordion>
</AccordionGroup>

## 媒體、分塊和傳遞目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 連入附件的擷取功能**預設為關閉** — 請設定 `channels.imessage.includeAttachments: true` 以將照片、語音備忘錄、影片和其他附件轉發給 Agent。若停用此功能，僅包含附件的 iMessage 將在到達 Agent 之前被丟棄，且可能完全不會產生 `Inbound message` 日誌行。
    - 當設定 `remoteHost` 時，可以透過 SCP 擷取遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本機)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 連出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)

  </Accordion>

  <Accordion title="連出分塊">
    - 文字分塊限制：`channels.imessage.textChunkLimit` (預設 4000)
    - 分塊模式：`channels.imessage.chunkMode`
      - `length` (預設)
      - `newline` (段落優先分割)

  </Accordion>

  <Accordion title="定址格式">
    建議使用明確目標：

    - `chat_id:123` (建議用於穩定的路由)
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

## 私人 API 動作

當 `imsg launch` 正在執行且 `openclaw channels status --probe` 回報 `privateApi.available: true` 時，訊息工具除了可以發送一般文字外，還可以使用 iMessage 原生動作。

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用操作">
    - **react**：新增/移除 iMessage 點回反應（`messageId`、`emoji`、`remove`）。支援的點回對應到愛心、喜歡、不喜歡、大笑、強調與問號。
    - **reply**：傳送現有訊息的串聯回覆（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**：使用 iMessage 效果傳送文字（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**：在支援的 macOS/私人 API 版本上編輯已傳送訊息（`messageId`、`text` 或 `newText`）。
    - **unsend**：在支援的 macOS/私人 API 版本上收回已傳送訊息（`messageId`）。
    - **upload-file**：傳送媒體/檔案（`buffer` 為 base64 或具體化的 `media`/`path`/`filePath`、`filename`、選用的 `asVoice`）。舊版別名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：當目前目標是群組對話時管理群組聊天。

  </Accordion>

  <Accordion title="訊息 ID">
    傳入的 iMessage 上下文在可用時包含簡短的 `MessageSid` 值與完整的訊息 GUID。簡短 ID 範圍限於近期的記憶體內回覆快取，並在使用前會針對目前聊天進行檢查。如果簡短 ID 已過期或屬於其他聊天，請使用完整的 `MessageSidFull` 重試。

  </Accordion>

  <Accordion title="功能偵測">
    OpenClaw 僅在快取探測狀態顯示橋接器無法使用時，才會隱藏 Private API 動作。如果狀態未知，動作將保持可見並延遲發送探測，以便第一個動作可以在 `imsg launch` 後成功執行，而無需單獨的手動狀態重新整理。

  </Accordion>

  <Accordion title="已讀回執與輸入中">
    當 Private API 橋接器啟動時，接受的傳入聊天會在分發前標記為已讀，並在 Agent 生成時向發送者顯示輸入中的氣泡。使用以下方式停用已讀標記：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    較舊的 `imsg` 版本（早於個別方法功能列表）將靜默封鎖輸入中/已讀功能；OpenClaw 會在每次重新啟動時記錄一次警告，以便追溯遺失的回執。

  </Accordion>
</AccordionGroup>

## 組態寫入

iMessage 預設允許通道發起的組態寫入（針對 `/config set|unset` 當 `commands.config: true` 時）。

停用方式：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合併拆分發送的私人訊息（指令與 URL 在同一則訊息中）

當使用者同時輸入指令和 URL 時——例如 `Dump https://example.com/article` ——Apple 的訊息應用程式會將發送拆分為 **兩個分開的 `chat.db` 資料列**：

1. 文字訊息 (`"Dump"`)。
2. URL 預覽氣泡 (`"https://..."`)，並將 OG 預覽圖片作為附件。

這兩個資料列在大多數設定中會相隔約 0.8-2.0 秒抵達 OpenClaw。如果沒有合併，Agent 會在第 1 輪單獨收到指令並回覆（通常是「傳送 URL 給我」），然後才在第 2 輪看到 URL —— 此時指令語境已經遺失。這是 Apple 的發送管道，並非 OpenClaw 或 `imsg` 引入的問題。

`channels.imessage.coalesceSameSenderDms` 讓私人訊息選擇將連續的相同發送者資料列合併為單一 Agent 輪次。群組聊天繼續依訊息分發，以保留多使用者輪次結構。

<Tabs>
  <Tab title="何時啟用">
    在以下情況啟用：

    - 您發布的技能期望在一則訊息中包含 `command + payload`（傾印、貼上、儲存、佇列等）。
    - 您的使用者會隨指令貼上 URL、圖片或長內容。
    - 您可以接受額外的 DM 輪次延遲（見下文）。

    在以下情況保持停用：

    - 您需要單字 DM 觸發器具有最低指令延遲。
    - 您的所有流程都是一次性指令，且沒有後續的內容追蹤。

  </Tab>
  <Tab title="啟用方式">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    開啟此旗標且未指定明確的 `messages.inbound.byChannel.imessage` 時，去抖動視窗會擴大至 **2500 ms**（舊版預設為 0 ms — 即無去抖動）。需要更寬的視窗，是因為 Apple 分割發送的 0.8-2.0 秒節奏無法納入更緊縮的預設值。

    若要自行調整視窗：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is
            // slow or under memory pressure (observed gap can stretch past 2 s
            // then).
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="權衡">
    - **DM 訊息的延遲增加。** 開啟此旗標後，每則 DM（包括獨立的控制指令和單一文字追蹤）在發送前都會等待至去抖動視窗結束，以防有內容列正在傳入。群組聊天訊息則維持即時發送。
    - **合併輸出有限制。** 合併的文字上限為 4000 個字元，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源條目上限為 10 個（超出部分僅保留第一個與最新的）。每個來源 GUID 都會在 `coalescedMessageGuids` 中追蹤，以便進行下游遙測。
    - **僅限 DM。** 群組聊天會回退到逐訊息發送，以便在多人同時輸入時保持機器人的回應速度。
    - **選用，每個通道獨立。** 其他通道（Telegram、WhatsApp、Slack 等）不受影響。設定 `channels.bluebubbles.coalesceSameSenderDms` 的舊版 BlueBubbles 設定應將該值遷移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 場景與代理程式所見內容

| 使用者編輯                                        | `chat.db` 產生         | 旗標關閉（預設）                                 | 旗標開啟 + 2500 ms 視窗                                    |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `Dump https://example.com`（一次發送）            | 2 列，間隔約 1 秒      | 兩次代理程式輪次：先單獨出現「Dump」，然後是 URL | 一次輪次：合併文字 `Dump https://example.com`              |
| `Save this 📎image.jpg caption`（附件 + 文字）    | 2 列                   | 兩次輪詢（合併時丟棄附件）                       | 一次輪詢：保留文字 + 圖片                                  |
| `/status`（獨立指令）                             | 1 行                   | 立即發送                                         | **等待至視窗期結束，然後發送**                             |
| 單獨貼上 URL                                      | 1 行                   | 立即發送                                         | 立即發送（桶中只有一個條目）                               |
| 文字 + URL 作為兩條刻意分開的訊息發送，間隔數分鐘 | 視窗外的 2 行          | 兩次輪詢                                         | 兩次輪詢（視窗期在它們之間過期）                           |
| 快速湧入（視窗內超過 10 條小型 DM）               | N 行                   | N 次輪詢                                         | 一次輪詢，有界輸出（第一個 + 最新一個，套用文字/附件上限） |
| 兩個人在群組聊天中輸入                            | 來自 M 個發送者的 N 行 | M+ 次輪詢（每個發送者桶一次）                    | M+ 次輪詢 — 群組聊天不會合併                               |

## 在閘道停機後趕上進度

當閘道離線（崩潰、重啟、Mac 休眠、機器關機）時，`imsg watch` 會在閘道恢復上線後從目前的 `chat.db` 狀態繼續 — 預設情況下，間隔期間抵達的任何內容都不會被看見。Catchup 會在下次啟動時重播那些訊息，以免代理程式無聲地錯過傳入流量。

Catchup 預設為**停用**。請針對每個頻道啟用它：

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // master switch (default: false)
      maxAgeMinutes: 120,        // skip rows older than now - 2h (default: 120, clamp 1..720)
      perRunLimit: 50,           // max rows replayed per startup (default: 50, clamp 1..500)
      firstRunLookbackMinutes: 30, // first run with no cursor: look back 30 min (default: 30)
      maxFailureRetries: 10,     // give up on a wedged guid after 10 dispatch failures (default: 10)
    },
  },
}
```

### 執行方式

每次 `monitorIMessageProvider` 啟動執行一次，順序為 `imsg launch` 就緒 → `watch.subscribe` → `performIMessageCatchup` → 即時發送迴圈。Catchup 本身會針對與 `imsg watch` 使用的相同 JSON-RPC 用戶端，使用 `chats.list` + 逐聊天的 `messages.history`。在 catchup 過程中抵達的任何內容都會正常透過即時發送流動；現有的傳入去重快取會吸收與重播資料列的任何重疊。

每個重播的資料列都會透過即時發送路徑（`evaluateIMessageInbound` + `dispatchInboundMessage`）輸送，因此允許清單、群組原則、防抖動器、回聲快取和已讀回執在重播訊息和即時訊息上的行為完全相同。

### 游標和重試語意

Catchup 會在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 處維護每個帳號的游標（OpenClaw 狀態目錄預設為 `~/.openclaw`，可透過 `OPENCLAW_STATE_DIR` 覆寫）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游標會在每次成功分派後向前推進，並在某一行的分派拋出錯誤時保持不變 —— 下次啟動時會從保持的游標位置重試同一行。
- 在對同一個 `guid` 連續拋出 `maxFailureRetries` 次錯誤後，補錯會記錄 `warn` 並強制將游標推進到卡住的消息之後，以便後續啟動能夠繼續進行。
- 在後續運行中，已經放棄的 guid 會被跳過（不嘗試分派），並在運行摘要中計入 `skippedGivenUp`。

### 操作員可見的訊號

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行表示單次啟動未能清空全部積壓。如果您的缺口經常超過預設的 50 行批次，請提高 `perRunLimit`（最高 500）。

### 何時保持關閉

- Gateway 持續運行並配有看門狗自動重啟，且間隙總是小於幾秒鐘 —— 預設的關閉狀態即可。
- DM 音量很低，且遺漏的消息不會改變代理的行為 —— `firstRunLookbackMinutes` 初始視窗可能會在首次啟用時分派令人驚訝的舊語境。

當您開啟補錯功能時，沒有游標的首次啟動只會回溯 `firstRunLookbackMinutes`（預設 30 分鐘），而不是完整的 `maxAgeMinutes` 視窗 —— 這可以避免重播啟用前的漫長歷史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支援 RPC">
    驗證二進位檔案和 RPC 支援：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探測回報不支援 RPC，請更新 `imsg`。如果私人 API 操作無法使用，請在已登入的 macOS 使用者階段中執行 `imsg launch` 並再次探測。如果 Gateway 不是在 macOS 上執行，請改用上述的 SSH 遠端 Mac 設定，而不是預設的本機 `imsg` 路徑。

  </Accordion>

  <Accordion title="Gateway is not running on macOS">
    預設的 `cliPath: "imsg"` 必須在已登入訊息 App 的 Mac 上執行。在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 設定為一個透過 SSH 連線至該 Mac 並執行 `imsg "$@"` 的包裝腳本。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然後執行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="DMs are ignored">
    請檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對核准 (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Group messages are ignored">
    請檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 許可清單 行為
    - 提及 模式設定 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    請檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從 Gateway 主機進行的 SSH/SCP 金鑰驗證
    - Gateway 主機的 `~/.ssh/known_hosts` 中是否存在主機金鑰
    - 執行訊息 App 的 Mac 上的遠端路徑讀取權限

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    請在相同的使用者/工作階段 語境下，於互動式 GUI 終端機中重新執行並核准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    確認執行 OpenClaw/`imsg` 的程序語境已獲得「完全磁碟存取權」+「自動化」權限。

  </Accordion>
</AccordionGroup>

## 設定參考指引

- [設定參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
- [Gateway 設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)

## 相關連結

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [從 BlueBubbles 轉移](/zh-Hant/channels/imessage-from-bluebubbles) — 設定對照表與逐步遷移指南
- [配對](/zh-Hant/channels/pairing) — DM 驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘道
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
