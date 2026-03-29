---
summary: "macOS Skills 設定 UI 與閘道支援的狀態"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 應用程式透過閘道顯示 OpenClaw 技能；它不會在本機解析技能。

## 資料來源

- `skills.status` (gateway) 會傳回所有技能以及資格與缺少的需求
  (包括捆綁技能的許可清單區塊)。
- 需求衍生自每個 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安裝動作

- `metadata.openclaw.install` 定義安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install` 在閘道主機上執行安裝程式。
- 當提供多個安裝程式時，閘道只會顯示一個偏好的安裝程式
  (可用時為 brew，否則為 `skills.install` 的 node manager，預設為 npm)。

## 環境變數/API 金鑰

- 應用程式將金鑰儲存在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝與設定更新會在閘道主機上進行 (而非在本機 Mac 上)。
