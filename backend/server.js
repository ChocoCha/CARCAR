import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cron from 'node-cron'; 

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
app.post('/api/login', async (req, res) => {
    const username = req.body.username || '';
    const password = req.body.password || '';

    if (!username.trim() || !password.trim()) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT username, name, dept, role FROM users WHERE username = ? AND password = ?',
            [username.trim(), password.trim()]
        );

        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ==================== [ 2. Employees ] ====================
app.get('/api/employees', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT username as id, name, dept, password, role FROM users ORDER BY role ASC, username DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, name, dept, password, role } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [exist] = await connection.execute('SELECT username FROM users WHERE username = ?', [id.trim()]);
        if (exist.length > 0) {
            return res.status(400).json({ message: 'รหัสผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
        }
        await connection.execute(
            'INSERT INTO users (username, password, name, dept, role) VALUES (?, ?, ?, ?, ?)',
            [id.trim().toUpperCase(), password, name.trim(), dept.trim() || 'ไม่ระบุแผนก', role || 'employee']
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.put('/api/employees/:id', async (req, res) => {
    const oldId = req.params.id;
    const { id, name, dept, password, role } = req.body;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        const newUsername = id.trim().toUpperCase();
        const oldUsername = oldId.trim().toUpperCase();

        if (oldUsername !== newUsername) {
            const [exist] = await connection.execute('SELECT username FROM users WHERE username = ?', [newUsername]);
            if (exist.length > 0) {
                return res.status(400).json({ message: 'ไม่สามารถใช้ไอดีนี้ได้ เนื่องจากมีผู้ใช้งานคนอื่นใช้ไปแล้ว' });
            }
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        await connection.execute(
            'UPDATE users SET username = ?, name = ?, dept = ?, password = ?, role = ? WHERE username = ?',
            [newUsername, name.trim(), dept.trim(), password.trim(), role, oldUsername]
        );
        await connection.execute(
            'UPDATE bookings SET borrower = ? WHERE borrower = ?',
            [newUsername, oldUsername]
        );
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({ success: true, message: 'อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Employee Update Error:", error);
        res.status(500).json({ error: error.message, details: error.code });
    } finally {
        if (connection) await connection.end();
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM users WHERE username = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ==================== [ 3. Vehicles (กู้คืนกลับมาครบถ้วน) ] ====================

app.get('/api/vehicles', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT *, id AS vehicle_id FROM vehicles ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/vehicles', upload.single('imageFile'), async (req, res) => {
    const { id, model, plate, seats, mileage, status, act_number, act_expiry_date } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        const [exist] = await connection.execute('SELECT id FROM vehicles WHERE id = ?', [id.trim()]);
        if (exist.length > 0) {
            return res.status(400).json({ message: 'รหัสรถยนต์ (ID) นี้มีอยู่ในระบบแล้ว' });
        }
        await connection.execute(
            `INSERT INTO vehicles (id, model, plate, seats, mileage, image, status, act_number, act_expiry_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id.trim().toLowerCase(),
                model ? model.trim() : '',
                plate ? plate.trim() : '',
                seats ? Number(seats) : 5,
                mileage !== undefined && mileage !== null ? Number(mileage) : 0,
                imageUrl,
                status || 'available',
                act_number || '',
                act_expiry_date || null
            ]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// 🟢 แก้ไขข้อมูลรถยนต์: รับ mileage และอัปเดตลงตาราง vehicles พร้อมซิงค์คิวที่ยังรอคืน
app.put('/api/vehicles/:id', upload.single('imageFile'), async (req, res) => {
    const { id } = req.params;
    const { model, plate, seats, mileage, image, status, act_number, act_expiry_date } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : image;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        const newMileage = mileage !== undefined && mileage !== null ? Number(mileage) : 0;

        // 1. อัปเดตข้อมูลรถยนต์
        await connection.execute(   
            `UPDATE vehicles 
             SET model = ?, plate = ?, seats = ?, mileage = ?, image = ?, status = ?, act_number = ?, act_expiry_date = ? 
             WHERE id = ?`,
            [
                model ? model.trim() : '',
                plate ? plate.trim() : '',
                seats ? Number(seats) : 5,
                newMileage,
                imageUrl,
                status || 'available',
                act_number || '',
                act_expiry_date || null,
                id
            ]
        );

        // 🟢 2. ซิงค์เลขไมล์ไปยังคิวจองของรถคันนี้ที่ยังไม่ได้ส่งคืน (status = 'active') ทันที
        await connection.execute(
            `UPDATE bookings 
             SET start_mileage = ? 
             WHERE vehicle_id = ? AND status = 'active'`,
            [newMileage, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.delete('/api/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        await connection.execute(
            'UPDATE bookings SET vehicle_id = NULL WHERE vehicle_id = ? AND DATE(start_date) <= CURDATE()',
            [id]
        );

        await connection.execute(
            'DELETE FROM bookings WHERE vehicle_id = ? AND DATE(start_date) > CURDATE()',
            [id]
        );

        await connection.execute('DELETE FROM vehicles WHERE id = ?', [id]);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({ success: true, message: 'ลบข้อมูลรถเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Delete Vehicle Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.put('/api/vehicles/:id/act', async (req, res) => {
    const { id } = req.params;
    const { act_expiry_date, act_number } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE vehicles SET act_expiry_date = ?, act_number = ? WHERE id = ?',
            [act_expiry_date, act_number, id]
        );
        res.json({ success: true, message: 'อัปเดตข้อมูล พ.ร.บ. เรียบร้อย' });
    } catch (error) {
        console.error("Error updating ACT:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ==================== [ 4. Bookings ] ====================

app.get('/api/bookings', async (req, res) => {
    const borrowerName = req.query.borrower || '';
    const userRole = req.query.role || '';
    const isMyBookingPage = req.query.isMyBooking === 'true';
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        let rows = [];

        const baseQuery = `
            SELECT b.*, u.name AS borrower_real_name, u.dept AS dept, v.plate, v.image
            FROM bookings b
            LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
        `;

        if (isMyBookingPage) {
            const [myRows] = await connection.execute(
                `${baseQuery} WHERE LOWER(b.borrower) = LOWER(?) ORDER BY b.id DESC`,
                [borrowerName.trim()]
            );
            rows = myRows;
        } else if (borrowerName === '' || userRole.trim().toLowerCase() === 'admin' || borrowerName.toLowerCase().includes('admin')) {
            const [allRows] = await connection.execute(
                `${baseQuery} ORDER BY b.id DESC`
            );
            rows = allRows;
        } else {
            const [myRows] = await connection.execute(
                `${baseQuery} WHERE (b.status IS NULL OR b.status != 'cancelled') ORDER BY b.id DESC`
            );
            rows = myRows;
        }

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});


app.post('/api/bookings', async (req, res) => {
    const vehicle_id = req.body.vehicle_id || req.body.vehicleId || '';
    const borrower = req.body.borrower || '';
    const vehicle_model = req.body.vehicle_model || '';
    const start_date = req.body.start_date || '';
    const end_date = req.body.end_date || '';
    const destination = req.body.destination || 'ไม่ระบุสถานที่';
    const reqDept = req.body.dept || '';
    let connection;

    if (!vehicle_id || !borrower || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'กรอกข้อมูลการจองไม่ครบถ้วน' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);

        // 🟢 1. ตรวจสอบว่ารถคันนี้มีคิวค้างส่งคืน (เลยกำหนดแล้วแต่ยังเป็น active) หรือไม่
        const [overdueUnreturned] = await connection.execute(
            `SELECT b.*, u.name AS borrower_real_name, u.dept AS borrower_dept 
             FROM bookings b
             LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
             WHERE b.vehicle_id = ? 
               AND b.status = 'active' 
               AND DATE(b.end_date) < CURDATE()
             LIMIT 1`,
            [vehicle_id]
        );

        if (overdueUnreturned.length > 0) {
            const overdueCar = overdueUnreturned[0];
            const name = overdueCar.borrower_real_name || overdueCar.borrower;
            return res.status(400).json({
                success: false,
                isOverdueBlock: true,
                message: `ไม่สามารถจองได้: รถยนต์คันนี้กำลังติดใช้งานเกินกำหนดโดยคุณ ${name} และยังไม่มีการกดส่งคืนรถเข้าสู่ระบบ`
            });
        }

        // 🟢 2. ตรวจสอบคิวชนตามช่วงวันที่ปกติ (เฉพาะคิวที่ยัง active)
        const [conflicts] = await connection.execute(
            `SELECT id FROM bookings 
             WHERE vehicle_id = ? 
               AND status = 'active' 
               AND start_date <= ? AND end_date >= ?`,
            [vehicle_id, end_date, start_date]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'ช่วงวันที่คุณเลือกตรงกับคิวที่มีผู้ใช้งานอื่นจองไว้แล้ว'
            });
        }

        // ดึงเลขไมล์และดำเนินการบันทึกตามปกติ...
        const [cars] = await connection.execute('SELECT mileage FROM vehicles WHERE id = ?', [vehicle_id]);
        const startMileage = (cars.length > 0 && cars[0].mileage != null) ? Number(cars[0].mileage) : 0;

        const [users] = await connection.execute(
            'SELECT username, name, dept FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(name) = LOWER(?)',
            [borrower.trim(), borrower.trim()]
        );

        let borrowerRealName = borrower;
        let borrowerDept = reqDept || '';
        if (users.length > 0) {
            borrowerRealName = users[0].name || borrower;
            if (!borrowerDept) borrowerDept = users[0].dept || '';
        }

        await connection.execute(
            `INSERT INTO bookings (vehicle_id, borrower, vehicle_model, start_date, end_date, destination, start_mileage, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
            [vehicle_id, borrower, vehicle_model, start_date, end_date, destination, startMileage]
        );

        const formattedStart = new Date(start_date).toLocaleDateString('th-TH');
        const formattedEnd = new Date(end_date).toLocaleDateString('th-TH');

        const lineMsg = `🚗 [แจ้งเตือนการจองรถ]\n` +
            `______________________________\n\n` +
            `👤 ผู้จอง: ${borrowerRealName} (${borrower})\n` +
            `👨🏻‍💻 แผนก: ${borrowerDept}\n` +
            `🚘 รถยนต์: ${vehicle_model}\n` +
            `🏬 งานโครงการ: ${destination}\n` +
            `📟 เลขไมล์ก่อนใช้งาน: ${startMileage.toLocaleString()} ไมล์\n` +
            `🗓️ ตั้งแต่วันที่: ${formattedStart}\n` +
            `🗓️ ถึงวันที่: ${formattedEnd}\n` +
            `______________________________`;

        await sendLineNotification(lineMsg);

        res.json({ success: true, message: 'บันทึกการจองเรียบร้อย' });
    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// คืนรถ (ไม่มีแจ้งเตือน LINE)
app.put('/api/bookings/:id/return', async (req, res) => {
    const { id } = req.params;
    const { mileage } = req.body;
    let connection;

    if (mileage === undefined || mileage === null || isNaN(Number(mileage))) {
        return res.status(400).json({ success: false, message: 'กรุณาระบุเลขไมล์ที่ถูกต้อง' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);

        const [bookings] = await connection.execute('SELECT * FROM bookings WHERE id = ?', [id]);
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการจองนี้' });
        }

        const b = bookings[0];
        const newMileage = Number(mileage);

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        
        const endDateObj = new Date(b.end_date);
        const yyyy = endDateObj.getFullYear();
        const mm = String(endDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(endDateObj.getDate()).padStart(2, '0');
        const bookingEndDateStr = `${yyyy}-${mm}-${dd}`;

        const isLate = todayStr > bookingEndDateStr;
        const finalStatus = isLate ? 'late_returned' : 'returned';

        await connection.execute(
            "UPDATE bookings SET status = ?, returned_mileage = ? WHERE id = ?",
            [finalStatus, newMileage, id]
        );

        if (b.vehicle_id) {
            await connection.execute(
                "UPDATE vehicles SET mileage = ? WHERE id = ?",
                [newMileage, b.vehicle_id]
            );
        }

        res.json({ 
            success: true, 
            isLate: isLate,
            message: isLate ? 'คืนรถเรียบร้อย (บันทึกสถานะ: คืนรถล่าช้า)' : 'คืนรถเรียบร้อยตามกำหนดเวลา' 
        });
    } catch (error) {
        console.error("Return vehicle error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ยกเลิกการจอง (ไม่มีแจ้งเตือน LINE)
app.put('/api/bookings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        const [bookings] = await connection.execute('SELECT id FROM bookings WHERE id = ?', [id]);
        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการจองนี้ในระบบ' });
        }

        await connection.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

        res.json({ success: true, message: 'ยกเลิกสิทธิ์การจองเรียบร้อยแล้ว' });
    } catch (error) {
        console.error("Cancel Booking Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ลบรายการจองแบบกลุ่ม
app.post('/api/bookings/delete-batch', async (req, res) => {
    const { ids } = req.body;
    let connection;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'กรุณาเลือกรายการที่ต้องการลบ' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);
        const placeholders = ids.map(() => '?').join(',');
        await connection.execute(`DELETE FROM bookings WHERE id IN (${placeholders})`, ids);
        
        res.json({ success: true, message: `ลบรายการจองจำนวน ${ids.length} รายการสำเร็จ` });
    } catch (error) { 
        console.error("Batch Delete Error:", error);
        res.status(500).json({ error: error.message }); 
    } finally {
        if (connection) await connection.end();
    }
});

// ลบรายการจองเดี่ยว
app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM bookings WHERE id = ?', [id]);
        res.json({ success: true, message: 'ลบรายการจองสำเร็จ' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// ==========================================
// 🟢 ระบบแจ้งเตือน LINE MESSAGING API
// ==========================================

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
let ADMIN_LINE_USER_ID = process.env.ADMIN_LINE_USER_ID || '';

app.post('/api/line-webhook', async (req, res) => {
    const events = req.body.events || [];

    for (const event of events) {
        if (event.source && event.source.groupId) {
            const gid = event.source.groupId;
            console.log("------------------------------------------");
            console.log("🎯 GROUP ID จริงของคุณคือ:", gid);
            console.log("------------------------------------------");

            if (event.replyToken) {
                const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
                try {
                    await fetch('https://api.line.me/v2/bot/message/reply', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token.trim()}`
                        },
                        body: JSON.stringify({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: `Group ID จริงคือ:\n${gid}` }]
                        })
                    });
                } catch (e) {
                    console.error("Reply error:", e);
                }
            }
        }
    }
    res.sendStatus(200);
});

async function sendLineNotification(messageText) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const targetId = process.env.ADMIN_LINE_USER_ID;

    if (!token || !targetId) {
        console.log("⚠️ ข้ามการส่ง LINE: ยังไม่ได้ตั้งค่า TOKEN หรือ GROUP_ID ใน .env");
        return;
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.trim()}`
            },
            body: JSON.stringify({
                to: targetId.trim(),
                messages: [
                    {
                        type: 'text',
                        text: String(messageText)
                    }
                ]
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("🟢 ส่งแจ้งเตือนเข้า LINE สำเร็จ!");
        } else {
            console.error("❌ LINE Send Error Detail:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("❌ Error sending LINE notification:", error);
    }
}

async function checkAndNotifyExpiringACT() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(`
            SELECT id, model, plate, act_number, act_expiry_date,
                   DATEDIFF(act_expiry_date, CURDATE()) AS days_left
            FROM vehicles 
            WHERE act_expiry_date IS NOT NULL 
              AND DATEDIFF(act_expiry_date, CURDATE()) <= 90
            ORDER BY act_expiry_date ASC
        `);

        if (rows.length === 0) {
            console.log("🟢 [ACT Check] ไม่มีรถที่ต้องแจ้งเตือน พ.ร.บ.");
            return;
        }

        let notifyList = [];

        rows.forEach((car) => {
            const days = Math.floor(Number(car.days_left));
            let shouldNotify = false;

            if (days <= 7) {
                shouldNotify = true;
            }
            else if (days === 30 || days === 60 || days === 90) {
                shouldNotify = true;
            }

            if (shouldNotify) {
                notifyList.push(car);
            }
        });
        if (notifyList.length === 0) {
            console.log("ℹ️ [ACT Check] วันนี้ไม่มีรถที่ถึงรอบการแจ้งเตือน");
            return;
        }

        let message = `⚠️ [แจ้งเตือน พ.ร.บ. รถยนต์]\nพบรถยนต์จำนวน ${notifyList.length} คันที่ต้องดำเนินการ:\n`;

        notifyList.forEach((car, index) => {
            const formattedDate = new Date(car.act_expiry_date).toLocaleDateString('th-TH');

            message += `\n\n______________________________\n`;

            if (car.days_left < 0) {
                message += `\n${index + 1}. ${car.model} (${car.plate})\n   ❌ หมดอายุแล้ว (${Math.abs(car.days_left)} วัน)`;
            } else if (car.days_left === 0) {
                message += `\n${index + 1}. ${car.model} (${car.plate})\n   ⚠️ หมดอายุวันนี้!`;
            } else {
                message += `\n${index + 1}. ${car.model} (${car.plate})\n   ⚠️ เหลืออีก ${car.days_left} วัน (หมดอายุ ${formattedDate})`;
            }
        });
        message += `\n______________________________`;

        await sendLineNotification(message);

    } catch (error) {
        console.error("❌ Error checking ACT expiry:", error);
    } finally {
        if (connection) await connection.end();
    }
}

app.listen(5000, '0.0.0.0', () => {
    console.log(' API CRUD Server รันเรียบร้อยที่พอร์ต 5000');
});