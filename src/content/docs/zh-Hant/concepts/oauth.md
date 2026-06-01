---
summary: "OpenClaw 中的 OAuth：Token 交換、儲存與多帳戶模式"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw 支援透過 OAuth 針對提供此服務的供應商進行「訂閱驗證」（尤其是 **OpenAI Codex (ChatGPT OAuth)**）。對於 Anthropic，實際上的區分現在是：

- **Anthropic API 金鑰**：正常的 Anthropic API 計費
- **Anthropic Claude CLI / OpenClaw 內的訂閱驗證**：Anthropic
  人員告訴我們此用途再次被允許

OpenAI Codex OAuth 明確支援用於像 OpenClaw 這樣的外部工具。
本頁面說明：

對於生產環境中的 Anthropic，API 金鑰驗證是較安全且推薦的途徑。

- OAuth **權杖交換** 的運作方式 (PKCE)
- 權杖 **儲存** 的位置 (以及原因)
- 如何處理 **多個帳號** (設定檔 + 每次工作階段覆寫)

OpenClaw 也支援自帶 OAuth 或 API 金鑰流程的 **供應商插件**。透過以下方式執行它們：

```bash
openclaw models auth login --provider <id>
```

## 權杖接收器 (為什麼它存在)

OAuth 供應商通常在登入/重新整理流程期間會產生一個 **新的重新整理權杖**。某些供應商（或 OAuth 用戶端）在為同一使用者/應用程式發行新權杖時，可能會使較舊的重新整理權杖失效。

實際症狀：

- 您透過 OpenClaw _以及_ Claude Code / Codex CLI 登入 → 其中一個稍後會隨機被「登出」

為了減少這種情況，OpenClaw 將 `auth-profiles.json` 視為 **權杖接收器**：

- 執行時期從 **一個地方** 讀取憑證
- 我們可以維護多個設定檔並以決定性方式進行路由
- 外部 CLI 的重用因供應商而異：Codex CLI 可以引導一個空的
  `openai-codex:default` 設定檔，但一旦 OpenClaw 擁有本機 OAuth 設定檔，
  該本機重新整理權杖即為標準。如果該本機重新整理權杖被拒絕，
  OpenClaw 可以使用可用的相同帳戶 Codex CLI 權杖作為僅限執行時期的
  備援方案；其他整合可以保持外部管理並重新讀取其
  CLI 驗證儲存
- 已知已配置供應商集合的狀態和啟動路徑會將外部 CLI 發現範圍限定為該集合，因此不會針對單一供應商設定探查無關的 CLI 登入儲存

## 儲存 (Token 的所在位置)

機密儲存在代理程式驗證儲存中：

- 驗證設定檔（OAuth + API 金鑰 + 可選的值層級引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 舊版相容性檔案：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （發現時會清除靜態 `api_key` 條目）

僅供舊版匯入的檔案 (仍支援，但非主要儲存位置)：

- `~/.openclaw/credentials/oauth.json`（首次使用時匯入至 `auth-profiles.json`）

