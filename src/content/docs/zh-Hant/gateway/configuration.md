---
summary: "設定概覽：常見任務、快速設置，以及完整參考的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "設定"
---

# Configuration

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定。

如果檔案不存在，OpenClaw 將使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒或自動化 (cron, hooks)
- 調整 Sessions、媒體、網路或 UI

參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference) 以了解所有可用欄位。

<Tip>**剛開始接觸設定？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會即時從設定架構 (schema) 渲染表單，包括欄位 `title` / `description` 文件元數據，以及在可用時的 外掛和通道架構，並提供 **Raw JSON** 編輯器作為備用方案。對於深入 UI 和其他工具，Gateway 也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點以及直接的子摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的配置。未知的鍵、格式錯誤的類型或無效的值會導致 Gateway **拒絕啟動**。唯一根層級的例外是 `$schema` (字串)，以便編輯器可以附加 JSON Schema 元數據。</Warning>

架構工具說明：

- `openclaw config schema` 會列印出與 Control UI
  和設定驗證所使用的相同 JSON Schema 系列。
- 將該架構輸出視為
  `openclaw.json` 的標準機器可讀取契約；本概述和設定參考對其進行了總結。
- 欄位 `title` 和 `description` 的值會被帶入架構輸出中，
  以供編輯器和表單工具使用。
- 巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 項目會繼承相同的
  文件元數據，只要存在相符的欄位文件。
- `anyOf` / `oneOf` / `allOf` 組合分支也會繼承相同的文件
  元數據，因此聯集/交集變體會保持相同的欄位說明。
- `config.schema.lookup` 返回一個標準化的配置路徑，其中包含一個淺層
  schema 節點（`title`、`description`、`type`、`enum`、`const`、常見邊界
  和類似的驗證欄位）、匹配的 UI 提示元數據，以及用於下鑽工具的直接子級
  摘要。
- 當 Gateway 可以載入當前的清單註冊表時，執行時期的 plugin/channel schemas 會被合併進來。
- `pnpm config:docs:check` 會偵測面向文件的配置基線
  構件與當前 schema 介面之間的差異。

當驗證失敗時：

