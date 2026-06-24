const basemaps = {
  topo: {
    label: "地形图",
    tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors, SRTM | OpenTopoMap",
    maxzoom: 17
  },
  osm: {
    label: "OpenStreetMap",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
    maxzoom: 19
  },
  imagery: {
    label: "卫星影像",
    tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Tiles © Esri",
    maxzoom: 19
  },
  light: {
    label: "浅色底图",
    tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"],
    attribution: "© OpenStreetMap contributors © CARTO",
    maxzoom: 20
  },
  dark: {
    label: "深色底图",
    tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
    attribution: "© OpenStreetMap contributors © CARTO",
    maxzoom: 20
  },
  streets: {
    label: "街道地图",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
    attribution: "© Esri",
    maxzoom: 20
  },
  terrain: {
    label: "地形影像",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
    ],
    attribution: "© Esri",
    maxzoom: 13
  },
  ocean: {
    label: "海洋地图",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"],
    attribution: "© Esri",
    maxzoom: 10
  },
  gaode_vec: {
    label: "高德矢量",
    tiles: ["https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"],
    attribution: "© 高德地图",
    maxzoom: 18,
    subdomains: ["1", "2", "3", "4"]
  },
  gaode_img: {
    label: "高德卫星",
    tiles: [
      "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      "https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}"
    ],
    attribution: "© 高德地图",
    maxzoom: 18,
    subdomains: ["1", "2", "3", "4"]
  },
  tencent_vec: {
    label: "腾讯矢量",
    tiles: ["https://rt{s}.map.gtimg.com/realtimerender?z={z}&x={x}&y={y}&type=vector&style=1"],
    attribution: "© 腾讯地图",
    maxzoom: 18,
    subdomains: ["0", "1", "2", "3"]
  },

};

const layerColors = ["#57c7b8", "#f2b84b", "#7aa8ff", "#ff8f70", "#b98cff", "#8fd17f"];
const layerStore = new Map();
let layerSequence = 0;
let selectedLayerId = null;
let statusTimer = 0;

const sidebar = document.querySelector(".sidebar");
const expandSidebar = document.getElementById("expandSidebar");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const layerList = document.getElementById("layerList");
const layerCount = document.getElementById("layerCount");
const structureView = document.getElementById("structureView");
const attributesView = document.getElementById("attributesView");
const basemapSelect = document.getElementById("basemapSelect");
const statusEl = document.getElementById("status");

const map = new maplibregl.Map({
  container: "map",
  style: createStyle("ocean"),
  center: [105, 34],
  zoom: 2.2,
  pitch: 38,
  bearing: -12,
  projection: "globe",
  antialias: true,
  hash: true
});

window.gisMap = map;

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.FullscreenControl(), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

map.on("style.load", () => {
  map.setProjection({ type: "globe" });
  map.setTerrain({ source: "terrain-dem", exaggeration: 1.35 });
  if (map.setSky) {
    map.setSky({
      "sky-color": "#020711",
      "horizon-color": "#16313a",
      "sky-horizon-blend": 0.8,
      "horizon-fog-blend": 0.65,
      "fog-color": "#0a141a",
      "fog-ground-blend": 0.4,
      "atmosphere-blend": 0.5
    });
  }
  restoreDataLayers();
});

map.on("load", () => {
  restoreDataLayers();
});

for (const [id, config] of Object.entries(basemaps)) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = config.label;
  basemapSelect.append(option);
}

basemapSelect.value = "topo";
basemapSelect.addEventListener("change", () => {
  map.setStyle(createStyle(basemapSelect.value));
});

fileInput.addEventListener("change", event => {
  handleFiles([...event.target.files]);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", event => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  handleFiles([...event.dataTransfer.files]);
});

document.getElementById("clearAll").addEventListener("click", () => {
  [...layerStore.keys()].forEach(removeLayer);
  selectedLayerId = null;
  updateDataViews();
  showStatus("已清空所有图层");
});

document.getElementById("toggleSidebar").addEventListener("click", () => {
  sidebar.classList.add("collapsed");
  expandSidebar.classList.add("visible");
  document.querySelector(".app-shell").classList.add("sidebar-collapsed");
});

