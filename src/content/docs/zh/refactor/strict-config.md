---
summary: "严格配置验证 + 仅限 doctor 的迁移"
read_when:
  - Designing or implementing config validation behavior
  - Working on config migrations or doctor workflows
  - Handling plugin config schemas or plugin load gating
title: "严格配置验证"
---

# 严格配置验证 (仅限 Doctor 的迁移)

## 目标

- **在各处拒绝未知的配置键**（根目录 + 嵌套），根目录 `$schema` 元数据除外。
- **拒绝没有架构的插件配置**；不要加载该插件。
- **移除加载时的旧版自动迁移**；迁移仅通过 Doctor 运行。
- **启动时自动运行 Doctor (试运行)**；如果无效，则阻止非诊断命令。

## 非目标

- 加载时的向后兼容性（旧版键不会自动迁移）。
- 静默丢弃无法识别的键。

## 严格验证规则

- 配置必须在每个级别上与架构完全匹配。
- 未知的键是验证错误（根目录或嵌套处不传递），除非根目录 `$schema` 是字符串。
- `plugins.entries.<id>.config` 必须由插件的 schema 验证。
  - 如果插件缺少 schema，**拒绝加载插件** 并显示清晰的错误。
- 未知的 `channels.<id>` 键是错误，除非插件清单声明了频道 ID。
- 所有插件都需要插件清单 (`openclaw.plugin.json`)。

## 插件架构强制

- 每个插件为其配置提供严格的 JSON Schema（内联在清单中）。
- 插件加载流程：
  1. 解析插件清单 + schema (`openclaw.plugin.json`)。
  2. 根据 schema 验证配置。
  3. 如果缺少 schema 或配置无效：阻止插件加载，记录错误。
- 错误信息包括：
  - 插件 ID
  - 原因（缺少 schema / 配置无效）
  - 验证失败的路径
- 被禁用的插件保留其配置，但 Doctor + 日志会显示警告。

## Doctor 流程

- Doctor 在每次加载配置时**都会运行**（默认为试运行）。
- 如果配置无效：
  - 打印摘要和可操作的错误。
  - 指示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 应用迁移。
  - 删除未知的键。
  - 写入更新后的配置。

## 命令限制（当配置无效时）

允许（仅限诊断）：

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有内容必须硬失败并提示：“Config invalid. Run `openclaw doctor --fix`。”

## 错误 UX 格式

- 单个摘要标题。
- 分组部分：
  - 未知的键（完整路径）
  - 旧版键 / 需要迁移
  - 插件加载失败（插件 ID + 原因 + 路径）

## 实现接触点

- `src/config/zod-schema.ts`：移除根透传；随处使用严格对象。
- `src/config/zod-schema.providers.ts`：确保严格的渠道 schema。
- `src/config/validation.ts`：遇到未知键时失败；不应用旧版迁移。
- `src/config/io.ts`：移除旧版自动迁移；始终运行 doctor 试运行。
- `src/config/legacy*.ts`：将使用范围移至仅限 doctor。
- `src/plugins/*`：添加 schema 注册表 + 限制。
- CLI 命令门控位于 `src/cli`。

## 测试

- 未知键拒绝（根 + 嵌套）。
- 插件缺少 schema → 插件加载被阻止，并显示清晰的错误。
- 配置无效 → 网关启动被阻止，诊断命令除外。
- Doctor 干运行自动；`doctor --fix` 写入修正后的配置。
