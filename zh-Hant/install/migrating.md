---
summary: "Move (migrate) an OpenClaw install from one machine to another"
read_when:
  - 您正在將 OpenClaw 移動到新的筆記型電腦/伺服器
  - 您想要保留工作階段、驗證資訊和頻道登入資訊（WhatsApp 等）
title: "Migration Guide"
---

# 將 OpenClaw 遷移到新機器

本指南將 OpenClaw Gateway 從一台機器遷移到另一台機器，**而無需重新進行入門設定**。

從概念上講，遷移很簡單：

- 複製 **state directory**（`$OPENCLAW_STATE_DIR`，預設：`~/.openclaw/`）——這包括設定、驗證資訊、工作階段和頻道狀態。
- 複製您的 **workspace**（預設為 `~/.openclaw/workspace/`）——這包括您的代理程式檔案（記憶體、提示詞等）。

但是在 **profiles**、**權限** 和 **部分複製** 方面有一些常見陷阱。

## 開始之前（您要遷移的內容）

### 1) 識別您的狀態目錄

大多數安裝使用預設值：

- **State dir:** `~/.openclaw/`

但如果您使用以下內容，可能會有所不同：

- `--profile <name>` (通常會變成 `~/.openclaw-<profile>/`)
- `OPENCLAW_STATE_DIR=/some/path`

如果您不確定，請在**舊**機器上執行：

```bash
openclaw status
```

在輸出中尋找 `OPENCLAW_STATE_DIR` / profile 的提及。如果您執行多個 gateway，請對每個 profile 重複此操作。

### 2) 識別您的工作區

常見的預設值：

- `~/.openclaw/workspace/` (推薦的工作區)
- 您建立的自訂資料夾

您的工作區是存放 `MEMORY.md`、`USER.md` 和 `memory/*.md` 等檔案的地方。

### 3) 了解您將保留的內容

如果您複製狀態目錄和工作區**兩者**，您將保留：

- Gateway 設定 (`openclaw.json`)
- 驗證設定檔 / API 金鑰 / OAuth 權杖
- 工作階段歷史記錄 + 代理程式狀態
- 頻道狀態（例如 WhatsApp 登入/工作階段）
- 您的工作區檔案（記憶體、技能筆記等）

如果您**僅**複製工作區（例如，透過 Git），您將**不會**保留：

- 工作階段
- 憑證
- 頻道登入資�

這些位於 `$OPENCLAW_STATE_DIR` 之下。

## 遷移步驟（推薦）

### 步驟 0 - 進行備份（舊機器）

在**舊**機器上，先停止 gateway，以免檔案在複製過程中發生變更：

```bash
openclaw gateway stop
```

（可選但推薦）將狀態目錄和工作區封存：

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

如果您有多個設定檔/狀態目錄（例如 `~/.openclaw-main`、`~/.openclaw-work`），請將每一個都封存起來。

### 步驟 1 - 在新機器上安裝 OpenClaw

在**新**機器上，安裝 CLI（如果需要，也安裝 Node）：

- 請參閱：[安裝](/zh-Hant/install)

在這個階段，如果引導過程建立了一個全新的 `~/.openclaw/` 也不會有問題——您會在下一步將其覆蓋。

### 步驟 2 - 將狀態目錄和工作區複製到新機器

複製**這兩者**：

- `$OPENCLAW_STATE_DIR`（預設為 `~/.openclaw/`）
- 您的工作區（預設為 `~/.openclaw/workspace/`）

常見的方法：

- `scp` tarball 並解壓縮
- 透過 SSH `rsync -a`
- 外接硬碟

複製後，請確保：

- 已包含隱藏目錄（例如 `.openclaw/`）
- 檔案擁有權對於執行閘道的使用者是正確的

### 步驟 3 - 執行 Doctor（遷移 + 服務修復）

在**新**機器上：

```bash
openclaw doctor
```

Doctor 是一個「安全且枯燥」的指令。它會修復服務、套用設定遷移，並針對不相符的情況發出警告。

然後：

```bash
openclaw gateway restart
openclaw status
```

## 常見的陷阱（以及如何避免它們）

### 陷阱：設定檔 / 狀態目錄不相符

如果您舊的閘道是使用設定檔（或 `OPENCLAW_STATE_DIR`）執行的，而新的閘道使用的是不同的設定，您會看到類似以下的症狀：

- 設定變更未生效
- 頻道遺失 / 已登出
- 空白的作業階段記錄

解決方法：使用您遷移的**同一個**設定檔/狀態目錄來執行閘道/服務，然後重新執行：

```bash
openclaw doctor
```

### 陷阱：僅複製 `openclaw.json`

`openclaw.json` 是不夠的。許多供應商將狀態儲存在以下位置：

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

務必遷移整個 `$OPENCLAW_STATE_DIR` 資料夾。

### 陷阱：權限 / 擁有權

如果您以 root 身分複製或變更了使用者，閘道可能無法讀取憑證/作業階段。

解決方法：確保狀態目錄和工作區是由執行閘道的使用者所擁有。

### 陷阱：在遠端/本機模式之間遷移

- 如果您的 UI（WebUI/TUI）指向**遠端**閘道，則遠端主機擁有作業階段存放區和工作區。
- 遷移您的筆記型電腦並不會移動遠端閘道的狀態。

如果您處於遠端模式，請遷移 **gateway host**。

### 陷阱：備份中的機密資訊

`$OPENCLAW_STATE_DIR` 包含機密資訊（API 金鑰、OAuth 權杖、WhatsApp 憑證）。請像處理生產環境機密資訊一樣對待備份：

- 以加密方式儲存
- 避免透過不安全的管道分享
- 如果懷疑有洩漏，請輪換金鑰

## 驗證檢查清單

在新機器上，確認：

- `openclaw status` 顯示閘道正在執行
- 您的頻道仍保持連線（例如 WhatsApp 不需要重新配對）
- 儀表板可以開啟並顯示現有的工作階段
- 您的工作區檔案（記憶體、設定）都存在

## 相關連結

- [Doctor](/zh-Hant/gateway/doctor)
- [Gateway troubleshooting](/zh-Hant/gateway/troubleshooting)
- [Where does OpenClaw store its data?](/zh-Hant/help/faq#where-does-openclaw-store-its-data)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
