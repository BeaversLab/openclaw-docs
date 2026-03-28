---
summary: "`openclaw hooks`（代理 hooks）的 CLI 參考"
read_when:
  - You want to manage agent hooks
  - You want to install or update hooks
title: "hooks"
---

# `openclaw hooks`

管理代理 hooks（針對 `/new`、`/reset` 和 gateway 啟動等指令的事件驅動自動化）。

相關：

- Hooks：[Hooks](/zh-Hant/automation/hooks)
- Plugin hooks：[Plugin hooks](/zh-Hant/plugins/architecture#provider-runtime-hooks)

## 列出所有 Hooks

```exec
openclaw hooks list
```

列出工作區、受管和捆綁目錄中所有發現的 hooks。

**選項：**

- `--eligible`：僅顯示符合條件的 hooks（需求已滿足）
- `--json`：以 JSON 格式輸出
- `-v, --verbose`：顯示詳細資訊，包括缺失的需求

**範例輸出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
```

**範例（詳細模式）：**

```exec
openclaw hooks list --verbose
```

顯示不符合資格的掛鉤缺少的先決條件。

**範例 (JSON)：**

```exec
openclaw hooks list --json
```

傳回結構化的 JSON 以供程式設計使用。

## 取得掛鉤資訊

```exec
openclaw hooks info <name>
```

顯示關於特定掛鉤的詳細資訊。

**引數：**

- `<name>`：掛鉤名稱（例如 `session-memory`）

**選項：**

- `--json`：以 JSON 格式輸出

**範例：**

```exec
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

```exec
openclaw hooks check
```

顯示掛鉤資格狀態摘要（有多少已準備好與未準備好）。

**選項：**

- `--json`：以 JSON 格式輸出

**範例輸出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 啟用掛鉤

```exec
openclaw hooks enable <name>
```

透過將特定掛鉤新增至您的組態（`~/.openclaw/config.json`）來啟用它。

**注意：** 外掛程式管理的掛鉤在 `openclaw hooks list` 中會顯示為 `plugin:<id>`，
且無法在此啟用/停用。請改為啟用/停用外掛程式。

**引數：**

- `<name>`: Hook 名稱（例如 `session-memory`）

**範例：**

```exec
openclaw hooks enable session-memory
```

**輸出：**

```
✓ Enabled hook: 💾 session-memory
```

**作用：**

- 檢查 Hook 是否存在且符合資格
- 更新設定中的 `hooks.internal.entries.<name>.enabled = true`
- 將設定儲存至磁碟

**啟用後：**

- 重新啟動 gateway 以重新載入 hooks（在 macOS 上重新啟動選單列應用程式，或在開發中重新啟動您的 gateway 處理程序）。

## 停用 Hook

```exec
openclaw hooks disable <name>
```

透過更新設定來停用特定的 Hook。

**參數：**

- `<name>`: Hook 名稱（例如 `command-logger`）

**範例：**

```exec
openclaw hooks disable command-logger
```

**輸出：**

```
⏸ Disabled hook: 📝 command-logger
```

**停用後：**

- 重新啟動 gateway 以重新載入 hooks

## 安裝 Hooks

```exec
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

從本機資料夾/封存檔或 npm 安裝 hook 套件。

Npm 規格僅限於 **registry-only**（套件名稱 + 可選的 **確切版本** 或 **dist-tag**）。不接受 Git/URL/檔案規格和 semver 範圍。為了安全起見，相依性安裝會以 `--ignore-scripts` 執行。

純規格和 `@latest` 會保持在穩定版追蹤上。如果 npm 將這兩者解析為 pre-release，OpenClaw 會停止並要求您明確選擇加入，例如使用 `@beta`/`@rc` 這類 pre-release 標籤或確切的 pre-release 版本。

**作用：**

- 將 hook 套件複製到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中啟用已安裝的 hooks
- 在 `hooks.internal.installs` 下記錄安裝

**選項：**

- `-l, --link`：連結本機目錄而不是複製（將其加入 `hooks.internal.load.extraDirs`）
- `--pin`: 在 `hooks.internal.installs` 中將 npm 安裝記錄為確切的解析 `name@version`

**支援的壓縮檔：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**範例：**

```exec
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

```exec
openclaw hooks update <id>
openclaw hooks update --all
```

更新已安裝的 hook 套件（僅限 npm 安裝）。

**選項：**

- `--all`: 更新所有已追蹤的 hook 套件
- `--dry-run`: 顯示將會變更的內容而不實際寫入

當存在儲存的完整性雜湊值且擷取的檔案雜湊值發生變更時，OpenClaw 會列印警告並在繼續之前要求確認。請使用全域 `--yes` 在 CI/非互動式執行中略過提示。

## 內建 Hooks

### session-memory

當您發出 `/new` 時，將 session 內容儲存至記憶體。

**啟用：**

```exec
openclaw hooks enable session-memory
```

**輸出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**參閱：** [session-memory 文件](/zh-Hant/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期間注入額外的啟動檔案（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**啟用：**

```exec
openclaw hooks enable bootstrap-extra-files
```

**參閱：** [bootstrap-extra-files 文件](/zh-Hant/automation/hooks#bootstrap-extra-files)

### command-logger

將所有指令事件記錄到集中的稽核檔案中。

**啟用：**

```exec
openclaw hooks enable command-logger
```

**輸出：** `~/.openclaw/logs/commands.log`

**檢視記錄：**

```exec
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

**事件**：`gateway:startup`

**啟用**：

```exec
openclaw hooks enable boot-md
```

**參閱：** [boot-md 文件](/zh-Hant/automation/hooks#boot-md)
