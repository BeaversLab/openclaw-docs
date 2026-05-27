---
summary: " `openclaw skills`（搜尋/安裝/更新/列表/資訊/檢查）的 CLI 參考"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to debug missing binaries/env/config for skills
title: "技能"
---

# `openclaw skills`

檢視本機技能、搜尋 ClawHub、從 ClawHub/Git/本機目錄安裝技能，並更新
由 ClawHub 追蹤的安裝項。

相關：

- 技能系統：[技能](/zh-Hant/tools/skills)
- 技能設定：[技能設定](/zh-Hant/tools/skills-config)
- ClawHub 安裝：[ClawHub](/zh-Hant/clawhub/cli)

## 指令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
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

`search` 和 `update` 直接使用 ClawHub。`install <slug>` 安裝 ClawHub
技能，`install git:owner/repo[@ref]` 複製 Git 技能，而 `install ./path`
複製本機技能目錄。預設情況下，`install` 和 `update` 以
作用中工作區 `skills/` 目錄為目標；若使用 `--global`，則以
共用的受管理技能目錄為目標。`list`/`info`/`check` 仍會
檢視目前工作區和設定可見的本機技能。以工作區為基礎的指令會從
`--agent <id>` 解析目標工作區，若在已設定的代理工作區內，則使用
目前的工作目錄，最後才是預設代理。

Git 和本機目錄安裝預期來源根目錄中有 `SKILL.md`。安裝
名稱 來自 `SKILL.md` 前置資料 `name`（若有效），
然後是來源目錄或儲存庫名稱；請使用 `--as <slug>` 來覆寫它。
`--version` 僅限於 ClawHub。技能安裝不支援 npm 套件規格或
壓縮/封存路徑，且 `openclaw skills update` 僅更新由 ClawHub 追蹤的安裝項。

從入門或技能設定觸發、由閘道支援的技能相依性安裝，改用
個別的 `skills.install` 要求路徑。

備註：

- `search [query...]` 接受選用查詢；省略它以瀏覽預設的
  ClawHub 搜尋資訊流。
- `search --limit <n>` 限制傳回的結果。
- `install git:owner/repo[@ref]` 安裝 Git 技能。分支參照可能包含
  斜線，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 會安裝一個本地目錄，其根目錄包含
  `SKILL.md`。
- `install --as <slug>` 會覆蓋為 Git 和本地目錄
  安裝所推斷的 slug。
- `install --version <version>` 僅適用於 ClawHub 技能 slug。
- `install --force` 會覆蓋相同
  slug 的現有工作區技能資料夾。
- `--global` 以共享的受管技能目錄為目標，且無法與
  `--agent <id>` 結合使用。
- `--agent <id>` 以其中一個設定的代理程式工作區為目標，並覆蓋目前
  工作目錄的推斷結果。
- `update <slug>` 會更新單一已追蹤的技能。加入 `--global` 可改以
  共享的受管技能目錄為目標，而非工作區。
- `update --all` 會更新選定工作區中已追蹤的 ClawHub 安裝項目，或在與
  `--global` 結合時更新共享的受管技能目錄中的安裝項目。
- `check --agent <id>` 會檢查選定代理程式的工作區，並報告哪些
  就緒的技能實際上可見於該代理程式的提示或命令介面。
- `list` 是當未提供子指令時的預設動作。
- `list`、`info` 和 `check` 會將其輸出結果寫入 stdout。使用
  `--json` 時，這表示機器可讀取的內容會保留在 stdout 上，供管道和
  腳本使用。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [技能](/zh-Hant/tools/skills)
