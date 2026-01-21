/**
 * 路線優化模組
 * 使用地圖分組 + 最近鄰居法優化藏寶點路線
 */
const RouteOptimizer = (function() {

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

    /**
     * 地圖間排序 - 按藏寶點數量和位置
     * @param {Object} mapGroups - 按地圖分組的藏寶點
     * @returns {Array} 排序後的地圖ID陣列
     */
    function sortMaps(mapGroups) {
        const mapIds = Object.keys(mapGroups).map(Number);
        if (mapIds.length <= 1) return mapIds;

        const result = [];
        const remaining = new Set(mapIds);

        // 從藏寶點最多的地圖開始
        let currentMapId = mapIds.reduce((maxId, id) =>
            mapGroups[id].length > mapGroups[maxId].length ? id : maxId
        , mapIds[0]);

        while (remaining.size > 0) {
            result.push(currentMapId);
            remaining.delete(currentMapId);

            if (remaining.size === 0) break;

            // 找下一個最近的地圖 (用中心點距離)
            const currentCenter = calcCenter(mapGroups[currentMapId]);
            let nearestMapId = null;
            let minDist = Infinity;

            for (const mapId of remaining) {
                const center = calcCenter(mapGroups[mapId]);
                const dist = calcDistance(currentCenter, center);
                if (dist < minDist) {
                    minDist = dist;
                    nearestMapId = mapId;
                }
            }

            currentMapId = nearestMapId;
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

    /**
     * 主優化函數
     * @param {Array} treasures - 藏寶點陣列
     * @param {Object} options - 選項
     * @param {boolean} options.useMapGrouping - 是否按地圖分組 (預設 true)
     * @param {boolean} options.use2Opt - 是否使用 2-opt 改進 (預設 false)
     * @returns {Array} 優化後的藏寶點陣列
     */
    function optimize(treasures, options = {}) {
        const {
            useMapGrouping = true,
            use2Opt = false
        } = options;

        if (!treasures || treasures.length <= 1) {
            return treasures ? [...treasures] : [];
        }

        let result;

        if (useMapGrouping) {
            // 按地圖分組優化
            const mapGroups = groupByMap(treasures);
            const sortedMapIds = sortMaps(mapGroups);

            result = [];
            let lastCoords = null;

            for (const mapId of sortedMapIds) {
                // 地圖內排序，考慮上一個地圖的結束位置
                const sorted = sortWithinMap(mapGroups[mapId], lastCoords);
                result.push(...sorted);

                // 記錄這個地圖的最後位置
                if (sorted.length > 0) {
                    lastCoords = sorted[sorted.length - 1].coords;
                }
            }
        } else {
            // 全局最近鄰居法
            result = sortWithinMap(treasures);
        }

        // 可選：2-opt 改進
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
