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

// ==================== [ 3. Vehicles ] ====================

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
    const { id, model, plate, seats, status, act_number, act_expiry_date } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        const [exist] = await connection.execute('SELECT id FROM vehicles WHERE id = ?', [id.trim()]);
        if (exist.length > 0) {
            return res.status(400).json({ message: 'รหัสรถยนต์ (ID) นี้มีอยู่ในระบบแล้ว' });
        }
        await connection.execute(
            `INSERT INTO vehicles (id, model, plate, seats, image, status, act_number, act_expiry_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id.trim().toLowerCase(),
                model.trim(),
                plate.trim(),
                seats || 5,
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

app.put('/api/vehicles/:id', upload.single('imageFile'), async (req, res) => {
    const { id } = req.params;
    const { model, plate, seats, image, status, act_number, act_expiry_date } = req.body;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : image;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
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
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// 🟢 แก้ไขคำสั่งลบรถ: ปลด vehicle_id = NULL ให้คิวเริ่มวันนี้และอดีตไว้ก่อน แล้วลบเฉพาะคิวอนาคต (พรุ่งนี้เป็นต้นไป)
app.delete('/api/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // 1. คิวที่เริ่มวันนี้ หรือย้อนหลังไปในอดีต (DATE(start_date) <= CURDATE()): ให้เก็บประวัติไว้!
        await connection.execute(
            'UPDATE bookings SET vehicle_id = NULL WHERE vehicle_id = ? AND DATE(start_date) <= CURDATE()',
            [id]
        );

        // 2. คิวที่จองไว้วันพรุ่งนี้เป็นต้นไป (DATE(start_date) > CURDATE()): ลบทิ้งออกจากระบบ
        await connection.execute(
            'DELETE FROM bookings WHERE vehicle_id = ? AND DATE(start_date) > CURDATE()',
            [id]
        );

        // 3. ลบข้อมูลรถออกจากตาราง vehicles
        await connection.execute('DELETE FROM vehicles WHERE id = ?', [id]);

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        res.json({ success: true, message: 'ลบข้อมูลรถเรียบร้อยแล้ว โดยยังคงเก็บประวัติของวันนี้และอดีตไว้' });
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

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/api/bookings', async (req, res) => {
    const vehicle_id = req.body.vehicle_id || req.body.vehicleId || req.body.carId || '';
    const borrower = req.body.borrower || req.body.user || req.body.username || '';
    const vehicle_model = req.body.vehicle_model || req.body.vehicleModel || req.body.model || 'ไม่ระบุรุ่นรถ';
    const start_date = req.body.start_date || req.body.startDate || '';
    const end_date = req.body.end_date || req.body.endDate || '';
    const reqDept = req.body.dept || '';
    let connection;

    if (!vehicle_id || !borrower || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'กรอกข้อมูลการจองไม่ครบถ้วน' });
    }

    try {
        connection = await mysql.createConnection(dbConfig);

        // 🟢 1. ค้นหาผู้ใช้งานแบบครอบคลุม: เช็กทั้ง username และ name
        const [users] = await connection.execute(
            'SELECT username, name, dept FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(name) = LOWER(?)',
            [borrower.trim(), borrower.trim()]
        );

        let borrowerRealName = borrower;
        let borrowerDept = '';

        if (users.length > 0) {
            borrowerRealName = users[0].name || borrower;
            borrowerDept = users[0].dept || '';
        }

        // 🟢 2. ถ้าหาใน DB ไม่เจอจากตัวแปร borrower ให้ลองเช็กจาก Request Body
        if (!borrowerDept && reqDept) {
            borrowerDept = reqDept;
        }

        // 🟢 3. ถ้ายังหาแผนกไม่เจออีก (กรณีเป็น 'ผู้ดูแลระบบ' หรือ 'ADMIN') ให้ดึงแผนกตั้งต้นของ Admin
        if (!borrowerDept) {
            const [adminUsers] = await connection.execute("SELECT dept FROM users WHERE role = 'admin' AND dept IS NOT NULL AND dept != '' LIMIT 1");
            if (adminUsers.length > 0) {
                borrowerDept = adminUsers[0].dept;
            } else {
                borrowerDept = 'ฝ่ายบริหาร / ไอที'; // ค่าเริ่มต้นถ้าไม่พบแผนกจริงๆ
            }
        }

        // บันทึกลงฐานข้อมูล
        await connection.execute(
            `INSERT INTO bookings (vehicle_id, borrower, vehicle_model, start_date, end_date, status, created_at) 
            VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
            [vehicle_id, borrower, vehicle_model, start_date, end_date]
        );

        const formattedStart = new Date(start_date).toLocaleDateString('th-TH');
        const formattedEnd = new Date(end_date).toLocaleDateString('th-TH');

        // 🟢 ข้อความแจ้งเตือน LINE 
        const lineMsg = `🚗 [แจ้งเตือนการจองรถ]\n` +
            `______________________________\n\n` +
            `👤 ผู้จอง: ${borrowerRealName} (${borrower})\n` +
            `👨🏻‍💻 แผนก: ${borrowerDept}\n` +
            `🚘 รถยนต์: ${vehicle_model}\n` +
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