expandSidebar.addEventListener("click", () => {
  sidebar.classList.remove("collapsed");
  expandSidebar.classList.remove("visible");
  document.querySelector(".app-shell").classList.remove("sidebar-collapsed");
});

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const tab = button.dataset.tab;
    structureView.classList.toggle("hidden", tab !== "structure");
    attributesView.classList.toggle("hidden", tab !== "attributes");
  });
});

async function handleFiles(files) {
  if (!files.length) return;

  const geojsonFiles = files.filter(file => /\.(geojson|json)$/i.test(file.name));
  const zipFiles = files.filter(file => /\.zip$/i.test(file.name));
  const looseShapeFiles = files.filter(file => /\.(shp|dbf|prj|cpg)$/i.test(file.name));

  try {
    for (const file of geojsonFiles) {
      const geojson = normalizeGeoJSON(JSON.parse(await file.text()));
      addDataLayer(file.name, geojson);
    }

    for (const file of zipFiles) {
      const result = await shp(await file.arrayBuffer());
      const collections = Array.isArray(result) ? result : [result];
      collections.forEach((collection, index) => {
        const name = collections.length > 1 ? `${file.name} #${index + 1}` : file.name;
        addDataLayer(name, normalizeGeoJSON(collection));
      });
    }

    if (looseShapeFiles.some(file => /\.shp$/i.test(file.name))) {
      const groups = groupLooseShapefiles(looseShapeFiles);
      for (const group of groups) {
        if (!group.shp) continue;
        const geojson = await readLooseShapefile(group);
        addDataLayer(group.name, normalizeGeoJSON(geojson));
      }
    }
  } catch (error) {
    console.error(error);
    showStatus(`加载失败：${error.message || error}`, true);
  }
}

function createStyle(basemapId) {
  const basemap = basemaps[basemapId] || basemaps.topo;
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      basemap: {
        type: "raster",
        tiles: basemap.tiles,
        tileSize: 256,
        maxzoom: basemap.maxzoom,
        attribution: basemap.attribution
      },
      hillshade: {
        type: "raster-dem",
        tiles: ["https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 12
      },
      "terrain-dem": {
        type: "raster-dem",
        tiles: ["https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png"],
        tileSize: 256,
        encoding: "terrarium",
        maxzoom: 12
      }
    },
    layers: [
      { id: "space", type: "background", paint: { "background-color": "rgba(0,0,0,0)" } },
      { id: "basemap", type: "raster", source: "basemap", paint: { "raster-opacity": 0.96 } },
      { id: "hillshade", type: "hillshade", source: "hillshade", paint: { "hillshade-shadow-color": "#1c2830", "hillshade-highlight-color": "#f3efe2", "hillshade-accent-color": "#55746f", "hillshade-exaggeration": 0.42 } }
    ]
  };
}

function addDataLayer(name, geojson) {
  const id = `data-${Date.now()}-${layerSequence++}`;
  const color = layerColors[layerSequence % layerColors.length];
  const featureCount = geojson.features.length;
  const geometryTypes = [...new Set(geojson.features.map(feature => feature.geometry?.type).filter(Boolean))];

  layerStore.set(id, {
    id,
    name,
    geojson,
    color,
    opacity: 0.72,
    visible: true,
    featureCount,
    geometryTypes
  });

  selectedLayerId = id;
  renderLayerList();
  updateDataViews();
  renderDataLayer(id);
  fitToLayer(id);
  showStatus(`已加载 ${name}，共 ${featureCount} 个要素`);
}

function renderDataLayer(id) {
  const item = layerStore.get(id);
  if (!item || map.getSource(id)) return;
  if (!map.isStyleLoaded()) {
    map.once("idle", () => renderDataLayer(id));
    return;
  }

  map.addSource(id, { type: "geojson", data: item.geojson });

  map.addLayer({
    id: `${id}-fill`,
    type: "fill",
    source: id,
    filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
    paint: {
      "fill-color": item.color,
      "fill-opacity": item.opacity * 0.45
    },
    layout: { visibility: item.visible ? "visible" : "none" }
  });

  map.addLayer({
    id: `${id}-line`,
    type: "line",
    source: id,
    paint: {
      "line-color": item.color,
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.2, 9, 3.4],
      "line-opacity": item.opacity
    },
    layout: { visibility: item.visible ? "visible" : "none" }
  });

  map.addLayer({
    id: `${id}-point`,
    type: "circle",
    source: id,
    filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 9, 8],
      "circle-color": item.color,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": item.opacity
    },
    layout: { visibility: item.visible ? "visible" : "none" }
  });
}

