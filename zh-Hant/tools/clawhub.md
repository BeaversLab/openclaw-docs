---
summary: "ClawHub 指南：公共技能註冊表 + CLI 工作流程"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub 是 **OpenClaw 的公共技能註冊表**。這是一項免費服務：所有技能都是公開、開放的，並且可見於所有人以便分享和重複使用。技能只是一個包含 `SKILL.md` 檔案的資料夾（加上支援文字檔）。您可以在網頁應用程式中瀏覽技能，或使用 CLI 來搜尋、安裝、更新和發布技能。

網站：[clawhub.ai](https://clawhub.ai)

## 什麼是 ClawHub

- OpenClaw 技能的公共註冊表。
- 技能包和元資料的版本化儲存庫。
- 用於搜尋、標籤和使用訊號的探索介面。

## 運作方式

1. 使用者發布技能包（檔案 + 元資料）。
2. ClawHub 儲存該套件、解析元資料並指派版本。
3. 註冊表會為搜尋和探索建立技能索引。
4. 使用者在 OpenClaw 中瀏覽、下載和安裝技能。

## 您可以做什麼

- 發布新技能和現有技能的新版本。
- 透過名稱、標籤或搜尋探索技能。
- 下載技能包並檢查其檔案。
- 檢舉濫用或不安全的技能。
- 如果您是版主，可以隱藏、取消隱藏、刪除或封鎖。

## 適用對象（初學者友善）

如果您想為 OpenClaw 代理程式新增新功能，ClawHub 是尋找和安裝技能最簡單的方法。您不需要知道後端運作原理。您可以：

- 使用自然語言搜尋技能。
- 將技能安裝到您的工作區。
- 稍後使用一個指令更新技能。
- 透過發布您自己的技能來進行備份。

## 快速入門（非技術性）

1. 安裝 CLI（請參閱下一節）。
2. 搜尋您需要的內容：
   - `clawhub search "calendar"`
3. 安裝技能：
   - `clawhub install <skill-slug>`
4. 啟動新的 OpenClaw 工作階段，以便它識別新技能。

## 安裝 CLI

選擇一項：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

預設情況下，CLI 會將技能安裝到您目前工作目錄下的 `./skills` 中。如果設定了 OpenClaw 工作區，除非您覆寫 `--workdir` (或 `CLAWHUB_WORKDIR`)，否則 `clawhub` 會回退到該工作區。OpenClaw 會從 `<workspace>/skills` 載入工作區技能，並會在**下一次**工作階段中載入它們。如果您已經使用 `~/.openclaw/skills` 或捆綁的技能，工作區技能將具有優先權。

有關如何載入、共用和控管技能的更多詳細資訊，請參閱
[Skills](/zh-Hant/tools/skills)。

## 技能系統概覽

技能是一個版本化的檔案捆綁包，用於教導 OpenClaw 如何執行
特定任務。每次發佈都會建立一個新版本，並且登錄表會保留
版本歷史記錄，以便使用者可以稽核變更。

典型的技能包括：

- 包含主要描述和用法的 `SKILL.md` 檔案。
- 技能使用的可選設定、腳本或支援檔案。
- 元數據，例如標籤、摘要和安裝需求。

ClawHub 使用元數據來支援發現並安全地公開技能功能。
登錄表還會追蹤使用訊號（例如星星和下載次數）以改善
排名和可見性。

## 服務提供的內容（功能）

- 技能及其 `SKILL.md` 內容的**公開瀏覽**。
- **搜尋**功能由嵌入（向量搜尋）驅動，而不僅僅是關鍵字。
- **版本控制**，具有 semver、變更日誌和標籤（包括 `latest`）。
- **下載**，每個版本提供一個 zip 檔案。
- 用於社群回饋的**星星和評論**。
- **審核** 掛鉤 (hooks)，用於批准和稽核。
- **適用於 CLI 的 API**，用於自動化和腳本編寫。

## 安全與審核

ClawHub 預設是開放的。任何人都可以上傳技能，但 GitHub 帳戶必須
建立至少一週才能發佈。這有助於減緩濫用，同時不阻礙
合法的貢獻者。

檢舉和審核：

- 任何已登入的使用者都可以檢舉技能。
- 檢舉原因為必填，並會被記錄下來。
- 每個使用者一次最多可以擁有 20 個有效的檢舉。
- 超過 3 個不同使用者檢舉的技能預設會自動隱藏。
- 審核者可以檢視隱藏的技能、取消隱藏、刪除它們或封禁使用者。
- 濫用檢舉功能可能導致帳號被封鎖。

有興趣成為版主嗎？請在 OpenClaw Discord 中提問，並聯繫版主或維護者。

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄（預設：當前目錄；回退至 OpenClaw 工作區）。
- `--dir <dir>`：技能目錄，相對於工作目錄（預設：`skills`）。
- `--site <url>`：網站基礎 URL（瀏覽器登入）。
- `--registry <url>`：註冊表 API 基礎 URL。
- `--no-input`：停用提示（非互動式）。
- `-V, --cli-version`：列印 CLI 版本。

驗證：

- `clawhub login`（瀏覽器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

選項：

- `--token <token>`：貼上 API 權杖。
- `--label <label>`：為瀏覽器登入權杖儲存的標籤（預設：`CLI token`）。
- `--no-browser`：不開啟瀏覽器（需要 `--token`）。

搜尋：

- `clawhub search "query"`
- `--limit <n>`：最大結果數。

安裝：

- `clawhub install <slug>`
- `--version <version>`：安裝特定版本。
- `--force`：若資料夾已存在則覆寫。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新至特定版本（僅限單一 slug）。
- `--force`：當本機檔案與任何已發佈版本不符時覆寫。

列表：

- `clawhub list`（讀取 `.clawhub/lock.json`）

發佈：

- `clawhub publish <path>`
- `--slug <slug>`：技能 slug。
- `--name <name>`：顯示名稱。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：變更日誌文字（可為空白）。
- `--tags <tags>`：以逗號分隔的標籤（預設：`latest`）。

刪除/取消刪除（僅限擁有者/管理員）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步（掃描本機技能 + 發布新技能/更新）：

- `clawhub sync`
- `--root <dir...>`：額外的掃描根目錄。
- `--all`：上傳所有內容而不提示。
- `--dry-run`：顯示將上傳的內容。
- `--bump <type>`：`patch|minor|major` 以檢查更新（預設值：`patch`）。
- `--changelog <text>`：非互動式更新的變更日誌。
- `--tags <tags>`：以逗號分隔的標籤（預設值：`latest`）。
- `--concurrency <n>`：註冊表檢查次數（預設值：4）。

## 常見的代理程式工作流程

### 搜尋技能

```bash
clawhub search "postgres backups"
```

### 下載新技能

```bash
clawhub install my-skill-pack
```

### 更新已安裝的技能

```bash
clawhub update --all
```

### 備份您的技能（發布或同步）

針對單一技能資料夾：

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

若要一次掃描並備份多個技能：

```bash
clawhub sync --all
```

## 進階細節（技術）

### 版本控制與標籤

- 每次發布都會建立一個新的 **semver** `SkillVersion`。
- 標籤（例如 `latest`）指向某個版本；移動標籤可讓您回滾。
- 變更日誌會附加至每個版本，並且在同步或發布更新時可以留空。

### 本機變更與註冊表版本

更新時會使用內容雜湊將本機技能內容與註冊表版本進行比較。如果本機檔案不符合任何已發布的版本，CLI 會在覆寫前詢問（或在非互動式執行中要求 `--force`）。

### 同步掃描與備用根目錄

`clawhub sync` 會先掃描您目前的工作目錄。如果找不到技能，它會回退到已知的舊版位置（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`）。這是為了在不使用額外旗標的情況下找到較舊的技能安裝。

### 儲存與鎖定檔

- 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
- 驗證權杖儲存在 ClawHub CLI 設定檔中（可透過 `CLAWHUB_CONFIG_PATH` 覆寫）。

### 遙測（安裝計數）

當您登入時執行 `clawhub sync`，CLI 會發送最小化的快照以計算安裝次數。您可以完全停用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 環境變數

- `CLAWHUB_SITE`：覆寫網站 URL。
- `CLAWHUB_REGISTRY`：覆寫註冊表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆寫 CLI 儲存 token/config 的位置。
- `CLAWHUB_WORKDIR`：覆寫預設工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 上停用遙測。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
