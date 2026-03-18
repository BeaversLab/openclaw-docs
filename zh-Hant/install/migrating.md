---
summary: "將 OpenClaw 安裝從一台機器移動（遷移）到另一台機器"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "遷移指南"
---

# 將 OpenClaw 遷移到新機器

本指南將 OpenClaw Gateway 從一台機器遷移到另一台機器，**無需重新進入入門流程**。

從概念上講，遷移很簡單：

- 複製 **狀態目錄**（`$OPENCLAW_STATE_DIR`，默認：`~/.openclaw/`）——這包括配置、身份驗證、會話和通道狀態。
- 複製您的 **工作區**（默認為 `~/.openclaw/workspace/`）——這包括您的代理程式檔案（記憶、提示等）。

但是在 **設定檔**、**權限** 和 **部分複製** 方面存在常見的陷阱。

## 開始之前（您要遷移的內容）

### 1) 確定您的狀態目錄

大多數安裝使用默認值：

- **狀態目錄：** `~/.openclaw/`

但如果您使用以下內容，可能會有所不同：

- `--profile <name>`（通常變為 `~/.openclaw-<profile>/`）
- `OPENCLAW_STATE_DIR=/some/path`

如果您不確定，請在 **舊** 機器上運行：

```bash
openclaw status
```

在輸出中查找提及 `OPENCLAW_STATE_DIR` / profile 的內容。如果您運行多個網關，請對每個設定檔重複此操作。

### 2) 確定您的工作區

常見的默認值：

- `~/.openclaw/workspace/`（推薦的工作區）
- 您建立的自訂資料夾

您的工作區是 `MEMORY.md`、`USER.md` 和 `memory/*.md` 等檔案所在的位​​置。

### 3) 了解您將保留的內容

如果您複製狀態目錄和工作區**兩者**，您將保留：

- Gateway 配置（`openclaw.json`）
- 身份驗證設定檔 / API 金鑰 / OAuth 權杖
- 會話歷史記錄 + 代理程式狀態
- 通道狀態（例如 WhatsApp 登入/會話）
- 您的工作區檔案（記憶、技能筆記等）

如果您**僅**複製工作區（例如，透過 Git），您**不會**保留：

- 會話
- 憑證
- 通道登入

這些位於 `$OPENCLAW_STATE_DIR` 之下。

## 遷移步驟（推薦）

### 步驟 0 — 進行備份（舊機器）

在 **舊** 機器上，先停止網關，以免複製過程中檔案發生變化：

```bash
openclaw gateway stop
```

（可選但推薦）將狀態目錄和工作區存檔：

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

如果您有多個設定檔/狀態目錄（例如 `~/.openclaw-main`、`~/.openclaw-work`），請將每一個都封存起來。

### 步驟 1 — 在新機器上安裝 OpenClaw

在**新**機器上，安裝 CLI（如果需要也包括 Node）：

- 請參閱：[安裝](/zh-Hant/install)

在此階段，如果入門流程建立了一個新的 `~/.openclaw/` 是沒關係的——您將在下一步中覆寫它。

### 步驟 2 — 將狀態目錄 + 工作區複製到新機器

複製**這兩者**：

- `$OPENCLAW_STATE_DIR`（預設為 `~/.openclaw/`）
- 您的工作區（預設為 `~/.openclaw/workspace/`）

常見方法：

- `scp` tarball 並解壓縮
- 透過 SSH `rsync -a`
- 外接硬碟

複製後，請確保：

- 已包含隱藏目錄（例如 `.openclaw/`）
- 檔案所有權對於執行閘道器的使用者是正確的

### 步驟 3 — 執行 Doctor（遷移 + 服務修復）

在**新**機器上：

```bash
openclaw doctor
```

Doctor 是「安全且無聊」的指令。它會修復服務、套用設定遷移，並警告不符之處。

然後：

```bash
openclaw gateway restart
openclaw status
```

## 常見陷阱（以及如何避免它們）

### 陷阱：設定檔 / 狀態目錄不符

如果您舊的閘道器使用的是某個設定檔（或 `OPENCLAW_STATE_DIR`），而新的閘道器使用的是不同的設定檔，您會看到以下症狀：

- 設定變更未生效
- 頻道遺失 / 已登出
- 空的歷史紀錄

解決方法：使用您遷移的**相同**設定檔/狀態目錄來執行閘道器/服務，然後重新執行：

```bash
openclaw doctor
```

### 陷阱：僅複製 `openclaw.json`

`openclaw.json` 是不夠的。許多供應商將狀態儲存在：

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

請務必遷移整個 `$OPENCLAW_STATE_DIR` 資料夾。

### 陷阱：權限 / 所有權

如果您以 root 身分複製或變更了使用者，閘道器可能無法讀取憑證/工作階段。

解決方法：確保狀態目錄和工作區是由執行閘道器的使用者所擁有。

### 陷阱：在遠端/本機模式之間遷移

- 如果您的 UI（WebUI/TUI）指向**遠端**閘道器，則遠端主機擁有工作階段儲存空間 + 工作區。
- 遷移您的筆記型電腦不會移動遠端閘道器的狀態。

如果您處於遠端模式，請遷移 **gateway host**。

### 常見陷阱：備份中的機密

`$OPENCLAW_STATE_DIR` 包含機密（API 金鑰、OAuth 權杖、WhatsApp 憑證）。請將備份視為生產環境的機密：

- 加密儲存
- 避免透過不安全的管道分享
- 如果懷疑已外洩，請輪換金鑰

## 驗證檢查清單

在新機器上，確認：

- `openclaw status` 顯示 gateway 正在執行
- 您的通道仍保持連線（例如 WhatsApp 不需要重新配對）
- 儀表板開啟並顯示現有的工作階段
- 您的工作區檔案（記憶、設定）都存在

## 相關

- [Doctor](/zh-Hant/gateway/doctor)
- [Gateway 故障排除](/zh-Hant/gateway/troubleshooting)
- [OpenClaw 將資料儲存在哪裡？](/zh-Hant/help/faq#where-does-openclaw-store-its-data)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
