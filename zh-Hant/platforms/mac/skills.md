---
summary: "macOS 技能設定 UI 與閘道支援狀態"
read_when:
  - 更新 macOS 技能設定 UI
  - 變更技能啟動條件或安裝行為
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 應用程式透過閘道顯示 OpenClaw 技能；它不會在本機解析技能。

## 資料來源

- `skills.status` (gateway) 會傳回所有技能以及資格條件與缺少的需求項目
  (包括bundled skills的allowlist區塊)。
- 需求項目衍生自每個 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安裝動作

- `metadata.openclaw.install` 定義安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install`，以在閘道主機上執行安裝程式。
- 當提供多個安裝程式時，閘道只會顯示一個首選的安裝程式
  (如果有 brew 則優先使用，否則使用來自 `skills.install` 的 node 管理員，預設為 npm)。

## 環境變數/API 金鑰

- 應用程式會將金鑰儲存在 `~/.openclaw/openclaw.json` 下的 `skills.entries.<skillKey>` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝與設定更新會在閘道主機上執行（而非在本機 Mac 上）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
