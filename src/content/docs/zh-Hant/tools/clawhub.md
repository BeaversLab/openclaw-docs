---
summary: "ClawHub：OpenClaw 技能和插件 的公開註冊表、原生安裝流程，以及 clawhub CLI"
read_when:
  - Searching for, installing, or updating skills or plugins
  - Publishing skills or plugins to the registry
  - Configuring the clawhub CLI or its environment overrides
title: "ClawHub"
sidebarTitle: "ClawHub"
---

ClawHub 是 **OpenClaw 技能和外掛程式**的公共註冊表。

- 使用原生的 `openclaw` 指令來搜尋、安裝和更新技能，以及從 ClawHub 安裝插件。
- 使用獨立的 `clawhub` CLI 進行註冊表驗證、發布、刪除/取消刪除以及同步工作流程。

網站：[clawhub.ai](https://clawhub.ai)

## 快速開始

<Steps>
  <Step title="搜尋">
    ```bash
    openclaw skills search "calendar"
    ```
  </Step>
  <Step title="安裝">
    ```bash
    openclaw skills install <skill-slug>
    ```
  </Step>
  <Step title="使用">
    啟動一個新的 OpenClaw 工作階段 — 它會自動識別新技能。
  </Step>
  <Step title="發布 (選用)">
    若要進行註冊表驗證的工作流程 (發布、同步、管理)，請安裝
    獨立的 `clawhub` CLI：

    ```bash
    npm i -g clawhub
    # or
    pnpm add -g clawhub
    ```

  </Step>
</Steps>

## 原生 OpenClaw 流程

<Tabs>
  <Tab title="技能">
    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生 `openclaw` 指令會安裝到您目前的工作區，並
    保存來源中繼資料，以便稍後的 `update` 呼叫能持續使用 ClawHub。

  </Tab>
  <Tab title="插件">
    ```bash
    openclaw plugins install clawhub:<package>
    openclaw plugins update --all
    ```

    純 npm 安全的插件規格也會在嘗試 npm 之前先嘗試對應 ClawHub：

    ```bash
    openclaw plugins install openclaw-codex-app-server
    ```

    當您想要僅透過 npm 解析而不進行
    ClawHub 查詢時，請使用 `npm:<package>`：

    ```bash
    openclaw plugins install npm:openclaw-codex-app-server
    ```

    插件安裝會在執行封存安裝前驗證公告的 `pluginApi` 與
    `minGatewayVersion` 相容性，因此不相容的主機
    會提早安全失敗，而不是部分安裝該套件。

  </Tab>
</Tabs>

<Note>
`openclaw plugins install clawhub:...` 僅接受可安裝的外掛系列。如果 ClawHub 套件實際上是一個技能，OpenClaw 會停止並將您引導至 `openclaw skills install <slug>`。

匿名 ClawHub 外掛安裝對於私人套件也會失敗。社群或其他非官方管道仍然可以安裝，但 OpenClaw 會發出警告，以便操作員在啟用它們之前檢視來源和驗證資訊。

</Note>

## 什麼是 ClawHub

- 用於 OpenClaw 技能和外掛的公開註冊中心。
- 技能套件和元資料的版本化儲存庫。
- 用於搜尋、標籤和使用訊號的探索介面。

典型的技能是一個包含以下內容的版本化檔案套件：

- 包含主要描述和使用說明的 `SKILL.md` 檔案。
- 技能使用的可選設定、腳本或支援檔案。
- 元資料，例如標籤、摘要和安裝需求。

ClawHub 使用元資料來驅動探索並安全地公開技能功能。註冊中心追蹤使用訊號（星標、下載次數）以提高排名和可見性。每次發布都會建立一個新的 semver 版本，註冊中心會保留版本歷史記錄，以便使用者可以稽核變更。

## 工作區和技能載入

獨立的 `clawhub` CLI 也會將技能安裝到目前工作目錄下的 `./skills` 中。如果設定了 OpenClaw 工作區，除非您覆寫 `--workdir`（或 `CLAWHUB_WORKDIR`），否則 `clawhub` 會回退到該工作區。OpenClaw 從 `<workspace>/skills` 載入工作區技能，並在**下一個**工作階段中擷取它們。

如果您已經使用 `~/.openclaw/skills` 或套件技能，工作區技能優先。有關如何載入、共用和限制技能的更多詳細資訊，請參閱 [Skills](/zh-Hant/tools/skills)。

## 服務功能

| 功能           | 備註                                       |
| -------------- | ------------------------------------------ |
| 公開瀏覽       | 技能及其 `SKILL.md` 內容是公開可見的。     |
| 搜尋           | 由嵌入驅動（向量搜尋），而不僅僅是關鍵字。 |
| 版本控制       | Semver、變更日誌和標籤（包括 `latest`）。  |
| 下載           | 每個版本的 Zip 檔案。                      |
| 星標和評論     | 社群回饋。                                 |
| 審核           | 批准和稽核。                               |
| CLI 友善的 API | 適用於自動化和腳本編寫。                   |

## 安全性和審核

ClawHub 預設為開放 — 任何人都可以上傳技能，但 GitHub 帳戶必須**註冊至少一週**才能發布。這會減緩濫用行為，同時不阻擋合法的貢獻者。

<AccordionGroup>
  <Accordion title="檢舉">- 任何已登入的使用者都可以檢舉技能。 - 檢舉原因為必填且會被記錄。 - 每個使用者一次最多可以有 20 個有效檢舉。 - 超過 3 個不同使用者檢舉的技能預設會自動隱藏。</Accordion>
  <Accordion title="審核">- 版主可以檢視被隱藏的技能、將其取消隱藏、刪除它們或封鎖使用者。 - 濫用檢舉功能可能導致帳戶被封鎖。 - 有興趣成為版主嗎？請在 OpenClaw Discord 中詢問並聯繫版主或維護者。</Accordion>
</AccordionGroup>

## ClawHub CLI

您僅在需要進行註冊表驗證的工作流程（例如 publish/sync）時才需要此工具。

### 全域選項

<ParamField path="--workdir <dir>" type="string">
  工作目錄。預設：當前目錄；若無則回退至 OpenClaw 工作區。
</ParamField>
<ParamField path="--dir <dir>" type="string" default="skills">
  技能目錄，相對於工作目錄。
</ParamField>
<ParamField path="--site <url>" type="string">
  網站基礎 URL（瀏覽器登入）。
</ParamField>
<ParamField path="--registry <url>" type="string">
  註冊表 API 基礎 URL。
</ParamField>
<ParamField path="--no-input" type="boolean">
  停用提示（非互動式）。
</ParamField>
<ParamField path="-V, --cli-version" type="boolean">
  列印 CLI 版本。
</ParamField>

### 指令

<AccordionGroup>
  <Accordion title="Auth (login / logout / whoami)">
    ```bash
    clawhub login              # browser flow
    clawhub login --token <token>
    clawhub logout
    clawhub whoami
    ```

    登入選項：

    - `--token <token>` — 貼上 API 權杖。
    - `--label <label>` — 為瀏覽器登入權杖儲存的標籤（預設：`CLI token`）。
    - `--no-browser` — 不開啟瀏覽器（需要 `--token`）。

  </Accordion>
  <Accordion title="搜尋">
    ```bash
    clawhub search "query"
    ```

    - `--limit <n>` — 最大結果數。

  </Accordion>
  <Accordion title="安裝 / 更新 / 列表">
    ```bash
    clawhub install <slug>
    clawhub update <slug>
    clawhub update --all
    clawhub list
    ```

    選項：

    - `--version <version>` — 安裝或更新到指定版本（僅在 `update` 上支援單一 slug）。
    - `--force` — 如果資料夾已存在，或當本地檔案與任何已發布版本不符時覆寫。
    - `clawhub list` 讀取 `.clawhub/lock.json`。

  </Accordion>
  <Accordion title="發布技能">
    ```bash
    clawhub skill publish <path>
    ```

    選項：

    - `--slug <slug>` — 技能 slug。
    - `--name <name>` — 顯示名稱。
    - `--version <version>` — semver 版本。
    - `--changelog <text>` — 變更日誌文字（可為空白）。
    - `--tags <tags>` — 以逗號分隔的標籤（預設值：`latest`）。

  </Accordion>
  <Accordion title="發布外掛">
    ```bash
    clawhub package publish <source>
    ```

    `<source>` 可以是本機資料夾、`owner/repo`、`owner/repo@ref`，或
    GitHub URL。

    選項：

    - `--dry-run` — 建立確切的發布計畫而不上傳任何內容。
    - `--json` — 輸出機器可讀的輸出以供 CI 使用。
    - `--source-repo`、`--source-commit`、`--source-ref` — 當自動偵測不足時的可選覆寫。

  </Accordion>
  <Accordion title="刪除 / 取消刪除（擁有者或管理員）">
    ```bash
    clawhub delete <slug> --yes
    clawhub undelete <slug> --yes
    ```
  </Accordion>
  <Accordion title="Sync (scan local + publish new or updated)">
    ```bash
    clawhub sync
    ```

    選項：

    - `--root <dir...>` — 額外的掃描根目錄。
    - `--all` — 不提示即上傳所有內容。
    - `--dry-run` — 顯示將上傳的內容。
    - `--bump <type>` — 用於更新的 `patch|minor|major`（預設值：`patch`）。
    - `--changelog <text>` — 用於非互動式更新的變更日誌。
    - `--tags <tags>` — 以逗號分隔的標籤（預設值：`latest`）。
    - `--concurrency <n>` — 註冊表檢查（預設值：`4`）。

  </Accordion>
</AccordionGroup>

## 常見工作流程

<Tabs>
  <Tab title="Search">```bash clawhub search "postgres backups" ```</Tab>
  <Tab title="Install">```bash clawhub install my-skill-pack ```</Tab>
  <Tab title="Update all">```bash clawhub update --all ```</Tab>
  <Tab title="Publish a single skill">```bash clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest ```</Tab>
  <Tab title="Sync many skills">```bash clawhub sync --all ```</Tab>
  <Tab title="Publish a plugin from GitHub">```bash clawhub package publish your-org/your-plugin --dry-run clawhub package publish your-org/your-plugin clawhub package publish your-org/your-plugin@v1.0.0 clawhub package publish https://github.com/your-org/your-plugin ```</Tab>
</Tabs>

### 插件套件元資料

程式碼插件必須在 `package.json` 中包含必要的 OpenClaw 元資料：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
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

已發布的套件應提供 **建置後的 JavaScript**，並將 `runtimeExtensions` 指向該輸出。當不存在建置檔案時，Git 檢出安裝仍可回退到 TypeScript 原始碼，但建置後的執行時期條目可以避免在啟動、診斷和插件載入路徑中進行執行時期 TypeScript 編譯。

## 版本控制、鎖定檔和遙測

<AccordionGroup>
  <Accordion title="版本控制與標籤">
    - 每次發佈都會建立一個新的 **semver** `SkillVersion`。
    - 標籤（例如 `latest`）指向某個版本；移動標籤可讓您回溯。
    - 變更日誌會附加至每個版本，且在同步或發佈更新時可以為空。
  </Accordion>
  <Accordion title="本機變更與註冊表版本">
    更新會使用內容雜湊將本機技能內容與註冊表版本進行比較。
    如果本機檔案與任何已發佈的版本都不相符，
    CLI 會在覆寫前詢問（或在非互動式執行中要求 `--force`）。
  </Accordion>
  <Accordion title="同步掃描與後援根目錄">
    `clawhub sync` 會先掃描您目前的工作目錄。如果找不到技能，
    它會後援至已知的舊版位置（例如
    `~/openclaw/skills` 和 `~/.openclaw/skills`）。這是為了
    在不需要額外標誌的情況下找到較舊的技能安裝。
  </Accordion>
  <Accordion title="儲存與鎖定檔">
    - 已安裝的技能會記錄在工作目錄下的 `.clawhub/lock.json` 中。
    - 驗證權杖會儲存在 ClawHub CLI 設定檔中（可透過 `CLAWHUB_CONFIG_PATH` 覆寫）。
  </Accordion>
  <Accordion title="遙測（安裝計數）">
    當您在登入時執行 `clawhub sync`，CLI 會傳送最精簡的
    快照以計算安裝計數。您可以完全停用此功能：

    ```bash
    export CLAWHUB_DISABLE_TELEMETRY=1
    ```

  </Accordion>
</AccordionGroup>

## 環境變數

| 變數                          | 作用                           |
| ----------------------------- | ------------------------------ |
| `CLAWHUB_SITE`                | 覆寫網站 URL。                 |
| `CLAWHUB_REGISTRY`            | 覆寫註冊表 API URL。           |
| `CLAWHUB_CONFIG_PATH`         | 覆寫 CLI 儲存權杖/設定的位置。 |
| `CLAWHUB_WORKDIR`             | 覆寫預設的工作目錄。           |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 在 `sync` 上停用遙測。         |

## 相關

- [社群外掛](/zh-Hant/plugins/community)
- [外掛](/zh-Hant/tools/plugin)
- [技能](/zh-Hant/tools/skills)
