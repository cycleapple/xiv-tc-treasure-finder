/**
 * 路線優化模組
 * 使用地圖分組 + 最近鄰居法優化藏寶點路線
 */
const RouteOptimizer = (function() {

    /**
     * 地圖區域分組 - 相近的地圖放在同一組
     * 組內的地圖會優先排在一起
     * 格式: { 區域名稱: [mapId1, mapId2, ...] }
     */
    const MAP_REGION_GROUPS = {
        // 4.0 紅蓮 - 基拉巴尼亞區
        'gyr_abania': [367, 368, 369],  // 基拉巴尼亞邊區、山區、湖區
        // 4.0 紅蓮 - 東方區
        'othard': [371, 354, 372],       // 紅玉海、延夏、太陽神草原
        // 3.0 蒼天 - 伊修加德區
        'ishgard': [211, 212, 213, 214, 215],  // 庫爾札斯西部高地、德拉瓦尼亞山麓地、河谷地、雲海、阿巴拉提亞雲海
        // 5.0 暗影 - 諾弗蘭特區
        'norvrandt': [491, 492, 493, 494, 495, 496],  // 雷克蘭德、珂露西亞島、安穆艾蘭、伊爾美格、拉凱提卡大森林、黑風海
        // 6.0 曉月 - 北洲區
        'ew_north': [695, 696],          // 迷津、薩維奈島
        // 6.0 曉月 - 終局區
        'ew_endgame': [698, 699, 700],   // 嘆息海、天外天垓、厄爾庇斯
        // 7.0 黃金 - 新世界區
        'dt_tural': [857, 858, 859],     // 奧闊帕恰山、克扎瑪烏卡濕地、亞克特爾樹海
        // 7.0 黃金 - 遺產區
        'dt_solution': [860, 861, 862]   // 夏勞尼荒野、遺產之地、憶想之地
    };

    /**
     * 取得地圖所屬的區域
     * @param {number} mapId - 地圖 ID
     * @returns {string|null} 區域名稱，若無則返回 null
     */
    function getMapRegion(mapId) {
        for (const [region, mapIds] of Object.entries(MAP_REGION_GROUPS)) {
            if (mapIds.includes(mapId)) {
                return region;
            }
        }
        return null;
    }

    /**
     * 計算兩點間的歐幾里得距離
     */
    function calcDistance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    /**
     * 按地圖分組藏寶點
     */
    function groupByMap(treasures) {
        return treasures.reduce((groups, treasure) => {
            const mapId = treasure.mapId;
            if (!groups[mapId]) groups[mapId] = [];
            groups[mapId].push(treasure);
            return groups;
        }, {});
    }

    /**
     * 計算一組藏寶點的中心座標
     */
    function calcCenter(treasures) {
        if (treasures.length === 0) return { x: 20, y: 20 };
        const sum = treasures.reduce((acc, t) => ({
            x: acc.x + t.coords.x,
            y: acc.y + t.coords.y
        }), { x: 0, y: 0 });
        return {
            x: sum.x / treasures.length,
            y: sum.y / treasures.length
        };
    }

    /**
     * 地圖內排序 - 最近鄰居法
     * @param {Array} treasures - 同一地圖的藏寶點陣列
     * @param {Object} startCoords - 起始座標 (可選，預設用第一個藏寶點)
     */
    function sortWithinMap(treasures, startCoords = null) {
        if (treasures.length <= 1) return [...treasures];

        const result = [];
        const remaining = [...treasures];

        // 選擇起始點
        let currentIdx = 0;
        if (startCoords) {
            // 找離起始座標最近的藏寶點
            let minDist = Infinity;
            remaining.forEach((t, idx) => {
                const dist = calcDistance(startCoords, t.coords);
                if (dist < minDist) {
                    minDist = dist;
                    currentIdx = idx;
                }
            });
        }

        // 最近鄰居法
        while (remaining.length > 0) {
            const current = remaining.splice(currentIdx, 1)[0];
            result.push(current);

            if (remaining.length === 0) break;

            // 找下一個最近的點
            let nearestIdx = 0;
            let minDist = Infinity;
            remaining.forEach((t, idx) => {
                const dist = calcDistance(current.coords, t.coords);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = idx;
                }
            });
            currentIdx = nearestIdx;
        }

        return result;
    }

    function sortMaps(mapGroups, startMapId = null) {
        const mapIds = Object.keys(mapGroups).map(Number);
        if (mapIds.length <= 1) return mapIds;

        const regionGroups = {};
        const ungroupedMaps = [];

        for (const mapId of mapIds) {
            const region = getMapRegion(mapId);
            if (region) {
                if (!regionGroups[region]) regionGroups[region] = [];
                regionGroups[region].push(mapId);
            } else {
                ungroupedMaps.push(mapId);
            }
        }

        const startRegion = startMapId ? getMapRegion(startMapId) : null;

        const regionTreasureCounts = {};
        for (const [region, regionMapIds] of Object.entries(regionGroups)) {
            regionTreasureCounts[region] = regionMapIds.reduce(
                (sum, id) => sum + mapGroups[id].length, 0
            );
        }

        const sortedRegions = Object.keys(regionGroups).sort((a, b) => {
            if (startRegion) {
                if (a === startRegion) return -1;
                if (b === startRegion) return 1;
            }
            return regionTreasureCounts[b] - regionTreasureCounts[a];
        });

        for (const region of sortedRegions) {
            regionGroups[region].sort((a, b) => {
                if (startMapId && region === startRegion) {
                    if (a === startMapId) return -1;
                    if (b === startMapId) return 1;
                }
                return mapGroups[b].length - mapGroups[a].length;
            });
        }

        ungroupedMaps.sort((a, b) => {
            if (startMapId && !startRegion) {
                if (a === startMapId) return -1;
                if (b === startMapId) return 1;
            }
            return mapGroups[b].length - mapGroups[a].length;
        });

        const result = [];

        if (startMapId && !startRegion && ungroupedMaps.includes(startMapId)) {
            result.push(...ungroupedMaps);
            for (const region of sortedRegions) {
                result.push(...regionGroups[region]);
            }
        } else {
            for (const region of sortedRegions) {
                result.push(...regionGroups[region]);
            }
            result.push(...ungroupedMaps);
        }

        return result;
    }

    /**
     * 2-opt 改進 (可選)
     * 嘗試交換路段來縮短總距離
     */
    function improve2Opt(treasures, maxIterations = 50) {
        if (treasures.length <= 3) return [...treasures];

        let route = [...treasures];
        let improved = true;
        let iteration = 0;

        while (improved && iteration < maxIterations) {
            improved = false;
            iteration++;

            for (let i = 0; i < route.length - 2; i++) {
                for (let k = i + 2; k < route.length; k++) {
                    // 計算交換前後的距離差
                    const d1 = calcDistance(route[i].coords, route[i + 1].coords);
                    const d2 = calcDistance(route[k].coords, route[(k + 1) % route.length].coords);
                    const d3 = calcDistance(route[i].coords, route[k].coords);
                    const d4 = calcDistance(route[i + 1].coords, route[(k + 1) % route.length].coords);

                    if (d3 + d4 < d1 + d2) {
                        // 反轉 [i+1, k] 區段
                        const reversed = route.slice(i + 1, k + 1).reverse();
                        route = [
                            ...route.slice(0, i + 1),
                            ...reversed,
                            ...route.slice(k + 1)
                        ];
                        improved = true;
                    }
                }
            }
        }

        return route;
    }

    /**
     * 計算路線總距離
     */
    function calcTotalDistance(treasures) {
        if (treasures.length <= 1) return 0;

        let total = 0;
        for (let i = 0; i < treasures.length - 1; i++) {
            total += calcDistance(treasures[i].coords, treasures[i + 1].coords);
        }
        return total;
    }

    function optimize(treasures, options = {}) {
        const {
            useMapGrouping = true,
            use2Opt = false,
            startTreasure = null
        } = options;

        if (!treasures || treasures.length <= 1) {
            return treasures ? [...treasures] : [];
        }

        let result;

        if (useMapGrouping) {
            const mapGroups = groupByMap(treasures);
            const startMapId = startTreasure ? startTreasure.mapId : null;
            const sortedMapIds = sortMaps(mapGroups, startMapId);

            result = [];
            let lastCoords = startTreasure ? startTreasure.coords : null;

            for (const mapId of sortedMapIds) {
                const sorted = sortWithinMap(mapGroups[mapId], lastCoords);
                result.push(...sorted);

                if (sorted.length > 0) {
                    lastCoords = sorted[sorted.length - 1].coords;
                }
            }
        } else {
            const startCoords = startTreasure ? startTreasure.coords : null;
            result = sortWithinMap(treasures, startCoords);
        }

        if (use2Opt) {
            result = improve2Opt(result);
        }

        return result;
    }

    /**
     * 分析路線
     */
    function analyzeRoute(treasures) {
        if (!treasures || treasures.length === 0) {
            return { totalDistance: 0, mapCount: 0, mapJumps: 0 };
        }

        const mapIds = new Set(treasures.map(t => t.mapId));
        let mapJumps = 0;

        for (let i = 1; i < treasures.length; i++) {
            if (treasures[i].mapId !== treasures[i - 1].mapId) {
                mapJumps++;
            }
        }

        return {
            totalDistance: calcTotalDistance(treasures),
            mapCount: mapIds.size,
            mapJumps: mapJumps
        };
    }

    // 公開 API
    return {
        optimize,
        analyzeRoute,
        groupByMap,
        sortWithinMap,
        sortMaps,
        improve2Opt,
        calcDistance,
        calcTotalDistance
    };
})();

// 全域存取
window.RouteOptimizer = RouteOptimizer;
