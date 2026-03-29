---
summary: "OpenClaw 中的 OAuth：權杖交換、儲存與多帳戶模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw 支援透過 OAuth 進行「訂閱驗證」，適用於提供此功能的供應商（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic 訂閱，請使用 **setup-token** 流程。過去部分使用者在 Claude Code 之外使用 Anthropic 訂閱受到限制，因此請將其視為使用者自選風險，並自行確認目前的 Anthropic 政策。OpenAI Codex OAuth 明確支援用於 OpenClaw 等外部工具。本頁面說明：

對於正式環境中的 Anthropic，API 金鑰驗證是比訂閱 setup-token 驗證更安全且建議的路徑。

- OAuth **權杖交換** 的運作方式 (PKCE)
- 權杖的 **儲存位置**（以及原因）
- 如何處理 **多個帳戶**（設定檔 + 每次工作階段覆寫）

OpenClaw 也支援 **供應商外掛程式**，這些外掛程式提供自己的 OAuth 或 API 金鑰
流程。透過以下方式執行它們：

```bash
openclaw models auth login --provider <id>
```

## 權杖接收器（為何存在）

OAuth 供應商通常在登入/更新流程期間鑄造一個 **新的更新權杖**。當為相同的使用者/應用程式發行新權杖時，某些供應商（或 OAuth 用戶端）可能會使舊的更新權杖失效。

實際症狀：

- 您透過 OpenClaw _以及_ Claude Code / Codex CLI 登入 → 其中一個隨後會隨機「登出」

為了減少這種情況，OpenClaw 將 `auth-profiles.json` 視為 **權杖接收器**：

- 執行時從 **單一位置** 讀取認證資訊
- 我們可以維護多個設定檔並以決定性方式路由它們

## 儲存（權杖存在於何處）

機密資料是 **以每個代理程式為基礎** 儲存的：

- 驗證設定檔（OAuth + API 金鑰 + 選用的值層級參照）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （靜態 `api_key` 項目在發現時會被清除）

舊版僅供匯入的檔案（仍受支援，但不是主要儲存位置）：

- `~/.openclaw/credentials/oauth.json` （在首次使用時匯入 `auth-profiles.json`）

上述所有內容也遵守 `$OPENCLAW_STATE_DIR`（狀態目錄覆寫）。完整參考：[/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

關於靜態秘密引用和執行時快照啟用行為，請參閱 [秘密管理](/en/gateway/secrets)。

## Anthropic setup-token（訂閱驗證）

<Warning>Anthropic setup-token 支援屬於技術相容性，而非政策保證。Anthropic 過去曾封鎖部分在 Claude Code 之外的訂閱使用。請自行決定是否使用訂閱驗證，並查證 Anthropic 目前的條款。</Warning>

在任何機器上執行 `claude setup-token`，然後將其貼上至 OpenClaw：

```bash
openclaw models auth setup-token --provider anthropic
```

如果您是在其他地方產生的權杖，請手動貼上：

```bash
openclaw models auth paste-token --provider anthropic
```

驗證：

```bash
openclaw models status
```

## OAuth 交換（登入運作方式）

OpenClaw 的互動式登入流程實作於 `@mariozechner/pi-ai` 中，並連接至精靈/指令。

### Anthropic setup-token

流程形狀：

1. 執行 `claude setup-token`
2. 將權杖貼上至 OpenClaw
3. 儲存為權杖驗證設定檔（無重新整理）

精靈路徑為 `openclaw onboard` → 驗證選項 `setup-token` (Anthropic)。

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 外部使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回呼
4. 如果回呼無法綁定（或者您處於遠端/無介面模式），請貼上重新導向 URL/代碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取權杖中擷取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑為 `openclaw onboard` → 驗證選項 `openai-codex`。

## 重新整理 + 過期

設定檔會儲存一個 `expires` 時間戳記。

在執行時：

- 如果 `expires` 在未來 → 使用儲存的存取權杖
- 如果已過期 → 重新整理（在檔案鎖定下）並覆寫儲存的憑證

重新整理流程是自動的；您通常不需要手動管理權杖。

## 多個帳戶（設定檔）+ 路由

兩種模式：

### 1) 首選：分離的代理程式

如果您希望「個人」與「工作」帳戶永不相互作用，請使用隔離的代理程式（獨立的 session + 憑證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後為每個代理程式設定驗證（精靈），並將對話路由到正確的代理程式。

### 2) 進階：單一代理程式中的多個設定檔

`auth-profiles.json` 支援同一提供者的多個設定檔 ID。

選擇使用的設定檔：

- 透過設定順序全域設定 (`auth.order`)
- 透過 `/model ...@<profileId>` 針對每個階段作業設定

範例（階段作業覆寫）：

- `/model Opus@anthropic:work`

如何查看有哪些設定檔 ID：

- `openclaw channels list --json` (顯示 `auth[]`)

相關文件：

- [/concepts/model-failover](/en/concepts/model-failover) (輪替 + 冷卻規則)
- [/tools/slash-commands](/en/tools/slash-commands) (指令介面)
