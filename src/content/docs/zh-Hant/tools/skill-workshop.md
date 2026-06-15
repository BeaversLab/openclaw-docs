---
summary: "透過 Skill Workshop 審查建立和更新工作區技能"
read_when:
  - You want the agent to create or update a skill from chat
  - You need to review, apply, reject, or quarantine a generated skill draft
  - You are configuring Skill Workshop approval, autonomy, storage, or limits
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop 是 OpenClaw 用於建立和更新工作區技能的受管路徑。

代理和操作員不會直接透過此路徑撰寫現有的 `SKILL.md` 檔案。他們會先建立一個 **提案**。提案是一個待決的草稿，其中包含建議的技能內容、目標綁定、掃描器狀態、雜湊值、支援檔案元資料和回滾元資料。只有在套用後，它才會變成現用技能。

Skill Workshop 僅撰寫工作區技能。它不會修改捆綁、外掛、ClawHub、額外根目錄、受管理、個人代理或系統技能。

## 運作方式

- **提案優先：** 產生的技能內容會儲存為 `PROPOSAL.md`，而不是 `SKILL.md`。
- **套用是唯一的即時寫入：** create、update 和 revise 不會變更現用技能。
- **工作區範圍：** 建立操作以工作區 `skills/` 根目錄為目標。僅允許更新可寫入的工作區技能。
- **無覆寫：** 如果目標技能已存在，create 操作會失敗。
- **雜湊綁定：** 更新提案會綁定到目前的目標雜湊值，如果在套用前現用技能發生變更，提案會變成過期。
- **掃描器閘道：** 套用會在寫入前重新執行掃描。
- **可復原：** 套用會在變更即時檔案之前寫入回滾元資料。
- **一致的介面：** 聊天、CLI 和 Gateway 都呼叫相同的 Skill Workshop 服務。

## 生命週期

```text
create/update -> pending
revise        -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

只有 `pending` 提案可以被修訂、套用、拒絕或隔離。

## 聊天

向代理索取您想要的技能。代理會呼叫 `skill_workshop` 並傳回提案 ID。

建立：

```text
Make a skill called morning-catchup that runs my Monday inbox routine.
```

更新現有的工作區技能：

```text
Update trip-planning to also check seat maps before booking.
```

針對待決提案進行迭代：

```text
Show me the morning-catchup proposal.
Revise it to also flag anything marked urgent.
Apply the morning-catchup proposal.
```

根據預設，代理發起的 `apply`、`reject` 和 `quarantine` 在執行前會顯示批准提示。將 `skills.workshop.approvalPolicy` 設為 `"auto"` 以跳過受信任環境的提示。

## CLI

建立新的技能提案：

```bash
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "Daily inbox catch-up: triage, archive, surface, draft, plan" \
  --proposal ./PROPOSAL.md
```

為現有工作區技能建立更新提案：

```bash
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md
```

列出並檢視：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
```

在批准前修訂：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

結束提案：

```bash
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## 提案內容

在待處理期間，提案會以 `PROPOSAL.md` 形式儲存，並包含僅限提案的前置元資料：

```markdown
---
name: "morning-catchup"
description: "Daily inbox catch-up: triage, archive, surface, draft, plan"
status: proposal
version: "v1"
date: "2026-05-30T00:00:00.000Z"
---
```

在套用時，Skill Workshop 會寫入現用的 `SKILL.md` 並移除僅限提案的欄位：`status`、提案 `version` 和提案 `date`。

## 支援檔案

當提議的技能需要 `PROPOSAL.md` 以外的檔案時，請使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "Friday wrap-up: stats, highlights, next week's top three" \
  --proposal-dir ./weekly-update-proposal
```

目錄必須包含 `PROPOSAL.md`。支援檔案必須位於：

- `assets/`
- `examples/`
- `references/`
- `scripts/`
- `templates/`

Skill Workshop 會掃描、雜湊並與提案一起儲存支援檔案。它們只有在套用時才會被寫入到現用的 `SKILL.md` 旁邊。

被拒絕的支援檔案路徑包括絕對路徑、隱藏路徑區段、路徑遍歷、重疊路徑、來自提案目錄的可執行檔、非 UTF-8 文字、空位元組，以及位於標準支援資料夾之外的檔案。

## 代理程式工具

模型使用 `skill_workshop`：

```text
action: create | update | revise | list | inspect | apply | reject | quarantine
```

代理程式必須使用 `skill_workshop` 進行產生的技能工作。它們不得透過 `write`、`edit`、`exec`、Shell 指令或直接檔案系統操作來建立或變更提案檔案。

## 批准與自主性

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

- `autonomous.enabled`：允許 OpenClaw 在成功的回合後，從持久的對話訊號建立待處理提案。預設值：`false`。
- `approvalPolicy: "pending"`：在代理程式發起的 `apply`、`reject` 或 `quarantine` 之前需要批准提示。
- `approvalPolicy: "auto"`：略過該批准提示。代理程式仍須呼叫該動作。
- `maxPending`：限制每個工作區的待處理和隔離提案數量。
- `maxSkillBytes`：限制提案主體大小。預設值：`40000`。

提案描述始終限制為 160 位元組。

## 閘道方法

```text
skills.proposals.list
skills.proposals.inspect
skills.proposals.create
skills.proposals.update
skills.proposals.revise
skills.proposals.apply
skills.proposals.reject
skills.proposals.quarantine
```

唯讀方法需要 `operator.read`。變異方法需要
`operator.admin`。

## 儲存空間

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    rollback.json
    assets/
    examples/
    references/
    scripts/
    templates/
```

預設狀態目錄：`~/.openclaw`。

- `proposal.json`：標準提案記錄。
- `proposals.json`：快速列表索引，可從提案資料夾重建。
- `PROPOSAL.md`：待處理的技能提案。
- `rollback.json`：在變更即時檔案套用之前寫入的復原中繼資料。

## 限制

- 描述：160 位元組。
- 提案主體：`skills.workshop.maxSkillBytes`（預設 40,000）。
- 支援檔案：每個提案 64 個。
- 支援檔案大小：每個 256 KB，總共 2 MB。
- 待處理和隔離的提案：每個工作區 `skills.workshop.maxPending`
  （預設 50）。

## 疑難排解

| 問題                                           | 解決方案                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | 將 `description` 縮短至 160 位元組或以下。                                            |
| `Skill proposal content is too large`          | 縮短提案主體或提高 `skills.workshop.maxSkillBytes`。                                  |
| `Target skill changed after proposal creation` | 根據目前目標修訂提案，或建立新提案。                                                  |
| `Proposal scan failed`                         | 檢查掃描器結果，然後修訂或隔離提案。                                                  |
| `Support file paths must be under one of...`   | 將支援檔案移至 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。 |
| 提案未顯示在列表中                             | 檢查選取的 `--agent` 工作區和 `OPENCLAW_STATE_DIR`。                                  |

## 相關

- [技能](/zh-Hant/tools/skills) 了解載入順序、優先順序和可見性
- [建立技能](/zh-Hant/tools/creating-skills) 了解手寫 `SKILL.md`
  基礎
- [技能設定](/zh-Hant/tools/skills-config) 了解完整的 `skills.workshop` 結構描述
- [Skills CLI](/zh-Hant/cli/skills) 了解 `openclaw skills` 指令
