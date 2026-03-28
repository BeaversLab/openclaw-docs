---
summary: "設定概覽：常見任務、快速設定，以及完整參考資料的連結"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "設定"
---

# 設定

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取選用的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定。

如果檔案缺失，OpenClaw 會使用安全的預設值。新增配置檔案的常見原因：

- 連接頻道並控制誰可以傳送訊息給機器人
- 設定模型、工具、沙盒或自動化（cron、hooks）
- 調整會話、媒體、網路或 UI

請參閱[完整參考](/zh-Hant/gateway/configuration-reference)以了解所有可用欄位。

<Tip>**剛開始接觸設定？** 從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。</Tip>

## 最小設定

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 編輯設定

<Tabs>
  <Tab title="Interactive wizard">```exec openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```exec openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。 Control UI 會根據配置架構繪製表單，並提供 **Raw JSON** 編輯器作為備用方案。</Tab>
  <Tab title="直接編輯">直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監視該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。</Tab>
</Tabs>

## 嚴格驗證

<Warning>OpenClaw 僅接受完全符合架構的配置。未知的鍵、格式錯誤的類型或無效的值會導致 Gateway **拒絕啟動**。唯一頂層的例外是 `$schema` (字串)，以便編輯器附加 JSON Schema 元數據。</Warning>

當驗證失敗時：

