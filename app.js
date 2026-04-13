import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, 
    onSnapshot, addDoc, runTransaction, writeBatch 
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// Firebase 설정 (사용자 제공)
const firebaseConfig = {
    apiKey: "AIzaSyDqdzlXTddvoBYWaVbTM7_ERO_rUGWjIgE",
    authDomain: "kng-inventory.firebaseapp.com",
    projectId: "kng-inventory",
    storageBucket: "kng-inventory.firebasestorage.app",
    messagingSenderId: "647181899026",
    appId: "1:647181899026:web:7cd3b62a7a10771b204fcb",
    measurementId: "G-5VYMDB59XD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// 유틸리티 포맷팅 함수
const formatCurrency = (number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(number);

// 초기 상품 데이터 (DB 초기화용)
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
let totalRevenue = 0; 
let totalCost = 0; 

// 초기화 함수
async function initFirebase() {
    try {
        // 1. 데이터베이스 초기화 체크 (최초 접속시 데이터 구성)
        const metricsRef = doc(db, 'kng_data', 'metrics');
        const metricsSnap = await getDoc(metricsRef);
        
        if (!metricsSnap.exists()) {
            console.log("Firebase DB 초기 셋업 진행중...");
            const batch = writeBatch(db);
            
            let initialCost = initialProducts.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);
            batch.set(metricsRef, { totalRevenue: 0, totalCost: initialCost });
            
            initialProducts.forEach(p => {
                const pRef = doc(db, 'kng_products', p.id);
                batch.set(pRef, p);
            });
            
            await batch.commit();
            console.log("DB 초기 세팅 완료!");
        }

        // 2. 실시간 매출/매입 수치 구독
        onSnapshot(metricsRef, (docSnap) => {
            if(docSnap.exists()) {
                const data = docSnap.data();
                totalRevenue = data.totalRevenue || 0;
                totalCost = data.totalCost || 0;
                updateDashboard();
            }
        });

        // 3. 실시간 제품 재고 구독
        onSnapshot(collection(db, 'kng_products'), (snapshot) => {
            const newProducts = [];
            snapshot.forEach((docSnap) => {
                newProducts.push(docSnap.data());
            });
            
            // ID 오름차순으로 항상 테이블 정렬 고정
            newProducts.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true, sensitivity: 'base'}));
            products = newProducts;
            
            renderTable();
            updateDashboard();
        });
        
    } catch (e) {
        console.error("Firebase 초기화 에러:", e);
        alert("Firebase DB에 접근할 수 없습니다. 콘솔의 Firestore 권한(Rules)이 열려 있는지 확인하세요.");
    }
}

// 테이블 렌더링
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
        const badgeClass = p.stock <= 2 ? 'stock-badge low' : 'stock-badge';
        const sp = p.supplier || '최가유통'; // 구버전 데이터 대응
        
        tr.innerHTML = `
            <td>${sp}</td>
            <td>${p.brand}</td>
            <td>${p.name}</td>
            <td>${p.color}</td>
            <td>${p.size}</td>
            <td>${formatCurrency(p.buyPrice)}</td>
            <td>${formatCurrency(p.sellPrice)}</td>
            <td><span class="${badgeClass}">${p.stock}</span></td>
            <td>${formatCurrency(p.stock * p.buyPrice)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 대시보드 위젯 업데이트
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
    } else {
        hint.textContent = '매출 단가 기준 (재고 차감)';
        outSearchContainer.classList.remove('hidden');
        formFields.forEach(id => {
            const el = document.getElementById(id);
            el.readOnly = true;
            el.classList.add('readonly-input');
        });
        // OUT으로 전환 시 기존 폼 비우기
        document.getElementById('transactionForm').reset();
        document.getElementById('typeOut').checked = true;
    }
}

document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', (e) => toggleFormMode(e.target.value));
});

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
// 폼 서밋 핸들러 (Firebase DB 연동)
// ==========================================
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const qty = parseInt(document.getElementById('txQty').value, 10);
    const price = parseInt(document.getElementById('txPrice').value, 10);
    const type = document.querySelector('input[name="txType"]:checked').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (isNaN(qty) || isNaN(price)) {
        alert('수량과 단가를 올바르게 입력해주세요.');
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
            
            // 기록 보존용 로그 남기기
            const txLogRef = doc(collection(db, 'kng_transactions'));
            transaction.set(txLogRef, {
                productId: targetProductId,
                productName: productName,
                supplier: fSupplier,
                type: type,
                qty: qty,
                price: price,
                timestamp: new Date().toISOString()
            });
        });
        
        // 폼 리셋
        toggleFormMode('IN'); // 기본 상태로 돌아가기
        
    } catch (error) {
        alert("등록 실패: " + error);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// 검색 기능 (데스크탑 목록 검색용)
document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTable(e.target.value);
});

// 데이터 초기화 버튼 (DB 전체 초기화)
document.getElementById('resetDataBtn').addEventListener('click', async () => {
    if (confirm('클라우드 상의 모든 데이터를 최초 상태(초기 재고 및 매출 0)로 복구하시겠습니까? (이 작업은 영구적입니다)')) {
        const btn = document.getElementById('resetDataBtn');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 초기화 중...";
        btn.disabled = true;
        
        try {
            const batch = writeBatch(db);
            const initialCost = initialProducts.reduce((sum, p) => sum + (p.buyPrice * p.stock), 0);
            batch.set(doc(db, 'kng_data', 'metrics'), { totalRevenue: 0, totalCost: initialCost });
            
            initialProducts.forEach(p => {
                batch.set(doc(db, 'kng_products', p.id), p);
            });
            
            await batch.commit();
            alert('데이터베이스가 초기화 되었습니다.');
        } catch (e) {
            alert('초기화 실패: ' + e);
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
});

// 앱 시작
document.addEventListener('DOMContentLoaded', initFirebase);
