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

function formatDateTime(isoString) {
    if (!isoString) return '-';
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + ' ' + h + ':' + min;
}

function calcCommission(sellPrice, sellShipping) {
    var baseExt = sellPrice + sellShipping;
    var orderFee = Math.round(baseExt * 0.0363);
    var salesFee = Math.round(sellPrice * 0.03);
    return orderFee + salesFee;
}

function calcBuyTotal(buyPrice, buyShipping, shippingBasis, shippingQty) {
    var effectiveShipping = buyShipping || 0;
    if (shippingBasis === '무료') {
        effectiveShipping = 0;
    }
    // 배송대행 특성상 운임을 수량으로 나누지 않고 1건의 배송비를 그대로 원가에 합산함.
    return (buyPrice || 0) + effectiveShipping;
}

function calcSellTotal(sellPrice, sellShipping) {
    return (sellPrice || 0) + (sellShipping || 0);
}

function calcProfit(buyTotalVATExclusive, sellTotalVATInclusive, commission) {
    var buyTotalVATInclusive = Math.round(buyTotalVATExclusive * 1.1);
    return sellTotalVATInclusive - buyTotalVATInclusive - commission;
}

function calcProfitRate(profit, sellTotal) {
    if (!sellTotal || sellTotal === 0) return 0;
    return (profit / sellTotal) * 100;
}

// ==========================================
// 테이블 렌더링
// ==========================================
function renderTable() {
    var tbody = document.getElementById('skTableBody');
    if (!tbody) return;

    var totalBuy = 0;
    var totalSell = 0;
    var totalProfit = 0;
    var html = '';

    if (products.length === 0) {
        html = '<tr><td colspan="17" style="text-align:center; padding:30px; color:var(--gray-500);">등록된 매입상품이 없습니다.</td></tr>';
    } else {
        products.forEach(function(p) {
            var buyTotal = calcBuyTotal(p.buyPrice, p.buyShipping, p.shippingBasis, p.shippingQty);
            var sellTotal = calcSellTotal(p.sellPrice, p.sellShipping);
            var commission = calcCommission(p.sellPrice || 0, p.sellShipping || 0);
            var profit = calcProfit(buyTotal, sellTotal, commission);
            var profitRate = calcProfitRate(profit, sellTotal);
            totalBuy += buyTotal;
            totalSell += sellTotal;
            totalProfit += profit;

            var shippingBasisLabel = p.shippingBasis || '';
            if (p.shippingBasis === '수량별') shippingBasisLabel += ' (' + (p.shippingQty || 1) + '개당)';

            var profitClass = profit > 0 ? 'text-success' : (profit < 0 ? 'text-danger' : '');
            var badgeClass = profitRate > 20 ? 'badge-success' : 'badge-neutral';

            var sellPriceHtml = formatCurrency(p.sellPrice || 0);
            if (p.isLowestPrice) {
                sellPriceHtml += '<br><span style="font-size:10px; background:#fff3cd; color:#856404; padding:2px 4px; border-radius:3px; margin-top:4px; display:inline-block; font-weight:600;">최저가</span>';
            }

            var nameHtml = '<strong>' + escapeHtml(p.name) + '</strong>';
            if (p.isSoldOut) {
                nameHtml += ' <span style="font-size:10px; background:#dc3545; color:#fff; padding:2px 4px; border-radius:3px; margin-left:4px; font-weight:600;">품절</span>';
            }
            var trStyle = p.isSoldOut ? 'opacity:0.6; background-color:#fbfbfb; cursor:pointer;' : 'cursor:pointer;';

            html += '<tr class="product-row" data-id="' + escapeHtml(p.id) + '" style="' + trStyle + '">' +
                '<td class="col-check"><input type="checkbox" class="sk-checkbox" value="' + escapeHtml(p.id) + '"></td>' +
                '<td>' + escapeHtml(p.uploadDate) + '</td>' +
                '<td>' + escapeHtml(p.supplier) + '</td>' +
                '<td>' + escapeHtml(p.brand) + '</td>' +
                '<td>' + nameHtml + '</td>' +
                '<td>' + escapeHtml(p.color) + '</td>' +
                '<td>' + escapeHtml(p.size) + '</td>' +
                '<td class="col-num buy-col">' + formatCurrency(p.buyPrice) + '</td>' +
                '<td class="col-num buy-col">' + formatCurrency(p.buyShipping || 0) + '</td>' +
                '<td class="buy-col" style="font-size:12px;">' + escapeHtml(shippingBasisLabel) + '</td>' +
                '<td class="col-num buy-col" style="font-weight:600;">' + formatCurrency(buyTotal) + '</td>' +
                '<td class="col-num sell-col">' + sellPriceHtml + '</td>' +
                '<td class="col-num sell-col">' + formatCurrency(p.sellShipping || 0) + '</td>' +
                '<td class="col-num sell-col" style="font-weight:600;">' + formatCurrency(sellTotal) + '</td>' +
                '<td class="col-num profit-col" style="color:var(--danger)">' + formatCurrency(commission) + '</td>' +
                '<td class="col-num profit-col ' + profitClass + '" style="font-weight:bold;">' + formatCurrency(profit) + '</td>' +
                '<td class="col-num profit-col"><span class="badge ' + badgeClass + '">' + profitRate.toFixed(1) + '%</span></td>' +
                '<td style="font-size:11px; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;" title="' + escapeHtml(p.remarks || '') + '">' + escapeHtml(p.remarks || '') + '</td>' +
                '<td><span style="font-size:11px; color:#555;">' + formatDateTime(p.updatedAt) + '</span>' + (p.lastChangeLog ? '<br><span style="font-size:10px; color:var(--text-secondary);">(' + escapeHtml(p.lastChangeLog) + ')</span>' : '') + '</td>' +
                '</tr>';
        });
    }

    tbody.innerHTML = html;

    // KPI 업데이트
    var countEl = document.getElementById('skTotalCount');
    var buyEl = document.getElementById('skTotalBuy');
    var sellEl = document.getElementById('skTotalSell');
    var profitEl = document.getElementById('skTotalProfit');
    if (countEl) countEl.textContent = products.length;
    if (buyEl) buyEl.textContent = formatCurrency(totalBuy);
    if (sellEl) sellEl.textContent = formatCurrency(totalSell);
    if (profitEl) profitEl.textContent = formatCurrency(totalProfit);

    // 행 클릭 시 수정 모달 띄우기 (체크박스 영역 제외)
    document.querySelectorAll('.product-row').forEach(function(tr) {
        tr.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.classList.contains('col-check') || e.target.closest('.col-check')) return;
            openModal(this.getAttribute('data-id'));
        });
    });
}

