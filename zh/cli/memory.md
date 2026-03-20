---
summary: "CLI 参考，用于 `openclaw memory` (status/index/search)"
read_when:
  - 您想要索引或搜索语义记忆
  - 您正在调试内存可用性或索引
title: "memory"
---

# `openclaw memory`

管理语义记忆索引和搜索。
由活动的 memory 插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 可禁用）。

相关内容：

- Memory 概念：[Memory](/zh/concepts/memory)
- 插件：[Plugins](/zh/tools/plugin)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

`memory status` 和 `memory index`：

- `--agent <id>`：将范围限定为单个 agent。如果没有此选项，这些命令将针对每个已配置的 agent 运行；如果未配置 agent 列表，它们将回退到默认 agent。
- `--verbose`：在探测和索引期间发出详细日志。

`memory status`：

- `--deep`：探测向量和 embedding 的可用性。
- `--index`：如果存储脏了则运行重新索引（隐含 `--deep`）。
- `--json`：打印 JSON 输出。

`memory index`：

- `--force`：强制进行完全重新索引。

`memory search`：

- 查询输入：传递位置参数 `[query]` 或 `--query <text>`。
- 如果同时提供两者，`--query` 优先。
- 如果两者均未提供，该命令将报错退出。
- `--agent <id>`：将范围限定为单个 agent（默认：默认 agent）。
- `--max-results <n>`：限制返回的结果数量。
- `--min-score <n>`：过滤掉低分匹配项。
- `--json`：打印 JSON 结果。

说明：

- `memory index --verbose` 打印每个阶段的详细信息（提供商、模型、来源、批处理活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果有效活动的内存远程 API 密钥字段被配置为 SecretRefs，该命令将从活动的网关快照中解析这些值。如果网关不可用，该命令将快速失败。
- Gateway(网关)版本偏差说明：此命令路径需要支持 `secrets.resolve` 的网关；较旧的网关会返回未知方法错误。

import en from "/components/footer/en.mdx";

<en />
