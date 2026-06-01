---
summary: "CLI 參考 `openclaw skills` (search/install/update/verify/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to verify a ClawHub skill with ClawHub
  - You want to debug missing binaries/env/config for skills
title: "技能"
---

# `openclaw skills`

檢查本地技能、搜尋 ClawHub、從 ClawHub/Git/本機目錄安裝技能、驗證 ClawHub 技能，以及更新 ClawHub 追蹤的安裝。

相關：

- 技能系統：[技能](/zh-Hant/tools/skills)
- 技能配置：[技能配置](/zh-Hant/tools/skills-config)
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
openclaw skills verify <slug>
openclaw skills verify <slug> --version <version>
openclaw skills verify <slug> --tag <tag>
openclaw skills verify <slug> --card
openclaw skills verify <slug> --global
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

`search`、`update` 和 `verify` 直接使用 ClawHub。`install <slug>` 安裝
ClawHub 技能，`install git:owner/repo[@ref]` 複製 Git 技能，而
`install ./path` 複製本機技能目錄。預設情況下，`install`、`update`
和 `verify` 以作用中的工作區 `skills/` 目錄為目標；加上 `--global` 時，
它們則以共享的受管理技能目錄為目標。`list`/`info`/`check` 仍然
會檢查目前工作區和配置可見的本機技能。
支援工作區的指令會先從 `--agent <id>` 解析目標工作區，接著
在目前工作目錄位於已配置的代理程式工作區內時使用該目錄，然後才是預設代理程式。

Git 和本機目錄安裝預期來源根目錄中有 `SKILL.md`。安裝
的 slug 來自 `SKILL.md` 前置資料 `name` (當其有效時)，接著是
來源目錄或儲存庫名稱；請使用 `--as <slug>` 加以覆寫。`--version`
僅限 ClawHub。技能安裝不支援 npm 套件規格或 zip/封存
路徑，且 `openclaw skills update` 僅更新 ClawHub 追蹤的安裝。

從入門或技能設定觸發的閘道支援技能相依性安裝，改用獨立的 `skills.install` 要求路徑。

備註：

- `search [query...]` 接受選用查詢；省略它以瀏覽預設的
  ClawHub 搜尋摘要。
- `search --limit <n>` 限制傳回的結果。
- `install git:owner/repo[@ref]` 安裝 Git 技能。Branch 參照可能包含
  斜線，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安裝一個本機目錄，其根目錄包含
  `SKILL.md`。
- `install --as <slug>` 覆寫 Git 和本機目錄
  安裝的推斷 slug。
- `install --version <version>` 僅適用於 ClawHub 技能 slug。
- `install --force` 覆寫相同 slug 的現有工作區技能資料夾。
- `--global` 以共享管理技能目錄為目標，且無法與
  `--agent <id>` 結合使用。
- `--agent <id>` 以其中一個設定的代理程式工作區為目標，並覆寫目前
  工作目錄的推斷結果。
- `update <slug>` 更新單一追蹤的技能。新增 `--global` 以針對
  共享管理技能目錄而非工作區。
- `update --all` 更新所選工作區中追蹤的 ClawHub 安裝項目，或在與 `--global` 結合時更新
  共享管理技能目錄中的安裝項目。
- `verify <slug>` 預設會列印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。沒有 `--json` 標誌，因為 JSON 已經是預設值。
- `verify` 針對已安裝的 ClawHub 技能使用 `.clawhub/origin.json`，因此它會
  根據來源登錄檔驗證已安裝的版本。`--version`
  和 `--tag` 會覆寫版本選擇器，但在存在來源中繼資料時會保留該已安裝的登錄檔。
- `verify --card` 列印產生的技能卡 Markdown 而非 JSON。當 ClawHub 傳回 `ok: false` 或 `decision: "fail"` 時，
  指令會以非零值結束；除非 ClawHub 政策變更，否則未簽署的簽章僅供參考。
- 已安裝的 ClawHub 套件組合可以包含產生的 `skill-card.md`。OpenClaw
  將驗證視為 ClawHub 伺服器的決定，且不會僅因該產生的卡片變更了套件組合
  指紋而拒絕已安裝的技能。
- `check --agent <id>` 會檢查所選代理的工作區，並報告哪些
  就緒的技能實際上對該代理的提示詞或命令介面可見。
- `list` 是未提供子命令時的預設操作。
- `list`、`info` 和 `check` 會將其渲染輸出寫入 stdout。對於
  `--json`，這意味著機器可讀的承載會保留在 stdout 上，以便透過管道
  和腳本處理。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [技能](/zh-Hant/tools/skills)
