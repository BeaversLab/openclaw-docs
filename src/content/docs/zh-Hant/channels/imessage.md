---
summary: "透過 imsg（透過 stdio 的 JSON-RPC）原生支援 iMessage，並提供用於回覆、點讚、特效、附件和群組管理的私人 API 操作。當主機要求符合時，這是新的 OpenClaw iMessage 設定的首選方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
對於 OpenClaw iMessage 部署，請在已登入的 macOS Messages 主機上使用 `imsg`。如果您的 Gateway 執行在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 指向在 Mac 上執行 `imsg` 的 SSH 包裝器。

**Gateway 停機期間的追趕功能為選用。** 啟用後 (`channels.imessage.catchup.enabled: true`)，Gateway 會在下次啟動時重播當其離線（當機、重啟、Mac 休眠）時送達 `chat.db` 的訊息。預設為停用 — 請參閱 [Gateway 停機後的追趕](#catching-up-after-gateway-downtime)。修復了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支援已移除。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClow 僅透過 `imsg` 支援 iMessage。請先參閱 [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) 以了解簡短公告，或參閱 [從 BlueBubbles 轉移過來](/zh-Hant/channels/imessage-from-bluebubbles) 以查看完整的遷移對照表。</Warning>

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

  <Tab title="Remote Mac over SSH">
    OpenClaw 只需要相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個 SSH 連線到遠端 Mac 並執行 `imsg` 的包裝腳本。

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
    `remoteHost` 必須是 `host` 或 `user@host`（沒有空格或 SSH 選項）。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

<Warning>
任何您放在 `imsg` 前面的 `cliPath` 包裝腳本或 SSH 代理程式，其行為必須像一個用於長期 JSON-RPC 的透明 stdio 管道。OpenClaw 在通道的生命週期內，透過包裝腳本的 stdin/stdout 交換以換行符分隔的小型 JSON-RPC 訊息：

- 在位元組可用時**立即**轉發每個 stdin 區塊/行——不要等待 EOF。
- 及時反向轉發每個 stdout 區塊/行。
- 保留換行符。
- 避免可能導致小型框架無法讀取的固定大小阻塞性讀取（`read(4096)`、`cat | buffer`、預設 shell `read`）。
- 將 stderr 與 JSON-RPC stdout 資料流分開。

一個將 stdin 緩衝直到填滿大型區塊的包裝腳本，會導致看起來像 iMessage 故障的症狀——`imsg rpc timeout (chats.list)` 或重複的通道重新啟動——即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`（上述）是安全的，因為它會轉發 OpenClaw 的 `cliPath` 參數，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 這樣的管道則不行——行緩衝工具仍然可能保留框架；如果您必須進行過濾，請在每個階段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- Mac 上的 Messages 必須登入，並正在執行 `imsg`。
- 執行 OpenClaw/`imsg` 的程序上下文需要「完全磁碟存取權限」（用於存取 Messages 資料庫）。
- 透過 Messages.app 傳送訊息需要「自動化」權限。
- 若要使用進階動作（反應 / 編輯 / 取消傳送 / 視訊回覆 / 效果 / 群組操作），必須停用系統完整性保護 (SIP) —— 請參閱下方的[啟用 imsg 私有 API](#enabling-the-imsg-private-api)。基本的文字與媒體傳送/接收不需要停用 SIP 也能運作。

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

- **基本模式**（預設，無需更改 SIP）：透過 `send` 傳送外寄文字與媒體、監看/接收傳入訊息、讀取歷史紀錄與聊天清單。這是您在全新安裝 `brew install steipete/tap/imsg` 並加上上述標準 macOS 權限後，開箱即得的體驗。
- **私有 API 模式**：`imsg` 將一個輔助 dylib 注入 `Messages.app` 以呼叫內部 `IMCore` 函式。這能解鎖 `react`、`edit`、`unsend`、`reply`（視訊回覆）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及輸入指示器和已讀回執。

若要達成本頻道文件所述的進階操作功能，您需要使用私有 API 模式。`imsg` README 中明確說明了此需求：

> 諸如 `read`、`typing`、`launch`、橋接支援的豐富傳送、訊息變更與聊天管理等進階功能皆為選用。這些功能需要停用 SIP，並將一個輔助 dylib 注入 `Messages.app`。`imsg launch` 會在 SIP 啟用時拒絕注入。

此輔助注入技術使用 `imsg` 自身的 dylib 來存取 Messages 私有 API。在 OpenClaw iMessage 路徑中，並不包含第三方伺服器或 BlueBubbles 執行環境。

<Warning>
**停用 SIP 是真正的安全權衡。** SIP 是 macOS 防止執行修改過的系統程式碼的核心保護機制之一；全系統關閉它會開啟額外的攻擊面和副作用。值得注意的是，**在 Apple Silicon Mac 上停用 SIP 也會停用在 Mac 上安裝和執行 iOS 應用程式的能力**。

請將此視為經過深思熟慮的操作選擇，而非預設選項。如果您的威脅模型無法容忍 SIP 被關閉，內建的 iMessage 將僅限於基本模式 — 僅限文字和媒體的發送/接收，沒有反應 / 編輯 / 取消傳送 / 效果 / 群組操作。

</Warning>

### 設定

1. 在執行 Messages.app 的 Mac 上**安裝（或升級） `imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 輸出會報告 `bridge_version`、`rpc_methods` 以及每個方法的 `selectors`，因此您可以在開始之前查看目前版本支援的功能。

2. **停用系統完整性保護。** 這會因 macOS 版本而異，因為底層的 Apple 需求取決於作業系統和硬體：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 透過終端機停用 Library Validation，重新啟動進入復原模式，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+ (Big Sur 及更新版本)，Intel：** 進入復原模式 (或網際網路復原)，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+，Apple Silicon：** 使用電源按鍵啟動順序進入復原模式；在最近的 macOS 版本中，當您點擊「繼續」時按住 **左 Shift** 鍵，然後執行 `csrutil disable`。虛擬機器設定遵循不同的流程 — 請先擷取虛擬機器快照。
   - **macOS 26 / Tahoe：** 庫驗證 原則和 `imagent` 私有權限 檢查進一步收緊；`imsg` 可能需要更新版本才能跟上。如果在 macOS 主要升級後，`imsg launch` 插入或特定的 `selectors` 開始返回 false，請在假設 SIP 步驟成功之前，先查看 `imsg` 的發行說明。

   在執行 `imsg launch` 之前，請遵循 Apple 的復原模式流程來停用 SIP。

3. **注入輔助程式。** 在 SIP 已停用且 Messages.app 已登入的情況下：

   ```bash
   imsg launch
   ```

   當 SIP 仍啟用時，`imsg launch` 會拒絕插入，因此這也可以作為步驟 2 已完成的確認。

4. **從 OpenClaw 驗證橋接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 項目應報告 `works`，而 `imsg status --json | jq '.selectors'` 應顯示 `retractMessagePart: true` 加上您的 macOS 版本公開的任何 編輯 / 輸入 / 已讀 選擇器。`actions.ts` 中的 OpenClaw 外掛程式每個方法閘道只會宣傳基礎選擇器為 `true` 的動作，因此您在代理程式工具清單中看到的動作表面反映了橋接器在此主機上實際能執行的操作。

如果 `openclaw channels status --probe` 報告通道狀態為 `works`，但特定動作在調度時拋出「iMessage `<action>` 需要 imsg 私有 API 橋接」錯誤，請再次執行 `imsg launch` — 輔助程式可能會失效（Messages.app 重啟、作業系統更新等），而快取的 `available: true` 狀態會繼續公告動作，直到下次探測重新整理。

### 當您無法停用 SIP 時

如果您的威脅模型無法接受停用 SIP：

- `imsg` 會回退到基本模式 — 僅限文字 + 媒體 + 接收。
- OpenClaw 外掛程式仍然公告文字/媒體發送和入站監控；它只是從動作介面隱藏了 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群組操作（根據每個方法的能力限制）。
- 您可以在另一台非 Apple Silicon Mac（或專用的機器人 Mac）上關閉 SIP 以執行 iMessage 工作負載，同時在您的主要裝置上保持啟用 SIP。請參閱下方的 [專用機器人 macOS 使用者（獨立的 iMessage 身份）](#deployment-patterns)。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單項目必須識別發送者：代碼 或靜態發送者存取群組（`accessGroup:<name>`）。對於 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 等聊天目標使用 `channels.imessage.groupAllowFrom`；對於數字 `chat_id` 登錄金鑰使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="群組原則 + 提及">
    `channels.imessage.groupPolicy` 控制群組處理：

    - `allowlist`（設定時的預設值）
    - `open`
    - `disabled`

    群組發送者白名單：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 項目也可以參照靜態發送者存取群組（`accessGroup:<name>`）。

    執行時期回退：如果未設定 `groupAllowFrom`，iMessage 群組發送者檢查會使用 `allowFrom`；當私訊和群組准入應不同時，請設定 `groupAllowFrom`。
    執行時期備註：如果完全缺少 `channels.imessage`，執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    <Warning>
    群組路由有**兩道**串聯運行的白名單閘門，且兩者都必須通過：

    1. **發送者 / 聊天目標白名單**（`channels.imessage.groupAllowFrom`）— 代號、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群組註冊表**（`channels.imessage.groups`）— 在 `groupPolicy: "allowlist"` 下，此閘門需要一個 `groups: { "*": { ... } }` 萬用字元項目（設定 `allowAll = true`），或是在 `groups` 下的明確每個 `chat_id` 項目。

    如果閘門 2 中沒有任何內容，所有群組訊息都會被丟棄。外掛程式在預設日誌層級發出兩個 `warn` 層級的訊號：

    - 啟動時每個帳號一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 執行時期每個 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私訊繼續運作，因為它們採用不同的程式碼路徑。

    在 `groupPolicy: "allowlist"` 下保持群組運作的最小設定：

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

    如果這些 `warn` 行出現於閘道日誌中，表示閘門 2 正在丟棄訊息 — 請新增 `groups` 區塊。
    </Warning>

    群組的提及閘控：

    - iMessage 沒有原生的提及中繼資料
    - 提及偵測使用正規表示式模式（`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`）
    - 如果沒有設定模式，則無法強制執行提及閘控

    來自授權發送者的控制指令可以在群組中繞過提及閘控。

    每個群組的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每個項目接受一個選用的 `systemPrompt` 字串。該值會在每次處理該群組中訊息的回合中注入到代理程式的系統提示詞。解析過程反映了 `channels.whatsapp.groups` 使用的每個群組提示詞解析：

    1. **特定群組的系統提示詞**（`groups["<chat_id>"].systemPrompt`）：當對應圖中存在特定群組項目**並且**定義了其 `systemPrompt` 金鑰時使用。如果 `systemPrompt` 是空字串（`""`），萬用字元會被抑制，且不會將系統提示詞套用至該群組。
    2. **群組萬用字元系統提示詞**（`groups["*"].systemPrompt`）：當對應圖中完全缺少特定群組項目時，或是項目存在但未定義 `systemPrompt` 金鑰時使用。

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
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會合併到代理的主工作階段中。
    - 群組工作階段是隔離的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回覆會使用原始頻道/目標中繼資料路由回 iMessage。

    類群組的執行緒行為：

    某些多參與者的 iMessage 執行緒可能會帶有 `is_group=false` 到達。
    如果該 `chat_id` 在 `channels.imessage.groups` 下被明確設定，OpenClaw 會將其視為群組流量 (群組閘門 + 群組工作階段隔離)。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 工作階段。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該同一 iMessage 對話中的後續訊息將路由到產生的 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設相同的綁定 ACP 工作階段。
- `/acp close` 會關閉 ACP 工作階段並移除綁定。

透過頂層 `bindings[]` 項目中的 `type: "acp"` 和 `match.channel: "imessage"`，支援設定的持久化綁定。

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
    使用專屬的 Apple ID 和 macOS 使用者，以便將機器人流量與您的個人「訊息」設定檔隔離。

    典型流程：

    1. 建立/登入專屬的 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入「訊息」。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝器，以便 OpenClaw 可以在該使用者環境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在該機器人使用者工作階段中進行 GUI 核准 (自動化 + 完全磁碟存取權)。

  </Accordion>

  <Accordion title="透過 Tailscale 連接遠端 Mac（範例）">
    常見拓撲結構：

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
    請確保主機金鑰已先被信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳號模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行每個帳號的設定。

    每個帳號都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定以及附件根目錄允許清單。

  </Accordion>
</AccordionGroup>

## 媒體、分塊和傳遞目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 接收附件的功能**預設為關閉** — 設定 `channels.imessage.includeAttachments: true` 以將照片、語音備忘錄、影片和其他附件轉送給 agent。若停用此功能，僅包含附件的 iMessage 訊息會在到達 agent 之前被丟棄，且可能完全不會產生 `Inbound message` 日誌行。
    - 當設定 `remoteHost` 時，可以透過 SCP 擷取遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本機)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 傳出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)

  </Accordion>

  <Accordion title="Outbound chunking">
    - 文字區塊限制：`channels.imessage.textChunkLimit` (預設 4000)
    - 區塊模式：`channels.imessage.chunkMode`
      - `length` (預設)
      - `newline` (優先按段落分割)

  </Accordion>

  <Accordion title="Addressing formats">
    偏好的明確目標：

    - `chat_id:123` (建議用於穩定路由)
    - `chat_guid:...`
    - `chat_identifier:...`

    也支援帳號目標：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## 私人 API 動作

