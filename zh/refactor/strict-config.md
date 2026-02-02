> [!NOTE]
> 本页正在翻译中。

---
summary: "严格配置校验 + 仅 doctor 迁移"
read_when:
  - 设计或实现配置校验行为
  - 处理配置迁移或 doctor 工作流
  - 处理插件配置 schema 或插件加载门控
---
# 严格配置校验（仅 doctor 迁移）

## 目标
- **拒绝所有未知配置键**（根与嵌套）。
- **拒绝没有 schema 的插件配置**；不加载该插件。
- **移除加载时的自动迁移**；迁移仅通过 doctor 运行。
- **启动时自动运行 doctor（dry-run）**；若无效，阻止非诊断命令。

## 非目标
- 加载时向后兼容（旧键不会自动迁移）。
- 静默丢弃未知键。

## 严格校验规则
- 配置必须在每一层都精确匹配 schema。
- 未知键即校验错误（根与嵌套均不透传）。
- `plugins.entries.<id>.config` 必须由插件 schema 校验。
  - 若插件缺少 schema，**拒绝加载插件** 并给出明确错误。
- 未知 `channels.<id>` 键为错误，除非插件清单声明了该频道 id。
- 所有插件必须提供 `openclaw.plugin.json` 清单。

## 插件 schema 强制
- 每个插件都要提供严格的 JSON Schema（清单内联）。
- 插件加载流程：
  1) 解析插件清单 + schema（`openclaw.plugin.json`）。
  2) 用 schema 校验配置。
  3) 若缺失 schema 或配置无效：阻止插件加载并记录错误。
- 错误信息包含：
  - 插件 id
  - 原因（缺失 schema / 配置无效）
  - 失败路径
- 被禁用的插件保留其配置，但 Doctor + 日志会提示 warning。

## Doctor 流程
- 每次加载配置都会运行 **doctor**（默认 dry-run）。
- 若配置无效：
  - 打印摘要 + 可执行错误。
  - 提示：`openclaw doctor --fix`。
- `openclaw doctor --fix`：
  - 应用迁移。
  - 移除未知键。
  - 写回更新后的配置。

## 命令门控（配置无效时）
允许（仅诊断）：
- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

其他命令必须硬失败："Config invalid. Run `openclaw doctor --fix`."

## 错误 UX 格式
- 单一摘要头。
- 分组区块：
  - 未知键（完整路径）
  - 旧键 / 需要迁移
  - 插件加载失败（插件 id + 原因 + 路径）

## 实现触点
- `src/config/zod-schema.ts`：移除 root passthrough；全量 strict。
- `src/config/zod-schema.providers.ts`：确保频道 schema 严格。
- `src/config/validation.ts`：未知键失败；不应用旧迁移。
- `src/config/io.ts`：移除加载时自动迁移；始终运行 doctor dry-run。
- `src/config/legacy*.ts`：仅 doctor 使用。
- `src/plugins/*`：增加 schema 注册 + 门控。
- CLI 命令门控在 `src/cli`。

## 测试
- 未知键拒绝（根 + 嵌套）。
- 插件缺少 schema → 阻止插件加载且给出明确错误。
- 配置无效 → gateway 启动阻止（仅允许诊断命令）。
- Doctor dry-run 自动；`doctor --fix` 写回修正配置。
