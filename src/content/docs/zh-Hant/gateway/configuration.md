---
summary: "設定概覽：常見任務、快速設定，以及完整參考的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "設定"
---

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定檔。
作用中的設定路徑必須是一般檔案。OpenClaw 擁有的寫入作業不支援 `openclaw.json`
符號連結版面配置；原子寫入可能會取代
路徑，而非保留符號連結。如果您將設定保留在預設狀態目錄
之外，請將 `OPENCLAW_CONFIG_PATH` 直接指向真正的檔案。

如果檔案不存在，OpenClaw 會使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒機制或自動化 (cron, hooks)
- 調整工作階段、媒體、網路或 UI

請參閱 [完整參考](/zh-Hant/gateway/configuration-reference) 以了解每個可用欄位。

代理程式和自動化工具應該在編輯設定之前使用 `config.schema.lookup` 查看確切的欄位級說明文件。使用此頁面取得任務導向的指引，並使用 [Configuration reference](/zh-Hant/gateway/configuration-reference) 了解更廣泛的欄位對應和預設值。

<Tip>**設定新手嗎？** 請從 `openclaw onboard` 開始進行互動式設定，或是查看 [Configuration Examples](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

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
  <Tab title="互動式精靈">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (單行指令)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據即時配置架構呈現表單，包括欄位 `title` / `description` 文件中繼資料，以及外掛和通道架構（如果有的話）， 並提供 **Raw JSON** 編輯器作為備用方案。針對下鑽式 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以取得單一路徑範圍的架構節點以及直接子摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [hot reload](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的配置。未知的金鑰、格式錯誤的類型或無效的數值會導致 Gateway **拒絕啟動**。唯一根層級的例外是 `$schema` (字串)，讓編輯器可以附加 JSON Schema 中繼資料。</Warning>

`openclaw config schema` 會列印出 Control UI 和驗證所使用的正規 JSON Schema。
`config.schema.lookup` 會取得單一路徑範圍的節點加上
子摘要，供下鑽工具使用。欄位 `title`/`description` 文件中繼資料
會傳遞至巢狀物件、萬用字元 (`*`)、陣列項目 (`[]`)，以及 `anyOf`/
`oneOf`/`allOf` 分支。當載入清單註冊表時，
執行時期外掛和通道架構會合併進來。

當驗證失敗時：

- Gateway 無法啟動
- 只有診斷指令可以使用 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

Gateway 在每次成功啟動後會保留一份信任的「最後已知良好」副本。
如果 `openclaw.json` 後來驗證失敗（或是刪除了 `gateway.mode`、大幅縮減，或在前面多了一行雜亂的日誌），OpenClaw 會將損壞的檔案保留為 `.clobbered.*`，還原「最後已知良好」的副本，並記錄還原原因。下一個 agent 輪次也會收到系統事件警告，讓主要 agent 不會盲目地覆寫已還原的配置。當候選版本包含已編輯的秘密預留位置（例如 `***`）時，將會跳過升級為「最後已知良好」的動作。
當所有驗證問題都僅限於 `plugins.entries.<id>...` 時，OpenClaw 不會執行全檔案還原。它會保持目前配置生效，並顯示外掛程式本地的失敗，讓外掛程式架構或主機版本不符無法回滾不相關的使用者設定。

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道在 `channels.<provider>` 下都有自己的配置區段。請參閱專屬的頻道頁面以瞭解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) — `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) — `channels.discord`
    - [Feishu](/zh-Hant/channels/feishu) — `channels.feishu`
    - [Google Chat](/zh-Hant/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/zh-Hant/channels/msteams) — `channels.msteams`
    - [Slack](/zh-Hant/channels/slack) — `channels.slack`
    - [Signal](/zh-Hant/channels/signal) — `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) — `channels.imessage`
    - [Mattermost](/zh-Hant/channels/mattermost) — `channels.mattermost`

    所有頻道都共用相同的 DM 政策模式：

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
    設定主要模型及可選的備援模型：

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

    - `agents.defaults.models` 定義了型錄並作為 `/model` 的允許清單。
    - 使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 來新增允許清單項目而不移除現有模型。除非您傳遞 `--replace`，否則會拒絕移除項目的單純取代操作。
    - 模型參照使用 `provider/model` 格式 (例如 `anthropic/claude-opus-4-6`)。
    - `agents.defaults.imageMaxDimensionPx` 控制轉錄/工具圖片的縮小 (預設 `1200`)；較低的數值通常會減少截圖密集執行中的視覺 token 使用量。
    - 參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和備援行為。
    - 對於自訂/自託管的提供者，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳送訊息給機器人">
    存取權透過 `dmPolicy` 依管道控制：

    - `"pairing"` (預設)：未知的傳送者會收到一次性配對碼以供核准
    - `"allowlist"`：僅允許 `allowFrom` 中的傳送者 (或已配對的允許存放區)
    - `"open"`：允許所有傳入的私訊 (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有私訊

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    參閱 [完整參考資料](/zh-Hant/gateway/config-channels#dm-and-group-access) 以瞭解各管道的詳細資訊。

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    群組訊息預設為**需要提及**。請為每個代理設定模式：

    ```json5
    {
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

    - **元資料提及**：原生的 @-提及（WhatsApp 點擊提及、Telegram @bot 等）
    - **文字模式**：`mentionPatterns` 中的安全 regex 模式
    - 請參閱 [完整參考資料](/zh-Hant/gateway/config-channels#group-chat-mention-gating) 以了解各頻道覆寫和自聊模式。

  </Accordion>

  <Accordion title="Restrict skills per agent">
    使用 `agents.defaults.skills` 作為共享基準，然後使用 `agents.list[].skills` 覆寫特定
    代理：

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
    - 請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和
      [設定參考資料](/zh-Hant/gateway/config-agents#agents-defaults-skills)。

  </Accordion>

  <Accordion title="Tune gateway channel health monitoring">
    控制閘道如何積極地重新啟動看似過時的頻道：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 針對單一頻道或帳戶停用自動重新啟動，而無需停用全域監控器。
    - 請參閱 [健康檢查](/zh-Hant/gateway/health) 以進行營運除錯，並參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="設定會話與重置">
    會話控制對話連續性和隔離性：

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

    - `dmScope`: `main` (共享) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 繫結至執行緒的會話路由的全域預設值（Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 請參閱 [會話管理](/zh-Hant/concepts/session) 以了解範圍設定、身分連結和發送原則。
    - 請參閱 [完整參考](/zh-Hant/gateway/config-agents#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙箱機制">
    在隔離的沙箱執行時期中執行代理程式會話：

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

    先建置映像檔：`scripts/sandbox-setup.sh`

    請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing) 以取得完整指南，並參閱 [完整參考](/zh-Hant/gateway/config-agents#agentsdefaultssandbox) 以了解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用基於中繼的推送">
    基於中繼的推送功能在 `openclaw.json` 中設定。

    在 Gateway 設定中設定此項：

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

    - 允許 Gateway 透過外部中繼發送 `push.test`、喚醒輕推以及重新連線喚醒訊號。
    - 使用由配對 iOS 應用程式轉發的註冊範圍傳送權限。Gateway 不需要部署範圍的中繼 Token。
    - 將每個基於中繼的註冊綁定至 iOS 應用程式所配對的 Gateway 身份，因此其他 Gateway 無法重複使用已儲存的註冊資訊。
    - 讓本地/手動編譯的 iOS 版本保持在直接連線 APNs。基於中繼的傳送僅適用於透過中繼註冊的官方發行版本。
    - 必須符合內建於官方/TestFlight iOS 版本中的中繼基礎 URL，以便註冊和傳送流量抵達相同的中繼部署。

    端對端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 Gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 Gateway 配對，並讓節點和操作員工作階段都連線。
    4. iOS 應用程式會擷取 Gateway 身份，使用 App Attest 加上應用程式收據向中繼註冊，然後將基於中繼的 `push.apns.register` Payload 發布至已配對的 Gateway。
    5. Gateway 會儲存中繼處理程序和傳送權限，然後將其用於 `push.test`、喚醒輕推以及重新連線喚醒訊號。

    操作備註：

    - 如果您將 iOS 應用程式切換至不同的 Gateway，請重新連線應用程式，使其能夠發佈繫結至該 Gateway 的新中繼註冊資訊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊資訊，而不是重複使用舊的中繼來源。

    相容性備註：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為暫時性的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍是僅限回傳的開發應急手段；請勿在設定中保存 HTTP 中繼 URL。

    請參閱 [iOS 應用程式](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端對端流程，以及 [驗證與信任流程](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全性模型。

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

    - `every`: 持續時間字串 (`30m`, `2h`)。設為 `0m` 以停用。
    - `target`: `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`: `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron 工作">
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

    - `sessionRetention`: 從 `sessions.json` 修剪已完成的獨立執行階段 (預設 `24h`；設為 `false` 以停用)。
    - `runLog`: 依大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="Set up webhooks (hooks)">
    在閘道上啟用 HTTP webhook 端點：

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

    安全說明：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；切勿重複使用共用的閘道權杖 (token)。
    - Hook 驗證僅限於標頭 (`Authorization: Bearer ...` 或 `x-openclaw-token`)；查詢字串權杖會被拒絕。
    - `hooks.path` 無法 `/`；請將 webhook 來源保持在專用子路徑上，例如 `/hooks`。
    - 保持不安全內容繞過標誌為停用狀態 (`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`)，除非進行範圍狹小的除錯。
    - 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選擇的工作階段金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具政策 (例如僅限傳訊並在可能的情況下使用沙箱)。

    參閱[完整參考資料](/zh-Hant/gateway/configuration-reference#hooks)以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    使用獨立的工作區和工作階段執行多個隔離的代理程式：

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

    - **單一檔案**：替換包含的物件
    - **檔案陣列**：依順序深度合併（後面的優先）
    - **同層級鍵**：在包含後合併（覆蓋包含的值）
    - **巢狀包含**：支援最多深達 10 層
    - **相對路徑**：相對於包含檔案解析
    - **OpenClaw 擁有的寫入**：當寫入僅改變由單一檔案包含支援的一個頂層區段
      時，例如 `plugins: { $include: "./plugins.json5" }`，
      OpenClaw 會更新該包含檔案並保持 `openclaw.json` 不變
    - **不支援的直通寫入**：根包含、包含陣列，以及具有同層級覆寫的包含，對於
      OpenClaw 擁有的寫入會以封閉失敗處理，而不是扁平化設定
    - **錯誤處理**：對於遺失檔案、解析錯誤和循環包含會顯示清晰的錯誤

  </Accordion>
</AccordionGroup>

## 設定熱重載

Gateway 會監看 `~/.openclaw/openclaw.json` 並自動套用變更 — 大多數設定不需要手動重新啟動。

直接檔案編輯在驗證之前會被視為不受信任。監看器會等待編輯器的暫時寫入/重新命名混亂沉澱下來，讀取最終檔案，並透過還原最後已知良好的設定來拒絕無效的外部編輯。OpenClaw 擁有的設定寫入在寫入前會使用相同的 schema 閘道；破壞性的覆寫，例如捨棄 `gateway.mode` 或將檔案縮減超過一半，會被拒絕並儲存為 `.rejected.*` 以供檢查。

外掛本機驗證失敗是例外：如果所有問題都在 `plugins.entries.<id>...` 下，重載會保留目前的設定並回報外掛問題，而不是還原 `.last-good`。

如果您在日誌中看到 `Config auto-restored from last-known-good` 或
`config reload restored last-known-good config`，請檢查 `openclaw.json` 旁邊對應的
`.clobbered.*` 檔案，修復被拒絕的 payload，然後執行
`openclaw config validate`。請參閱 [Gateway 疑難排解](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)
以了解復原檢查清單。

### 重載模式

| 模式                | 行為                                                           |
| ------------------- | -------------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全變更。對於關鍵變更則會自動重新啟動。             |
| **`hot`**           | 僅熱套用安全變更。當需要重新啟動時會記錄警告 —— 由您自行處理。 |
| **`restart`**       | 在任何配置變更時重新啟動 Gateway，無論是否安全。               |
| **`off`**           | 停用檔案監控。變更將在下次手動重新啟動時生效。                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 何者可熱套用 vs 何者需要重新啟動

大多數欄位可熱套用且不造成停機。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                 | 需要重新啟動？ |
| -------------- | ---------------------------------------------------- | -------------- |
| 頻道           | `channels.*`、`web` (WhatsApp) —— 所有內建和外掛頻道 | 否             |
| 代理與模型     | `agent`、`agents`、`models`、`routing`               | 否             |
| 自動化         | `hooks`、`cron`、`agent.heartbeat`                   | 否             |
| 會話與訊息     | `session`、`messages`                                | 否             |
| 工具與媒體     | `tools`、`browser`、`skills`、`mcp`、`audio`、`talk` | 否             |
| 介面與其他     | `ui`、`logging`、`identity`、`bindings`              | 否             |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| 基礎架構       | `discovery`、`canvasHost`、`plugins`                 | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 —— 更改它們並**不**會觸發重新啟動。</Note>

### 重新載入規劃

當您編輯透過 `$include` 參照的來源檔案時，OpenClaw 會根據來源編寫的佈局而非扁平化的記憶體內視圖來規劃重新載入。這使得熱重新載入決策（熱套用 vs 重啟）即使當單一頂層區段位於其專屬的引入檔案（例如 `plugins: { $include: "./plugins.json5" }`）中時也能保持可預測。如果來源佈局不明確，重新載入規劃將會失敗並封閉。

## Config RPC（程式化更新）

對於透過 Gateway API 寫入配置的工具，建議採用以下流程：

- `config.schema.lookup` 用於檢查單一子樹（淺層 schema 節點 + 子摘要）
- `config.get` 用於取得目前的快照加上 `hash`
- `config.patch` 用於部分更新（JSON merge patch：物件合併，`null` 刪除，陣列取代）
- `config.apply` 僅在您打算取代整個配置時使用
- `update.run` 用於明確的自我更新加上重啟
- `update.status` 用於檢查最新的更新重啟標記，並在重啟後驗證執行版本

代理程式應將 `config.schema.lookup` 視為獲取精確欄位層級文件與約束的首選。當它們需要更廣泛的配置對應、預設值或連結至專屬子系統參考資料時，請使用 [Configuration reference](/zh-Hant/gateway/configuration-reference)。

<Note>控制平面寫入（`config.apply`、`config.patch`、`update.run`）對每個 `deviceId+clientIp` 每 60 秒限制為 3 個請求。重啟請求會合併，然後在重啟週期之間強制執行 30 秒的冷卻時間。 `update.status` 是唯讀的，但屬於管理員範圍，因為重啟標記可以包含更新步驟摘要和命令輸出尾部。</Note>

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

- 來自當前工作目錄的 `.env`（如果存在）
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

<Accordion title="Shell 環境匯入（選用）">
  如果啟用此功能且未設定預期的金鑰，OpenClaw 將會執行您的登入 shell 並僅匯入缺失的金鑰：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的環境變數：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="設定值中的環境變數替換">
  使用 `${VAR_NAME}` 在任何設定字串值中引用環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅符合大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 進行跳脫以取得字面輸出
- 適用於 `$include` 檔案內部
- 內聯替換：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret 參考（env、file、exec）">
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

如需完整的優先順序和來源，請參閱 [Environment](/zh-Hant/help/environment)。

## 完整參考

如需完整的逐欄參考，請參閱 **[配置參考](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[配置範例](/zh-Hant/gateway/configuration-examples) · [配置參考](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [配置參考](/zh-Hant/gateway/configuration-reference)
- [配置範例](/zh-Hant/gateway/configuration-examples)
- [Gateway 操作手冊](/zh-Hant/gateway)