當 `imsg launch` 正在運作且 `openclaw channels status --probe` 回報 `privateApi.available: true` 時，訊息工具除了正常的文字傳送外，還可以使用 iMessage 原生操作。

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
  <Accordion title="Available actions">
    - **react**：新增/移除 iMessage 點回（`messageId`、`emoji`、`remove`）。支援的點回對應至愛心、按讚、不喜歡、大笑、強調與問號。
    - **reply**：傳送串聯回覆給現有訊息（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**：傳送帶有 iMessage 特效的文字（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**：在支援的 macOS/私用 API 版本上編輯已傳送的訊息（`messageId`、`text` 或 `newText`）。
    - **unsend**：在支援的 macOS/私用 API 版本上收回已傳送的訊息（`messageId`）。
    - **upload-file**：傳送媒體/檔案（`buffer` 為 base64 或已注水的 `media`/`path`/`filePath`、`filename`，選用 `asVoice`）。舊版別名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：當目前目標是群組對話時管理群組聊天。

  </Accordion>

  <Accordion title="Message IDs">
    入站 iMessage 上下文在可用時包含簡短的 `MessageSid` 值與完整的訊息 GUID。簡短 ID 的範圍限定於最近的記憶體內回覆快取，並在使用前會對目前的聊天進行檢查。如果簡短 ID 已過期或屬於其他聊天，請使用完整的 `MessageSidFull` 重試。

  </Accordion>

  <Accordion title="功能偵測">
    只有當緩存的探測狀態顯示橋接器不可用時，OpenClow 才會隱藏私有 API 操作。如果狀態未知，操作將保持可見並延遲發送探測，以便在 `imsg launch` 之後的第一個操作能夠成功，而無需單獨的手動狀態重新整理。

  </Accordion>

  <Accordion title="已讀回執與輸入狀態">
    當私有 API 橋接器正常運作時，接受的傳入聊天會在分派前標記為已讀，並且在代理程式產生回應時向發送者顯示輸入氣泡。使用以下方式停用已讀標記：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    較舊的 `imsg` 版本（早於逐方法功能列表）將會靜默地封鎖輸入/已讀功能；OpenClow 會在每次重新啟動時記錄一次警告，以便追溯缺失的回執。

  </Accordion>

  <Accordion title="傳入點讚">
    OpenClow 訂閱 iMessage 點讚，並將接受的回應作為系統事件而非一般訊息文字進行路由，因此使用者的點讚不會觸發普通的回應循環。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（預設）：僅在使用者對由機器人發送的訊息做出反應時通知。
    - `"all"`：對來自已授權發送者的所有傳入點讚進行通知。
    - `"off"`：忽略傳入點讚。

    每個帳戶的覆寫設定使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>
