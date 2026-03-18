---
summary: "macOS Skills 設定 UI 與閘道支援狀態"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills"
---

# Skills (macOS)

macOS 應用程式透過閘道呈現 OpenClaw 技能；它不會在本地解析技能。

## 資料來源

- `skills.status` (gateway) 會傳回所有技能以及資格條件和遺漏的需求
  (包括套件技能的允許清單區塊)。
- 需求是從每個 `SKILL.md` 中的 `metadata.openclaw.requires` 衍生而來。

## 安裝動作

- `metadata.openclaw.install` 定義了安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install` 以在閘道主機上執行安裝程式。
- 當提供多個安裝程式時，閘道只會呈現一個首選安裝程式
  (若有 brew 則用 brew，否則使用 `skills.install` 的 node manager，預設為 npm)。

## Env/API 金鑰

- 應用程式會將金鑰儲存在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝和設定更新會在閘道主機上進行 (而非在本機 Mac 上)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
