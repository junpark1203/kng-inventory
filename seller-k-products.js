import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

// Firebase 설정 (인증 전용)
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
var formatCurrency = function(n) { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n); };

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var icons = { success: 'bx-check-circle', error: 'bx-error-circle', warning: 'bx-error', info: 'bx-info-circle' };
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
        statusEl.innerHTML = "<i class='bx bx-data'></i> localStorage";
        statusEl.style.color = 'var(--warning)';
    } else {
        statusEl.innerHTML = "<i class='bx bx-error-circle'></i> Offline";
        statusEl.style.color = 'var(--danger)';
    }
}

// ==========================================
// 데이터 저장소 (localStorage 임시 → 추후 NAS API)
// ==========================================
var SK_STORAGE_KEY = 'kng_seller_k_products';

function loadProducts() {
    try {
        var data = localStorage.getItem(SK_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch(e) {
        return [];
    }
}

function saveProducts(products) {
    localStorage.setItem(SK_STORAGE_KEY, JSON.stringify(products));
}

function generateId() {
    return 'sk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ==========================================
// 수수료 및 정산 계산 로직
// ==========================================
// 매출수수료 = (판매가 + 운임) × 3.63% + 판매가 × 3%
// * 판매가와 운임은 VAT포함 금액으로 계산
function calcCommission(sellPriceVatIncl, sellShippingVatIncl) {
    var orderFee = (sellPriceVatIncl + sellShippingVatIncl) * 0.0363;
    var salesFee = sellPriceVatIncl * 0.03;
    return Math.round(orderFee + salesFee);
}

// 매입합계 = 매입가(공급가) + 운임(공급가) → VAT별도 기준
function calcBuyTotal(buyPrice, buyShipping, shippingBasis, shippingQty) {
    var effectiveShipping = buyShipping || 0;
    if (shippingBasis === '무료') {
        effectiveShipping = 0;
    } else if (shippingBasis === '수량별' && shippingQty > 1) {
        effectiveShipping = Math.round(buyShipping / shippingQty);
    }
    return (buyPrice || 0) + effectiveShipping;
}

// 매출합계 = 판매가 + 운임 (VAT포함 기준)
function calcSellTotal(sellPrice, sellShipping) {
    return (sellPrice || 0) + (sellShipping || 0);
}

// 정산이익 = 매출합계(VAT포함) - 매입합계(VAT포함으로 변환) - 수수료
function calcProfit(buyTotal, sellTotal, commission) {
    var buyTotalWithVat = Math.round(buyTotal * 1.1);
    return sellTotal - buyTotalWithVat - commission;
}

// 수익률 = 정산이익 / 매출합계 × 100
function calcProfitRate(profit, sellTotal) {
    if (sellTotal <= 0) return 0;
    return (profit / sellTotal * 100);
}

// ==========================================
// 앱 상태
// ==========================================
var products = [];
var skPage = 1;
var PER_PAGE = 20;
var skSort = { col: 'uploadDate', asc: false };
var editingId = null;

// ==========================================
// 테이블 렌더링
// ==========================================
function renderTable() {
    var tbody = document.getElementById('skTableBody');
    tbody.innerHTML = '';

    var filtered = products.slice();

    // 검색 필터
    var searchEl = document.getElementById('skSearchInput');
    var fieldEl = document.getElementById('skSearchField');
    var globalSearch = document.getElementById('searchInput');
    
    var searchTerm = '';
    if (globalSearch && globalSearch.value.trim()) {
        searchTerm = globalSearch.value.trim().toLowerCase();
    }
    if (searchEl && searchEl.value.trim()) {
        searchTerm = searchEl.value.trim().toLowerCase();
    }
    
    var searchField = fieldEl ? fieldEl.value : 'all';
    
    if (searchTerm) {
        filtered = filtered.filter(function(p) {
            if (searchField === 'all') {
                return (p.supplier || '').toLowerCase().includes(searchTerm) ||
                    (p.brand || '').toLowerCase().includes(searchTerm) ||
                    (p.name || '').toLowerCase().includes(searchTerm) ||
                    (p.color || '').toLowerCase().includes(searchTerm) ||
                    (p.size || '').toLowerCase().includes(searchTerm);
            } else {
                return (p[searchField] || '').toLowerCase().includes(searchTerm);
            }
        });
    }

    // 정렬
    filtered.sort(function(a, b) {
        var valA, valB;
        var col = skSort.col;
        
        if (['buyPrice', 'buyShipping', 'buyTotal', 'sellPrice', 'sellShipping', 'sellTotal', 'commission', 'profit', 'profitRate'].indexOf(col) >= 0) {
            valA = getCalcValue(a, col);
            valB = getCalcValue(b, col);
        } else {
            valA = a[col] || '';
            valB = b[col] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
        }
        
        if (valA < valB) return skSort.asc ? -1 : 1;
        if (valA > valB) return skSort.asc ? 1 : -1;
        return 0;
    });

    // 페이지네이션
    var total = filtered.length;
    var totalPages = Math.ceil(total / PER_PAGE);
    if (skPage > totalPages) skPage = Math.max(1, totalPages);
    var start = (skPage - 1) * PER_PAGE;
    var paged = filtered.slice(start, start + PER_PAGE);

    if (paged.length === 0) {
        tbody.innerHTML = '<tr><td colspan="17" class="empty-state"><div>' +
            '<i class="bx bx-inbox"></i><p>등록된 매입상품이 없습니다</p>' +
            '<span class="hint">"신규 추가" 버튼을 눌러 상품을 등록하세요</span></div></td></tr>';
        renderPagination(total);
        return;
    }

    paged.forEach(function(p) {
        var tr = document.createElement('tr');
        
        var buyTotal = calcBuyTotal(p.buyPrice, p.buyShipping, p.shippingBasis, p.shippingQty);
        var sellTotal = calcSellTotal(p.sellPrice, p.sellShipping);
        var commission = calcCommission(p.sellPrice || 0, p.sellShipping || 0);
        var profit = calcProfit(buyTotal, sellTotal, commission);
        var profitRate = calcProfitRate(profit, sellTotal);

        var profitClass = profit >= 0 ? '' : ' style="color:var(--danger)"';
        var rateClass = profitRate >= 0 ? '' : ' style="color:var(--danger)"';

        var shippingBasisDisplay = p.shippingBasis || '-';
        if (p.shippingBasis === '수량별' && p.shippingQty > 1) {
            shippingBasisDisplay = p.shippingQty + '개당';
        }

        tr.innerHTML =
            '<td><input type="checkbox" class="sk-checkbox" value="' + escapeHtml(p.id) + '"></td>' +
            '<td>' + escapeHtml(p.supplier) + '</td>' +
            '<td>' + escapeHtml(p.brand) + '</td>' +
            '<td>' + escapeHtml(p.name) + '</td>' +
            '<td>' + escapeHtml(p.color) + '</td>' +
            '<td>' + escapeHtml(p.size) + '</td>' +
            '<td>' + escapeHtml(p.uploadDate || '-') + '</td>' +
            // 매입
            '<td class="col-num-sm">' + formatCurrency(p.buyPrice || 0) + '</td>' +
            '<td class="col-num-sm">' + formatCurrency(p.buyShipping || 0) + '</td>' +
            '<td style="font-size:10.5px;text-align:center">' + escapeHtml(shippingBasisDisplay) + '</td>' +
            '<td class="col-num-sm" style="font-weight:600">' + formatCurrency(buyTotal) + '</td>' +
            // 매출
            '<td class="col-num-sm">' + formatCurrency(p.sellPrice || 0) + '</td>' +
            '<td class="col-num-sm">' + formatCurrency(p.sellShipping || 0) + '</td>' +
            '<td class="col-num-sm" style="font-weight:600">' + formatCurrency(sellTotal) + '</td>' +
            // 정산
            '<td class="col-num-sm">' + formatCurrency(commission) + '</td>' +
            '<td class="col-num-sm"' + profitClass + ' style="font-weight:600">' + formatCurrency(profit) + '</td>' +
            '<td class="col-num-sm"' + rateClass + '>' + profitRate.toFixed(1) + '%</td>' +
            // 관리
            '<td class="col-action-sk">' +
                '<button class="btn-action" onclick="editProduct(\'' + escapeHtml(p.id) + '\')"><i class="bx bx-edit-alt"></i> 수정</button>' +
            '</td>';
        tbody.appendChild(tr);
    });

    renderPagination(total);
    updateKPI();
}

function getCalcValue(p, col) {
    var buyTotal = calcBuyTotal(p.buyPrice, p.buyShipping, p.shippingBasis, p.shippingQty);
    var sellTotal = calcSellTotal(p.sellPrice, p.sellShipping);
    var commission = calcCommission(p.sellPrice || 0, p.sellShipping || 0);
    var profit = calcProfit(buyTotal, sellTotal, commission);

    switch(col) {
        case 'buyPrice': return p.buyPrice || 0;
        case 'buyShipping': return p.buyShipping || 0;
        case 'buyTotal': return buyTotal;
        case 'sellPrice': return p.sellPrice || 0;
        case 'sellShipping': return p.sellShipping || 0;
        case 'sellTotal': return sellTotal;
        case 'commission': return commission;
        case 'profit': return profit;
        case 'profitRate': return calcProfitRate(profit, sellTotal);
        default: return 0;
    }
}

// ==========================================
// KPI 업데이트
// ==========================================
function updateKPI() {
    var totalItems = products.length;
    var totalPurchase = 0;
    var totalSales = 0;
    var totalProfit = 0;

    products.forEach(function(p) {
        var buyTotal = calcBuyTotal(p.buyPrice, p.buyShipping, p.shippingBasis, p.shippingQty);
        var sellTotal = calcSellTotal(p.sellPrice, p.sellShipping);
        var commission = calcCommission(p.sellPrice || 0, p.sellShipping || 0);
        var profit = calcProfit(buyTotal, sellTotal, commission);

        totalPurchase += buyTotal;
        totalSales += sellTotal;
        totalProfit += profit;
    });

    document.getElementById('kpiTotalItems').textContent = totalItems.toLocaleString();
    document.getElementById('kpiTotalPurchase').textContent = formatCurrency(totalPurchase);
    document.getElementById('kpiTotalSales').textContent = formatCurrency(totalSales);
    document.getElementById('kpiTotalProfit').textContent = formatCurrency(totalProfit);
}

// ==========================================
// 페이지네이션
// ==========================================
window.goSkPage = function(page) {
    skPage = page;
    renderTable();
};

function renderPagination(totalItems) {
    var container = document.getElementById('skPagination');
    if (!container) return;
    var totalPages = Math.ceil(totalItems / PER_PAGE);

    if (totalItems === 0) {
        container.innerHTML = '<span class="page-info">데이터 없음</span>';
        return;
    }
    if (totalPages <= 1) {
        container.innerHTML = '<span class="page-info">총 ' + totalItems + '건</span>';
        return;
    }

    var html = '<button class="page-btn" ' + (skPage === 1 ? 'disabled' : '') + ' onclick="goSkPage(' + (skPage - 1) + ')">‹ 이전</button>';
    var startP = Math.max(1, skPage - 2);
    var endP = Math.min(totalPages, startP + 4);
    if (endP - startP < 4) startP = Math.max(1, endP - 4);

    for (var i = startP; i <= endP; i++) {
        html += '<button class="page-btn ' + (i === skPage ? 'active' : '') + '" onclick="goSkPage(' + i + ')">' + i + '</button>';
    }
    html += '<button class="page-btn" ' + (skPage === totalPages ? 'disabled' : '') + ' onclick="goSkPage(' + (skPage + 1) + ')">다음 ›</button>';
    html += '<span class="page-info">' + totalItems + '건 중 ' + ((skPage-1)*PER_PAGE + 1) + '–' + Math.min(skPage*PER_PAGE, totalItems) + '</span>';
    container.innerHTML = html;
}

// ==========================================
// 모달 팝업 — 신규 추가 / 수정
// ==========================================
function openModal(id) {
    editingId = id || null;
    var modal = document.getElementById('skModal');
    var form = document.getElementById('skForm');
    form.reset();
    document.getElementById('skEditId').value = '';

    if (editingId) {
        document.getElementById('skModalTitle').textContent = '매입상품 수정';
        document.getElementById('saveSkBtn').innerHTML = "<i class='bx bx-save'></i> 수정 저장";
        var p = products.find(function(item) { return item.id === editingId; });
        if (p) {
            document.getElementById('skEditId').value = p.id;
            document.getElementById('skSupplier').value = p.supplier || '';
            document.getElementById('skBrand').value = p.brand || '';
            document.getElementById('skName').value = p.name || '';
            document.getElementById('skColor').value = p.color || '';
            document.getElementById('skSize').value = p.size || '';
            document.getElementById('skUploadDate').value = p.uploadDate || '';
            document.getElementById('skBuyPrice').value = p.buyPrice || 0;
            document.getElementById('skBuyShipping').value = p.buyShipping || 0;
            document.getElementById('skShippingBasis').value = p.shippingBasis || '수량별';
            document.getElementById('skShippingQty').value = p.shippingQty || 1;
            document.getElementById('skSellPrice').value = p.sellPrice || 0;
            document.getElementById('skSellShipping').value = p.sellShipping || 0;
            toggleShippingQty();
            updateCalcPreview();
        }
    } else {
        document.getElementById('skModalTitle').textContent = '매입상품 등록';
        document.getElementById('saveSkBtn').innerHTML = "<i class='bx bx-save'></i> 등록";
        document.getElementById('skShippingBasis').value = '수량별';
        toggleShippingQty();
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('skModal').classList.remove('active');
    document.getElementById('skForm').reset();
    editingId = null;
}

window.editProduct = function(id) {
    openModal(id);
};

// ==========================================
// 자동계산 미리보기 (모달 내)
// ==========================================
function updateCalcPreview() {
    var buyPrice = parseInt(document.getElementById('skBuyPrice').value, 10) || 0;
    var buyShipping = parseInt(document.getElementById('skBuyShipping').value, 10) || 0;
    var shippingBasis = document.getElementById('skShippingBasis').value;
    var shippingQty = parseInt(document.getElementById('skShippingQty').value, 10) || 1;
    var sellPrice = parseInt(document.getElementById('skSellPrice').value, 10) || 0;
    var sellShipping = parseInt(document.getElementById('skSellShipping').value, 10) || 0;

    var buyTotal = calcBuyTotal(buyPrice, buyShipping, shippingBasis, shippingQty);
    var sellTotal = calcSellTotal(sellPrice, sellShipping);
    var commission = calcCommission(sellPrice, sellShipping);
    var profit = calcProfit(buyTotal, sellTotal, commission);
    var profitRate = calcProfitRate(profit, sellTotal);

    document.getElementById('skBuyTotal').value = formatCurrency(buyTotal);
    document.getElementById('skSellTotal').value = formatCurrency(sellTotal);
    document.getElementById('skCommission').value = formatCurrency(commission);
    
    var profitEl = document.getElementById('skProfit');
    profitEl.value = formatCurrency(profit);
    profitEl.className = 'calc-preview ' + (profit >= 0 ? 'positive' : 'negative');
    
    var rateEl = document.getElementById('skProfitRate');
    rateEl.value = profitRate.toFixed(1) + '%';
    rateEl.className = 'calc-preview ' + (profitRate >= 0 ? 'positive' : 'negative');
}

function toggleShippingQty() {
    var basis = document.getElementById('skShippingBasis').value;
    var group = document.getElementById('shippingQtyGroup');
    if (basis === '수량별') {
        group.style.display = '';
    } else {
        group.style.display = 'none';
    }
}

// ==========================================
// 엑셀(CSV) 다운로드
// ==========================================
function downloadCSV(data, filename) {
    if(!data || data.length === 0) { showToast('내보낼 데이터가 없습니다.', 'warning'); return; }
    var csvRows = [];
    var headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    for (var row of data) {
        var values = headers.map(function(header) {
            var val = ('' + (row[header] || '')).replace(/"/g, '""');
            return '"' + val + '"';
        });
        csvRows.push(values.join(','));
    }
    var blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(filename + ' 다운로드 완료', 'success');
}

// ==========================================
// 모바일 메뉴
// ==========================================
function closeMobileMenu() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ==========================================
// 로그인 및 Auth
// ==========================================
function setupAuth() {
    var loginOverlay = document.getElementById('loginOverlay');
    var mainApp = document.getElementById('mainApp');
    var loginForm = document.getElementById('loginForm');
    var loginError = document.getElementById('loginError');
    var logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, function(user) {
        if (user) {
            if (loginOverlay) loginOverlay.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            // 데이터 로드
            products = loadProducts();
            renderTable();
            updateConnectionStatus(true);
        } else {
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            if (mainApp) mainApp.classList.add('hidden');
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var btn = document.getElementById('loginBtn');
            var origText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 로그인 중...";
            btn.disabled = true;
            loginError.classList.add('hidden');

            var email = document.getElementById('loginEmail').value;
            var pass  = document.getElementById('loginPassword').value;

            signInWithEmailAndPassword(auth, email, pass)
                .then(function() { btn.innerHTML = origText; btn.disabled = false; })
                .catch(function() {
                    btn.innerHTML = origText;
                    btn.disabled = false;
                    loginError.textContent = "아이디 또는 비밀번호가 틀렸습니다.";
                    loginError.classList.remove('hidden');
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(function() { location.reload(); });
        });
    }
}

// ==========================================
// 앱 시작
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    setupAuth();

    // 신규 추가 버튼
    document.getElementById('addProductBtn').addEventListener('click', function() {
        openModal(null);
    });

    // 모달 닫기
    document.getElementById('closeSkModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelSkBtn').addEventListener('click', closeModal);

    // 운임기준 변경 시 수량별 입력 토글
    document.getElementById('skShippingBasis').addEventListener('change', function() {
        toggleShippingQty();
        updateCalcPreview();
    });

    // 자동계산 입력 이벤트
    ['skBuyPrice', 'skBuyShipping', 'skShippingQty', 'skSellPrice', 'skSellShipping'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', updateCalcPreview);
    });

    // 폼 제출
    document.getElementById('skForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        var data = {
            supplier: document.getElementById('skSupplier').value.trim(),
            brand: document.getElementById('skBrand').value.trim(),
            name: document.getElementById('skName').value.trim(),
            color: document.getElementById('skColor').value.trim(),
            size: document.getElementById('skSize').value.trim(),
            uploadDate: document.getElementById('skUploadDate').value,
            buyPrice: parseInt(document.getElementById('skBuyPrice').value, 10) || 0,
            buyShipping: parseInt(document.getElementById('skBuyShipping').value, 10) || 0,
            shippingBasis: document.getElementById('skShippingBasis').value,
            shippingQty: parseInt(document.getElementById('skShippingQty').value, 10) || 1,
            sellPrice: parseInt(document.getElementById('skSellPrice').value, 10) || 0,
            sellShipping: parseInt(document.getElementById('skSellShipping').value, 10) || 0
        };

        if (editingId) {
            // 수정
            var idx = products.findIndex(function(p) { return p.id === editingId; });
            if (idx >= 0) {
                data.id = editingId;
                data.createdAt = products[idx].createdAt;
                data.updatedAt = new Date().toISOString();
                products[idx] = data;
                saveProducts(products);
                showToast('상품 정보가 수정되었습니다.', 'success');
            }
        } else {
            // 신규
            data.id = generateId();
            data.createdAt = new Date().toISOString();
            data.updatedAt = data.createdAt;
            products.push(data);
            saveProducts(products);
            showToast('새 매입상품이 등록되었습니다.', 'success');
        }

        closeModal();
        renderTable();
    });

    // 선택 삭제
    document.getElementById('deleteSkBtn').addEventListener('click', function() {
        var checked = document.querySelectorAll('.sk-checkbox:checked');
        if (checked.length === 0) { showToast('삭제할 상품을 선택해주세요.', 'warning'); return; }
        if (!confirm('선택한 ' + checked.length + '개 상품을 삭제하시겠습니까?')) return;

        var idsToDelete = [];
        checked.forEach(function(cb) { idsToDelete.push(cb.value); });
        products = products.filter(function(p) { return idsToDelete.indexOf(p.id) < 0; });
        saveProducts(products);
        document.getElementById('selectAllSk').checked = false;
        renderTable();
        showToast(idsToDelete.length + '개 상품이 삭제되었습니다.', 'success');
    });

    // 전체 선택
    document.getElementById('selectAllSk').addEventListener('change', function() {
        var checked = this.checked;
        document.querySelectorAll('.sk-checkbox').forEach(function(cb) { cb.checked = checked; });
    });

    // 엑셀 내보내기
    document.getElementById('exportSkBtn').addEventListener('click', function() {
        var data = products.map(function(p) {
            var buyTotal = calcBuyTotal(p.buyPrice, p.buyShipping, p.shippingBasis, p.shippingQty);
            var sellTotal = calcSellTotal(p.sellPrice, p.sellShipping);
            var commission = calcCommission(p.sellPrice || 0, p.sellShipping || 0);
            var profit = calcProfit(buyTotal, sellTotal, commission);
            var profitRate = calcProfitRate(profit, sellTotal);

            var obj = {};
            obj["매입처"] = p.supplier;
            obj["브랜드"] = p.brand;
            obj["상품명"] = p.name;
            obj["컬러"] = p.color;
            obj["사이즈"] = p.size;
            obj["업로드일"] = p.uploadDate || '';
            obj["매입가(공급가)"] = p.buyPrice || 0;
            obj["매입운임"] = p.buyShipping || 0;
            obj["운임기준"] = p.shippingBasis || '';
            obj["매입합계"] = buyTotal;
            obj["판매가(VAT포함)"] = p.sellPrice || 0;
            obj["판매운임"] = p.sellShipping || 0;
            obj["매출합계"] = sellTotal;
            obj["수수료"] = commission;
            obj["정산이익"] = profit;
            obj["수익률(%)"] = profitRate.toFixed(1);
            return obj;
        });
        downloadCSV(data, '셀러K_매입상품_' + new Date().toISOString().slice(0,10) + '.csv');
    });

    // 테이블 검색
    var skSearchInput = document.getElementById('skSearchInput');
    var skSearchField = document.getElementById('skSearchField');
    var searchInput = document.getElementById('searchInput');
    if (skSearchInput) skSearchInput.addEventListener('input', function() { skPage = 1; renderTable(); });
    if (skSearchField) skSearchField.addEventListener('change', function() { skPage = 1; renderTable(); });
    if (searchInput) searchInput.addEventListener('input', function() { skPage = 1; renderTable(); });

    // 테이블 정렬 — 모든 sortable th 대상
    document.querySelectorAll('.sortable').forEach(function(th) {
        th.addEventListener('click', function() {
            var col = th.getAttribute('data-sort');
            if (!col) return;
            if (skSort.col === col) {
                skSort.asc = !skSort.asc;
            } else {
                skSort.col = col;
                skSort.asc = true;
            }
            document.querySelectorAll('.sortable').forEach(function(el) {
                el.classList.remove('active', 'asc');
                var icon = el.querySelector('i');
                if (icon) icon.className = 'bx bx-sort';
            });
            th.classList.add('active');
            if (skSort.asc) th.classList.add('asc');
            var icon = th.querySelector('i');
            if (icon) icon.className = skSort.asc ? 'bx bx-sort-up' : 'bx bx-sort-down';
            renderTable();
        });
    });

    // 모바일 햄버거 메뉴
    var hamburgerBtn = document.getElementById('hamburgerBtn');
    var sidebarOverlay = document.getElementById('sidebarOverlay');
    var sidebar = document.getElementById('sidebar');

    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileMenu);
    }

    // 셀러K 아코디언 메뉴 토글
    var sellerKToggle = document.getElementById('sellerKToggle');
    var sellerKGroup = document.getElementById('sellerKMenuGroup');
    if (sellerKToggle && sellerKGroup) {
        sellerKToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sellerKGroup.classList.toggle('open');
        });
    }

    // 초기 운임기준 토글
    toggleShippingQty();
});
