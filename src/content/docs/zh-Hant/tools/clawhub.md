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

## 什麼是 ClawHub

- OpenClaw 技能和外掛程式的公開註冊表。
- 技能套件和中繼資料的版本化存儲庫。
- 用於搜尋、標籤和使用情況信號的探索介面。

## 運作方式

1. 用戶發布技能套件（檔案 + 中繼資料）。
2. ClawHub 存儲該套件，解析中繼資料，並指派版本。
3. 註冊表為搜尋和探索建立該技能的索引。
4. 用戶在 OpenClaw 中瀏覽、下載並安裝技能。

## 您可以做什麼

- 發布新技能以及現有技能的新版本。
- 透過名稱、標籤或搜尋來探索技能。
- 下載技能套件並檢視其檔案。
- 檢舉濫用或不安全的技能。
- 如果您是管理員，可以隱藏、取消隱藏、刪除或封禁。

## 適合對象（對初學者友善）

如果您想為您的 OpenClaw 代理程式增加新功能，ClawHub 是尋找和安裝技能最簡單的方式。您不需要了解後端的運作方式。您可以：

- 使用純語言搜尋技能。
- 將技能安裝到您的工作區。
- 稍後使用單一指令更新技能。
- 透過發布您自己的技能來進行備份。

## 快速入門（非技術性）

1. 搜尋您需要的內容：
   - `openclaw skills search "calendar"`
2. 安裝技能：
   - `openclaw skills install <skill-slug>`
3. 啟動新的 OpenClaw 工作階段，以便它載入新技能。
4. 如果您想要發布或管理註冊表驗證，請一併安裝獨立的
   `clawhub` CLI。

## 安裝 ClawHub CLI

您僅需要此步驟用於需要登錄檔驗證的工作流程，例如發佈/同步：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

原生 `openclaw skills install` 會安裝到現行工作區的 `skills/`
目錄。`openclaw plugins install clawhub:...` 會記錄標準的受管理
外掛安裝以及 ClawHub 來源中繼資料以供更新。

獨立的 `clawhub` CLI 也會將技能安裝到您目前工作目錄下的 `./skills` 中。如果設定了 OpenClaw 工作區，`clawhub`
會退回到該工作區，除非您覆寫 `--workdir` (或
`CLAWHUB_WORKDIR`)。OpenClaw 會從 `<workspace>/skills`
載入工作區技能，並會在**下一次**工作階段中套用它們。如果您已經使用
`~/.openclaw/skills` 或內建技能，工作區技能將優先。

關於技能如何載入、共用和限制的詳細資訊，請參閱
[Skills](/en/tools/skills)。

## 技能系統概覽

技能是一組已設定版本的檔案套件，用於教導 OpenClaw 如何執行
特定任務。每次發佈都會建立一個新版本，而登錄檔會保留
版本歷史記錄，以便使用者審查變更。

典型的技能包含：

- 包含主要描述和用法的 `SKILL.md` 檔案。
- 技能使用的選用設定檔、指令碼或支援檔案。
- 元資料，例如標籤、摘要和安裝需求。

ClawHub 使用元資料來提供探索功能並安全地揭露技能功能。
登錄檔也會追蹤使用訊號（例如星數和下載次數）以改善
排名和可見度。

## 服務提供的內容 (功能)

- 技能及其 `SKILL.md` 內容的**公開瀏覽**。
- **搜尋**功能由嵌入 (向量搜尋) 驅動，而不僅僅是關鍵字。
- **版本控制**，包含 semver、變更記錄和標籤 (包括 `latest`)。
- 每個版本的**下載** (ZIP 格式)。
- 用於社群反饋的**星號和評論**。
- 用於核准和審查的**稽核**勾點。
- 適用於自動化和指令碼撰寫的**友善 CLI 的 API**。

## 安全性與稽核

ClawHub 預設為開放。任何人都可以上傳技能，但 GitHub 帳戶必須註冊至少一週才能發布。這有助於減少濫用，同時不阻擋合法的貢獻者。

檢舉與審核：

- 任何已登入的使用者都可以檢舉技能。
- 檢舉原因為必填並會被記錄。
- 每個使用者一次最多可以擁有 20 個有效的檢舉。
- 超過 3 個不同使用者檢舉的技能會預設自動隱藏。
- 版主可以檢視被隱藏的技能、將其取消隱藏、刪除或封禁使用者。
- 濫用檢舉功能可能導致帳戶被封禁。