app.put('/api/bookings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // 🟢 Join ตาราง users แบบ LOWER(username) เพื่อดึงแผนก
        const [bookings] = await connection.execute(
            `SELECT b.*, u.name AS borrower_real_name, u.dept AS borrower_dept 
             FROM bookings b 
             LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username) 
             WHERE b.id = ?`,
            [id]
        );

        // อัปเดตสถานะเป็น cancelled
        await connection.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

        if (bookings.length > 0) {
            const b = bookings[0];
            const borrowerName = b.borrower_real_name || b.borrower;
            const borrowerDept = b.borrower_dept || 'ไม่ระบุแผนก';
            const formattedStart = new Date(b.start_date).toLocaleDateString('th-TH');
            const formattedEnd = new Date(b.end_date).toLocaleDateString('th-TH');

            // 🟢 ข้อความแจ้งเตือน LINE
            const lineMsg = `🚫 [แจ้งเตือนยกเลิกการจองรถ]\n` +
                `______________________________\n` +
                `👤 ผู้ยกเลิกการจองคิว: ${borrowerName} (${b.borrower})\n` +
                `👨🏻‍💻 แผนก: ${borrowerDept}\n` +
                `🚘  รถยนต์: ${b.vehicle_model}\n` +
                `🗓️ คิววันที่: ${formattedStart} \n` +
                `🗓️ ถึงวันที่: ${formattedEnd}\n` +
                `______________________________`;

            await sendLineNotification(lineMsg);
        }

        res.json({ success: true, message: 'ยกเลิกสิทธิ์การจองเรียบร้อย' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) await connection.end();
    }
});
// 🟢 เพิ่ม Route ลบรายการจองแบบกลุ่ม (Batch Delete)
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

/**
 * 1. Route สำหรับรับ Webhook จาก LINE (ไว้ดึง Group ID อัตโนมัติ)
 */
app.post('/api/line-webhook', async (req, res) => {
    const events = req.body.events || [];

    for (const event of events) {
        if (event.source && event.source.groupId) {
            const gid = event.source.groupId;
            console.log("------------------------------------------");
            console.log("🎯 GROUP ID จริงของคุณคือ:", gid);
            console.log("------------------------------------------");

            // ส่งตอบกลับเข้าไปในกลุ่มไลน์ทันทีเพื่อความสะดวก
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
/**
* 🟢 ฟังก์ชันส่งแจ้งเตือนเข้า LINE (Push Message)
*/
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

        // ดึงรถที่หมดอายุแล้ว (days_left < 0) และรถที่เหลือวันไม่เกิน 90 วัน
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
                // 🔴 1. หมดอายุแล้ว หรือเหลือ 7 วันสุดท้าย (<= 7 วัน) -> แจ้งเตือนทุกวัน
                shouldNotify = true;
            }
            else if (days === 30 || days === 60 || days === 90) {
                // 🟢 2. แจ้งเตือนรอบรายเดือน ครั้งเดียวตอนเหลือ 90, 60 และ 30 วัน
                shouldNotify = true;
            }

            if (shouldNotify) {
                notifyList.push(car);
            }
        });
        if (notifyList.length === 0) {
            console.log("ℹ️ [ACT Check] วันนี้ไม่มีรถที่ถึงรอบการยิงแจ้งเตือน");
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
    console.log('🚀 API CRUD Server รันเรียบร้อยที่พอร์ต 5000');


    // 🟢 ตั้งเวลาทำงานตอน 09:30 น. (เก้าโมงครึ่ง) ของทุกวัน
    cron.schedule('30 9 * * *', () => {
        console.log('⏰ [Cron Job] ได้เวลา 09:30 น. เริ่มตรวจเช็ก พ.ร.บ...');
        checkAndNotifyExpiringACT();
    }, {
        timezone: "Asia/Bangkok" // 🟢 กำหนด Timezone เป็นเวลาไทย
    });
});