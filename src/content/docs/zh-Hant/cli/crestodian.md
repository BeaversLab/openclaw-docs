---
summary: "Crestodian 的 CLI 參考與安全模型，這是一個無需配置的安全設定與修復輔助工具"
read_when:
  - You run openclaw with no command and want to understand Crestodian
  - You need a configless-safe way to inspect or repair OpenClaw
  - You are designing or enabling message-channel rescue mode
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian 是 OpenClaw 的本機設定、修復與配置輔助工具。其設計目的是在一般代理程式路徑損壞時，仍能保持連線。

不帶任何指令執行 `openclaw` 會在互動式終端機中啟動 Crestodian。
執行 `openclaw crestodian` 則會明確啟動相同的輔助工具。

## Crestodian 顯示的內容

啟動時，互動式 Crestodian 會開啟與 `openclaw tui` 相同的 TUI shell，並搭配 Crestodian 聊天後端。聊天記錄以簡短的問候語開始：

- 何時啟動 Crestodian
- Crestodian 實際使用的模型或確定性規劃器路徑
- 配置有效性與預設代理程式
- 從首次啟動探針測試的 Gateway 連線能力
- Crestodian 可採取的下一個除錯動作

它不會僅為了啟動而傾印機密或載入外掛程式 CLI 指令。TUI 仍提供一般的標題、聊天記錄、狀態列、頁尾、自動完成和編輯器控制項。

使用 `status` 查看詳細清單，其中包含配置路徑、文件/來源路徑、本機 CLI 探針、API 金鑰狀態、代理程式、模型和 Gateway 詳細資訊。

