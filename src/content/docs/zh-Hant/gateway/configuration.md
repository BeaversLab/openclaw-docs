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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會即時根據設定架構渲染表單，包括欄位 `title` / `description` 文件元資料，以及在可用時的外掛與通道架構，並提供 **Raw JSON** 編輯器作為備用方案。對於 深層 UI 和其他工具，閘道也會公開 `config.schema.lookup` 以 取得單一路徑範圍的架構節點以及立即子項摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。閘道會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合 schema 的設定。未知金鑰、格式錯誤的類型或無效值會導致 Gateway **拒絕啟動**。唯一的頂層例外是 `$schema` (字串)，以便編輯器能附加 JSON Schema 元資料。</Warning>

Schema 工具說明：

- `openclaw config schema` 會列印出 Control UI
  和設定驗證所使用的相同 JSON Schema 系列。
- 請將該架構輸出視為
  `openclaw.json` 的標準機器可讀契約；此概览與設定參考資料即為其摘要。
- 欄位 `title` 和 `description` 值會被帶入架構輸出中，以供
  編輯器和表單工具使用。
- 巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 項目會繼承相同的
  文件元資料，前提是存在相符的欄位文件。
- `anyOf` / `oneOf` / `allOf` 組合分支也會繼承相同的文件
  元資料，因此聯集/交集變體會保留相同的欄位說明。
- `config.schema.lookup` 會傳回一個標準化的設定路徑，並包含淺層
  架構節點 (`title`, `description`, `type`, `enum`, `const`, 通用邊界,
  以及類似的驗證欄位)、相符的 UI 提示元資料，以及供深層工具使用的立即子項
  摘要。
- 當 Gateway 可以載入目前的 manifest registry 時，Runtime plugin/channel schemas 會被合併進來。
- `pnpm config:docs:check` 會偵測面向文件的 config baseline artifacts 與目前 schema surface 之間的差異。

當驗證失敗時：

