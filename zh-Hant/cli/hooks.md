---
summary: "`openclaw hooks` (agent hooks) 的 CLI 參考手冊"
read_when:
  - 您想要管理 agent hooks
  - 您想要安裝或更新 hooks
title: "hooks"
---

# `openclaw hooks`

管理 agent hooks（針對 `/new`、`/reset` 等指令以及 gateway 啟動的事件驅動自動化）。

相關：

- Hooks：[Hooks](/zh-Hant/automation/hooks)
- Plugin hooks：[Plugins](/zh-Hant/tools/plugin#plugin-hooks)

## 列出所有 Hooks

```bash
openclaw hooks list
```

列出從工作區、受管及內建目錄中發現的所有 hooks。

**選項：**

- `--eligible`：僅顯示符合資格的 hooks（已滿足需求）
- `--json`：輸出為 JSON
- `-v, --verbose`：顯示詳細資訊，包括缺失的需求

**輸出示例：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
```

**示例（詳細模式）：**

```bash
openclaw hooks list --verbose
```

顯示不符合資格的掛鉤所缺失的需求。

**範例 (JSON)：**

```bash
openclaw hooks list --json
```

傳回結構化 JSON 以供程式化使用。

## 取得掛鉤資訊

```bash
openclaw hooks info <name>
```

顯示關於特定掛鉤的詳細資訊。

**引數：**

- `<name>`：掛鉤名稱 (例如 `session-memory`)

**選項：**

- `--json`：以 JSON 輸出

**範例：**

```bash
openclaw hooks info session-memory
```

**輸出：**

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## 檢查掛鉤資格

```bash
openclaw hooks check
```

顯示掛鉤資格狀態的摘要 (有多少已準備好與未準備好)。

**選項：**

- `--json`：以 JSON 輸出

**範例輸出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 啟用掛鉤

```bash
openclaw hooks enable <name>
```

透過將特定掛鉤新增至您的設定 (`~/.openclaw/config.json`) 來啟用它。

**注意：** 外掛程式管理的掛鉤會在 `openclaw hooks list` 中顯示 `plugin:<id>`，
且無法在此啟用/停用。請改為啟用/停用外掛程式。

**引數：**

- `<name>`：Hook 名稱（例如 `session-memory`）

**範例：**

```bash
openclaw hooks enable session-memory
```

**輸出：**

```
✓ Enabled hook: 💾 session-memory
```

**做什麼：**

- 檢查 hook 是否存在且符合資格
- 更新您設定中的 `hooks.internal.entries.<name>.enabled = true`
- 將設定儲存至磁碟

**啟用後：**

- 重新啟動 gateway 以重新載入 hooks（在 macOS 上重新啟動選單列應用程式，或在開發模式中重新啟動您的 gateway 處理程序）。

## 停用 Hook

```bash
openclaw hooks disable <name>
```

透過更新您的設定來停用特定的 hook。

**引數：**

- `<name>`：Hook 名稱（例如 `command-logger`）

**範例：**

```bash
openclaw hooks disable command-logger
```

**輸出：**

```
⏸ Disabled hook: 📝 command-logger
```

**停用後：**

- 重新啟動 gateway 以重新載入 hooks

## 安裝 Hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

從本機資料夾/封存檔或 npm 安裝 hook 套件。

Npm 規格僅限於 **registry-only**（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。不接受 Git/URL/file 規格和 semver 範圍。為了安全起見，相依性安裝會使用 `--ignore-scripts` 執行。

純規格和 `@latest` 會保持在穩定軌道上。如果 npm 將其中任何一個解析為搶先版，OpenClaw 會停止並要求您使用搶先版標籤（例如 `@beta`/`@rc`）或確切的搶先版版本來明確選擇加入。

**作用：**

- 將 Hook 套件複製到 `~/.openclaw/hooks/<id>` 中
- 在 `hooks.internal.entries.*` 中啟用已安裝的 Hooks
- 在 `hooks.internal.installs` 下記錄安裝

**選項：**

- `-l, --link`：連結本機目錄而不是複製（將其新增到 `hooks.internal.load.extraDirs`）
- `--pin`：將 npm 安裝記錄為 `hooks.internal.installs` 中的確切解析 `name@version`

**支援的壓縮檔：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**範例：**

```bash
# Local directory
openclaw hooks install ./my-hook-pack

# Local archive
openclaw hooks install ./my-hook-pack.zip

# NPM package
openclaw hooks install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw hooks install -l ./my-hook-pack
```

## 更新 Hooks

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

更新已安裝的 hook 套件（僅限 npm 安裝）。

**選項：**

- `--all`：更新所有追蹤的 hook 套件
- `--dry-run`：顯示會變更的內容而不實際寫入

當存在儲存的完整性雜湊，且獲取的工件雜湊發生變更時，
OpenClaw 會列印警告並在繼續之前要求確認。請使用
全域 `--yes` 在 CI/非互動式執行中略過提示。

## 內建 Hooks

### session-memory

當您發出 `/new` 時，將 session 內容儲存至記憶體。

**啟用：**

```bash
openclaw hooks enable session-memory
```

**輸出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**請參閱：** [session-memory 文件](/zh-Hant/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的 bootstrap 檔案（例如 monorepo-local `AGENTS.md` / `TOOLS.md`）。

**啟用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**請參閱：** [bootstrap-extra-files 文件](/zh-Hant/automation/hooks#bootstrap-extra-files)

### command-logger

將所有指令事件記錄到集中式稽核檔案中。

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

**請參閱：** [command-logger 文件](/zh-Hant/automation/hooks#command-logger)

### boot-md

當閘道啟動時（在通道啟動後）執行 `BOOT.md`。

**事件**： `gateway:startup`

**啟用**：

```bash
openclaw hooks enable boot-md
```

**請參閱：** [boot-md 文件](/zh-Hant/automation/hooks#boot-md)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
