---
title: "建構頻道外掛程式"
sidebarTitle: "頻道外掛程式"
summary: "為 OpenClaw 建構訊息頻道外掛程式的逐步指南"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# 建構頻道外掛程式

本指南將逐步引導您建構一個將 OpenClaw 連結至訊息平台的頻道外掛程式。完成後，您將擁有一個具備私訊安全性、配對、回覆串接以及傳出訊息功能的運作中頻道。

<Info>如果您之前尚未建置任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/en/plugins/building-plugins) 以了解基本套件 結構和 manifest 設定。</Info>

## 頻道外掛程式的運作方式

頻道外掛程式不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中保留了一個
共享的 `message` 工具。您的外掛程式擁有：

- **Config** — 帳戶解析與設定精靈
- **Security** — 私訊原則與允許清單
- **Pairing** — 私訊核准流程
- **Outbound** — 傳送文字、媒體和投票至平台
- **Threading** — 回覆如何串接

核心擁有共享訊息工具、提示連線、會話記錄和分派功能。

## 逐步演練

<Steps>
  <Step title="Package and manifest">
    建立標準的外掛程式檔案。`package.json` 中的 `channel` 欄位
    是使其成為頻道外掛程式的關鍵：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "acme-chat": {
            "type": "object",
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

  </Step>

  <Step title="建置通道插件物件">
    `ChannelPlugin` 介面有許多選用的介面卡表面。從
    最小需求開始 —— `id` 和 `setup` —— 並根據需求加入介面卡。

    建立 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    <Accordion title="createChatChannelPlugin 為您做些什麼">
      不必手動實作底層介面卡介面，您只需傳入
      宣告式選項，建構器便會將其組合起來：

      | 選項 | 連接內容 |
      | --- | --- |
      | `security.dm` | 從設定欄位產生範圍化的 DM 安全性解析器 |
      | `pairing.text` | 基於文字並包含代碼交換的 DM 配對流程 |
      | `threading` | 回覆模式解析器（固定、帳戶範圍或自訂） |
      | `outbound.attachedResults` | 傳回結果中繼資料（訊息 ID）的傳送函式 |

      如果您需要完全控制，也可以傳入原始介面卡物件來取代宣告式選項。
    </Accordion>

  </Step>

  <Step title="連接進入點">
    建立 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerFull(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          { commands: ["acme-chat"] },
        );
      },
    });
    ```

    `defineChannelPluginEntry` 會自動處理設定/完整註冊的分割。請參閱
    [進入點](/en/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有
    選項。

  </Step>

  <Step title="新增設定進入點">
    建立 `setup-entry.ts` 以在引導過程中進行輕量載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當頻道已停用或未設定時，OpenClaw 會載入此項目而非完整的進入點。這可以避免在設定流程中載入沉重的執行時程式碼。詳情請參閱 [設定與組態](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛程式需要從平台接收訊息並將其轉發給
    OpenClaw。典型的模式是一個 webhook，它會驗證請求並透過您頻道的傳入處理程式進行分派：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in extensions/msteams or extensions/googlechat.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      傳入訊息處理是特定於頻道的。每個頻道外掛程式都擁有
      自己的傳入管線。請查看打包的頻道外掛程式
      （例如 `extensions/msteams`、`extensions/googlechat`）以了解實際模式。
    </Note>

  </Step>

  <Step title="測試">
    在 `src/channel.test.ts` 中編寫同置測試：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- extensions/acme-chat/
    ```

    有關共享測試輔助工具，請參閱 [測試](/en/plugins/sdk-testing)。

  </Step>
</Steps>

## 檔案結構

```
extensions/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## 進階主題

<CardGroup cols={2}>
  <Card title="執行緒選項" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    固定、帳戶範圍或自訂回覆模式
  </Card>
  <Card title="訊息工具整合" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和動作探索
  </Card>
  <Card title="目標解析" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/en/plugins/sdk-runtime">
    TTS、STT、媒體、透過 api.runtime 執行的子代理程式
  </Card>
</CardGroup>

## 後續步驟

- [提供商外掛程式](/en/plugins/sdk-provider-plugins) — 如果您的外掛程式也提供模型
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [SDK 測試](/en/plugins/sdk-testing) — 測試工具程式與合約測試
- [外掛程式清單](/en/plugins/manifest) — 完整的清單架構
