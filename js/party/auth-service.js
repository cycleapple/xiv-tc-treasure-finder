// Authentication Service
// =======================
// 處理 Firebase 匿名登入

const AuthService = (function() {
    let currentUser = null;
    let authStateCallbacks = [];
    let isInitialized = false;

    // 初始化認證服務
    async function initialize() {
        if (isInitialized) return currentUser;

        const sdk = window.FirebaseSDK;
        if (!sdk) {
            console.warn('Firebase SDK 尚未載入');
            return null;
        }

        return new Promise((resolve) => {
            sdk.onAuthStateChanged(sdk.auth, (user) => {
                currentUser = user;
                isInitialized = true;
                authStateCallbacks.forEach(cb => cb(user));
                resolve(user);
            });
        });
    }

    // 匿名登入
    async function signIn() {
        const sdk = window.FirebaseSDK;
        if (!sdk) {
            throw new Error('Firebase SDK 尚未載入');
        }

        try {
            const result = await sdk.signInAnonymously(sdk.auth);
            currentUser = result.user;
            return currentUser;
        } catch (error) {
            console.error('匿名登入失敗:', error);
            throw error;
        }
    }

    // 確保已登入 (如果未登入則自動登入)
    async function ensureSignedIn() {
        if (currentUser) return currentUser;

        // 等待初始化完成
        await initialize();

        if (currentUser) return currentUser;

        // 尚未登入，執行匿名登入
        return await signIn();
    }

    // 取得當前使用者
    function getUser() {
        return currentUser;
    }

    // 取得使用者 ID
    function getUserId() {
        return currentUser?.uid || null;
    }

    // 監聽認證狀態變化
    function onAuthStateChange(callback) {
        authStateCallbacks.push(callback);
        // 如果已有使用者，立即呼叫
        if (currentUser) {
            callback(currentUser);
        }
        // 返回取消監聽函數
        return () => {
            const index = authStateCallbacks.indexOf(callback);
            if (index > -1) {
                authStateCallbacks.splice(index, 1);
            }
        };
    }

    // 檢查是否已登入
    function isSignedIn() {
        return currentUser !== null;
    }

    return {
        initialize,
        signIn,
        ensureSignedIn,
        getUser,
        getUserId,
        onAuthStateChange,
        isSignedIn
    };
})();

// 匯出
window.AuthService = AuthService;
