import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

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
const auth = getAuth(app);

// ==========================================
// 유틸리티 함수
// ==========================================
var formatCurrency = function(n) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

function updateConnectionStatus(online) {
    var statusEl = document.getElementById('firebaseStatus');
    if (!statusEl) return;
    if (online) {
        statusEl.innerHTML = "<i class='bx bx-data'></i> NAS API 연결됨";
        statusEl.style.color = 'var(--success)';
    } else {
        statusEl.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 연결 중...";
        statusEl.style.color = 'var(--warning)';
    }
}

// ==========================================
// API 설정
// ==========================================
const API_BASE = 'https://kng.junparks.com/api/seller-k/products';

// ==========================================
// 앱 상태
// ==========================================
var products = [];
var editingId = null;

// ==========================================
// 데이터 로드
// ==========================================
function loadProducts() {
    updateConnectionStatus(false);
    fetch(API_BASE)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            products = data || [];
            renderTable();
            updateConnectionStatus(true);
        })
        .catch(function(err) {
            console.error('API Error:', err);
            showToast('데이터를 불러오는데 실패했습니다.', 'error');
            updateConnectionStatus(false);
            document.getElementById('skTableBody').innerHTML =
                '<tr><td colspan="17" style="text-align:center; padding:30px;">API 서버 연결 실패</td></tr>';
        });
}

// ==========================================
// 계산 함수
// ==========================================
function generateId() {
    return 'sk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

function calcCommission(sellPrice, sellShipping) {
    var baseExt = sellPrice + sellShipping;
    var orderFee = Math.round(baseExt * 0.0363);
    var salesFee = Math.round(sellPrice * 0.03);
    return orderFee + salesFee;
}

function calcBuyTotal(buyPrice, buyShipping, shippingBasis, shippingQty) {
    if (!buyPrice) buyPrice = 0;
    if (!buyShipping) buyShipping = 0;
    var finalShipping = 0;
    if (shippingBasis === '무료') {
        finalShipping = 0;
    } else if (shippingBasis 