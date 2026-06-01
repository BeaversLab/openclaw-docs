---
summary: "透過 imsg（透過 stdio 的 JSON-RPC）原生支援 iMessage，並提供用於回覆、點讚、特效、附件和群組管理的私人 API 操作。當主機要求符合時，這是新的 OpenClaw iMessage 設定的首選方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
對於 OpenClaw iMessage 部署，請在已登入的 macOS Messages 主機上使用 `imsg`。如果您的 Gateway 執行於 Linux 或 Windows，請將 `channels.imessage.cliPath` 指向一個在 Mac 上執行 `imsg` 的 SSH 包裝器。

**Gateway 停機期間的補獲是選用的。** 當啟用時（`channels.imessage.catchup.enabled: true`），Gateway 會在下一次啟動時，重播離線期間（當機、重啟、Mac 休眠）抵達 `chat.db` 的傳入訊息。預設為停用 — 請參閱 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。修補了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支援已被移除。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClaw 僅透過 `imsg` 支援 iMessage。請參閱 [BlueBubbles removal and the imsg iMessage path](/zh-Hant/announcements/bluebubbles-imessage) 以了解簡短公告，或參閱 [Coming from BlueBubbles](/zh-Hant/channels/imessage-from-bluebubbles) 以取得完整遷移對照表。</Warning>

狀態：原生外部 CLI 整合。Gateway 會產生 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊（無需獨立的 daemon/port）。進階動作需要 `imsg launch` 以及成功的 private API 探測。

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

  <Tab title="透過 SSH 連接遠端 Mac">
    OpenClaw 僅需要一個相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個透過 SSH 連接到遠端 Mac 並執行 `imsg` 的包裝腳本。

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

    如果未設定 `remoteHost`，OpenClaw 將嘗試透過解析 SSH 包裝腳本來自動偵測它。
    `remoteHost` 必須是 `host` 或 `user@host`（沒有空格或 SSH 選項）。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

<Warning>
任何您放在 `imsg` 之前的 `cliPath` 包裝腳本或 SSH 代理，其行為必須像一個用於長期 JSON-RPC 的透明 stdio 管道。OpenClaw 在通道的生命週期內，透過包裝腳本的 stdin/stdout 交換小型的換行幀 JSON-RPC 訊息：

- 一旦有位元組可用，立即轉發每個 stdin 區塊/行——不要等待 EOF。
- 在相反方向及時轉發每個 stdout 區塊/行。
- 保留換行符號。
- 避免固定大小的阻塞讀取（`read(4096)`、`cat | buffer`、預設 shell `read`），這可能會導致小幣無法讀取。
- 將 stderr 與 JSON-RPC stdout 資料流分開。

