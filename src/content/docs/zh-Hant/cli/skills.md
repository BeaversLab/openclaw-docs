---
summary: "`openclaw skills` (search/install/update/verify/list/info/check/workshop) 的 CLI 參考"
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
openclaw skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Not reusable"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`、`update` 和 `verify` 直接使用 ClawHub。`install <slug>` 安裝 ClawHub 技能，`install git:owner/repo[@ref]` 複製 Git 技能，而 `install ./path` 複製本機技能目錄。根據預設，`install`、`update` 和 `verify` 以啟用的工作區 `skills/` 目錄為目標；若加上 `--global`，則以共享管理技能目錄為目標。`list`/`info`/`check` 仍然會檢查目前工作區和設定可見的本機技能。工作區支援的命令會從 `--agent <id>` 解析目標工作區，接著是當它位於已設定的代理程式工作區內時的目前工作目錄，然後是預設代理程式。

Git 和本機目錄安裝預期來源根目錄中有 `SKILL.md`。安裝 slug 來自 `SKILL.md` frontmatter `name`（當它有效時），接著是來源目錄或儲存庫名稱；使用 `--as <slug>` 來覆寫它。`--version` 僅限 ClawHub。技能安裝不支援 npm 套件規格或 zip/archive 路徑，且 `openclaw skills update` 僅更新 ClawHub 追蹤的安裝。

從入門或技能設定觸發的閘道支援技能相依性安裝，改用個別的 `skills.install` 要求路徑。

備註：

- `search [query...]` 接受選用查詢；省略它以瀏覽預設的 ClawHub 搜尋摘要。
- `search --limit <n>` 限制傳回的結果。
- `install git:owner/repo[@ref]` 安裝 Git 技能。分支參照可能包含
  斜線，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安裝根目錄包含
  `SKILL.md` 的本機目錄。
- `install --as <slug>` 覆寫 Git 和本機目錄
  安裝推斷的 slug。
- `install --version <version>` 僅適用於 ClawHub 技能 slug。
- `install --force` 覆寫相同
  slug 的現有工作區技能資料夾。
- `--global` 指向共用的受管理技能目錄，且不能與
  `--agent <id>` 結合使用。
- `--agent <id>` 指向一個設定的代理程式工作區，並覆寫目前
  工作目錄的推斷。
- `update <slug>` 更新單一追蹤的技能。加入 `--global` 以指向
  共用的受管理技能目錄，而非工作區。
- `update --all` 更新所選工作區中已追蹤的 ClawHub 安裝項，當
  與 `--global` 結合時則更新共用的受管理技能目錄。
- `verify <slug>` 預設會列印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。沒有
  `--json` 標誌，因為 JSON 已經是預設值。
- `verify` 針對已安裝的 ClawHub 技能使用 `.clawhub/origin.json`，因此
  它會根據來源登錄檔驗證已安裝的版本。`--version`
  和 `--tag` 會覆寫版本選擇器，但在存在來源中繼資料時會保留該已安裝的登錄檔。
- `verify --card` 列印產生的技能卡片 Markdown 而非 JSON。當 ClawHub 傳回
  `ok: false` 或 `decision: "fail"` 時，指令會以非零狀態碼結束；
  除非 ClawHub 政策變更，否則未簽署的簽章僅供參考。
- 已安裝的 ClawHub 套件可以包含產生的 `skill-card.md`。OpenClaw
  將驗證視為 ClawHub 伺服器的決策，不僅因為該產生的卡片變更了
  套件指紋就拒絕已安裝的技能。
- `check --agent <id>` 會檢查所選代理程式的工作區，並報告哪些就緒的技能實際上對該代理程式的提示或指令介面可見。
- `list` 是未提供子指令時的預設動作。
- `list`、`info` 和 `check` 會將其輸出結果寫入標準輸出。若使用 `--json`，這意味著機器可讀的酬載會保留在標準輸出中，以供管道和腳本使用。

## 技能工作室提案

`openclaw skills workshop` 管理所選工作區中的待處理技能提案。提案是 `<OPENCLAW_STATE_DIR>/skill-workshop/proposals/` 下的持久化 OpenClaw 狀態；在應用之前，它們不是活動的技能。預設狀態目錄是 `~/.openclaw`。提案內容遵守 `skills.workshop.maxSkillBytes`，且提案描述上限為 160 位元組，因為它們可能出現在探索和列表輸出中。

從草稿 markdown 檔案建立提案：

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
```

或從完整的草稿技能目錄建立提案：

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
```

透過相同的待處理路徑更新現有的工作區技能：

```bash
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
```

在批准前修訂待處理的提案：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

提供的草稿會儲存為 `PROPOSAL.md`，並帶有僅限提案的前置元數據：

```markdown
---
name: qa-check
description: Repeatable QA checklist
status: proposal
version: v1
date: "2026-05-30T00:00:00.000Z"
---
```

應用提案會將活動的 `SKILL.md` 寫入工作區 `skills/` 根目錄，從前置元數據中移除 `status`、提案 `version` 和提案 `date`，掃描草稿，寫入回滾元數據，並在目標技能於提案建立後變更時拒絕過時的更新。

使用 `--proposal-dir` 時，目錄必須包含 `PROPOSAL.md`。支援檔案可以包含在 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。OpenClaw 會將支援檔案與提案一起儲存，掃描它們，在應用前驗證其雜湊值，並僅在提案應用後將它們寫在活動的 `SKILL.md` 旁邊。

當使用者要求捕捉可重複使用的工作時，代理可以透過 `skill_workshop` 工具建立、修訂、列出及檢視待處理的提案。從持久對話訊號自動捕捉提案的功能預設為關閉，並可透過 `skills.workshop.autonomous.enabled` 啟用。如果使用者明確要求批准/使用/套用、拒絕或隔離特定提案，`skill_workshop` 也可以透過相同的技能工作坊防護措施執行該提案生命週期動作。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [技能](/zh-Hant/tools/skills)