function restoreDataLayers() {
  for (const id of layerStore.keys()) {
    renderDataLayer(id);
  }
}

function removeLayer(id) {
  [`${id}-point`, `${id}-line`, `${id}-fill`].forEach(layerId => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  if (map.getSource(id)) map.removeSource(id);
  layerStore.delete(id);
  if (selectedLayerId === id) selectedLayerId = layerStore.keys().next().value || null;
  renderLayerList();
  updateDataViews();
}

function renderLayerList() {
  layerCount.textContent = layerStore.size;
  layerList.innerHTML = "";
  layerList.classList.toggle("empty-state", layerStore.size === 0);

  if (!layerStore.size) {
    layerList.textContent = "暂无图层";
    return;
  }

  for (const item of layerStore.values()) {
    const row = document.createElement("article");
    row.className = "layer-item";
    row.dataset.layerId = item.id;

    row.innerHTML = `
      <div class="layer-heading">
        <div>
          <div class="layer-name">${escapeHTML(item.name)}</div>
          <div class="layer-meta">${item.featureCount} 个要素 · ${escapeHTML(item.geometryTypes.join(", ") || "未知几何")}</div>
        </div>
        <div class="layer-actions">
          <button type="button" data-action="select" title="查看属性">⌗</button>
          <button type="button" data-action="zoom" title="缩放到图层">⌖</button>
          <button type="button" data-action="visibility" title="显示或隐藏">${item.visible ? "◉" : "○"}</button>
          <button type="button" data-action="remove" title="删除图层">×</button>
        </div>
      </div>
      <label class="opacity-row">
        <span>透明度</span>
        <input type="range" min="0.1" max="1" step="0.05" value="${item.opacity}" data-action="opacity">
        <span>${Math.round(item.opacity * 100)}%</span>
      </label>
    `;

    row.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => handleLayerAction(item.id, button.dataset.action));
    });

    row.querySelector("input").addEventListener("input", event => {
      updateOpacity(item.id, Number(event.target.value));
      event.target.nextElementSibling.textContent = `${Math.round(Number(event.target.value) * 100)}%`;
    });

    layerList.append(row);
  }
}

function handleLayerAction(id, action) {
  if (action === "select") {
    selectedLayerId = id;
    updateDataViews();
  }
  if (action === "zoom") fitToLayer(id);
  if (action === "visibility") toggleVisibility(id);
  if (action === "remove") removeLayer(id);
}

function toggleVisibility(id) {
  const item = layerStore.get(id);
  if (!item) return;
  item.visible = !item.visible;
  const visibility = item.visible ? "visible" : "none";
  [`${id}-point`, `${id}-line`, `${id}-fill`].forEach(layerId => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
  });
  renderLayerList();
}

function updateOpacity(id, opacity) {
  const item = layerStore.get(id);
  if (!item) return;
  item.opacity = opacity;
  if (map.getLayer(`${id}-fill`)) map.setPaintProperty(`${id}-fill`, "fill-opacity", opacity * 0.45);
  if (map.getLayer(`${id}-line`)) map.setPaintProperty(`${id}-line`, "line-opacity", opacity);
  if (map.getLayer(`${id}-point`)) map.setPaintProperty(`${id}-point`, "circle-opacity", opacity);
}

function updateDataViews() {
  const item = selectedLayerId ? layerStore.get(selectedLayerId) : null;
  if (!item) {
    structureView.textContent = "加载数据后显示 GeoJSON 结构";
    attributesView.innerHTML = "加载数据后显示属性表";
    return;
  }

  structureView.textContent = JSON.stringify(summarizeGeoJSON(item.geojson), null, 2);
  attributesView.innerHTML = buildAttributeTable(item.geojson);
}