一個將 stdin 緩衝直到填滿大區塊的包裝腳本，將會產生類似 iMessage 中斷的症狀——`imsg rpc timeout (chats.list)` 或重複的通道重啟——即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`（上述）是安全的，因為它會轉發 OpenClaw 的 `cliPath` 參數，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 這樣的管道則是不安全的——行緩衝工具仍然可能持有幀；如果您必須進行過濾，請在每個階段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- Messages 必須在執行 `imsg` 的 Mac 上登入。
- 執行 OpenClaw/`imsg` 的進程上下文需要「完全磁碟存取權限」（存取 Messages 資料庫）。
- 透過 Messages.app 傳送訊息需要「自動化」權限。
- 若要使用進階操作（反應 / 編輯 / 取消傳送 / 貼文回覆 / 效果 / 群組操作），必須停用系統完整性保護 (SIP) — 請參閱下方的[啟用 imsg 私有 API](#enabling-the-imsg-private-api)。基本的文字與媒體傳送/接收則不需要它即可運作。

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

- **基本模式**（預設，無需變更 SIP）：透過 `send` 傳送輸出的文字與媒體、監看/記錄輸入、聊天清單。這是您在全新安裝 `brew install steipete/tap/imsg` 後搭配上述標準 macOS 權限即可直接獲得的功能。
- **私有 API 模式**：`imsg` 將輔助 dylib 注入 `Messages.app` 以呼叫內部 `IMCore` 函數。這就是開啟 `react`、`edit`、`unsend`、`reply` (貼文)、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及輸入指示器和已讀回條的功能。

若要達到本頻道頁面所記載的進階操作功能，您需要私有 API 模式。`imsg` README 中已明確說明此需求：

> 進階功能如 `read`、`typing`、`launch`、橋接支援的豐富傳送、訊息異動與聊天管理皆為選用功能。它們需要停用 SIP 並將輔助 dylib 注入 `Messages.app`。當啟用 SIP 時，`imsg launch` 將拒絕注入。

此輔助注入技術使用 `imsg` 自身的 dylib 來存取 Messages 私有 API。在 OpenClaw iMessage 路徑中，沒有第三方伺服器或 BlueBubbles 執行環境。

<Warning>
**停用 SIP 是真正的安全權衡。** SIP 是 macOS 防止執行修改過的系統程式碼的核心保護機制之一；全系統關閉它會開啟額外的攻擊面和副作用。值得注意的是，**在 Apple Silicon Mac 上停用 SIP 也會停用在 Mac 上安裝和執行 iOS 應用程式的能力**。

請將此視為經過深思熟慮的操作選擇，而非預設選項。如果您的威脅模型無法容忍 SIP 被關閉，內建的 iMessage 將僅限於基本模式 — 僅限文字和媒體的發送/接收，沒有反應 / 編輯 / 取消傳送 / 效果 / 群組操作。

</Warning>

### 設定

1. **安裝（或升級）`imsg`** 於執行 Messages.app 的 Mac 上：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 輸出會報告 `bridge_version`、`rpc_methods` 以及各方法的 `selectors`，因此您可以在開始之前查看當前版本支援的功能。

2. **停用系統完整性保護。** 這會因 macOS 版本而異，因為底層的 Apple 需求取決於作業系統和硬體：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 透過終端機停用 Library Validation，重新啟動進入復原模式，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+ (Big Sur 及更新版本)，Intel：** 進入復原模式 (或網際網路復原)，執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+，Apple Silicon：** 使用電源按鍵啟動順序進入復原；在最近的 macOS 版本中，按一下「繼續」時按住 **Left Shift** 鍵，然後執行 `csrutil disable`。虛擬機器設定遵循另一個流程 — 請先擷取 VM 快照。
   - **macOS 26 / Tahoe：** 庫驗證政策和 `imagent` 私有權利檢查已進一步收緊；`imsg` 可能需要更新版本才能跟上。如果在 macOS 主要升級後，`imsg launch` 插入或特定的 `selectors` 開始傳回 false，請先檢查 `imsg` 的發行說明，再假設 SIP 步驟已成功。

   在執行 `imsg launch` 之前，請遵循 Apple 針對您的 Mac 的復原模式流程來停用 SIP。

3. **注入輔助程式。** 在 SIP 已停用且 Messages.app 已登入的情況下：

   ```bash
   imsg launch
   ```

   當 SIP 仍處於啟用狀態時，`imsg launch` 會拒絕插入，因此這也可以作為步驟 2 已完成的確認。

4. **從 OpenClaw 驗證橋接：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 項目應該會報告 `works`，且 `imsg status --json | jq '.selectors'` 應該會顯示 `retractMessagePart: true` 加上您的 macOS 版本公開的任何編輯 / 輸入 / 已讀選擇器。`actions.ts` 中的 OpenClaw 外掛程式各方法閘道只會廣告其基礎選擇器為 `true` 的動作，因此您在代理程式工具清單中看到的動作表面反映了橋接器在此主機上實際能執行的操作。

如果 `openclaw channels status --probe` 回報通道為 `works`，但在發送時特定操作拋出「iMessage `<action>` 需要 imsg 私有 API 橋接」，請再次執行 `imsg launch` — 輔助程式可能會失效（Messages.app 重新啟動、系統更新等），而快取的 `available: true` 狀態將會繼續廣告操作，直到下一次探測重新整理。

### 當您無法停用 SIP 時

如果您的威脅模型無法接受停用 SIP：

- `imsg` 會回退到基本模式 — 僅限文字 + 媒體 + 接收。
- OpenClaw 外掛仍然會廣告文字/媒體發送和輸入監控；它只是在操作介面上隱藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群組操作（根據每個方法的功能閘道）。
- 您可以執行一台獨立的非 Apple Silicon Mac（或專用的機器人 Mac）並關閉 SIP 以處理 iMessage 工作負載，同時在您的主要裝置上保持 SIP 啟用。請參閱下方的[專用機器人 macOS 使用者（獨立的 iMessage 身份）](#deployment-patterns)。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing`（預設）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單項目必須識別發送者：代碼或靜態發送者存取群組（`accessGroup:<name>`）。對於 %%PH:INLINE_CODE:216:7f2194b%%、`chat_guid:*` 或 `chat_identifier:*` 等聊天目標，請使用 `channels.imessage.groupAllowFrom``chat_id:*`；對於數值 `chat_id` 註冊表金鑰，請使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="群組政策 + 提及">
    `channels.imessage.groupPolicy` 控制群組處理方式：

    - `allowlist`（配置時的預設值）
    - `open`
    - `disabled`

    群組發送者白名單：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 項目也可以參照靜態發送者存取群組（`accessGroup:<name>`）。

    執行時期後備：如果 `groupAllowFrom` 未設定，iMessage 群組發送者檢查會使用 `allowFrom`；當直訊和群組准入規則應不同時，請設定 `groupAllowFrom`。
    執行時期備註：如果 `channels.imessage` 完全缺失，執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    <Warning>
    群組路由有 **兩個** 連續運行的白名單閘門，兩者都必須通過：

    1. **發送者 / 聊天目標白名單**（`channels.imessage.groupAllowFrom`）— 接點、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群組註冊表**（`channels.imessage.groups`）— 在 `groupPolicy: "allowlist"` 下，此閘門需要一個 `groups: { "*": { ... } }` 萬用字元項目（設定 `allowAll = true`），或在 `groups` 下有明確的個別 `chat_id` 項目。

    如果閘門 2 中沒有任何內容，所有群組訊息都會被捨棄。外掛程式會在預設日誌層級發出兩個 `warn` 層級的訊號：

    - 啟動時每個帳號一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 執行時期每個 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    直訊繼續運作，因為它們採用不同的程式碼路徑。

    在 `groupPolicy: "allowlist"` 下維持群組訊息流動的最低設定：

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

    如果閘道日誌中出現那些 `warn` 行，表示閘門 2 正在阻擋訊息 — 請新增 `groups` 區塊。
    </Warning>

    群組的提及閘控：

    - iMessage 沒有原生的提及中繼資料
    - 提及偵測使用正規表示式模式（`agents.list[].groupChat.mentionPatterns`，後備為 `messages.groupChat.mentionPatterns`）
    - 若未設定模式，則無法強制執行提及閘控

    來自授權發送者的控制指令可以在群組中略過提及閘控。

    每個群組的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每個項目都接受一個選用的 `systemPrompt` 字串。該值會在每個處理該群組訊息的輪次中注入至代理程式的系統提示詞。解析過程鏡像 `channels.whatsapp.groups` 使用的每個群組提示詞解析方式：

    1. **特定群組系統提示詞**（`groups["<chat_id>"].systemPrompt`）：當地圖中存在特定群組項目 **並** 定義了其 `systemPrompt` 鍵時使用。如果 `systemPrompt` 是空字串（`""`），則會抑制萬用字元，且不對該群組套用系統提示詞。
    2. **群組萬用字元系統提示詞**（`groups["*"].systemPrompt`）：當地圖中完全不存在特定群組項目，或存在但未定義 `systemPrompt` 鍵時使用。

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

    每個群組的提示詞僅適用於群組訊息 — 此管道中的直訊不受影響。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私訊（DM）使用直接路由；群組使用群組路由。
    - 使用預設的 `session.dmScope=main`，iMessage 私訊會合併到代理主會話中。
    - 群組會話是隔離的 (`agent:<agentId>:imessage:group:<chat_id>`)。
    - 回覆會使用來源通道/目標元數據路由回 iMessage。

    類群組行為：

    某些多參與者的 iMessage 執行緒可能會帶有 `is_group=false`。
    如果該 `chat_id` 在 `channels.imessage.groups` 下被明確配置，OpenClaw 會將其視為群組流量（群組閘門 + 群組會話隔離）。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 工作階段。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該同一 iMessage 對話中的後續訊息將路由到產生的 ACP 工作階段。
