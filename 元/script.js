let map = null;
let styleLoaded = false;
let markersAdded = false;

// 显示加载状态
document.getElementById('loading').style.display = 'block';

// 错误处理
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errorMsg = `Error: ${msg}\nURL: ${url}\nLine: ${lineNo}\nColumn: ${columnNo}\nError object: ${JSON.stringify(error)}`;
    console.error(errorMsg);
    showError('发生错误：' + msg);
    return false;
};

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Mapbox 访问令牌
const mapboxToken = 'pk.eyJ1IjoibXYzMW44IiwiYSI6ImNtYnZzeTU3YTB2MWoyaXMzeHh1eGRwMWIifQ.zkbOTtGpXKD1Wl3EZBli_g';
mapboxgl.accessToken = mapboxToken;

// 定义南京区域边界
const nanjingBounds = [
    [118.35, 31.14], // 西南角坐标
    [119.23, 32.37]  // 东北角坐标
];

// 添加标记点
function addMarkers() {
    if (markersAdded || !map || !styleLoaded) {
        return;
    }
    const locations = window.mapLocations || [];
    try {
        locations.forEach(location => {
            const el = document.createElement('div');
            el.className = 'marker';
            new mapboxgl.Marker(el)
                .setLngLat(location.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`<h3>${location.name}</h3><p>${location.description}</p>`))
                .addTo(map);
        });
        markersAdded = true;
    } catch (error) {
        showError('添加标记点失败');
    }
}

// 初始化地图
function initMap() {
    try {
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [118.7969, 32.0587],
            zoom: 12,
            minZoom: 10,
            maxZoom: 16,
            maxBounds: nanjingBounds,
            attributionControl: false,
            antialias: true,
            failIfMajorPerformanceCaveat: false
        });
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: false,
            showZoom: true,
            visualizePitch: false
        }), 'bottom-right');
        map.on('load', () => {
            document.getElementById('loading').style.display = 'none';
            map.on('style.load', () => {
                styleLoaded = true;
                addMarkers();
            });
            map.on('style.error', (e) => {
                showError('样式加载失败，使用默认样式');
            });
            try {
                map.setStyle(window.mapStyle || 'mapbox://styles/mapbox/streets-v12');
            } catch (error) {
                showError('设置自定义样式失败');
            }
        });
        map.on('error', (e) => {
            const errorMsg = e.error ? e.error.message : '未知错误';
            if (!errorMsg.includes('Style is not done loading')) {
                showError('地图错误：' + errorMsg);
            }
        });
        setInterval(() => {
            if (map && !map.loaded()) {
                // 地图加载状态检查（已移除debugLog）
            }
        }, 5000);
    } catch (error) {
        showError('地图初始化失败：' + error.message);
    }
}

// 启动地图初始化
initMap();

// 检查坐标是否在边界内
function isWithinBounds(point, bounds) {
    return point.lng >= bounds[0][0] && point.lng <= bounds[1][0] &&
           point.lat >= bounds[0][1] && point.lat <= bounds[1][1];
} 