- Gateway 無法啟動
- 僅診斷指令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 執行 `openclaw doctor` 以查看具體問題
- 執行 `openclaw doctor --fix`（或 `--yes`）以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道在 `channels.<provider>` 下都有自己的配置區段。請參閱專用的頻道頁面以了解設定步驟：

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
    設定主要模型與可選的備援機制：

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

    - `agents.defaults.models` 定義模型目錄並充當 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具影像的縮小比例（預設為 `1200`）；較低的值通常能減少在大量截圖執行時的視覺 token 使用量。
    - 如需在聊天中切換模型，請參閱 [Models CLI](/zh-Hant/concepts/models)；如需了解輪替驗證與備援行為，請參閱 [Model Failover](/zh-Hant/concepts/model-failover)。
    - 若為自訂/自託管供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    私訊存取透過 `dmPolicy` 依管道進行控制：

    - `"pairing"` (預設)：未知傳送者會收到一次性配對代碼以供批准
    - `"allowlist"`：僅允許 `allowFrom` 中的傳送者 (或已配對的允許存放區)
    - `"open"`：允許所有傳入私訊 (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有私訊

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    請參閱 [full reference](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以取得各管道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘門">
    群組訊息預設為 **需要提及**。請為每個代理程式設定模式：

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

    - **中繼資料提及**：原生 @提及（WhatsApp 輕觸提及、Telegram @bot 等）
    - **文字模式**：`mentionPatterns` 中的安全 regex 模式
    - 如需各管道覆寫與自聊模式，請參閱 [full reference](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating)。

  </Accordion>

  <Accordion title="限制每個代理程式的技能">
    使用 `agents.defaults.skills` 作為共享基準，然後使用 `agents.list[].skills` 覆蓋特定
    代理程式：

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
    - 將 `agents.list[].skills: []` 設定為不使用任何技能。
    - 參閱 [技能](/zh-Hant/tools/skills)、[技能配置](/zh-Hant/tools/skills-config) 和
      [配置參考](/zh-Hant/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整閘道通道健康監控">
    控制閘道重啟看似陳舊通道的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 針對單一通道或帳戶停用自動重啟，而無需停用全域監控器。
    - 參閱 [健康檢查](/zh-Hant/gateway/health) 以進行操作除錯，並參閱 [完整參考](/zh-Hant/gateway/configuration-reference#gateway) 了解所有欄位。

  </Accordion>

  <Accordion title="配置工作階段和重設">
    工作階段控制對話連續性和隔離性：

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
    - `threadBindings`：執行緒綁定工作階段路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 參閱 [工作階段管理](/zh-Hant/concepts/session) 以了解範圍、身分連結和發送原則。
    - 參閱 [完整參考](/zh-Hant/gateway/configuration-reference#session) 了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒機制">
    在獨立的 Docker 容器中執行代理工作階段：

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

    請先建構映像檔：`scripts/sandbox-setup.sh`

    參閱 [沙盒機制](/zh-Hant/gateway/sandboxing) 以取得完整指南，以及 [完整參考](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox) 以了解所有選項。

  </Accordion>

  <Accordion title="針對官方 iOS 版本啟用中繼推送">
    中繼推送在 `openclaw.json` 中設定。

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

    CLI 同義寫法：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此項的作用：

    - 允許 gateway 透過外部中繼傳送 `push.test`、喚醒提示以及重新連線喚醒。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍傳送授權。gateway 不需要部署範圍的中繼權杖。
    - 將每個中繼註冊與 iOS 應用程式配對的 gateway 身份綁定，因此其他 gateway 無法重複使用儲存的註冊。
    - 讓本地/手動 iOS 版本保持使用直接 APNs。中繼傳送僅適用於透過中繼註冊的官方發布版本。
    - 必須符合內建於官方/TestFlight iOS 版本中的中繼基礎 URL，以便註冊和傳送流量到達同一個中繼部署。

    端到端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓節點和操作員階段連線。
    4. iOS 應用程式取得 gateway 身份，使用 App Attest 和應用程式收據向中繼註冊，然後發布中繼支援的 `push.apns.register` 資料給配對的 gateway。
    5. gateway 儲存中繼控制代碼和傳送授權，然後用於 `push.test`、喚醒提示以及重新連線喚醒。

    操作注意事項：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，以便其發布綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重複使用舊的中繼來源。

    相容性注意事項：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 僅保留為僅限回環的開發逃生閥；請勿在設定中保留 HTTP 中繼 URL。

    請參閱 [iOS 應用程式](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端到端流程，以及 [驗證與信任流程](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全性模型。

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
    - 請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron jobs">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: 從 `sessions.json` 中修剪已完成的獨立執行階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`: 根據大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="Set up webhooks (hooks)">
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

    安全注意事項：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；不要重複使用共用的 Gateway token。
    - Hook 認證僅限標頭（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查詢字串 token 會被拒絕。
    - `hooks.path` 無法 `/`；請將 webhook 入口保留在專用子路徑上，例如 `/hooks`。
    - 除非進行範圍嚴格限定的除錯，否則請保持不安全內容略過旗標停用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`）。
    - 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選取的 session 金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具政策（例如僅限訊息傳遞，並盡可能使用沙箱機制）。

    參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合功能。

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    使用個別的工作空間和工作階段執行多個隔離的代理程式：

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

    參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解繫結規則和每個代理程式的存取設定檔。

  </Accordion>

  <Accordion title="Split config into multiple files ($include)">
    使用 `$include` 來組織大型設定檔：

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
    - **同層級金鑰**：在 include 之後合併（覆寫已包含的值）
    - **巢狀 include**：支援最多 10 層深
    - **相對路徑**：相對於包含檔案解析
    - **錯誤處理**：針對遺失檔案、解析錯誤和循環 include 提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定檔熱重新載入

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 大多數設定不需要手動重新啟動。

### 重新載入模式

| 模式                | 行為                                                          |
| ------------------- | ------------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全變更。針對關鍵變更自動重新啟動。                |
| **`hot`**           | 僅熱套用安全變更。當需要重新啟動時會記錄警告 — 由您自行處理。 |
| **`restart`**       | 在任何設定變更時重新啟動 Gateway，無論是否安全。              |
| **`off`**           | 停用檔案監視。變更將在下次手動重新啟動時生效。                |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目與需重新啟動項目

大多數欄位可熱套用而不會有停機時間。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                   | 需要重新啟動？ |
| -------------- | ------------------------------------------------------ | -------------- |
| 頻道           | `channels.*`、`web` (WhatsApp) — 所有內建和擴充頻道    | 否             |
| 代理程式與模型 | `agent`、`agents`、`models`、`routing`                 | 否             |
| 自動化         | `hooks`、`cron`、`agent.heartbeat`                     | 否             |
| 工作階段與訊息 | `session`、`messages`                                  | 否             |
| 工具與媒體     | `tools`、`browser`、`skills`、`audio`、`talk`          | 否             |
| 介面與其他     | `ui`、`logging`、`identity`、`bindings`                | 否             |
| Gateway 伺服器 | `gateway.*` (連接埠、綁定、驗證、Tailscale、TLS、HTTP) | **是**         |
| 基礎設施       | `discovery`、`canvasHost`、`plugins`                   | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 變更它們**不會**觸發重新啟動。</Note>

## Config RPC (程式化更新)

<Note>控制平面寫入 RPC（`config.apply`、`config.patch`、`update.run`）的速率限制為每 `deviceId+clientIp` **60 秒內 3 個請求**。當受到限制時，RPC 返回 `UNAVAILABLE` 並帶有 `retryAfterMs`。</Note>

安全/預設流程：

- `config.schema.lookup`：使用淺層架構節點、匹配的提示元數據和直接子摘要檢查一個路徑範圍的配置子樹
- `config.get`：獲取當前快照 + 雜湊值
- `config.patch`：首選的部分更新路徑
- `config.apply`：僅用於完整配置替換
- `update.run`：顯式自我更新 + 重啟

當您不替換整個配置時，請優先使用 `config.schema.lookup`
然後使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    驗證 + 寫入完整配置並一步重啟 Gateway。

    <Warning>
    `config.apply` 會替換**整個配置**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 更新單個鍵值。
    </Warning>

    參數：

    - `raw` (字串) — 整個配置的 JSON5 載荷
    - `baseHash` (可選) — 來自 `config.get` 的配置雜湊值（當配置存在時為必需）
    - `sessionKey` (可選) — 用於重啟後喚醒 ping 的會話金鑰
    - `note` (可選) — 重啟哨兵的備註
    - `restartDelayMs` (可選) — 重啟前的延遲（預設為 2000）

    當一個重啟請求已經處於待處理/傳輸中時，後續的重啟請求會被合併，並且在重啟週期之間會套用 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (partial update)">
    將部分更新合併到現有配置中（JSON 合併補丁語義）：

    - 物件遞迴合併
    - `null` 刪除一個鍵
    - 陣列替換

    參數：

    - `raw` (string) — JSON5，僅包含要更改的鍵
    - `baseHash` (required) — 來自 `config.get` 的配置雜湊值
    - `sessionKey`, `note`, `restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 一致：合併待處理的重啟，並在重啟週期之間有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父進程以及以下位置讀取環境變數：

- 當前工作目錄中的 `.env`（如果存在）
- `~/.openclaw/.env`（全域後備）

這兩個檔案都不會覆蓋現有的環境變數。您也可以在配置中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell env import (optional)">
  如果啟用此選項且未設定預期的鍵，OpenClaw 將執行您的登入 shell 並僅匯入缺失的鍵：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

等效的環境變數：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  在任何配置字串值中，使用 `${VAR_NAME}` 引用環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 進行跳脫以獲得字面輸出
- 適用於 `$include` 檔案內部
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

SecretRef 的詳細資訊（包括 `secrets.providers` 用於 `env`/`file`/`exec`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

## 完整參考

若要查看完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_
