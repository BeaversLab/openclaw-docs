---
summary: "設定概覽：常見任務、快速設置，以及完整參考的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "設定"
---

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取可選的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定檔。
有效的設定路徑必須是一個一般檔案。OpenClaw 的寫入操作不支援 `openclaw.json` 的符號連結配置；原子寫入可能會替換該路徑，而不保留符號連結。如果您將設定檔保留在預設狀態目錄之外，請將 `OPENCLAW_CONFIG_PATH` 直接指向真實檔案。

如果檔案不存在，OpenClaw 會使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒機制或自動化 (cron, hooks)
- 調整工作階段、媒體、網路或 UI

請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference) 以了解所有可用欄位。

代理程式和自動化工具在編輯設定前應使用 `config.schema.lookup` 以取得確切的欄位層級文件。請使用本頁進行任務導向的指引，並參閱 [設定參考](/zh-Hant/gateway/configuration-reference) 以了解更廣泛的欄位對應和預設值。

<Tip>**剛接觸設定嗎？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定檔。</Tip>

## 最精簡設定

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 編輯設定

<Tabs>
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據即時設定架構呈現表單，包括欄位 `title` / `description` 文件元資料，以及在可用時的外掛和通道架構，並提供 **Raw JSON** 編輯器作為備用方案。對於深入層級的 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點以及直接子摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的設定。未知的金鑰、格式錯誤的類型或無效的值會導致 Gateway **拒絕啟動**。唯一根層級的例外是 `$schema` (字串)，因此編輯器可以附加 JSON Schema 元資料。</Warning>

`openclaw config schema` 會列印出 Control UI 和驗證所使用的標準 JSON Schema。`config.schema.lookup` 會擷取單一路徑範圍的節點以及子摘要，以便用於深入工具。欄位 `title`/`description` 文件中繼資料會傳遞至巢狀物件、萬用字元 (`*`)、陣列項目 (`[]`) 以及 `anyOf`/`oneOf`/`allOf` 分支。當載入資訊清單註冊表時，執行時期外掛程式和通道的 Schema 會一併合併。

當驗證失敗時：

- Gateway 無法啟動
- 只有診斷指令可用 (`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`)
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

