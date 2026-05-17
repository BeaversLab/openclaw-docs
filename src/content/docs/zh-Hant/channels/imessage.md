---
summary: "透過 imsg（透過 stdio 的 JSON-RPC）原生支援 iMessage，並提供用於回覆、點讚、特效、附件和群組管理的私人 API 操作。當主機要求符合時，這是新的 OpenClaw iMessage 設定的首選方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
對於 OpenClaw iMessage 部署，請在已登入的 macOS Messages 主機上使用 `imsg`。如果您的 Gateway 運行在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 指向在 Mac 上執行 `imsg` 的 SSH 包裝程式。

**Gateway 停機期間的追趕功能為選用。** 啟用後 (`channels.imessage.catchup.enabled: true`)，Gateway 會在下次啟動時重播當它離線時 (當機、重啟、Mac 睡眠) 落入 `chat.db` 的傳入訊息。預設為停用 — 請參閱 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。解決了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>已移除 BlueBubbles 支援。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClaw 僅透過 `imsg` 支援 iMessage。請先參閱 [BlueBubbles removal and the imsg iMessage path](/zh-Hant/announcements/bluebubbles-imessage) 以了解簡短公告，或參閱 [Coming from BlueBubbles](/zh-Hant/channels/imessage-from-bluebubbles) 以取得完整的遷移對照表。</Warning>

