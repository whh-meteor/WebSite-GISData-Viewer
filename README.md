# CupGIS Viewer（Online GIS Data Viewer）

一个基于 MapLibre GL JS 的三维地球 GIS 数据查看器，支持拖拽或选择 GeoJSON、Shapefile 数据，并在侧栏查看数据结构、属性表和图层状态。
url：https://gis-data-viewer.vercel.app/

## 功能

- MapLibre 三维地球视图，默认使用地形底图
- 星空宇宙背景
- 可切换底图图源：地形图、OpenStreetMap、卫星影像、浅色底图
- 可加载或拖拽 `.geojson`、`.json`
- 可加载或拖拽 Shapefile：
  - 推荐：`.zip` 压缩包，包含 `.shp/.dbf/.prj`
  - 也支持同时选择或拖入 `.shp + .dbf + .prj`
- 自动渲染点、线、面图层
- 侧栏显示 GeoJSON 数据结构
- 侧栏显示属性表
- 图层管理：显示/隐藏、定位、删除、透明度调节

## 使用方式

直接打开 `index.html` 即可使用。

如果浏览器安全策略限制了本地文件读取，也可以在本目录启动一个静态服务：

```powershell
python -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 数据说明

- GeoJSON 文件需要是 `FeatureCollection`、`Feature` 或单个 Geometry。
- Shapefile 最推荐使用 ZIP 包上传，ZIP 中应至少包含 `.shp` 和 `.dbf`。
- 对于未压缩 Shapefile，请一次性选择或拖入同名的 `.shp`、`.dbf`，可选 `.prj`。

## 依赖

页面通过 CDN 加载以下前端库：

- MapLibre GL JS
- shpjs
- shapefile

无需安装 npm 依赖。
