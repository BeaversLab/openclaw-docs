---
summary: "設定概覽：常見任務、快速設定，以及連結至完整參考資料"
read_when:
  - 首次設定 OpenClaw
  - 尋找常見的設定模式
  - 導覽至特定設定章節
title: "設定"
---

# 設定

OpenClaw 會從 `~/.openclaw/openclaw.json` 讀取可選的 <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> 設定檔。

如果檔案不存在，OpenClaw 會使用安全的預設值。新增設定檔的常見原因：

- 連接頻道並控制誰能傳送訊息給機器人
- 設定模型、工具、沙箱或自動化（cron、hooks）
- 調整工作階段、媒體、網路或 UI

請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference) 以了解所有可用欄位。

<Tip>
**剛接觸設定？** 請從 `openclaw onboard` 開始進行互動式設定，或查看 [設定範例](/zh-Hant/gateway/configuration-examples) 指南以取得完整的複製貼上設定。
</Tip>

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
  <Tab title="Interactive wizard">
    ```bash
    openclaw onboard       # full onboarding flow
    openclaw configure     # config wizard
    ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="控制介面">
    開啟 [http://127.0.0.1:18789](http://127.0.0.1:18789) 並使用 **Config** 分頁。
    控制介面會根據設定 Schema 呈現表單，並提供 **Raw JSON** 編輯器作為備選方案。
  </Tab>
  <Tab title="直接編輯">
    直接編輯 `~/.openclaw/openclaw.json`。Gateway 會監看該檔案並自動套用變更（請參閱 [熱重載](#config-hot-reload)）。
  </Tab>
</Tabs>

## 嚴格驗證

<Warning>
OpenClaw 僅接受完全符合 Schema 的設定。未知的金鑰、格式錯誤的類型或無效的值會導致 Gateway **拒絕啟動**。唯一頂層的例外是 `$schema` (字串)，以便編輯器能附加 JSON Schema 中繼資料。
</Warning>

當驗證失敗時：

- Gateway 不會啟動
- 僅診斷指令有效 (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- 執行 `openclaw doctor` 以查看確切問題
- 執行 `openclaw doctor --fix` (或 `--yes`) 以套用修復

## 常見任務

<AccordionGroup>
  <Accordion title="設定頻道（WhatsApp、Telegram、Discord 等）">
    每個頻道都在 `channels.<provider>` 下有其專屬的設定區段。請參閱專屬頻道頁面瞭解設定步驟：

    - [WhatsApp](/zh-Hant/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-Hant/channels/telegram) — `channels.telegram`
    - [Discord](/zh-Hant/channels/discord) — `channels.discord`
    - [Slack](/zh-Hant/channels/slack) — `channels.slack`
    - [Signal](/zh-Hant/channels/signal) — `channels.signal`
    - [iMessage](/zh-Hant/channels/imessage) — `channels.imessage`
    - [Google Chat](/zh-Hant/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/zh-Hant/channels/mattermost) — `channels.mattermost`
    - [MS Teams](/zh-Hant/channels/msteams) — `channels.msteams`

    所有頻道共享相同的直接訊息（DM）政策模式：

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
    設定主要模型及可選的後備模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定義模型目錄並充當 `/model` 的允許清單。
    - 模型參照使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制文字記錄/工具圖片的縮圖品質（預設為 `1200`）；較低的值通常能減少大量截圖執行時的視覺權位（vision-token）使用量。
    - 參閱 [Models CLI](/zh-Hant/concepts/models) 以在聊天中切換模型，並參閱 [Model Failover](/zh-Hant/concepts/model-failover) 以瞭解認證輪替和後備行為。
    - 對於自訂/自託管供應商，請參閱參考資料中的 [Custom providers](/zh-Hant/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制誰可以傳送訊息給機器人">
    DM 存取權透過 `dmPolicy` 依管道進行控制：

    - `"pairing"` (預設)：未知發送者會收到一次性配對代碼以進行核准
    - `"allowlist"`：僅允許 `allowFrom` 中的發送者 (或配對的允許存放區)
    - `"open"`：允許所有傳入 DM (需要 `allowFrom: ["*"]`)
    - `"disabled"`：忽略所有 DM

    對於群組，請使用 `groupPolicy` + `groupAllowFrom` 或特定管道的允許清單。

    請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#dm-and-group-access) 以瞭解各管道的詳細資訊。

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

    - **中繼資料提及**：原生 @-提及 (WhatsApp 輕觸提及、Telegram @bot 等)
    - **文字模式**：`mentionPatterns` 中的安全 Regex 模式
    - 請參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#group-chat-mention-gating) 以瞭解各管道覆寫和自聊模式。

  </Accordion>

  <Accordion title="調整閘道管道健康狀態監控">
    控制閘道多積極地重新啟動看起來停滯的管道：

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

    - 設定 `gateway.channelHealthCheckMinutes: 0` 以全域停用健康監控器重新啟動。
    - `channelStaleEventThresholdMinutes` 應大於或等於檢查間隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled` 在不停用全域監控器的情況下，停用單一管道或帳戶的自動重新啟動。
    - 請參閱 [健康檢查](/zh-Hant/gateway/health) 以進行營運偵錯，並參閱 [完整參考資料](/zh-Hant/gateway/configuration-reference#gateway) 以瞭解所有欄位。

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

    - `dmScope`： `main` (共用) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：執行緒綁定會話路由的全域預設值 (Discord 支援 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`)。
    - 參閱 [會話管理](/zh-Hant/concepts/session) 以了解範圍、身分連結和發送原則。
    - 參閱 [完整參考](/zh-Hant/gateway/configuration-reference#session) 以了解所有欄位。

  </Accordion>


  <Accordion title="啟用沙箱">
    在隔離的 Docker 容器中執行代理程式會話：

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

    請先建構映像檔： `scripts/sandbox-setup.sh`

    參閱 [沙箱](/zh-Hant/gateway/sandboxing) 以取得完整指南，並參閱 [完整參考](/zh-Hant/gateway/configuration-reference#sandbox) 以了解所有選項。

  </Accordion>


  <Accordion title="為官方 iOS 版本啟用基於中繼的推送">
    基於中繼的推送是在 `openclaw.json` 中設定的。

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

    其作用如下：

    - 允許透過外部中繼器傳送 `push.test`、喚醒提示 (wake nudges) 和重新連線喚醒。
    - 使用由配對的 iOS 應用程式轉發的註冊範圍傳送授權 (send grant)。Gateway 不需要部署範圍的中繼權杖。
    - 將每個基於中繼的註冊綁定到 iOS 應用程式配對的 gateway 身份，因此其他 gateway 無法重用已儲存的註冊。
    - 將本機/手動的 iOS 版本保留在直接 APNs 上。基於中繼的傳送僅適用於透過中繼器註冊的官方發布版本。
    - 必須與內建於官方/TestFlight iOS 版本中的中繼器基礎 URL 相符，以便註冊和傳送流量到達同一個中繼部署。

    端對端流程：

    1. 安裝使用相同中繼器基礎 URL 編譯的官方/TestFlight iOS 版本。
    2. 在 gateway 上設定 `gateway.push.apns.relay.baseUrl`。
    3. 將 iOS 應用程式與 gateway 配對，並讓 node 和 operator 工作階段都連線。
    4. iOS 應用程式會擷取 gateway 身份，使用 App Attest 和應用程式收據向中繼器註冊，然後將基於中繼的 `push.apns.register` payload 發布到配對的 gateway。
    5. Gateway 會儲存中繼控制代碼 和傳送授權，然後將它們用於 `push.test`、喚醒提示和重新連線喚醒。

    操作說明：

    - 如果您將 iOS 應用程式切換到不同的 gateway，請重新連線應用程式，使其能夠發布綁定到該 gateway 的新中繼註冊。
    - 如果您發布指向不同中繼部署的新 iOS 版本，應用程式會重新整理其快取的中繼註冊，而不是重用舊的中繼來源。

    相容性說明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作為臨時的環境變數覆寫使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 僅作為僅限本機的開發緊急逃生機制；請勿在設定中保留 HTTP 中繼器 URL。

    如需端對端流程，請參閱 [iOS App](/zh-Hant/platforms/ios#relay-backed-push-for-official-builds)；如需中繼器安全模型，請參閱 [Authentication and trust flow](/zh-Hant/platforms/ios#authentication-and-trust-flow)。

  </Accordion>

  <Accordion title="設定心跳 (定期檢查)">
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
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
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

    - `sessionRetention`: 從 `sessions.json` 中修剪已完成的獨立執行階段 (預設 `24h`；設定 `false` 以停用)。
    - `runLog`: 根據大小和保留行數修剪 `cron/runs/<jobId>.jsonl`。
    - 參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得功能概覽和 CLI 範例。

  </Accordion>

  <Accordion title="設定 webhooks (hooks)">
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
    - 保持不安全內容略過旗標停用 (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`)，除非進行嚴格範圍的偵錯。
    - 對於 hook 驅動的代理程式，建議使用強大的現代模型層級和嚴格的工具原則 (例如僅傳訊息加上可能的沙箱機制)。

    參閱 [full reference](/zh-Hant/gateway/configuration-reference#hooks) 以取得所有對應選項和 Gmail 整合。

  </Accordion>

  <Accordion title="設定多代理路由">
    執行多個獨立的代理，每個代理擁有獨立的工作區和會話：

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

    請參閱 [多代理](/zh-Hant/concepts/multi-agent) 和 [完整參考](/zh-Hant/gateway/configuration-reference#multi-agent-routing) 以了解綁定規則和每個代理的存取設定檔。

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
    - **檔案陣列**：按順序深度合併（後者優先）
    - **同層級鍵**：在引入後合併（覆寫引入的值）
    - **巢狀引入**：支援最多 10 層深度
    - **相對路徑**：相對於引入檔案解析
    - **錯誤處理**：對於遺失檔案、解析錯誤和循環引入會提供清楚的錯誤訊息

  </Accordion>
</AccordionGroup>

## 設定熱重載

Gateway 會監看 `~/.openclaw/openclaw.json` 並自動套用變更 — 對於大多數設定，無需手動重新啟動。

### 重載模式

| 模式                   | 行為                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`** (預設) | 立即熱套用安全的變更。對於關鍵變更則自動重新啟動。           |
| **`hot`**              | 僅熱套用安全的變更。當需要重新啟動時會記錄警告 — 由您自行處理。 |
| **`restart`**          | 任何設定變更（無論是否安全）都會重新啟動 Gateway。                                 |
| **`off`**              | 停用檔案監看。變更將在下一次手動重新啟動時生效。                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 什麼會熱套用 vs 什麼需要重新啟動

大多數欄位可熱套用而不需停機。在 `hybrid` 模式下，需要重新啟動的變更會自動處理。

| 類別            | 欄位                                                               | 需要重新啟動？ |
| ------------------- | -------------------------------------------------------------------- | --------------- |
| 通道            | `channels.*`, `web` (WhatsApp) — 所有內建和擴充通道 | 否              |
| 代理與模型      | `agent`, `agents`, `models`, `routing`                               | 否              |
| 自動化          | `hooks`, `cron`, `agent.heartbeat`                                   | 否              |
| Sessions & messages | `session`, `messages`                                                | No              |
| Tools & media       | `tools`, `browser`, `skills`, `audio`, `talk`                        | No              |
| UI & misc           | `ui`, `logging`, `identity`, `bindings`                              | No              |
| Gateway server      | `gateway.*` (port, bind, auth, tailscale, TLS, HTTP)                 | **Yes**         |
| Infrastructure      | `discovery`, `canvasHost`, `plugins`                                 | **Yes**         |

<Note>
`gateway.reload` and `gateway.remote` are exceptions — changing them does **not** trigger a restart.
</Note>

## Config RPC (programmatic updates)

<Note>
Control-plane write RPCs (`config.apply`, `config.patch`, `update.run`) are rate-limited to **3 requests per 60 seconds** per `deviceId+clientIp`. When limited, the RPC returns `UNAVAILABLE` with `retryAfterMs`.
</Note>

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    Validates + writes the full config and restarts the Gateway in one step.

    <Warning>
    `config.apply` replaces the **entire config**. Use `config.patch` for partial updates, or `openclaw config set` for single keys.
    </Warning>

    Params:

    - `raw` (string) — JSON5 payload for the entire config
    - `baseHash` (optional) — config hash from `config.get` (required when config exists)
    - `sessionKey` (optional) — session key for the post-restart wake-up ping
    - `note` (optional) — note for the restart sentinel
    - `restartDelayMs` (optional) — delay before restart (default 2000)

    Restart requests are coalesced while one is already pending/in-flight, and a 30-second cooldown applies between restart cycles.

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
    - `null` 刪除金鑰
    - 陣列替換

    參數：

    - `raw` (字串) — 僅包含要變更金鑰的 JSON5
    - `baseHash` (必要) — 來自 `config.get` 的配置雜湊
    - `sessionKey`、`note`、`restartDelayMs` — 與 `config.apply` 相同

    重新啟動行為與 `config.apply` 相符：合併待處理的重新啟動，並在重新啟動週期之間有 30 秒的冷卻時間。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

OpenClaw 從父行程讀取環境變數，以及：

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
  如果啟用此功能且未設定預期的金鑰，OpenClaw 將執行您的登入 Shell 並僅匯入缺失的金鑰：

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
  在任何配置字串值中使用 `${VAR_NAME}` 引用環境變數：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

規則：

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`
- 缺失/空的變數會在載入時擲回錯誤
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

SecretRef 詳細資訊（包括 `env`/`file`/`exec` 的 `secrets.providers`）位於 [Secrets Management](/zh-Hant/gateway/secrets)。
支援的憑證路徑列於 [SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)。
</Accordion>

請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序與來源。

## 完整參考

如需完整的逐欄位參考，請參閱 **[Configuration Reference](/zh-Hant/gateway/configuration-reference)**。

---

_相關：[Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Configuration Reference](/zh-Hant/gateway/configuration-reference) · [Doctor](/zh-Hant/gateway/doctor)_

import en from "/components/footer/en.mdx";

<en />
