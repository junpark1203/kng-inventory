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

// 유틸리티 함수
const formatCurrency = (number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(number);

// 초기 상품
const rawProducts = [
  { id: 'p1', brand: "K2 세이프티", name: "K2 세이프티 쿨 바라클라바 (블랙)", color: "블랙", size: "FREE", stock: 5, buyPrice: 9500, sellPrice: 12000 },
  { id: 'p2', brand: "K2 세이프티", name: "K2 세이프티 베이직 쿨토시", color: "화이트", size: "FREE", stock: 10, buyPrice: 3700, sellPrice: 4700 },
  { id: 'p3', brand: "K2 세이프티", name: "K2 세이프티 베이직 쿨토시", color: "블랙", size: "FREE", stock: 10, buyPrice: 3700, sellPrice: 4700 },
  { id: 'p4', brand: "K2 세이프티", name: "K2 세이프티 하이크 넥스카프", color: "화이트", size: "FREE", stock: 5, buyPrice: 7900, sellPrice: 10000 },
  { id: 'p5', brand: "K2 세이프티", name: "K2 세이프티 하이크 넥스카프", color: "다크네이비", size: "FREE", stock: 5, buyPrice: 7900, sellPrice: 10000 },
  { id: 'p6', brand: "K2 세이프티", name: "K2 세이프티 쿨토시", color: "블랙", size: "FREE", stock: 10, buyPrice: 7400, sellPrice: 9400 },
  { id: 'p7', brand: "K2 세이프티", name: "K2 세이프티 쿨토시", color: "화이트", size: "FREE", stock: 10, buyPrice: 7400, sellPrice: 9400 },
  { id: 'p8', brand: "K2 세이프티", name: "K2 세이프티 쿨토시", color: "차콜", size: "FREE", stock: 10, buyPrice: 7400, sellPrice: 9400 },
  { id: 'p9', brand: "K2 세이프티", name: "K2 세이프티 카일 차양 캡모자", color: "차콜", size: "FREE", stock: 2, buyPrice: 23100, sellPrice: 29000 },
  { id: 'p10', brand: "K2 세이프티", name: "K2 세이프티 카일 차양 캡모자", color: "라이트 그레이", size: "FREE", stock: 2, buyPrice: 23100, sellPrice: 29000 },
  { id: 'p11', brand: "K2 세이프티", name: "K2 세이프티 하이크 햇 모자 (베이지)", color: "베이지", size: "FREE", stock: 2, buyPrice: 16800, sellPrice: 21100 },
  { id: 'p12', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트(벨트형 2)(GR) 선풍기조끼 (그레이)", color: "그레이", size: "105", stock: 2, buyPrice: 107100, sellPrice: 134000 },
  { id: 'p13', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트(벨트형 2)(GR) 선풍기조끼 (그레이)", color: "그레이", size: "95", stock: 2, buyPrice: 107100, sellPrice: 134000 },
  { id: 'p14', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트(벨트형 2)(GR) 선풍기조끼 (그레이)", color: "그레이", size: "100", stock: 2, buyPrice: 107100, sellPrice: 134000 },
  { id: 'p15', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트(벨트형 2)(GR) 선풍기조끼 (그레이)", color: "그레이", size: "110", stock: 2, buyPrice: 107100, sellPrice: 134000 },
  { id: 'p16', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트(벨트형 2)(GR) 선풍기조끼 (그레이)", color: "그레이", size: "115", stock: 2, buyPrice: 107100, sellPrice: 134000 },
  { id: 'p17', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트3(CH) 선풍기조끼 (차콜그레이)", color: "차콜그레이", size: "95", stock: 2, buyPrice: 87200, sellPrice: 109100 },
  { id: 'p18', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트3(CH) 선풍기조끼 (차콜그레이)", color: "차콜그레이", size: "100", stock: 2, buyPrice: 87200, sellPrice: 109100 },
  { id: 'p19', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트3(CH) 선풍기조끼 (차콜그레이)", color: "차콜그레이", size: "110", stock: 2, buyPrice: 87200, sellPrice: 109100 },
  { id: 'p20', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트3(CH) 선풍기조끼 (차콜그레이)", color: "차콜그레이", size: "115", stock: 2, buyPrice: 87200, sellPrice: 109100 },
  { id: 'p21', brand: "K2 세이프티", name: "K2 세이프티 에어윈드베스트3(CH) 선풍기조끼 (차콜그레이)", color: "차콜그레이", size: "105", stock: 2, buyPrice: 87200, sellPrice: 109100 },
  { id: 'p22', brand: "K2 세이프티", name: "K2 세이프티 타공 멀티스카프 (이어홀)", color: "블랙", size: "FREE", stock: 5, buyPrice: 8930, sellPrice: 11300 },
  { id: 'p23', brand: "K2 세이프티", name: "K2 세이프티 타공 멀티스카프 (이어홀)", color: "블루", size: "FREE", stock: 5, buyPrice: 8930, sellPrice: 11300 }
];
const initialProducts = rawProducts.map(p => ({ supplier: "최가유통", ...p }));

// App State 관리
let products = [];
let transactions = [];
let totalRevenue = 0; 
let totalCost = 0; 
let editingRowId = null;

// 초기화
async function initFirebase() {
    try {
        const metricsRef = doc(db, 'kng_data', 'metrics');
        const metricsSnap = await getDoc(metricsRef);
        
        if (!metricsSnap.exists()) {
            console.log("Firebase DB 초기 셋업 진행중...");
            const batch = writeBatch(db);
            
            let initialCost = initialProducts.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);
            batch.set(metricsRef, { totalRevenue: 0, totalCost: initialCost });
            
            initialProducts.forEach(p => {
                batch.set(doc(db, 'kng_products', p.id), p);
            });
            
            await batch.commit();
            console.log("DB 초기 세팅 완료!");
        }

        // 실시간 수치 구독
        onSnapshot(metricsRef, (docSnap) => {
            if(docSnap.exists()) {
                const data = docSnap.data();
                totalRevenue = data.totalRevenue || 0;
                totalCost = data.totalCost || 0;
                updateDashboard();
            }
        });

        // 실시간 제품 구독
        onSnapshot(collection(db, 'kng_products'), (snapshot) => {
            const newProducts = [];
            snapshot.forEach((docSnap) => newProducts.push(docSnap.data()));
            newProducts.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true, sensitivity: 'base'}));
            products = newProducts;
            renderTable();
            updateDashboard();
        });

        // 실시간 트랜잭션 (입출고 내역) 구독
        onSnapshot(query(collection(db, 'kng_transactions')), (snapshot) => {
            const newTx = [];
            snapshot.forEach((docSnap) => newTx.push({ id: docSnap.id, ...docSnap.data() }));
            // 내림차순 정렬 (최신이 위로)
            newTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            transactions = newTx;
            renderTransactionsTable();
        });
        
    } catch (e) {
        console.error("Firebase 초기화 에러:", e);
        alert("DB 연동에 실패했습니다. (Firestore 권한 확인)");
    }
}

// ==========================================
// 인라인 수정 스크립트
// ==========================================
window.toggleEdit = function(id) {
    editingRowId = id;
    renderTable(); 
}

window.cancelEdit = function() {
    editingRowId = null;
    renderTable();
}

window.saveEdit = async function(id) {
    const btn = document.getElementById(`btn-save-${id}`);
    btn.innerHTML = '저장 중...';
    btn.disabled = true;

    try {
        const prodRef = doc(db, 'kng_products', id);
        await updateDoc(prodRef, {
            supplier: document.getElementById(`edit-sp-${id}`).value,
            brand: document.getElementById(`edit-br-${id}`).value,
            name: document.getElementById(`edit-nm-${id}`).value,
            color: document.getElementById(`edit-cl-${id}`).value,
            size: document.getElementById(`edit-sz-${id}`).value,
            buyPrice: parseInt(document.getElementById(`edit-bp-${id}`).value, 10),
            sellPrice: parseInt(document.getElementById(`edit-spc-${id}`).value, 10),
            stock: parseInt(document.getElementById(`edit-st-${id}`).value, 10)
        });
        editingRowId = null;
    } catch(e) {
        alert('수정 실패: ' + e);
    }
}

// ==========================================
// 테이블 렌더링
// ==========================================
function renderTable(searchTerm = '') {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    let filtered = products;
    if (searchTerm) {
        filtered = products.filter(p => 
            p.name.includes(searchTerm) || 
            p.color.includes(searchTerm) ||
            p.brand.includes(searchTerm) ||
            (p.supplier && p.supplier.includes(searchTerm))
        );
    }
    
    filtered.forEach(p => {
        const tr = document.createElement('tr');
        const sp = p.supplier || '최가유통';
        const checkboxHtml = `<td><input type="checkbox" class="inv-checkbox" value="${p.id}"></td>`;
        
        if (editingRowId === p.id) {
            tr.innerHTML = `
                ${checkboxHtml}
                <td><input type="text" class="inline-input" id="edit-sp-${p.id}" value="${sp}"></td>
                <td><input type="text" class="inline-input" id="edit-br-${p.id}" value="${p.brand}"></td>
                <td><input type="text" class="inline-input" id="edit-nm-${p.id}" value="${p.name}"></td>
                <td><input type="text" class="inline-input" id="edit-cl-${p.id}" value="${p.color}"></td>
                <td><input type="text" class="inline-input" id="edit-sz-${p.id}" value="${p.size}"></td>
                <td><input type="number" class="inline-input" id="edit-bp-${p.id}" value="${p.buyPrice}"></td>
                <td><input type="number" class="inline-input" id="edit-spc-${p.id}" value="${p.sellPrice}"></td>
                <td><input type="number" class="inline-input" id="edit-st-${p.id}" value="${p.stock}"></td>
                <td style="display:flex;gap:4px;">
                    <button class="btn-action save" id="btn-save-${p.id}" onclick="saveEdit('${p.id}')">저장</button>
                    <button class="btn-action" onclick="cancelEdit()">취소</button>
                </td>
            `;
        } else {
            const badgeClass = p.stock <= 2 ? 'stock-badge low' : 'stock-badge';
            tr.innerHTML = `
                ${checkboxHtml}
                <td>${sp}</td>
                <td>${p.brand}</td>
                <td>${p.name}</td>
                <td>${p.color}</td>
                <td>${p.size}</td>
                <td>${formatCurrency(p.buyPrice)}</td>
                <td>${formatCurrency(p.sellPrice)}</td>
                <td><span class="${badgeClass}">${p.stock}</span></td>
                <td><button class="btn-action" onclick="toggleEdit('${p.id}')"><i class='bx bx-edit-alt'></i> 수정</button></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function renderTransactionsTable() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '';
    
    transactions.forEach(t => {
        const tr = document.createElement('tr');
        const badgeClass = t.type === 'IN' ? 'stock-badge' : 'stock-badge low';
        const typeLabel = t.type === 'IN' ? '매입' : '출고';
        const checkboxHtml = `<td><input type="checkbox" class="tx-checkbox" value="${t.id}"></td>`;

        tr.innerHTML = `
            ${checkboxHtml}
            <td>${t.txDate || t.timestamp.split('T')[0]}</td>
            <td><span class="${badgeClass}">${typeLabel}</span></td>
            <td>${t.supplier || '-'}</td>
            <td>${t.productName || '-'}</td>
            <td>${t.qty}</td>
            <td>${formatCurrency(t.price)}</td>
            <td>${t.remarks || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDashboard() {
    const totalQty = products.reduce((sum, p) => sum + p.stock, 0);
    document.getElementById('totalStockCount').textContent = totalQty.toLocaleString();
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
}

// ==========================================
// 입출고 폼 토글 로직
// ==========================================
const formFields = ['fSupplier', 'fBrand', 'fName', 'fColor', 'fSize'];
const outSearchContainer = document.getElementById('outboundSearchContainer');

function toggleFormMode(type) {
    const hint = document.getElementById('priceHint');
    if (type === 'IN') {
        hint.textContent = '매입 단가 기준';
        outSearchContainer.classList.add('hidden');
        document.getElementById('outSearchInput').value = '';
        formFields.forEach(id => {
            const el = document.getElementById(id);
            el.readOnly = false;
            el.classList.remove('readonly-input');
        });
        document.getElementById('selectedProductId').value = '';
        document.getElementById('transactionForm').reset();
        document.getElementById('typeIn').checked = true;
        setTodayDate();
    } else {
        hint.textContent = '매출 단가 기준 (재고 차감)';
        outSearchContainer.classList.remove('hidden');
        formFields.forEach(id => {
            const el = document.getElementById(id);
            el.readOnly = true;
            el.classList.add('readonly-input');
        });
        document.getElementById('transactionForm').reset();
        document.getElementById('typeOut').checked = true;
        setTodayDate();
    }
}

document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', (e) => toggleFormMode(e.target.value));
});

function setTodayDate() {
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}

// ==========================================
// 출고용 연관검색(Autocomplete) 기능
// ==========================================
const searchInput = document.getElementById('outSearchInput');
let currentFocus;

searchInput.addEventListener("input", function(e) {
    let a, b, val = this.value;
    closeAllLists();
    if (!val) { return false; }
    currentFocus = -1;
    
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(a);
    
    const searchTerms = val.toLowerCase().split(' ');
    
    products.forEach(p => {
        const searchText = `${p.supplier || '최가유통'} ${p.brand} ${p.name} ${p.color} ${p.size}`.toLowerCase();
        const matchesAll = searchTerms.every(term => searchText.includes(term));
        
        if (matchesAll) {
            b = document.createElement("DIV");
            b.innerHTML = `[${p.supplier || '최가유통'}] [${p.brand}] ${p.name} - ${p.color} (${p.size}) <strong>재고:${p.stock}</strong>`;
            b.innerHTML += "<input type='hidden' value='" + p.id + "'>";
            b.addEventListener("click", function(e) {
                const selectedId = this.getElementsByTagName("input")[0].value;
                const sp = products.find(x => x.id === selectedId);
                if (sp) {
                    searchInput.value = `[${sp.brand}] ${sp.name}`;
                    document.getElementById('selectedProductId').value = sp.id;
                    document.getElementById('fSupplier').value = sp.supplier || '최가유통';
                    document.getElementById('fBrand').value = sp.brand;
                    document.getElementById('fName').value = sp.name;
                    document.getElementById('fColor').value = sp.color;
                    document.getElementById('fSize').value = sp.size;
                    document.getElementById('txPrice').value = sp.sellPrice;
                }
                closeAllLists();
            });
            a.appendChild(b);
        }
    });
});

searchInput.addEventListener("keydown", function(e) {
    let x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) { // down
        currentFocus++;
        addActive(x);
    } else if (e.keyCode == 38) { // up
        currentFocus--;
        addActive(x);
    } else if (e.keyCode == 13) { // enter
        e.preventDefault();
        if (currentFocus > -1) {
            if (x) x[currentFocus].click();
        }
    }
});

function addActive(x) {
    if (!x) return false;
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    x[currentFocus].classList.add("autocomplete-active");
}
function removeActive(x) {
    for (let i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
    }
}
function closeAllLists(elmnt) {
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != searchInput) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});


// ==========================================
// 폼 서밋 핸들러
// ==========================================
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const qty = parseInt(document.getElementById('txQty').value, 10);
    const price = parseInt(document.getElementById('txPrice').value, 10);
    const txDate = document.getElementById('txDate').value;
    const remarks = document.getElementById('txRemarks').value.trim();
    const type = document.querySelector('input[name="txType"]:checked').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (isNaN(qty) || isNaN(price) || !txDate) {
        alert('필수 입력값을 확인해주세요.');
        return;
    }

    const fSupplier = document.getElementById('fSupplier').value.trim();
    const fBrand = document.getElementById('fBrand').value.trim();
    const fName = document.getElementById('fName').value.trim();
    const fColor = document.getElementById('fColor').value.trim();
    const fSize = document.getElementById('fSize').value.trim();

    if (!fSupplier || !fBrand || !fName || !fColor || !fSize) {
        alert('모든 상품 정보를 입력해주세요.');
        return;
    }

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 처리중...";
    
    try {
        await runTransaction(db, async (transaction) => {
            const metricsRef = doc(db, 'kng_data', 'metrics');
            const metricsSnap = await transaction.get(metricsRef);
            if (!metricsSnap.exists()) throw "데이터를 찾을 수 없습니다.";
            const metricsData = metricsSnap.data();

            let targetProductId;
            let currentStock = 0;
            let productName = fName;

            if (type === 'OUT') {
                targetProductId = document.getElementById('selectedProductId').value;
                if (!targetProductId) throw "출고할 상품을 검색하여 선택해주세요.";
                
                const prodRef = doc(db, 'kng_products', targetProductId);
                const prodSnap = await transaction.get(prodRef);
                if (!prodSnap.exists()) throw "상품이 존재하지 않습니다.";
                const prodData = prodSnap.data();
                
                if (prodData.stock < qty) throw "현재 재고보다 많은 수량을 출고할 수 없습니다.";
                
                currentStock = prodData.stock - qty;
                productName = prodData.name;

                transaction.update(prodRef, { 
                    stock: currentStock,
                    sellPrice: price 
                });
                
                transaction.update(metricsRef, { 
                    totalRevenue: metricsData.totalRevenue + (qty * price)
                });
            } else if (type === 'IN') {
                const existingProduct = products.find(p => 
                    (p.supplier || '최가유통') === fSupplier && 
                    p.brand === fBrand && 
                    p.name === fName && 
                    p.color === fColor && 
                    p.size === fSize
                );

                if (existingProduct) {
                    targetProductId = existingProduct.id;
                    const prodRef = doc(db, 'kng_products', targetProductId);
                    currentStock = existingProduct.stock + qty;
                    transaction.update(prodRef, { 
                        stock: currentStock,
                        buyPrice: price 
                    });
                } else {
                    targetProductId = 'p_' + Date.now();
                    const prodRef = doc(db, 'kng_products', targetProductId);
                    currentStock = qty;
                    transaction.set(prodRef, {
                        id: targetProductId,
                        supplier: fSupplier,
                        brand: fBrand,
                        name: fName,
                        color: fColor,
                        size: fSize,
                        stock: qty,
                        buyPrice: price,
                        sellPrice: 0 
                    });
                }

                transaction.update(metricsRef, { 
                    totalCost: metricsData.totalCost + (qty * price)
                });
            }
            
            const txLogRef = doc(collection(db, 'kng_transactions'));
            transaction.set(txLogRef, {
                productId: targetProductId,
                productName: productName,
                supplier: fSupplier,
                type: type,
                qty: qty,
                price: price,
                txDate: txDate,
                remarks: remarks,
                timestamp: new Date().toISOString()
            });
        });
        
        toggleFormMode(type); // 폼 초기화
        
    } catch (error) {
        alert("등록 실패: " + error);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});


// ==========================================
// 체크박스 전체선택 및 삭제 로직
// ==========================================

document.getElementById('selectAllInv').addEventListener('change', (e) => {
    document.querySelectorAll('.inv-checkbox').forEach(cb => cb.checked = e.target.checked);
});

document.getElementById('selectAllTx').addEventListener('change', (e) => {
    document.querySelectorAll('.tx-checkbox').forEach(cb => cb.checked = e.target.checked);
});

// 재고 현황 - 상품 일괄 삭제
document.getElementById('deleteInvBtn').addEventListener('click', async () => {
    const checked = document.querySelectorAll('.inv-checkbox:checked');
    if(checked.length === 0) return alert('삭제할 상품 항목을 선택해주세요.');
    if(!confirm(`선택한 ${checked.length}개의 상품을 목록에서 완전히 삭제하시겠습니까?\n해당 상품들의 초기 매입 원가가 총 매입액에서 정산(차감)됩니다.\n(경고: 이 작업은 영구적입니다.)`)) return;

    const btn = document.getElementById('deleteInvBtn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '삭제 중...';
    btn.disabled = true;

    try {
        await runTransaction(db, async (transaction) => {
            const metricsRef = doc(db, 'kng_data', 'metrics');
            const metricsSnap = await transaction.get(metricsRef);
            if (!metricsSnap.exists()) throw "데이터를 찾을 수 없습니다.";
            let metricsData = metricsSnap.data();
            let costToRestore = 0;

            for (let cb of checked) {
                const prodRef = doc(db, 'kng_products', cb.value);
                const prodSnap = await transaction.get(prodRef);
                if (prodSnap.exists()) {
                    const p = prodSnap.data();
                    costToRestore += (p.stock * p.buyPrice);
                    transaction.delete(prodRef);
                }
            }

            transaction.update(metricsRef, { 
                totalCost: Math.max(0, (metricsData.totalCost || 0) - costToRestore)
            });
        });
        document.getElementById('selectAllInv').checked = false;
    } catch(e) {
        alert('삭제 실패: ' + e);
        console.error(e);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
});

// 입출고 내역 - 기록 일괄 삭제 및 정산 복구
document.getElementById('deleteTxBtn').addEventListener('click', async () => {
    const checked = document.querySelectorAll('.tx-checkbox:checked');
    if(checked.length === 0) return alert('삭제할 내역을 하나 이상 선택해주세요.');
    if(!confirm(`선택한 ${checked.length}개의 내역을 삭제하시겠습니까?\n관련된 상품 재고량과 정산 금액(매출/매입액)이 롤백 복구됩니다.\n(경고: 이 작업은 영구적입니다.)`)) return;

    const btn = document.getElementById('deleteTxBtn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '삭제 중...';
    btn.disabled = true;

    try {
        await runTransaction(db, async (transaction) => {
            const metricsRef = doc(db, 'kng_data', 'metrics');
            const metricsSnap = await transaction.get(metricsRef);
            if (!metricsSnap.exists()) throw "데이터를 찾을 수 없습니다.";
            let metricsData = metricsSnap.data();
            
            let revToRestore = 0;
            let costToRestore = 0;
            const stockChanges = {}; // 상품ID 별 재고 증감 누적 기록본

            // 1) 체크된 트랜잭션 정보 취합
            for (let cb of checked) {
                const txRef = doc(db, 'kng_transactions', cb.value);
                const txSnap = await transaction.get(txRef);
                if (txSnap.exists()) {
                    const t = txSnap.data();
                    if(t.type === 'IN') { // 매입 취소 시: 비용차감, 재고원복(차감)
                        costToRestore += (t.qty * t.price);
                        if(t.productId) stockChanges[t.productId] = (stockChanges[t.productId] || 0) - t.qty;
                    } else if (t.type === 'OUT') { // 매출 취소 시: 수익차감, 재고원복(증가)
                        revToRestore += (t.qty * t.price);
                        if(t.productId) stockChanges[t.productId] = (stockChanges[t.productId] || 0) + t.qty;
                    }
                    transaction.delete(txRef);
                }
            }

            // 2) 실제 상품(Products) Document들에 재고 롤백 적용
            for (const pid in stockChanges) {
                const prodRef = doc(db, 'kng_products', pid);
                const prodSnap = await transaction.get(prodRef);
                if(prodSnap.exists()) {
                    const newStock = prodSnap.data().stock + stockChanges[pid];
                    transaction.update(prodRef, { stock: Math.max(0, newStock) }); // 음수 방어
                }
            }

            // 3) 대시보드 통계 저장
            transaction.update(metricsRef, { 
                totalRevenue: Math.max(0, (metricsData.totalRevenue || 0) - revToRestore),
                totalCost: Math.max(0, (metricsData.totalCost || 0) - costToRestore)
            });
        });

        document.getElementById('selectAllTx').checked = false;
    } catch(e) {
        alert('삭제 실패: ' + e);
        console.error(e);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
});


// ==========================================
// 엑셀(CSV) 다운로드
// ==========================================
function downloadCSV(data, filename) {
    if(!data || data.length === 0) return alert('내보낼 데이터가 없습니다.');
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const val = ('' + (row[header] || '')).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.getElementById('exportInventoryBtn').addEventListener('click', () => {
    const data = products.map(p => ({
        "공급사": p.supplier || "최가유통",
        "브랜드": p.brand,
        "상품명": p.name,
        "컬러": p.color,
        "사이즈": p.size,
        "매입단가": p.buyPrice,
        "매출단가": p.sellPrice,
        "현재재고": p.stock,
        "재고금액(매입가)": p.stock * p.buyPrice
    }));
    downloadCSV(data, `재고현황_${new Date().toISOString().slice(0,10)}.csv`);
});

document.getElementById('exportTransactionsBtn').addEventListener('click', () => {
    const data = transactions.map(t => ({
        "일자": t.txDate || t.timestamp.split('T')[0],
        "구분": t.type === 'IN' ? '매입(입고)' : '매출(출고)',
        "공급사": t.supplier || '-',
        "상품명/내역": t.productName || '-',
        "수량": t.qty,
        "단가": t.price,
        "비고": t.remarks || ''
    }));
    downloadCSV(data, `입출고내역_${new Date().toISOString().slice(0,10)}.csv`);
});

// 검색 기능 (데스크탑 목록 검색용)
document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTable(e.target.value);
});


// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    setTodayDate();
    initFirebase();
});
