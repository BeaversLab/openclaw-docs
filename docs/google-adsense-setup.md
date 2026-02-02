# Google AdSense 集成配置文档

本文档记录如何在 Mintlify 文档站点中集成 Google AdSense 广告。

## 配置文件

已添加到 `docs.json` 的配置：

```json
{
  "scripts": [
    {
      "src": "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX",
      "async": true,
      "crossorigin": "anonymous"
    }
  ],
  "analytics": {
    "googleAdSense": {
      "id": "ca-pub-XXXXXXXXXXXXXXXX"
    }
  }
}
```

## 配置步骤

### 1. 获取 AdSense 发布商 ID

1. 登录 [Google AdSense](https://www.google.com/adsense/)
2. 左侧菜单 → **设置** → **帐户** → **帐户信息**
3. 复制 **发布商 ID**（格式：`ca-pub-xxxxxxxxxxxxxxxxxxx`）
4. 将 `docs.json` 中的 `ca-pub-XXXXXXXXXXXXXXXX` 替换为真实 ID

### 2. 创建广告单元

在 Google AdSense 后台：

1. **广告** → **按广告单元**
2. 点击 **+** 创建新广告单元
3. 选择广告类型：
   - **展示广告** - 自动响应式横幅广告
   - **文章内广告** - 内容中的广告
   - **信息流广告** - 列表/网格中的广告
4. 复制生成的 `data-ad-slot` ID

### 3. 在页面中添加广告

在任意 Markdown 文件中添加广告代码：

```markdown
<!-- 横幅广告 -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-YOUR_ID"
     data-ad-slot="YOUR_AD_SLOT"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>

<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

**推荐位置：**
- `en/index.md` - 英文首页顶部
- `zh/index.md` - 中文首页顶部
- 重要文档页面（顶部/底部）
- 分组导航页

### 4. 首页示例

```markdown
---
title: OpenClaw Documentation
description: A TypeScript/Node gateway for WhatsApp and Telegram
---

<!-- 顶部横幅广告 -->
<div style="text-align: center; margin: 20px 0;">
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-YOUR_ID"
     data-ad-slot="1234567890"
     data-ad-format="horizontal"
     data-full-width-responsive="true"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>
</div>

# Welcome to OpenClaw

Your content here...

<!-- 底部横幅广告 -->
<div style="text-align: center; margin: 40px 0;">
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-YOUR_ID"
     data-ad-slot="0987654321"
     data-ad-format="horizontal"
     data-full-width-responsive="true"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>
</div>
```

## 测试部署

### 本地预览
```bash
mintlify dev
```

⚠️ **注意**：本地预览不显示广告，AdSense 仅在生产环境工作。

### 生产部署
```bash
mintlify deploy
```

部署后验证：
1. 查看页面源代码，确认包含 AdSense 脚本
2. 浏览器开发者工具 → Network 标签，验证脚本加载
3. AdSense 后台 → **网站** 查看站点状态

## 验证清单

部署后检查：

- [ ] 页面源代码包含 AdSense script 标签
- [ ] Network 标签显示 `adsbygoogle.js` 已加载
- [ ] AdSense 后台显示站点状态为"就绪"或"活跃"
- [ ] 广告审核中心无政策违规
- [ ] 实际页面显示广告（可能需要等待 1-2 周审核）

## 常见问题

### 广告不显示

**可能原因：**
- 新站点需要 1-2 周 AdSense 审核期
- 浏览器启用了广告拦截器
- 站点尚未获得 AdSense 批准
- 发布商 ID 或广告位 ID 无效

**解决方案：**
- 检查 AdSense 后台的站点状态
- 测试时禁用广告拦截器
- 确认所有 ID 正确
- 等待批准流程（可能需要 1-2 周）

### 广告位空白

**可能原因：**
- 没有广告主为你的内容出价
- 地理位置没有广告库存
- AdSense 仍在审核你的站点

**解决方案：**
- 初期属于正常现象
- 添加更多内容吸引广告主
- 确保站点有足够的流量

### 自动广告不工作

使用自动广告代替手动投放：

```json
{
  "analytics": {
    "googleAdSense": {
      "id": "ca-pub-YOUR_ID",
      "autoAds": true
    }
  }
}
```

自动广告会在最佳位置自动插入广告。

## 最佳实践

1. **适度投放** - 每页开始时放 1-2 个广告
2. **测试位置** - 在 AdSense 后台监控表现
3. **用户体验** - 不要放置影响阅读的广告
4. **移动优化** - 使用响应式广告格式
5. **遵守政策** - 阅读 [AdSense 内容政策](https://support.google.com/adsense/answer/48182?hl=zh-Hans)

## 收益追踪

在 AdSense 后台追踪广告效果：

1. **报告** → **网站** 查看数据：
   - 网页浏览量
   - 广告展示次数
   - 点击率（CTR）
   - 千次展示收益（RPM）
   - 总收益

## 技术细节

### Mintlify 配置

Mintlify 支持通过 `scripts` 和 `analytics` 字段配置 AdSense：

- **scripts**: 加载 AdSense JavaScript SDK
- **analytics**: 配置 AdSense 账户

### 广告格式

常用的 `data-ad-format` 值：

- `auto` - 自动选择（推荐）
- `horizontal` - 横向广告
- `vertical` - 纵向广告
- `rectangle` - 矩形广告

### 响应式设置

```javascript
data-full-width-responsive="true"  // 移动端全宽
```

## 相关资源

- [Google AdSense 帮助中心](https://support.google.com/adsense?hl=zh-Hans)
- [AdSense 政策中心](https://support.google.com/adsense/topic/1276508?hl=zh-Hans)
- [Mintlify 官方文档](https://docs.mintlify.com)
- [AdSense 实施指南](https://support.google.com/adsense/answer/7470263?hl=zh-Hans)

## 维护记录

- 2025-02-01: 创建文档，添加基础 AdSense 配置到 docs.json
