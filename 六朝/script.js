let map = null;
let styleLoaded = false;
let markersAdded = false;

// 调试信息显示函数
function debugLog(message) {
    const debugDiv = document.getElementById('debug');
    const timestamp = new Date().toLocaleTimeString();
    debugDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
    console.log(message);
}

// 显示加载状态
document.getElementById('loading').style.display = 'block';
debugLog('页面开始加载');

// 错误处理
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errorMsg = `Error: ${msg}\nURL: ${url}\nLine: ${lineNo}\nColumn: ${columnNo}\nError object: ${JSON.stringify(error)}`;
    console.error(errorMsg);
    debugLog(`发生错误: ${msg}`);
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
debugLog('设置 Mapbox token');

// 定义南京区域边界
const nanjingBounds = [
    [118.35, 31.14], // 西南角坐标
    [119.23, 32.37]  // 东北角坐标
];

// 添加标记点
function addMarkers() {
    if (markersAdded || !map || !styleLoaded) {
        debugLog('跳过添加标记点：地图未就绪或标记点已添加');
        return;
    }

    debugLog('开始添加标记点');
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
        debugLog('标记点添加完成');
    } catch (error) {
        debugLog('添加标记点时发生错误: ' + error.message);
        showError('添加标记点失败');
    }
}

// 初始化地图
function initMap() {
    try {
        debugLog('开始初始化地图');
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

        // 添加导航控件
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: false,
            showZoom: true,
            visualizePitch: false
        }), 'bottom-right');
        debugLog('导航控件添加完成');

        // 地图加载事件
        map.on('load', () => {
            debugLog('地图基础样式加载成功');
            document.getElementById('loading').style.display = 'none';
            
            // 监听样式加载事件
            map.on('style.load', () => {
                debugLog('样式加载成功');
                styleLoaded = true;
                addMarkers();
            });

            map.on('style.error', (e) => {
                const errorMsg = e.error ? e.error.message : '未知错误';
                debugLog('样式加载失败: ' + errorMsg);
                showError('样式加载失败，使用默认样式');
            });

            // 设置自定义样式
            try {
                map.setStyle(window.mapStyle || 'mapbox://styles/mapbox/streets-v12');
                debugLog('开始加载自定义样式');
            } catch (error) {
                debugLog('设置自定义样式时发生错误: ' + error.message);
                showError('设置自定义样式失败');
            }
        });

        // 错误事件监听
        map.on('error', (e) => {
            const errorMsg = e.error ? e.error.message : '未知错误';
            debugLog('地图错误: ' + errorMsg);
            if (!errorMsg.includes('Style is not done loading')) {
                showError('地图错误：' + errorMsg);
            }
        });

        // 添加地图状态检查
        setInterval(() => {
            if (map && !map.loaded()) {
                debugLog('地图加载状态检查：未完成加载');
            }
        }, 5000);

    } catch (error) {
        debugLog('地图初始化失败: ' + error.message);
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