</AccordionGroup>

## 組態寫入

iMessage 預設允許通道發起的設定寫入（當 `commands.config: true` 時用於 `/config set|unset`）。

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

當使用者同時輸入指令和 URL 時 — 例如 `Dump https://example.com/article` — Apple 的訊息 應用程式會將發送拆分為 **兩個獨立的 `chat.db` 資料列**：

1. 一則文字訊息 (`"Dump"`)。
2. 一個 URL 預覽氣球 (`"https://..."`)，並將 OG 預覽圖片作為附件。

這兩行資料在大多數設定中會相隔約 0.8-2.0 秒到達 OpenClaw。如果沒有合併，Agent 會在第一輪單獨收到指令，做出回覆（通常是「傳送網址給我」），然後直到第二輪才看到網址——此時指令的語境已經遺失。這是 Apple 的傳送管線特性，並非 OpenClaw 或 `imsg` 引入的問題。

`channels.imessage.coalesceSameSenderDms` 選項可讓私訊（DM）將連續的相同發送者行合併為單一 Agent 輪次。群組聊天則會繼續逐則訊息分發，以保留多使用者的輪次結構。

<Tabs>
  <Tab title="何時啟用">
    在以下情況啟用：

    - 您部署的技能期望在同一則訊息中收到 `command + payload`（例如：傾印、貼上、儲存、佇列等）。
    - 您的使用者會在指令旁貼上网址、圖片或長內容。
    - 您可以接受增加的私訊輪次延遲（見下文）。

    在以下情況保持停用：

    - 您需要針對單字私訊觸發指令實現最低延遲。
    - 您所有的流程都是單次指令，沒有後續的資料負載。

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

    開啟此旗標且未明確設定 `messages.inbound.byChannel.imessage` 時，防抖視窗會擴大至 **2500 毫秒**（舊版預設為 0 毫秒——即不進行防抖）。需要更寬的視窗是因為 Apple 的分拆傳送節奏（0.8-2.0 秒）無法納入更緊縮的預設值中。

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
  <Tab title="Trade-offs">
    - **為 DM 訊息增加延遲。** 開啟此旗標後，每個 DM（包括獨立的控制指令和單純的文字後續）在發送前都會等待去抖動視窗，以防還有負載行正在傳入。群組聊天訊息則保持即時發送。
    - **合併輸出有限制。** 合併的文字上限為 4000 個字元，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源條目上限為 10 個（超出部分僅保留第一個與最新的）。每個來源 GUID 都會在 `coalescedMessageGuids` 中追蹤，以供下游遙測使用。
    - **僅限 DM。** 群組聊天會回退到逐訊息發送模式，以確保多人同時輸入時機器人仍能保持回應。
    - **每個頻道可選擇加入。** 其他頻道（Telegram、WhatsApp、Slack 等）不受影響。設定 `channels.bluebubbles.coalesceSameSenderDms` 的舊版 BlueBubbles 設定應將該值遷移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 場景與代理程式所見

