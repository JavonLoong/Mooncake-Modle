<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r128-black?logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Zero_Dependencies-vanilla_JS-F7DF1E?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Export-STL_%7C_GLB-00C853" alt="Export">
  <img src="https://img.shields.io/badge/3D_Printable-FDM_Ready-FF6D00?logo=makerbot&logoColor=white" alt="3D Print">
  <img src="https://img.shields.io/github/license/JavonLoong/Mooncake-Modle?color=blue" alt="License">
</p>

<h1 align="center">🥮 MoonCake Studio · 月饼模具设计器</h1>

<p align="center">
  <strong>A browser-based 3D mooncake mold designer with real-time preview and 3D-print-ready export.</strong><br>
  <strong>浏览器端 3D 月饼模具参数化设计器，实时预览 + 一键导出 3D 打印文件</strong>
</p>

<p align="center">
  <a href="#features--功能亮点">Features · 功能</a> •
  <a href="#live-demo--在线体验">Live Demo · 体验</a> •
  <a href="#quick-start--快速开始">Quick Start · 快速开始</a> •
  <a href="#usage-guide--使用指南">Usage · 使用指南</a> •
  <a href="#tech-stack--技术架构">Tech Stack · 技术架构</a>
</p>

---

## What is this? · 这是什么？

**MoonCake Studio** is a fully client-side 3D parametric designer that lets you create custom mooncake molds — the traditional press-stamps used to shape mooncakes (月饼) during the Mid-Autumn Festival.

**MoonCake Studio** 是一个完全运行在浏览器端的 3D 参数化设计工具，让你自由定制月饼模具——那种中秋节用来压印月饼的传统模具。

Everything runs in the browser. **No backend. No install. Just open and design.**  
**零后端、零安装、零构建**。打开浏览器就能用。

You can customize edge profiles, surface patterns, engraved text, colors, and export production-ready **STL** or **GLB** files for 3D printing or CNC machining.  
你可以定制边缘轮廓、表面花纹、刻字、配色，然后导出生产级 **STL** 或 **GLB** 文件，直接送去 3D 打印或 CNC 加工。

## Features · 功能亮点

### 🎨 Design System · 设计系统
- **6 Edge Profiles · 6 种边缘轮廓** — Smooth, Scalloped, Petal, Plum Blossom, Chrysanthemum, Gear-tooth / 光滑、波浪、花瓣、梅花、菊花、锯齿
- **6 Traditional Patterns · 6 种传统花纹** — Floral, Auspicious Cloud, Grain, Interlocking Vine, Lattice, Ocean Wave / 花卉纹、祥云纹、五谷纹、缠枝纹、窗棂纹、海浪纹
- **AI Random Pattern Generator · AI 随机花纹** — Procedural mandala / lotus / geometric star patterns / 程序化生成曼陀罗 / 莲花 / 几何星纹，无限变化
- **Custom Image → Relief · 自定义图片转浮雕** — Upload any image, auto-converted to embossed surface relief / 上传任意图片，自动转换为浮雕纹理
- **Chinese Text Engraving · 中文刻字** — 2-char or 4-char layout with 5 font choices / 两字或四字布局，5 种字体可选

### 🔧 Parametric Controls · 参数化控制

| Parameter · 参数 | Range · 范围 | Description · 说明 |
|---|---|---|
| Diameter · 直径 | 6–12 cm | Mold outer diameter · 模具外径 |
| Height · 总高度 | 1.5–4 cm | Total body height · 模具总体高度 |
| Dome Curvature · 顶面弧度 | 0–1.5 | Top surface dome arc · 月饼顶面穹顶弧度 |
| Edge Wave Depth · 花边深度 | 0–1.5 | Scallop / petal amplitude · 边缘波浪振幅 |
| Edge Wave Count · 花边瓣数 | 0–32 | Number of edge lobes · 边缘花瓣数量 |
| Font Size · 文字大小 | 0.4–1.5× | Text scale factor · 刻字缩放比例 |
| Engrave Depth · 雕刻深度 | 0.05–0.8 cm | Carving depth · 花纹和文字的雕刻深度 |

### 🏭 Dual View Mode · 双视图模式
- **Cake Preview · 成品预览** — See the finished mooncake after pressing / 查看压制完成的月饼成品效果
- **Mold Preview · 模具预览** — Full mechanical mold assembly with housing, guide rod, spring, stamp plate, and press handle / 完整的工业模具装配体：外壳、导杆、弹簧、印模板、压柄

### 📦 Export & Print · 导出与打印
- **STL Export · STL 导出** — Universal format for FDM/SLA 3D printers and CNC mills / FDM / SLA 3D 打印和 CNC 通用格式
- **GLB Export · GLB 导出** — glTF binary for game engines, AR/VR, web viewers / 适用于游戏引擎、AR/VR、Web 查看器
- **Print Analysis · 打印分析** — Real-time size (mm), face count, estimated PLA weight and print time / 实时显示尺寸、三角面数、PLA 估重、打印耗时
- **FDM Optimized · FDM 优化** — Recommended layer height 0.15mm, 20% infill / 推荐层高 0.15mm，填充率 20%

### 🖥️ Professional UI · 专业级界面
- Dark mode interface inspired by professional CAD tools · 暗色主题，参考专业 CAD 工具设计
- Collapsible parameter panels with live value feedback · 可折叠参数面板 + 实时数值反馈
- Dimension overlay toggle · 尺寸标注覆盖层
- Wireframe inspection mode · 线框检查模式
- Orbit / Pan / Zoom controls with double-click reset · 轨道 / 平移 / 缩放控制 + 双击重置
- Responsive layout for desktop and tablet · 桌面端和平板端响应式布局

## Live Demo · 在线体验

