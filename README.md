<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r128-black?logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Zero_Dependencies-vanilla_JS-F7DF1E?logo=javascript&logoColor=black" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Export-STL_%7C_GLB-00C853" alt="Export">
  <img src="https://img.shields.io/badge/3D_Printable-FDM_Ready-FF6D00?logo=makerbot&logoColor=white" alt="3D Print">
  <img src="https://img.shields.io/github/license/USER/mooncake-studio?color=blue" alt="License">
</p>

<h1 align="center">🥮 MoonCake Studio</h1>

<p align="center">
  <strong>A browser-based 3D mooncake mold designer with real-time preview and 3D-print-ready export.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#live-demo">Live Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage-guide">Usage</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="./README.zh-CN.md">中文文档</a>
</p>

---

## What is this?

**MoonCake Studio** is a fully client-side 3D parametric designer that lets you create custom mooncake molds — the traditional press-stamps used to shape mooncakes (月饼) during the Mid-Autumn Festival.

Everything runs in the browser. No backend. No install. Just open and design.

You can customize edge profiles, surface patterns, engraved text, colors, and export production-ready **STL** or **GLB** files for 3D printing or CNC machining.

## Features

### 🎨 Design System
- **6 Edge Profiles** — Smooth, Scalloped, Petal, Plum Blossom, Chrysanthemum, Gear-tooth
- **6 Traditional Patterns** — Floral, Auspicious Cloud, Grain, Interlocking Vine, Lattice, Ocean Wave
- **AI Random Pattern Generator** — Procedural mandala / lotus / geometric star patterns with infinite variation
- **Custom Image → Relief** — Upload any image, auto-converted to embossed surface relief
- **Chinese Text Engraving** — 2-char or 4-char layout with 5 font choices and adjustable depth

### 🔧 Parametric Controls
| Parameter | Range | Description |
|-----------|-------|-------------|
| Diameter | 6–12 cm | Mold outer diameter |
| Height | 1.5–4 cm | Total body height |
| Dome Curvature | 0–1.5 | Top surface dome arc |
| Edge Wave Depth | 0–1.5 | Scallop / petal amplitude |
| Edge Wave Count | 0–32 | Number of edge lobes |
| Font Size | 0.4–1.5× | Text scale factor |
| Engrave Depth | 0.05–0.8 cm | Carving depth |

### 🏭 Dual View Mode
- **Cake Preview** — See the finished mooncake as it would look after pressing
- **Mold Preview** — Full mechanical mold assembly with housing, guide rod, spring mechanism, stamp plate, and press handle

### 📦 Export & Print
- **STL Export** — Universal format for FDM/SLA 3D printers and CNC mills
- **GLB Export** — glTF binary for game engines, AR/VR, web viewers
- **Print Analysis** — Real-time size (mm), face count, estimated PLA weight and print time
- **FDM Optimized** — Recommended layer height 0.15mm, 20% infill

### 🖥️ Professional UI
- Dark mode interface inspired by professional CAD tools
- Collapsible parameter panels with live value feedback
- Dimension overlay toggle
- Wireframe inspection mode
- Orbit / Pan / Zoom controls with double-click reset
- Responsive layout for desktop and tablet

## Live Demo

> **[▶ Open MoonCake Studio](https://YOUR_USERNAME.github.io/mooncake-studio/)**

*Replace with your GitHub Pages URL after deployment.*

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mooncake-studio.git

# Open in browser — that's it!
# No build step. No npm install. No dependencies to manage.
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

Or simply download `index.html` and double-click to open.

## Usage Guide

### Basic Workflow

1. **Choose Edge Style** — Click an edge profile in the "模具外形" section
2. **Select Pattern** — Pick a traditional pattern or click "AI 随机生成图案"
3. **Add Text** — Type up to 4 Chinese characters, choose font and layout
4. **Adjust Parameters** — Fine-tune diameter, height, dome, and engrave depth with sliders
5. **Pick Color Theme** — Choose from 6 curated color palettes
6. **Preview Both Views** — Toggle between cake preview and mechanical mold
7. **Export** — Download STL for 3D printing or GLB for digital use

### Custom Image Pattern

1. Click the upload area or drag & drop an image
2. The image is automatically converted to a height-map relief
3. Adjust "背景清除范围" slider to control the center mask
4. Text engraving overlays on top

### 3D Printing Tips

- **Material**: PLA or food-safe PETG recommended
- **Layer Height**: 0.15mm for fine pattern detail
- **Infill**: 20% is sufficient for structural strength
- **Orientation**: Print mold cavity facing up, no supports needed
- **Post-processing**: Light sanding for smooth food-contact surface

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Three.js r128** | 3D rendering, geometry generation, shadow mapping |
| **Vanilla JavaScript** | Zero-framework, zero-build-step architecture |
| **Canvas 2D API** | Procedural pattern generation, height map creation |
| **LatheGeometry + Displacement** | Parametric mold body with real-time vertex displacement |
| **STLExporter / GLTFExporter** | Production-grade 3D model export |
| **CSS Custom Properties** | Themeable dark UI with responsive layout |

### Architecture Highlights

- **Single-file deployment** — The entire application is one self-contained HTML file (~1300 lines)
- **Real-time parametric modeling** — All geometry is rebuilt on every parameter change using LatheGeometry with vertex-level displacement mapping
- **Procedural pattern engine** — 6 traditional Chinese patterns + AI-generated patterns drawn via Canvas 2D bezier curves, converted to height maps for 3D displacement
- **Dual-purpose rendering** — Same parametric data drives both the cake preview (with applied texture) and the full mechanical mold assembly (with housing, guide rod, spring, stamp plate)
- **Bilinear height sampling** — Height maps are sampled with sub-pixel bilinear interpolation for smooth displacement

## Project Structure

```
mooncake-studio/
├── index.html          # Complete application (single-file)
├── README.md           # English documentation
├── README.zh-CN.md     # 中文文档
├── LICENSE             # MIT License
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages auto-deployment
```

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome 90+ | ✅ Full support |
| Firefox 88+ | ✅ Full support |
| Safari 15+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Mobile Chrome/Safari | ⚠️ Functional (reduced performance) |

Requires WebGL 1.0+ support.

## Contributing

Contributions are welcome! Some ideas for improvement:

- [ ] Add more traditional Chinese patterns (龙纹, 凤纹, 福字纹)
- [ ] Multi-language UI support
- [ ] Undo/Redo system
- [ ] Preset mooncake templates (广式, 苏式, 潮式)
- [ ] OBJ export format
- [ ] Texture baking for game-ready assets
- [ ] PWA offline support

## License

[MIT](./LICENSE) — Free for personal and commercial use.

---

<p align="center">
  Made with ☕ and cultural pride · Celebrating the art of mooncake making
</p>