- `/new` 和 `/reset` 會就地重設同一個綁定的 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

支援透過頂層 `bindings[]` 條目配置永久綁定，需包含 `type: "acp"` 和 `match.channel: "imessage"`。

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

參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解共享 ACP 綁定的行為。

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated bot macOS user (separate iMessage identity)">
    使用專屬的 Apple ID 和 macOS 使用者，以便機器人流量與您的個人訊息資料分開。

    一般流程：

    1. 建立/登入一個專屬的 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝器，以便 OpenClaw 可以在該使用者環境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在該機器人使用者會話中進行 GUI 授權（自動化 + 完整磁碟存取權）。

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

    使用 SSH 金鑰，讓 SSH 和 SCP 都是非互動式。
    請先確保主機金鑰受信任（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳號模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行各帳號的設定。

    每個帳號都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定以及附件根目錄允許清單。

  </Accordion>

  <Accordion title="直接訊息歷史記錄">
    設定 `channels.imessage.dmHistoryLimit` 以用該對話最近的已解碼 `imsg` 歷史記錄來初始化新的直接訊息工作階段。使用 `channels.imessage.dms["<sender>"].historyLimit` 進行個別發送者的覆寫，包括使用 `0` 來停用某個發送者的歷史記錄。

    iMessage DM 歷史記錄是依需求從 `imsg` 擷取的。保留 `dmHistoryLimit` 未設定會停用全域 DM 歷史記錄初始化，但針對特定發送者的正 `channels.imessage.dms["<sender>"].historyLimit` 仍會為該發送者啟用初始化。

  </Accordion>
