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

請參閱[完整參考](/zh-Hant/gateway/configuration-reference)以了解每個可用欄位。

代理程式和自動化工具應在編輯配置前使用 `config.schema.lookup` 取得確切的欄位層級文件。請使用本頁面取得以任務為導向的指引，並參閱[Configuration reference](/zh-Hant/gateway/configuration-reference)以了解完整的欄位對映和預設值。

<Tip>**剛開始接觸設定？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [Configuration Examples](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據即時設定架構呈現表單，包括欄位 `title` / `description` 文件中繼資料，以及外掛和通道架構（如果可用），並提供 **Raw JSON** 編輯器作為備選方案。對於下鑽式 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點及其直接子項摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [hot reload](#config-hot-reload)）。</Tab>
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
    每個頻道都在 `channels.<provider>` 下有自己的配置區段。請參閱專屬的頻道頁面以取得設定步驟：

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
    設定主要模型與可選的後備方案：

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

    - `agents.defaults.models` 定義了型錄並充當 `/model` 的允許清單；`provider/*` 項目會將 `/model`、`/models` 和模型選擇器篩選為選定的供應商，同時仍使用動態模型探索。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 來新增允許清單項目，而不移除現有的模型。會移除項目的純替換操作會被拒絕，除非您傳遞了 `--replace`。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖片的縮小比例（預設 `1200`）；較低的值通常會減少大量擷圖執行時的視覺 token 使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和後備行為。
    - 關於自訂/自託管的供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    DM 存取權透過 `dmPolicy` 依管道控制：

    - `"pairing"`（預設）：未知發送者會收到一次性配對代碼以供核准
    - `"allowlist"`：僅限 `allowFrom`（或已配對的允許儲存）中的發送者
    - `"open"`：允許所有傳入的 DM（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    如需每個管道的詳細資訊，請參閱 [完整參考](/zh-Hant/gateway/config-channels#dm-and-group-access)。

  </Accordion>

  <Accordion title="設定群組聊天提及閘門">
    群組訊息預設為**需要提及**。請為每個代理設定觸發模式。一般的群組/頻道回覆會自動發布；對於代理應決定何時發言的共用聊天室，請選擇訊息工具路徑：

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

    - **中繼資料提及**：原生的 @-提及（WhatsApp 點擊提及、Telegram @bot 等）
    - **文字模式**：`mentionPatterns` 中的安全 regex 模式
    - **可見回覆**：`messages.visibleReplies` 可以全域要求使用訊息工具發送；`messages.groupChat.visibleReplies` 會針對群組/頻道覆寫該設定。
    - 請參閱[完整參考資料](/zh-Hant/gateway/config-channels#group-chat-mention-gating)以了解可見回覆模式、各頻道覆寫以及自我聊天模式。

  </Accordion>

  <Accordion title="限制各代理的技能">
    使用 `agents.defaults.skills` 作為共用基準，然後使用 `agents.list[].skills` 覆寫特定代理：

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

    - 省略 `agents.defaults.skills` 以預設啟用無限制技能。
    - 省略 `agents.list[].skills` 以繼承預設值。
    - 設定 `agents.list[].skills: []` 以不使用任何技能。
    - 請參閱[技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config)以及[設定參考資料](/zh-Hant/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整閘道頻道健康監控">
    控制閘道以多積極的方式重新啟動看起來過時的頻道：

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

    - 設定 `gateway.channelHealthCheckMinutes: 0` 以全域停用健康監控重新啟動。
    - `channelStaleEventThresholdMinutes` 應大於或等於檢查間隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 來停用單一頻道或帳戶的自動重新啟動，而無需停用全域監控器。
    - 請參閱[健康檢查](/zh-Hant/gateway/health)以進行操作調試，並參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#gateway)以了解所有欄位。

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

  <Accordion title="設定會話與重設">
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

    - `dmScope`: `main` (共用) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 繫結至執行緒之會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 與 `/session max-age`)。
    - 請參閱 [會話管理](/zh-Hant/concepts/session) 以了解範圍、身分連結與傳送原則。
    - 請參閱 [完整參考](/zh-Hant/gateway/config-agents#session) 以查看所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒">
    在隔離的沙盒執行環境中執行代理程式會話：

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

    請先建構映像檔 —— 從原始碼檢出執行 `scripts/sandbox-setup.sh`，或是從 npm 安裝查看 [沙盒 § 映像檔與設定](/zh-Hant/gateway/sandboxing#images-and-setup) 中內嵌的 `docker build` 指令。

    請參閱 [沙盒](/zh-Hant/gateway/sandboxing) 取得完整指南，並參閱 [完整參考](/zh-Hant/gateway/config-agents#agentsdefaultssandbox) 以查看所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用基於轉發的推送">
    基於轉發的推送在 `openclaw.json` 中設定。

    在閘道設定中設定此項：

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

    CLI 對等寫法：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 允許閘道透過外部轉發站發送 `push.test`、喚醒推撥和重連喚醒。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍發送授權。閘道不需要部署範圍的轉發權杖。
    - 將每個基於轉發的註冊綁定到 iOS 應用程式所配對的閘道身份，因此另一個閘道無法重用儲存的註冊。
    - 讓本機/手動 iOS 版本保持在直接 APNs 上。基於轉發的發送僅適用於透過轉發站註冊的官方發行版本。
    - 必須與內建於官方/TestFlight iOS 版本中的轉發站基礎 URL 相符，以便註冊和發送流量抵達同一個轉發站部署。

    端對端流程：

    1. 安裝使用相同轉發站基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在閘道上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與閘道配對，並讓節點和操作員工作階段都連線。
    4. iOS 應用程式會取得閘道身份，使用 App Attest 加上應用程式收據向轉發站註冊，然後將基於轉發的 `push.apns.register` 載荷發布到配對的閘道。
    5. 閘道會儲存轉發句柄和發送授權，然後將它們用於 `push.test`、喚醒推撥和重連喚醒。

    操作備註：

    - 如果您將 iOS 應用程式切換到不同的閘道，請重新連線應用程式，以便它發布綁定到該閘道的新轉發註冊。
    - 如果您發布指向不同轉發站部署的新 iOS 版本，應用程式會重新整理其快取的轉發註冊，而不是重用舊的轉發站來源。

    相容性備註：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為暫時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 僅保留為僅限回傳的開發逃生艙；請勿在設定中保存 HTTP 轉發站 URL。

    如需瞭解端對端流程，請參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds)；如需瞭解轉發站安全模型，請參閱 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow)。

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

    - `every`: 持續時間字串 (`30m`, `2h`)。設定 `0m` 以停用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 取得完整指南。

  </Accordion>

  <Accordion title="設定 cron 工作">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: 從 `sessions.json` 中修剪已完成的獨立執行階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`: 依大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 了解功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="設定 Webhook (hooks)">
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

    安全性說明：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；切勿重複使用現有的 Gateway 驗證金鑰 (`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`)。
    - Hook 驗證僅限標頭 (`Authorization: Bearer ...` 或 `x-openclaw-token`)；查詢字串 token 將被拒絕。
    - `hooks.path` 無法 `/`；請將 webhook 入口保留在專用子路徑，例如 `/hooks`。
    - 除非進行嚴格範圍的除錯，否則請停用不安全內容略過旗標 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)。
    - 如果您啟用 `hooks.allowRequestSessionKey`，也請設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫端選擇的 session keys。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具原則 (例如僅限訊息傳遞，並在可能的情況下使用沙箱)。

    查閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合。

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

    查閱 [多代理程式](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/config-agents#multi-agent-routing) 以了解綁定規則和個別代理程式的存取設定檔。

  </Accordion>

  <Accordion title="將配置拆分為多個檔案 ($include)">
    使用 `$include` 來組織大型配置：

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

    - **單一檔案**：替換包含的物件
    - **檔案陣列**：按順序深度合併（後者優先）
    - **同層級鍵**：在包含之後合併（覆蓋包含的值）
    - **巢狀包含**：支援最多 10 層深
    - **相對路徑**：相對於包含檔案解析
    - **路徑格式**：包含路徑不得包含空位元組，且在解析前後必須嚴格少於 4096 個字元
    - **OpenClaw 擁有的寫入**：當寫入僅變更由單一檔案包含（例如 `plugins: { $include: "./plugins.json5" }`）支援的
      一個頂層區段時，OpenClaw 會更新該包含檔案並保持 `openclaw.json` 完整
    - **不支援的直寫**：根包含、包含陣列以及具有同層級覆寫的包含，在 OpenClaw 擁有的寫入中會
      失敗關閉，而不是扁平化配置
    - **限制**：`$include` 路徑必須解析在持有 `openclaw.json` 的目錄下。
      若要跨機器或使用者共享樹狀結構，請將 `OPENCLAW_INCLUDE_ROOTS` 設定為包含可能參考之
      額外目錄的路徑清單（POSIX 上為 `:`，Windows 上為 `;`）。
      符號連結會被解析並重新檢查，因此詞法上位於配置目錄中但其實際目標逸出每個允許根目錄的路徑仍會被拒絕。
    - **錯誤處理**：針對檔案遺失、解析錯誤、循環包含、無效路徑格式和過長長度提供明確錯誤

  </Accordion>
</AccordionGroup>

## 設定熱重新載入

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 - 大多數設定無需手動重新啟動。

直接編輯檔案在通過驗證之前會被視為不受信任。監視器會等待編輯器暫存寫入/重新命名的混亂情況平息，讀取最終檔案，並且在不重寫 `openclaw.json` 的情況下拒絕無效的外部編輯。OpenClaw 擁有的配置寫入在寫入前使用相同的架構閘道；破壞性的覆寫，例如刪除 `gateway.mode` 或將檔案大小縮減超過一半，都會被拒絕並儲存為 `.rejected.*` 以供檢查。

如果您看到 `config reload skipped (invalid config)` 或啟動時回報 `Invalid
config`, inspect the config, run `openclaw config validate`, then run `openclaw
doctor --fix` 以進行修復。請參閱 [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting#gateway-rejected-invalid-config)
查看檢查清單。

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

大多數欄位會在無停機情況下熱套用。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                 | 需要重新啟動？ |
| -------------- | ---------------------------------------------------- | -------------- |
| 頻道           | `channels.*`, `web` (WhatsApp) - 所有內建和外掛頻道  | 否             |
| 代理與模型     | `agent`, `agents`, `models`, `routing`               | 否             |
| 自動化         | `hooks`, `cron`, `agent.heartbeat`                   | 否             |
| 會話與訊息     | `session`, `messages`                                | 否             |
| 工具與媒體     | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk` | 否             |
| 介面與其他     | `ui`, `logging`, `identity`, `bindings`              | 否             |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| 基礎架構       | `discovery`, `plugins`                               | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外——變更它們**不會**觸發重新啟動。</Note>

### 重新載入規劃

當您編輯透過 `$include` 參照的來源檔案時，OpenClaw 會根據
來源撰寫的佈局規劃重新載入，而非扁平化的記憶體內檢視。
這能讓熱重新載入決策（熱套用 vs 重啟）保持可預測，即使當
單一頂層區段存在於其個別包含的檔案中，例如
`plugins: { $include: "./plugins.json5" }`。如果來源佈局不明確，重新載入規劃將會失敗封閉（fails closed）。

## Config RPC（程式化更新）

對於透過 Gateway API 寫入配置的工具，建議採用以下流程：

- `config.schema.lookup` 用於檢查單一子樹（淺層架構節點 + 子
  摘要）
- `config.get` 用於擷取目前的快照加上 `hash`
- `config.patch` 用於部分更新（JSON 合併修補：物件合併，`null`
  刪除，陣列替換）
- 僅當您打算替換整個組態時才使用 `config.apply`
- `update.run` 用於明確的自我更新加上重啟；當重啟後的工作階段應執行一次後續輪次時，包含 `continuationMessage`
- `update.status` 用於檢查最新的更新重啟標記，並在重啟後驗證執行中的版本

代理程式應將 `config.schema.lookup` 視為取得精確
欄位級文件與約束條件的首選。當它們需要更廣泛的組態對應、預設值，或連結至專用
子系統參考資料時，請使用 [Configuration reference](/zh-Hant/gateway/configuration-reference)。

<Note>控制平面寫入（`config.apply`、`config.patch`、`update.run`）會 針對每個 `deviceId+clientIp` 限制為每 60 秒 3 個請求。重啟 請求會合併，然後在重啟週期之間執行 30 秒的冷卻時間。 `update.status` 是唯讀的，但屬於管理員範圍，因為重啟標記可能 包含更新步驟摘要和指令輸出尾部。</Note>

部分修補範例：

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

`config.apply` 和 `config.patch` 都接受 `raw`、`baseHash`、`sessionKey`、
`note` 和 `restartDelayMs`。當組態
已存在時，這兩種方法都需要 `baseHash`。

## 環境變數

OpenClaw 從父程序以及以下來源讀取環境變數：

- `.env` 從當前工作目錄（如果存在）
- `~/.openclaw/.env`（全域後備）

這兩個檔案都不會覆蓋既有的環境變數。您也可以在設定中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell env import (optional)">
  如果啟用且未設定預期的金鑰，OpenClaw 會執行您的登入 shell 並僅匯入缺失的金鑰：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Env var equivalent: `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  使用 `${VAR_NAME}` 在任何設定字串值中參照環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 跳脫以取得字面輸出
- 適用於 `$include` 檔案內
- 內聯替換：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
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

SecretRef 詳細資訊（包括用於 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

如需完整的優先順序和來源，請參閱 [Environment](/zh-Hant/help/environment)。

## 完整參考

有關完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
- [Gateway runbook](/zh-Hant/gateway)
