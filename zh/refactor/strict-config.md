---
summary: "严格配置验证 + 仅 doctor 的迁移"
read_when:
  - 设计或实现配置验证行为
  - 处理配置迁移或 doctor 工作流
  - 处理插件配置架构或插件加载控制
title: "严格配置验证"
---

# 严格配置验证（仅 doctor 的迁移）

## 目标

- **在任何地方拒绝未知的配置键**（根级别 + 嵌套），根级别 `$schema` 元数据除外。
- **拒绝没有架构的插件配置**；不加载该插件。
- **移除加载时的旧版自动迁移**；迁移仅通过 doctor 运行。
- **启动时自动运行 doctor（试运行）**；如果无效，阻止非诊断命令。

## 非目标

- 加载时的向后兼容性（旧键不会自动迁移）。
- 静默丢弃无法识别的键。

## 严格验证规则

- 配置必须在每个级别完全匹配架构。
- 未知的键是验证错误（根级别或嵌套时不允许通过），除非根 `$schema` 是字符串。
- `plugins.entries.<id>.config` 必须由插件的架构验证。
  - 如果插件缺少架构，**拒绝插件加载**并显示明确的错误。
- 未知的 `channels.<id>` 键是错误，除非插件清单声明了渠道 id。
- 插件清单（`openclaw.plugin.json`）是所有插件必需的。

## 插件架构强制执行

- 每个插件为其配置提供一个严格的 JSON Schema（内嵌在清单中）。
- 插件加载流程：
  1. 解析插件清单 + 架构（`openclaw.plugin.json`）。
  2. 根据架构验证配置。
  3. 如果缺少架构或配置无效：阻止插件加载，记录错误。
- 错误信息包括：
  - 插件 id
  - 原因（缺少架构 / 配置无效）
  - 验证失败的路径
- 已禁用的插件保留其配置，但 Doctor + 日志会显示警告。

## Doctor 流程

- Doctor 在每次加载配置时**都会运行**（默认为试运行）。
- 如果配置无效：
  - 打印摘要 + 可操作的错误。
  - 指示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 应用迁移。
  - 删除未知的键。
  - 写入更新后的配置。

## 命令控制（当配置无效时）

允许（仅诊断）：

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他所有操作必须硬失败，并提示：“Config invalid. Run `openclaw doctor --fix`.”

## 错误 UX 格式

- 单个摘要标题。
- 分组部分：
  - 未知键（完整路径）
  - 旧版键 / 需要迁移
  - 插件加载失败（插件 ID + 原因 + 路径）

## 实现接触点

- `src/config/zod-schema.ts`：移除根透传；所有位置使用严格对象。
- `src/config/zod-schema.providers.ts`：确保严格渠道架构。
- `src/config/validation.ts`：遇到未知键时失败；不应用旧版迁移。
- `src/config/io.ts`：移除旧版自动迁移；始终运行 doctor 试运行。
- `src/config/legacy*.ts`：将使用范围移至仅 doctor。
- `src/plugins/*`：添加架构注册表 + 命令拦截。
- 在 `src/cli` 中进行 CLI 命令拦截。

## 测试

- 未知键拒绝（根 + 嵌套）。
- 插件缺少架构 → 插件加载被阻止，并显示明确错误。
- 配置无效 → 网关启动被阻止，诊断命令除外。
- Doctor 自动试运行；`doctor --fix` 写入更正后的配置。

import zh from "/components/footer/zh.mdx";

<zh />
