import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_booking_db',
    port: process.env.DB_PORT || 3307
};

app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==================== [ 1. Login ] ====================
// ==================== [ Login หน้าเดียว รวมทุก Role ] ====================
app.post('/api/login', async (req, res) => {
    const username = req.body.username || '';
    const password = req.body.password || '';

    if (!username.trim() || !password.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        // 🟢 เช็คแค่ username กับ password พอ แล้วให้ DB คืนค่า role กลับมา
        const [rows] = await connection.execute(
            'SELECT username, name, dept, role FROM users WHERE username = ? AND password = ?',
            [username.trim(), password.trim()]
        );
        await connection.end();

        if (rows.length > 0) {
            const user = rows[0];
            // 🟢 ส่งข้อมูล user และ role กลับไปให้ Frontend
            res.json({ success: true, user: user });
        } else {
            res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }
    } catch (error) { 
        console.error("Login Error:", error);
        res.status(500).json({ error: error.message }); 
    }
});

// ==================== [ 2. Employees ] ====================
app.get('/api/employees', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT username as id, name, dept, password, role FROM users ORDER BY role ASC, username DESC");
        await connection.end();
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/employees', async (req, res) => {
    const { id, name, dept, password, role } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [exist] = await connection.execute('SELECT username FROM users WHERE username = ?', [id.trim()]);
        if (exist.length > 0) {
            await connection.end();
            return res.status(400).json({ message: 'รหัสผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
        }
        await connection.execute(
            'INSERT INTO users (username, password, name, dept, role) VALUES (?, ?, ?, ?, ?)',
            [id.trim().toUpperCase(), password, name.trim(), dept.trim() || 'ไม่ระบุแผนก', role || 'employee']
        );
        await connection.end();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/employees/:id', async (req, res) => {
    const oldId = req.params.id;
    const { id, name, dept, password, role } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);
        if (oldId.toUpperCase() !== id.trim().toUpperCase()) {
            const [exist] = await connection.execute('SELECT username FROM users WHERE username = ?', [id.trim()]);
            if (exist.length > 0) {
                await connection.end();
                return res.status(400).json({ message: 'ไม่สามารถใช้ไอดีนี้ได้ เนื่องจากมีผู้ใช้งานคนอื่นใช้ไปแล้ว' });
            }
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute(
            'UPDATE users SET username = ?, name = ?, dept = ?, password = ?, role = ? WHERE username = ?',
            [id.trim().toUpperCase(), name.trim(), dept.trim(), password.trim(), role, oldId]
        );
        await connection.execute('UPDATE bookings SET borrower = ? WHERE borrower = ?', [id.trim().toUpperCase(), oldId]);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        await connection.end();
        res.json({ success: true });
    } catch (error) { 
    console.error("🔥 Login Error:", error); // ปริ้นท์บอกใน Terminal
    res.status(500).json({ error: error.message, details: error.code }); }
});

app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM users WHERE username = ?', [id]);
        await connection.end();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== [ 3. Vehicles ] ====================
