---
summary: "OpenClaw查找并发布社区维护的 OpenClaw 插件"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin on ClawHub
title: "社区插件"
doc-schema-version: 1
---

社区插件是第三方软件包，通过通道、工具、提供者、钩子或其他功能扩展 OpenClaw。使用 [ClawHub](OpenClawClawHub/en/clawhub) 作为发现公共社区插件的主要平台。

## 查找插件

从 CLI 搜索 ClawHub：

```bash
openclaw plugins search "calendar"
```

使用显式源前缀安装 ClawHub 插件：

```bash
openclaw plugins install clawhub:<package-name>
```

在启动切换期间，npm 仍是受支持的直接安装路径：

```bash
openclaw plugins install npm:<package-name>
```

使用 [管理插件](/zh/plugins/manage-plugins) 查看常见的安装、更新、检查和卸载示例。使用 [`openclaw plugins`](/zh/cli/plugins) 了解完整的命令参考和源选择规则。

## 发布插件

当您希望 OpenClaw 用户发现并安装插件时，请在 ClawHub 上发布公共社区插件。ClawHub 拥有实时的软件包列表、发布历史、扫描状态和安装提示；文档不维护静态的第三方插件目录。

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

在发布之前，请确保插件具有软件包元数据、插件清单、设置文档以及明确的维护负责人。ClawHub 在创建发布之前会验证所有者作用域、软件包名称、版本、文件限制和源元数据，然后在新版本完成审查和验证之前，将其对正常的安装和下载界面隐藏。

在发布之前使用此检查清单：

| 要求             | 原因                                             |
| ---------------- | ------------------------------------------------ |
| 发布于 ClawHub   | 用户需要 `openclaw plugins install` 提示才能工作 |
| 公共 GitHub 仓库 | 源代码审查、问题跟踪、透明度                     |
| 设置和使用文档   | 用户需要知道如何配置它                           |
| 积极维护         | 最近的更新或积极响应的问题处理                   |

使用这些页面查看完整的发布协议：

- [ClawHub 发布](/zh/clawhub/publishing) 解释了所有者、作用域、发布版本、
  审核、包验证和包转让。
- [构建插件](/zh/plugins/building-plugins) 展示了插件包的形态
  和首次发布工作流。
- [插件清单](/zh/plugins/manifest) 定义了原生插件清单字段。

## 相关

- [插件](/zh/tools/plugin) - 安装、配置、重启和故障排除
- [管理插件](/zh/plugins/manage-plugins) - 命令示例
- [ClawHub 发布](/zh/clawhub/publishing) - 发布和发布规则
