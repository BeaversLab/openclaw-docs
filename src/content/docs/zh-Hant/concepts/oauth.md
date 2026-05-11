---
summary: "OpenClaw 中的 OAuth：Token 交換、儲存與多帳戶模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw 支援透過 OAuth 進行「訂閱驗證」，適用於提供此功能的供應商
（特別是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic，實務上的區分
現在是：

- **Anthropic API 金鑰**：正常的 Anthropic API 計費
- **Anthropic Claude CLI / OpenClaw 內的訂閱驗證**：Anthropic
  人員告訴我們此用途再次被允許

OpenAI Codex OAuth 明確支援用於像 OpenClaw 這樣的外部工具。
本頁面說明：

對於生產環境中的 Anthropic，API 金鑰驗證是較安全且推薦的途徑。

- OAuth **權杖交換** 的運作方式 (PKCE)
- 權杖 **儲存** 的位置 (以及原因)
- 如何處理 **多個帳號** (設定檔 + 每次工作階段覆寫)

OpenClaw 也支援 **供應商外掛程式**，這些外掛程式附帶自己的 OAuth 或 API 金鑰
流程。透過以下方式執行它們：

```bash
openclaw models auth login --provider <id>
```

## 權杖接收器 (為什麼它存在)

OAuth 供應商通常在登入/重新整理流程期間會產生一個 **新的重新整理權杖**。某些供應商（或 OAuth 用戶端）在為同一使用者/應用程式發行新權杖時，可能會使較舊的重新整理權杖失效。

實際症狀：

- 你透過 OpenClaw _並_ 透過 Claude Code / Codex CLI 登入 → 其中一個隨後會隨機被「登出」

為了減少這種情況，OpenClaw 將 `auth-profiles.json` 視為 **權杖接收器**：

- 執行時期從 **一個地方** 讀取憑證
- 我們可以維護多個設定檔並以決定性方式進行路由
- 外部 CLI 的重用取決於供應商：Codex CLI 可以引導一個空的
  `openai-codex:default` 設定檔，但一旦 OpenClaw 擁有本機 OAuth 設定檔，
  本機重新整理權杖即為權威來源；其他整合可以保持
  外部管理並重新讀取其 CLI 驗證儲存

## 儲存 (權杖所在的位置)

機密 **依代理程式** 儲存：

- 驗證設定檔 (OAuth + API 金鑰 + 選用的值層級參照)：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  (靜態 `api_key` 項目在發現時會被清除)

舊版僅匯入檔案 (仍支援，但不是主要儲存區)：

- `~/.openclaw/credentials/oauth.json` (首次使用時匯入至 `auth-profiles.json`)

上述所有項目也遵循 `$OPENCLAW_STATE_DIR` (狀態目錄覆寫)。完整參考：[/gateway/configuration](/zh-Hant/gateway/configuration-reference#auth-storage)

有關靜態秘密參照和執行時快照啟用行為，請參閱[秘密管理](/zh-Hant/gateway/secrets)。

## Anthropic 舊版 Token 相容性

<Warning>
Anthropic 的公開 Claude Code 文件指出，直接使用 Claude Code 仍在 Claude 訂閱限制範圍內，且 Anthropic 人員告知我們，OpenClaw 風格的 Claude CLI 使用再次被允許。因此，除非 Anthropic 發布新政策，OpenClaw 將此整合中的 Claude CLI 重複使用和 `claude -p` 使用視為經認可。

有關 Anthropic 目前的直接 Claude Code 方案文件，請參閱[透過 Pro 或 Max 方案使用 Claude Code
](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
和[透過 Team 或 Enterprise 方案使用 Claude Code
](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您想要 OpenClaw 中的其他訂閱式選項，請參閱 [OpenAI
Codex](/zh-Hant/providers/openai)、[Qwen Cloud Coding
Plan](/zh-Hant/providers/qwen)、[MiniMax Coding Plan](/zh-Hant/providers/minimax)
以及 [Z.AI / GLM Coding Plan](/zh-Hant/providers/glm)。

</Warning>

OpenClaw 也公開 Anthropic setup-token 作為支援的 Token 驗證路徑，但在可用時，它現在優先考慮 Claude CLI 重複使用和 `claude -p`。

## Anthropic Claude CLI 移轉

OpenClaw 再次支援 Anthropic Claude CLI 的重複使用。如果您在主機上已經有本機
Claude 登入，入門/設定可以直接重複使用它。

## OAuth 交換（登入運作方式）

OpenClaw 的互動式登入流程實作於 `@mariozechner/pi-ai` 中，並連接到精靈/指令。

### Anthropic setup-token

流程形狀：

1. 從 OpenClaw 啟動 Anthropic setup-token 或貼上 Token
2. OpenClaw 將產生的 Anthropic 憑證儲存在驗證設定檔中
3. 模型選擇保持在 `anthropic/...` 上
4. 現有的 Anthropic 驗證設定檔仍可供回復/順序控制使用

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth 明確支援在 Codex CLI 外部使用，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE 驗證器/挑戰 + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回呼
4. 如果回呼無法綁定（或者您是遠端/無頭環境），請貼上重新導向 URL/代碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取權杖中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑為 `openclaw onboard` → 選擇驗證方式 `openai-codex`。

## 更新 + 過期

設定檔儲存 `expires` 時間戳記。

執行時：

- 如果 `expires` 在未來 → 使用已儲存的存取權杖
- 如果已過期 → 重新整理（在檔案鎖定下）並覆寫已儲存的憑證
- 例外：某些外部 CLI 憑證保持外部管理；OpenClaw
  會重新讀取那些 CLI 驗證儲存區，而不是耗用複製的重新整理權杖。
  Codex CLI 引導程式特意較為狹窄：它初始化一個空的
  `openai-codex:default` 設定檔，然後由 OpenClaw 擁有的重新整理作業保持本機
  設定檔為正規來源。

重新整理流程是自動的；您通常不需要手動管理權杖。

## 多重帳號（設定檔）+ 路由

兩種模式：

### 1) 建議做法：分離的代理程式

如果您希望「個人」和「工作」完全不相關，請使用隔離的代理程式（獨立的階段作業 + 憑證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式設定驗證（精靈），並將對話路由至正確的代理程式。

### 2) 進階：在一個代理程式中使用多個設定檔

`auth-profiles.json` 支援同一供應商的多個設定檔 ID。

選擇使用的設定檔：

- 透過設定檔順序全域設定（`auth.order`）
- 透過 `/model ...@<profileId>` 針對每個階段作業設定

範例（階段作業覆寫）：

- `/model Opus@anthropic:work`

如何查看存在哪些設定檔 ID：

- `openclaw channels list --json`（顯示 `auth[]`）

相關文件：

- [模型容錯移轉](/zh-Hant/concepts/model-failover) （輪替 + 冷卻規則）
- [斜線指令](/zh-Hant/tools/slash-commands) （指令介面）

## 相關

- [驗證](/zh-Hant/gateway/authentication) — 模型供應商驗證概覽
- [密碼](/zh-Hant/gateway/secrets) — 憑證儲存與 SecretRef
- [設定參考](/zh-Hant/gateway/configuration-reference#auth-storage) — 驗證設定金鑰
