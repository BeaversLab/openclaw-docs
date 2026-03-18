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

OpenClaw 支援透過 OAuth 進行「訂閱驗證」，適用於提供此機制的供應商（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic 訂閱，請使用 **setup-token** 流程。過去 Anthropic 限制部分使用者將訂閱用於 Claude Code 以外的場合，因此請將此視為使用者自選風險，並自行確認 Anthropic 目前的政策。OpenAI Codex OAuth 明確支援用於 OpenClaw 等外部工具。本頁面說明：

在生產環境中使用 Anthropic 時，API 金鑰驗證是比訂閱 setup-token 驗證更安全且建議的途徑。

- OAuth **token 交換** 的運作方式（PKCE）
- Token 的**儲存位置**（以及原因）
- 如何處理**多個帳號**（設定檔 + 每個工作階段覆寫）

OpenClaw 也支援**提供者外掛程式**，這類外掛程式自帶 OAuth 或 API 金鑰流程。透過以下方式執行：

```bash
openclaw models auth login --provider <id>
```

## Token 接收端（存在原因）

OAuth 供應商通常會在登入/更新流程中建立一個**新的更新 token**。當針對同一使用者/應用程式發出新的更新 token 時，某些供應商（或 OAuth 用戶端）會讓舊的更新 token 失效。

實際症狀：

- 你透過 OpenClaw _以及_ Claude Code / Codex CLI 登入 → 其中一個之後隨機「登出」

為了減少此情況，OpenClaw 將 `auth-profiles.json` 視為 **token 接收端**：

- 執行階段從**一個地方**讀取憑證
- 我們可以維護多個設定檔並進行決定性路由

## 儲存（Token 所在位置）

機密資料是**依據代理程式**儲存的：

- 驗證設定檔（OAuth + API 金鑰 + 選用的值層級參照）： `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案： `~/.openclaw/agents/<agentId>/agent/auth.json`
  （當發現靜態 `api_key` 項目時會將其清除）

舊版僅匯入檔案（仍支援，但非主要儲存位置）：

- `~/.openclaw/credentials/oauth.json` （首次使用時匯入至 `auth-profiles.json`）

上述所有項目也會遵守 `$OPENCLAW_STATE_DIR`（狀態目錄覆寫）。完整參考資料： [/gateway/configuration](/zh-Hant/gateway/configuration#auth-storage-oauth--api-keys)

關於靜態 secret 參照和執行時期快照啟用行為，請參閱[機密管理](/zh-Hant/gateway/secrets)。

## Anthropic setup-token (訂閱驗證)

<Warning>
  Anthropic setup-token 支援屬於技術相容性，並非政策保證。Anthropic 過去曾封鎖部分在 Claude Code
  外的訂閱使用。請自行決定是否 使用訂閱驗證，並確認 Anthropic 目前的條款。
</Warning>

在任何機器上執行 `claude setup-token`，然後將其貼上至 OpenClaw：

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

## OAuth 交換 (登入運作方式)

OpenClaw 的互動式登入流程實作於 `@mariozechner/pi-ai` 並連接至精靈/指令。

### Anthropic setup-token

流程形狀：

1. 執行 `claude setup-token`
2. 將 token 貼上至 OpenClaw
3. 儲存為 token 驗證設定檔 (無更新)

精靈路徑為 `openclaw onboard` → 驗證選擇 `setup-token` (Anthropic)。

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 外部使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回呼
4. 如果回呼無法綁定 (或是您處於遠端/無頭模式)，請貼上重新導向 URL/程式碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取 token 中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑為 `openclaw onboard` → 驗證選擇 `openai-codex`。

## 更新 + 到期

設定檔會儲存 `expires` 時間戳記。

執行時期：

- 如果 `expires` 在未來 → 使用儲存的存取 token
- 如果已到期 → 更新 (在檔案鎖定下) 並覆寫儲存的認證資訊

更新流程是自動的；您通常不需要手動管理 token。

## 多重帳號 (設定檔) + 路由

兩種模式：

### 1) 建議做法：分離的代理程式

如果您希望「個人」與「工作」永不互動，請使用隔離的代理程式 (分離的工作階段 + 憑證 + 工作區)：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式（精靈）設定驗證，並將聊天路由至正確的代理程式。

### 2) 進階：在同一個代理程式中使用多個設定檔

`auth-profiles.json` 支援針對同一個供應商使用多個設定檔 ID。

選擇使用的設定檔：

- 透過設定檔排序全域指定 (`auth.order`)
- 透過 `/model ...@<profileId>` 針對每個工作階段指定

範例（工作階段覆寫）：

- `/model Opus@anthropic:work`

如何查看現有的設定檔 ID：

- `openclaw channels list --json` (顯示 `auth[]`)

相關文件：

- [/concepts/model-failover](/zh-Hant/concepts/model-failover) (輪替 + 冷卻規則)
- [/tools/slash-commands](/zh-Hant/tools/slash-commands) (指令介面)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
