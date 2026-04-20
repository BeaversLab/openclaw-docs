---
summary: "ClawHub 指南：公開註冊表、原生 OpenClaw 安裝流程，以及 ClawHub CLI 工作流程"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills or plugins
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub 是 **OpenClaw 技能和外掛程式**的公共註冊表。

- 使用原生 `openclaw` 指令從 ClawHub 搜尋/安裝/更新技能以及安裝
  外掛程式。
- 當您需要註冊表驗證、發布、刪除、取消刪除或同步工作流程時，請使用獨立的 `clawhub` CLI。

網站：[clawhub.ai](https://clawhub.ai)

## 原生 OpenClaw 流程

技能：

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

外掛程式：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

純 npm 安全的外掛程式規範也會在嘗試 npm 之前先對照 ClawHub 進行嘗試：

```bash
openclaw plugins install openclaw-codex-app-server
```

原生 `openclaw` 指令會安裝到您現行的工作區，並持續保存來源
中繼資料，以便後續的 `update` 呼叫能留在 ClawHub 上。

外掛程式安裝會在執行封存安裝之前，驗證宣傳的 `pluginApi` 和 `minGatewayVersion` 相容性，因此不相容的主機會提前以封閉方式失敗，而不是部分安裝套件。

`openclaw plugins install clawhub:...` 僅接受可安裝的外掛程式系列。如果 ClawHub 套件實際上是一個技能，OpenClaw 會停止並將您指引至 `openclaw skills install <slug>`。

## 什麼是 ClawHub

- OpenClaw 技能和外掛程式的公開註冊中心。
- 技能套件和元數據的版本化存放區。
- 用於搜尋、標籤和使用訊號的發現介面。

## 運作方式

1. 使用者發布技能套件（檔案 + 元數據）。
2. ClawHub 儲存套件、解析元數據，並指派版本。
3. 註冊中心會為技能編製索引以便搜尋和發現。
4. 使用者在 OpenClaw 中瀏覽、下載並安裝技能。

## 您可以做什麼

- 發布新技能以及現有技能的新版本。
- 透過名稱、標籤或搜尋來發現技能。
- 下載技能套件並檢視其檔案。
- 檢舉濫用或不安全的技能。
- 如果您是版主，可以進行隱藏、取消隱藏、刪除或封鎖操作。

## 適合對象（對初學者友善）

如果您想為您的 OpenClaw 代理程式新增新功能，ClawHub 是尋找並安裝技能最簡單的方法。您不需要了解後端運作原理。您可以：

- 使用一般語言搜尋技能。
- 將技能安裝到您的工作區。
- 稍後使用一個指令更新技能。
- 透過發布您自己的技能來進行備份。

## 快速開始（非技術性）

1. 搜尋您需要的內容：
   - `openclaw skills search "calendar"`
2. 安裝技能：
   - `openclaw skills install <skill-slug>`
3. 啟動新的 OpenClaw 工作階段，以便它接收新技能。
4. 如果您想發布或管理註冊中心驗證，請一併安裝獨立的
   `clawhub` CLI。

## 安裝 ClawHub CLI

您只需要將其用於需要註冊中心驗證的工作流程，例如發布/同步：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

原生的 `openclaw skills install` 會安裝到現用工作區 `skills/` 目錄中。`openclaw plugins install clawhub:...` 會記錄一般的受管理外掛程式安裝以及用於更新的 ClawHub 來源元數據。

匿名 ClawHub 外掛程式安裝也會對私有套件封閉失敗。
社群或其他非官方管道仍然可以安裝，但 OpenClaw 會發出警告，
讓操作員在啟用它們之前能審查來源與驗證狀態。

獨立的 `clawhub` CLI 也會將技能安裝在您目前工作目錄下的 `./skills` 中。
如果設定了 OpenClaw 工作區，`clawhub` 會回退到該工作區，除非您覆寫 `--workdir` (或 `CLAWHUB_WORKDIR`)。
OpenClaw 會從 `<workspace>/skills` 載入工作區技能，並會在**下一次**工作階段中
選用它們。如果您已經使用 `~/.openclaw/skills` 或內建技能，工作區技能具有優先權。

關於技能如何載入、共用和管理的更多詳細資訊，請參閱
[Skills](/zh-Hant/tools/skills)。

## 技能系統概覽

技能是教導 OpenClaw 如何執行特定任務的版本化檔案套件。
每次發布都會建立一個新版本，且登錄檔會保留版本歷史記錄，
讓使用者可以審查變更。

典型的技能包括：

- 包含主要描述和用法的 `SKILL.md` 檔案。
- 技能使用的選用設定、腳本或支援檔案。
- 元數據 (Metadata)，例如標籤、摘要和安裝需求。

ClawHub 使用元數據來支援探索並安全地公開技能功能。
登錄檔也會追蹤使用信號 (例如星標和下載次數) 以改善
排名和能見度。

## 服務提供的內容 (功能)

- 技能及其 `SKILL.md` 內容的 **公開瀏覽**。
- **搜尋** 功能由嵌入 向量搜尋 提供支援，而不僅僅是關鍵字。
- **版本控制**，包含 semver、變更日誌和標籤 (包括 `latest`)。
- 以每個版本 zip 格式 **下載**。
- **星標和留言**，用於社群回饋。
- **審核** 掛勾 (hooks)，用於審批和稽核。
- **CLI 友善的 API**，用於自動化和腳本。

## 安全性與審核

ClawHub 預設為開放。任何人都可以上傳技能，但 GitHub 帳戶必須
註冊至少一週才能發布。這有助於減緩濫用，同時不阻礙
合法的貢獻者。

檢舉與審核：

- 任何已登入的使用者都可以檢舉技能。
- 必須提供檢舉理由並予以記錄。
- 每個使用者同時最多只能有 20 個進行中的檢舉。
- 超過 3 個不同使用者檢舉的技能預設會自動隱藏。
- 版主可以檢視已隱藏的技能、將其取消隱藏、刪除或封鎖使用者。
- 濫用檢舉功能可能導致帳號被封鎖。

有意成為版主嗎？請在 OpenClaw Discord 中詢問並聯繫版主或維護者。

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄（預設為目前目錄；若無則回退至 OpenClaw 工作區）。
- `--dir <dir>`：技能目錄，相對於工作目錄（預設為 `skills`）。
- `--site <url>`：網站基礎 URL（瀏覽器登入）。
- `--registry <url>`：Registry API 基礎 URL。
- `--no-input`：停用提示（非互動模式）。
- `-V, --cli-version`：列印 CLI 版本。

驗證：

- `clawhub login`（瀏覽器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

選項：

- `--token <token>`：貼上 API Token。
- `--label <label>`：為瀏覽器登入 Token 儲存的標籤（預設為 `CLI token`）。
- `--no-browser`：不開啟瀏覽器（需要 `--token`）。

搜尋：

- `clawhub search "query"`
- `--limit <n>`：最大結果數量。

安裝：

- `clawhub install <slug>`
- `--version <version>`：安裝特定版本。
- `--force`：如果資料夾已存在則覆蓋。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新至特定版本（僅限單一 slug）。
- `--force`：當本機檔案與任何已發布版本不符時覆蓋。

列表：

- `clawhub list`（讀取 `.clawhub/lock.json`）

發布技能：

- `clawhub skill publish <path>`
- `--slug <slug>`：技能 Slug。
- `--name <name>`：顯示名稱。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：變更記錄文字（可以為空）。
- `--tags <tags>`：以逗號分隔的標籤（預設值：`latest`）。

發布外掛程式：

- `clawhub package publish <source>`
- `<source>` 可以是本機資料夾、`owner/repo`、`owner/repo@ref` 或 GitHub URL。
- `--dry-run`：建構確切的發布計劃而不上傳任何內容。
- `--json`：輸出供 CI 使用的機器可讀格式。
- `--source-repo`、`--source-commit`、`--source-ref`：當自動偵測不足時的選用覆寫選項。

刪除/取消刪除（僅限擁有者/管理員）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步（掃描本機技能 + 發布新項目/更新項目）：

- `clawhub sync`
- `--root <dir...>`：額外的掃描根目錄。
- `--all`：不上傳任何提示，直接上傳所有內容。
- `--dry-run`：顯示將上傳的內容。
- `--bump <type>`：`patch|minor|major` 以進行更新（預設值：`patch`）。
- `--changelog <text>`：非互動式更新的變更記錄。
- `--tags <tags>`：以逗號分隔的標籤（預設值：`latest`）。
- `--concurrency <n>`：註冊表檢查（預設值：4）。

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

### 備份您的技能（發布或同步）

針對單一技能資料夾：

```bash
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

若要一次掃描並備份多個技能：

```bash
clawhub sync --all
```

### 從 GitHub 發布外掛程式

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
clawhub package publish https://github.com/your-org/your-plugin
```

程式碼外掛程式必須在 `package.json` 中包含必要的 OpenClaw 中繼資料：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

## 進階細節（技術性）

### 版本控制與標籤

- 每次發布都會建立一個新的 **semver** `SkillVersion`。
- 標籤（例如 `latest`）指向某個版本；移動標籤可讓您回復。
- 變更記錄是附加在每個版本上的，在同步或發布更新時可以為空。

### 本機變更與註冊表版本的比較

更新會使用內容雜湊將本地技能內容與登錄檔版本進行比較。如果本地檔案與任何已發布的版本不符，CLI 會在覆寫前詢問（或在非互動式執行中需要 `--force`）。

### 同步掃描與備用根目錄

`clawhub sync` 會先掃描您目前的工作目錄。如果找不到任何技能，它會回退到已知的舊版位置（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`）。這是為了在不需要額外旗標的情況下找到舊的技能安裝。

### 儲存與鎖定檔

- 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
- 驗證權杖儲存在 ClawHub CLI 設定檔中（可透過 `CLAWHUB_CONFIG_PATH` 覆蓋）。

### 遙測（安裝計數）

當您在登入狀態下執行 `clawhub sync` 時，CLI 會傳送最小化的快照以計算安裝次數。您可以完全停用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 環境變數

- `CLAWHUB_SITE`：覆蓋網站 URL。
- `CLAWHUB_REGISTRY`：覆蓋登錄檔 API URL。
- `CLAWHUB_CONFIG_PATH`：覆蓋 CLI 儲存權杖/設定的位置。
- `CLAWHUB_WORKDIR`：覆蓋預設的工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：停用 `sync` 上的遙測。