</AccordionGroup>

## 媒體、分塊與傳遞目標

<AccordionGroup>
  <Accordion title="附件與媒體">
    - 連入附件的接收預設為**關閉** — 請設定 `channels.imessage.includeAttachments: true` 以將照片、語音備忘錄、影片和其他附件轉發給 Agent。若停用此功能，僅包含附件的 iMessage 將在到達 Agent 之前被捨棄，且可能完全不會產生 `Inbound message` 日誌行。
    - 當設定 `remoteHost` 時，可以透過 SCP 取得遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本地)
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
    建議使用的明確目標：

    - `chat_id:123` (建議用於穩定的路由)
    - `chat_guid:...`
    - `chat_identifier:...`

    同時支援 Handle 目標：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## Private API 動作

當 `imsg launch` 正在執行且 `openclaw channels status --probe` 回報 `privateApi.available: true` 時，訊息工具除了正常的文字發送外，還可以使用 iMessage 原生動作。

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
    - **react**: 新增/移除 iMessage 點回表情 (`messageId`、`emoji`、`remove`)。支援的點回表情對應至愛心、喜歡、不喜歡、大笑、強調和疑問。
    - **reply**: 傳送執緒回覆給現有訊息 (`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`)。
    - **sendWithEffect**: 傳送具有 iMessage 特效的文字 (`text` 或 `message`、`effect` 或 `effectId`)。
    - **edit**: 在支援的 macOS/私人 API 版本上編輯已傳送的訊息 (`messageId`、`text` 或 `newText`)。
    - **unsend**: 在支援的 macOS/私人 API 版本上收回已傳送的訊息 (`messageId`)。
    - **upload-file**: 傳送媒體/檔案 (`buffer` 為 base64 或已具象化的 `media`/`path`/`filePath`、`filename`、選用的 `asVoice`)。舊版別名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：當目前目標是群組對話時管理群組聊天。

  </Accordion>

  <Accordion title="訊息 ID">
    傳入的 iMessage 上下文在可用時包含短 `MessageSid` 值和完整訊息 GUID。短 ID 的範圍限定於近期的記憶體內回覆快取，並在使用前會根據目前的聊天進行檢查。如果短 ID 已過期或屬於另一個聊天，請使用完整 `MessageSidFull` 重試。

  </Accordion>

  <Accordion title="功能偵測">
    OpenClaw 僅在快取的探測狀態顯示橋接器無法使用時，才會隱藏私人 API 動作。如果狀態未知，動作將保持可見並延遲發送探測，讓第一個動作可以在 `imsg launch` 後成功，無需額外的手動狀態重新整理。

  </Accordion>

  <Accordion title="已讀回執與輸入狀態">
    當私人 API 橋接器啟動時，已接受的傳入聊天會在發送前標記為已讀，並在代理產生回應時向發送者顯示輸入氣泡。使用以下方式停用已讀標記：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早於個別方法功能列表的舊版 `imsg` 組建將會自動封鎖輸入/已讀功能；OpenClaw 會在每次重新啟動時記錄一次警告，以便將遺失的回執歸因。

  </Accordion>

  <Accordion title="傳入點回">
    OpenClaw 訂閱 iMessage 點回，並將已接受的回應作為系統事件而非一般訊息文字進行路由，因此使用者的點回不會觸發一般的回應迴圈。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"` (預設值)：僅當使用者對機器人發送的訊息做出反應時發出通知。
    - `"all"`：對來自授權發送者的所有傳入點回發出通知。
    - `"off"`：忽略傳入點回。

    每個帳戶的覆寫使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="核准反應（👍 / 👎）">
    當 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 為 true 且請求路由至 iMessage 時，閘道會以原生方式傳送核准提示，並接受輕按回覆（tapback）來加以解決：

    - `👍`（讚輕按回覆）→ `allow-once`
    - `👎`（不讚輕按回覆）→ `deny`
    - `allow-always` 仍為手動後援：將 `/approve <id> allow-always` 作為一般回覆傳送。

    處理反應需要反應使用者的 handle 必須是明確的核准者。核准者清單讀取自 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）；請以 E.164 格式加入使用者的電話號碼或其 Apple ID 電子郵件。萬用字元項目 `"*"` 會被接受，但允許任何傳送者進行核准。反應捷徑會刻意繞過 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因為對於核准解決而言，唯一重要的關卡就是明確核准者白名單。

    **此版本的行為變更：** 當 `channels.imessage.allowFrom` 非空時，`/approve <id> <decision>` 文字指令現在會根據該核准者清單（而非更廣泛的 DM 白名單）進行授權。獲 DM 白名單許可但不在 `allowFrom` 中的傳送者將會收到明確的拒絕。若要保留先前的行為，請將每一位應能透過 `/approve`（以及透過反應）進行核准的操作員加入 `allowFrom`。當 `allowFrom` 為空時，舊有的「同一聊天後援」依然生效，而 `/approve` 會繼續授權 DM 白名單所允許的任何人。

    操作員備註：
    - 反應綁定會同時儲存在記憶體中（TTL 與核准有效期限相符）以及閘道的持續性鍵值儲存中，因此即使閘道重啟後不久收到的輕按回覆仍能解決核准。
    - 跨裝置 `is_from_me=true` 輕按回覆（操作員在配對的 Apple 裝置上自己的反應）會被刻意忽略，以免機器人自我核准。
    - 舊式文字風格輕按回覆（來自非常舊的 Apple 用戶端的 `Liked "…"` 純文字）無法解決核准，因為它們不包含訊息 GUID；反應解決需要目前 macOS / iOS 用戶端發出的結構化輕按回覆中繼資料。

  </Accordion>
