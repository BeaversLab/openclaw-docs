---
summary: "ClawHub 指南：公開技能註冊表 + CLI 工作流程"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub 是 **OpenClaw 的公開技能註冊表**。這是一項免費服務：所有技能都是公開、開放的，並且對所有人可見以供共享和重用。技能只是一個包含 `SKILL.md` 檔案（加上支援文字檔）的資料夾。您可以在網頁應用程式中瀏覽技能，或使用 CLI 來搜尋、安裝、更新和發佈技能。

網站：[clawhub.ai](https://clawhub.ai)

## 什麼是 ClawHub

- OpenClaw 技能的公開註冊表。
- 技能套件和元數據的版本化儲存庫。
- 用於搜尋、標籤和使用訊號的探索介面。

## 運作方式

1. 使用者發佈技能套件（檔案 + 元數據）。
2. ClawHub 儲存套件，解析元數據，並分配版本。
3. 註冊表為搜尋和探索建立技能索引。
4. 使用者在 OpenClaw 中瀏覽、下載和安裝技能。

## 您可以做什麼

- 發佈新技能以及現有技能的新版本。
- 透過名稱、標籤或搜尋來發現技能。
- 下載技能套件並檢視其檔案。
- 檢舉濫用或不安全的技能。
- 如果您是版主，可以隱藏、取消隱藏、刪除或封禁。

## 適合對象（對初學者友善）

如果您想為您的 OpenClaw 代理程式新增新功能，ClawHub 是尋找和安裝技能最簡單的方法。您不需要了解後端運作方式。您可以：

- 使用自然語言搜尋技能。
- 將技能安裝到您的工作區。
- 稍後使用單一指令更新技能。
- 透過發佈技能來備份您自己的技能。

## 快速入門（非技術性）

1. 安裝 CLI（請參閱下一節）。
2. 搜尋您需要的內容：
   - `clawhub search "calendar"`
3. 安裝技能：
   - `clawhub install <skill-slug>`
4. 啟動新的 OpenClaw 工作階段，以便它載入新技能。

## 安裝 CLI

擇一使用：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 如何融入 OpenClaw

根據預設，CLI 會將技能安裝到您目前工作目錄下的 `./skills` 中。如果設定了 OpenClaw 工作區，除非您覆寫 `--workdir` (或 `CLAWHUB_WORKDIR`)，否則 `clawhub` 會回退到該工作區。OpenClaw 會從 `<workspace>/skills` 載入工作區技能，並會在**下一次**工作階段中啟用它們。如果您已經使用 `~/.openclaw/skills` 或內建技能，工作區技能將優先採用。

有關技能如何載入、共用和設限的更多詳細資訊，請參閱
[Skills](/zh-Hant/tools/skills)。

## 技能系統概覽

技能是一組經過版本控制的檔案套件，用於教導 OpenClaw 如何執行
特定任務。每次發布都會建立一個新版本，且登錄檔會保留
版本歷史記錄，以便使用者審查變更。

典型的技能包括：

- 包含主要描述和使用方式的 `SKILL.md` 檔案。
- 技能所使用的選用設定、指令碼或支援檔案。
- 元數據，例如標籤、摘要和安裝需求。

ClawHub 使用元數據來強化探索功能並安全地公開技能功能。
登錄檔也會追蹤使用訊號 (例如星數和下載次數) 以改善
排名和能見度。

## 服務提供的內容 (功能)

- 技能及其 `SKILL.md` 內容的**公開瀏覽**。
- **搜尋**功能由嵌入 (向量搜尋) 驅動，而不僅僅是關鍵字。
- **版本控制**，包含 semver、變更日誌和標籤 (包括 `latest`)。
- **下載**每個版本的 zip 檔案。
- **星號和評論**以供社群回饋。
- **審核**掛鉤 用於核准和審查。
- **適合 CLI 的 API** 用於自動化和編寫指令碼。

## 安全性與審核

ClawHub 預設為開放。任何人都可以上傳技能，但 GitHub 帳戶必須
註冊至少一週才能發布。這有助於減緩濫用，同時不會阻擋
合法的貢獻者。

檢舉與審核：

- 任何已登入的使用者都可以檢舉技能。
- 檢舉原因為必填，且會被記錄下來。
- 每個使用者一次最多可以擁有 20 個有效的檢舉。
- 獲得超過 3 個不同使用者檢舉的技能會預設自動隱藏。
- 版主可以檢視隱藏的技能、取消隱藏、刪除它們或封鎖使用者。
- 濫用檢舉功能可能導致帳號被停權。

有興趣成為版主嗎？請在 OpenClaw Discord 中提問並聯繫
版主或維護者。

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄（預設：當前目錄；若無則回退至 OpenClaw 工作區）。
- `--dir <dir>`：技能目錄，相對於工作目錄（預設：`skills`）。
- `--site <url>`：網站基礎網址（瀏覽器登入）。
- `--registry <url>`：註冊表 API 基礎網址。
- `--no-input`：停用提示（非互動式）。
- `-V, --cli-version`：列印 CLI 版本。

驗證：

- `clawhub login`（瀏覽器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

選項：

- `--token <token>`：貼上 API 權杖。
- `--label <label>`：為瀏覽器登入權杖儲存的標籤（預設：`CLI token`）。
- `--no-browser`：不要開啟瀏覽器（需要 `--token`）。

搜尋：

- `clawhub search "query"`
- `--limit <n>`：最大結果數。

安裝：

- `clawhub install <slug>`
- `--version <version>`：安裝特定版本。
- `--force`：如果資料夾已存在則覆寫。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新至特定版本（僅限單一 slug）。
- `--force`：當本機檔案與任何已發佈的版本不符時進行覆寫。

列表：

- `clawhub list`（讀取 `.clawhub/lock.json`）

發佈：

- `clawhub publish <path>`
- `--slug <slug>`：技能 slug。
- `--name <name>`：顯示名稱。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：變更日誌文字（可為空）。
- `--tags <tags>`：逗號分隔的標籤（預設：`latest`）。

刪除/取消刪除（僅限擁有者/管理員）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Sync (掃描本地技能 + 發布新增/更新的)：

- `clawhub sync`
- `--root <dir...>`：額外的掃描根目錄。
- `--all`：無提示上傳所有內容。
- `--dry-run`：顯示將要上傳的內容。
- `--bump <type>`：`patch|minor|major` 以更新 (預設：`patch`)。
- `--changelog <text>`：非互動式更新的變更日誌。
- `--tags <tags>`：以逗號分隔的標籤 (預設：`latest`)。
- `--concurrency <n>`：註冊表檢查 (預設：4)。

## 代理的常見工作流程

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

### 備份您的技能 (發布或同步)

對於單一技能資料夾：

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

若要一次掃描並備份多個技能：

```bash
clawhub sync --all
```

## 進階細節 (技術性)

### 版本控制與標籤

- 每次發布會建立一個新的 **semver** `SkillVersion`。
- 標籤 (例如 `latest`) 指向某個版本；移動標籤可讓您還原。
- 變更日誌會附加到每個版本，並且在同步或發布更新時可以留空。

### 本機變更與註冊表版本

更新時會使用內容雜湊值，將本機技能內容與註冊表版本進行比較。如果本機檔案與任何已發布的版本不符，CLI 會在覆寫前詢問 (或在非互動式執行中要求 `--force`)。

### 同步掃描與備用根目錄

`clawhub sync` 首先會掃描您目前的工作目錄。如果未找到技能，則會回退到已知的舊有位置 (例如 `~/openclaw/skills` 和 `~/.openclaw/skills`)。此設計旨在無需額外旗標的情況下找到舊的技能安裝。

### 儲存與鎖定檔

- 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
- 驗證令牌 儲存在 ClawHub CLI 設定檔中 (可透過 `CLAWHUB_CONFIG_PATH` 覆蓋)。

### 遙測 (安裝計數)

當您登入時執行 `clawhub sync`，CLI 會發送最簡化的快照以計算安裝計數。您可以完全停用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 環境變數

- `CLAWHUB_SITE`：覆蓋網站 URL。
- `CLAWHUB_REGISTRY`：覆寫註冊表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆寫 CLI 儲存權杖/配置的位置。
- `CLAWHUB_WORKDIR`：覆寫預設工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 上停用遙測。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
