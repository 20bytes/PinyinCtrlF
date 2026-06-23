# 🔎 PinyinCtrlF

![License](https://img.shields.io/badge/license-MIT-green)
![Manifest](https://img.shields.io/badge/Chrome-Manifest_V3-blue)
![Status](https://img.shields.io/badge/status-archived-lightgrey)

> 用拼音 / 英文名快速定位中文姓名的「智能 Ctrl+F」，面向网页与可复制文本 PDF。

> [!NOTE]
> **本仓库已归档（Archived）**，不再继续开发或接受 issue / PR。
> 代码以现状（as-is）提供，仍可正常本地加载使用，欢迎自由 fork 继续维护。

---

## 项目目的

核对名单、论文作者时，英文名 / 拼音常和中文姓名对不上。
PinyinCtrlF 让你像 Ctrl+F 一样用拼音 / 首字母搜索，自动跳到最可能的中文姓名。

---

## 功能特点

- **拼音 / 首字母搜索**：输入 `zhangsan` 或 `zs` 即可匹配「张三」
- **支持倒序姓名**：`wei wang` 也能匹配「王伟」
- **结果排序 + 高亮跳转**：一键定位并高亮
- **网页 + PDF 文本层**：可复制文本的 PDF 同样可用
- **纯本地运行**：不联网、不上传，无任何远程权限请求

---

## 使用方式

| 平台 | 快捷键 |
| --- | --- |
| Windows / Linux | `Ctrl + Shift + F` |
| macOS | `Cmd + Shift + F` |

打开搜索框 → 输入拼音 / 首字母 → 点击结果 → 页面自动高亮并跳转。

---

## 本地 PDF（推荐方式）

Chrome 内置 PDF 阅读器是 `chrome-extension://` 页面，扩展无法注入。
请使用扩展自带的 PDF 查看器（无需本地服务器）：

1. 点击工具栏里的 **PinyinCtrlF 图标**
2. 打开 `PinyinCtrlF PDF Viewer` 标签页
3. 在页面里选择 PDF
4. 用上面的快捷键搜索拼音

---

## 安装（开发者本地加载）

1. 打开 Chrome / Edge → `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序** → 选择本仓库的 `extension/` 目录

> 扩展所需依赖（`pinyin-pro`、`pdf.js`）已打包在 `extension/vendor/`，**无需 `npm install` 即可加载**。

---

## 技术栈

- **Chrome Manifest V3**：`content script` 注入网页，`service worker` 打开内置 PDF 查看器
- [`pinyin-pro`](https://github.com/zh-lx/pinyin-pro)：中文转拼音 / 首字母匹配
- [`pdf.js`](https://github.com/mozilla/pdf.js)：PDF 文本层渲染与搜索

---

## 适用场景

- 论文作者姓名（拼音 / 英文）↔ 中文姓名匹配
- 学校 / 机构导师名单快速核对
- 人员名单、表格、网页名录快速定位

---

## 已知局限

- 扫描件 PDF（不可复制）不支持，需要先做 OCR
- 稀有字、多音字会影响匹配准确度
- 仅在 Chromium 系浏览器（Chrome / Edge）测试过

---

## 未竟事项（归档时未实现，欢迎 fork 继续）

- [ ] 更准确的人名候选抽取
- [ ] PDF 文本层切分优化
- [ ] 匹配解释与可配置规则

---

## License

MIT © 20bytes