Gateway 在每次成功啟動後會保留一份受信任的「最後已知良好」副本，但啟動和熱重新載入並不會自動還原它。如果 `openclaw.json` 驗證失敗 (包括外掛程式本機驗證)，Gateway 啟動將會失敗，或者會跳過重新載入，且目前的執行時期會保留最後接受的設定。執行 `openclaw doctor --fix` (或 `--yes`) 以修復加上前綴/被覆寫的設定或還原「最後已知良好」的副本。當候選項包含已編輯的秘密預留位置 (例如 `***`) 時，將會跳過升級為「最後已知良好」的程序。

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道在 `channels.<provider>` 下都有自己的配置部分。請參閱專屬頻道頁面了解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) - `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) - `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) - `channels.discord`
    - [Feishu](/zh-Hant/channels/feishu) - `channels.feishu`
    - [Google Chat](/zh-Hant/channels/googlechat) - `channels.googlechat`
    - [Microsoft Teams](/zh-Hant/channels/msteams) - `channels.msteams`
    - [Slack](/zh-Hant/channels/slack) - `channels.slack`
    - [Signal](/zh-Hant/channels/signal) - `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) - `channels.imessage`
    - [Mattermost](/zh-Hant/channels/mattermost) - `channels.mattermost`

    所有頻道共用相同的 DM 政策模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="選擇並配置模型">
    設定主要模型和可選的備用模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單；`provider/*` 條目會過濾 `/model`、`/models` 和模型選擇器至選定的供應商，同時仍使用動態模型探索。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 新增允許清單條目而不移除現有模型。會移除條目的單純替換會被拒絕，除非您傳遞 `--replace`。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖像的縮小比例（預設 `1200`）；較低的值通常會在螢幕截圖密集的執行中減少視覺 token 的使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和備用行為。
    - 對於自訂/自託管供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    DM 存取權透過 `dmPolicy` 依管道控制：

    - `"pairing"`（預設）：未知的發送者會收到一次性配對代碼以進行核准
    - `"allowlist"`：僅限 `allowFrom` 中的發送者（或配對的允許儲存空間）
    - `"open"`：允許所有傳入 DM（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    請參閱 [完整參考](/zh-Hant/gateway/config-channels#dm-and-group-access) 以了解各管道的詳細資訊。

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    群組訊息預設為**需要提及**。請為每個代理程式設定觸發模式。一般的群組/頻道回覆會自動張貼；在代理程式應決定何時發言的共享聊天室中，選擇加入 message-tool 路徑：

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // set "message_tool" to require message-tool sends everywhere
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **中繼資料提及**：原生 @-提及（WhatsApp 點擊提及、Telegram @bot 等）
    - **文字模式**：`mentionPatterns` 中的安全正規表示式模式
    - **可見回覆**：`messages.visibleReplies` 可以全域要求使用 message-tool 傳送；`messages.groupChat.visibleReplies` 則會針對群組/頻道覆寫該設定。
    - 請參閱[完整參考資料](/zh-Hant/gateway/config-channels#group-chat-mention-gating)以了解可見回覆模式、各頻道覆寫設定以及自聊模式。

  </Accordion>

  <Accordion title="限制每個代理程式的技能">
    使用 `agents.defaults.skills` 作為共用基準，然後使用 `agents.list[].skills` 覆寫特定代理程式：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - 省略 `agents.defaults.skills` 以預設允許無限制的技能。
    - 省略 `agents.list[].skills` 以繼承預設值。
    - 將 `agents.list[].skills: []` 設定為無技能。
    - 請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 以及[組態參考](/zh-Hant/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整閘道頻道健康監控">
    控制閘道重啟看起來已失效的頻道之積極程度：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - 設定 `gateway.channelHealthCheckMinutes: 0` 以全域停用健康監控重啟。
    - `channelStaleEventThresholdMinutes` 應大於或等於檢查間隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 以停用單一頻道或帳戶的自動重啟，而無需停用全域監控器。
    - 請參閱 [健康檢查](/zh-Hant/gateway/health) 以進行營運除錯，並參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#gateway)以了解所有欄位。

  </Accordion>

  <Accordion title="調整閘道 WebSocket 握手逾時">
    為負載較高或低效能主機上的本地用戶端提供更多時間以完成預先認證的 WebSocket 握手：

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - 預設為 `15000` 毫秒。
    - `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 對於一次性服務或 Shell 覆蓋仍具有優先權。
    - 優先修復啟動/事件迴圈停頓；此選項適用於健康但在預熱期間緩慢的主機。

  </Accordion>

  <Accordion title="設定會話與重置">
    會話控制對話的連續性和隔離性：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`：`main` (共用) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：執行緒綁定會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 請參閱 [會話管理](/zh-Hant/concepts/session) 以了解範圍、身分連結和傳送原則。
    - 請參閱 [完整參考](/zh-Hant/gateway/config-agents#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒機制">
    在隔離的沙盒執行時期中執行代理程式會話：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    請先建構映像檔——從原始碼检出執行 `scripts/sandbox-setup.sh`，或從 npm 安裝請參閱 [沙盒機制 § 映像檔與設定](/zh-Hant/gateway/sandboxing#images-and-setup) 中的內聯 `docker build` 指令。

    請參閱 [沙盒機制](/zh-Hant/gateway/sandboxing) 了解完整指南，以及 [完整參考](/zh-Hant/gateway/config-agents#agentsdefaultssandbox) 了解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用中繼支援的推送">
    中繼支援的推送是在 `openclaw.json` 中配置的。

    在 gateway config 中設定此項：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    CLI 對應指令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 允許 gateway 透過外部中繼發送 `push.test`、喚醒輕推 (wake nudges) 和重新連線喚醒 (reconnect wakes)。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍發送授權 (registration-scoped send grant)。Gateway 不需要部署範圍的中繼權杖 (relay token)。
    - 將每個中繼支援的註冊綁定到 iOS 應用程式配對的 gateway 身份，因此另一個 gateway 無法重複使用儲存的註冊資訊。
    - 讓本地/手動的 iOS 版本保持使用直接 APNs。中繼支援的發送僅適用於透過中繼註冊的官方發行版本。
    - 必須符合內建於官方/TestFlight iOS 版本中的中繼基礎 URL (relay base URL)，以便註冊和發送流量到達同一個中繼部署。

    端到端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓 node 和 operator 會話都進行連線。
    4. iOS 應用程式會取得 gateway 身份，使用 App Attest 和應用程式收據向中繼註冊，然後將中繼支援的 `push.apns.register` payload 發布到配對的 gateway。
    5. Gateway 儲存中繼控制代碼 (relay handle) 和發送授權，然後將其用於 `push.test`、喚醒輕推和重新連線喚醒。

    營運注意事項：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，使其能夠發布綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重用舊的中繼來源 (relay origin)。

    相容性注意事項：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境變數覆寫。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍僅作為回送開發的緊急出口；請勿在設定中保存 HTTP 中繼 URL。

    請參閱 [iOS 應用程式](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端到端流程，並參閱 [驗證與信任流程](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全性模型。

  </Accordion>

  <Accordion title="設定心跳（定期檢查）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`: 持續時間字串 (`30m`, `2h`)。設定為 `0m` 以停用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron jobs">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: 從 `sessions.json` 中修剪已完成的隔離執行工作階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`: 依大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概述和 CLI 範例。

  </Accordion>

  <Accordion title="設定 Webhooks (hooks)">
    在 Gateway 上啟用 HTTP webhook 端點：

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    安全性備註：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；請勿重複使用共用的 Gateway 權杖。
    - Hook 驗證僅限標頭（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查詢字串權杖將被拒絕。
    - `hooks.path` 無法被 `/`；請將 webhook 入口保留在專用子路徑上，例如 `/hooks`。
    - 除非進行嚴格範圍的除錯，否則請停用不安全內容略過旗標（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選擇的會話金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具政策（例如僅限訊息傳遞以及盡可能使用沙箱）。

    參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#hooks)以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="設定多代理程式路由">
    使用獨立的工作區和會話執行多個隔離的代理程式：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/config-agents#multi-agent-routing) 以了解繫結規則和每個代理程式的存取設定檔。

  </Accordion>

  <Accordion title="將設定拆分為多個檔案 ($include)">
    使用 `$include` 來組織大型設定：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **單一檔案**：取代包含的物件
    - **檔案陣列**：依序深度合併（後者優先）
    - **同層級鍵**：在引入後合併（覆蓋引入的值）
    - **巢狀引入**：最多支援 10 層深度
    - **相對路徑**：相對於引入檔案解析
    - **OpenClaw 擁有的寫入**：當寫入作業僅變更由單一檔案引入支援的
      一個頂層區段（例如 `plugins: { $include: "./plugins.json5" }`）時，OpenClaw
      會更新該被引入的檔案，並保持 `openclaw.json` 完整無缺
    - **不支援的直寫**：根引入、引入陣列，以及具有同層級覆寫的引入，對於
      OpenClaw 擁有的寫入會封鎖失敗，而非扁平化設定
    - **隔離**：`$include` 路徑必須解析在持有
      `openclaw.json` 的目錄下。若要跨機器或使用者共享樹狀結構，
      請將 `OPENCLAW_INCLUDE_ROOTS` 設定為額外目錄的路徑清單
      （POSIX 上為 `:`，Windows 上為 `;`），
      這些目錄是引入項可能參考的目標。符號連結會被解析並重新檢查，因此
      字面上位於設定目錄中但實際目標逸出所有允許根目錄的路徑仍會被拒絕。
    - **錯誤處理**：針對遺失檔案、解析錯誤和循環引入提供明確的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定熱重新載入

Gateway 會監看 `~/.openclaw/openclaw.json` 並自動套用變更 —— 大多數設定無需手動重新啟動。

直接檔案編輯在驗證前會被視為不受信任。監看器會等待編輯器的暫時寫入/重新命名
混亂平息後，讀取最終檔案，並在不重寫 `openclaw.json` 的情況下
拒絕無效的外部編輯。OpenClaw 擁有的設定寫入在寫入前也會使用相同的 schema 閘道；
諸如捨棄 `gateway.mode` 或將檔案縮減超過一半等破壞性覆寫都會
被拒絕，並另存為 `.rejected.*` 以供檢查。

如果您看到 `config reload skipped (invalid config)` 或啟動時報告 `Invalid
config`, inspect the config, run `openclaw config validate`, then run `openclaw
doctor --fix` 進行修復。有關檢查清單，請參閱 [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)。

### 重載模式

| 模式                | 行為                                                      |
| ------------------- | --------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全變更。對於關鍵變更則會自動重新啟動。        |
| **`hot`**           | 僅熱套用安全的變更。當需要重新啟動時記錄警告 - 由您處理。 |
| **`restart`**       | 在任何配置變更時重新啟動 Gateway，無論是否安全。          |
| **`off`**           | 停用檔案監控。變更將在下次手動重新啟動時生效。            |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 何者可熱套用 vs 何者需要重新啟動

大多數欄位可在無停機情況下熱套用。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                    | 需要重新啟動？ |
| -------------- | ------------------------------------------------------- | -------------- |
| 頻道           | `channels.*`、`web` (WhatsApp) - 所有內建和外掛程式頻道 | 否             |
| 代理與模型     | `agent`、`agents`、`models`、`routing`                  | 否             |
| 自動化         | `hooks`、`cron`、`agent.heartbeat`                      | 否             |
| 會話與訊息     | `session`、`messages`                                   | 否             |
| 工具與媒體     | `tools`、`browser`、`skills`、`mcp`、`audio`、`talk`    | 否             |
| 介面與其他     | `ui`、`logging`、`identity`、`bindings`                 | 否             |
| Gateway 伺服器 | `gateway.*` (port、bind、auth、tailscale、TLS、HTTP)    | **是**         |
| 基礎架構       | `discovery`、`plugins`                                  | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 - 更改它們 **不會** 觸發重新啟動。</Note>

### 重新載入規劃

當您編輯透過 `$include` 參照的來源檔案時，OpenClaw 會根據
來源建立的佈局進行重新載入規劃，而不是扁平化的記憶體內檢視。
這使得熱重新載入決策 (熱套用 vs 重新啟動) 即使在單一頂層區段位於其獨立的包含檔案 (例如
`plugins: { $include: "./plugins.json5" }`) 中時也能保持可預測性。如果來源佈局不明確，重新載入規劃將會失敗關閉。

## Config RPC（程式化更新）

對於透過 Gateway API 寫入配置的工具，建議採用以下流程：

- `config.schema.lookup` 用於檢查單一子樹（淺層架構節點 + 子摘要）
- `config.get` 用於擷取目前的快照加上 `hash`
- `config.patch` 用於部分更新（JSON 合併修補：物件合併、`null` 刪除、陣列替換）
- 僅當您打算替換整個設定時使用 `config.apply`
- `update.run` 用於明確的自我更新加上重新啟動；當重新啟動後的工作階段應執行一次後續輪次時，包含 `continuationMessage`
- `update.status` 用於檢查最新的更新重新啟動標記並在重新啟動後驗證執行版本

Agent 應將 `config.schema.lookup` 視為確切欄位層級文件與約束條件的首選。當它們需要更廣泛的設定對應、預設值或專用子系統參考的連結時，請使用 [Configuration reference](/zh-Hant/gateway/configuration-reference)

<Note>控制平面寫入（`config.apply`、`config.patch`、`update.run`）限制速率為每個 `deviceId+clientIp` 每 60 秒 3 個請求。重新啟動請求會合併，然後在重新啟動週期之間強制執行 30 秒的冷卻時間。 `update.status` 是唯讀的，但是管理員範圍，因為重新啟動標記可以包含更新步驟摘要和命令輸出尾部。</Note>

部分修補範例：

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。當設定已存在時，這兩種方法都需要 `baseHash`。

## 環境變數

OpenClaw 從父程序以及以下來源讀取環境變數：

- `.env` 來自目前工作目錄（如果存在）
- `~/.openclaw/.env`（全域備援）

這兩個檔案都不會覆蓋既有的環境變數。您也可以在設定中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 環境變數匯入（選用）">
  若啟用此功能且未設定預期的金鑰，OpenClaw 將執行您的登入 Shell 並僅匯入缺失的金鑰：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

同等環境變數：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="設定值中的環境變數替換">
  您可以在任何設定字串值中使用 `${VAR_NAME}` 參照環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時擲回錯誤
- 使用 `$${VAR}` 進行跳脫以取得字面輸出
- 適用於 `$include` 檔案內部
- 內聯替換：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret 參照（env、file、exec）">
  對於支援 SecretRef 物件的欄位，您可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 詳細資訊（包括 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

如需完整的優先順序與來源，請參閱 [Environment](/zh-Hant/help/environment)。

## 完整參考

如需完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
- [Gateway runbook](/zh-Hant/gateway)