| 使用者輸入                                     | `chat.db` 產生    | 旗標關閉（預設）                     | 旗標開啟 + 2500 毫秒視窗                                  |
| ---------------------------------------------- | ----------------- | ------------------------------------ | --------------------------------------------------------- |
| `Dump https://example.com`（一次發送）         | 2 列，間隔約 1 秒 | 兩次代理輪次：先「傾印」，然後是 URL | 一輪：合併文字 `Dump https://example.com`                 |
| `Save this 📎image.jpg caption`（附件 + 文字） | 2 列              | 兩次輪次（合併時附件被捨棄）         | 一次輪次：文字與圖片皆保留                                |
| `/status`（獨立指令）                          | 1 列              | 即時發送                             | **等待至視窗結束，然後發送**                              |
| 單獨貼上 URL                                   | 1 列              | 即時發送                             | 即時發送（桶中只有一個項目）                              |
| 文字 + URL 故意分為兩則訊息發送，間隔數分鐘    | 2 列，超出視窗    | 兩次輪次                             | 兩次輪次（視窗於期間過期）                                |
| 快速連發（視窗內超過 10 則短私訊）             | N 列              | N 次輪次                             | 一次輪次，輸出受限（保留第一與最新的，套用文字/附件上限） |
| 兩人在群組聊天中輸入                           | M 位傳送者的 N 列 | M+ 次輪次（每個傳送者桶各一次）      | M+ 次輪次 — 群組聊天不合併                                |

