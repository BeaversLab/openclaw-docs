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

請參閱[完整參考](/zh-Hant/gateway/configuration-reference)以了解每個可用欄位。

<Tip>**不熟悉配置？** 從 `openclaw onboard` 開始進行互動式設定，或查看[配置範例](/zh-Hant/gateway/configuration-examples)指南以取得完整的複製貼上配置。</Tip>

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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會即時根據配置架構呈現表單，包括欄位 `title` / `description` 文件元數據，以及外掛和通道架構（如果有的話）， 並提供 **Raw JSON** 編輯器作為備案。對於 下鑽式 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點以及直接子摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
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

Gateway 在成功啟動後也會保留一份受信任的最後已知良好副本。如果
`openclaw.json` 隨後在 OpenClaw 外部被變更且無法通過驗證，啟動
和熱重載會將損壞的檔案保留為加上時間戳記的 `.clobbered.*` 快照，
還原最後已知良好的副本，並記錄包含復原原因的明確警告。
下一個主要代理週期也會收到系統事件警告，告知其
配置已還原，不得盲目地覆寫。最後已知良好的提升
會在經過驗證的啟動後以及接受熱重載後更新，包括
OpenClaw 擁有的配置寫入（其持久化檔案雜湊值仍與接受的
寫入相符）。當候選配置包含已編輯的密碼
預留位置（例如 `***`）或縮短的 Token 值時，會跳過提升。

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

    所有頻道都使用相同的 DM 政策模式：

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

  <Accordion title="選擇並設定模型">
    設定主要模型和可選的備援模型：

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

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制文字紀錄/工具圖片的縮小比例（預設為 `1200`）；較低的值通常會在大量截圖的執行中減少 vision token 的使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和備援行為。
    - 對於自訂/自託管的提供者，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳送訊息給機器人">
    DM 存取權是透過 `dmPolicy` 針對每個頻道控制的：

    - `"pairing"` (預設值)：未知發送者會收到一次性配對代碼以供核準
    - `"allowlist"`：僅限 `allowFrom` 中 (或配對的允許儲存庫中) 的發送者
    - `"open"`：允許所有傳入 DM (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定頻道的允許清單。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以了解各頻道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘道">
    群組訊息預設為 **需要提及**。針對每個代理程式設定模式：

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

    - **中繼資料提及**：原生 @-提及 (WhatsApp 點擊提及、Telegram @bot 等)
    - **文字模式**：`mentionPatterns` 中的安全正規表示式模式
    - 請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating) 以了解各頻道覆寫和自聊模式。

  </Accordion>

  <Accordion title="限制每個代理程式的技能">
    使用 `agents.defaults.skills` 作為共用基準，然後使用 `agents.list[].skills` 覆寫特定
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

    - 省略 `agents.defaults.skills` 以在預設情況下允許無限制的技能。
    - 省略 `agents.list[].skills` 以繼承預設值。
    - 將 `agents.list[].skills: []` 設定為無技能。
    - 請參閱 [技能](/zh-Hant/tools/skills)、[技能設定](/zh-Hant/tools/skills-config) 和
      [設定參考](/zh-Hant/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整閘道通道健康監控">
    控制閘道重新啟動看似陳舊通道的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 針對單一通道或帳戶停用自動重新啟動，而不需停用全域監控器。
    - 請參閱 [Health Checks](/zh-Hant/gateway/health) 以進行操作除錯，以及 [full reference](/zh-Hant/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="設定對話與重置">
    對話控制對話連續性與隔離性：

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
    - `threadBindings`: 綁定執行緒之對話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 請參閱 [Session Management](/zh-Hant/concepts/session) 以了解範圍、身分連結和發送原則。
    - 請參閱 [full reference](/zh-Hant/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙箱化">
    在隔離的沙箱執行環境中執行代理程式對話：

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

    先建構映像檔： `scripts/sandbox-setup.sh`

    請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing) 以取得完整指南，以及 [full reference](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox) 以了解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用基於中繼的推送">
    基於中繼的推送是在 `openclaw.json` 中設定的。

    在 gateway config 中進行設定：

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

    對等的 CLI 指令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    功能說明：

    - 允許 gateway 透過外部中繼傳送 `push.test`、喚醒輕推 (wake nudges) 和重新連線喚醒。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍傳送授予 (send grant)。Gateway 不需要部署範圍的中繼權杖。
    - 將每個基於中繼的註冊綁定到 iOS 應用程式配對的 gateway 身份，因此另一個 gateway 無法重用已儲存的註冊。
    - 讓本機/手動 iOS 版本保持使用直接 APNs 連線。基於中繼的傳送僅適用於透過中繼註冊的官方發行版本。
    - 必須符合內建於官方/TestFlight iOS 版本中的中繼基礎 URL，以便註冊和傳送流量到達同一個中繼部署。

    端到端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓 node 和 operator sessions 都連線。
    4. iOS 應用程式會取得 gateway 身份，使用 App Attest 和應用程式收據向中繼註冊，然後將基於中繼的 `push.apns.register` 載荷發佈到配對的 gateway。
    5. Gateway 會儲存中繼處理程式 (relay handle) 和傳送授予，然後將其用於 `push.test`、喚醒輕推和重新連線喚醒。

    操作備註：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，以便其發佈綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重用舊的中繼來源。

    相容性備註：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然僅用於僅限本機的開發緊急逃生；請勿在 config 中保留 HTTP 中繼 URL。

    參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端到端流程，以及 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全模型。

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

    - `every`：持續時間字串 (`30m`, `2h`)。設定 `0m` 以停用。
    - `target`： `last` | `none` | `<channel-id>` (例如 `discord`, `matrix`, `telegram`, 或 `whatsapp`)
    - `directPolicy`： `allow` (預設) 或 `block` 用於 DM 風格的心跳目標
    - 請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron 任務">
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

    - `sessionRetention`：從 `sessions.json` 清理已完成的獨立執行階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`：根據大小和保留行數清理 `cron/runs/<jobId>.jsonl`。
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

    安全性備註：
    - 將所有 hook/webhook 載荷內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；請勿重複使用共用的 Gateway 權杖。
    - Hook 驗證僅限於標頭 (`Authorization: Bearer ...` 或 `x-openclaw-token`)；查詢字串權杖會被拒絕。
    - `hooks.path` 無法 `/`；請將 webhook 入口保留在專用的子路徑上，例如 `/hooks`。
    - 除非進行嚴格範圍的除錯，否則請停用不安全內容略過旗標 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)。
    - 如果您啟用 `hooks.allowRequestSessionKey`，也請設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選擇的工作階段金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具原則 (例如僅限訊息傳遞，並在可能的情況下使用沙箱)。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    使用獨立的工作空間和工作階段執行多個隔離的代理程式：

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

    請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解繫結規則和個別代理程式的存取設定檔。

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
    - **檔案陣列**：按順序深度合併 (後者優先)
    - **同層級金鑰**：在包含之後合併 (覆寫包含的值)
    - **巢狀包含**：支援最多 10 層深度
    - **相對路徑**：相對於包含的檔案解析
    - **錯誤處理**：對於遺失檔案、解析錯誤和循環包含會提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定檔熱重新載入

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 —— 大多數設定無需手動重新啟動。

直接的檔案編輯在驗證前會被視為不受信任。監視器會等待編輯器暫存寫入/重新命名的混亂情況平息後，讀取最終檔案，並透過還原最後一次已知的良好設定來拒絕無效的外部編輯。OpenClaw 擁有的設定寫入在寫入前會使用相同的 schema 閘道；諸如刪除 `gateway.mode` 或將檔案縮減超過一半等破壞性的覆寫會被拒絕，並儲存為 `.rejected.*` 以供檢查。

如果您在日誌中看到 `Config auto-restored from last-known-good` 或
`config reload restored last-known-good config`，請檢查 `openclaw.json` 旁邊對應的
`.clobbered.*` 檔案，修正被拒絕的 payload，然後執行
`openclaw config validate`。請參閱 [Gateway 故障排除](/zh-Hant/gateway/troubleshooting#gateway-restored-last-known-good-config)
了解復原檢查清單。

### 重新載入模式

| 模式                | 行為                                                             |
| ------------------- | ---------------------------------------------------------------- |
| **`hybrid`** (預設) | 即時熱套用安全的變更。對於關鍵變更會自動重新啟動。               |
| **`hot`**           | 僅熱套用安全的變更。當需要重新啟動時會記錄警告 —— 由您自行處理。 |
| **`restart`**       | 在任何設定變更（無論是否安全）時重新啟動 Gateway。               |
| **`off`**           | 停用檔案監視。變更將在下次手動重新啟動時生效。                   |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目 vs 需要重新啟動的項目

大多數欄位可熱套用且無停機時間。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                 | 需要重新啟動？ |
| -------------- | ---------------------------------------------------- | -------------- |
| 頻道           | `channels.*`、`web` (WhatsApp) —— 所有內建和擴充頻道 | 否             |
| 代理程式與模型 | `agent`、`agents`、`models`、`routing`               | 否             |
| 自動化         | `hooks`、`cron`、`agent.heartbeat`                   | 否             |
| 工作階段與訊息 | `session`、`messages`                                | 否             |
| 工具與媒體     | `tools`, `browser`, `skills`, `audio`, `talk`        | 否             |
| UI 與其他      | `ui`, `logging`, `identity`, `bindings`              | 否             |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| 基礎架構       | `discovery`, `canvasHost`, `plugins`                 | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 更改它們**不會**觸發重新啟動。</Note>

## Config RPC (程式化更新)

<Note>控制平面寫入 RPC (`config.apply`, `config.patch`, `update.run`) 對每個 `deviceId+clientIp` 的速率限制為 **60 秒內 3 個請求**。當受到限制時，RPC 會傳回 `UNAVAILABLE` 並帶有 `retryAfterMs`。</Note>

安全/預設流程：

- `config.schema.lookup`：檢查一個路徑範圍的配置子樹，包含淺層架構節點、匹配的提示中繼資料以及直接子項摘要
- `config.get`：取得目前的快照 + 雜湊
- `config.patch`：偏好的部分更新路徑
- `config.apply`：僅限完整配置替換
- `update.run`：明確的自我更新 + 重新啟動

當您不替換整個配置時，建議優先使用 `config.schema.lookup`
然後使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    驗證 + 寫入完整組態並在一個步驟中重新啟動 Gateway。

    <Warning>
    `config.apply` 會取代**整個組態**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 進行單一金鑰更新。
    </Warning>

    參數：

    - `raw` (字串) — 整個組態的 JSON5 載荷
    - `baseHash` (選填) — 來自 `config.get` 的組態雜湊值 (當組態存在時為必填)
    - `sessionKey` (選填) — 用於重新啟動後喚醒 ping 的會話金鑰
    - `note` (選填) — 重新啟動哨兵 的備註
    - `restartDelayMs` (選填) — 重新啟動前的延遲 (預設為 2000)

    當一個重新啟動請求已經在等待中或正在執行時，後續的重新啟動請求會被合併，並且在重新啟動週期之間會有 30 秒的冷卻時間。

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
    將部分更新合併到現有組態中 (JSON 合併修補語意)：

    - 物件遞迴合併
    - `null` 刪除金鑰
    - 陣列替換

    參數：

    - `raw` (字串) — 僅包含要變更金鑰的 JSON5
    - `baseHash` (必填) — 來自 `config.get` 的組態雜湊值
    - `sessionKey`、`note`、`restartDelayMs` — 與 `config.apply` 相同

    重新啟動行為與 `config.apply` 一致：合併等待中的重新啟動請求，並在重新啟動週期之間有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父進程以及以下來源讀取環境變數：

- 當前工作目錄中的 `.env` (如果存在)
- `~/.openclaw/.env` (全域後備)

這兩個檔案都不會覆蓋既有的環境變數。您也可以在組態中設定內聯環境變數：

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

等效的環境變數： `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  您可以使用 `${VAR_NAME}` 在任何設定字串值中參照環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅符合大寫名稱： `[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時拋出錯誤
- 使用 `$${VAR}` 進行跳脫以取得字面輸出
- 適用於 `$include` 檔案內部
- 內聯替換： `"${BASE}/v1"` → `"https://api.example.com/v1"`

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

SecretRef 詳細資訊（包括 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

## 完整參考

如需完整的欄位逐一參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關： [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_
