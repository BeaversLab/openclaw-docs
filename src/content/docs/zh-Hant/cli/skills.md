---
summary: " `openclaw skills`（搜尋/安裝/更新/列表/資訊/檢查）的 CLI 參考"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `openclaw skills`

檢查本地技能並從 ClawHub 安裝/更新技能。

相關：

- 技能系統：[Skills](/en/tools/skills)
- 技能設定：[Skills config](/en/tools/skills-config)
- ClawHub 安裝：[ClawHub](/en/tools/clawhub)

## 指令

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` 直接使用 ClawHub 並安裝到目前啟用的工作區 `skills/` 目錄中。`list`/`info`/`check` 則仍會檢查目前工作區和設定可見的本地技能。

此 CLI `install` 指令會從 ClawHub 下載技能資料夾。由入門導覽或技能設定觸發的 Gateway 支援技能相依性安裝，則是使用獨立的 `skills.install` 請求路徑。
