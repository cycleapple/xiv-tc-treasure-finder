// Firebase Configuration
// =====================
// 請至 https://console.firebase.google.com/ 建立專案並取得設定
// 1. 建立新專案或選擇現有專案
// 2. 在專案設定中找到「您的應用程式」
// 3. 點擊「新增應用程式」選擇 Web
// 4. 複製 firebaseConfig 內容到下方
// 5. 啟用 Authentication > Anonymous 登入
// 6. 啟用 Realtime Database

const firebaseConfig = {
    apiKey: "AIzaSyAKHBoYCzKcp0FJLhrmS3HTiOz82r2a9OM",
    authDomain: "ffxiv-treasure-hunt.firebaseapp.com",
    databaseURL: "https://ffxiv-treasure-hunt-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ffxiv-treasure-hunt",
    storageBucket: "ffxiv-treasure-hunt.firebasestorage.app",
    messagingSenderId: "575722586919",
    appId: "1:575722586919:web:372bb33d00f09b2fb29f02"
};

// 檢查是否已設定 Firebase
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// Firebase 模組參考 (由 SDK 載入後設定)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

// 初始化 Firebase
async function initializeFirebase() {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase 尚未設定，隊伍功能將無法使用');
        return false;
    }

    try {
        // 使用 ES Module 方式載入 Firebase (v12.8.0)
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js');
        const { getAuth, signInAnonymously, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js');
        const { getDatabase, ref, set, get, push, remove, onValue, off, serverTimestamp, runTransaction, onDisconnect } = await import('https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js');

        // 初始化應用程式
        firebaseApp = initializeApp(firebaseConfig);
        firebaseAuth = getAuth(firebaseApp);
        firebaseDb = getDatabase(firebaseApp);

        // 匯出 Firebase 方法供其他模組使用
        window.FirebaseSDK = {
            auth: firebaseAuth,
            db: firebaseDb,
            signInAnonymously,
            onAuthStateChanged,
            ref,
            set,
            get,
            push,
            remove,
            onValue,
            off,
            serverTimestamp,
            runTransaction,
            onDisconnect
        };

        console.log('Firebase 初始化成功');
        return true;
    } catch (error) {
        console.error('Firebase 初始化失敗:', error);
        return false;
    }
}

// 匯出
window.FirebaseConfig = {
    config: firebaseConfig,
    isConfigured: isFirebaseConfigured,
    initialize: initializeFirebase
};
