const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정 (모든 도메인 허용)
app.use(cors());
// JSON 바디 파싱
app.use(express.json());

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

// 서버 실행
app.listen(PORT, () => {
    console.log(`K&G API Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/api/seller-k/products`);
});