## 閘道停機後趕上進度

當閘道離線時（當機、重啟、Mac 睡眠、機器關機），`imsg watch` 會在閘道恢復上線後從目前的 `chat.db` 狀態繼續執行 — 預設情況下，間隔期間到達的任何訊息都不會被看到。補救機制會在下次啟動時重播這些訊息，以免代理無聲無息地錯過傳入流量。

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

每次 `monitorIMessageProvider` 啟動時執行一次，順序為 `imsg launch` 就緒 → `watch.subscribe` → `performIMessageCatchup` → 即時發送迴圈。補救機制本身會使用 `chats.list` 加上每個聊天室的 `messages.history`，透過與 `imsg watch` 相同的 JSON-RPC 用戶端運作。在補救期間到達的任何訊息會正常透過即時發送流程傳遞；現有的傳入去重快取會吸收與重播列的任何重疊。

每個重放的列都會通過即時分發路徑（`evaluateIMessageInbound` + `dispatchInboundMessage`）進行處理，因此允許清單、群組原則、去抖動器、回顯快取和已讀回執在重放訊息和即時訊息上的行為完全一致。

### 游標與重試語意

Catchup 會在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 維護一個每個帳戶的游標（OpenClaw 狀態目錄預設為 `~/.openclaw`，可透過 `OPENCLAW_STATE_DIR` 覆寫）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游標會在每次成功分派時推進，並在資料列分派擲回時保持不變——下次啟動時會從保持的游標重試同一列。
- 在對同一個 `guid` 連續拋出 `maxFailureRetries` 次錯誤後，catchup 會記錄一條 `warn` 並強制將游標推進到卡住的訊息之後，以便後續啟動能夠繼續進行。
- 已放棄的 guid 在後續運行中會被直接跳過（不嘗試分發），並計入運行摘要中的 `skippedGivenUp`。

