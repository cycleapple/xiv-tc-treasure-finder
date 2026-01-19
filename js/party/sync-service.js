// Sync Service
// =============
// 處理即時同步監聽

const SyncService = (function() {
    // 監聽器引用
    let membersUnsubscribe = null;
    let treasuresUnsubscribe = null;
    let connectionUnsubscribe = null;
    let metaUnsubscribe = null;

    // 連線狀態
    let isConnected = false;

    // 回調函數
    let callbacks = {
        onMembersChange: null,
        onTreasuresChange: null,
        onConnectionChange: null,
        onMetaChange: null,
        onError: null
    };

    // 取得 Firebase 參考
    function getRef(path) {
        const sdk = window.FirebaseSDK;
        if (!sdk) throw new Error('Firebase SDK 尚未載入');
        return sdk.ref(sdk.db, path);
    }

    // 開始同步
    function startSync(partyCode) {
        const sdk = window.FirebaseSDK;
        if (!sdk) {
            console.error('Firebase SDK 尚未載入');
            return;
        }

        if (!partyCode) {
            console.error('未提供隊伍代碼');
            return;
        }

        // 先停止現有同步
        stopSync();

        console.log(`開始同步隊伍: ${partyCode}`);

        // 監聽成員變化
        const membersRef = getRef(`parties/${partyCode}/members`);
        sdk.onValue(membersRef, (snapshot) => {
            const members = snapshot.val() || {};
            console.log('成員更新:', Object.keys(members).length, '人');
            if (callbacks.onMembersChange) {
                callbacks.onMembersChange(members);
            }
        }, (error) => {
            console.error('成員同步錯誤:', error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        });

        // 保存取消監聽函數
        membersUnsubscribe = () => sdk.off(membersRef);

        // 監聽藏寶圖變化
        const treasuresRef = getRef(`parties/${partyCode}/treasures`);
        sdk.onValue(treasuresRef, (snapshot) => {
            const treasures = snapshot.val() || {};
            const treasureArray = Object.values(treasures);
            console.log('藏寶圖更新:', treasureArray.length, '個');
            if (callbacks.onTreasuresChange) {
                callbacks.onTreasuresChange(treasureArray);
            }
        }, (error) => {
            console.error('藏寶圖同步錯誤:', error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        });

        treasuresUnsubscribe = () => sdk.off(treasuresRef);

        // 監聽隊伍元資料變化 (過期時間等)
        const metaRef = getRef(`parties/${partyCode}/meta`);
        sdk.onValue(metaRef, (snapshot) => {
            const meta = snapshot.val() || {};
            console.log('隊伍元資料更新:', meta);
            if (callbacks.onMetaChange) {
                callbacks.onMetaChange(meta);
            }
        }, (error) => {
            console.error('元資料同步錯誤:', error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        });

        metaUnsubscribe = () => sdk.off(metaRef);

        // 監聽連線狀態
        const connectedRef = getRef('.info/connected');
        sdk.onValue(connectedRef, (snapshot) => {
            isConnected = snapshot.val() === true;
            console.log('連線狀態:', isConnected ? '已連線' : '離線');
            if (callbacks.onConnectionChange) {
                callbacks.onConnectionChange(isConnected);
            }
        });

        connectionUnsubscribe = () => sdk.off(connectedRef);
    }

    // 停止同步
    function stopSync() {
        if (membersUnsubscribe) {
            membersUnsubscribe();
            membersUnsubscribe = null;
        }
        if (treasuresUnsubscribe) {
            treasuresUnsubscribe();
            treasuresUnsubscribe = null;
        }
        if (metaUnsubscribe) {
            metaUnsubscribe();
            metaUnsubscribe = null;
        }
        if (connectionUnsubscribe) {
            connectionUnsubscribe();
            connectionUnsubscribe = null;
        }
        console.log('已停止同步');
    }

    // 設定成員變化回調
    function onMembersChange(callback) {
        callbacks.onMembersChange = callback;
    }

    // 設定藏寶圖變化回調
    function onTreasuresChange(callback) {
        callbacks.onTreasuresChange = callback;
    }

    // 設定連線狀態變化回調
    function onConnectionChange(callback) {
        callbacks.onConnectionChange = callback;
    }

    // 設定隊伍元資料變化回調
    function onMetaChange(callback) {
        callbacks.onMetaChange = callback;
    }

    // 設定錯誤回調
    function onError(callback) {
        callbacks.onError = callback;
    }

    // 取得連線狀態
    function getConnectionStatus() {
        return isConnected;
    }

    // 移除所有回調
    function clearCallbacks() {
        callbacks = {
            onMembersChange: null,
            onTreasuresChange: null,
            onConnectionChange: null,
            onMetaChange: null,
            onError: null
        };
    }

    return {
        startSync,
        stopSync,
        onMembersChange,
        onTreasuresChange,
        onConnectionChange,
        onMetaChange,
        onError,
        getConnectionStatus,
        clearCallbacks
    };
})();

// 匯出
window.SyncService = SyncService;