</AccordionGroup>

## 配置寫入

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

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合併拆分發送的私訊（一則訊息中的指令 + URL）

當使用者同時輸入指令和 URL — 例如 `Dump https://example.com/article` — Apple 的訊息應用程式會將發送拆分為 **兩條獨立的 `chat.db` 記錄**：

1. 一則文字訊息（`"Dump"`）。
2. 一則 URL 預覽氣球（`"https://..."`），並以 OG 預覽圖片作為附件。

這兩條記錄在大多數設定上會相隔約 0.8-2.0 秒到達 OpenClaw。若未合併，代理程式會在第 1 輪單獨收到指令並回覆（通常是「發送 URL 給我」），然後才在第 2 輪看到 URL — 此時指令語境已經遺失。這是 Apple 的發送管線，並非 OpenClaw 或 `imsg` 引入的機制。

`channels.imessage.coalesceSameSenderDms` 讓私訊選擇將連續的相同發送者記錄合併為單一代理程式輪次。群組聊天則繼續逐則訊息分發，以保留多使用者輪次結構。

<Tabs>
  <Tab title="何時啟用">
    在以下情況啟用：

    - 您發布的技能期望在一則訊息中包含 `command + payload`（傾印、貼上、儲存、佇列等）。
    - 您的使用者會貼上 URL、圖片或長內容連同指令一起。
    - 您可以接受增加的私訊輪次延遲（見下文）。

    在以下情況保持停用：

    - 您需要單字私訊觸發器的最低指令延遲。
    - 您的所有流程都是一次性指令，沒有後續的負載跟進。

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

    開啟此旗標且未明確設定 `messages.inbound.byChannel.imessage` 時，防跳動視窗會放寬至 **2500 ms**（舊版預設為 0 ms — 無防跳動）。需要更寬的視窗，是因為 Apple 的拆分發送節奏 0.8-2.0 秒無法適用更緊縮的預設值。

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
    - **增加私訊訊息的延遲。** 開啟此旗標後，每則私訊（包括獨立的控制指令和單一文字的後續內容）在發送前都會等待最多去抖動視窗的時間，以防還有 payload row 進入。群組訊息則保持立即發送。
    - **合併輸出受限。** 合併的文字上限為 4000 個字元，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源項目上限為 10 個（超出部分僅保留第一個和最新的）。每個來源 GUID 都會在 `coalescedMessageGuids` 中追蹤，以供下游遙測使用。
    - **僅限私訊。** 群組聊天會採用逐則訊息發送的模式，以便在多人同時輸入時保持機器人的回應速度。
    - **選用功能，每個頻道獨立。** 其他頻道（Telegram、WhatsApp、Slack 等）不受影響。設定 `channels.bluebubbles.coalesceSameSenderDms` 的舊版 BlueBubbles 設定應將該值遷移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 場景與代理程式看到的內容

