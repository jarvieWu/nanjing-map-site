let map = null;
let styleLoaded = false;
let markersAdded = false;
let poemData = [];
let currentPoemCards = [];
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let currentCardIndex = 0;
let markers = []; // 存储标记点引用

// 数据去重函数：将同一地点的多个诗歌合并
function deduplicatePoemData(rawData) {
    const locationMap = new Map();
    
    rawData.forEach(item => {
        const locationKey = `${item.final_location}_${item.latitude}_${item.longitude}`;
        
        if (locationMap.has(locationKey)) {
            // 如果地点已存在，将诗歌添加到现有地点
            locationMap.get(locationKey).poems.push({
                title: item.title,
                author: item.author,
                literary_form: item.literary_form,
                poem: item.poem
            });
        } else {
            // 创建新地点
            locationMap.set(locationKey, {
                name: item.final_location,
                coordinates: [item.longitude, item.latitude],
                poems: [{
                    title: item.title,
                    author: item.author,
                    literary_form: item.literary_form,
                    poem: item.poem
                }]
            });
        }
    });
    
    return Array.from(locationMap.values());
}

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

// 简化的坐标验证函数
function validateCoordinates(lng, lat, locationName) {
    // 检查坐标是否在合理范围内
    if (lng < 118 || lng > 120 || lat < 31 || lat > 33) {
        console.warn(`坐标超出南京地区范围: ${locationName} [${lng}, ${lat}]`);
    }
    
    // 保持原始精度，不进行不必要的转换
    return [lng, lat];
}

// 移除复杂的投影转换函数，Mapbox GL JS会自动处理投影

// 根据页面标题确定朝代并加载对应的诗歌数据
function getDynastyFromTitle() {
    const title = document.title;
    if (title.includes('六朝')) return 'liuchao';
    if (title.includes('唐朝')) return 'tang';
    if (title.includes('宋朝')) return 'song';
    if (title.includes('明朝')) return 'ming';
    if (title.includes('清朝')) return 'qing';
    if (title.includes('元朝')) return 'yuan';
    if (title.includes('南唐')) return 'nantang';
    if (title.includes('现代')) return 'modern';
    return 'liuchao'; // 默认返回六朝
}

// 根据朝代过滤诗歌数据
function filterPoemDataByDynasty(allPoemData, dynasty) {
    // 定义各朝代的诗人
    const dynastyPoets = {
        'liuchao': ['谢朓', '何逊', '沈炯', '谢灵运', '萧统', '阴铿', '徐伯阳', '庾肩吾', '陈叔宝', '江总', '萧纲', '萧子显', '虞骞'],
        'tang': ['李白', '刘禹锡', '罗隐', '韦庄', '常衮', '顾况', '綦毋潜', '权德舆', '皮日休', '唐彦谦'],
        'song': ['王安石', '周邦彦', '辛弃疾', '曾极', '郭祥正', '韩元吉', '贺铸', '孔文昱', '刘克庄', '马光祖', '潘阆', '周紫芝', '范成大', '梁栋'],
        'yuan': ['萨都剌', '陶宗仪', '许有壬', '张可久', '张翥', '白朴'],
        'ming': ['陈复', '陈沂'],
        'qing': ['乾隆', '杜文澜'],
        'nantang': ['冯延巳', '韩熙载', '李璟', '徐铉'],
        'modern': ['现代诗人'] // 现代诗人列表
    };
    
    const poets = dynastyPoets[dynasty] || [];
    
    // 过滤包含该朝代诗人的地点
    return allPoemData.filter(location => {
        return location.poems.some(poem => poets.includes(poem.author));
    }).map(location => {
        // 只保留该朝代的诗歌
        const filteredPoems = location.poems.filter(poem => poets.includes(poem.author));
        return {
            ...location,
            poems: filteredPoems
        };
    }).filter(location => location.poems.length > 0); // 只保留有诗歌的地点
}

