---
summary: " `openclaw skills`（搜尋/安裝/更新/列表/資訊/檢查）的 CLI 參考"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "技能"
---

# `openclaw skills`

檢查本地技能並從 ClawHub 安裝/更新技能。

相關：

- Skills 系統：[Skills](/zh-Hant/tools/skills)
- Skills 設定：[Skills config](/zh-Hant/tools/skills-config)
- ClawHub 安裝：[ClawHub](/zh-Hant/clawhub/cli)

## 指令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search`/`install`/`update` 直接使用 ClawHub 並安裝到目前的工作區 `skills/` 目錄。`list`/`info`/`check` 仍然會檢查目前工作區和設定可見的本機 skills。工作區支援的命令會從 `--agent <id>` 解析目標工作區，如果目前工作目錄位於已設定的 agent 工作區內，則使用該目錄，最後才使用預設的 agent。

此 CLI `install` 命令會從 ClawHub 下載 skill 資料夾。從入門 (onboarding) 或 Skills 設定觸發的閘道支援 skill 相依性安裝，則是改用另一個 `skills.install` 要求路徑。

備註：

- `search [query...]` 接受選用查詢；省略它以瀏覽預設的 ClawHub 搜尋動態訊息。
- `search --limit <n>` 限制傳回的結果。
- `install --force` 會覆寫相同 slug 的現有工作區 skill 資料夾。
- `--agent <id>` 以一個已設定的 agent 工作區為目標，並覆寫目前工作目錄的推斷結果。
- `update --all` 僅更新活躍工作區中已追蹤的 ClawHub 安裝項目。
- `check --agent <id>` 檢查所選 agent 的工作區，並回報哪些就緒的 skills 實際上可在該 agent 的提示或命令介面上看見。
- `list` 是未提供子命令時的預設動作。
- `list`、`info` 和 `check` 會將其轉譯輸出寫入 stdout。使用 `--json` 時，這表示機器可讀取的載荷會保留在 stdout 上，以便透過管道和腳本處理。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Skills](/zh-Hant/tools/skills)
