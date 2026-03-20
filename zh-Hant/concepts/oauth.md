---
summary: "OpenClaw 中的 OAuth：token 交換、儲存與多帳號模式"
read_when:
  - 您想要端到端理解 OpenClaw OAuth
  - 您遇到 token 失效 / 登出問題
  - 您需要 setup-token 或 OAuth 認證流程
  - 您需要多帳號或設定檔路由
title: "OAuth"
---

# OAuth

OpenClaw 支援透過 OAuth 進行「訂閱認證」，適用於提供此服務的供應商（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic 訂閱，請使用 **setup-token** 流程。過去曾有部分使用者無法在 Claude Code 之外使用 Anthropic 訂閱，因此請將此視為使用者自行決定的風險，並自行確認 Anthropic 當前的政策。OpenAI Codex OAuth 明確支援用於 OpenClaw 等外部工具。本頁面將說明：

對於正式環境中的 Anthropic，使用 API 金鑰認證是比訂閱 setup-token 認證更安全且被推薦的方式。

- OAuth **token 交換** 如何運作（PKCE）
- token 儲存於**何處**（以及原因）
- 如何處理**多個帳號**（設定檔 + 每次工作階段覆寫）

OpenClaw 也支援**供應商外掛**，這些外掛自帶 OAuth 或 API 金鑰
流程。執行方式如下：

```bash
openclaw models auth login --provider <id>
```

## Token 接收器（存在原因）

OAuth 供應商通常會在登入/重新整理流程中產生一個**新的重新整理 token (refresh token)**。當針對同一使用者/應用程式發出新的重新整理 token 時，部分供應商（或 OAuth 用戶端）可能會使舊的重新整理 token 失效。

實際症狀：

- 您透過 OpenClaw _以及_ 透過 Claude Code / Codex CLI 登入 → 其中一個之後會隨機「被登出」

為減少此情況，OpenClaw 將 `auth-profiles.json` 視為 **token 接收器**：

- 執行環境從**單一位置**讀取憑證
- 我們可以維護多個設定檔並以決定性方式進行路由

## 儲存（token 所在位置）

機密資訊是**依代理程式 (per-agent)** 儲存的：

- 認證設定檔（OAuth + API 金鑰 + 選用的值層級參照）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （當發現靜態 `api_key` 項目時會被清除）

舊版僅匯入檔案（仍支援，但非主要儲存位置）：

- `~/.openclaw/credentials/oauth.json`（首次使用時匯入至 `auth-profiles.json`）

上述所有內容也遵守 `$OPENCLAW_STATE_DIR` (state dir override)。完整參考：[/gateway/configuration](/zh-Hant/gateway/configuration#auth-storage-oauth--api-keys)

關於靜態密鑰引用和運行時快照啟動行為，請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。

## Anthropic setup-token (subscription auth)

<Warning>
Anthropic setup-token 支援屬於技術相容性，而非政策保證。
Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用。
請自行決定是否使用訂閱驗證，並確認 Anthropic 目前的條款。
</Warning>

在任何機器上執行 `claude setup-token`，然後將其貼上到 OpenClaw：

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

## OAuth exchange (how login works)

OpenClaw 的互動式登入流程實作於 `@mariozechner/pi-ai` 並連接到精靈/指令。

### Anthropic setup-token

流程形狀：

1. 執行 `claude setup-token`
2. 將 token 貼上到 OpenClaw
3. 儲存為 token 驗證設定檔 (無重新整理)

精靈路徑為 `openclaw onboard` → auth choice `setup-token` (Anthropic)。

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 之外使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE verifier/challenge + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回調
4. 如果無法綁定回調 (或您處於遠端/無頭端環境)，請貼上重新導向 URL/code
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取 token 中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑為 `openclaw onboard` → auth choice `openai-codex`。

## Refresh + expiry

設定檔儲存 `expires` 時間戳記。

執行時：

- 如果 `expires` 在未來 → 使用儲存的存取 token
- 如果已過期 → 重新整理 (在檔案鎖定下) 並覆寫儲存的憑證

重新整理流程是自動的；您通常不需要手動管理 token。

## Multiple accounts (profiles) + routing

兩種模式：

### 1) Preferred: separate agents

如果您希望「個人」和「工作」帳號完全不互動，請使用隔離的代理程式（獨立的 session + 憑證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式設定驗證（精靈/嚮導），並將對話導向至正確的代理程式。

### 2) 進階：在單一代理程式中使用多個設定檔

`auth-profiles.json` 支援針對同一個供應商使用多個設定檔 ID。

選擇使用哪個設定檔：

- 透過設定檔排序進行全域設定 (`auth.order`)
- 透過 `/model ...@<profileId>` 針對每個 session 進行設定

範例（session 覆蓋）：

- `/model Opus@anthropic:work`

如何查看存在哪些設定檔 ID：

- `openclaw channels list --json`（顯示 `auth[]`）

相關文件：

- [/concepts/model-failover](/zh-Hant/concepts/model-failover) (輪替 + 冷卻規則)
- [/tools/slash-commands](/zh-Hant/tools/slash-commands) (指令介面)

import en from "/components/footer/en.mdx";

<en />
