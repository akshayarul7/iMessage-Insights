const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to parse JSON payloads later

// Database Connection
// Ensure your cloned 'chat.db' file is placed directly in this backend folder
// Updated Database Connection Path

// Dynamically build the absolute path to Apple's live database
const dbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');

// CRITICAL: Must remain OPEN_READONLY to prevent corrupting your real messages
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Failed to connect to the live database:', err.message);
    } else {
        console.log(`Successfully connected to the LIVE database at: ${dbPath}`);
    }
});

// Basic health check endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend is running', dbConnected: true });
});

// --- CONTACTS API ---
const CONTACTS_FILE = path.resolve(__dirname, 'contacts.json');

// Helper function to load contacts
const loadContacts = () => {
    if (fs.existsSync(CONTACTS_FILE)) {
        const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
        return JSON.parse(data);
    }
    return {};
};

// GET: Retrieve all contacts
app.get('/api/contacts', (req, res) => {
    try {
        const contacts = loadContacts();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load contacts.' });
    }
});

// POST: Save a new contact with strict formatting & database validation
app.post('/api/contacts', async (req, res) => { // <-- Added 'async'
    const { name, number } = req.body;
    
    if (!name || !number) {
        return res.status(400).json({ error: 'Name and number are required.' });
    }

    const cleanName = name.trim();
    const cleanNew = number.replace(/\D/g, '');

    if (cleanNew.length !== 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    try {
        // NEW: Database Integrity Check
        // Query the live database to see if this phone number exists in any chat history
        const checkDbQuery = `SELECT COUNT(*) as count FROM handle WHERE id LIKE ?`;
        
        const row = await new Promise((resolve, reject) => {
            db.get(checkDbQuery, [`%${cleanNew}%`], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (row.count === 0) {
            return res.status(400).json({ error: 'Cannot add contact: No messages found for this number in your local database.' });
        }

        // Proceed with existing file saving logic
        const contacts = loadContacts();
        const lowerName = cleanName.toLowerCase();

        // 1. Prevent duplicate names (case-insensitive)
        const existingNames = Object.keys(contacts).map(k => k.toLowerCase());
        if (existingNames.includes(lowerName)) {
            return res.status(400).json({ error: `The name '${cleanName}' is already in your Address Book.` });
        }

        // 2. Prevent duplicate numbers
        for (const [key, val] of Object.entries(contacts)) {
            const existingNum = val.replace(/\D/g, '');
            if (existingNum === cleanNew) {
                return res.status(400).json({ error: `This phone number is already saved under '${key}'.` });
            }
        }

        // 3. Save perfectly formatted string
        const formattedNumber = `(${cleanNew.slice(0, 3)}) ${cleanNew.slice(3, 6)}-${cleanNew.slice(6)}`;
        contacts[cleanName] = formattedNumber;

        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        res.json({ message: 'Saved!', contact: { [cleanName]: formattedNumber } });

    } catch (err) {
        console.error('Database Verification Error:', err);
        res.status(500).json({ error: 'Failed to verify contact against the database.' });
    }
});

// PUT: Rename an existing contact
app.put('/api/contacts/:name', (req, res) => {
    const oldName = req.params.name;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
        return res.status(400).json({ error: 'New name is required.' });
    }

    try {
        const contacts = loadContacts();
        const cleanNewName = newName.trim();

        if (!contacts[oldName]) {
            return res.status(404).json({ error: 'Original contact not found.' });
        }

        // Check if the new name is already taken (case-insensitive)
        const existingNames = Object.keys(contacts).map(k => k.toLowerCase());
        if (existingNames.includes(cleanNewName.toLowerCase()) && oldName.toLowerCase() !== cleanNewName.toLowerCase()) {
            return res.status(400).json({ error: `The name '${cleanNewName}' is already taken.` });
        }

        // Swap the keys while preserving the phone number
        const phoneNumber = contacts[oldName];
        delete contacts[oldName];
        contacts[cleanNewName] = phoneNumber;

        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        res.json({ message: 'Contact renamed successfully!', contacts });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rename contact.' });
    }
});

// DELETE: Remove a contact
app.delete('/api/contacts/:name', (req, res) => {
    const name = req.params.name;

    try {
        const contacts = loadContacts();
        
        if (!contacts[name]) {
            return res.status(404).json({ error: 'Contact not found.' });
        }

        delete contacts[name];
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        
        res.json({ message: 'Contact deleted successfully!', contacts });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete contact.' });
    }
});

// --- CORE CHAT QUERIES ---

// GET: Fetch calendar boundaries (first and last message dates) for a contact
app.get('/api/chat-bounds', async (req, res) => {
    const { contact } = req.query;
    
    if (!contact) {
        return res.status(400).json({ error: 'Contact number is required.' });
    }

    // Strip formatting to search raw digits
    const cleanSearch = contact.replace(/[\s\-\(\)]/g, '');

    try {
        // 1. Find the 1-on-1 chat ID (ignoring group chats)
        const findChatQuery = `
            SELECT c.ROWID 
            FROM chat c 
            JOIN chat_handle_join chj ON c.ROWID = chj.chat_id 
            JOIN handle h ON chj.handle_id = h.ROWID 
            WHERE h.id LIKE ? 
            AND (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) = 1
            ORDER BY (SELECT COUNT(*) FROM chat_message_join WHERE chat_id = c.ROWID) DESC 
            LIMIT 1
        `;

        // Wrap sqlite3 in a Promise for clean async/await syntax
        const chatRow = await new Promise((resolve, reject) => {
            db.get(findChatQuery, [`%${cleanSearch}%`], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!chatRow) {
            return res.status(404).json({ error: 'No 1-on-1 chat found for this number.' });
        }

        const chatId = chatRow.ROWID;

        // 2. Get the raw MIN and MAX dates from the message table
        const boundsQuery = `
            SELECT MIN(m.date) as minDate, MAX(m.date) as maxDate
            FROM message m
            JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            WHERE cmj.chat_id = ? AND m.date > 0
        `;

        const boundsRow = await new Promise((resolve, reject) => {
            db.get(boundsQuery, [chatId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!boundsRow || !boundsRow.minDate || !boundsRow.maxDate) {
            return res.status(404).json({ error: 'No messages found to determine bounds.' });
        }

        // 3. Apple Epoch Conversion Logic
        // Apple starts Jan 1, 2001 (978307200 seconds after standard Unix time)
        const convertAppleTime = (appleTime) => {
            // If the number is massive, Apple shifted from seconds to nanoseconds
            const seconds = appleTime > 100000000000 ? appleTime / 1000000000 : appleTime;
            // Add Apple's offset, then multiply by 1000 because JavaScript Dates use milliseconds
            return (seconds + 978307200) * 1000; 
        };

        const minDateMs = convertAppleTime(boundsRow.minDate);
        const maxDateMs = convertAppleTime(boundsRow.maxDate);

        res.json({
            chatId,
            startDate: new Date(minDateMs).toISOString(),
            endDate: new Date(maxDateMs).toISOString()
        });

    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Internal server error while querying chat bounds.' });
    }
});

// GET: Fetch messages, calculate metrics, and sanitize Apple's binary text
app.get('/api/messages', async (req, res) => {
    const { chatId, startDate, endDate, sortOrder = 'ASC', limit = 15, displayAll = 'false' } = req.query;

    if (!chatId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }

    try {
        const statsQuery = `
            SELECT m.is_from_me, COUNT(*) as count
            FROM chat_message_join cmj 
            JOIN message m ON cmj.message_id = m.ROWID 
            WHERE cmj.chat_id = ? 
            AND datetime((m.date/1000000000)+978307200, 'unixepoch', 'localtime') BETWEEN ? AND ?
            AND (m.associated_message_type IS NULL OR m.associated_message_type = 0)
            GROUP BY m.is_from_me
        `;

        const stats = await new Promise((resolve, reject) => {
            db.all(statsQuery, [chatId, startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        let youCount = 0; let themCount = 0;
        stats.forEach(row => {
            if (row.is_from_me === 1) youCount = row.count;
            else themCount = row.count;
        });

        const orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const limitClause = displayAll === 'true' ? '' : `LIMIT ${parseInt(limit)}`;

        const msgQuery = `
            SELECT 
                m.ROWID as id, 
                m.guid,
                datetime((m.date/1000000000)+978307200, 'unixepoch', 'localtime') AS time, 
                CASE WHEN m.is_from_me = 1 THEN 'You' ELSE 'Them' END AS sender, 
                m.text, 
                m.attributedBody 
            FROM chat_message_join cmj 
            JOIN message m ON m.ROWID = cmj.message_id 
            WHERE cmj.chat_id = ? 
            AND datetime((m.date/1000000000)+978307200, 'unixepoch', 'localtime') BETWEEN ? AND ?
            AND (m.associated_message_type IS NULL OR m.associated_message_type = 0)
            ORDER BY m.date ${orderDir} 
            ${limitClause}
        `;

        const messages = await new Promise((resolve, reject) => {
            db.all(msgQuery, [chatId, startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Use SELECT m.* to dynamically grab custom emoji columns if the user's macOS version supports it
        const rxQuery = `
            SELECT m.*
            FROM chat_message_join cmj
            JOIN message m ON cmj.message_id = m.ROWID
            WHERE cmj.chat_id = ? 
            AND m.associated_message_type BETWEEN 2000 AND 2999
        `;
        const reactions = await new Promise((resolve, reject) => {
            db.all(rxQuery, [chatId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const appleJunk = [
            'streamtyped', 'NSAttributedString', 'NSMutableString', 'NSString', 'NSDictionary', 
            'NSObject', 'NSMutableDictionary', 'NSNumber', 'NSArray', 'NSMutableArray', 
            'NSMutableAttributedString', 'NSColor', '__kIMMessagePartAttributeName', 'NSValue', 
            '__kIMFileTransferGUIDAttributeName', '__kIMBaseWritingDirectionAttributeName', 
            '__kIMBreadcrumbTextOptionFlags', '__kIMBreadcrumbTextMarkerAttributeName'
        ];

        const cleanedMessages = messages.map(row => {
            let msg = row.text || ''; 
            
            if (!msg && row.attributedBody) {
                let raw = row.attributedBody.toString('utf-8');
                appleJunk.forEach(w => { raw = raw.split(w).join(''); });
                
                // THE FIX: Convert Apple's "smart" typography to standard ASCII before stripping
                raw = raw.replace(/[\u2018\u2019\u0060\u00B4]/g, "'") // Smart apostrophes
                         .replace(/[\u201C\u201D]/g, '"')             // Smart quotes
                         .replace(/[\u2013\u2014]/g, '-');            // En and Em dashes
                
                msg = raw.replace(/[^\x20-\x7E]/g, ' '); 
                msg = msg.replace(/at_\d_[A-F0-9\-]{36}/g, '');
                msg = msg.trim();
                if (msg.includes('Started Sharing Location')) {
                    msg = 'Started Sharing Location';
                } else {
                    msg = msg.replace(/^@\s*\+[ \!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]*/, '');
                    if (msg.includes(' iI ')) { msg = msg.split(' iI ')[0]; }
                }
                msg = msg.replace(/\ufffd/g, '').replace(/\ufffc/g, '').replace(/ {2,}/g, ' ').trim();
            }

            let safeMsg = String(msg);
            if (safeMsg.match(/[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/i)) safeMsg = '[Attachment/Image]';
            if (!safeMsg || safeMsg.trim() === '*' || safeMsg.trim() === 'q') safeMsg = '[Attachment/Image/Tapback]';

            const [datePart, timePart] = row.time.split(' ');
            const [year, month, day] = datePart.split('-');
            let [hour, minute, second] = timePart.split(':');
            hour = parseInt(hour, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12; 
            const formattedTime = `${month}-${day}-${year} ${hour}:${minute}:${second} ${ampm}`;

            const msgReactions = reactions
                .filter(r => {
                    const targetGuid = r.associated_message_guid ? r.associated_message_guid.replace(/^p:\d+\//, '') : '';
                    return targetGuid === row.guid;
                })
                .map(r => {
                    // Extract custom emoji from iOS 18 column OR parse it directly from the text string
                    let customEmoji = r.associated_message_emoji || null;
                    if (!customEmoji && r.text && ![2000, 2001, 2002, 2003, 2004, 2005].includes(r.associated_message_type)) {
                        const match = r.text.match(/\p{Extended_Pictographic}/gu);
                        if (match) customEmoji = match[0];
                    }

                    return {
                        type: r.associated_message_type,
                        sender: r.is_from_me === 1 ? 'You' : 'Them',
                        customEmoji: customEmoji
                    };
                });

            return {
                id: row.id,
                time: formattedTime,
                sender: row.sender,
                text: safeMsg,
                reactions: msgReactions
            };
        });

        if (orderDir === 'DESC') { cleanedMessages.reverse(); }

        res.json({
            metrics: { total: youCount + themCount, youCount, themCount },
            messages: cleanedMessages
        });

    } catch (err) {
        console.error('Fetch Error:', err);
        res.status(500).json({ error: 'Error fetching messages.' });
    }
});

const { exec } = require('child_process');

app.listen(PORT, () => {
    console.log(`Server initialized on http://localhost:${PORT}`);
});