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

請參閱 [完整參考](/en/gateway/configuration-reference) 以了解每個可用欄位。

<Tip>**初次接觸設定？** 請從 `openclaw onboard` 開始進行互動式設置，或是查看 [設定範例](/en/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

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
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據即時設定 schema 算繪表單，包括欄位 `title` / `description` 文件元資料，以及在可用時的外掛和通道 schema， 並提供 **Raw JSON** 編輯器作為備用方案。對於下鑽式 UI 和其他工具，閘道也公開 `config.schema.lookup` 以 取得單一路徑範圍的 schema 節點以及直接子項摘要。</Tab>
  <Tab title="Direct edit">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合 schema 的設定。未知金鑰、格式錯誤的類型或無效值會導致 Gateway **拒絕啟動**。唯一的頂層例外是 `$schema` (字串)，以便編輯器能附加 JSON Schema 元資料。</Warning>

Schema 工具說明：

- `openclaw config schema` 會列印出 Control UI
  和設定驗證所使用的相同 JSON Schema 系列。
- 欄位 `title` 和 `description` 值會被帶入 schema 輸出中，
  以供編輯器和表單工具使用。
- 巢狀物件、萬用字元 (`*`) 和陣列項目 (`[]`) 項目會在存在相符欄位文件的地方繼承相同的
  文件元資料。
- `anyOf` / `oneOf` / `allOf` 組合分支也繼承相同的文檔
  元數據，因此聯合/交集變體保留相同的字段幫助信息。
- `config.schema.lookup` 返回一個標準化的配置路徑，其中包含一個淺層
  節點 (`title`, `description`, `type`, `enum`, `const`, 通用邊界,
  和類似的驗證字段)、匹配的 UI 提示元數據，以及用於向下鑽取工具的直接子項
  摘要。
- 當網關可以加載當前的清單註冊表時，運行時插件/通道架構會被合併進來。

當驗證失敗時：

- 網關無法啟動
- 僅診斷命令可用 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 運行 `openclaw doctor` 以查看具體問題
- 運行 `openclaw doctor --fix` (或 `--yes`) 以應用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道都在 `channels.<provider>` 下有自己的配置部分。請參閱專屬頻道頁面了解設定步驟：

    - [WhatsApp](/en/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/en/channels/telegram) — `channels.telegram`
    - [Discord](/en/channels/discord) — `channels.discord`
    - [Feishu](/en/channels/feishu) — `channels.feishu`
    - [Google Chat](/en/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/en/channels/msteams) — `channels.msteams`
    - [Slack](/en/channels/slack) — `channels.slack`
    - [Signal](/en/channels/signal) — `channels.signal`
    - [iMessage](/en/channels/imessage) — `channels.imessage`
    - [Mattermost](/en/channels/mattermost) — `channels.mattermost`

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

  <Accordion title="選擇並設定模型">
    設定主要模型與可選的備援模型：

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

    - `agents.defaults.models` 定義模型目錄，並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖片的縮小比例（預設 `1200`）；較低的值通常會在大量擷圖的執行中減少視覺 token 的使用量。
    - 請參閱 [Models CLI](/en/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/en/concepts/model-failover) 以了解認證輪替與備援行為。
    - 對於自訂/自託管的供應商，請參閱參考資料中的 [Custom providers](/en/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳訊息給機器人">
    DM 存取權透過 `dmPolicy` 依頻道控制：

    - `"pairing"` (預設)：未知發送者會收到一次性配對代碼以供核准
    - `"allowlist"`：僅限 `allowFrom` 中的發送者 (或配對的允許存放區)
    - `"open"`：允許所有傳入 DM (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定頻道的允許清單。

    請參閱 [完整參考資料](/en/gateway/configuration-reference#dm-and-group-access) 以了解各頻道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天提及閘道">
    群組訊息預設為**需要提及**。依代理程式設定模式：

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

    - **Metadata mentions**：原生 @-提及 (WhatsApp 點擊提及、Telegram @bot 等)
    - **Text patterns**：`mentionPatterns` 中的安全 regex 模式
    - 請參閱 [完整參考資料](/en/gateway/configuration-reference#group-chat-mention-gating) 以了解各頻道覆寫和自我聊天模式。

  </Accordion>

  <Accordion title="限制各代理程式的技能">
    使用 `agents.defaults.skills` 作為共享基準，然後使用 `agents.list[].skills` 覆寫特定代理程式：

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
    - 設定 `agents.list[].skills: []` 以不使用任何技能。
    - 請參閱 [技能](/en/tools/skills)、[技能設定](/en/tools/skills-config) 和
      [設定參考資料](/en/gateway/configuration-reference#agentsdefaultsskills)。

  </Accordion>

  <Accordion title="調整閘道通道健康監控">
    控制閘道在通道看起來陳舊時重新啟動的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 停用單一通道或帳戶的自動重新啟動，而不停用全域監控器。
    - 請參閱 [健康檢查](/en/gateway/health) 以進行操作除錯，並參閱 [完整參考資料](/en/gateway/configuration-reference#gateway) 以了解所有欄位。

  </Accordion>

  <Accordion title="設定工作階段與重設">
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

    - `dmScope`： `main` (共享) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：執行緒綁定工作階段路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 請參閱 [工作階段管理](/en/concepts/session) 以了解範圍、身分連結和傳送原則。
    - 請參閱 [完整參考資料](/en/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙箱機制">
    在獨立的 Docker 容器中執行代理程式工作階段：

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

    請參閱 [沙箱機制](/en/gateway/sandboxing) 以取得完整指南，並參閱 [完整參考資料](/en/gateway/configuration-reference#agentsdefaultssandbox) 以了解所有選項。

  </Accordion>

  <Accordion title="Enable relay-backed push for official iOS builds">
    透過中繼支援的推送是在 `openclaw.json` 中設定。

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

    CLI 同等指令：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 讓 gateway 能夠透過外部中繼發送 `push.test`、喚醒提示以及重新連線喚醒。
    - 使用由配對的 iOS app 轉發的註冊範圍傳送授權。gateway 不需要部署範圍的中繼 token。
    - 將每個透過中繼支援的註冊綁定到 iOS app 所配對的 gateway 身份，因此其他 gateway 無法重複使用儲存的註冊資訊。
    - 讓本機/手動 iOS 版本維持使用直接 APNs 連線。透過中繼支援的傳送僅適用於透過中繼註冊的官方發布版本。
    - 必須與內建於官方/TestFlight iOS 版本中的中繼基底 URL 相符，以便註冊和傳送流量到達同一個中繼部署。

    端對端流程：

    1. 安裝使用相同中繼基底 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS app 與 gateway 配對，並讓 node 和 operator sessions 都連線。
    4. iOS app 擷取 gateway 身份，使用 App Attest 加上 app 收據向中繼註冊，然後將透過中繼支援的 `push.apns.register` payload 發布到配對的 gateway。
    5. gateway 儲存中繼 handle 和傳送授權，然後將其用於 `push.test`、喚醒提示以及重新連線喚醒。

    操作備註：

    - 如果您將 iOS app 切換到不同的 gateway，請重新連線 app，以便其發布綁定至該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，app 會重新整理其快取的中繼註冊，而不是重複使用舊的中繼來源。

    相容性備註：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍僅作為回環開發的緊急逃生門；請勿在設定中保存 HTTP 中繼 URL。

    請參閱 [iOS App](/en/platforms/ios#relay-backed-push-for-official-builds) 以了解端對端流程，並參閱 [Authentication and trust flow](/en/platforms/ios#authentication-and-trust-flow) 以了解中繼安全性模型。

  </Accordion>

  <Accordion title="Set up heartbeat (periodic check-ins)">
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

    - `every`: duration string (`30m`, `2h`). Set `0m` to disable.
    - `target`: `last` | `none` | `<channel-id>` (for example `discord`, `matrix`, `telegram`, or `whatsapp`)
    - `directPolicy`: `allow` (default) or `block` for DM-style heartbeat targets
    - See [Heartbeat](/en/gateway/heartbeat) for the full guide.

  </Accordion>

  <Accordion title="Configure cron jobs">
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

    - `sessionRetention`: prune completed isolated run sessions from `sessions.json` (default `24h`; set `false` to disable).
    - `runLog`: prune `cron/runs/<jobId>.jsonl` by size and retained lines.
    - See [Cron jobs](/en/automation/cron-jobs) for feature overview and CLI examples.

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

    安全性備註：
    - 將所有 hook/webhook payload 內容視為不受信任的輸入。
    - 使用專用的 `hooks.token`；不要重複使用共享的 Gateway token。
    - Hook 驗證僅限於標頭 (`Authorization: Bearer ...` 或 `x-openclaw-token`)；查詢字串 token 將被拒絕。
    - `hooks.path` 無法 `/`；請將 webhook 入站保留在專用子路徑上，例如 `/hooks`。
    - 保持不安全內容繞過旗標停用 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)，除非進行嚴格範圍的偵錯。
    - 如果您啟用 `hooks.allowRequestSessionKey`，同時請設定 `hooks.allowedSessionKeyPrefixes` 以限制呼叫者選擇的會話金鑰。
    - 對於由 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具原則 (例如僅限訊息傳遞以及盡可能使用沙箱機制)。

    請參閱 [完整參考資料](/en/gateway/configuration-reference#hooks) 以了解所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="設定多代理程式路由">
    使用獨立的工作空間和會話執行多個隔離的代理程式：

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

    請參閱 [Multi-Agent](/en/concepts/multi-agent) 和 [完整參考資料](/en/gateway/configuration-reference#multi-agent-routing) 以了解繫結規則和每個代理程式的存取設定檔。

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
    - **檔案陣列**：按順序深度合併 (後者優先)
    - **同層級金鑰**：在 include 之後合併 (覆寫包含的值)
    - **巢狀 include**：支援最多 10 層深度
    - **相對路徑**：相對於包含檔案解析
    - **錯誤處理**：針對遺失檔案、解析錯誤和循環 include 提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## Config 熱重載

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 對於大多數設定，無需手動重新啟動。

### 重新載入模式

| 模式                | 行為                                                          |
| ------------------- | ------------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全變更。對於關鍵變更則自動重新啟動。              |
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

### 何者熱套用 vs 何者需重新啟動

大多數欄位可熱套用而不造成停機。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別           | 欄位                                                 | 需要重新啟動？ |
| -------------- | ---------------------------------------------------- | -------------- |
| 頻道           | `channels.*`, `web` (WhatsApp) — 所有內建與擴充頻道  | 否             |
| Agent 與模型   | `agent`, `agents`, `models`, `routing`               | 否             |
| 自動化         | `hooks`, `cron`, `agent.heartbeat`                   | 否             |
| 會話與訊息     | `session`, `messages`                                | 否             |
| 工具與媒體     | `tools`, `browser`, `skills`, `audio`, `talk`        | 否             |
| UI 與其他      | `ui`, `logging`, `identity`, `bindings`              | 否             |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**         |
| 基礎架構       | `discovery`, `canvasHost`, `plugins`                 | **是**         |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 更改它們**不會**觸發重新啟動。</Note>

## Config RPC (程式化更新)

<Note>控制平面寫入 RPC (`config.apply`、`config.patch`、`update.run`) 對每個 `deviceId+clientIp` 的速率限制為 **60 秒 3 次請求**。當受到限制時，RPC 會傳回 `UNAVAILABLE` 並附帶 `retryAfterMs`。</Note>

安全/預設流程：

- `config.schema.lookup`：檢查單一路徑範圍的配置子樹，包含淺層架構節點、相符的提示元資料及直接子項摘要
- `config.get`：取得目前的快照 + 雜湊
- `config.patch`：偏好的部分更新路徑
- `config.apply`：僅限完整配置替換
- `update.run`：明確的自我更新 + 重啟

當您不是要替換整個配置時，請優先使用 `config.schema.lookup`
然後再使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    驗證 + 寫入完整配置並單一步驟重啟 Gateway。

    <Warning>
    `config.apply` 會替換 **整個配置**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 更新單一金鑰。
    </Warning>

    參數：

    - `raw` (字串) — 整個配置的 JSON5 載荷
    - `baseHash` (選用) — 來自 `config.get` 的配置雜湊 (當配置存在時為必填)
    - `sessionKey` (選用) — 用於重啟後喚醒 ping 的 session 金鑰
    - `note` (選用) — 重啟哨兵的備註
    - `restartDelayMs` (選用) — 重啟前的延遲 (預設 2000)

    當一個重啟請求已經在等待或處理中時，重啟請求會被合併，且重啟週期之間會有 30 秒的冷卻時間。

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

    - `raw` (string) — 僅包含要更改的鍵的 JSON5
    - `baseHash` (required) — 來自 `config.get` 的配置雜湊
    - `sessionKey`、`note`、`restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 相符：合併待處理的重啟，並在重啟週期之間有 30 秒的冷卻時間。

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

- 來自目前工作目錄的 `.env`（如果存在）
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

環境變數等效項：`OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Env var substitution in config values">
  使用 `${VAR_NAME}` 在任何配置字串值中引用環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空白的變數會在載入時拋出錯誤
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

SecretRef 的詳細資訊（包括 `env`/`file`/`exec` 的 `secrets.providers`）請參閱 [Secrets Management](/en/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/en/reference/secretref-credential-surface)。

</Accordion>

如需完整的優先順序和來源，請參閱 [Environment](/en/help/environment)。

## 完整參考

如需完整的逐欄參考，請參閱 **[Configuration Reference](/en/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/en/gateway/configuration-examples) · [Configuration Reference](/en/gateway/configuration-reference) · [Doctor](/en/gateway/doctor)_
