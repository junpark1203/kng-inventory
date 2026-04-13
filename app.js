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
const initialProducts = [
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
            
            populateSelect();
            renderTable();
            updateDashboard();
        });
        
    } catch (e) {
        console.error("Firebase 초기화 에러:", e);
        alert("Firebase DB에 접근할 수 없습니다. 콘솔의 Firestore 권한(Rules)이 열려 있는지 확인하세요.");
    }
}

// Select 박스 업데이트 (기존 선택 값 유지)
function populateSelect() {
    const select = document.getElementById('productSelect');
    const currentVal = select.value;
    select.innerHTML = '<option value="">상품을 선택하세요</option>';
    
    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `[${p.brand}] ${p.name} - ${p.color} (${p.size}) [재고:${p.stock}]`;
        select.appendChild(option);
    });
    
    // 다시 그릴 때 기존에 선택 중이던 것 복구
    if(products.find(p => p.id === currentVal)) {
        select.value = currentVal;
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
            p.brand.includes(searchTerm)
        );
    }
    
    filtered.forEach(p => {
        const tr = document.createElement('tr');
        const badgeClass = p.stock <= 2 ? 'stock-badge low' : 'stock-badge';
        
        tr.innerHTML = `
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

// 트랜잭션 타입 토글시 단가 힌트 및 단가 자동변경
document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const hint = document.getElementById('priceHint');
        const select = document.getElementById('productSelect');
        const selectedId = select.value;
        const product = products.find(p => p.id === selectedId);

        if (e.target.value === 'IN') {
            hint.textContent = '매입 단가 기준 (재고 증가)';
            if(product) document.getElementById('txPrice').value = product.buyPrice;
        } else {
            hint.textContent = '매출 단가 기준 (재고 차감)';
            if(product) document.getElementById('txPrice').value = product.sellPrice;
        }
    });
});

// 상품 선택시 단가 자동 입력
document.getElementById('productSelect').addEventListener('change', (e) => {
    const productId = e.target.value;
    const type = document.querySelector('input[name="txType"]:checked').value;
    const product = products.find(p => p.id === productId);
    
    if (product) {
        document.getElementById('txPrice').value = type === 'IN' ? product.buyPrice : product.sellPrice;
    } else {
        document.getElementById('txPrice').value = '';
    }
});

// 폼 서밋 핸들러 (Firebase 트랜잭션 사용)
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productSelect').value;
    const qty = parseInt(document.getElementById('txQty').value, 10);
    const price = parseInt(document.getElementById('txPrice').value, 10);
    const type = document.querySelector('input[name="txType"]:checked').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!productId || isNaN(qty) || isNaN(price)) {
        alert('모든 필드값을 올바르게 입력해주세요.');
        return;
    }
    
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> 처리중...";
    
    try {
        await runTransaction(db, async (transaction) => {
            const prodRef = doc(db, 'kng_products', productId);
            const metricsRef = doc(db, 'kng_data', 'metrics');
            
            const prodSnap = await transaction.get(prodRef);
            const metricsSnap = await transaction.get(metricsRef);
            
            if (!prodSnap.exists() || !metricsSnap.exists()) {
                throw "데이터를 찾을 수 없습니다.";
            }
            
            const prodData = prodSnap.data();
            const metricsData = metricsSnap.data();
            
            if (type === 'OUT' && prodData.stock < qty) {
                throw "현재 재고보다 많은 수량을 출고할 수 없습니다.";
            }
            
            const newStock = type === 'IN' ? prodData.stock + qty : prodData.stock - qty;
            const revenueChange = type === 'OUT' ? qty * price : 0;
            const costChange = type === 'IN' ? qty * price : 0;
            
            transaction.update(prodRef, { stock: newStock });
            transaction.update(metricsRef, { 
                totalRevenue: metricsData.totalRevenue + revenueChange,
                totalCost: metricsData.totalCost + costChange
            });
            
            // 기록 보존용 로그 남기기
            const txLogRef = doc(collection(db, 'kng_transactions'));
            transaction.set(txLogRef, {
                productId,
                productName: prodData.name,
                type,
                qty,
                price,
                timestamp: new Date().toISOString()
            });
        });
        
        // 폼 리셋
        document.getElementById('transactionForm').reset();
        document.getElementById('txPrice').value = '';
        
    } catch (error) {
        alert("입출고 등록 실패: " + error);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// 검색 기능
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
