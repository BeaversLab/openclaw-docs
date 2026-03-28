---
summary: "macOS 技能設定 UI 與閘道備援狀態"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 應用程式透過閘道呈現 OpenClaw 技能；它不會在本地解析技能。

## 資料來源

- `skills.status` (閘道) 會傳回所有技能以及資格與缺失需求
  (包括套件技能的允許清單區塊)。
- 需求來自於每個 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安裝動作

- `metadata.openclaw.install` 定義安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install` 以在閘道主機上執行安裝程式。
- 當提供多個安裝程式時，閘道只會顯示一個首選安裝程式
  （可用時為 brew，否則為來自 `skills.install` 的 node 管理程式，預設為 npm）。

## Env/API 金鑰

- 應用程式將金鑰儲存在 `~/.openclaw/openclaw.json` 下的 `skills.entries.<skillKey>` 中。
- `skills.update` 修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝和組態更新會在閘道主機上進行（而非在本機 Mac 上）。
