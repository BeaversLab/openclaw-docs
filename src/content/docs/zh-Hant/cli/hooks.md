---
summary: "`openclaw hooks` （代理 hooks）的 CLI 參考"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "hooks"
---

# `openclaw hooks`

管理代理 hooks（針對 `/new`、`/reset` 和 Gateway 啟動等指令的事件驅動自動化）。

執行 `openclaw hooks` 但不指定子命令，相當於執行 `openclaw hooks list`。

相關：

- Hooks：[Hooks](/zh-Hant/automation/hooks)
- Plugin hooks：[Plugin hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出從工作區 (workspace)、受管 (managed)、額外 (extra) 和內建 (bundled) 目錄中發現的所有 hooks。

**選項：**

- `--eligible`：僅顯示符合資格的 hooks (需求已滿足)
- `--json`：輸出為 JSON 格式
- `-v, --verbose`：顯示詳細資訊，包括缺失的需求

**輸出示例：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**示例 (詳細模式)：**

```bash
openclaw hooks list --verbose
```

顯示不符合資格的 hooks 之缺失需求。

**示例 (JSON)：**

```bash
openclaw hooks list --json
```

傳回結構化的 JSON 以供程式設計使用。

## 取得 Hook 資訊

```bash
openclaw hooks info <name>
```

顯示特定 hook 的詳細資訊。

**引數：**

- `<name>`：Hook 名稱或 hook 金鑰 (例如 `session-memory`)

**選項：**

- `--json`：輸出為 JSON 格式

**示例：**

```bash
openclaw hooks info session-memory
```

**輸出：**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## 檢查 Hook 資格

```bash
openclaw hooks check
```

顯示 hook 資格狀態的摘要 (有多少已準備就緒與未準備就緒)。

**選項：**

- `--json`：輸出為 JSON 格式

**輸出示例：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 啟用 Hook

```bash
openclaw hooks enable <name>
```

透過將特定 hook 新增至您的設定來啟用它 (預設為 `~/.openclaw/openclaw.json`)。

**注意：** 工作區 hooks 預設為停用，直到在此處或在設定中啟用為止。由外掛程式管理的 hooks 在 `openclaw hooks list` 中會顯示 `plugin:<id>`，且無法在此處啟用/停用。請改為啟用/停用外掛程式。

**引數：**

- `<name>`：Hook 名稱 (例如 `session-memory`)

**示例：**

```bash
openclaw hooks enable session-memory
```

**輸出：**

```
✓ Enabled hook: 💾 session-memory
```

**運作方式：**

- 檢查 hook 是否存在且符合資格
- 更新您設定中的 `hooks.internal.entries.<name>.enabled = true`
- 將設定儲存至磁碟

如果 hook 來自 `<workspace>/hooks/`，則必須執行此選擇加入步驟，
Gateway 才會載入它。

**啟用後：**

- 重新啟動 gateway 以重新載入 hooks (在 macOS 上重新啟動選單列應用程式，或在開發中重新啟動您的 gateway 處理程序)。

## 停用 Hook

```bash
openclaw hooks disable <name>
```

透過更新您的設定來停用特定的 hook。

**引數：**

- `<name>`：Hook 名稱 (例如 `command-logger`)

**示例：**

```bash
openclaw hooks disable command-logger
```

**輸出：**

```
⏸ Disabled hook: 📝 command-logger
```

**停用後：**

- 重新啟動閘道以便重新載入 hooks

## 備註

- `openclaw hooks list --json`、`info --json` 和 `check --json` 會將結構化 JSON 直接寫入標準輸出。
- 外掛程式管理的 hooks 無法在此啟用或停用；請改為啟用或停用擁有該 hook 的外掛程式。

## 安裝 Hook 套件

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

透過統一的外掛程式安裝程式安裝 hook 套件。

`openclaw hooks install` 仍可作為相容性別名使用，但它會列印棄用警告並轉發至 `openclaw plugins install`。

Npm 規格**僅限 registry**（套件名稱 + 可選的**確切版本**或 **dist-tag**）。會拒絕 Git/URL/檔案規格和 semver 範圍。相依性安裝會以 `--ignore-scripts` 執行以確保安全。

裸規格和 `@latest` 會保持在穩定軌道上。如果 npm 將其中任一解析為 pre-release，OpenClaw 會停止並要求您使用 pre-release 標籤（例如 `@beta`/`@rc`）或確切的 pre-release 版本明確選擇加入。

**功能說明：**

- 將 hook 套件複製到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中啟用已安裝的 hooks
- 在 `hooks.internal.installs` 下記錄安裝

**選項：**

- `-l, --link`：連結本機目錄而非複製（將其新增至 `hooks.internal.load.extraDirs`）
- `--pin`：將 npm 安裝記錄為 `hooks.internal.installs` 中的確切已解析 `name@version`

**支援的壓縮檔：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**範例：**

```bash
# Local directory
openclaw plugins install ./my-hook-pack

# Local archive
openclaw plugins install ./my-hook-pack.zip

# NPM package
openclaw plugins install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw plugins install -l ./my-hook-pack
```

連結的 hook 套件會被視為來自操作員設定目錄的受管理 hooks，而不是工作區 hooks。

## 更新 Hook 套件

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

透過統一的外掛程式更新程式更新追蹤的 npm 型 hook 套件。

`openclaw hooks update` 仍可作為相容性別名使用，但它會列印棄用警告並轉發至 `openclaw plugins update`。

**選項：**

- `--all`：更新所有追蹤的 hook 套件
- `--dry-run`：顯示將會變更的內容而不進行寫入

當儲存的完整性雜湊值存在且獲取的工件雜湊值發生變化時，
OpenClaw 會列印警告並在繼續之前要求確認。請使用
全域 `--yes` 在 CI/非互動式執行中略過提示。

## 內建 Hooks

### session-memory

當您發出 `/new` 或 `/reset` 時，將會話上下文儲存至記憶體。

**啟用：**

```bash
openclaw hooks enable session-memory
```

**輸出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**參閱：** [session-memory 文件](/zh-Hant/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的啟動檔案（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**啟用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**參閱：** [bootstrap-extra-files 文件](/zh-Hant/automation/hooks#bootstrap-extra-files)

### command-logger

將所有指令事件記錄到集中式的稽核檔案中。

**啟用：**

```bash
openclaw hooks enable command-logger
```

**輸出：** `~/.openclaw/logs/commands.log`

**檢視日誌：**

```bash
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**參閱：** [command-logger 文件](/zh-Hant/automation/hooks#command-logger)

### boot-md

當閘道啟動時（頻道啟動後）執行 `BOOT.md`。

**事件**： `gateway:startup`

**啟用**：

```bash
openclaw hooks enable boot-md
```

**參閱：** [boot-md 文件](/zh-Hant/automation/hooks#boot-md)