| 使用者輸入                                        | `chat.db` 產生             | 旗標關閉（預設）                                   | 旗標開啟 + 2500 ms 視窗                                     |
| ------------------------------------------------- | -------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| `Dump https://example.com`（一次發送）            | 2 筆資料，間隔約 1 秒      | 代理程式回應兩次：先是「Dump」單獨出現，接著是 URL | 回應一次：合併後的文字 `Dump https://example.com`           |
| `Save this 📎image.jpg caption`（附件 + 文字）    | 2 筆資料                   | 回應兩次（合併時附件被捨棄）                       | 回應一次：文字與圖片皆保留                                  |
| `/status`（獨立指令）                             | 1 筆資料                   | 立即發送                                           | **等待最多視窗時間，然後發送**                              |
| 單獨貼上 URL                                      | 1 筆資料                   | 立即發送                                           | 立即發送（貯存區中只有一個項目）                            |
| 文字與 URL 作為兩則刻意分開的訊息發送，間隔數分鐘 | 2 筆資料，超出視窗時間     | 回應兩次                                           | 回應兩次（視窗在它們之間過期）                              |
| 快速大量傳送（視窗內超過 10 則小型私訊）          | N 筆資料                   | N 次回應                                           | 回應一次，輸出受限（保留第一個和最新的，套用文字/附件上限） |
| 兩人在群組聊天中輸入                              | 來自 M 位發送者的 N 筆資料 | M+ 次回應（每個發送者貯存區各一次）                | M+ 次回應 — 群組聊天不進行合併                              |

## 在閘道停機後追補

當閘道離線（崩潰、重啟、Mac 睡眠、機器關機）時，`imsg watch` 會在閘道恢復上線後從目前的 `chat.db` 狀態繼續——預設情況下，在中斷期間到達的任何訊息都不會被看到。Catchup 會在下次啟動時重播這些訊息，以便 Agent 不會無聲地錯過傳入流量。

Catchup **預設為停用**。請針對每個頻道啟用它：

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

