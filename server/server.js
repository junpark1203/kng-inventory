const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 보안 헤더 (XSS, 클릭재킹 방지 등)
app.use(helmet({
    contentSecurityPolicy: false  // Firebase SDK 로드를 위해 비활성화
}));
// CORS 설정
app.use(cors());
// JSON 바디 파싱
app.use(express.json());
// API 접속 횟수 제한 (IP당 15분에 100회)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }
});
app.use('/api/', apiLimiter);

// ==========================================
// 프론트엔드 정적 파일 서빙
// ==========================================
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('public 폴더 생성됨:', publicDir);
}
app.use(express.static(publicDir));

// 데이터 디렉터리 확인 및 생성
// NAS에서 볼륨으로 마운트될 디렉터리입니다.
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// SQLite DB 연결 설정
const dbFile = path.join(dataDir, 'kng.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('DB 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스 연결 완료:', dbFile);
        initDb();
    }
});

// 테이블 생성 (앱 최초 실행 시)
function initDb() {
    db.run(`
        CREATE TABLE IF NOT EXISTS seller_k_products (
            id TEXT PRIMARY KEY,
            supplier TEXT,
            brand TEXT,
            name TEXT,
            color TEXT,
            size TEXT,
            uploadDate TEXT,
            buyPrice INTEGER DEFAULT 0,
            buyShipping INTEGER DEFAULT 0,
            shippingBasis TEXT,
            shippingQty INTEGER DEFAULT 1,
            sellPrice INTEGER DEFAULT 0,
            sellShipping INTEGER DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        )
    `, (err) => {
        if (err) console.error('테이블 생성 오류:', err.message);
        else console.log('seller_k_products 테이블 확인 완료');
    });
}

// ----------------------------------------------------
// API 엔드포인트
// ----------------------------------------------------

// 1. 전체 목록 조회
app.get('/api/seller-k/products', (req, res) => {
    db.all('SELECT * FROM seller_k_products ORDER BY uploadDate DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. 단일 매입상품 등록
app.post('/api/seller-k/products', (req, res) => {
    const p = req.body;
    const sql = `
        INSERT INTO seller_k_products (
            id, supplier, brand, name, color, size, uploadDate, 
            buyPrice, buyShipping, shippingBasis, shippingQty, sellPrice, sellShipping, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        p.id, p.supplier || '', p.brand || '', p.name || '', p.color || '', p.size || '', p.uploadDate || '',
        p.buyPrice || 0, p.buyShipping || 0, p.shippingBasis || '수량별', p.shippingQty || 1, 
        p.sellPrice || 0, p.sellShipping || 0, p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: '등록 성공', id: p.id });
    });
});

// 3. 단일 매입상품 수정
app.put('/api/seller-k/products/:id', (req, res) => {
    const id = req.params.id;
    const p = req.body;
    const sql = `
        UPDATE seller_k_products SET
            supplier = ?, brand = ?, name = ?, color = ?, size = ?, uploadDate = ?,
            buyPrice = ?, buyShipping = ?, shippingBasis = ?, shippingQty = ?, 
            sellPrice = ?, sellShipping = ?, updatedAt = ?
        WHERE id = ?
    `;
    const params = [
        p.supplier || '', p.brand || '', p.name || '', p.color || '', p.size || '', p.uploadDate || '',
        p.buyPrice || 0, p.buyShipping || 0, p.shippingBasis || '수량별', p.shippingQty || 1, 
        p.sellPrice || 0, p.sellShipping || 0, new Date().toISOString(), id
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
        res.json({ message: '수정 성공' });
    });
});

// 4. 상품 다중 삭제
app.post('/api/seller-k/products/delete', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '삭제할 ID 배열이 필요합니다.' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM seller_k_products WHERE id IN (${placeholders})`;
    
    db.run(sql, ids, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '삭제 성공', deletedCount: this.changes });
    });
});

// ==========================================
// SPA 폴백: 알 수 없는 경로는 index.html로
// ==========================================
app.get('*', (req, res) => {
    const indexFile = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(404).send('index.html 파일을 public/ 폴더에 업로드해주세요.');
    }
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`K&G Server is running on port ${PORT}`);
    console.log(`웹 페이지: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/seller-k/products`);
});