> **[▶ Open MoonCake Studio · 打开设计器](https://JavonLoong.github.io/Mooncake-Modle/)**

## Quick Start · 快速开始

```bash
# Clone the repository · 克隆仓库
git clone https://github.com/JavonLoong/Mooncake-Modle.git

# Open in browser — no build step needed! · 打开浏览器，无需构建！
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

Or simply download `index.html` and double-click to open.  
或者直接下载 `index.html`，双击打开。

## Usage Guide · 使用指南

### Basic Workflow · 基本流程

1. **Choose Edge Style · 选择边缘样式** — Click an edge profile in the "模具外形" section
2. **Select Pattern · 选择花纹** — Pick a traditional pattern or click "AI 随机生成图案"
3. **Add Text · 添加文字** — Type up to 4 Chinese characters, choose font and layout
4. **Adjust Parameters · 调整参数** — Fine-tune diameter, height, dome, and engrave depth with sliders
5. **Pick Color Theme · 选择配色** — Choose from 6 curated color palettes / 从 6 套精选配色方案中选择
6. **Preview Both Views · 双视图预览** — Toggle between cake preview and mechanical mold
7. **Export · 导出** — Download STL for 3D printing or GLB for digital use

### Custom Image Pattern · 自定义图片花纹

1. Click the upload area or drag & drop an image · 点击上传区域或拖拽图片
2. The image is automatically converted to a height-map relief · 图片自动转为高度图浮雕
3. Adjust "背景清除范围" slider to control the center mask · 调节滑块控制中心遮罩
4. Text engraving overlays on top · 文字刻印叠加在上方

### 3D Printing Tips · 3D 打印建议

| | English | 中文 |
|---|---|---|
| **Material · 材料** | PLA or food-safe PETG | 推荐 PLA，食品接触用 PETG |
| **Layer Height · 层高** | 0.15mm for fine detail | 0.15mm 确保花纹细节 |
| **Infill · 填充率** | 20% sufficient | 20% 即可满足强度 |
| **Orientation · 方向** | Mold cavity facing up | 模腔朝上，无需支撑 |
| **Post-process · 后处理** | Light sanding | 轻度打磨光滑食品面 |

## Tech Stack · 技术架构

| Technology · 技术 | Purpose · 用途 |
|---|---|
| **Three.js r128** | 3D rendering, geometry, shadow mapping · 3D 渲染、几何体生成、阴影映射 |
| **Vanilla JavaScript · 原生 JS** | Zero-framework, zero-build-step · 零框架、零构建步骤 |
| **Canvas 2D API** | Procedural pattern generation, height map · 程序化花纹绘制、高度图生成 |
| **LatheGeometry + Displacement** | Parametric mold body · 参数化模具本体 + 实时顶点位移 |
| **STLExporter / GLTFExporter** | Production-grade 3D model export · 生产级 3D 模型导出 |
| **CSS Custom Properties** | Themeable dark UI · 可主题化暗色 UI + 响应式布局 |

### Architecture Highlights · 核心技术亮点

- **Single-file deployment · 单文件部署** — The entire application is one self-contained HTML file (~1300 lines) / 整个应用是一个自包含的 HTML 文件（约 1300 行）
- **Real-time parametric modeling · 实时参数化建模** — All geometry is rebuilt on every parameter change using LatheGeometry with vertex-level displacement mapping / 每次参数变更都使用 LatheGeometry + 顶点级位移映射重建几何体
- **Procedural pattern engine · 程序化花纹引擎** — 6 traditional Chinese patterns + AI-generated patterns drawn via Canvas 2D bezier curves / 6 种传统纹样 + AI 生成纹样，通过 Canvas 2D 贝塞尔曲线绘制
- **Dual-purpose rendering · 双用途渲染** — Same parametric data drives both cake preview and full mechanical mold assembly / 同一组参数同时驱动月饼成品预览和完整工业模具装配体
- **Bilinear height sampling · 双线性高度采样** — Height maps sampled with sub-pixel bilinear interpolation for smooth displacement / 高度图以亚像素双线性插值采样，确保位移平滑

## Project Structure · 项目结构

```
Mooncake-Modle/
├── index.html          # Complete application (single-file) · 完整应用（单文件）
├── README.md           # Bilingual documentation · 中英文文档
├── LICENSE             # MIT License · MIT 开源协议
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages auto-deployment · 自动部署
```

## Browser Support · 浏览器支持

| Browser · 浏览器 | Status · 状态 |
|---|---|
| Chrome 90+ | ✅ Full support · 完全支持 |
| Firefox 88+ | ✅ Full support · 完全支持 |
| Safari 15+ | ✅ Full support · 完全支持 |
| Edge 90+ | ✅ Full support · 完全支持 |
| Mobile Chrome/Safari · 移动端 | ⚠️ Functional · 可用（性能降低） |

Requires WebGL 1.0+ · 需要 WebGL 1.0+ 支持。

## Contributing · 贡献

Contributions are welcome! · 欢迎贡献！

- [ ] More traditional Chinese patterns (龙纹, 凤纹, 福字纹) · 更多传统纹样
- [ ] Multi-language UI support · 多语言 UI 支持
- [ ] Undo/Redo system · 撤销/重做系统
- [ ] Preset mooncake templates (广式, 苏式, 潮式) · 月饼模板预设
- [ ] OBJ export format · OBJ 导出格式
- [ ] Texture baking for game-ready assets · 纹理烘焙
- [ ] PWA offline support · PWA 离线支持

## License · 许可证

[MIT](./LICENSE) — Free for personal and commercial use. · 个人和商业用途均免费。

---

<p align="center">
  Made with ☕ and cultural pride · 以 ☕ 和文化自信打造<br>
  Celebrating the art of mooncake making · 致敬月饼制作的传统工艺
</p>