### 操作員可見的訊號

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行表示單次啟動未耗盡全部積壓。如果您的間隙經常超過預設的 50 行處理，請提高 `perRunLimit`（最高 500）。

### 何時保持停用

- Gateway 透過看門狗自動重啟持續運行，且間隙總是小於幾秒鐘——預設的關閉狀態即可。
- 私訊量很低，且錯過的訊息不會改變代理程式的行為 —— `firstRunLookbackMinutes` 初始視窗可能會在首次啟用時分發令人驚訝的舊上下文。

當您開啟 catchup 時，第一次沒有游標的啟動只會回溯 `firstRunLookbackMinutes`（預設 30 分鐘），而不是完整的 `maxAgeMinutes` 視窗 —— 這避免了重放啟用前的長時間歷史訊息。

## 疑難排解

<AccordionGroup>
  <Accordion title="imsg not found or RPC unsupported">
    驗證二進制檔案和 RPC 支援：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探測報告 RPC 不支援，請更新 `imsg`。如果私有 API 操作不可用，請在登入的 macOS 使用者會話中執行 `imsg launch` 並再次探測。如果 Gateway 未在 macOS 上執行，請使用上述的 SSH 遠端 Mac 設定，而不是預設的本機 `imsg` 路徑。

  </Accordion>

  <Accordion title="Gateway is not running on macOS">
    預設的 `cliPath: "imsg"` 必須在登入 Messages 的 Mac 上執行。在 Linux 或 Windows 上，將 `channels.imessage.cliPath` 設定為 SSH 到該 Mac 並執行 `imsg "$@"` 的包裝腳本。

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
    檢查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配對核准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="Group messages are ignored">
    檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 允許清單行為
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="Remote attachments fail">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從 Gateway 主機進行的 SSH/SCP 金鑰驗證
    - 主機金鑰存在於 Gateway 主機的 `~/.ssh/known_hosts` 中
    - 執行 Messages 的 Mac 上遠端路徑的可讀性

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    在相同的使用者/工作階段內容中，於互動式 GUI 終端機重新執行並核准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    確認執行 OpenClaw/`imsg` 的程序內容已獲得「完全磁碟存取權」+「自動化」權限。

  </Accordion>
</AccordionGroup>

## 設定參考指引

- [配置參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
- [Gateway 配置](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [移除 BlueBubbles 與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 公告與遷移摘要
- [從 BlueBubbles 遷移](/zh-Hant/channels/imessage-from-bluebubbles) — 配置對照表與逐步切換指南
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及控管
- [通道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與防護加固
