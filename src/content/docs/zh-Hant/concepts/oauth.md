---
summary: "OpenClaw 中的 OAuth：Token 交換、儲存與多帳戶模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw 支援透過 OAuth 進行「訂閱驗證」，適用於提供此機制的供應商
（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic，目前的實務區分
為：

- **Anthropic API 金鑰**：標準的 Anthropic API 計費
- **OpenClaw 內的 Anthropic 訂閱驗證**：Anthropic 已於 **2026 年 4 月 4 日下午 12:00 (PT) / 晚上 8:00 (BST)** 通知 OpenClaw
  用戶，此功能現已需要 **額外使用量 (Extra Usage)**

OpenAI Codex OAuth 明確支援用於 OpenClaw 等外部工具。
本頁面將說明：

對於生產環境中的 Anthropic，API 金鑰驗證是更安全且推薦的途徑。

- OAuth **Token 交換** 如何運作 (PKCE)
- Token **儲存** 的位置 (以及原因)
- 如何處理 **多個帳戶** (設定檔 + 每次階段覆寫)

OpenClaw 也支援 **提供者外掛**，這些外掛提供自己的 OAuth 或 API 金鑰
流程。透過以下方式執行它們：

```bash
openclaw models auth login --provider <id>
```

## Token 接收器 (為何存在)

OAuth 提供者通常會在登入/重新整理流程期間產生一個**新的重新整理 Token**。當針對同一使用者/應用程式發出新的重新整理 Token 時，某些提供者 (或 OAuth 用戶端) 可能會使舊的重新整理 Token 失效。

實際症狀：

- 您透過 OpenClaw 以及 Claude Code / Codex CLI 登入 → 其中一個隨後會隨機「登出」

為了減少這種情況，OpenClaw 將 `auth-profiles.json` 視為 **Token 接收器**：

- 執行時 從 **單一位置** 讀取憑證
- 我們可以保留多個設定檔並確定地路由它們
- 當從 Codex CLI 等外部 CLI 重複使用憑證時，OpenClaw
  會帶有來源地地鏡像 它們，並重新讀取該外部來源，而不是
  自己輪換重新整理 Token

## 儲存 (Token 的所在位置)

機密 是 **以代理 為單位** 儲存的：

- 驗證設定檔 (OAuth + API 金鑰 + 可選的值層級參照)：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  (當發現靜態 `api_key` 項目時會被清除)

僅供舊版匯入的檔案 (仍支援，但非主要儲存位置)：

- `~/.openclaw/credentials/oauth.json` (首次使用時匯入至 `auth-profiles.json`)

上述所有內容也遵循 `$OPENCLAW_STATE_DIR`（狀態目錄覆蓋）。完整參考：[/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

有關靜態密鑰參考和運行時快照啟用行為，請參閱 [Secrets Management](/en/gateway/secrets)。

## Anthropic 舊版令牌相容性

<Warning>
Anthropic 的公開 Claude Code 文件指出，直接使用 Claude Code 仍在 Claude 訂閱限制範圍內。此外，Anthropic 在 **2026 年 4 月 4 日太平洋時間下午 12:00 / 英國夏令時下午 8:00** 告知 OpenClaw 用戶，**OpenClaw 被視為第三方駁接工具**。現有的 Anthropic 令牌設定檔在 OpenClaw 中技術上仍然可用，但 Anthropic 表示 OpenClaw 路徑現在需要 **額外使用量**（與訂閱分開計費的隨用隨付）。

有關 Anthropic 目前的直接 Claude Code 方案文件，請參閱 [Using Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan) 和 [Using Claude Code with your Team or Enterprise plan](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您想要在 OpenClaw 中使用其他訂閱式選項，請參閱 [OpenAI Codex](/en/providers/openai)、[Qwen Cloud Coding Plan](/en/providers/qwen)、[MiniMax Coding Plan](/en/providers/minimax) 和 [Z.AI / GLM Coding Plan](/en/providers/glm)。

</Warning>

OpenClaw 再次公開 Anthropic setup-token 作為舊版/手動路徑。Anthropic 針對 OpenClaw 的計費通知仍然適用於該路徑，因此請預期 Anthropic 會將 OpenClaw 驅動的 Claude 登入流量視為 **額外使用量**。

## Anthropic Claude CLI 遷移

Anthropic 在 OpenClaw 中不再支援本機 Claude CLI 遷移路徑。請對 Anthropic 流量使用 Anthropic API 金鑰，或者僅在已配置的情況下保留舊版基於令牌的身份驗證，並預期 Anthropic 將該 OpenClaw 路徑視為 **額外使用量**。

## OAuth 交換 (登入運作方式)

OpenClaw 的互動式登入流程實作在 `@mariozechner/pi-ai` 中並連接到精靈/指令。

### Anthropic setup-token

流程結構：

1. 從 OpenClaw 啟動 Anthropic setup-token 或貼上令牌
2. OpenClaw 將產生的 Anthropic 憑證儲存在驗證設定檔中
3. 模型選擇保留在 `anthropic/...`
4. 現有的 Anthropic 驗證設定檔仍可用於回退/順序控制

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 之外使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上捕獲回調
4. 如果無法綁定回調（或者您是遠端/無頭環境），請貼上重新導向 URL/程式碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取權杖中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑是 `openclaw onboard` → 選擇驗證方式 `openai-codex`。

## 重新整理 + 有效期

設定檔會儲存 `expires` 時間戳記。

在執行階段時：

- 如果 `expires` 在未來時間 → 使用已儲存的存取權杖
- 如果已過期 → 重新整理（在檔案鎖定下）並覆寫已儲存的憑證
- 例外情況：重複使用的外部 CLI 憑證保持由外部管理；OpenClaw
  會重新讀取 CLI 驗證儲存區，且本身不會使用複製的重新整理權杖

重新整理流程是自動的；您通常不需要手動管理權杖。

## 多個帳戶（設定檔）+ 路由

兩種模式：

### 1) 建議做法：分離的代理程式

如果您希望「個人」和「工作」完全互不干擾，請使用隔離的代理程式（個別的連線階段 + 憑證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式設定驗證（透過精靈），並將對話路由至正確的代理程式。

### 2) 進階：在一個代理程式中使用多個設定檔

`auth-profiles.json` 支援同一個供應商的多個設定檔 ID。

選擇使用的設定檔：

- 透過設定檔排序全域指定 (`auth.order`)
- 透過 `/model ...@<profileId>` 指定各連線階段

範例（連線階段覆寫）：

- `/model Opus@anthropic:work`

如何查看現有的設定檔 ID：

- `openclaw channels list --json` (顯示 `auth[]`)

相關文件：

- [/concepts/model-failover](/en/concepts/model-failover) (輪替 + 冷卻規則)
- [/tools/slash-commands](/en/tools/slash-commands) (指令介面)

## 相關

- [Authentication](/en/gateway/authentication) — 模型供應商驗證概覽
- [Secrets](/en/gateway/secrets) — 憑證儲存和 SecretRef
- [設定參考](/en/gateway/configuration-reference#auth-storage) — auth 設定鍵
