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
- Skills 配置：[Skills config](/zh-Hant/tools/skills-config)
- ClawHub 安裝：[ClawHub](/zh-Hant/clawhub/cli)

## 指令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
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

`search`/`install`/`update` 直接使用 ClawHub。預設情況下，`install` 和
`update` 以作用中的工作區 `skills/` 目錄為目標；若使用 `--global`，則
以共用的受管理 skills 目錄為目標。`list`/`info`/`check` 仍會檢查
目前工作區和配置可見的本地 skills。工作區支援的指令會從 `--agent <id>` 解析目標工作區，
接著是目前工作目錄（當其位於已配置的 agent 工作區內時），然後是預設 agent。

此 CLI `install` 指令會從 ClawHub 下載 skills 資料夾。從入門或 Skills 設定觸發的 Gateway 支援 skill 相依性安裝，則改用
個別的 `skills.install` 要求路徑。

備註：

- `search [query...]` 接受選用查詢；省略即可瀏覽預設的
  ClawHub 搜尋摘要。
- `search --limit <n>` 限制傳回的結果。
- `install --force` 會覆寫相同 slug 的現有工作區 skills 資料夾。
- `--global` 以共用的受管理 skills 目錄為目標，且無法與
  `--agent <id>` 搭配使用。
- `--agent <id>` 以其中一個已配置的 agent 工作區為目標，並覆寫目前
  工作目錄的推斷結果。
- `update <slug>` 會更新單一已追蹤的 skill。加入 `--global` 可改以
  共用的受管理 skills 目錄為目標，而非工作區。
- `update --all` 會更新選定工作區中已追蹤的 ClawHub 安裝項目，若與 `--global` 搭配使用，則會更新
  共用的受管理 skills 目錄中的項目。
- `check --agent <id>` 會檢查選定 agent 的工作區，並回報
  哪些已就緒的 skills 實際上對該 agent 的提示或指令介面可見。
- 當未提供子指令時，`list` 是預設動作。
- `list`、`info` 和 `check` 會將其呈現輸出寫入 stdout。對於
  `--json`，這意味著機器可讀的 payload 會保留在 stdout 上，以便管道
  和腳本使用。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Skills](/zh-Hant/tools/skills)