狀態：原生外部 CLI 整合。Gateway 會生成 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊 (無需獨立的 daemon/port)。進階動作需要 `imsg launch` 以及成功的私人 API 探測。

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
    OpenClaw 僅需要相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個透過 SSH 連線至遠端 Mac 並執行 `imsg` 的包裝腳本。

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

    若未設定 `remoteHost`，OpenClaw 會嘗試透過解析 SSH 包裝腳本來自動偵測它。
    `remoteHost` 必須是 `host` 或 `user@host` (不含空格或 SSH 選項)。
    OpenClaw 針對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄 (`attachmentRoots` / `remoteAttachmentRoots`) 進行驗證。

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- 在執行 `imsg` 的 Mac 上，必須已登入 Messages。
- 執行 OpenClaw/`imsg` 的程序內容需要「完全磁碟存取權限」(Messages DB 存取權)。
- 透過 Messages.app 傳送訊息需要「自動化」權限。
- 若要使用進階操作 (反應 / 編輯 / 取消傳送 / 貼文回覆 / 特效 / 群組操作)，必須停用系統完整性保護 (SIP) — 請參閱下方的[啟用 imsg 私有 API](#enabling-the-imsg-private-api)。基本的文字與媒體傳送/接收功能則不需要停用。

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

- **基本模式** (預設，無需變更 SIP)：透過 `send` 傳送出站文字與媒體、入站監看/紀錄、聊天列表。這是您在全新安裝 `brew install steipete/tap/imsg` 後並加上上述標準 macOS 權限，即可直接獲得的功能。
- **Private API 模式**：`imsg` 會將輔助動態庫注入 `Messages.app` 以呼叫內部 `IMCore` 函數。這就是解鎖 `react`、`edit`、`unsend`、`reply` (串聯)、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及輸入指示器和已讀回條的原因。

若要使用此頻道頁面記錄的進階操作介面，您需要 Private API 模式。`imsg` README 中明確說明了此需求：

> `read`、`typing`、`launch`、橋接支援的富傳送、訊息變更和聊天管理等功能皆為選用。它們需要停用 SIP，並將輔助動態庫注入 `Messages.app`。啟用 SIP 時，`imsg launch` 將拒絕注入。

此輔助注入技術使用 `imsg` 自己的動態庫來存取 Messages 私有 API。在 OpenClaw iMessage 路徑中沒有第三方伺服器或 BlueBubbles 執行環境。

<Warning>
**停用 SIP 是真正的安全權衡。** SIP 是 macOS 防止執行修改過的系統程式碼的核心保護機制之一；全系統關閉它會開啟額外的攻擊面和副作用。值得注意的是，**在 Apple Silicon Mac 上停用 SIP 也會停用在 Mac 上安裝和執行 iOS 應用程式的能力**。

請將此視為經過深思熟慮的操作選擇，而非預設選項。如果您的威脅模型無法容忍 SIP 被關閉，內建的 iMessage 將僅限於基本模式 — 僅限文字和媒體的發送/接收，沒有反應 / 編輯 / 取消傳送 / 效果 / 群組操作。

</Warning>

### 設定

1. 在執行 Messages.app 的 Mac 上 **安裝 (或升級) `imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 輸出會報告 `bridge_version`、`rpc_methods` 和各方法的 `selectors`，讓您在開始前了解目前版本支援的功能。

2. **停用系統完整性保護。** 這會因 macOS 版本而異，因為底層的 Apple 需求取決於作業系統和硬體：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 透過終端機停用 Library Validation，重新啟動進入復原模式，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+ (Big Sur 及更新版本)，Intel：** 復原模式 (或網際網路復原)，`csrutil disable`，重新啟動。
   - **macOS 11+，Apple Silicon：** 使用電源按鈕啟動順序進入復原模式；在最近的 macOS 版本中，按一下「繼續」時按住 **Left Shift** 鍵，然後執行 `csrutil disable`。虛擬機設定遵循不同的流程 — 請先建立 VM 快照。
   - **macOS 26 / Tahoe：** 程式庫驗證政策和 `imagent` 私有授權檢查進一步收緊；`imsg` 可能需要更新的組建以跟上進度。如果在 macOS 主要升級後，`imsg launch` 注入或特定的 `selectors` 開始返回 false，請在假設 SIP 步驟成功之前檢查 `imsg` 的發行說明。

   依照 Apple 為您的 Mac 提供的復原模式流程來停用 SIP，然後再執行 `imsg launch`。

3. **注入輔助程式。** 在 SIP 已停用且 Messages.app 已登入的情況下：

   ```bash
   imsg launch
   ```

   當 SIP 仍啟用時，`imsg launch` 會拒絕注入，因此這也可確認步驟 2 已執行。

4. **從 OpenClaw 驗證橋接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 項目應報告 `works`，並且 `imsg status --json | jq '.selectors'` 應顯示 `retractMessagePart: true` 加上您的 macOS 組建所公開的任何編輯/輸入/已讀選取器。`actions.ts` 中的 OpenClaw 外掛程式按方法閘控僅會廣告其基礎選取器為 `true` 的動作，因此您在代理程式工具清單中看到的動作介面反映了橋接器在此主機上實際能執行的操作。

如果 `openclaw channels status --probe` 將通道報告為 `works`，但特定動作在分派時拋出「iMessage `<action>` 需要 imsg 私有 API 橋接器」，請再次執行 `imsg launch` — 輔助程式可能會失效（Messages.app 重新啟動、OS 更新等），並且快取的 `available: true` 狀態將繼續廣告動作，直到下一次探測重新整理。

### 當您無法停用 SIP 時

如果您的威脅模型無法接受停用 SIP：

- `imsg` 會退回至基本模式 — 僅限文字 + 媒體 + 接收。
- OpenClaw 外掛程式仍會廣告文字/媒體發送和傳入監控；它只是從動作介面中隱藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群組操作（根據按方法能力閘控）。
- 您可以運行一台獨立的非 Apple Silicon Mac（或專用機器人 Mac）並關閉 SIP 以處理 iMessage 工作負載，同時在您的主要設備上保持 SIP 啟用。請參閱下方的 [Dedicated bot macOS user (separate iMessage identity)](#deployment-patterns)。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單條目可以是 handles、靜態發送者存取群組（`accessGroup:<name>``chat_id:*`）或聊天目標（%%PH:INLINE_CODE:198:7f2194b%%、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="群組政策 + 提及">
    `channels.imessage.groupPolicy` 控制群組處理：

    - `allowlist`（設定時的預設值）
    - `open`
    - `disabled`

    群組發送者允許清單：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 條目也可以引用靜態發送者存取群組（`accessGroup:<name>`）。

    執行時期備援：如果 `groupAllowFrom` 未設定，當可用時 iMessage 群組發送者檢查會備援至 `allowFrom`。
    執行時期備註：如果 `channels.imessage` 完全缺失，執行時期會備援至 `groupPolicy="allowlist"` 並記錄警告（即使 `channels.defaults.groupPolicy` 已設定）。

    <Warning>
    群組路由有**兩個**並行運作的允許清單閘門，且兩者都必須通過：

    1. **發送者 / 聊天目標允許清單**（`channels.imessage.groupAllowFrom`）— 控制代碼、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群組註冊表**（`channels.imessage.groups`）— 使用 `groupPolicy: "allowlist"` 時，此閘門需要 `groups: { "*": { ... } }` 萬用字元條目（設定 `allowAll = true`），或 `groups` 下明確的每個 `chat_id` 條目。

    如果閘門 2 中沒有任何內容，每則群組訊息都會被丟棄。外掛程式在預設日誌層級會發出兩個 `warn` 層級的訊號：

    - 啟動時每個帳號一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 執行時期每個 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私訊 (DM) 繼續運作，因為它們採用不同的程式碼路徑。

    在 `groupPolicy: "allowlist"` 下讓群組持續運作的最小設定：

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

    如果這些 `warn` 行出現在閘道日誌中，閘門 2 正在丟棄訊息 — 請新增 `groups` 區塊。
    </Warning>

    群組的提及閘門控制：

    - iMessage 沒有原生的提及中繼資料
    - 提及偵測使用正規表示式模式（`agents.list[].groupChat.mentionPatterns`，備援 `messages.groupChat.mentionPatterns`）
    - 如果沒有設定模式，無法強制執行提及閘門控制

    來自授權發送者的控制指令可以在群組中略過提及閘門。

    每個群組的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每個條目都接受可選的 `systemPrompt` 字串。該值會在每次處理該群組中訊息的回合中注入到代理程式的系統提示詞。解析過程鏡像 `channels.whatsapp.groups` 使用的每個群組提示詞解析：

    1. **特定群組系統提示詞**（`groups["<chat_id>"].systemPrompt`）：當對應中存在特定群組條目**並且**定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串（`""`），則萬用字元被抑制，且不會對該群組套用系統提示詞。
    2. **群組萬用字元系統提示詞**（`groups["*"].systemPrompt`）：當對應中完全缺少特定群組條目，或該條目存在但未定義 `systemPrompt` 鍵時使用。

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

    每個群組的提示詞僅適用於群組訊息 — 此頻道中的私訊不受影響。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私訊使用直接路由；群組使用群組路由。
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會合併到代理主會話中。
    - 群組會話是隔離的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回覆會使用原始頻道/目標中繼資料路由回 iMessage。

    類群組執行緒行為：

    某些多參與者的 iMessage 執行緒可能帶有 `is_group=false`。
    如果該 `chat_id` 在 `channels.imessage.groups` 下有明確設定，OpenClaw 會將其視為群組流量 (群組閘門 + 群組會話隔離)。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 工作階段。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該同一 iMessage 對話中的後續訊息將路由到產生的 ACP 工作階段。
- `/new` 和 `/reset` 會原地重設同一個綁定的 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

透過頂層 `bindings[]` 項目中的 `type: "acp"` 和 `match.channel: "imessage"`，支援已設定的持續性綁定。

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

關於共享 ACP 綁定行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated bot macOS user (separate iMessage identity)">
    使用專屬的 Apple ID 和 macOS 使用者，讓機器人流量與您的個人個人資料分開。

    典型流程：

    1. 建立或登入一個專屬的 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝程式，以便 OpenClaw 可以在該使用者內容中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在該機器人使用者工作階段中進行 GUI 核准 (自動化 + 完全磁碟存取權)。

  </Accordion>

  <Accordion title="透過 Tailscale 連線的遠端 Mac (範例)">
    常見的拓撲結構：

    - gateway 執行於 Linux/VM
    - iMessage + `imsg` 執行於您 tailnet 中的 Mac
    - `cliPath` wrapper 使用 SSH 來執行 `imsg`
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

    使用 SSH 金鑰，讓 SSH 和 SCP 都能以非互動方式運作。
    確保先信任主機金鑰 (例如 `ssh bot@mac-mini.tailnet-1234.ts.net`)，以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳號模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行每個帳號的設定。

    每個帳號都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定，以及附件根目錄允許清單。

  </Accordion>
</AccordionGroup>

## 媒體、分塊和傳遞目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 接收附件的擷取功能 **預設為關閉** — 設定 `channels.imessage.includeAttachments: true` 即可將照片、語音備忘錄、影片和其他附件轉送給 agent。若停用此功能，僅包含附件的 iMessage 將在到達 agent 之前被丟棄，且可能完全不會產生 `Inbound message` 日誌行。
    - 當設定 `remoteHost` 時，可以透過 SCP 擷取遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本機)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 傳出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)

  </Accordion>

  <Accordion title="Outbound chunking">
    - 文字區塊限制：`channels.imessage.textChunkLimit`（預設為 4000）
    - 區塊模式：`channels.imessage.chunkMode`
      - `length`（預設）
      - `newline`（優先以段落分割）

  </Accordion>

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

## 私人 API 動作

當 `imsg launch` 正在運作且 `openclaw channels status --probe` 回報 `privateApi.available: true` 時，訊息工具除了使用一般文字發送外，還可以使用 iMessage 原生操作。

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
  <Accordion title="可用動作">
    - **react**：新增/移除 iMessage 輕拍回應（`messageId`、`emoji`、`remove`）。支援的輕拍回應對應至愛心、喜歡、不喜歡、大笑、強調與疑問。
    - **reply**：傳送串聯回覆給現有訊息（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**：使用 iMessage 特效傳送文字（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**：在支援的 macOS/私人 API 版本上編輯已傳送的訊息（`messageId`、`text` 或 `newText`）。
    - **unsend**：在支援的 macOS/私人 API 版本上收回已傳送的訊息（`messageId`）。
    - **upload-file**：傳送媒體/檔案（`buffer` 為 base64 或已還原的 `media`/`path`/`filePath`、`filename`、選用 `asVoice`）。舊版別名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：當目前目標為群組對話時管理群組聊天。

  </Accordion>

  <Accordion title="訊息 ID">
    入站 iMessage 語境包含簡短的 `MessageSid` 值與完整的訊息 GUID（如果有的話）。簡短 ID 的範圍僅限於最近的記憶體內回覆快取，並在使用前會檢查目前的對話。如果簡短 ID 已過期或屬於其他對話，請使用完整的 `MessageSidFull` 重試。

  </Accordion>

  <Accordion title="Capability detection">
    OpenClaw 只有在緩存的探測狀態顯示橋接器不可用時，才會隱藏私人 API 動作。如果狀態未知，動作會保持可見並延遲發送探測，這樣第一個動作可以在 `imsg launch` 之後成功，而無需額外手動重新整理狀態。

  </Accordion>

  <Accordion title="Read receipts and typing">
    當私人 API 橋接器運作時，已接受的傳入聊天會在發送前標記為已讀，並且在代理程式生成回應時顯示輸入氣泡給寄件者。使用下列方式停用標記已讀功能：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    舊版 `imsg` 組建（早於逐方法功能列表）會靜默地封鎖輸入/已讀功能；OpenClaw 會在每次重啟時記錄一次性警告，以便可歸因於遺失的回條。

  </Accordion>

  <Accordion title="Inbound tapbacks">
    OpenClaw 訂閱 iMessage 輕觸回應 (tapbacks)，並將已接受的回應作為系統事件路由，而不是一般訊息文字，因此使用者的輕觸回應不會觸發一般的回覆迴圈。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"` (預設值)：僅在使用者對機器人傳送的訊息做出反應時通知。
    - `"all"`：對來自已授權寄件者的所有傳入輕觸回應發出通知。
    - `"off"`：忽略傳入的輕觸回應。

    每個帳戶的覆寫使用 `channels.imessage.accounts.<id>.reactionNotifications`。

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

## 合併拆分發送的私訊（指令 + 網址在同一則組成中）

當使用者一起輸入指令和網址時——例如 `Dump https://example.com/article` —— Apple 的訊息 App 會將發送拆分為 **兩個獨立的 `chat.db` 資料列**：

1. 文字訊息 (`"Dump"`)。
2. 網址預覽氣球 (`"https://..."`)，並將 OG 預覽圖片作為附件。

在大多數設定中，這兩列資料抵達 OpenClaw 的時間間隔約為 0.8-2.0 秒。如果沒有合併機制，代理程式會在第 1 輪單獨收到指令並回覆（通常是「傳送網址給我」），然後才在第 2 輪看到網址 —— 此時指令的語境已經遺失。這是 Apple 的傳送管線機制所致，並非 OpenClaw 或 `imsg` 引入的問題。

`channels.imessage.coalesceSameSenderDms` 可將私訊（DM）設定為合併連續相同傳送者的訊息列為單一代理程式輪次。群組聊天則會繼續逐訊息分發，以保留多使用者的輪次結構。

<Tabs>
  <Tab title="啟用時機">
    以下情況請啟用：

    - 您部署的技能預期會在同一則訊息中收到 `command + payload`（例如傾印、貼上、儲存、佇列等）。
    - 您的使用者會在指令旁邊貼上网址、圖片或長內容。
    - 您可以接受額外增加的私訊輪次延遲（見下文）。

    以下情態請保持停用：

    - 您需要對單字私訊觸發器保持最低的指令延遲。
    - 您的所有流程都是單次指令，且無後續內容追蹤。

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

    開啟此旗標且未指定明確的 `messages.inbound.byChannel.imessage` 時，防跳動視窗會擴大至 **2500 毫秒**（舊版預設為 0 毫秒，即無防跳動）。需要擴大視窗是因為 Apple 分拆傳送的 0.8-2.0 秒節奏無法放入較緊的預設值中。

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
  <Tab title="取捨">
    - **增加私訊的延遲。** 開啟此旗標時，每則私訊（包括獨立的控制命令和單一文字的後續訊息）都會等待至去抖動視窗結束後才發送，以防後續有資料列傳入。群組訊息則維持即時發送。
    - **合併輸出有上限。** 合併的文字以 4000 字元為限，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源項目上限為 10 個（超出部分僅保留第一個與最新的）。每個來源 GUID 都會在 `coalescedMessageGuids` 中追蹤，以供下游遙測使用。
    - **僅限私訊。** 群組聊天會改為逐則發送，以確保在多人同時輸入時機器人仍能快速回應。
    - **選用，每個頻道獨立。** 其他頻道（Telegram、WhatsApp、Slack 等）不受影響。舊版 BlueBubbles 設定中設定了 `channels.bluebubbles.coalesceSameSenderDms` 的應將該值遷移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 場景與代理程式所見

| 使用者輸入                                     | `chat.db` 產生    | 旗標關閉（預設）                     | 旗標開啟 + 2500 毫秒視窗                                  |
| ---------------------------------------------- | ----------------- | ------------------------------------ | --------------------------------------------------------- |
| `Dump https://example.com`（單次發送）         | 2 列，間隔約 1 秒 | 兩次代理輪次：先「傾印」，然後是 URL | 一次輪次：合併文字 `Dump https://example.com`             |
| `Save this 📎image.jpg caption`（附件 + 文字） | 2 列              | 兩次輪次（合併時附件被捨棄）         | 一次輪次：文字與圖片皆保留                                |
| `/status`（獨立命令）                          | 1 列              | 即時發送                             | **等待至視窗結束，然後發送**                              |
| 單獨貼上 URL                                   | 1 列              | 即時發送                             | 即時發送（桶中只有一個項目）                              |
| 文字 + URL 故意分為兩則訊息發送，間隔數分鐘    | 2 列，超出視窗    | 兩次輪次                             | 兩次輪次（視窗於期間過期）                                |
| 快速連發（視窗內超過 10 則短私訊）             | N 列              | N 次輪次                             | 一次輪次，輸出受限（保留第一與最新的，套用文字/附件上限） |
| 兩人在群組聊天中輸入                           | M 位傳送者的 N 列 | M+ 次輪次（每個傳送者桶各一次）      | M+ 次輪次 — 群組聊天不合併                                |

## 閘道停機後趕上進度

當閘道離線時（崩潰、重新啟動、Mac 休眠、機器關機），`imsg watch` 會在閘道恢復上線後從目前的 `chat.db` 狀態繼續——預設情況下，間隔期間到達的任何訊息都永遠不會被看見。追趕功能會在下次啟動時重放那些訊息，以免 Agent 靜默地錯過傳入流量。

追趕功能**預設為停用**。請針對每個頻道啟用它：

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

### 運作方式

每次 `monitorIMessageProvider` 啟動時執行一次，順序為 `imsg launch` 就緒 → `watch.subscribe` → `performIMessageCatchup` → 即時分派迴圈。追趕功能本身使用 `chats.list` + 針對每個聊天室的 `messages.history`，透過與 `imsg watch` 相同的 JSON-RPC 用戶端運作。在追趕過程中到達的任何內容都會正常透過即時分派流動；現有的傳入去重快取會吸收與重放資料的任何重疊。

每一筆重放的資料列都會被送入即時分派路徑（`evaluateIMessageInbound` + `dispatchInboundMessage`），因此允許清單、群組原則、去彈跳器、回音快取和已讀回執在重放訊息和即時訊息上的表現完全相同。

### 游標與重試語意

追趕功能會在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 處維護每個帳號的游標（OpenClaw 狀態目錄預設為 `~/.openclaw`，可透過 `OPENCLAW_STATE_DIR` 覆寫）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游標會在每次成功分派時推進，並在資料列分派擲回時保持不變——下次啟動時會從保持的游標重試同一列。
- 當對同一個 `guid` 連續擲回 `maxFailureRetries` 次後，追趕功能會記錄 `warn` 並強制將游標推進過卡住的訊息，以便後續啟動能夠繼續運作。
- 先前已放棄的 guid 在後續執行中會在遇到時跳過（不嘗試分派），並在執行摘要中計入 `skippedGivenUp`。

### 操作員可見的訊號

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

出現 `WARN ... capped to perRunLimit` 行表示單次啟動未處理完所有積壓。如果您的間差距離經常超過預設的 50 列處理量，請提高 `perRunLimit`（最高 500）。

### 何時保持停用

- Gateway 透過看門狗自動重啟持續運行，且間隙總是小於幾秒鐘——預設的關閉狀態即可。
- 私訊量很低，且遺漏的訊息不會改變代理程式的行為——`firstRunLookbackMinutes` 初始視窗可能在首次啟用時發出令人驚訝的舊語境。

當您開啟趕上進度功能時，第一次沒有游標的啟動只會回溯 `firstRunLookbackMinutes`（預設 30 分鐘），而非完整的 `maxAgeMinutes` 視窗——這可避免重播啟用前的長期歷史訊息。

## 疑難排解

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支援 RPC">
    驗證二進位檔案和 RPC 支援：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探測回報不支援 RPC，請更新 `imsg`。如果無法使用私有 API 動作，請在已登入的 macOS 使用者工作階段中執行 `imsg launch` 並再次探測。如果 Gateway 不是在 macOS 上運行，請使用上述的 SSH 遠端 Mac 設定，而不是預設的本機 `imsg` 路徑。

  </Accordion>

  <Accordion title="Gateway 未在 macOS 上運行">
    預設的 `cliPath: "imsg"` 必須在登入 Messages 的 Mac 上運行。在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 設定為一個透過 SSH 連線到該 Mac 並執行 `imsg "$@"` 的包裝腳本。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然後執行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="DMs 被忽略">
    請檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對核准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群組訊息被忽略">
    請檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 許可清單行為
    - 提及模式設定（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="Remote attachments fail">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 來自 Gateway 主機的 SSH/SCP 金鑰認證
    - Gateway 主機上的 `~/.ssh/known_hosts` 中存在主機金鑰
    - 執行 Messages 的 Mac 上對遠端路徑的可讀性

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    在相同的使用者/工作階段內容中以互動式 GUI 終端機重新執行並批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    確認已授予執行 OpenClaw/`imsg` 的程序內容「完全磁碟存取權」+「自動化」。

  </Accordion>
</AccordionGroup>

## 設定參考指引

- [設定參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
- [Gateway 設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [移除 BlueBubbles 與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 公告與遷移摘要
- [從 BlueBubbles 遷移](/zh-Hant/channels/imessage-from-bluebubbles) — 設定對照表與逐步切換指南
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘道
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化措施