function buildAttributeTable(geojson) {
  const features = geojson.features || [];
  if (!features.length) return "<div class=\"structure-view\">没有属性记录</div>";

  const columns = [...features.reduce((set, feature) => {
    Object.keys(feature.properties || {}).forEach(key => set.add(key));
    return set;
  }, new Set())];

  if (!columns.length) return "<div class=\"structure-view\">要素没有属性字段</div>";

  const rows = features.slice(0, 500).map((feature, index) => {
    const cells = columns.map(column => `<td title="${escapeHTML(formatValue(feature.properties?.[column]))}">${escapeHTML(formatValue(feature.properties?.[column]))}</td>`).join("");
    return `<tr><td>${index + 1}</td>${cells}</tr>`;
  }).join("");

  const header = columns.map(column => `<th>${escapeHTML(column)}</th>`).join("");
  const note = features.length > 500 ? `<caption>显示前 500 条，共 ${features.length} 条</caption>` : "";
  return `<table class="attributes-table">${note}<thead><tr><th>#</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function summarizeGeoJSON(geojson) {
  return {
    type: geojson.type,
    featureCount: geojson.features.length,
    geometryTypes: [...new Set(geojson.features.map(feature => feature.geometry?.type).filter(Boolean))],
    fields: [...geojson.features.reduce((set, feature) => {
      Object.keys(feature.properties || {}).forEach(key => set.add(key));
      return set;
    }, new Set())],
    sampleFeature: geojson.features[0] || null
  };
}

function normalizeGeoJSON(input) {
  if (!input) throw new Error("文件内容为空");
  if (input.type === "FeatureCollection") return { ...input, features: input.features || [] };
  if (input.type === "Feature") return { type: "FeatureCollection", features: [input] };
  if (input.type && input.coordinates) {
    return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: input }] };
  }
  throw new Error("不是有效的 GeoJSON 数据");
}

function groupLooseShapefiles(files) {
  const groups = new Map();
  for (const file of files) {
    const name = file.name.replace(/\.[^.]+$/, "");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!groups.has(name)) groups.set(name, { name, shp: null, dbf: null, prj: null, cpg: null });
    groups.get(name)[ext] = file;
  }
  return [...groups.values()];
}

async function readLooseShapefile(group) {
  if (!window.shapefile) {
    throw new Error("Shapefile 解析库没有加载成功");
  }
  if (!group.dbf) {
    showStatus(`${group.name} 未提供 DBF，仍将尝试读取几何`, true);
  }
  const shpBuffer = await group.shp.arrayBuffer();
  const dbfBuffer = group.dbf ? await group.dbf.arrayBuffer() : undefined;
  const source = await shapefile.open(shpBuffer, dbfBuffer);
  const features = [];
  while (true) {
    const result = await source.read();
    if (result.done) break;
    features.push(result.value);
  }
  return { type: "FeatureCollection", features };
}

function fitToLayer(id) {
  const item = layerStore.get(id);
  if (!item) return;
  if (!map.isStyleLoaded()) {
    map.once("idle", () => fitToLayer(id));
    return;
  }
  const bounds = getBounds(item.geojson);
  if (!bounds) return;
  map.fitBounds(bounds, { padding: 80, duration: 900, maxZoom: 12 });
}

function getBounds(geojson) {
  const coords = [];
  for (const feature of geojson.features || []) {
    collectCoordinates(feature.geometry?.coordinates, coords);
  }
  const valid = coords.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (!valid.length) return null;
  const lngs = valid.map(coord => coord[0]);
  const lats = valid.map(coord => coord[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

function collectCoordinates(input, output) {
  if (!Array.isArray(input)) return;
  if (typeof input[0] === "number" && typeof input[1] === "number") {
    output.push(input);
    return;
  }
  input.forEach(item => collectCoordinates(item, output));
}

function formatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.borderColor = isError ? "rgba(255, 107, 107, 0.7)" : "rgba(87, 199, 184, 0.55)";
  statusEl.classList.add("visible");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => statusEl.classList.remove("visible"), isError ? 5200 : 3200);
}

window.handleFiles = handleFiles;