每次 `monitorIMessageProvider` 啟動時執行一次，順序為 `imsg launch` 就緒 → `watch.subscribe` → `performIMessageCatchup` → 即時分發迴圈。Catchup 本身使用 `chats.list` + 每個對話的 `messages.history`，對向與 `imsg watch` 相同的 JSON-RPC 客戶端進行操作。在 catchup 執行期間到達的任何內容都會正常流經即時分發；現有的傳入去重快取會吸收與重播列的重疊部分。

每一筆重播的列都會被送入即時分發路徑（`evaluateIMessageInbound` + `dispatchInboundMessage`），因此允許清單、群組原則、去抖器、回聲快取和已讀回執在重播訊息和即時訊息上的表現完全相同。

### 遊標與重試語意

Catchup 會在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 處維護每個帳號的遊標（OpenClaw 狀態目錄預設為 `~/.openclaw`，可透過 `OPENCLAW_STATE_DIR` 覆蓋）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 遊標會在每次成功分發時前進，並在列的分發擲出錯誤時暫停——下次啟動時會從暫停的遊標重試同一列。
- 在啟動時的 catchup 查詢成功後，後續由即時處理的列也會前進相同的遊標，因此閘道重啟不會重播已經即時處理過的訊息。即時遊標寫入不會跳過仍低於 `maxFailureRetries` 的 catchup 失敗。
- 在對同一個 `guid` 連續 `maxFailureRetries` 次擲回錯誤後，catchup 會記錄 `warn` 並強制將遊標前進至卡住的訊息之後，以便後續啟動能夠繼續運作。
- 已放棄的 guid 在後續執行中會在出現時被跳過（不嘗試分發），並在執行摘要中計入 `skippedGivenUp`。

### 操作員可見的訊號

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行表示單次啟動未能排空完整積壓。如果您的間隙經常超過預設的 50 行通過量，請提高 `perRunLimit`（最高 500）。

### 何時保持關閉

- Gateway 透過看門狗自動重啟連續運行，且間隙總是小於幾秒鐘 — 預設的關閉狀態即可。
- DM 量很低，且錯過的訊息不會改變 Agent 行為 — `firstRunLookbackMinutes` 初始視窗可能在首次啟用時分發令人驚訝的舊上下文。

當您開啟趕上進度 時，沒有游標的首次啟動僅回溯 `firstRunLookbackMinutes`（預設 30 分鐘），而非完整的 `maxAgeMinutes` 視窗 — 這可避免重播啟用前的漫長歷史訊息。

## 疑難排解

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支援 RPC">
    驗證二進位檔和 RPC 支援：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探針回報不支援 RPC，請更新 `imsg`。如果無法使用 Private API 動作，請在已登入的 macOS 使用者工作階段中執行 `imsg launch` 並再次探測。如果 Gateway 未在 macOS 上運行，請改用上述的「透過 SSH 連線遠端 Mac」設定，而非預設的本機 `imsg` 路徑。

  </Accordion>

  <Accordion title="Gateway 未在 macOS 上運行">
    預設的 `cliPath: "imsg"` 必須在登入 Messages 的 Mac 上運行。在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 設定為透過 SSH 連線至該 Mac 並執行 `imsg "$@"` 的包裝腳本。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然後執行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="DM 被忽略">
    請檢查：

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
    - 從閘道主機進行的 SSH/SCP 金鑰驗證
    - 主機金鑰存在於閘道主機上的 `~/.ssh/known_hosts` 中
    - 執行 Messages 的 Mac 上的遠端路徑讀取權限

  </Accordion>

  <Accordion title="錯過了 macOS 權限提示">
    在相同的使用者/工作階段內容中，於互動式 GUI 終端機重新執行並批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    確認執行 OpenClaw/`imsg` 的程序內容已獲得「完全磁碟存取權」+「自動化」權限。

  </Accordion>
</AccordionGroup>

## 設定參考指南

- [設定參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
- [閘道設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)

## 相關

- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [移除 BlueBubbles 與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 公告與遷移摘要
- [從 BlueBubbles 轉換](/zh-Hant/channels/imessage-from-bluebubbles) — 設定對照表與逐步切換指南
- [配對](/zh-Hant/channels/pairing) — DM 驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘門
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與加固
