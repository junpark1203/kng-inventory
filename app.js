import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { 
    getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
    onSnapshot, runTransaction, writeBatch, query 
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDqdzlXTddvoBYWaVbTM7_ERO_rUGWjIgE",
    authDomain: "kng-inventory.firebaseapp.com",
    projectId: "kng-inventory",
    storageBucket: "kng-inventory.firebasestorage.app",
    messagingSenderId: "647181899026",
    appId: "1:647181899026:web:7cd3b62a7a10771b204fcb",
    measurementId: "G-5VYMDB59XD"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ==========================================
// Firestore 보안 경고
// ==========================================
console.warn(
    "[보안 알림] Firestore Security Rules를 반드시 설정하세요.\n" +
    "Firebase Console > Firestore > Rules 에서 인증된 사용자만 접근하도록 제한해야 합니다.\n" +
    "현재 API 키가 클라이언트에 노출되어 있으므로, Rules가 유일한 보안 장벽입니다."
);

// ==========================================
// 유틸리티 함수
// ==========================================
const formatCurrency = (number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(number);

/** XSS 방지용 HTML 이스케이프 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** 토스트 알림 (alert 대체) */
function showToast(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;
    
    var icons = {
        success: 'bx-check-circle',
        error: 'bx-error-circle',
        warning: 'bx-error',
        info: 'bx-info-circle'
    };
    
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = "<i class='bx " + (icons[type] || icons.info) + "'></i> <span>" + escapeHtml(message) + "</span>";
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.classList.add('fade-out');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}

/** Firebase 연결 상태 업데이트 */
function updateConnectionStatus(online) {
    var statusEl = document.getElementById('firebaseStatus');
    if (!statusEl) return;
    
    if (online) {
        statusEl.innerHTML = "<i class='bx bxl-firebase'></i> Firebase Online";
        statusEl.style.color = 'var(--success)';
    } else {
        statusEl.innerHTML = "<i class='bx bx-error-circle'></i> Offline";
        statusEl.style.color = 'var(--danger)';
    }
}

// 브라우저 온라인/오프라인 감지
window.addEventListener('online', function() { updateConnectionStatus(true); });
window.addEventListener('offline', function() { updateConnectionStatus(false); });

// ==========================================
// 초기 상품 데이터 (첫 DB 셋업용)
// ==========================================
var rawProducts = [
  { id: 'p1', brand: "K2 세이프티", name: "K2 세이프티 쿨 바라클라바 (블랙)", color: "블랙", size: "FREE", stock: 5, buyPrice: 9500, sellPrice: 12000 },
  { id: 'p2', brand: "K2 세이프티", name: "K2 세이프티 베이직 쿨토시", color: "화이트", size: "FREE", stock: 10, buyPrice: 3700, sellPrice: 4700 },
  { id: 'p3', brand: "K2 세이프티", name: "K2 세이프티 베이직 쿨토시", color: "블랙", size: "FREE", stock: 10, buyPrice: 3700, sellPrice: 4700 },
  { id: 'p4', brand: "K2 세이프티