Crestodian 使用與常規代理相同的 OpenClaw 參考發現機制。在 Git 檢出中，它會指向本地的 `docs/` 和本地源代碼樹。在 npm 套件安裝中，它使用捆綁的套件文檔並連結到 [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，並明確指導在文檔不足時查看源代碼。

## 範例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

在 Crestodian TUI 內：

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
plugins list
plugins search slack
plugin install clawhub:openclaw-codex-app-server
plugin uninstall openclaw-codex-app-server
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 安全啟動

Crestodian 的啟動路徑經刻意縮減。它可以在以下情況下執行：

- 缺少 `openclaw.json`
- `openclaw.json` 無效
- Gateway 停機
- 外掛程式指令註冊無法使用
- 尚未設定任何代理程式

`openclaw --help` 和 `openclaw --version` 仍使用一般的快速路徑。
非互動式 `openclaw` 會顯示簡短訊息後結束，而不是列印根層級說明，因為無指令的產品是 Crestodian。

## 操作與核准

Crestodian 使用具類型操作，而非臨時編輯配置。

唯讀操作可立即執行：

- 顯示概覽
- 列出代理程式
- 列出已安裝的外掛
- 搜尋 ClawHub 外掛
- 顯示模型/後端狀態
- 執行狀態或健康檢查
- 檢查 Gateway 連通性
- 執行 doctor 而不進行互動式修復
- 驗證配置
- 顯示稽核日誌路徑

持久性操作需要在互動模式下經過對話式批准，除非您傳遞 `--yes` 進行直接指令：

- 寫入配置
- 執行 `config set`
- 通過 `config set-ref` 設定支援的 SecretRef 值
- 執行設定/入門引導
- 變更預設模型
- 啟動、停止或重新啟動 Gateway
- 建立代理
- 從 ClawHub 或 npm 安裝外掛
- 解除安裝外掛
- 執行會重寫配置或狀態的 doctor 修復

應用的寫入操作記錄於：

```text
~/.openclaw/audit/crestodian.jsonl
```

發現過程不受稽核。只有已應用的操作和寫入會被記錄。

`openclaw onboard --modern` 啟動 Crestodian 作為現代入門預覽。普通的 `openclaw onboard` 仍會執行經典入門。

## 設定引導

`setup` 是以聊天為主的入門引導。它僅通過類型化的配置操作進行寫入，並會事先詢問批准。

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

當未配置模型時，設定會按此順序選擇第一個可用的後端，並告訴您它的選擇：

- 現有的明確模型（如果已配置）
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- Claude Code CLI -> `claude-cli/claude-opus-4-7`
- Codex CLI -> `codex-cli/gpt-5.5`

如果都不可用，設定仍會寫入預設工作區並保持模型未設定。安裝或登入 Codex/Claude Code，或公開 `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`，然後再次執行設定。

## 模型輔助規劃器

Crestodian 始終以確定性模式啟動。對於確定性解析器無法理解的模糊指令，本機 Crestodian 可以透過 OpenClaw 的正常執行路徑進行一次有限的規劃器運轉。它首先使用已設定的 OpenClaw 模型。如果尚未有可用的已設定模型，它可以回退到機器上已存在的本機執行環境：

- Claude Code CLI：`claude-cli/claude-opus-4-7`
- Codex app-server harness：`openai/gpt-5.5`
- Codex CLI：`codex-cli/gpt-5.5`

模型輔助規劃器無法直接變更設定。它必須將請求轉換為 Crestodian 的一個型別化指令，然後適用正常的批准與稽核規則。Crestodian 會在執行任何操作之前列印出它使用的模型和解讀的指令。無設定回退規劃器運轉是暫時的，在執行環境支援的情況下會停用工具，並使用暫時的工作區/工作階段。

訊息通道救援模式不使用模型輔助規劃器。遠端救援保持確定性，因此損壞或遭入侵的正常代理路徑無法被用作設定編輯器。

## 切換至代理

使用自然語言選擇器離開 Crestodian 並開啟正常的 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 仍會直接開啟正常的代理 TUI。它們不會啟動 Crestodian。

切換至正常 TUI 後，使用 `/crestodian` 返回 Crestodian。
您可以包含後續請求：

```text
/crestodian
/crestodian restart gateway
```

TUI 內部的代理切換會留下一個提示，指出 `/crestodian` 可用。

## 訊息救援模式

訊息救援模式是 Crestodian 的訊息通道進入點。它適用於您的正常代理已停止運作，但 WhatsApp 等信任的通道仍能接收指令的情況。

支援的文字指令：

- `/crestodian <request>`

操作員流程：

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
You: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
You: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

代理建立也可以從本機提示或救援模式排入佇列：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

遠端救援模式是一個管理介面。必須將其視為遠端設定修復，而非正常聊天。

遠端救援的安全性合約：

- 啟用沙箱時停用。如果代理/工作階段位於沙箱中，
  Crestodian 必須拒絕遠端救援並說明需要本機 CLI 修復。
- 預設的有效狀態為 `auto`：僅在受信任的 YOLO 操作中允許遠端救援，此時執行時環境已具備無沙箱的本機權限。
- 需要明確的擁有者身分。救援不得接受萬用字元傳送者規則、開放群組原則、未經驗證的 Webhook 或匿名通道。
- 預設僅允許擁有者的直接訊息 (DM)。群組/通道救援需要明確選擇加入。
- 外掛程式搜尋和列出為唯讀。由於外掛程式安裝會下載可執行程式碼，因此預設僅限本機進行。當救援原則允許持久性寫入時，可以將外掛程式解除安裝作為一項經核准的修復作業。
- 遠端救援無法開啟本機 TUI 或切換至互動式代理程式工作階段。請使用本機 `openclaw` 進行代理程式移交。
- 即使在救援模式下，持久性寫入仍需經過核准。
- 審核每個已套用的救援作業。訊息通道救援會記錄通道、帳戶、傳送者和來源位址中繼資料。設定變更作業也會記錄變更前後的設定雜湊。
- 切勿回傳秘密。SecretRef 檢查應回報可用性，而非數值。
- 如果 Gateway 運作正常，請優先使用 Gateway 類型的作業。如果 Gateway 已當機，則僅使用不依賴正常代理程式迴圈的最小本機修復介面。

設定結構：

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` 應接受：

- `"auto"`：預設值。僅當有效執行時環境為 YOLO 且關閉沙箱時允許。
- `false`：絕不允許訊息通道救援。
- `true`：當擁有者/通道檢查通過時明確允許救援。這仍不得繞過沙箱拒絕限制。

預設的 `"auto"` YOLO 姿態為：

- 沙箱模式解析為 `off`
- `tools.exec.security` 解析為 `full`
- `tools.exec.ask` 解析為 `off`

遠端救援涵蓋於 Docker 軌道：

```bash
pnpm test:docker:crestodian-rescue
```

無設定的本機規劃器後備機制涵蓋於：

```bash
pnpm test:docker:crestodian-planner
```

一個選擇加入的即時通道指令介面冒煙測試會檢查 `/crestodian status` 以及透過救援處理程式進行的持久性核准往返程序：

```bash
pnpm test:live:crestodian-rescue-channel
```

透過 Crestodian 進行全新的無設定安裝涵蓋於：

```bash
pnpm test:docker:crestodian-first-run
```

該通道以空的狀態目錄開始，將裸露的 `openclaw` 路由至 Crestodian，設定預設模型，建立額外的代理，透過啟用外掛程式和 token SecretRef 來設定 Discord，驗證配置，並檢查稽核日誌。QA Lab 也有一個儲存庫支援的相同 Ring 0 流程情境：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Doctor](/zh-Hant/cli/doctor)
- [TUI](/zh-Hant/cli/tui)
- [Sandbox](/zh-Hant/cli/sandbox)
- [Security](/zh-Hant/cli/security)
