---
summary: "透過 BlueBubbles macOS 伺服器進行 iMessage 通訊 (REST 發送/接收、輸入指示、反應、配對、進階動作)。"
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

狀態：內建外掛，透過 HTTP 與 BlueBubbles macOS 伺服器通訊。由於其 API 豐富且設定比舊版 imsg 頻道簡單，**建議用於 iMessage 整合**。

<Note>目前的 OpenClaw 發行版本已內建 BlueBubbles，因此一般的封裝版本無需單獨進行 `openclaw plugins install` 步驟。</Note>

## 概覽

- 透過 BlueBubbles 輔助應用程式在 macOS 上執行 ([bluebubbles.app](https://bluebubbles.app))。
- 推薦/測試環境：macOS Sequoia (15)。macOS Tahoe (26) 也可運作；但在 Tahoe 上編輯功能目前損壞，且群組圖示更新可能回報成功卻未同步。
- OpenClaw 透過其 REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`) 與其通訊。
- 傳入訊息透過 webhooks 抵達；傳出回覆、輸入指示器、已讀回執和輕拍表情則透過 REST 呼叫發送。
- 附件和貼圖會被攝入為內傳媒體（並在可能的情況下顯示給代理人）。
- 合成 MP3 或 CAF 音訊的自動 TTS 回覆會以 iMessage 語音備忘錄氣泡的形式傳送，而非單純的檔案附件。
- 配對/允許清單的運作方式與其他頻道相同 (`/channels/pairing` 等)，需使用 `channels.bluebubbles.allowFrom` 加上配對碼。
- 反應會像 Slack/Telegram 一樣作為系統事件呈現，以便代理人在回覆前「提及」它們。
- 進階功能：編輯、取消傳送、回覆串接、訊息特效、群組管理。

## 快速開始

<Steps>
  <Step title="安裝 BlueBubbles">
    在您的 Mac 上安裝 BlueBubbles 伺服器（請遵循 [bluebubbles.app/install](https://bluebubbles.app/install) 的指示）。
  </Step>
  <Step title="啟用網頁 API">
    在 BlueBubbles 設定中，啟用網頁 API 並設定密碼。
  </Step>
  <Step title="設定 OpenClaw">
    執行 `openclaw onboard` 並選擇 BlueBubbles，或手動設定：

    ```json5
    {
      channels: {
        bluebubbles: {
          enabled: true,
          serverUrl: "http://192.168.1.100:1234",
          password: "example-password",
          webhookPath: "/bluebubbles-webhook",
        },
      },
    }
    ```

  </Step>
  <Step title="將 webhooks 指向閘道">
    將 BlueBubbles webhooks 指向您的閘道（例如：`https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`）。
  </Step>
  <Step title="啟動閘道">
    啟動閘道；它將註冊 webhook 處理程式並開始配對。
  </Step>
</Steps>

<Warning>
**安全性**

- 始終設定 webhook 密碼。
- 始終需要 webhook 身份驗證。OpenClaw 會拒絕 BlueBubbles webhook 請求，除非它們包含與 `channels.bluebubbles.password` 匹配的密碼/guid（例如 `?password=<password>` 或 `x-password`），無論環回/代理拓撲如何。
- 密碼身份驗證會在讀取/解析完整 webhook 主體之前進行檢查。
  </Warning>

## 保持 Messages.app 運作（VM / 無人值守設定）

某些 macOS VM / 常開設定可能會導致 Messages.app 變得「閒置」（在應用程式開啟/置於前景之前，傳入事件會停止）。一個簡單的解決方法是使用 AppleScript + LaunchAgent **每 5 分鐘喚醒一次 Messages**。

<Steps>
  <Step title="儲存 AppleScript">
    將此儲存為 `~/Scripts/poke-messages.scpt`：

    ```applescript
    try
      tell application "Messages"
        if not running then
          launch
        end if

        -- Touch the scripting interface to keep the process responsive.
        set _chatCount to (count of chats)
      end tell
    on error
      -- Ignore transient failures (first-run prompts, locked session, etc).
    end try
    ```

  </Step>
  <Step title="安裝 LaunchAgent">
    將此儲存為 `~/Library/LaunchAgents/com.user.poke-messages.plist`：

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
      <dict>
        <key>Label</key>
        <string>com.user.poke-messages</string>

        <key>ProgramArguments</key>
        <array>
          <string>/bin/bash</string>
          <string>-lc</string>
          <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
        </array>

        <key>RunAtLoad</key>
        <true/>

        <key>StartInterval</key>
        <integer>300</integer>

        <key>StandardOutPath</key>
        <string>/tmp/poke-messages.log</string>
        <key>StandardErrorPath</key>
        <string>/tmp/poke-messages.err</string>
      </dict>
    </plist>
    ```

    這會 **每 300 秒** 和 **登入時** 執行一次。首次執行可能會觸發 macOS **Automation** 提示（`osascript` → Messages）。請在執行 LaunchAgent 的相同使用者工作階段中核准它們。

  </Step>
  <Step title="載入它">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## 入門

BlueBubbles 可在互動式入門中使用：

```
openclaw onboard
```

精靈會提示輸入：

<ParamField path="Server URL" type="string" required>
  BlueBubbles 伺服器位址（例如 `http://192.168.1.100:1234`）。
</ParamField>
<ParamField path="Password" type="string" required>
  來自 BlueBubbles Server 設定的 API 密碼。
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Webhook 端點路徑。
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`、`allowlist`、`open` 或 `disabled`。
</ParamField>
<ParamField path="Allow list" type="string[]">
  電話號碼、電子郵件或聊天目標。
</ParamField>

您也可以透過 CLI 新增 BlueBubbles：

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## 存取控制（DM + 群組）

<Tabs>
  <Tab title="DMs">
    - 預設：`channels.bluebubbles.dmPolicy = "pairing"`。
    - 未知發送者會收到配對碼；訊息將被忽略，直到獲得核准（代碼在 1 小時後過期）。
    - 透過以下方式核准：
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - 配對是預設的權杖交換。詳情：[配對](/zh-Hant/channels/pairing)
  </Tab>
  <Tab title="Groups">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled`（預設：`allowlist`）。
    - 當設定 `allowlist` 時，`channels.bluebubbles.groupAllowFrom` 控制誰可以在群組中觸發機器人。
  </Tab>
</Tabs>

### 連絡人姓名充實（macOS，選用）

BlueBubbles 群組 webhook 通常只包含原始參與者位址。如果您希望 `GroupMembers` 語境改為顯示本機連絡人姓名，您可以選擇在 macOS 上啟用本機連絡人充實功能：

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` 啟用查詢。預設：`false`。
- 查詢僅在群組存取權限、指令授權和提及閘門允許訊息通過後才會執行。
- 只有未命名的電話參與者會被充實。
- 當找不到本機匹配項時，原始電話號碼會作為備案。

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### 提及閘門（群組）

BlueBubbles 支援群組聊天的提及閘控，與 iMessage/WhatsApp 的行為相符：

- 使用 `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）來偵測提及。
- 當為群組啟用 `requireMention` 時，代理人僅在被提及時回應。
- 來自授權發送者的控制指令會略過提及閘控。

每個群組的設定：

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // default for all groups
        "iMessage;-;chat123": { requireMention: false }, // override for specific group
      },
    },
  },
}
```

### 指令閘控

- 控制指令（例如 `/config`、`/model`）需要授權。
- 使用 `allowFrom` 和 `groupAllowFrom` 來判斷指令授權。
- 授權的發送者即使在群組中未提及也能執行控制指令。

### 每個群組的系統提示

`channels.bluebubbles.groups.*` 下的每個項目接受可選的 `systemPrompt` 字串。該值會在處理該群組訊息的每個回合中注入到代理人的系統提示，因此您可以設定每個群組的個性或行為規則，而無需編輯代理人提示：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

索引鍵會符合 BlueBubbles 回報的群組 `chatGuid` / `chatIdentifier` / 數字 `chatId`，而 `"*"` 萬用字元項目則為沒有完全符合的每個群組提供預設值（與 `requireMention` 和每個群組的工具政策使用相同的模式）。完全符合永遠優先於萬用字元。DM 會忽略此欄位；請改用代理人層級或帳號層級的提示自訂。

#### 實作範例：主旨回覆和輕觸反應（Private API）

啟用 BlueBubbles Private API 後，傳入訊息會帶有簡短的訊息 ID（例如 `[[reply_to:5]]`），並且代理人可以呼叫 `action=reply` 來回覆特定訊息，或呼叫 `action=react` 來傳送輕觸反應。每個群組的 `systemPrompt` 是讓代理人選擇正確工具的可靠方式：

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "When replying in this group, always call action=reply with the",
            "[[reply_to:N]] messageId from context so your response threads",
            "under the triggering message. Never send a new unlinked message.",
            "",
            "For short acknowledgements ('ok', 'got it', 'on it'), use",
            "action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓)",
            "instead of sending a text reply.",
          ].join(" "),
        },
      },
    },
  },
}
```