// 加载诗歌数据
async function loadPoemData() {
    try {
        const dynasty = getDynastyFromTitle();
        console.log(`加载${dynasty}朝代的诗歌数据`);
        
        // 有专用JSON文件的朝代使用特定文件
        if (dynasty === 'nantang') {
            const response = await fetch('nantang-map.json');
            const nantangData = await response.json();
            
            // 使用去重函数处理南唐数据
            poemData = deduplicatePoemData(nantangData);
            
            console.log('南唐诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'tang') {
            const response = await fetch('tang-map.json');
            const tangData = await response.json();
            
            // 使用去重函数处理唐朝数据
            poemData = deduplicatePoemData(tangData);
            
            console.log('唐朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'song') {
            const response = await fetch('song-map.json');
            const songData = await response.json();
            
            // 使用去重函数处理宋朝数据
            poemData = deduplicatePoemData(songData);
            
            console.log('宋朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'ming') {
            const response = await fetch('ming-map.json');
            const mingData = await response.json();
            
            // 使用去重函数处理明朝数据
            poemData = deduplicatePoemData(mingData);
            
            console.log('明朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'qing') {
            const response = await fetch('qing-map.json');
            const qingData = await response.json();
            
            // 使用去重函数处理清朝数据
            poemData = deduplicatePoemData(qingData);
            
            console.log('清朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'liuchao') {
            const response = await fetch('liuchao-map.json');
            const liuchaoData = await response.json();
            
            // 使用去重函数处理六朝数据
            poemData = deduplicatePoemData(liuchaoData);
            
            console.log('六朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'yuan') {
            const response = await fetch('yuan-map.json');
            const yuanData = await response.json();
            
            // 使用去重函数处理元朝数据
            poemData = deduplicatePoemData(yuanData);
            
            console.log('元朝诗歌数据加载成功:', poemData.length, '个地点');
        } else if (dynasty === 'modern') {
            const response = await fetch('modern-map.json');
            const modernData = await response.json();
            
            // 使用去重函数处理现当代数据
            poemData = deduplicatePoemData(modernData);
            
            console.log('现当代诗歌数据加载成功:', poemData.length, '个地点');
        } else {
            // 其他朝代使用统一的poem-data.json文件
            const response = await fetch('poem-data.json');
            const allPoemData = await response.json();
            
            // 将poem-data.json格式转换为原始格式，然后使用去重函数
            const rawData = [];
            allPoemData.forEach(location => {
                location.poems.forEach(poem => {
                    rawData.push({
                        final_location: location.name,
                        latitude: location.coordinates[1],
                        longitude: location.coordinates[0],
                        title: poem.title,
                        author: poem.author,
                        literary_form: poem.literary_form || '诗',
                        poem: poem.poem
                    });
                });
            });
            
            // 使用去重函数处理数据
            poemData = deduplicatePoemData(rawData);
            
            console.log('诗歌数据加载成功:', poemData.length, '个地点');
        }
    } catch (error) {
        console.error('加载诗歌数据失败:', error);
        showError('加载诗歌数据失败');
    }
}

// 添加标记点
function addMarkers() {
    if (markersAdded || !map || !styleLoaded) {
        return;
    }
    
    // 清除之前的标记点
    markers.forEach(marker => marker.remove());
    markers = [];
    
    // 使用诗歌数据而不是window.mapLocations
    try {
        poemData.forEach(location => {
            // 创建标记点容器
            const markerContainer = document.createElement('div');
            markerContainer.className = 'marker-container';
            
            // 创建标记点
            const el = document.createElement('div');
            el.className = 'poem-marker';
            
            // 创建地点名称标注
            const label = document.createElement('div');
            label.className = 'location-label';
            label.textContent = location.name;
            
            // 将标记点和标注添加到容器中
            markerContainer.appendChild(el);
            markerContainer.appendChild(label);
            
            // 原始WGS84坐标
            const originalLng = location.coordinates[0];
            const originalLat = location.coordinates[1];
            
            // 使用简化的坐标验证函数
            const coordinates = validateCoordinates(originalLng, originalLat, location.name);
            
            // 使用简化的偏移调整，避免过度偏移
            const lat = coordinates[1];
            const lng = coordinates[0];
            let verticalOffset = 0;
            
            // 基于纬度的轻微调整，减少偏移量避免缩放时大幅偏移
            if (lat < 31.95) {
                // 南部地区 - 极轻微向上偏移
                verticalOffset = 1;
            } else if (lat >= 31.95 && lat < 32.05) {
                // 中部地区 - 无偏移
                verticalOffset = 0;
            } else {
                // 北部地区 - 极轻微向下偏移
                verticalOffset = -1;
            }
            
            console.log(`添加标记点: ${location.name} at [${coordinates[0]}, ${coordinates[1]}] (纬度: ${lat.toFixed(6)}, 偏移: ${verticalOffset}px)`);
            
            const marker = new mapboxgl.Marker({
                element: markerContainer,
                anchor: 'center',  // 使用中心锚点，避免缩放时偏移
                offset: [0, verticalOffset]  // 基于纬度的动态偏移
            })
                .setLngLat(coordinates)
                .addTo(map);
            
            // 存储标记点引用
            markers.push(marker);
            
            // 添加点击事件
            el.addEventListener('click', () => {
                showPoemCards(location);
            });
            
            // 添加悬浮效果（仅改变颜色，不移动位置）
            el.addEventListener('mouseenter', () => {
                el.style.zIndex = '1000';
                el.style.opacity = '0.8';
            });
            
            el.addEventListener('mouseleave', () => {
                el.style.zIndex = '100';
                el.style.opacity = '1';
            });
        });
        markersAdded = true;
    } catch (error) {
        showError('添加标记点失败');
    }
}

// 动态调整标记点偏移以适应不同缩放级别
function adjustMarkersForZoom() {
    if (!map || markers.length === 0) return;
    
    const zoom = map.getZoom();
    console.log(`=== 开始调整标记点偏移，当前缩放级别: ${zoom.toFixed(2)} ===`);
    
    // 修复缩放系数计算 - 避免过度偏移
    let zoomFactor = 1;
    
    if (zoom <= 10) {
        zoomFactor = 1.0; // 极低缩放级别，无额外偏移
    } else if (zoom <= 12) {
        zoomFactor = 1.0; // 低缩放级别，保持标准偏移
    } else if (zoom >= 14) {
        zoomFactor = 0.9; // 高缩放级别，轻微减少偏移
    } else {
        zoomFactor = 1.0; // 标准缩放级别
    }
    
    markers.forEach((marker, index) => {
        if (marker && marker.getElement()) {
            const location = poemData[index];
            if (location) {
                // 简化的偏移计算 - 减少基础偏移量
                const lat = location.coordinates[1];
                let baseVerticalOffset = 0;
                
                if (lat < 31.95) {
                    baseVerticalOffset = 1; // 减少偏移量
                } else if (lat >= 31.95 && lat < 32.05) {
                    baseVerticalOffset = 0;
                } else {
                    baseVerticalOffset = -1; // 减少偏移量
                }
                
                const finalOffset = Math.round(baseVerticalOffset * zoomFactor);
                
                // 获取标记点的 DOM 元素
                const markerElement = marker.getElement();
                
                // 使用更稳定的偏移方式
                if (finalOffset !== 0) {
                    markerElement.style.transform = `translateY(${finalOffset}px)`;
                } else {
                    markerElement.style.transform = 'none';
                }
                
                console.log(`缩放调整: ${location.name} 缩放:${zoom.toFixed(1)} 系数:${zoomFactor.toFixed(2)} 偏移:${finalOffset}px`);
            }
        }
    });
}

// 初始化地图
function initMap() {
    try {
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12', // 先使用标准样式测试
            center: [118.7969, 32.0587],
            zoom: 12,
            minZoom: 10,
            maxZoom: 16,
            maxBounds: nanjingBounds,
            attributionControl: false,
            antialias: true,
            failIfMajorPerformanceCaveat: false,
            // 添加更多配置选项
            renderWorldCopies: false,
            preserveDrawingBuffer: true,
            // 让地图使用样式文件中定义的投影，不强制指定
            // 修复缩放中心点问题
            transformRequest: (url, resourceType) => {
                if (resourceType === 'Source' && url.includes('mapbox')) {
                    return {
                        url: url,
                        headers: {
                            'Cache-Control': 'no-cache'
                        }
                    };
                }
                return { url: url };
            }
        });
        
        map.addControl(new mapboxgl.NavigationControl({
            showCompass: false,
            showZoom: true,
            visualizePitch: false
        }), 'bottom-right');
        
        map.on('load', () => {
            console.log('地图加载完成');
            document.getElementById('loading').style.display = 'none';
            
            map.on('style.load', () => {
                console.log('地图样式加载完成');
                styleLoaded = true;
                addMarkers();
            });
            
            map.on('style.error', (e) => {
                console.error('样式加载失败:', e);
                showError('样式加载失败，使用默认样式');
            });
            
            try {
                // 延迟加载自定义样式，先测试标准样式
                setTimeout(() => {
                    console.log('尝试加载自定义样式:', window.mapStyle);
                    map.setStyle(window.mapStyle || 'mapbox://styles/mapbox/streets-v12');
                }, 1000);
            } catch (error) {
                console.error('设置自定义样式失败:', error);
                showError('设置自定义样式失败');
            }
        });
        
        map.on('error', (e) => {
            const errorMsg = e.error ? e.error.message : '未知错误';
            console.error('地图错误:', errorMsg);
            if (!errorMsg.includes('Style is not done loading')) {
                showError('地图错误：' + errorMsg);
            }
        });
        
        // 添加地图移动事件监听（仅用于调试）
        map.on('moveend', () => {
            console.log('地图移动结束，中心点:', map.getCenter());
        });
        
        map.on('zoomend', () => {
            console.log('地图缩放结束，缩放级别:', map.getZoom());
            // 缩放结束后调整标记点位置
            adjustMarkersForZoom();
        });
        
        // 添加缩放过程中的事件监听，实现平滑调整
        let lastZoomLevel = map.getZoom();
        map.on('zoom', () => {
            const currentZoom = map.getZoom();
            // 每1个缩放级别调整一次，减少频繁调整
            if (Math.abs(currentZoom - lastZoomLevel) >= 1.0) {
                adjustMarkersForZoom();
                lastZoomLevel = currentZoom;
            }
        });
        
        // 移除频繁的标记点位置更新
        // Mapbox GL JS会自动处理标记点的投影转换，无需手动更新
        
    } catch (error) {
        console.error('地图初始化失败:', error);
        showError('地图初始化失败：' + error.message);
    }
}

// 格式化诗歌内容
function formatPoemContent(poemText, literaryForm) {
    if (literaryForm === '词') {
        // 词类保持原样
        return poemText;
    } else {
        // 非词类在句号后添加换行
        return poemText.replace(/。/g, '。\n');
    }
}

// 显示诗歌卡片
function showPoemCards(location) {
    // 清除之前的卡片
    clearPoemCards();
    
    if (!location.poems || location.poems.length === 0) {
        return;
    }
    
    currentPoemCards = location.poems;
    currentCardIndex = 0;
    
    // 创建卡片容器
    const container = document.createElement('div');
    container.className = 'poem-cards-container';
    container.innerHTML = `
        <div class="poem-cards-header">
            <h3>${location.name}</h3>
            <span class="poem-count">共 ${location.poems.length} 首诗歌</span>
            <button class="close-btn" onclick="clearPoemCards()">×</button>
        </div>
        <div class="poem-cards-wrapper">
            ${location.poems.map((poem, index) => `
                <div class="poem-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="poem-title">${poem.title}</div>
                    <div class="poem-author">作者：${poem.author}</div>
                    <div class="poem-content">${formatPoemContent(poem.poem, poem.literary_form)}</div>
                </div>
            `).join('')}
        </div>
        <div class="poem-navigation">
            <button class="nav-btn prev-btn" onclick="switchPoemCard(-1)">← 上一首</button>
            <span class="poem-indicator">${currentCardIndex + 1} / ${location.poems.length}</span>
            <button class="nav-btn next-btn" onclick="switchPoemCard(1)">下一首 →</button>
        </div>
    `;
    
    document.body.appendChild(container);
}

// 清除诗歌卡片
function clearPoemCards() {
    const container = document.querySelector('.poem-cards-container');
    if (container) {
        container.remove();
    }
    currentPoemCards = [];
    currentCardIndex = 0;
}

// 切换诗歌卡片
function switchPoemCard(direction) {
    if (currentPoemCards.length <= 1) return;
    
    const cards = document.querySelectorAll('.poem-card');
    cards[currentCardIndex].classList.remove('active');
    
    currentCardIndex += direction;
    if (currentCardIndex < 0) {
        currentCardIndex = currentPoemCards.length - 1;
    } else if (currentCardIndex >= currentPoemCards.length) {
        currentCardIndex = 0;
    }
    
    cards[currentCardIndex].classList.add('active');
    
    // 更新指示器
    const indicator = document.querySelector('.poem-indicator');
    if (indicator) {
        indicator.textContent = `${currentCardIndex + 1} / ${currentPoemCards.length}`;
    }
}


// 启动地图初始化
async function startApp() {
    await loadPoemData();
    initMap();
}

startApp();

// 检查坐标是否在边界内
function isWithinBounds(point, bounds) {
    return point.lng >= bounds[0][0] && point.lng <= bounds[1][0] &&
           point.lat >= bounds[0][1] && point.lat <= bounds[1][1];
}