---
summary: "ClawHub CLI 用於探索、安裝、發布和驗證 OpenClaw 技能和外掛的進入點。"
read_when:
  - You want to use ClawHub from the command line
  - You want to install ClawHub skills or plugins through OpenClaw
  - You want to publish ClawHub packages
title: "ClawHub CLI"
---

# ClawHub CLI

OpenClaw 有兩個用於 ClawHub 的命令列進入點：

- `openclaw skills` 和 `openclaw plugins` 在 OpenClaw 內安裝和管理 ClawHub 套件。
- 獨立 `clawhub` CLI 處理發布者工作流程，例如登入、發布、傳輸和同步。

## 探索與安裝

當您想要為本機 OpenClaw 代理程式或閘道安裝或更新套件時，請使用 OpenClaw 命令。

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills update <slug>
openclaw skills verify <slug>

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update <id-or-npm-spec>
```

技能安裝預設以作用中的工作區 `skills/` 目錄為目標。加入 `--global` 以安裝到共用的受管理技能目錄。

當您想要使用 ClawHub 解析而非 npm 或其他安裝來源時，外掛安裝會使用 `clawhub:` 前綴。

## 發布與維護

安裝獨立 ClawHub CLI 以進行發布者工作流程：

```bash
npm i -g clawhub
clawhub login
```

使用 `clawhub package publish` 發布外掛套件：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

使用 `clawhub skill publish` 發布技能資料夾：

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0
```

當本機技能掃描狀態或套件擁有權需要維護時，請使用相關的獨立命令：

```bash
clawhub sync --all
clawhub package transfer @old-owner/package --to new-owner
```

## 相關主題

- [`openclaw skills`](/zh-Hant/cli/skills) - 本機技能搜尋、安裝、更新和驗證
- [`openclaw plugins`](/zh-Hant/cli/plugins) - 外掛搜尋、安裝、更新和檢查
- [ClawHub 發布](/zh-Hant/clawhub/publishing) - 擁有者範圍、發布驗證和審查流程
- [建立技能](/zh-Hant/tools/creating-skills) - 技能撰寫和發布流程
- [建置外掛](/zh-Hant/plugins/building-plugins) - 外掛套件撰寫
