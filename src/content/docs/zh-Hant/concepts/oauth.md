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
- **Anthropic Claude CLI / OpenClaw 內的訂閱驗證**：Anthropic 人員
  告訴我們這種用法再次被允許了

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

上述所有選項也遵守 `$OPENCLAW_STATE_DIR`（狀態目錄覆寫）。完整參考：[/gateway/configuration](/zh-Hant/gateway/configuration-reference#auth-storage)

關於靜態 secret 參照和運行時快照啟用行為，請參閱 [Secrets Management](/zh-Hant/gateway/secrets)。

## Anthropic 舊版令牌相容性

<Warning>
Anthropic 的公開 Claude Code 文件指出，直接使用 Claude Code 保持在 Claude 訂閱限制內，且 Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許。因此，除非 Anthropic 發布新政策，否則 OpenClaw 將此整合中的 Claude CLI 重複使用和 `claude -p` 使用視為經過授權。

若要查看 Anthropic 目前的直接 Claude Code 方案文件，請參閱 [Using Claude Code
with your Pro or Max
plan](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
和 [Using Claude Code with your Team or Enterprise
plan](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您想要 OpenClaw 中的其他訂閱式選項，請參閱 [OpenAI
Codex](/zh-Hant/providers/openai)、[Qwen Cloud Coding
Plan](/zh-Hant/providers/qwen)、[MiniMax Coding Plan](/zh-Hant/providers/minimax)
和 [Z.AI / GLM Coding Plan](/zh-Hant/providers/glm)。

</Warning>

OpenClaw 也將 Anthropic setup-token 公開為支援的 token 驗證路徑，但在可用時，它現在偏好 Claude CLI 重複使用和 `claude -p`。

## Anthropic Claude CLI 遷移

OpenClaw 再次支援 Anthropic Claude CLI 重複使用。如果您主機上已經有本機
Claude 登入，入門/設定可以直接重複使用它。

## OAuth 交換 (登入運作方式)

OpenClaw 的互動式登入流程是在 `@mariozechner/pi-ai` 中實現的，並連接到精靈/指令。

### Anthropic setup-token

流程結構：

1. 從 OpenClaw 啟動 Anthropic setup-token 或貼上令牌
2. OpenClaw 將產生的 Anthropic 憑證儲存在驗證設定檔中
3. 模型選擇保持在 `anthropic/...` 上
4. 現有的 Anthropic 驗證設定檔仍可用於回退/順序控制

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 之外使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 生成 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上捕獲回呼
4. 如果無法綁定回調（或者您是遠端/無頭環境），請貼上重新導向 URL/程式碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取 token 中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑是 `openclaw onboard` → 驗證選擇 `openai-codex`。

## 重新整理 + 有效期

配置檔案儲存 `expires` 時間戳記。

在執行階段時：

- 如果 `expires` 在未來 → 使用已儲存的存取權杖
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

`auth-profiles.json` 支援同一提供者的多個設定檔 ID。

選擇使用的設定檔：

- 透過設定順序全域指定 (`auth.order`)
- 透過 `/model ...@<profileId>` 每次會話指定

範例（連線階段覆寫）：

- `/model Opus@anthropic:work`

如何查看現有的設定檔 ID：

- `openclaw channels list --json` (顯示 `auth[]`)

相關文件：

- [/concepts/model-failover](/zh-Hant/concepts/model-failover) (輪詢 + 冷卻規則)
- [/tools/slash-commands](/zh-Hant/tools/slash-commands) (指令介面)

## 相關

- [驗證](/zh-Hant/gateway/authentication) — 模型提供者驗證概覽
- [機密資訊](/zh-Hant/gateway/secrets) — 憑證儲存與 SecretRef
- [設定參考](/zh-Hant/gateway/configuration-reference#auth-storage) — 驗證設定金鑰