上述所有內容也遵守 `$OPENCLAW_STATE_DIR`（狀態目錄覆寫）。完整參考：[/gateway/configuration](/zh-Hant/gateway/configuration-reference#auth-storage)

關於靜態秘密參照和執行時期快照啟用行為，請參閱[祕密管理](/zh-Hant/gateway/secrets)。

當次要代理程式沒有本機驗證設定檔時，OpenClaw 會使用來自預設/主要代理程式儲存的讀取繼承。它不會在讀取時複製主要代理程式的 `auth-profiles.json`。OAuth 更新權杖特別敏感：正常複製流程預設會跳過它們，因為部分供應商會在使用後輪替或使更新權杖失效。當代理程式需要獨立帳戶時，請為其配置單獨的 OAuth 登入。

## Anthropic 舊版權杖相容性

<Warning>
Anthropic 的公開 Claude Code 文件指出，直接使用 Claude Code 仍
維持在 Claude 訂閱限制內，且 Anthropic 人員告知我們，OpenClaw 風格的 Claude
CLI 使用再次被允許。因此，除非 Anthropic
發布新政策，OpenClaw 將 Claude CLI 重複使用和
`claude -p` 使用視為此整合的授權行為。

若要查看 Anthropic 目前的 direct-Claude-Code 方案文件，請參閱 [使用 Pro 或 Max
方案搭配 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
以及 [使用 Team 或 Enterprise
方案搭配 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果您希望在 OpenClaw 中使用其他訂閱式選項，請參閱 [OpenAI
Codex](/zh-Hant/providers/openai)、[Qwen Cloud Coding
Plan](/zh-Hant/providers/qwen)、[MiniMax Coding Plan](/zh-Hant/providers/minimax)
以及 [Z.AI / GLM Coding Plan](/zh-Hant/providers/zai)。

</Warning>

OpenClaw 也將 Anthropic setup-token 公開為支援的 token-auth 路徑，但在可用時，它現在更傾向於 Claude CLI 重複使用和 `claude -p`。

## Anthropic Claude CLI 遷移

OpenClaw 再次支援 Anthropic Claude CLI 的重複使用。如果您在主機上已有本機
Claude 登入，onboarding/configure 可以直接重複使用它。

## OAuth 交換 (登入運作方式)

OpenClaw 的互動式登入流程是在 `openclaw/plugin-sdk/llm` 中實現的，並連接到嚮導/指令中。

### Anthropic setup-token

流程形狀：

1. 從 OpenClaw 啟動 Anthropic setup-token 或貼上 token
2. OpenClaw 將產生的 Anthropic 憑證儲存在 auth profile 中
3. 模型選擇維持在 `anthropic/...` 上
4. 現有的 Anthropic auth profile 仍可用於回滾/順序控制

### OpenAI Codex (ChatGPT OAuth)

明確支援在 Codex CLI 之外使用 OpenAI Codex OAuth，包括 OpenClaw 工作流程。

流程形狀 (PKCE)：

1. 產生 PKCE verifier/challenge + 隨機 `state`
2. 開啟 `https://auth.openai.com/oauth/authorize?...`
3. 嘗試在 `http://127.0.0.1:1455/auth/callback` 上擷取回呼
4. 如果回呼無法綁定 (或者您是遠端/無介面環境)，請貼上重新導向 URL/程式碼
5. 在 `https://auth.openai.com/oauth/token` 進行交換
6. 從存取 token 中提取 `accountId` 並儲存 `{ access, refresh, expires, accountId }`

精靈路徑是 `openclaw onboard` → auth choice `openai-codex`。

## 重新整理 + 到期

設定檔會儲存一個 `expires` 時間戳記。

執行時：

- 如果 `expires` 在未來 → 使用已儲存的存取權杖
- 如果已到期 → 重新整理（在檔案鎖定下）並覆寫已儲存的認證資訊
- 如果次要代理程式讀取了繼承自主代理程式的 OAuth 設定檔，重新整理時會寫回主代理程式的儲存空間，而不是將重新整理權杖複製到次要代理程式的儲存空間
- 例外：某些外部 CLI 憑證保持外部管理；OpenClaw
  會重新讀取那些 CLI 驗證儲存，而不是消耗複製的重新整理權杖。
  Codex CLI 引導刻意限制較窄：它播種一個空的
  `openai-codex:default` 設定檔，然後 OpenClaw 擁有的重新整理作業會保持本機
  設定檔為標準。如果本機 Codex 重新整理失敗且 Codex CLI 擁有
  相同帳戶的可用權杖，OpenClaw 可能會使用該權杖作為當前
  執行時期請求，而不會將其寫回 `auth-profiles.json`。

重新整理流程是自動的；您通常不需要手動管理權杖。

## 多個帳號（設定檔）+ 路由

兩種模式：

### 1) 建議做法：分離的代理程式

如果您希望「個人」和「工作」帳號永遠互不干擾，請使用隔離的代理程式（分開的作業階段 + 認證 + 工作區）：

```bash
openclaw agents add work
openclaw agents add personal
```

然後針對每個代理程式設定認證（精靈），並將對話路由到正確的代理程式。

### 2) 進階做法：在一個代理程式中使用多個設定檔

`auth-profiles.json` 支援同一供應商的多個設定檔 ID。

選擇要使用的設定檔：

- 透過設定順序進行全域設定 (`auth.order`)
- 透過 `/model ...@<profileId>` 進行每個階段設定

範例（作業階段覆寫）：

- `/model Opus@anthropic:work`

如何查看有哪些設定檔 ID 存在：

- `openclaw channels list --json` (shows `auth[]`)

相關文件：

- [Model failover](/zh-Hant/concepts/model-failover) (rotation + cooldown rules)
- [Slash commands](/zh-Hant/tools/slash-commands) (command surface)

## 相關

- [Authentication](/zh-Hant/gateway/authentication) - model provider auth overview
- [Secrets](/zh-Hant/gateway/secrets) - credential storage and SecretRef
- [Configuration Reference](/zh-Hant/gateway/configuration-reference#auth-storage) - auth config keys
