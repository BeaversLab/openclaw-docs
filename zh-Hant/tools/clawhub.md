---
summary: "ClawHub 指南：公開技能註冊表 + CLI 工作流程"
read_when:
  - 向新使用者介紹 ClawHub
  - 安裝、搜尋或發佈技能
  - 解釋 ClawHub CLI 標誌和同步行為
title: "ClawHub"
---

# ClawHub

ClawHub 是 **OpenClaw 的公開技能註冊表**。這是一項免費服務：所有技能都是公開、開放的，並且對所有人可見以便分享和重複使用。技能只是一個包含 `SKILL.md` 檔案的資料夾（加上相關的文字檔案）。您可以在網頁應用程式中瀏覽技能，或使用 CLI 來搜尋、安裝、更新和發佈技能。

網站：[clawhub.ai](https://clawhub.ai)

## 什麼是 ClawHub

- OpenClaw 技能的公開註冊表。
- 技能套件和元數據的版本化存儲。
- 用於搜尋、標籤和使用信號的發現介面。

## 運作方式

1. 使用者發佈技能套件（檔案 + 元數據）。
2. ClawHub 存儲套件，解析元數據，並指派版本。
3. 註冊表將技能編入索引以便搜尋和發現。
4. 使用者在 OpenClaw 中瀏覽、下載和安裝技能。

## 您可以做什麼

- 發佈新技能以及現有技能的新版本。
- 透過名稱、標籤或搜尋來探索技能。
- 下載技能套件並檢查其檔案。
- 檢舉濫用或不安全的技能。
- 如果您是版主，可以隱藏、取消隱藏、刪除或封鎖。

## 適合對象（適合初學者）

如果您想為您的 OpenClaw 代理程式新增新功能，ClawHub 是尋找和安裝技能的最簡單方法。您不需要知道後端是如何運作的。您可以：

- 使用自然語言搜尋技能。
- 將技能安裝到您的工作區。
- 稍後使用一個命令更新技能。
- 透過發佈來備份您自己的技能。

## 快速入門（非技術性）

1. 安裝 CLI（請參閱下一節）。
2. 搜尋您需要的內容：
   - `clawhub search "calendar"`
3. 安裝技能：
   - `clawhub install <skill-slug>`
4. 啟動新的 OpenClaw 會話，以便它載入新技能。

## 安裝 CLI

選擇其中一種：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

根據預設，CLI 會將技能安裝到目前工作目錄下的 `./skills` 中。如果設定了 OpenClaw 工作區，除非您覆寫 `--workdir`（或 `CLAWHUB_WORKDIR`），否則 `clawhub` 會退回到該工作區。OpenClaw 會從 `<workspace>/skills` 載入工作區技能，並會在**下一次**作業階段中選取它們。如果您已經使用 `~/.openclaw/skills` 或內建技能，工作區技能的優先順序較高。

關於技能如何載入、共用與管理的更多詳細資訊，請參閱
[技能](/zh-Hant/tools/skills)。

## 技能系統概覽

「技能」是一組版本控制的檔案套件，用來教導 OpenClaw 如何執行
特定任務。每次發布都會建立一個新版本，而註冊表會保留
版本歷史紀錄，以便使用者審查變更。

典型的技能包含：

- 包含主要說明與用法的 `SKILL.md` 檔案。
- 技能所使用的選用設定、腳本或支援檔案。
- 中繼資料，例如標籤、摘要和安裝需求。

ClawHub 使用中繼資料來驅動探索並安全地公開技能功能。
註冊表也會追蹤使用信號（例如星號和下載次數），以改善
排名和可見度。

## 服務提供的內容（功能）

- 技能及其 `SKILL.md` 內容的**公開瀏覽**。
- 由嵌入（向量搜尋）驅動的**搜尋**，而不僅僅是關鍵字。
- **版本控制**，使用 semver、變更紀錄和標籤（包括 `latest`）。
- 各個版本的 **下載**（zip 格式）。
- 用於社群回饋的**星號和留言**。
- 用於核准和審查的**審核**掛勾。
- **對 CLI 友善的 API**，用於自動化和腳本編寫。

## 安全性與審核

ClawHub 根據預設為開放。任何人都可以上傳技能，但 GitHub 帳戶必須
建立至少一週才能發布。這有助於減緩濫用，同時不阻擋
合法的貢獻者。

檢舉與審核：

- 任何已登入的使用者都可以檢舉技能。
- 檢舉原因為必填，且會被記錄下來。
- 每個使用者一次最多可以擁有 20 個有效的檢舉。
- 超過 3 個不重複使用者檢舉的技能會根據預設自動隱藏。
- 審核者可以檢視已隱藏的技能、取消隱藏、刪除或封鎖使用者。
- 濫用舉報功能可能導致帳號被停用。

有興趣成為版主嗎？請在 OpenClaw Discord 中提問，並聯繫版主或維護者。

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄（預設：目前目錄；退而求其次使用 OpenClaw 工作區）。
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
- `--force`：如果資料夾已存在則覆寫。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新到特定版本（僅限單一 slug）。
- `--force`：當本機檔案不符合任何已發布版本時覆寫。

列表：

- `clawhub list`（讀取 `.clawhub/lock.json`）

發布：

- `clawhub publish <path>`
- `--slug <slug>`：技能 slug。
- `--name <name>`：顯示名稱。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：變更日誌文字（可為空白）。
- `--tags <tags>`：以逗號分隔的標籤（預設：`latest`）。

刪除/取消刪除（僅限擁有者/管理員）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Sync (掃描本機技能 + 發佈新增/更新的技能)：

- `clawhub sync`
- `--root <dir...>`：額外的掃描根目錄。
- `--all`：無提示上傳所有內容。
- `--dry-run`：顯示將要上傳的內容。
- `--bump <type>`： `patch|minor|major` 以進行更新 (預設值： `patch`)。
- `--changelog <text>`：用於非互動式更新的變更日誌。
- `--tags <tags>`：以逗號分隔的標籤 (預設值： `latest`)。
- `--concurrency <n>`：註冊表檢查 (預設值： 4)。

## 代理程式的常見工作流程

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

### 備份您的技能 (發佈或同步)

針對單一技能資料夾：

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

若要一次掃描並備份多個技能：

```bash
clawhub sync --all
```

## 進階詳細資訊 (技術性)

### 版本控制與標籤

- 每次發佈都會建立一個新的 **semver** `SkillVersion`。
- 標籤 (例如 `latest`) 指向某個版本；移動標籤可讓您復原。
- 變更日誌會附加於每個版本，並且在同步或發佈更新時可以為空。

### 本機變更與註冊表版本的比較

更新會使用內容雜湊將本機技能內容與註冊表版本進行比較。如果本機檔案不符合任何已發佈的版本，CLI 會在覆寫前詢問 (或在非互動式執行中要求 `--force`)。

### 同步掃描與後援根目錄

`clawhub sync` 會先掃描您目前的工作目錄。如果找不到技能，它會後援至已知的舊版位置 (例如 `~/openclaw/skills` 和 `~/.openclaw/skills`)。此設計旨在尋找舊版技能安裝，而無需額外的旗標。

### 儲存與鎖定檔

- 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
- 驗證權杖會儲存在 ClawHub CLI 設定檔中 (可透過 `CLAWHUB_CONFIG_PATH` 覆寫)。

### 遙測 (安裝計數)

當您在登入時執行 `clawhub sync`，CLI 會傳送最少的快照以計算安裝計數。您可以完全停用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 環境變數

- `CLAWHUB_SITE`：覆寫網站 URL。
- `CLAWHUB_REGISTRY`：覆寫註冊表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆寫 CLI 儲存 token/config 的位置。
- `CLAWHUB_WORKDIR`：覆寫預設的工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 上停用遙測。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
