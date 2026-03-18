---
summary: "Strict config validation + doctor-only migrations"
read_when:
  - Designing or implementing config validation behavior
  - Working on config migrations or doctor workflows
  - Handling plugin config schemas or plugin load gating
title: "Strict Config Validation"
---

# Strict config validation (doctor-only migrations)

## Goals

- **Reject unknown config keys everywhere** (root + nested), except root `$schema` metadata.
- **Reject plugin config without a schema**; don’t load that plugin.
- **Remove legacy auto-migration on load**; migrations run via doctor only.
- **Auto-run doctor (dry-run) on startup**; if invalid, block non-diagnostic commands.

## Non-goals

- Backward compatibility on load (legacy keys do not auto-migrate).
- Silent drops of unrecognized keys.

## Strict validation rules

- Config must match the schema exactly at every level.
- Unknown keys are validation errors (no passthrough at root or nested), except root `$schema` when it is a string.
- `plugins.entries.<id>.config` must be validated by the plugin’s schema.
  - If a plugin lacks a schema, **reject plugin load** and surface a clear error.
- Unknown `channels.<id>` keys are errors unless a plugin manifest declares the channel id.
- Plugin manifests (`openclaw.plugin.json`) are required for all plugins.

## Plugin schema enforcement

- Each plugin provides a strict JSON Schema for its config (inline in the manifest).
- Plugin load flow:
  1. Resolve plugin manifest + schema (`openclaw.plugin.json`).
  2. Validate config against the schema.
  3. If missing schema or invalid config: block plugin load, record error.
- Error message includes:
  - Plugin id
  - Reason (missing schema / invalid config)
  - Path(s) that failed validation
- Disabled plugins keep their config, but Doctor + logs surface a warning.

## Doctor flow

- Doctor runs **every time** config is loaded (dry-run by default).
- If config invalid:
  - Print a summary + actionable errors.
  - Instruct: `openclaw doctor --fix`.
- `openclaw doctor --fix`:
  - Applies migrations.
  - Removes unknown keys.
  - Writes updated config.

## Command gating (when config is invalid)

Allowed (diagnostic-only):

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有操作必須強制失敗並顯示：“Config invalid. Run `openclaw doctor --fix`”。

## 錯誤 UX 格式

- 單一摘要標頭。
- 分組部分：
  - 未知金鑰（完整路徑）
  - 舊版金鑰 / 需要遷移
  - 外掛程式載入失敗（外掛程式 ID + 原因 + 路徑）

## 實作接觸點

- `src/config/zod-schema.ts`：移除根層級直通；全面使用嚴格物件。
- `src/config/zod-schema.providers.ts`：確保嚴格的通道 Schema。
- `src/config/validation.ts`：遇到未知金鑰時失敗；不要套用舊版遷移。
- `src/config/io.ts`：移除舊版自動遷移；總是執行 doctor dry-run。
- `src/config/legacy*.ts`：將使用僅限於 doctor。
- `src/plugins/*`：新增 Schema 註冊表 + 閘道。
- `src/cli` 中的 CLI 指令閘道。

## 測試

- 未知金鑰拒絕（根層級 + 巢狀）。
- 外掛程式缺少 Schema → 阻止外掛程式載入並顯示明確錯誤。
- 無效設定 → 阻止閘道啟動，診斷指令除外。
- Doctor 自動 dry-run；`doctor --fix` 寫入更正後的設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
