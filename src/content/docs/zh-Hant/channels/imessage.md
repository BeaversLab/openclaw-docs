---
summary: "透過 imsg（經由 stdio 的 JSON-RPC）原生支援 iMessage，具備用於回覆、點讚、特效、附件與群組管理的私有 API 操作。若主機需求符合，這是新的 OpenClaw iMessage 設定的首選。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
若為 OpenClaw iMessage 部署，請在已登入的 macOS Messages 主機上使用 `imsg`。若您的 Gateway 執行於 Linux 或 Windows，請將 `channels.imessage.cliPath` 指向在 Mac 上執行 `imsg` 的 SSH 包裝器。

**Gateway 停機期間的追趕（catchup）為選用功能。** 啟用後（`channels.imessage.catchup.enabled: true`），Gateway 會在下次啟動時，重播其離線期間（當機、重啟、Mac 休眠）抵達 `chat.db` 的訊息。預設為停用 — 請參閱 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。此變更結案了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支援已移除。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClaw 僅透過 `imsg` 支援 iMessage。請先參閱 [BlueBubbles removal and the imsg iMessage path](/zh-Hant/announcements/bluebubbles-imessage) 瞭解簡短公告，或參閱 [Coming from BlueBubbles](/zh-Hant/channels/imessage-from-bluebubbles) 查看完整遷移對照表。</Warning>

狀態：原生外部 CLI 整合。Gateway 會產生 `imsg rpc` 並透過 stdio 上的 JSON-RPC 進行通訊（無需獨立的 daemon/port）。進階操作需要 `imsg launch` 及成功的私有 API 探測。

<CardGroup cols={3}>
  <Card title="Private API actions" icon="wand-sparkles" href="#private-api-actions">
    回覆、點讚、特效、附件與群組管理。
  </Card>
  <Card title="Pairing" icon="link" href="/zh-Hant/channels/pairing">
    iMessage 私訊預設為配對模式。
  </Card>
  <Card title="Remote Mac" icon="terminal" href="#remote-mac-over-ssh">
    當閘道未在訊息 Mac 上執行時，請使用 SSH 包裝器。
  </Card>
  <Card title="Configuration reference" icon="settings" href="/zh-Hant/gateway/config-channels#imessage">
    完整的 iMessage 欄位參考。
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
imsg launch
openclaw channels status --probe
```

      </Step>

      <Step title="Configure OpenClaw">

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
    OpenClaw 只需要一個相容 stdio 的 `cliPath`，因此您可以將 `cliPath` 指向一個透過 SSH 連線到遠端 Mac 並執行 `imsg` 的包裝腳本。

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
    `remoteHost` 必須是 `host` 或 `user@host`（不能有空格或 SSH 選項）。
    OpenClaw 對 SCP 使用嚴格的主機金鑰檢查，因此中繼主機金鑰必須已存在於 `~/.ssh/known_hosts` 中。
    附件路徑會根據允許的根目錄（`attachmentRoots` / `remoteAttachmentRoots`）進行驗證。

<Warning>
任何您放在 `imsg` 前面的 `cliPath` 包裝程式或 SSH 代理程式，其行為必須像一個針對長時間運行 JSON-RPC 的透明 stdio 管道。在通道的生命週期內，OpenClaw 會透過包裝程式的 stdin/stdout 交換以換行符號分隔的小型 JSON-RPC 訊息：

- 一旦有位元組可用，立即轉送每個 stdin 區塊/行 —— 不要等到 EOF。
- 在反方向上迅速轉送每個 stdout 區塊/行。
- 保留換行符號。
- 避免固定大小的阻塞讀取（`read(4096)`、`cat | buffer`、預設 shell `read`），這可能會讓小型框架無法傳輸。
- 將 stderr 與 JSON-RPC stdout 資料流分開。

如果包裝程式將 stdin 緩衝直到填滿一個大區塊，將會產生類似 iMessage 服務中斷的症狀 —— `imsg rpc timeout (chats.list)` 或頻繁的通道重新啟動 —— 即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`（上文）是安全的，因為它會轉送 OpenClaw 的 `cliPath` 參數，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 這樣的管道則不行 —— 行緩衝的工具仍可能保留框架；如果您必須進行過濾，請在每個階段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 需求和權限 (macOS)