// ==========================================
// 모달 (추가/수정)
// ==========================================

function openModal(id) {
    var modal = document.getElementById('skModal');
    if (!modal) return;

    editingId = id;
    document.getElementById('skModalTitle').textContent = id ? '매입상품 수정' : '신규 매입상품 추가';
    document.getElementById('skForm').reset();
    document.getElementById('skUploadDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('skShippingQty').value = "1";
    toggleShippingQty();
    updateCalcPreview();

    if (id) {
        var p = products.find(function(i) { return i.id === id; });
        if (p) {
            document.getElementById('skSupplier').value = p.supplier || '';
            document.getElementById('skBrand').value = p.brand || '';
            document.getElementById('skName').value = p.name || '';
            document.getElementById('skColor').value = p.color || '';
            document.getElementById('skSize').value = p.size || '';
            document.getElementById('skUploadDate').value = p.uploadDate || '';
            document.getElementById('skBuyPrice').value = p.buyPrice || '';
            document.getElementById('skBuyShipping').value = p.buyShipping || '';
            document.getElementById('skShippingBasis').value = p.shippingBasis || '수량별';
            document.getElementById('skShippingQty').value = p.shippingQty || '1';
            document.getElementById('skSellPrice').value = p.sellPrice || '';
            document.getElementById('skSellShipping').value = p.sellShipping || '';
            document.getElementById('skIsLowestPrice').checked = (p.isLowestPrice === 1);
            if (document.getElementById('skIsSoldOut')) document.getElementById('skIsSoldOut').checked = (p.isSoldOut === 1);
            if (document.getElementById('skRemarks')) document.getElementById('skRemarks').value = p.remarks || '';
            if (document.getElementById('skTimestampDisplay')) {
                document.getElementById('skTimestampDisplay').innerHTML = '최초등록: ' + formatDateTime(p.createdAt) + ' &nbsp;|&nbsp; 최종수정: ' + formatDateTime(p.updatedAt);
            }
            if (document.getElementById('skLogsContainer')) {
                document.getElementById('skLogsContainer').style.display = 'none';
                document.getElementById('skLogsList').innerHTML = '';
                
                fetch(API_BASE + '/' + id + '/logs')
                    .then(function(res) { return res.json(); })
                    .then(function(logs) {
                        if (logs && logs.length > 0) {
                            var logHtml = '';
                            logs.forEach(function(l) {
                                logHtml += '<li style="margin-bottom:6px; line-height:1.4;"><strong>' + formatDateTime(l.createdAt) + '</strong> (' + escapeHtml(l.summary) + ')<br><span style="color:#888;">' + escapeHtml(l.logText) + '</span></li>';
                            });
                            document.getElementById('skLogsList').innerHTML = logHtml;
                            document.getElementById('skLogsContainer').style.display = 'block';
                        }
                    })
                    .catch(function(err) { console.error('이력 로딩 실패:', err); });
            }
            toggleShippingQty();
            updateCalcPreview();
        }
    } else {
        if (document.getElementById('skTimestampDisplay')) document.getElementById('skTimestampDisplay').innerHTML = '';
        if (document.getElementById('skLogsContainer')) document.getElementById('skLogsContainer').style.display = 'none';
    }

    modal.classList.add('active');
}

function closeModal() {
    var modal = document.getElementById('skModal');
    if (modal) modal.classList.remove('active');
    editingId = null;
}

function toggleShippingQty() {
    var b = document.getElementById('skShippingBasis').value;
    var wrap = document.getElementById('shippingQtyWrap');
    if (!wrap) return;
    if (b === '수량별') {
        wrap.classList.remove('hidden');
    } else {
        wrap.classList.add('hidden');
    }
}

function updateCalcPreview() {
    var bp = parseInt(document.getElementById('skBuyPrice').value, 10) || 0;
    var bs = parseInt(document.getElementById('skBuyShipping').value, 10) || 0;
    var base = document.getElementById('skShippingBasis').value;
    var qty = parseInt(document.getElementById('skShippingQty').value, 10) || 1;
    var sp = parseInt(document.getElementById('skSellPrice').value, 10) || 0;
    var ss = parseInt(document.getElementById('skSellShipping').value, 10) || 0;

    var buyTotal = calcBuyTotal(bp, bs, base, qty);
    var sellTotal = calcSellTotal(sp, ss);
    var commission = calcCommission(sp, ss);
    var profit = calcProfit(buyTotal, sellTotal, commission);
    var profitRate = calcProfitRate(profit, sellTotal);

    // 매입 금액 미리보기
    var buyTotalEl = document.getElementById('skBuyTotal');
    if (buyTotalEl) buyTotalEl.value = formatCurrency(buyTotal);

    // 매출 금액 미리보기
    var sellTotalEl = document.getElementById('skSellTotal');
    if (sellTotalEl) sellTotalEl.value = formatCurrency(sellTotal);

    // 정산 미리보기
    var commEl = document.getElementById('skPreviewCommission');
    if (commEl) commEl.value = formatCurrency(commission);

    var profitEl = document.getElementById('skPreviewProfit');
    if (profitEl) {
        profitEl.value = formatCurrency(profit);
        profitEl.className = 'calc-preview ' + (profit > 0 ? 'text-success' : (profit < 0 ? 'text-danger' : ''));
    }

    var rateEl = document.getElementById('skPreviewRate');
    if (rateEl) rateEl.value = profitRate.toFixed(1) + '%';
}

// ==========================================
// 인증 (Firebase Auth)
// ==========================================
function setupAuth() {
    var mainApp = document.getElementById('mainApp');
    var logoutBtn = document.getElementById('logoutBtn');

    onAuthStateChanged(auth, function(user) {
        if (user) {
            if (mainApp) mainApp.classList.remove('hidden');
            loadProducts();
        } else {
            window.location.href = 'index.html';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(function() {
                window.location.href = 'index.html';
            });
        });
    }
}

// ==========================================
// 앱 시작

// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    setupAuth();

    // 상품 추가 버튼
    document.getElementById('addProductBtn').addEventListener('click', function() {
        openModal(null);
    });

    // 모달 닫기
    document.getElementById('closeSkModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelSkBtn').addEventListener('click', closeModal);

    // 운임기준 변경
    document.getElementById('skShippingBasis').addEventListener('change', function() {
        toggleShippingQty();
        updateCalcPreview();
    });

    // 실시간 계산 미리보기
    ['skBuyPrice', 'skBuyShipping', 'skShippingQty', 'skSellPrice', 'skSellShipping'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', updateCalcPreview);
    });

    // 폼 제출 (추가/수정)
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
            sellShipping: parseInt(document.getElementById('skSellShipping').value, 10) || 0,
            isLowestPrice: document.getElementById('skIsLowestPrice').checked ? 1 : 0,
            isSoldOut: (document.getElementById('skIsSoldOut') && document.getElementById('skIsSoldOut').checked) ? 1 : 0,
            remarks: document.getElementById('skRemarks') ? document.getElementById('skRemarks').value.trim() : ''
        };

        if (editingId) {
            data.id = editingId;
            fetch(API_BASE + '/' + editingId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(function(res) { return res.json(); })
            .then(function() {
                showToast('상품 정보가 수정되었습니다.', 'success');
                closeModal();
                loadProducts();
            })
            .catch(function(err) {
                showToast('수정 실패: ' + err.message, 'error');
            });
        } else {
            data.id = generateId();
            fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(function(res) { return res.json(); })
            .then(function() {
                showToast('새 상품이 등록되었습니다.', 'success');
                closeModal();
                loadProducts();
            })
            .catch(function(err) {
                showToast('등록 실패: ' + err.message, 'error');
            });
        }
    });

    // 일괄 삭제
    document.getElementById('deleteSkBtn').addEventListener('click', function() {
        var checked = document.querySelectorAll('.sk-checkbox:checked');
        if (checked.length === 0) {
            showToast('삭제할 상품을 선택해주세요.', 'warning');
            return;
        }
        if (!confirm('선택한 ' + checked.length + '개 상품을 삭제하시겠습니까?')) return;

        var idsToDelete = [];
        checked.forEach(function(cb) { idsToDelete.push(cb.value); });

        fetch(API_BASE + '/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsToDelete })
        })
        .then(function(res) { return res.json(); })
        .then(function() {
            document.getElementById('selectAllSk').checked = false;
            showToast('삭제했습니다.', 'success');
            loadProducts();
        })
        .catch(function(err) {
            showToast('삭제 실패: ' + err.message, 'error');
        });
    });

    // 전체 선택
    document.getElementById('selectAllSk').addEventListener('change', function() {
        var checked = this.checked;

document.querySelectorAll('.sk-checkbox').forEach(function(cb) {
            cb.checked = checked;
        });
    });

    // 셀러K 아코디언 토글
    var t = document.getElementById('sellerKToggle');
    var g = document.getElementById('sellerKMenuGroup');
    if (t && g) {
        t.addEventListener('click', function(e) {
            e.preventDefault();
            g.classList.toggle('open');
        });
    }

    // 모바일 햄버거 메뉴
    var h = document.getElementById('hamburgerBtn');
    var s = document.getElementById('sidebar');
    var o = document.getElementById('sidebarOverlay');
    if (h && s) {
        h.addEventListener('click', function() {
            s.classList.toggle('open');
            if (o) o.classList.toggle('active');
        });
    }
    if (o) {
        o.addEventListener('click', function() {
            s.classList.remove('open');
            o.classList.remove('active');
        });
    }

    // 엑셀 일괄 등록 - 양식 다운로드
    document.getElementById('downloadTemplateBtn').addEventListener('click', function() {
        if (typeof XLSX === 'undefined') {
            showToast('엑셀 라이브러리가 로드되지 않았습니다. 새로고침 해주세요.', 'error');
            return;
        }
        var wb = XLSX.utils.book_new();
        // 헤더: 14개
        var wsData = [
            ["매입처", "브랜드", "상품명", "컬러", "사이즈", "업로드일(YYYY-MM-DD)", "매입가(단가)", "매입운임", "운임기준(수량별/무료/조건부/유료)", "수량별기준(공란시1)", "판매가", "판매운임", "최저가설정(O/X)", "비고"],
            ["예시)동대문K", "K브랜드", "반팔티", "블랙", "Free", "", 15000, 3000, "수량별", 1, 25000, 3000, "X", "마감 좋음"]
        ];
        var ws = XLSX.utils.aoa_to_sheet(wsData);
        // 컬럼 너비 설정
        ws['!cols'] = [ {wpx: 80}, {wpx: 100}, {wpx: 150}, {wpx: 60}, {wpx: 60}, {wpx: 130}, {wpx: 80}, {wpx: 80}, {wpx: 180}, {wpx: 120}, {wpx: 80}, {wpx: 80}, {wpx: 100}, {wpx: 150} ];
        
        XLSX.utils.book_append_sheet(wb, ws, "상품양식");
        XLSX.writeFile(wb, "매입상품_일괄등록_양식.xlsx");
    });

    // 엑셀 일괄 등록 - 파일 선택 창 열기
    document.getElementById('bulkUploadBtn').addEventListener('click', function() {
        document.getElementById('bulkUploadFile').click();
    });

    // 엑셀 일괄 등록 - 파싱 및 서버 전송
    document.getElementById('bulkUploadFile').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        if (typeof XLSX === 'undefined') {
            showToast('엑셀 라이브러리가 로드되지 않았습니다.', 'error');
            e.target.value = '';
            return;
        }

        var reader = new FileReader();
        reader.onload = function(evt) {
            try {
                var data = new Uint8Array(evt.target.result);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[firstSheetName];
                
                // header: 1 means arrays of arrays
                var rows = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                
                var products = [];
                for(var i = 1; i < rows.length; i++) {
                    var row = rows[i];
                    if(!row || row.length === 0 || !row[0] || String(row[0]).trim() === "예시)동대문K") continue; // 빈 줄이나 예시 스킵
                    
                    var p = {
                        id: generateId() + '_' + i,
                        supplier: String(row[0] || '').trim(),
                        brand: String(row[1] || '').trim(),
                        name: String(row[2] || '').trim(),
                        color: String(row[3] || '').trim(),
                        size: String(row[4] || '').trim(),
                        uploadDate: (row[5] ? String(row[5]).trim() : ""),
                        buyPrice: parseInt(row[6], 10) || 0,
                        buyShipping: parseInt(row[7], 10) || 0,
                        shippingBasis: String(row[8] || '무료').trim(),
                        shippingQty: parseInt(row[9], 10) || 1,
                        sellPrice: parseInt(row[10], 10) || 0,
                        sellShipping: parseInt(row[11], 10) || 0,
                        isLowestPrice: (String(row[12] || 'X').trim().toUpperCase() === 'O') ? 1 : 0,
                        remarks: String(row[13] || '').trim()
                    };
                    
                    if(p.name !== '') {
                        products.push(p);
                    }
                }

                if(products.length === 0) {
                    showToast('업로드할 유효한 상품 데이터가 없습니다.', 'warning');
                    e.target.value = '';
                    return;
                }

                if(!confirm(products.length + '개의 상품을 엑셀로 일괄 등록하시겠습니까?')) {
                    e.target.value = '';
                    return;
                }

                fetch(API_BASE + '/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products: products })
                })
                .then(function(res) { return res.json(); })
                .then(function(result) {
                    if(result.error) throw new Error(result.error);
                    showToast(result.count + '개 상품이 성공적으로 일괄 등록되었습니다.', 'success');
                    e.target.value = '';
                    loadProducts();
                })
                .catch(function(err) {
                    console.error("Bulk Upload Error:", err);
                    showToast('대량 등록 실패: ' + err.message, 'error');
                    e.target.value = '';
                });

            } catch(err) {
                console.error("Excel parsing error:", err);
                showToast('엑셀 파일 분해 중 오류가 발생했습니다.', 'error');
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    });

    toggleShippingQty();
});