有興趣成為版主嗎？請在 OpenClaw Discord 中提問，並聯繫版主或維護者。

## CLI 指令與參數

全域選項（適用於所有指令）：

- `--workdir <dir>`：工作目錄 (預設：目前目錄；退回到 OpenClaw 工作區)。
- `--dir <dir>`: Skills 目錄，相對於工作目錄（預設：`skills`）。
- `--site <url>`: 網站基礎 URL（瀏覽器登入）。
- `--registry <url>`: 註冊表 API 基礎 URL。
- `--no-input`: 停用提示（非互動式）。
- `-V, --cli-version`: 列印 CLI 版本。

驗證：

- `clawhub login`（瀏覽器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

選項：

- `--token <token>`: 貼上 API 權杖。
- `--label <label>`: 為瀏覽器登入權杖儲存的標籤（預設：`CLI token`）。
- `--no-browser`: 不要開啟瀏覽器（需要 `--token`）。

搜尋：

- `clawhub search "query"`
- `--limit <n>`: 最大結果數。

安裝：

- `clawhub install <slug>`
- `--version <version>`: 安裝特定版本。
- `--force`: 如果資料夾已存在則覆寫。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`: 更新至特定版本（僅限單一 slug）。
- `--force`: 當本地檔案與任何已發布版本不符時覆寫。

列表：

- `clawhub list`（讀取 `.clawhub/lock.json`）

發佈 Skills：

- `clawhub skill publish <path>`
- `--slug <slug>`: Skill slug。
- `--name <name>`: 顯示名稱。
- `--version <version>`: Semver 版本。
- `--changelog <text>`: 更新日誌文字（可為空白）。
- `--tags <tags>`: 逗號分隔的標籤（預設：`latest`）。

發佈外掛程式：

- `clawhub package publish <source>`
- `<source>` 可以是本機資料夾、`owner/repo`、`owner/repo@ref` 或 GitHub URL。
- `--dry-run`: 建構確切的發佈計畫而不上傳任何內容。
- `--json`: 發出供 CI 使用的機器可讀輸出。
- `--source-repo`, `--source-commit`, `--source-ref`: 當自動偵測不足時的選用覆寫選項。

刪除/取消刪除 (�限擁有者/管理員)：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步 (掃描本機技能 + 發佈新項/更新項)：

- `clawhub sync`
- `--root <dir...>`: 額外的掃描根目錄。
- `--all`: 上傳所有內容而不經提示。
- `--dry-run`: 顯示將上傳的內容。
- `--bump <type>`: `patch|minor|major` 以進行更新 (預設：`patch`)。
- `--changelog <text>`: 非互動式更新的變更日誌。
- `--tags <tags>`: 以逗號分隔的標籤 (預設：`latest`)。
- `--concurrency <n>`: 登錄表檢查 (預設為 4)。

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
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

若要一次掃描並備份多個技能：

```bash
clawhub sync --all
```

### 從 GitHub 發佈外掛程式

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

## 進階細節 (技術性)

### 版本控制與標籤

- 每次發佈都會建立一個新的 **semver** `SkillVersion`。
- 標籤 (例如 `latest`) 指向某個版本；移動標籤可讓您回復。
- 變更日誌會附加到各個版本，且在同步或發佈更新時可以留空。

### 本機變更與登錄表版本的比較

更新會使用內容雜湊值，將本機技能內容與登錄表版本進行比較。如果本機檔案不符合任何已發佈的版本，CLI 會在覆寫前詢問 (或在非互動式執行中需要 `--force`)。

### 同步掃描與後備根目錄

`clawhub sync` 會先掃描您目前的工作目錄。如果找不到技能，它會後備到已知的舊版位置 (例如 `~/openclaw/skills` 和 `~/.openclaw/skills`)。這是為了在不需要額外旗標的情況下找到舊版安裝的技能而設計的。

### 儲存空間與鎖定檔

- 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
- 驗證令牌儲存在 ClawHub CLI 設定檔中（可透過 `CLAWHUB_CONFIG_PATH` 覆蓋）。

### 遙測（安裝計數）

當您登入時執行 `clawhub sync`，CLI 會傳送最小快照來計算安裝次數。您可以完全停用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 環境變數

- `CLAWHUB_SITE`：覆蓋網站 URL。
- `CLAWHUB_REGISTRY`：覆蓋註冊表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆蓋 CLI 儲存令牌/設定的位置。
- `CLAWHUB_WORKDIR`：覆蓋預設的工作目錄。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 上停用遙測。