- Gateway 將無法啟動
- 僅診斷指令可運作 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 執行 `openclaw doctor` 以查看具體問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="Set up a channel (WhatsApp, Telegram, Discord, etc.)">
    每個通道在 `channels.<provider>` 下都有自己的設定區段。請參閱專屬的通道頁面以了解設定步驟：

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

    所有通道都共享相同的 DM policy pattern：

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

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖片的縮小比例（預設 `1200`）；較低的值通常會在包含大量截圖的執行中減少視覺 token 的使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，以及 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替和備用行為。
    - 對於自訂/自託管的提供者，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    私訊存取權透過 `dmPolicy` 依管道控制：

    - `"pairing"` (預設)：未知的傳送者會收到一次性配對代碼以供核准
    - `"allowlist"`：僅限 `allowFrom` 中的傳送者（或已配對的允許儲存區）
    - `"open"`：允許所有傳入私訊（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私訊

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    請參閱 [full reference](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以了解各管道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘門">
    群組訊息預設為**需要提及**。請針對每個代理程式設定模式：

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

    - **Metadata mentions**：原生的 @-提及（WhatsApp 點擊提及、Telegram @bot 等）
    - **Text patterns**：`mentionPatterns` 中的安全 regex 模式
    - 請參閱 [full reference](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating) 以了解各管道的覆寫和自我聊天模式。

  </Accordion>

  <Accordion title="限制每個代理的技能">
    使用 `agents.defaults.skills` 作為共享基線，然後使用 `agents.list[].skills` 覆蓋特定
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

    - 省略 `agents.defaults.skills` 以預設不限制技能。
    - 省略 `agents.list[].skills` 以繼承預設值。
    - 設定 `agents.list[].skills: []` 表示無技能。
    - 請參閱 [技能](/zh-Hant/tools/skills)、[技能配置](/zh-Hant/tools/skills-config) 和
      [配置參考](/zh-Hant/gateway/configuration-reference#agents-defaults-skills)。

  </Accordion>

  <Accordion title="調整通道健康監控">
    控制通道在顯示為過時時的重新啟動積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 來停用單一通道或帳戶的自動重新啟動，而不需停用全域監控。
    - 請參閱 [健康檢查](/zh-Hant/gateway/health) 以進行營運除錯，並參閱 [完整參考](/zh-Hant/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="配置會話與重置">
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

    - `dmScope`: `main` (共享) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: 執行緒繫結會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 請參閱 [會話管理](/zh-Hant/concepts/session) 以了解範圍、身分連結和傳送原則。
    - 請參閱 [完整參考](/zh-Hant/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒機制">
    在隔離的 Docker 容器中執行代理程式階段：

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

    先建構映像檔：`scripts/sandbox-setup.sh`

    請參閱 [沙盒機制](/zh-Hant/gateway/sandboxing) 以取得完整指南，以及 [完整參考資料](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox) 以瞭解所有選項。

  </Accordion>

  <Accordion title="為官方 iOS 版本啟用基於中繼的推送">
    基於中繼的推送是在 `openclaw.json` 中設定的。

    在 gateway config 中進行此設定：

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

    - 允許 gateway 通過外部中繼發送 `push.test`、喚醒提醒 (wake nudges) 和重連喚醒 (reconnect wakes)。
    - 使用由配對的 iOS App 轉發的註冊範圍傳送權限。Gateway 不需要部署範圍的中繼 Token。
    - 將每個基於中繼的註冊綁定到 iOS App 配對的 gateway 身份，因此其他 gateway 無法重用儲存的註冊資訊。
    - 讓本機/手動構建的 iOS 版本保持使用直接 APNs。基於中繼的傳送僅適用於通過中繼註冊的官方分發版本。
    - 必須與內建於官方/TestFlight iOS 版本中的中繼基礎 URL 相符，以便註冊和傳送流量到達同一個中繼部署。

    端到端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS App 與 gateway 配對，並讓 node 和 operator sessions 都連線。
    4. iOS App 獲取 gateway 身份，使用 App Attest 加上 App 收據向中繼註冊，然後將基於中繼的 `push.apns.register` payload 發布到配對的 gateway。
    5. Gateway 儲存中繼處理程式和傳送權限，然後將它們用於 `push.test`、喚醒提醒 (wake nudges) 和重連喚醒 (reconnect wakes)。

    操作須知：

    - 如果您將 iOS App 切換到不同的 gateway，請重新連接 App，以便其發佈綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，App 將重新整理其快取的中繼註冊，而不是重用舊的中繼來源。

    相容性注意事項：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是僅限回環的開發逃生艙；請勿在 config 中保留 HTTP 中繼 URL。

    請參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 了解端到端流程，並參閱 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow) 了解中繼安全模型。

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
    - 參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

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

    - `sessionRetention`: 從 `sessions.json` 中清除已完成的獨立執行階段 (預設 `24h`; 設定 `false` 以停用)。
    - `runLog`: 根據大小和保留行數清除 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概述和 CLI 範例。

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

    安全注意事項：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；不要重複使用共用的 Gateway token。
    - Hook 驗證僅限於標頭 (`Authorization: Bearer ...` 或 `x-openclaw-token`)；查詢字串 tokens 將被拒絕。
    - `hooks.path` 不能被 `/`；請將 webhook 入口保留在專用的子路徑上，例如 `/hooks`。
    - 除非進行嚴格範圍的偵錯，否則請停用不安全內容略過標誌 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)。
    - 如果您啟用 `hooks.allowRequestSessionKey`，請同時設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫端選擇的工作階段金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具原則 (例如僅限傳訊加上盡可能使用沙箱機制)。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="設定多代理程式路由">
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

    請參閱 [多代理程式](/zh-Hant/concepts/multi-agent) 和 [完整參考資料](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解綁定規則和各代理程式的存取設定檔。

  </Accordion>

  <Accordion title="將設定拆分為多個檔案 ($include)">
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
    - **檔案陣列**：依順序深度合併 (後者優先)
    - **同層級金鑰**：在包含之後合併 (覆寫包含的值)
    - **巢狀包含**：支援最多 10 層深
    - **相對路徑**：相對於包含的檔案解析
    - **錯誤處理**：對於遺失檔案、解析錯誤和循環包含會提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定檔熱重載

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 對於大多數設定，不需要手動重新啟動。

### 重新載入模式

| 模式                | 行為                                                            |
| ------------------- | --------------------------------------------------------------- |
| **`hybrid`** (預設) | 即時熱套用安全的變更。對於關鍵變更，會自動重新啟動。            |
| **`hot`**           | 僅熱套用安全的變更。當需要重新啟動時會記錄警告 — 由您自行處理。 |
| **`restart`**       | 在任何設定變更時重新啟動 Gateway，無論是否安全。                |
| **`off`**           | 停用檔案監視。變更將在下次手動重新啟動時生效。                  |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目與需要重新啟動的項目

大多數欄位可無停機時間地熱套用。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                   | 需要重新啟動？ |
| -------------- | ------------------------------------------------------ | -------------- |
| 頻道           | `channels.*`、`web` (WhatsApp) — 所有內建和擴充頻道    | 否             |
| Agent 和模型   | `agent`、`agents`、`models`、`routing`                 | 否             |
| 自動化         | `hooks`、`cron`、`agent.heartbeat`                     | 否             |
| 工作階段與訊息 | `session`、`messages`                                  | 否             |
| 工具與媒體     | `tools`、`browser`、`skills`、`audio`、`talk`          | 否             |
| UI 與其他      | `ui`、`logging`、`identity`、`bindings`                | 否             |
| Gateway 伺服器 | `gateway.*` (連接埠、綁定、驗證、Tailscale、TLS、HTTP) | **是**         |
| 基礎架構       | `discovery`、`canvasHost`、`plugins`                   | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 變更這些設定**不會**觸發重新啟動。</Note>

## Config RPC (程式化更新)

<Note>Control-plane 寫入 RPC (`config.apply`, `config.patch`, `update.run`) 對每個 `deviceId+clientIp` 的速率限制為 **60 秒內 3 個請求**。當受到限制時，RPC 會傳回 `UNAVAILABLE` 並帶有 `retryAfterMs`。</Note>

安全/預設流程：

- `config.schema.lookup`: 檢查單一路徑範圍的設定子樹，包含淺層 schema 節點、匹配的提示元數據以及直接子項摘要
- `config.get`: 取得目前的快照 + 雜湊
- `config.patch`: 首選的部分更新路徑
- `config.apply`: 僅用於完整設定替換
- `update.run`: 明確的自我更新 + 重啟

當您不是要替換整個設定時，建議優先使用 `config.schema.lookup`
然後使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (完整替換)">
    驗證 + 寫入完整設定並在一個步驟中重啟 Gateway。

    <Warning>
    `config.apply` 會取代 **整個設定**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 更新單一金鑰。
    </Warning>

    參數：

    - `raw` (字串) — 整個設定的 JSON5 載荷
    - `baseHash` (可選) — 來自 `config.get` 的設定雜湊 (當設定存在時為必填)
    - `sessionKey` (可選) — 用於重啟後喚醒 ping 的 session 金鑰
    - `note` (可選) — 重啟哨兵的備註
    - `restartDelayMs` (可選) — 重啟前的延遲 (預設 2000)

    當一個重啟請求已經在處理中或傳輸中時，後續的重啟請求會被合併，且重啟週期之間會有 30 秒的冷卻時間。

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
    將部分更新合併到現有配置（JSON 合併補丁語義）：

    - 物件遞迴合併
    - `null` 刪除一個鍵
    - 陣列替換

    參數：

    - `raw` (字串) — 僅包含要變更的鍵的 JSON5
    - `baseHash` (必填) — 來自 `config.get` 的配置雜湊
    - `sessionKey`, `note`, `restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 一致：合併擱置的重啟請求，並在重啟週期之間有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父進程讀取環境變數，此外還包括：

- 來自目前工作目錄的 `.env` (如果存在)
- `~/.openclaw/.env` (全域後備)

這兩個檔案都不會覆蓋既有的環境變數。您也可以在配置中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell env import (optional)">
  如果啟用且未設定預期的鍵，OpenClaw 會執行您的登入 shell 並僅匯入缺失的鍵：

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
  使用 `${VAR_NAME}` 在任何配置字串值中參照環境變數：

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

SecretRef 詳情（包括 `secrets.providers` 用於 `env`/`file`/`exec`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序與來源。

## 完整參考

如需完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關連結：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_
