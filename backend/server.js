    import express from 'express';
    import mysql from 'mysql2/promise';
    import cors from 'cors';
    import multer from 'multer';
    import path from 'path';
    import fs from 'fs'; //

    const app = express();
    app.use(cors());
    app.use(express.json());

    const dbConfig = {
        host: '127.0.0.1',
        user: 'root',
        password: '1234', // ⚠️ รหัสเข้า HeidiSQL ของคุณแป้ง
        database: 'car_booking_db',
        port: 3307        // ⚠️ สลับเป็น 3307 ถ้าเปลี่ยนพอร์ตหนี
    };

    app.use('/uploads', express.static('uploads'));

    // ตรวจสอบว่ามีโฟลเดอร์ uploads ไหม ถ้าไม่มีให้สร้างออโต้
    if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    }

    // ตั้งค่าที่เก็บรูปภาพและชื่อไฟล์
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/'); // เก็บรูปในโฟลเดอร์ uploads
        },
        filename: function (req, file, cb) {
            // ตั้งชื่อไฟล์ใหม่ป้องกันซ้ำ: ปีเดือนวัน-สุ่มตัวเลข.นามสกุลเดิม
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
    const upload = multer({ storage: storage });


    // ==================== [ 1. ระบบยืนยันตัวตน (Login) ] ====================
    app.post('/api/login', async (req, res) => {
        const username = req.body.username || req.body.empId || '';
        const password = req.body.password || req.body.empPass || '';
        const role = req.body.role || 'employee';
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.execute(
                'SELECT username, name, dept, role FROM users WHERE username = ? AND password = ? AND role = ?',
                [username.trim(), password.trim(), role]
            );
            await connection.end();
            if (rows.length > 0) res.json({ success: true, user: rows[0] });
            else res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    // ==================== [ 2. ระบบจัดการพนักงาน บัญชีผู้ใช้ (Employee CRUD) ] ====================
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
        const oldId = req.params.id; // ไอดีพนักงานคนเดิมก่อนกดแก้ไข
        const { id, name, dept, password, role } = req.body; // ค่าใหม่ที่แอดมินแก้ไขพิมพ์เข้ามา (รวมถึงไอดีใหม่)

        try {
            const connection = await mysql.createConnection(dbConfig);
            
            // 💡 ดักบั๊กกรณีแอดมินเปลี่ยนไอดีใหม่ไปชนกับพนักงานคนอื่นที่มีอยู่แล้วในระบบ
            if (oldId.toUpperCase() !== id.trim().toUpperCase()) {
                const [exist] = await connection.execute('SELECT username FROM users WHERE username = ?', [id.trim()]);
                if (exist.length > 0) {
                    await connection.end();
                    return res.status(400).json({ message: '❌ ไม่สามารถใช้ไอดีนี้ได้ เนื่องจากมีผู้ใช้งานคนอื่นใช้ไปแล้ว' });
                }
            }

            // ปิดระบบตรวจสอบ Foreign Key ชั่วคราวเพื่อให้ MariaDB ยอมให้แก้ไขค่า Primary Key
            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

            // 1. สั่งแก้ไขข้อมูลในตาราง users โดยเปลี่ยนตำแหน่งไอดีใหม่ และเช็คแถวเดิมจาก oldId
            await connection.execute(
                'UPDATE users SET username = ?, name = ?, dept = ?, password = ?, role = ? WHERE username = ?',
                [id.trim().toUpperCase(), name.trim(), dept.trim(), password.trim(), role, oldId]
            );

            // 2. ตามไปแก้งานในตารางจองรถ (bookings) ให้ชื่อบัญชีผู้จอง (borrower) เปลี่ยนตามไอดีใหม่ด้วย ข้อมูลจะได้ไม่ตีกัน
            // (หมายเหตุ: สคริปต์นี้จะเปลี่ยนชื่อในคิวจองให้กรณีที่คุณแป้งบันทึกชื่อผู้จองเป็นไอดีพนักงานครับ)
            await connection.execute(
                'UPDATE bookings SET borrower = ? WHERE borrower = ?',
                [id.trim().toUpperCase(), oldId]
            );

            // เปิดระบบตรวจสอบ Foreign Key กลับมาทำงานปกติ
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            
            await connection.end();
            res.json({ success: true });
        } catch (error) { 
            res.status(500).json({ error: error.message }); 
        }
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

    // ==================== [ 3. ระบบจัดการรถยนต์ ยานพาหนะ (Vehicle CRUD) ] ====================
    app.get('/api/vehicles', async (req, res) => {
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.execute('SELECT * FROM vehicles ORDER BY id ASC');
            await connection.end();
            res.json(rows);
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    // 🟢 ปรับปรุง: รองรับการรับรูปภาพใหม่ตอนกดเพิ่มรถยนต์ (upload.single('imageFile'))
    app.post('/api/vehicles', upload.single('imageFile'), async (req, res) => {
        const { id, model, plate, seats, status } = req.body;
        
        // ถ้ามีการแนบไฟล์รูปมา ให้เซ็ต URL ลิงก์ไปหาหลังบ้าน แต่ถ้าไม่มีให้ใช้ข้อความว่าง
        let imageUrl = '';
        if (req.file) {
            imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        try {
            const connection = await mysql.createConnection(dbConfig);
            const [exist] = await connection.execute('SELECT id FROM vehicles WHERE id = ?', [id.trim()]);
            if (exist.length > 0) {
                await connection.end();
                return res.status(400).json({ message: 'รหัสรถยนต์ (ID) นี้มีอยู่ในระบบแล้ว' });
            }
            await connection.execute(
                'INSERT INTO vehicles (id, model, plate, seats, image, status) VALUES (?, ?, ?, ?, ?, ?)',
                [id.trim().toLowerCase(), model.trim(), plate.trim(), seats || 4, imageUrl, status || 'available']
            );
            await connection.end();
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
    });

    // 🟢 ปรับปรุง: รองรับการอัปเดตรูปภาพใหม่ตอนกดแก้ไขรถยนต์
    app.put('/api/vehicles/:id', upload.single('imageFile'), async (req, res) => {
        const { id } = req.params;
        const { model, plate, seats, image, status } = req.body;
        
        let imageUrl = image; // ถ้าไม่ได้เลือกรูปใหม่ ให้ใช้ URL รูปเดิมที่ส่งมา
        if (req.file) {
            imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        try {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute(
                'UPDATE vehicles SET model = ?, plate = ?, seats = ?, image = ?, status = ? WHERE id = ?',
                [model.trim(), plate.trim(), seats, imageUrl, status, id]
            );
            await connection.end();
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
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

    // ==================== [ 4. ระบบการจองคิวรถ (Booking Core) - ฉบับแก้ไขสะกดชื่อจริงสากล ] ====================

    // ==================== [ 🟢 ฉบับปรับปรุงแกนหลัก: ปลดล็อกชื่อจริงตารางรวมแอดมิน ] ====================
    app.get('/api/bookings', async (req, res) => {
        const borrowerName = req.query.borrower || '';
        const userRole = req.query.role || '';
        const isMyBookingPage = req.query.isMyBooking === 'true'; 

        try {
            const connection = await mysql.createConnection(dbConfig);
            let rows = [];

            // 1. กรณีดึงผ่านหน้าประวัติส่วนบุคคล (MyBookings.jsx)
            if (isMyBookingPage) {
                const [myRows] = await connection.execute(
                    `SELECT b.*, u.name AS borrower_real_name 
                     FROM bookings b
                     LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                     WHERE b.borrower = ? 
                     ORDER BY b.start_date DESC`,
                    [borrowerName.trim()]
                );
                rows = myRows;
            } 
            // 2. 💡 [ไม้เด็ดปิดจ๊อบบั๊กแอดมิน]: บังคับจับคู่ตารางโดยแปลงตัวเล็กตัวใหญ่ให้เท่ากัน (LOWER) ป้องกันเดตาเบสหาคู่ชนไม่เจอคัป
            else if (borrowerName === '' || userRole.trim().toLowerCase() === 'admin' || borrowerName.toLowerCase().includes('admin')) {
                const [allRows] = await connection.execute(
                    `SELECT b.*, u.name AS borrower_real_name 
                     FROM bookings b
                     LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                     ORDER BY b.start_date DESC`
                );
                rows = allRows;
            } else {
                // สำหรับพนักงานดึงบนหน้าภาพรวมอื่นๆ
                const [myRows] = await connection.execute(
                    `SELECT b.*, u.name AS borrower_real_name 
                     FROM bookings b
                     LEFT JOIN users u ON LOWER(b.borrower) = LOWER(u.username)
                     WHERE b.borrower = ? 
                     ORDER BY b.start_date DESC`,
                    [borrowerName.trim()]
                );
                rows = myRows;
            }

            await connection.end();
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 🟢 2. เส้นประวัติส่วนบุคคล: สำหรับดึงคิวงานหน้า MyBookings (ปรับให้ดึงสเปคแบบมีชื่อไทยรองรับหน้าบ้านคัป)
    app.get('/api/bookings/my-bookings', async (req, res) => {
        const borrowerParam = req.query.borrower || ''; 
        const userRole = req.query.role || '';

        try {
            const connection = await mysql.createConnection(dbConfig);
            let rows = [];
            
            // 💡 ดักทาง: ถ้าคนเรียกดูคือแอดมิน ให้ดึงรายการทั้งหมดขึ้นมาดูได้เลย พร้อมผูกชื่อจริงภาษาไทย
            if (userRole.trim().toLowerCase() === 'admin' || borrowerParam.toLowerCase() === 'admin') {
                const [adminRows] = await connection.execute(
                    `SELECT b.*, u.name AS borrower_real_name 
                     FROM bookings b
                     LEFT JOIN users u ON b.borrower = u.username
                     ORDER BY b.start_date DESC`
                );
                rows = adminRows;
            } else {
                // สิทธิ์พนักงานทั่วไป ดึงเฉพาะของตัวเอง
                const [empRows] = await connection.execute(
                    `SELECT b.*, u.name AS borrower_real_name 
                     FROM bookings b
                     LEFT JOIN users u ON b.borrower = u.username
                     WHERE b.borrower = ? 
                     ORDER BY b.start_date DESC`,
                    [borrowerParam.trim()]
                );
                rows = empRows;
            }
            
            await connection.end();
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.listen(5000, () => console.log('🚀 API CRUD Server รันเรียบร้อยที่พอร์ต 5000'));