輕觸反應和主旨回覆都需要 BlueBubbles Private API；有關底層機制，請參閱[進階動作](#advanced-actions)和[訊息 ID](#message-ids-short-vs-full)。

## ACP 對話綁定

BlueBubbles 聊天可以轉換為持久的 ACP 工作區，而無需更改傳輸層。

快速操作員流程：

- 在私訊或允許的群組聊天中執行 `/acp spawn codex --bind here`。
- 該 BlueBubbles 對話中的後續訊息將路由到生成的 ACP 會話。
- `/new` 和 `/reset` 會就地重置同一個綁定的 ACP 會話。
- `/acp close` 會關閉 ACP 會話並移除綁定。

也支援通過頂層 `bindings[]` 條目搭配 `type: "acp"` 和 `match.channel: "bluebubbles"` 來配置持久綁定。

`match.peer.id` 可以使用任何支援的 BlueBubbles 目標形式：

- 標準化的私訊代碼，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

對於穩定的群組綁定，建議優先使用 `chat_id:*` 或 `chat_identifier:*`。

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
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

請參閱 [ACP Agents](/zh-Hant/tools/acp-agents) 以了解共享的 ACP 綁定行為。

## 輸入指示 + 已讀回執

- **輸入指示**：在生成回應之前和期間會自動發送。
- **已讀回執**：由 `channels.bluebubbles.sendReadReceipts` 控制（預設值：`true`）。
- **輸入指示**：OpenClaw 發送正在輸入的開始事件；BlueBubbles 會在發送或逾時時自動清除正在輸入的狀態（透過 DELETE 手動停止並不可靠）。

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## 進階操作

如果在配置中啟用，BlueBubbles 支援進階訊息操作：

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // edit sent messages (macOS 13+, broken on macOS 26 Tahoe)
        unsend: true, // unsend messages (macOS 13+)
        reply: true, // reply threading by message GUID
        sendWithEffect: true, // message effects (slam, loud, etc.)
        renameGroup: true, // rename group chats
        setGroupIcon: true, // set group chat icon/photo (flaky on macOS 26 Tahoe)
        addParticipant: true, // add participants to groups
        removeParticipant: true, // remove participants from groups
        leaveGroup: true, // leave group chats
        sendAttachment: true, // send attachments/media
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用操作">
    - **react**：新增/移除點回反應（`messageId`、`emoji`、`remove`）。iMessage 原生的點回集合為 `love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`。當代理選擇該集合以外的表情符號（例如 `👀`）時，反應工具會回退到 `love`，以便點回仍能正常呈現，而不是讓整個請求失敗。設定的確認反應仍會嚴格驗證，並在遇到未知值時報錯。 - **edit**：編輯已發送訊息（`messageId`、`text`）。 -
    **unsend**：取消發送訊息（`messageId`）。 - **reply**：回覆特定訊息（`messageId`、`text`、`to`）。 - **sendWithEffect**：搭配 iMessage 特效發送（`text`、`to`、`effectId`）。 - **renameGroup**：重新命名群組聊天（`chatGuid`、`displayName`）。 - **setGroupIcon**：設定群組聊天的圖示/照片（`chatGuid`、`media`）— 在 macOS 26 Tahoe 上不穩定（API 可能回傳成功，但圖示不會同步）。 -
    **addParticipant**：新增成員至群組（`chatGuid`、`address`）。 - **removeParticipant**：從群組移除成員（`chatGuid`、`address`）。 - **leaveGroup**：離開群組聊天（`chatGuid`）。 - **upload-file**：發送媒體/檔案（`to`、`buffer`、`filename`、`asVoice`）。 - 語音備忘錄：將 `asVoice: true` 設為 **MP3** 或 **CAF** 音訊以 iMessage 語音訊息形式發送。BlueBubbles 會在發送語音備忘錄時將 MP3 轉換為 CAF。 -
    舊版別名：`sendAttachment` 仍可運作，但 `upload-file` 是標準的操作名稱。
  </Accordion>
</AccordionGroup>

### 訊息 ID（簡短 vs 完整）

OpenClaw 可能會顯示*簡短*訊息 ID（例如 `1`、`2`）以節省 tokens。

- `MessageSid` / `ReplyToId` 可以是簡短 ID。
- `MessageSidFull` / `ReplyToIdFull` 包含提供者的完整 ID。
- 簡短 ID 僅儲存在記憶體中；它們會在重新啟動或快取被清除時過期。
- 動作接受簡短或完整的 `messageId`，但如果簡短 ID 不再可用，則會報錯。

對於持久性自動化和儲存，請使用完整 ID：

- 範本：`{{MessageSidFull}}`、`{{ReplyToIdFull}}`
- 內文：輸入負載中的 `MessageSidFull` / `ReplyToIdFull`

關於範本變數，請參閱 [設定](/zh-Hant/gateway/configuration)。

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合併拆分發送的私訊（一次編排中的指令 + URL）

當使用者在 iMessage 中同時輸入指令和 URL 時 — 例如 `Dump https://example.com/article` — Apple 會將發送拆分為**兩個單獨的 webhook 傳遞**：

1. 一則文字訊息（`"Dump"`）。
2. 一個 URL 預覽氣球（`"https://..."`），其中包含 OG 預覽圖片作為附件。

這兩個 webhook 在大多數設定中會相隔約 0.8-2.0 秒到達 OpenClaw。如果沒有合併，代理程式會在第 1 輪單獨收到指令，回覆（通常是「傳送 URL 給我」），然後才在第 2 輪看到 URL — 此時指令語境已經遺失。

`channels.bluebubbles.coalesceSameSenderDms` 可選擇將私訊設為將連續相同發送者的 webhook 合併為單一代理程式輪次。群組聊天則繼續按每則訊息設定鍵值，以保留多使用者輪次結構。

<Tabs>
  <Tab title="何時啟用">
    啟用時機：

    - 您推出的技能預期 `command + payload` 會出現在同一則訊息中（傾印、貼上、儲存、佇列等）。
    - 您的使用者會在指令旁貼上 URL、圖片或長內容。
    - 您可以接受增加的私訊輪次延遲（見下文）。

    保持停用時機：

    - 您需要單字私訊觸發器的最低指令延遲。
    - 您所有的流程都是沒有後續負載的一次性指令。

  </Tab>
  <Tab title="啟用">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    開啟此標誌且沒有明確的 `messages.inbound.byChannel.bluebubbles` 時，防抖時間窗口會擴大到 **2500 毫秒**（非合併模式下的預設值為 500 毫秒）。更寬的窗口是必要的——Apple 的分拆發送節奏為 0.8-2.0 秒，無法適應原本較緊的預設值。

    若要自行調整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is slow
            // or under memory pressure (observed gap can stretch past 2 s then).
            bluebubbles: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="權衡">
    - **增加了 DM 控制指令的延遲。** 開啟此標誌後，DM 控制指令訊息（如 `Dump`、`Save` 等）現在在發送前會等待最多防抖窗口的時間，以防有 payload webhook 即將到來。群組聊天指令則保持即時發送。
    - **合併輸出是有上限的**——合併後的文字上限為 4000 個字元，並帶有明確的 `…[truncated]` 標記；附件上限為 20 個；來源條目上限為 10 個（超出部分僅保留第一個和最新的一個）。每個來源 `messageId` 仍會進入入站去重，因此稍後對任何單一事件的 MessagePoller 重播都會被識別為重複項。
    - **可選功能，按頻道設定。** 其他頻道（Telegram、WhatsApp、Slack 等）不受影響。
  </Tab>
</Tabs>

### 場景與代理看到的內容

| 使用者組合                                        | Apple 傳遞                 | 標誌關閉（預設）                            | 標誌開啟 + 2500 毫秒窗口                                     |
| ------------------------------------------------- | -------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `Dump https://example.com` （一次發送）           | 2 個 webhook，間隔約 1 秒  | 兩次代理輪次：先是單獨的 "Dump"，然後是 URL | 一次輪次：合併的文字 `Dump https://example.com`              |
| `Save this 📎image.jpg caption` （附件 + 文字）   | 2 個 webhook               | 兩次輪次                                    | 一次輪次：文字 + 圖片                                        |
| `/status` （獨立指令）                            | 1 個 webhook               | 即時發送                                    | **等待至視窗結束，然後發送**                                 |
| 單獨貼上 URL                                      | 1 個 webhook               | 即時發送                                    | 即時發送（桶中只有一個條目）                                 |
| 文字和 URL 作為兩條刻意分開的訊息發送，間隔數分鐘 | 2 個 webhook，位於窗口之外 | 兩次輪次                                    | 兩次輪次（窗口在它們之間過期）                               |
| 快速湧入（窗口內超過 10 條小型 DM）               | N 個 webhook               | N 次輪次                                    | 一次輪次，輸出受限（僅第一個 + 最新一個，套用文字/附件上限） |

### 分拆發送合併疑難排解

如果標誌已開啟但分拆發送仍以兩次輪次到達，請檢查每個層級：

<AccordionGroup>
  <Accordion title="Config actually loaded">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    然後 `openclaw gateway restart` — 該標誌在建立 debouncer-registry 時讀取。

  </Accordion>
  <Accordion title="Debounce window wide enough for your setup">
    查看 BlueBubbles 伺服器日誌中的 `~/Library/Logs/bluebubbles-server/main.log`：

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    測量 `"Dump"` 風格的文字發送與隨後的 `"https://..."; Attachments:` 發送之間的間隔。提高 `messages.inbound.byChannel.bluebubbles` 以寬裕地覆蓋該間隔。

  </Accordion>
  <Accordion title="Session JSONL timestamps ≠ webhook arrival">
    Session 事件時間戳 (`~/.openclaw/agents/<id>/sessions/*.jsonl`) 反映的是 gateway 將訊息傳遞給代理的時間，**而不是** webhook 到達的時間。標記為 `[Queued messages while agent was busy]` 的排隊第二則訊息表示在第二個 webhook 到達時第一輪仍在執行中 —— 合併桶已經排空了。請根據 BB 伺服器日誌而非 session 日誌來調整視窗。
  </Accordion>
  <Accordion title="Memory pressure slowing reply dispatch">
    在較小的機器 (8 GB) 上，代理執行回合可能耗時過長，導致合併桶在回覆完成前就已排空，URL 會作為排隊的第二回合落區。請檢查 `memory_pressure` 和 `ps -o rss -p $(pgrep openclaw-gateway)`；如果 gateway 超過約 500 MB RSS 且壓縮器正在運作，請關閉其他重度程序或升級到更大的主機。
  </Accordion>
  <Accordion title="Reply-quote sends are a different path">
    如果使用者將 `Dump` 作為現有 URL 氣球的 **回覆** 輕觸 (iMessage 會在 Dump 氣球上顯示「1 Reply」徽章)，則 URL 存在於 `replyToBody` 中，而不在第二個 webhook 中。合併並不適用 —— 這是 skill/prompt 的考量，而非 debouncer 的考量。
  </Accordion>
</AccordionGroup>

## 區塊串流

控制回應是作為單一訊息發送還是區塊串流：

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## 媒體 + 限制

- 傳入的附件會下載並儲存在媒體快取中。
- 透過 `channels.bluebubbles.mediaMaxMb` 設定傳入及傳出媒體的大小上限（預設：8 MB）。
- 傳出的文字會分割為 `channels.bluebubbles.textChunkLimit`（預設：4000 個字元）。

## 設定參考

完整設定：[Configuration](/zh-Hant/gateway/configuration)

<AccordionGroup>
  <Accordion title="連線與 Webhook">
    - `channels.bluebubbles.enabled`：啟用/停用此頻道。
    - `channels.bluebubbles.serverUrl`：BlueBubbles REST API 的基礎網址。
    - `channels.bluebubbles.password`：API 密碼。
    - `channels.bluebubbles.webhookPath`：Webhook 端點路徑（預設：`/bluebubbles-webhook`）。
  </Accordion>
  <Accordion title="存取政策">
    - `channels.bluebubbles.dmPolicy`：`pairing | allowlist | open | disabled`（預設：`pairing`）。
    - `channels.bluebubbles.allowFrom`：DM 允許清單（handles、電子郵件、E.164 號碼、`chat_id:*`、`chat_guid:*`）。
    - `channels.bluebubbles.groupPolicy`：`open | allowlist | disabled`（預設：`allowlist`）。
    - `channels.bluebubbles.groupAllowFrom`：群組傳送者允許清單。
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts`：在 macOS 上，通過閘道檢查後，可選擇性地從本機聯絡人補充未具名的群組參與者。預設：`false`。
    - `channels.bluebubbles.groups`：各群組設定（`requireMention` 等）。
  </Accordion>
  <Accordion title="Delivery and chunking">
    - `channels.bluebubbles.sendReadReceipts`: 發送已讀回執（預設值：`true`）。
    - `channels.bluebubbles.blockStreaming`: 啟用區塊串流（預設值：`false`；串流回覆所需）。
    - `channels.bluebubbles.textChunkLimit`: 外發區塊大小，以字元為單位（預設值：4000）。
    - `channels.bluebubbles.sendTimeoutMs`: 透過 `/api/v1/message/text` 發送外發文字的單次請求逾時時間，以毫秒為單位（預設值：30000）。在 macOS 26 設定上調高此值，因為 Private API iMessage 發送可能在 iMessage 框架內停頓 60 秒以上；例如 `45000` 或 `60000`。探測、聊天查詢、反應、編輯和健康檢查目前維持較短的 10 秒預設值；計畫作為後續追蹤工作將反應和編輯納入涵蓋範圍。個別帳號覆寫：`channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`。
    - `channels.bluebubbles.chunkMode`: `length`（預設值）僅在超過 `textChunkLimit` 時分割；`newline` 會在空白行（段落邊界）處分割，然後再進行長度分割。
  </Accordion>
  <Accordion title="Media and history">
    - `channels.bluebubbles.mediaMaxMb`: 內送/外發媒體大小上限，以 MB 為單位（預設值：8）。
    - `channels.bluebubbles.mediaLocalRoots`: 明確允許用於外發本機媒體路徑的絕對本機目錄清單。除非設定此項，否則預設會拒絕本機路徑發送。個別帳號覆寫：`channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`。
    - `channels.bluebubbles.coalesceSameSenderDms`: 將連續相同發送者的私訊 webhook 合併為單一代理輪次，使 Apple 的文字+URL 分割發送會以單一訊息形式到達（預設值：`false`）。請參閱 [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) 以了解情境、視窗調整與取捨。若在未指定 `messages.inbound.byChannel.bluebubbles` 的情況下啟用，會將預設的內送防彈跳視窗從 500 毫秒加寬至 2500 毫秒。
    - `channels.bluebubbles.historyLimit`: 用於背景的群組訊息數量上限（0 表示停用）。
    - `channels.bluebubbles.dmHistoryLimit`: 私訊歷史記錄限制。
  </Accordion>
  <Accordion title="Actions and accounts">
    - `channels.bluebubbles.actions`：啟用/停用特定動作。
    - `channels.bluebubbles.accounts`：多重帳號設定。
  </Accordion>
</AccordionGroup>

相關的全域選項：

- `agents.list[].groupChat.mentionPatterns` (或 `messages.groupChat.mentionPatterns`)。
- `messages.responsePrefix`。

## 定址 / 傳送目標

為了穩定的路由，建議使用 `chat_guid`：

- `chat_guid:iMessage;-;+15555550123` (群組建議使用)
- `chat_id:123`
- `chat_identifier:...`
- 直接代碼： `+15555550123`、`user@example.com`
  - 如果直接代碼沒有既有的 DM 聊天，OpenClaw 將透過 `POST /api/v1/chat/new` 建立一個。這需要啟用 BlueBubbles Private API。

### iMessage 與 SMS 路由

當同一個代碼在 Mac 上同時擁有 iMessage 和 SMS 聊天時（例如一個已註冊 iMessage 但也收到過綠色氣泡簡訊的電話號碼），OpenClaw 優先選擇 iMessage 聊天，且不會自動降級為 SMS。若要強制使用 SMS 聊天，請使用明確的 `sms:` 目標前綴 (例如 `sms:+15555550123`)。沒有匹配 iMessage 聊天的代碼，仍然會透過 BlueBubbles 回報的任何聊天進行發送。

## 安全性

- Webhook 請求是透過比對 `guid`/`password` 查詢參數或標頭與 `channels.bluebubbles.password` 來進行驗證。
- 請將 API 密碼和 webhook 端點保密（將其視為憑證）。
- BlueBubbles webhook 驗證沒有 localhost 繞過機制。如果您代理 webhook 流量，請確保 BlueBubbles 密碼在請求中端對端傳遞。`gateway.trustedProxies` 在此並不會取代 `channels.bluebubbles.password`。請參閱 [Gateway security](/zh-Hant/gateway/security#reverse-proxy-configuration)。
- 如果將 BlueBubbles 伺服器暴露在區域網路 (LAN) 之外，請在其上啟用 HTTPS + 防火牆規則。

## 疑難排解

- 如果輸入/已讀事件停止運作，請檢查 BlueBubbles webhook 日誌，並確認閘道路徑符合 `channels.bluebubbles.webhookPath`。
- 配對碼的有效期為一小時；請使用 `openclaw pairing list bluebubbles` 和 `openclaw pairing approve bluebubbles <code>`。
- 反應功能需要 BlueBubbles 私有 API (`POST /api/v1/message/react`)；請確保伺服器版本已公開該 API。
- 編輯/取消傳送需要 macOS 13+ 及相容的 BlueBubbles 伺服器版本。在 macOS 26 (Tahoe) 上，由於私有 API 變更，編輯功能目前無法使用。
- 在 macOS 26 (Tahoe) 上，群組圖示更新可能不穩定：API 可能會回傳成功，但新圖示並未同步。
- OpenClaw 會根據 BlueBubbles 伺服器的 macOS 版本自動隱藏已知無法使用的動作。如果在 macOS 26 (Tahoe) 上仍顯示編輯選項，請使用 `channels.bluebubbles.actions.edit=false` 手動停用它。
- 已啟用 `coalesceSameSenderDms` 但拆分傳送 (例如 `Dump` + URL) 仍以兩個輪次抵達：請參閱 [split-send coalescing troubleshooting](#split-send-coalescing-troubleshooting) 檢查清單 — 常見原因包括防抖視窗過於緊湊、session-log 時間戳記被誤讀為 webhook 抵達時間，或是回覆引用傳送 (使用 `replyToBody`，而非第二個 webhook)。
- 若要查看狀態/健康資訊：`openclaw status --all` 或 `openclaw status --deep`。

如需一般通道工作流程參考，請參閱 [Channels](/zh-Hant/channels) 和 [Plugins](/zh-Hant/tools/plugin) 指南。

## 相關

- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [Channels Overview](/zh-Hant/channels) — 所有支援的通道
- [Groups](/zh-Hant/channels/groups) — 群組聊天行為與提及控管
- [Pairing](/zh-Hant/channels/pairing) — 私訊認證與配對流程
- [Security](/zh-Hant/gateway/security) — 存取模型與強化措施