app.get('/api/vehicles', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT *, id AS vehicle_id FROM vehicles ORDER BY id ASC');
        await connection.end();
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/vehicles', upload.single('imageFile'), async (req, res) => {
    const { id, model, plate, seats, status, fuel_type, transmission, type, description } = req.body;
    // 🟢 ใช้ Relative Path เพื่อให้มือถือดึงรูปผ่าน IP เซิร์ฟเวอร์ได้ถูกต้อง
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [exist] = await connection.execute('SELECT id FROM vehicles WHERE id = ?', [id.trim()]);
        if (exist.length > 0) {
            await connection.end();
            return res.status(400).json({ message: 'รหัสรถยนต์ (ID) นี้มีอยู่ในระบบแล้ว' });
        }
        await connection.execute(
            `INSERT INTO vehicles (id, model, plate, seats, image, status, fuel_type, transmission, type, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id.trim().toLowerCase(), model.trim(), plate.trim(), seats || 5, imageUrl, status || 'available', fuel_type || '', transmission || '', type || '', description || '']
        );
        await connection.end();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/vehicles/:id', upload.single('imageFile'), async (req, res) => {
    const { id } = req.params;
    const { model, plate, seats, image, status, act_number, act_expiry_date } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : image;

    try {
        const connection = await mysql.createConnection(dbConfig);
        // 🟢 เพิ่ม act_number และ act_expiry_date เข้าคำสั่ง UPDATE SQL
        await connection.execute(
            `UPDATE vehicles 
             SET model = ?, plate = ?, seats = ?, image = ?, status = ?, act_number = ?, act_expiry_date = ? 
             WHERE id = ?`,
            [
                model ? model.trim() : '', 
                plate ? plate.trim() : '', 
                seats, 
                imageUrl, 
                status, 
                act_number || '', 
                act_expiry_date || null, 
                id
            ]
        );
        await connection.end();
        res.json({ success: true });
    } catch (error) { 
        console.error("Error updating vehicle:", error);
        res.status(500).json({ error: error.message }); 
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM vehicles WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 🟢 อัปเดตข้อมูล พ.ร.บ. รถยนต์
app.put('/api/vehicles/:id/act', async (req, res) => {
    const { id } = req.params;
    const { act_expiry_date, act_number } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE vehicles SET act_expiry_date = ?, act_number = ? WHERE id = ?',
            [act_expiry_date, act_number, id]
        );
        await connection.end();
        res.json({ success: true, message: 'อัปเดตข้อมูล พ.ร.บ. เรียบร้อย' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==================== [ 4. Bookings ] ====================

app.get('/api/bookings', async (req, res) => {
    const borrowerName = req.query.borrower || '';
    const userRole = req.query.role || '';
    const isMyBookingPage = req.query.isMyBooking === 'true'; 

    try {
        const connection = await mysql.createConnection(dbConfig);
        let rows = [];

        if (isMyBookingPage) {
            const [myRows] = await connection.execute(
                `SELECT b.*, u.name AS borrower_real_name 
                 FROM bookings b
                 LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                 WHERE LOWER(b.borrower) = LOWER(?) 
                 ORDER BY b.start_date DESC`,
                [borrowerName.trim()]
            );
            rows = myRows;
        } 
        else if (borrowerName === '' || userRole.trim().toLowerCase() === 'admin' || borrowerName.toLowerCase().includes('admin')) {
            const [allRows] = await connection.execute(
                `SELECT b.*, u.name AS borrower_real_name 
                 FROM bookings b
                 LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                 ORDER BY b.start_date DESC`
            );
            rows = allRows;
        } else {
            const [myRows] = await connection.execute(
                `SELECT b.*, u.name AS borrower_real_name 
                 FROM bookings b
                 LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                 WHERE (b.status IS NULL OR b.status != 'cancelled')
                 ORDER BY b.start_date DESC`
            );
            rows = myRows;
        }

        await connection.end();
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/bookings', async (req, res) => {
    const vehicle_id = req.body.vehicle_id || req.body.vehicleId || req.body.carId || '';
    const borrower = req.body.borrower || req.body.user || req.body.username || '';
    const vehicle_model = req.body.vehicle_model || req.body.vehicleModel || req.body.model || 'ไม่ระบุรุ่นรถ';
    const start_date = req.body.start_date || req.body.startDate || '';
    const end_date = req.body.end_date || req.body.endDate || '';

    if (!vehicle_id || !borrower || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'กรอกข้อมูลการจองไม่ครบถ้วน' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            `INSERT INTO bookings (vehicle_id, borrower, vehicle_model, start_date, end_date, status, created_at) 
             VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
            [vehicle_id, borrower, vehicle_model, start_date, end_date]
        );
        await connection.end();
        res.json({ success: true, message: 'บันทึกการจองเรียบร้อยคัป' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/bookings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
        await connection.end();
        res.json({ success: true, message: 'ยกเลิกสิทธิ์การจองเรียบร้อยคัป' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/bookings/delete-batch', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'กรุณาเลือกรายการที่ต้องการลบ' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const placeholders = ids.map(() => '?').join(',');
        await connection.execute(`DELETE FROM bookings WHERE id IN (${placeholders})`, ids);
        await connection.end();
        res.json({ success: true, message: `ลบรายการจองจำนวน ${ids.length} รายการสำเร็จ` });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM bookings WHERE id = ?', [id]);
        await connection.end();
        res.json({ success: true, message: 'ลบรายการจองสำเร็จ' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 🟢 เพิ่ม '0.0.0.0' เพื่อเปิดให้ iPad/มือถือ ต่อเข้าพอร์ต 5000 ได้
app.listen(5000, '0.0.0.0', () => console.log('🚀 API CRUD Server รันเรียบร้อยที่พอร์ต 5000 (เปิดรับทุก IP)'));