- Gateway 將無法啟動
- 只有診斷命令有效（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix`（或 `--yes`）以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道在 `channels.<provider>` 下都有自己的配置區段。請參閱專屬頻道頁面以了解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) — `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) — `channels.discord`
    - [Slack](/zh-Hant/channels/slack) — `channels.slack`
    - [Signal](/zh-Hant/channels/signal) — `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) — `channels.imessage`
    - [Google Chat](/zh-Hant/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/zh-Hant/channels/mattermost) — `channels.mattermost`
    - [Microsoft Teams](/zh-Hant/channels/msteams) — `channels.msteams`

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
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並作為 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制逐字稿/工具圖像的縮小比例（預設 `1200`）；較低的值通常能減少在大量截圖執行時的視覺 token 使用量。
    - 請參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，以及 [Model Failover](/zh-Hant/concepts/model-failover) 以了解認證輪替與備援行為。
    - 若為自訂/自託管供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="Control who can message the bot">
    DM 存取權限透過 `dmPolicy` 依頻道控制：

    - `"pairing"` (預設)：未知發送者會收到一次性配對碼以供核准
    - `"allowlist"`：僅允許 `allowFrom` 中的發送者 (或已配對的允許儲存庫)
    - `"open"`：允許所有傳入 DM (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定頻道的允許清單。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以了解各頻道的詳細資訊。

  </Accordion>

  <Accordion title="設定群組聊天的提及閘門">
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

    - **中繼資料提及**：原生 @ 提及（WhatsApp 點擊提及、Telegram @bot 等）
    - **文字模式**：`mentionPatterns` 中的安全 regex 模式
    - 請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating) 以了解各頻道的覆寫與自聊模式。

  </Accordion>

  <Accordion title="調整閘道通道健康監控">
    控制閘道重新啟動看起來停滯通道的積極程度：

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
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 針對單一通道或帳戶停用自動重新啟動，而不必停用全域監控器。
    - 請參閱[健康檢查](/zh-Hant/gateway/health)以進行操作除錯，並參閱[完整參考](/zh-Hant/gateway/configuration-reference#gateway)以了解所有欄位。

  </Accordion>

  <Accordion title="Configure sessions and resets">
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
    - `threadBindings`: 繫結至執行緒之會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 請參閱 [Session Management](/zh-Hant/concepts/session) 以了解範圍、身分連結和發送原則。
    - 請參閱 [full reference](/zh-Hant/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>

  <Accordion title="啟用沙盒">
    在隔離的 Docker 容器中運行代理程式階段：

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

    請參閱[沙盒機制](/zh-Hant/gateway/sandboxing)以取得完整指南，並參閱[完整參考](/zh-Hant/gateway/configuration-reference#agents-defaults-sandbox)以了解所有選項。

  </Accordion>

  <Accordion title="針對官方 iOS 版本啟用透過中繼的推送">
    透過中繼的推送是在 `openclaw.json` 中設定的。

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

    對應的 CLI 指令：

    ```exec
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    此設定的作用：

    - 讓 gateway 能夠透過外部中繼傳送 `push.test`、喚醒推播 (wake nudges) 以及重新連線喚醒 (reconnect wakes)。
    - 使用由配對的 iOS App 轉發的註冊範圍傳送授權 (registration-scoped send grant)。Gateway 不需要部署範圍的中繼權杖 (relay token)。
    - 將每個透過中繼的註冊綁定到 iOS App 所配對的 gateway 身份，因此另一個 gateway 無法重複使用已儲存的註冊資訊。
    - 讓本機/手動 iOS 版本保持在直接連線 APNs。透過中繼的傳送僅適用於透過中繼註冊的官方發行版本。
    - 必須符合內建於官方/TestFlight iOS 版本中的中繼基礎 URL (relay base URL)，以便註冊和傳送流量到達相同的中繼部署。

    端到端流程：

    1. 安裝使用相同中繼基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS App 與 gateway 配對，並讓 node 和 operator sessions 都連線。
    4. iOS App 會擷取 gateway 身份，使用 App Attest 和 App 收據 (app receipt) 向中繼註冊，然後將透過中繼的 `push.apns.register` 資料發佈至配對的 gateway。
    5. Gateway 會儲存中繼控制代碼 (relay handle) 和傳送授權，然後將其用於 `push.test`、喚醒推播以及重新連線喚醒。

    操作注意事項：

    - 如果您將 iOS App 切換到不同的 gateway，請重新連線 App，讓它發佈綁定至該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，App 會重新整理其快取的中繼註冊，而不是重複使用舊的中繼來源 (relay origin)。

    相容性注意事項：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍然可作為暫時性的環境變數覆寫。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然是僅限 loopback 的開發緊急應變方案 (escape hatch)；請勿在設定中保存 HTTP 中繼 URL。

    請參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds) 以了解端到端流程，以及 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow) 以了解中繼安全模型。

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

    - `every`：持續時間字串 (`30m`, `2h`)。設為 `0m` 以停用。
    - `target`：`last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`：`allow` (預設) 或 DM 風格心跳目標的 `block`
    - 請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整指南。

  </Accordion>

  <Accordion title="設定 cron 工作">
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

    - `sessionRetention`：從 `sessions.json` 中修剪已完成的隔離執行階段（預設 `24h`；設定 `false` 以停用）。
    - `runLog`：根據大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以了解功能概覽和 CLI 範例。

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
    - 將所有 hook/webhook 載荷內容視為不受信任的輸入。
    - 除非進行嚴格範圍的調試，否則請保持不安全內容繞過標誌停用 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)。
    - 對於由 hook 驅動的代理，請偏好強大的現代模型層級和嚴格的工具策略（例如，僅限傳訊並在可能的情況下使用沙盒）。

    參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#hooks) 以了解所有對映選項和 Gmail 整合。

  </Accordion>

  <Accordion title="Configure multi-agent routing">
    執行多個獨立的代理，並使用各自的工作區和會話：

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

    參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent) 和 [完整參考](/zh-Hant/gateway/configuration-reference#multi-agent-routing%) 以了解綁定規則和每個代理的存取設定檔。

  </Accordion>

  <Accordion title="將配置拆分為多個文件 ($include)">
    使用 `$include` 來整理大型配置：

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

    - **單個文件**：替換包含的物件
    - **文件陣列**：按順序進行深度合併（後者優先）
    - **同層級鍵**：在包含之後進行合併（覆蓋包含的值）
    - **巢狀包含**：支援最多 10 層深度
    - **相對路徑**：相對於包含的文件進行解析
    - **錯誤處理**：針對缺失文件、解析錯誤和循環包含提供清晰的錯誤訊息

  </Accordion>
</AccordionGroup>

## 配置熱重載

Gateway 會監視 `~/.openclaw/openclaw.json` 並自動套用變更 — 大多數設定無需手動重新啟動。

### 重載模式

| 模式                | 行為                                                 |
| ------------------- | ---------------------------------------------------- |
| **`hybrid`** (預設) | 即時熱套用安全變更。對關鍵變更自動重啟。             |
| **`hot`**           | 僅熱套用安全變更。當需要重啟時記錄警告 —— 由您處理。 |
| **`restart`**       | 對任何配置變更（安全與否）皆重啟 Gateway。           |
| **`off`**           | 停用檔案監視。變更在下次手動重啟時生效。             |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 熱套用項目 vs 需重啟項目

大部分欄位可無停機熱套用。在 `hybrid` 模式下，需要重啟的變更會自動處理。

| 類別           | 欄位                                                 | 需重啟？ |
| -------------- | ---------------------------------------------------- | -------- |
| 頻道           | `channels.*`、`web` (WhatsApp) —— 所有內建與擴充頻道 | 否       |
| 代理與模型     | `agent`, `agents`, `models`, `routing`               | 否       |
| 自動化         | `hooks`, `cron`, `agent.heartbeat`                   | 否       |
| 會話與訊息     | `session`, `messages`                                | 否       |
| 工具與媒體     | `tools`, `browser`, `skills`, `audio`, `talk`        | 否       |
| UI 與其他      | `ui`, `logging`, `identity`, `bindings`              | 否       |
| Gateway 伺服器 | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP) | **是**   |
| 基礎架構       | `discovery`, `canvasHost`, `plugins`                 | **是**   |

