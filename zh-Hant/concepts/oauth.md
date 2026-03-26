---
summary: "OpenClaw 中的 OAuth：Token 交換、儲存與多帳號模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw 透過 OAuth 支援提供「訂閱驗證」功能的供應商（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic 訂閱，請使用 **setup-token** 流程。過去曾有部分使用者在 Claude Code 以外使用 Anthropic 訂閱時受到限制，因此請將此視為使用者自選風險，並自行確認目前 Anthropic 的政策。OpenAI Codex OAuth 明確支援在 OpenClaw 等外部工具中使用。本頁面說明：

對於正式環境中的 Anthropic，API 金鑰驗證是比訂閱 setup-token 驗證更安全且推薦的途徑。

- OAuth **Token 交換** 的運作方式 (PKCE)
- Token **儲存** 的位置（以及原因）
- 如何處理 **多個帳號**（個人資料 + 每個工作階段覆寫）

OpenClaw 也支援**供應商外掛程式**，它們附帶自己的 OAuth 或 API 金鑰流程。透過以下方式執行它們：

```bash
openclaw models auth login --provider <id>
```

## 權杖接收端（為什麼存在）

OAuth 供應商通常在登入/重新整理流程期間鑄造一個**新的重新整理權杖**。當針對相同的使用者/應用程式發行新的重新整理權杖時，某些供應商（或 OAuth 用戶端）可能會使較舊的重新整理權杖失效。

實際症狀：

- 您透過 OpenClaw _並_ 透過 Claude Code / Codex CLI 登入 → 其中一個隨後會隨機「登出」

為了減少這種情況，OpenClaw 將 `auth-profiles.json` 視為**權杖接收端**：

- 執行階段從 **一個地方** 讀取憑證
- 我們可以保持多個個人資料並確定性路由它們

## 儲存空間（權杖所在位置）

機密是**每個代理程式**儲存的：

- 驗證設定檔（OAuth + API 金鑰 + 可選的值層級參照）： `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （發現時會清除靜態 `api_key` 條目）

舊版僅供匯入的檔案（仍支援，但不是主要的儲存位置）：

- `~/.openclaw/credentials/oauth.json` （首次使用時匯入至 `auth-profiles.json`）

以上所有項目也會遵守 `$OPENCLAW_STATE_DIR`（狀態目錄覆寫）。完整參考：[/gateway/configuration](/zh-Hant/gateway/configuration-reference#auth-storage)

關於靜態秘密參照和執行時期快照啟用行為，請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。

## Anthropic setup-token（訂閱驗證）

<Warning>
  Anthropic setup-token 支援屬於技術相容性，並非政策保證。Anthropic 過去曾 阻擋部分在 Claude Code
  之外的訂閱使用。請自行決定是否 使用訂閱驗證，並確認 Anthropic 目前的條款。
</Warning>

在任意機器上執行 `claude setup-token`，然後將其貼上至 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在其他地方產生的 token，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

驗證：

```bash
openclaw models status
```

## OAuth 交換（登入運作方式）

OpenClaw 的互動式登入流程實作於 `@mariozechner/pi-ai` 中並連接到精靈/指令。

### Anthropic setup-token

流程形狀：

1. 執行 `claude setup-token`
2. 將 token 貼上至 OpenClaw
3. 儲存為 token 驗證設定檔（無重新整理）

精靈路徑為 `openclaw onboard` → 驗證選擇 `setup-token` (Anthropic)。

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 外部使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回調
4. 如果回調無法綁定（或您處於遠端/無介面環境），請貼上重新導向 URL/代碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取權杖中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑為 `openclaw onboard` → 驗證選擇 `openai-codex`。

## 更新 + 過期

設定檔會儲存一個 `expires` 時間戳記。

執行時：

- 如果 `expires` 在未來 → 使用儲存的存取權杖
- 如果已過期 → 更新（在檔案鎖定下）並覆寫儲存的認證資訊

重新整理流程是自動的；您通常不需要手動管理權杖。

## 多重帳號（個人資料）+ 路由

兩種模式：

### 1) 首選：分開的代理程式

如果您希望「個人」和「工作」永不互動，請使用隔離的代理程式（獨立的會話 + 憑證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式設定驗證（精靈），並將聊天路由到正確的代理程式。

### 2) 進階：一個代理程式中的多重個人資料

`auth-profiles.json` 支援同一個供應商的多個個人資料 ID。

選擇使用的個人資料：

- 透過設定順序進行全域設定 (`auth.order`)
- 透過 `/model ...@<profileId>` 進行個別會話設定

範例（會話覆寫）：

- `/model Opus@anthropic:work`

如何查看存在的個人資料 ID：

- `openclaw channels list --json` (顯示 `auth[]`)

相關文件：

- [/concepts/model-failover](/zh-Hant/concepts/model-failover) （輪替 + 冷卻規則）
- [/tools/slash-commands](/zh-Hant/tools/slash-commands) （指令介面）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