- Mac 上執行 `imsg` 的裝置必須已登入訊息。
- 執行 OpenClaw/`imsg` 的處理程序內容需要「完全磁碟存取權限」（用於存取訊息資料庫）。
- 透過 Messages.app 傳送訊息需要「自動化」權限。
- 若要使用進階動作（回應 / 編輯 / 取消傳送 / 主題回覆 / 特效 / 群組操作），必須停用系統完整性保護 (SIP) — 請參閱下方的[啟用 imsg private API](#enabling-the-imsg-private-api)。基本的文字與媒體傳送/接收則不需停用。

<Tip>
權限是依據進程情境授予的。如果閘道以無介面模式執行（LaunchAgent/SSH），請在同一個情境中執行一次互動式指令以觸發權限提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

<Accordion title="SSH 包裝程式傳送失敗並出現 AppleEvents -1743">
  遠端 SSH 設定可以讀取聊天記錄、傳遞 `channels status --probe` 並處理傳入訊息，但傳出訊息仍會因 AppleEvents 授權錯誤而失敗：

```text
Not authorized to send Apple events to Messages. (-1743)
```

請檢查已登入 Mac 使用者的 TCC 資料庫，或是「系統設定」>「隱私權與安全性」>「自動化」。如果自動化條目是記錄給 `/usr/libexec/sshd-keygen-wrapper` 而非 `imsg` 或本機 shell 處理程序，macOS 可能不會顯示適用於該 SSH 伺服器端用戶端的訊息開關：

```text
kTCCServiceAppleEvents | /usr/libexec/sshd-keygen-wrapper | auth_value=0 | com.apple.MobileSMS
```

在此狀態下，重複執行 `tccutil reset AppleEvents` 或透過相同的 SSH 包裝程式重新執行 `imsg send` 可能會持續失敗，因為需要訊息自動化權限的處理程序內容是 SSH 包裝程式，而非 UI 可以授權的應用程式。

請改用其中一個支援的 `imsg` 處理程序內容：

- 在已登入訊息使用者的本機工作階段中執行 Gateway，或者至少執行 `imsg` 橋接器。
- 在授予完全磁碟存取權限和自動化權限後，使用該使用者的 LaunchAgent 啟動 Gateway。
- 如果您維持雙使用者 SSH 拓樸，請在啟用頻道之前，驗證真實的傳出 `imsg send` 確實能透過該包裝程式成功執行。如果無法授予自動化權限，請重新設定為單使用者 `imsg` 設定，而非依賴 SSH 包裝程式進行傳送。

</Accordion>

## 啟用 imsg private API

`imsg` 提供兩種操作模式：

- **基本模式**（預設，無需變更 SIP）：透過 `send` 傳送出站文字和媒體、進站監看/紀錄、聊天列表。這是您剛安裝 `brew install steipete/tap/imsg` 後，加上上述標準 macOS 權限所獲得的預設功能。
- **Private API 模式**：`imsg` 將一個輔助 dylib 注入 `Messages.app` 以呼叫內部的 `IMCore` 函式。這正是解鎖 `react`、`edit`、`unsend`、`reply`（串回）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及輸入指示器和已讀回執的關鍵。

若要達成本頻道頁面文件所述的進階動作介面，您需要 Private API 模式。`imsg` README 中明確說明了此需求：

> 諸如 `read`、`typing`、`launch`、橋接支援的豐富傳送、訊息變更和聊天管理等進階功能皆為選用。它們需要停用 SIP 並將輔助 dylib 注入 `Messages.app`。當啟用 SIP 時，`imsg launch` 將拒絕注入。

此輔助注入技術使用 `imsg` 自身的 dylib 來存取 Messages Private API。在 OpenClaw iMessage 路徑中，並無第三方伺服器或 BlueBubbles 執行環境。

<Warning>
**停用 SIP 是一項真正的安全性取捨。** SIP 是 macOS 防止執行遭修改系統程式碼的核心防護之一；全系統關閉它會開啟額外的攻擊面和副作用。值得注意的是，**在 Apple Silicon Mac 上停用 SIP 也會停用在 Mac 上安裝和執行 iOS App 的能力**。

請將此視為一項經深思熟慮的操作選擇，而非預設值。若您的威脅模型無法容忍 SIP 關閉，內建的 iMessage 將受限於基本模式 — 僅能傳送/接收文字與媒體，無反應 / 編輯 / 取消傳送 / 效果 / 群組操作。

</Warning>

### 設定

1. **在執行 Messages.app 的 Mac 上安裝（或升級） `imsg`：**

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 輸出會報告 `bridge_version`、`rpc_methods` 以及各個方法的 `selectors`，以便您在開始前查看目前建置版本所支援的功能。

2. **停用系統完整性保護（System Integrity Protection）。** 此步驟因 macOS 版本而異，因為底層的 Apple 要求取決於作業系統與硬體：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 透過終端機停用程式庫驗證（Library Validation），重新啟動進入復原模式（Recovery Mode），執行 `csrutil disable`，然後重新啟動。
   - **macOS 11+ (Big Sur 及更新版本), Intel：** 進入復原模式（或網際網路復原 Internet Recovery），`csrutil disable`，然後重新啟動。
   - **macOS 11+, Apple Silicon：** 使用電源按鍵啟動程序進入復原模式；在最近的 macOS 版本中，按一下「繼續」時按住 **Left Shift** 鍵，然後 `csrutil disable`。虛擬機設定則遵循不同的流程 — 建議先建立 VM 快照。
   - **macOS 26 / Tahoe：** 程式庫驗證（library-validation）政策和 `imagent` 私有權限檢查已進一步收緊；`imsg` 可能需要更新建置版本以保持相容。如果在 macOS 主要版本升級後，`imsg launch` 注入或特定的 `selectors` 開始傳回 false，請先查看 `imsg` 的發行說明，再假定 SIP 步驟已成功。

   請遵循 Apple 針對您 Mac 的復原模式流程，在執行 `imsg launch` 之前停用 SIP。

3. **注入輔助程式。** 在已停用 SIP 且 Messages.app 已登入的情況下：

   ```bash
   imsg launch
   ```

   當 SIP 仍處於啟用狀態時，`imsg launch` 會拒絕注入，因此這也可以作為確認步驟 2 是否已完成的依據。

4. **從 OpenClaw 驗證橋接器：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 項目應回報 `works`，且 `imsg status --json | jq '.selectors'` 應顯示 `retractMessagePart: true` 加上您的 macOS 版本所暴露的任何編輯 / 輸入 / 已讀選擇器。`actions.ts` 中的 OpenClaw 外掛程式按方法閘道 (per-method gating) 僅會宣告其基礎選擇器為 `true` 的動作，因此您在代理程式工具列表中看到的動作表面反映了該橋接器在此主機上實際能執行的操作。

如果 `openclaw channels status --probe` 將頻道回報為 `works`，但特定動作在分派時拋出「iMessage `<action>` requires the imsg private API bridge」，請再次執行 `imsg launch` — 輔助程式可能會失效（Messages.app 重新啟動、系統更新等），而快取的 `available: true` 狀態將持續宣告動作，直到下一次探查重新整理。

### 當您無法停用 SIP

如果您的威脅模型無法接受停用 SIP：

- `imsg` 會退回至基本模式 — 僅限文字 + 媒體 + 接收。
- OpenClaw 外掛程式仍會宣告文字/媒體發送與輸入監控；它只是會從動作表面中隱藏 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群組操作（依據按方法功能閘道 per-method capability gate）。
- 您可以在一台獨立的非 Apple Silicon Mac（或專用的機器人 Mac）上關閉 SIP 以處理 iMessage 工作負載，同時在您的主要裝置上保持啟用 SIP。請參閱下方的 [專用機器人 macOS 使用者 (獨立的 iMessage 身分)](#deployment-patterns)。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` 控制直接訊息：

    - `pairing` （預設）
    - `allowlist`
    - `open` （要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允許清單欄位：`channels.imessage.allowFrom`。

    允許清單項目必須識別發送者：識別碼或靜態發送者存取群組（`accessGroup:<name>`）。對於 %%PH:INLINE_CODE:229:7f2194b%%、`chat_guid:*` 或 `chat_identifier:*` 等聊天目標，請使用 `channels.imessage.groupAllowFrom``chat_id:*`；對於數值的 `chat_id` 註冊表鍵，請使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` 控制群組處理方式：

    - `allowlist` (設定時的預設值)
    - `open`
    - `disabled`

    群組發送者白名單：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 項目也可以參考靜態發送者存取群組 (`accessGroup:<name>`)。

    執行時期回退：如果未設定 `groupAllowFrom`，iMessage 群組發送者檢查會使用 `allowFrom`；當私訊和群組准入應不同時，請設定 `groupAllowFrom`。
    執行時期備註：如果 `channels.imessage` 完全缺失，執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告 (即使已設定 `channels.defaults.groupPolicy`)。

    <Warning>
    群組路由有**兩個**背對背運行的白名單閘門，兩者都必須通過：

    1. **發送者 / 聊天目標白名單** (`channels.imessage.groupAllowFrom`) — handle、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群組註冊表** (`channels.imessage.groups`) — 在 `groupPolicy: "allowlist"` 模式下，此閘門需要 `groups: { "*": { ... } }` 萬用字元項目 (設定 `allowAll = true`)，或在 `groups` 下的明確個別 `chat_id` 項目。

    如果閘門 2 中沒有任何內容，每條群組訊息都會被丟棄。外掛程式會在預設日誌層級發出兩個 `warn` 層級的訊號：

    - 啟動時每個帳戶一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 執行時期每個 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私訊會繼續運作，因為它們走不同的程式碼路徑。

    在 `groupPolicy: "allowlist"` 下保持群組流暢運作的最低設定：

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

    如果閘道日誌中出現那些 `warn` 行，表示閘門 2 正在丟棄訊息 — 請新增 `groups` 區塊。
    </Warning>

    群組提及閘控：

    - iMessage 沒有原生的提及中繼資料
    - 提及偵測使用正規表示式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 如果沒有設定模式，就無法強制執行提及閘控

    來自授權發送者的控制指令可以繞過群組中的提及閘控。

    每個群組的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每個項目都接受一個可選的 `systemPrompt` 字串。該值會在每次處理該群組中訊息的回合中注入到代理程式的系統提示詞中。解析邏輯鏡像 `channels.whatsapp.groups` 使用的每個群組提示詞解析方式：

    1. **特定群組的系統提示詞** (`groups["<chat_id>"].systemPrompt`)：當對應中存在特定群組項目 **並且** 定義了其 `systemPrompt` 金鑰時使用。如果 `systemPrompt` 是空字串 (`""`)，萬用字元會被抑制，並且不會對該群組套用系統提示詞。
    2. **群組萬用字元系統提示詞** (`groups["*"].systemPrompt`)：當對應中完全缺少特定群組項目時，或者當項目存在但未定義 `systemPrompt` 金鑰時使用。

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
    - 回覆會使用原始通道/目標元數據路由回 iMessage。

    類群組的執行緒行為：

    某些多參與者的 iMessage 執行緒可能會帶有 `is_group=false` 到達。
    如果該 `chat_id` 在 `channels.imessage.groups` 下被明確配置，OpenClaw 會將其視為群組流量（群組閘門 + 群組會話隔離）。

  </Tab>
</Tabs>

## ACP 對話綁定

舊版 iMessage 聊天也可以綁定到 ACP 會話。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該同一 iMessage 對話中的未來訊息將路由到生成的 ACP 會話。
- `/new` 和 `/reset` 會就地重置同一個綁定的 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

透過頂層 `bindings[]` 項目，搭配 `type: "acp"` 和 `match.channel: "imessage"`，支援配置的持久化綁定。

`match.peer.id` 可以使用：

- 正規化的私訊識別碼，例如 `+15555550123` 或 `user@example.com`
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

請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解共享的 ACP 綁定行為。

## 部署模式

<AccordionGroup>
  <Accordion title="專屬機器人 macOS 使用者（獨立的 iMessage 身份）">
    使用專屬的 Apple ID 和 macOS 使用者，以便將機器人流量與您的個人訊息設定檔隔離。

    典型流程：

    1. 建立/登入專屬 macOS 使用者。
    2. 在該使用者中使用機器人 Apple ID 登入訊息。
    3. 在該使用者中安裝 `imsg`。
    4. 建立 SSH 包裝器，以便 OpenClaw 可以在該使用者環境中執行 `imsg`。
    5. 將 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向該使用者設定檔。

    首次執行可能需要在該機器人使用者工作階段中進行 GUI 核准（自動化 + 完整磁碟存取權）。

  </Accordion>

  <Accordion title="透過 Tailscale 連線遠端 Mac（範例）">
    常見拓撲：

    - Gateway 執行於 Linux/VM
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
    確保先信任主機金鑰（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填入 `known_hosts`。

  </Accordion>

  <Accordion title="多帳戶模式">
    iMessage 支援在 `channels.imessage.accounts` 下進行每個帳戶的設定。

    每個帳戶都可以覆寫欄位，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、歷史記錄設定和附件根目錄允許清單。

  </Accordion>

  <Accordion title="Direct-message history">
    設定 `channels.imessage.dmHistoryLimit` 以使用該對話最近的解碼後 `imsg` 歷史紀錄來初始化新的直接訊息工作階段。使用 `channels.imessage.dms["<sender>"].historyLimit` 針對每個發送者進行覆蓋，包括 `0` 以停用特定發送者的歷史紀錄。

    iMessage DM 歷史紀錄會視需求從 `imsg` 取得。保留 `dmHistoryLimit` 未設定會停用全域 DM 歷史紀錄初始化，但正值的每個發送者 `channels.imessage.dms["<sender>"].historyLimit` 仍會啟用該發送者的初始化。

  </Accordion>
</AccordionGroup>

## 媒體、分塊與傳遞目標

<AccordionGroup>
  <Accordion title="Attachments and media">
    - 連結擷取功能 **預設為關閉** — 設定 `channels.imessage.includeAttachments: true` 以將照片、語音備忘錄、影片和其他附件轉發給代理程式。若停用此功能，僅包含附件的 iMessage 訊息會在到達代理程式之前被捨棄，且可能完全不會產生 `Inbound message` 日誌行。
    - 當設定 `remoteHost` 時，可以透過 SCP 取得遠端附件路徑
    - 附件路徑必須符合允許的根目錄：
      - `channels.imessage.attachmentRoots` (本機)
      - `channels.imessage.remoteAttachmentRoots` (遠端 SCP 模式)
      - 預設根目錄模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用嚴格的主機金鑰檢查 (`StrictHostKeyChecking=yes`)
    - 傳出媒體大小使用 `channels.imessage.mediaMaxMb` (預設 16 MB)

  </Accordion>

  <Accordion title="Outbound chunking">
    - 文字分塊限制：`channels.imessage.textChunkLimit` (預設 4000)
    - 分塊模式：`channels.imessage.chunkMode`
      - `length` (預設)
      - `newline` (段落優先分割)

  </Accordion>

  <Accordion title="位址格式">
    偏好的明確目標：

    - `chat_id:123` (建議用於穩定的路由)
    - `chat_guid:...`
    - `chat_identifier:...`

    也支援代碼目標：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## 私人 API 操作

當 `imsg launch` 正在執行且 `openclaw channels status --probe` 回報 `privateApi.available: true` 時，訊息工具除了正常的文字傳送外，還可以使用 iMessage 原生操作。

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
    - **react**：新增/移除 iMessage 點回（`messageId`、`emoji`、`remove`）。支援的點回對應到愛心、喜歡、不喜歡、大笑、強調與疑問。
    - **reply**：對現有訊息發送串聯回覆（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**：發送帶有 iMessage 特效的文字（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**：在支援的 macOS/私人 API 版本上編輯已發送的訊息（`messageId`、`text` 或 `newText`）。
    - **unsend**：在支援的 macOS/私人 API 版本上收回已發送的訊息（`messageId`）。
    - **upload-file**：發送媒體/檔案（`buffer` 為 base64 或已實作的 `media`/`path`/`filePath`、`filename`、選用的 `asVoice`）。舊版別名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：當目前目標為群組對話時管理群組聊天。

  </Accordion>

  <Accordion title="訊息 ID">
    輸入的 iMessage 上下文在可用時包含簡短的 `MessageSid` 值與完整的訊息 GUID。簡短 ID 範圍限於最近的 SQLite 支援回覆快取，並在使用前會對目前聊天進行檢查。如果簡短 ID 已過期或屬於其他聊天，請使用完整的 `MessageSidFull` 重試。

  </Accordion>

  <Accordion title="功能偵測">
    只有當快取的探測狀態顯示橋接器不可用時，OpenClaw 才會隱藏私人 API 動作。如果狀態未知，動作會保持可見並延遲觸發探測，以便第一個動作能在 `imsg launch` 後成功執行，而無需額外的手動狀態重新整理。

  </Accordion>

  <Accordion title="讀取回執與輸入狀態">
    當私人 API 橋接器上線時，接受的對外聊天會在分派前標記為已讀，並在代理生成回應時向傳送者顯示輸入氣泡。您可以透過以下方式停用標記已讀功能：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    較舊且早於逐方法功能清單的 `imsg` 版本會自動隱藏輸入/已讀功能；OpenClaw 會在每次重新啟動時記錄一次警告，以便追溯遺失的回執。

  </Accordion>

  <Accordion title="接收 Tapbacks">
    OpenClaw 會訂閱 iMessage Tapbacks，並將接受的反應路由為系統事件而非一般訊息文字，因此使用者的 Tapback 不會觸發一般的回應迴圈。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"` (預設值)：僅當使用者對機器人發送的訊息做出反應時通知。
    - `"all"`：針對來自已授權傳送者的所有接收 Tapbacks 發出通知。
    - `"off"`：忽略接收的 Tapbacks。

    每個帳號的覆寫設定使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="核准反應 (👍 / 👎)">
    當 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 為 true 且請求路由至 iMessage 時，閘道會原生傳送核准提示，並接受輕拍回應 以進行解析：

    - `👍` (讚輕拍回應) → `allow-once`
    - `👎` (倒讚輕拍回應) → `deny`
    - `allow-always` 仍是手動備援方案：將 `/approve <id> allow-always` 作為一般回覆傳送。

    處理反應需要反應使用者的 handle 為明確的核准者。核准者清單讀取自 `channels.imessage.allowFrom` (或 `channels.imessage.accounts.<id>.allowFrom`)；請以 E.164 格式加入使用者的電話號碼或其 Apple ID 電子郵件。萬用字元項目 `"*"` 會受到尊重，但允許任何傳送者進行核准。由於明確核准者允許清單是唯一對核准解析有影響的關卡，因此反應捷徑會刻意繞過 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`。

    **本版本的行為變更：** 當 `channels.imessage.allowFrom` 非空時，`/approve <id> <decision>` 文字指令現在是依據該核准者清單 (而非更廣泛的 DM 允許清單) 進行授權。在 DM 允許清單上獲准但不在 `allowFrom` 中的傳送者將收到明確的拒絕。請將每個應能透過 `/approve` (以及透過反應) 進行核准的操作員加入 `allowFrom`，以保留先前的行為。當 `allowFrom` 為空時，舊版的「相同聊天備援」仍然有效，且 `/approve` 會繼續授權 DM 允許清單准許的任何人。

    操作員注意事項：
    - 反應連結會同時儲存在記憶體中 (TTL 與核准到期時間相符) 和閘道的持續性鍵值存放區中，因此在閘道重新啟動後不久收到的輕拍回應仍能解析該核准。
    - 跨裝置 `is_from_me=true` 輕拍回應 (操作員在配對 Apple 裝置上自己的反應) 會被刻意忽略，以免機器人自我核准。
    - 舊版文字樣式的輕拍回應 (來自非常舊的 Apple 用戶端的 `Liked "…"` 純文字) 無法解析核准，因為它們不包含訊息 GUID；反應解析需要目前的 macOS / iOS 用戶端發出的結構化輕拍回應元資料。

  </Accordion>
</AccordionGroup>

## 組態寫入

iMessage 預設允許通道發起的組態寫入（針對當 `commands.config: true` 時的 `/config set|unset`）。

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

## 合併分割傳送的私人訊息（指令與 URL 在同一則訊息中）

當使用者同時輸入指令和 URL — 例如 `Dump https://example.com/article` — Apple 的訊息應用程式會將傳送拆分為 **兩個獨立的 `chat.db` 資料列**：

1. 一則文字訊息（`"Dump"`）。
2. 一個 URL 預覽氣球（`"https://..."`），並將 OG 預覽圖片作為附件。

在大多數設置中，這兩個資料列抵達 OpenClaw 的時間間隔約為 0.8-2.0 秒。若不合併，Agent 會在第 1 回合單獨收到指令並回覆（通常是「將 URL 發送給我」），然後直到第 2 回合才看到 URL — 此時指令語境已經遺失。這是 Apple 的傳送流程，並非 OpenClaw 或 `imsg` 引入的機制。

`channels.imessage.coalesceSameSenderDms` 讓私人訊息選擇將連續的相同傳送者資料列合併為單一 Agent 回合。群組聊天會繼續依訊息分派，以保留多使用者的回合結構。

<Tabs>
  <Tab title="何時啟用">
    啟用於：

    - 您發布的技能期望在一則訊息中接收 `command + payload`（例如傾印、貼上、儲存、佇列等）。
    - 您的使用者會在指令旁貼上 URL、圖片或長內容。
    - 您可以接受增加的私人訊息回合延遲（見下文）。

    保持停用於：

    - 您需要針對單字私人訊息觸發器的最低指令延遲。
    - 您所有的流程都是一次性指令，且沒有後續的內容追蹤。

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

    開啟此旗標且未明確指定 `messages.inbound.byChannel.imessage` 時，防跳動視窗會加寬至 **2500 毫秒**（舊版預設值為 0 毫秒 — 即無防跳動）。需要更寬的視窗，是因為 Apple 的分割傳送節奏 0.8-2.0 秒無法納入更緊湊的預設值中。

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
    - **增加私訊的延遲。** 開啟此旗標後，每則私訊（包括獨立控制指令和單行文字的後續回覆）都會等待到防抖視窗結束才發送，以防有後續的內容資料列傳入。群組訊息則維持即時發送。
    - **合併輸出有上限。** 合併的文字上限為 4000 個字元，並會加上明確的 `…[truncated]` 標記；附件上限為 20 個；來源條目上限為 10 個（超過的部分僅保留第一則與最新的一則）。每個來源 GUID 都會在 `coalescedMessageGuids` 中追蹤，以便下游遙測使用。
    - **僅限私訊。** 群組聊天會直接逐條發送，讓多人在輸入時機器人仍能保持回應。
    - **選用功能，每個通道獨立。** 其他通道（Telegram、WhatsApp、Slack 等）不受影響。設定過 `channels.bluebubbles.coalesceSameSenderDms` 的舊版 BlueBubbles 設定應將該值遷移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 場景與 Agent 看到的內容

| 使用者輸入                                        | `chat.db` 產生        | 旗標關閉（預設）                            | 旗標開啟 + 2500 毫秒視窗                                     |
| ------------------------------------------------- | --------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `Dump https://example.com`（一次發送）            | 2 列，間隔約 1 秒     | 兩次 Agent 回應：先顯示「Dump」，再顯示 URL | 一次回應：合併後的文字 `Dump https://example.com`            |
| `Save this 📎image.jpg caption`（附件 + 文字）    | 2 列                  | 兩次回應（合併時附件被丟棄）                | 一次回應：文字 + 圖片被保留                                  |
| `/status`（獨立指令）                             | 1 列                  | 立即發送                                    | **最多等待至視窗結束，然後發送**                             |
| 單獨貼上 URL                                      | 1 列                  | 立即發送                                    | 立即發送（桶中只有一個條目）                                 |
| 文字與 URL 視為兩則刻意分開的訊息發送，間隔數分鐘 | 2 列，位於視窗之外    | 兩次回應                                    | 兩次回應（視窗在它們之間過期）                               |
| 快速爆量（視窗內超過 10 則短私訊）                | N 列                  | N 次回應                                    | 一次回應，輸出受限（第一則 + 最新一則，並套用文字/附件上限） |
| 兩人在群組中輸入                                  | N 列，來自 M 個發送者 | M+ 次回應（每個發送者桶各一次）             | M+ 次回應 — 群組聊天不會合併                                 |

## Gateway 停機後的趕工補送

當閘道離線（當機、重啟、Mac 睡眠、機器關機）時，`imsg watch` 會在閘道重新上線後從目前的 `chat.db` 狀態繼續——預設情況下，在這段間斷期間到達的任何訊息都會被遺漏。追補會在下次啟動時重播這些訊息，以免代理程式錯過入站流量。

追補功能**預設為停用**。請針對每個頻道啟用它：

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

每次 `monitorIMessageProvider` 啟動時執行一次，順序為 `imsg launch` 就緒 → `watch.subscribe` → `performIMessageCatchup` → 即時分發循環。追補本身會針對與 `imsg watch` 相同的 JSON-RPC 用戶端使用 `chats.list` + 每個聊天室的 `messages.history`。在追補過程中到達的任何內容都會正常透過即時分發流動；現有的入站去重快取會吸收與重播列的任何重疊。

每個重播的列都會送入即時分發路徑（`evaluateIMessageInbound` + `dispatchInboundMessage`），因此許可清單、群組原則、防抖動器、回聲快取和已讀回執在重播訊息與即時訊息上的行為完全相同。

### 游標與重試語意

追補會在 SQLite 外掛程式狀態中維護每個帳號的游標：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游標會在每次成功分發時前進，並在列的分發擲出錯誤時保持不變——下次啟動時會從保留的游標重試同一列。
- 在啟動時的追補查詢成功後，後續由即時處理的列也會推進同一個游標，因此閘道重啟不會重播已經即時處理過的訊息。即時游標寫入不會跳過仍低於 `maxFailureRetries` 的追補失敗。
- 對同一個 `guid` 連續 `maxFailureRetries` 次擲回錯誤後，追補會記錄 `warn` 並強制將游標推進到卡住的訊息之後，以便後續啟動能夠繼續執行。
- 已經放棄的 guid 在後續執行中會被直接跳過（不嘗試分發），並在執行摘要中計入 `skippedGivenUp`。
- `openclaw doctor --fix` 會將舊版的 `<openclawStateDir>/imessage/catchup/*.json` 游標檔案匯入至 SQLite 外掛程式狀態，並封存舊檔案。

### 操作員可見的訊號

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

出現 `WARN ... capped to perRunLimit` 行表示單次啟動未能處理完所有積壓。如果您的間隔經常超過預設的 50 行傳遞限制，請提高 `perRunLimit`（最大 500）。

### 何時保持關閉

- Gateway 透過看門狗自動重啟持續運行，且間隔總是少於幾秒鐘 — 預設的關閉狀態即可。
- DM 量很低，且錯過的訊息不會改變 Agent 的行為 — `firstRunLookbackMinutes` 初始視窗可能會在首次啟用時發出令人驚訝的舊語境。

當您開啟趕補功能時，第一次沒有游標的啟動只會回顧 `firstRunLookbackMinutes`（預設 30 分鐘），而不是完整的 `maxAgeMinutes` 視窗 — 這可避免重播啟用前的長段歷史訊息。

## 疑難排解

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支援 RPC">
    驗證二進位檔和 RPC 支援：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探測回報不支援 RPC，請更新 `imsg`。如果私有 API 動作無法使用，請在已登入的 macOS 使用者階段中執行 `imsg launch` 並再次探測。如果 Gateway 不是在 macOS 上運行，請改用上述的 SSH 遠端 Mac 設定，而不是預設的本地 `imsg` 路徑。

  </Accordion>

  <Accordion title="Gateway 未在 macOS 上運行">
    預設的 `cliPath: "imsg"` 必須在已登入 Messages 的 Mac 上運行。在 Linux 或 Windows 上，請將 `channels.imessage.cliPath` 設定為一個透過 SSH 連線到該 Mac 並執行 `imsg "$@"` 的包裝腳本。

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
    - 配對核准（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群組訊息被忽略">
    檢查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 許可清單行為
    - 提及模式配置 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="遠端附件失敗">
    檢查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 從閘道主機進行 SSH/SCP 金鑰驗證
    - 主機金鑰存在於閘道主機的 `~/.ssh/known_hosts` 中
    - 執行訊息 的 Mac 上遠端路徑的可讀性

  </Accordion>

  <Accordion title="macOS 權限提示被錯過">
    在相同的用戶/會話上下文中，於互動式 GUI 終端機重新執行並核准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    確認已為執行 OpenClaw/`imsg` 的程序上下文授予「完全磁碟存取權」+「自動化」。

  </Accordion>
</AccordionGroup>

## 設定參考指標

- [設定參考 - iMessage](/zh-Hant/gateway/config-channels#imessage)
- [閘道設定](/zh-Hant/gateway/configuration)
- [配對](/zh-Hant/channels/pairing)

## 相關

- [頻道總覽](/zh-Hant/channels) — 所有支援的頻道
- [移除 BlueBubbles 與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage) — 公告與移轉摘要
- [從 BlueBubbles 遷移](/zh-Hant/channels/imessage-from-bluebubbles) — 設定對照表與逐步切換指南
- [配對](/zh-Hant/channels/pairing) — DM 驗證與配對流程
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘門
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