<Note>`gateway.reload` 和 `gateway.remote` 是例外 — 更改它們並**不**會觸發重啟。</Note>

## 設定 RPC（程式化更新）

<Note>控制平面寫入 RPC（`config.apply`, `config.patch`, `update.run`）的速率限制為每個 `deviceId+clientIp` **60 秒內 3 個請求**。當受到限制時，RPC 會傳回 `UNAVAILABLE` 並包含 `retryAfterMs`。</Note>

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    驗證 + 寫入完整設定並在一個步驟中重新啟動 Gateway。

    <Warning>
    `config.apply` 會取代**完整設定**。請使用 `config.patch` 進行部分更新，或使用 `openclaw config set` 更新單一金鑰。
    </Warning>

    參數：

    - `raw` (字串) — 完整設定的 JSON5 載荷
    - `baseHash` (可選) — 來自 `config.get` 的設定雜湊值 (當設定存在時為必填)
    - `sessionKey` (可選) — 用於重新啟動後喚醒 ping 的會話金鑰
    - `note` (可選) — 重新啟動哨兵的註記
    - `restartDelayMs` (可選) — 重新啟動前的延遲 (預設 2000)

    當一個重新啟動請求已經正在等待或進行中時，後續的請求會被合併，且重新啟動週期之間會有 30 秒的冷卻時間。

    ```exec
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

    - `raw` (字串) — 僅包含要更改的鍵的 JSON5
    - `baseHash` (必需) — 來自 `config.get` 的配置雜湊
    - `sessionKey`, `note`, `restartDelayMs` — 與 `config.apply` 相同

    重啟行為與 `config.apply` 匹配：合併待處理的重啟，並在重啟週期之間有 30 秒的冷卻時間。

    ```exec
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父進程以及以下位置讀取環境變數：

- 來自目前工作目錄（如果存在）的 `.env`
- `~/.openclaw/.env`（全域後備）

這兩個檔案都不會覆蓋既有的環境變數。您也可以在配置中設定內聯環境變數：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 環境匯入（選用）">
  如果啟用此功能且未設定預期的金鑰，OpenClaw 會執行您的登入 shell 並僅匯入遺漏的金鑰：

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
  在任何配置字串值中參照環境變數，使用 `${VAR_NAME}`：

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
- 在 `$include` 檔案中有效
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

SecretRef 的詳細資訊（包括 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。

</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序和來源。

## 完整參考

若要查看完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[配置範例](/zh-Hant/gateway/configuration-examples) · [配置參考](/zh-Hant/gateway/configuration-reference) · [診斷工具](/zh-Hant/gateway/doctor)_
