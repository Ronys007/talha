import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
} from '@whiskeysockets/baileys';

// Top-level crash prevention: keep the sidecar running even on unhandled network drops
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception in WhatsApp sidecar:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection in WhatsApp sidecar:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent .env if present, otherwise local .env
const parentEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(parentEnvPath)) {
    dotenv.config({ path: parentEnvPath });
}
dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.WHATSAPP_SIDECAR_PORT || 3001;
const HOST = process.env.HOST || process.env.WHATSAPP_SIDECAR_HOST || '0.0.0.0';
const SECRET = process.env.WHATSAPP_SIDECAR_SECRET || 'vama_secret_change_me_in_prod';

if (SECRET === 'vama_secret_change_me_in_prod') {
    console.warn('⚠️  SECURITY WARNING: Using default WhatsApp sidecar secret. Please set WHATSAPP_SIDECAR_SECRET in production!');
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Validate URL to prevent Server-Side Request Forgery (SSRF)
 */
function isSafePublicUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
        if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) return false;
        return true;
    } catch {
        return false;
    }
}

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

const SESSIONS_DIR = path.resolve(__dirname, 'auth_sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory active session stores
// session_id -> { sock, status: 'connected' | 'qr_ready' | 'connecting' | 'disconnected', phone: string|null, qrCode: string|null, error: string|null }
const sessions = new Map();

/**
 * Authentication Middleware using shared secret
 */
const authMiddleware = (req, res, next) => {
    const providedSecret = req.headers['x-whatsapp-secret'] || req.query.secret;
    if (!providedSecret || providedSecret !== SECRET) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid or missing X-Whatsapp-Secret header'
        });
    }
    next();
};

/**
 * Format phone number to WhatsApp JID.
 * Auto formats 10-digit Indian numbers to 91XXXXXXXXXX@s.whatsapp.net
 */
function formatWhatsAppJid(phone) {
    if (!phone) return null;
    let clean = phone.toString().replace(/\D/g, '');
    if (!clean) return null;

    // Handle 10-digit Indian numbers (e.g. 9876543210 -> 919876543210)
    if (clean.length === 10) {
        clean = '91' + clean;
    } else if (clean.length === 11 && clean.startsWith('0')) {
        clean = '91' + clean.slice(1);
    } else if (clean.length === 12 && clean.startsWith('91')) {
        // already has 91
    }

    return `${clean}@s.whatsapp.net`;
}

/**
 * Initialize or reconnect a Baileys session
 */
async function initSession(sessionId) {
    sessionId = String(sessionId).trim();
    if (!sessionId) throw new Error('Session ID cannot be empty');

    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Clean up existing socket if present
    const existing = sessions.get(sessionId);
    if (existing && existing.sock) {
        try {
            existing.sock.ev.removeAllListeners();
            existing.sock.end(undefined);
        } catch (e) {
            logger.warn({ sessionId, err: e.message }, 'Error closing old socket');
        }
    }

    const sessionData = {
        sock: null,
        status: 'connecting',
        phone: existing?.phone || null,
        qrCode: null,
        error: null,
        lastActive: new Date().toISOString()
    };
    sessions.set(sessionId, sessionData);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        let version = [2, 3000, 1015901307];
        try {
            const fetched = await fetchLatestBaileysVersion();
            if (fetched?.version) version = fetched.version;
        } catch (vErr) {
            logger.warn({ err: vErr.message }, 'Failed to fetch latest Baileys version from upstream, using safe fallback');
        }

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: ['Vama Invoice', 'Chrome', '1.0.0'],
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
        });

        sessionData.sock = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            sessionData.lastActive = new Date().toISOString();

            if (qr) {
                try {
                    sessionData.qrCode = await QRCode.toDataURL(qr);
                    sessionData.status = 'qr_ready';
                    logger.info({ sessionId }, 'New WhatsApp QR code generated');
                } catch (qrErr) {
                    logger.error({ sessionId, qrErr }, 'Failed to convert QR code to DataURL');
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                logger.warn({ sessionId, statusCode, shouldReconnect }, 'WhatsApp connection closed');

                sessionData.qrCode = null;

                if (statusCode === DisconnectReason.loggedOut) {
                    sessionData.status = 'disconnected';
                    sessionData.phone = null;
                    // Wipe session files upon logout
                    try {
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                        }
                    } catch (rmErr) {
                        logger.error({ rmErr }, 'Failed to remove session directory on logout');
                    }
                } else if (shouldReconnect) {
                    sessionData.status = 'connecting';
                    // Delay reconnect slightly to avoid flooding
                    setTimeout(() => {
                        initSession(sessionId).catch(err => {
                            logger.error({ sessionId, err: err.message }, 'Auto-reconnect failed');
                        });
                    }, 5000);
                } else {
                    sessionData.status = 'disconnected';
                }
            } else if (connection === 'open') {
                sessionData.status = 'connected';
                sessionData.qrCode = null;
                sessionData.error = null;

                // Extract phone from sock.user
                if (sock.user && sock.user.id) {
                    const rawJid = sock.user.id;
                    const cleaned = rawJid.split(':')[0].split('@')[0];
                    sessionData.phone = cleaned;
                }
                logger.info({ sessionId, phone: sessionData.phone }, 'WhatsApp session successfully connected!');
            }
        });

        return sessionData;
    } catch (err) {
        sessionData.status = 'disconnected';
        sessionData.error = err.message;
        logger.error({ sessionId, err: err.message }, 'Failed to initialize WhatsApp session');
        throw err;
    }
}

// -------------------------------------------------------------
// Auto-reconnect active sessions from disk on startup
// -------------------------------------------------------------
async function autoReconnectSessions() {
    try {
        if (!fs.existsSync(SESSIONS_DIR)) return;
        const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const credsFile = path.join(SESSIONS_DIR, entry.name, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    logger.info({ sessionId: entry.name }, 'Found saved credentials, auto-reconnecting...');
                    initSession(entry.name).catch(e => {
                        logger.warn({ sessionId: entry.name, error: e.message }, 'Initial auto-reconnect failed, will retry on demand');
                    });
                }
            }
        }
    } catch (e) {
        logger.error({ error: e.message }, 'Error scanning auth_sessions directory');
    }
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check endpoint (No secret required for simple heartbeat)
app.get('/health', (req, res) => {
    return res.json({
        success: true,
        service: 'vama-whatsapp-sidecar',
        uptime: process.uptime(),
        activeSessions: sessions.size,
        timestamp: new Date().toISOString()
    });
});

// Dynamic QR Code image generator endpoint
app.get('/qr', async (req, res) => {
    const text = req.query.text;
    if (!text) return res.status(400).send('text query parameter is required');
    try {
        const qrBuffer = await QRCode.toBuffer(text, { width: 400, margin: 2, errorCorrectionLevel: 'M' });
        res.setHeader('Content-Type', 'image/png');
        return res.send(qrBuffer);
    } catch (e) {
        return res.status(500).send(e.message);
    }
});

// All /sessions routes protected by authMiddleware
app.use('/sessions', authMiddleware);

/**
 * GET /sessions/:id/status
 * Returns connection status ('connected' | 'qr_ready' | 'connecting' | 'disconnected'),
 * connected phone number, and base64 QR code if waiting for scan.
 */
app.get('/sessions/:id/status', async (req, res) => {
    const sessionId = req.params.id;
    let session = sessions.get(sessionId);

    // If session folder exists on disk with creds but not in memory, try to load
    if (!session) {
        const sessionPath = path.join(SESSIONS_DIR, sessionId);
        const credsFile = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(credsFile)) {
            try {
                session = await initSession(sessionId);
            } catch (e) {
                // Ignore and proceed to return disconnected
            }
        }
    }

    let isConnected = session && session.status === 'connected';
    if (!isConnected) {
        // If requested session is disconnected, check if another merchant/user session is connected
        for (const [otherId, otherSess] of sessions.entries()) {
            if (otherSess && otherSess.status === 'connected' && otherSess.sock) {
                return res.json({
                    success: true,
                    sessionId: otherId,
                    status: 'connected',
                    phone: otherSess.phone,
                    qr: null,
                    lastActive: otherSess.lastActive,
                    routedFrom: sessionId
                });
            }
        }
    }

    if (!session) {
        return res.json({
            success: true,
            sessionId,
            status: 'disconnected',
            phone: null,
            qr: null,
            lastActive: null
        });
    }

    return res.json({
        success: true,
        sessionId,
        status: session.status,
        phone: session.phone,
        qr: session.qrCode,
        lastActive: session.lastActive
    });
});

/**
 * POST or GET /sessions/:id/connect
 * Initializes Baileys socket and generates fresh QR code.
 */
app.all('/sessions/:id/connect', async (req, res) => {
    const sessionId = req.params.id;
    try {
        let session = sessions.get(sessionId);
        if (session && session.status === 'connected') {
            return res.json({
                success: true,
                sessionId,
                status: 'connected',
                phone: session.phone,
                message: 'Session is already connected'
            });
        }

        session = await initSession(sessionId);

        // Wait up to 6 seconds for initial QR or connection
        let attempts = 0;
        while (attempts < 12 && session.status === 'connecting') {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }

        return res.json({
            success: true,
            sessionId,
            status: session.status,
            phone: session.phone,
            qr: session.qrCode
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            sessionId,
            error: err.message
        });
    }
});

/**
 * POST /sessions/:id/send-message
 * Sends text message and optional PDF/image document to recipient.
 */
app.post('/sessions/:id/send-message', async (req, res) => {
    const sessionId = req.params.id;
    const { phone, message, mediaUrl, base64File, fileName, mimetype, caption } = req.body;

    if (!phone) {
        return res.status(422).json({ success: false, error: 'Recipient phone number is required' });
    }

    if (!message && !mediaUrl && !base64File) {
        return res.status(422).json({ success: false, error: 'Either message text or document file is required' });
    }

    let session = sessions.get(sessionId);

    // If session is not in memory but saved credentials exist on disk, attempt auto-reconnect
    if (!session || session.status !== 'connected' || !session.sock) {
        const sessionPath = path.join(SESSIONS_DIR, sessionId);
        const credsFile = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(credsFile)) {
            try {
                session = await initSession(sessionId);
                let waitAttempts = 0;
                while (waitAttempts < 10 && session.status === 'connecting') {
                    await new Promise(r => setTimeout(r, 500));
                    waitAttempts++;
                }
            } catch (e) {
                logger.warn({ sessionId, err: e.message }, 'Failed to on-demand reconnect session');
            }
        }
    }

    if (!session || session.status !== 'connected' || !session.sock) {
        // Fallback: If requested session is not connected, route through any active connected session
        for (const [otherId, otherSess] of sessions.entries()) {
            if (otherSess && otherSess.status === 'connected' && otherSess.sock) {
                logger.info({ requested: sessionId, using: otherId }, 'Routing message through active connected session');
                session = otherSess;
                break;
            }
        }
    }

    if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp session is not connected',
            status: session?.status || 'disconnected'
        });
    }

    let jid = formatWhatsAppJid(phone);
    if (!jid) {
        return res.status(422).json({ success: false, error: 'Invalid phone number format' });
    }

    // Special routing when sending message to self (Admin self-reminders)
    if (session.sock?.user?.id) {
        const myJid = session.sock.user.id;
        const myNormalized = typeof jidNormalizedUser === 'function' ? jidNormalizedUser(myJid) : myJid;
        const myPhone = myNormalized.split('@')[0].split(':')[0];
        const targetClean = jid.split('@')[0].split(':')[0];

        if (phone === 'self' || phone === 'me' || targetClean === myPhone) {
            jid = myNormalized;
        }
    }

    try {
        let sendResult;

        if (base64File) {
            // Buffer upload (Image or Document)
            const buffer = Buffer.from(base64File.replace(/^data:.*?;base64,/, ''), 'base64');
            const docMime = mimetype || 'application/octet-stream';
            const docName = fileName || 'File';

            if (docMime.startsWith('image/')) {
                // Send as full-size native image photo message in same size and format
                sendResult = await session.sock.sendMessage(jid, {
                    image: buffer,
                    caption: caption || message || '',
                    mimetype: docMime,
                    fileName: docName
                });
            } else {
                // Send as downloadable document (PDF / spreadsheet / file)
                sendResult = await session.sock.sendMessage(jid, {
                    document: buffer,
                    mimetype: docMime,
                    fileName: docName,
                    caption: caption || message || ''
                });
            }
        } else if (mediaUrl) {
            // URL upload (Image or Document) with SSRF validation
            if (!isSafePublicUrl(mediaUrl)) {
                return res.status(422).json({ success: false, error: 'Invalid or restricted media URL' });
            }
            const docMime = mimetype || (mediaUrl.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
            const docName = fileName || (mediaUrl.split('/').pop() || 'File');

            if (docMime.startsWith('image/')) {
                // Send as full-size native image photo message in same size and format
                sendResult = await session.sock.sendMessage(jid, {
                    image: { url: mediaUrl },
                    caption: caption || message || '',
                    mimetype: docMime,
                    fileName: docName
                });
            } else {
                // Send as downloadable document (PDF / spreadsheet / file)
                sendResult = await session.sock.sendMessage(jid, {
                    document: { url: mediaUrl },
                    mimetype: docMime,
                    fileName: docName,
                    caption: caption || message || ''
                });
            }
        } else {
            // Plain text message
            sendResult = await session.sock.sendMessage(jid, {
                text: message
            });
        }

        session.lastActive = new Date().toISOString();

        return res.json({
            success: true,
            sessionId,
            messageId: sendResult?.key?.id,
            timestamp: sendResult?.messageTimestamp,
            to: jid
        });
    } catch (sendErr) {
        logger.error({ sessionId, jid, err: sendErr.message }, 'Failed to send WhatsApp message');
        return res.status(500).json({
            success: false,
            error: sendErr.message
        });
    }
});

/**
 * POST /sessions/:id/recall-message
 * Recalls / deletes a previously sent message for everyone on WhatsApp.
 */
app.post('/sessions/:id/recall-message', async (req, res) => {
    const sessionId = req.params.id;
    const { phone, messageId } = req.body;

    if (!phone || !messageId) {
        return res.status(422).json({
            success: false,
            error: 'Both recipient phone and messageId are required to recall a message'
        });
    }

    let session = sessions.get(sessionId);

    // If session is not in memory but saved credentials exist on disk, attempt auto-reconnect
    if (!session || session.status !== 'connected' || !session.sock) {
        const sessionPath = path.join(SESSIONS_DIR, sessionId);
        const credsFile = path.join(sessionPath, 'creds.json');
        if (fs.existsSync(credsFile)) {
            try {
                session = await initSession(sessionId);
                let waitAttempts = 0;
                while (waitAttempts < 10 && session.status === 'connecting') {
                    await new Promise(r => setTimeout(r, 500));
                    waitAttempts++;
                }
            } catch (e) {
                logger.warn({ sessionId, err: e.message }, 'Failed to on-demand reconnect session');
            }
        }
    }

    if (!session || session.status !== 'connected' || !session.sock) {
        // Fallback: If requested session is not connected, route through any active connected session
        for (const [otherId, otherSess] of sessions.entries()) {
            if (otherSess && otherSess.status === 'connected' && otherSess.sock) {
                logger.info({ requested: sessionId, using: otherId }, 'Routing message through active connected session');
                session = otherSess;
                break;
            }
        }
    }

    if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp session is not connected',
            status: session?.status || 'disconnected'
        });
    }

    let jid = formatWhatsAppJid(phone);
    if (!jid) {
        return res.status(422).json({ success: false, error: 'Invalid phone number format' });
    }

    // Special routing when sending message to self (Admin self-reminders)
    if (session.sock?.user?.id) {
        const myJid = session.sock.user.id;
        const myNormalized = typeof jidNormalizedUser === 'function' ? jidNormalizedUser(myJid) : myJid;
        const myPhone = myNormalized.split('@')[0].split(':')[0];
        const targetClean = jid.split('@')[0].split(':')[0];

        if (phone === 'self' || phone === 'me' || targetClean === myPhone) {
            jid = myNormalized;
        }
    }

    try {
        const key = {
            remoteJid: jid,
            fromMe: true,
            id: messageId,
        };

        const recallResult = await session.sock.sendMessage(jid, { delete: key });
        session.lastActive = new Date().toISOString();

        logger.info({ sessionId, jid, messageId }, 'WhatsApp message recalled successfully (Delete for Everyone)');

        return res.json({
            success: true,
            sessionId,
            messageId,
            to: jid,
            recallResult
        });
    } catch (err) {
        logger.error({ sessionId, jid, messageId, err: err.message }, 'Failed to recall WhatsApp message');
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to recall message on WhatsApp'
        });
    }
});

/**
 * DELETE /sessions/:id/logout
 * Disconnects socket and clears the session folder.
 */
app.delete('/sessions/:id/logout', async (req, res) => {
    const sessionId = req.params.id;
    const session = sessions.get(sessionId);

    if (session && session.sock) {
        try {
            await session.sock.logout();
        } catch (e) {
            logger.warn({ sessionId, err: e.message }, 'Error during socket logout');
        }
        try {
            session.sock.ev.removeAllListeners();
            session.sock.end(undefined);
        } catch (e) {
            // Ignore
        }
    }

    sessions.delete(sessionId);

    // Delete session files on disk
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    } catch (rmErr) {
        logger.error({ sessionId, rmErr: rmErr.message }, 'Error clearing session directory');
    }

    logger.info({ sessionId }, 'WhatsApp session logged out and folder cleared');

    return res.json({
        success: true,
        sessionId,
        status: 'disconnected',
        message: 'Session disconnected and cleared successfully'
    });
});

/**
 * Trigger Laravel reminders via HTTP webhook or direct CLI command
 */
async function triggerLaravelReminders(type = 'all') {
    const laravelUrl = process.env.LARAVEL_URL || process.env.APP_URL || 'https://vamalabs.in/invoice';
    const cronSecret = process.env.CRON_SECRET || SECRET;

    // 1. Try via HTTP endpoint
    try {
        const cleanBaseUrl = laravelUrl.replace(/\/+$/, '');
        const targetUrl = `${cleanBaseUrl}/cron/send-reminders?token=${encodeURIComponent(cronSecret)}&type=${type}`;
        logger.info({ targetUrl, type }, 'Dispatching reminder cron request to Laravel...');

        const response = await fetch(targetUrl, {
            headers: {
                'X-Cron-Secret': cronSecret,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            logger.info({ type, data }, '✓ Automated reminder dispatch completed via Laravel web endpoint');
            return data;
        } else {
            logger.warn({ status: response.status, statusText: response.statusText }, 'Web cron endpoint returned non-200');
        }
    } catch (httpErr) {
        logger.warn({ err: httpErr.message }, 'Could not reach Laravel web cron endpoint; checking local artisan...');
    }

    // 2. Local fallback if on same server
    try {
        const { exec } = await import('child_process');
        const artisanPath = path.resolve(__dirname, '../artisan');
        if (fs.existsSync(artisanPath)) {
            const command = type === 'purchase' || type === 'purchases'
                ? 'php artisan purchases:send-due-reminders'
                : (type === 'sales' || type === 'sale' ? 'php artisan invoices:send-due-reminders' : 'php artisan invoices:send-due-reminders && php artisan purchases:send-due-reminders');

            logger.info({ command }, 'Running artisan command via Node.js child_process...');
            exec(command, { cwd: path.resolve(__dirname, '..') }, (err, stdout, stderr) => {
                if (err) {
                    logger.error({ err: err.message, stderr }, 'Artisan command execution failed');
                } else {
                    logger.info({ stdout: stdout.trim() }, '✓ Artisan reminder executed successfully via Node');
                }
            });
        }
    } catch (cliErr) {
        logger.error({ err: cliErr.message }, 'Error in local artisan execution fallback');
    }
}

/**
 * Automated WhatsApp Reminder Scheduler for India Standard Time (Asia/Kolkata)
 * Runs 24/7 inside Node.js:
 *  - 1:50 PM IST (13:50) -> Sales Reminders (PDF + UPI QR + Review QR)
 *  - 1:51 PM IST (13:51) -> Purchase Reminders (Statement PDF only)
 */
let lastTriggeredDateSales = null;
let lastTriggeredDatePurchase = null;

function startReminderCron() {
    logger.info('🕒 Automated WhatsApp Reminder Cron started (Target: 1:50 PM IST for Sales, 1:51 PM IST for Purchases)');

    setInterval(async () => {
        try {
            const now = new Date();
            // Get current time in Indian Standard Time (Asia/Kolkata)
            const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
            const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
            const [hourStr, minuteStr] = istTimeStr.split(':');
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);

            // 1. Sales Invoices Due Reminders: Exactly 1:50 PM IST (13:50)
            if (hour === 13 && minute === 50 && lastTriggeredDateSales !== istDateStr) {
                lastTriggeredDateSales = istDateStr;
                logger.info({ istTimeStr, istDateStr }, '⏰ [Node Cron] It is 1:50 PM IST! Triggering Customer Sales Reminders...');
                await triggerLaravelReminders('sales');
            }

            // 2. Purchase Bills Due Reminders: Exactly 1:51 PM IST (13:51)
            if (hour === 13 && minute === 51 && lastTriggeredDatePurchase !== istDateStr) {
                lastTriggeredDatePurchase = istDateStr;
                logger.info({ istTimeStr, istDateStr }, '⏰ [Node Cron] It is 1:51 PM IST! Triggering Admin Purchase Reminders...');
                await triggerLaravelReminders('purchases');
            }
        } catch (cronErr) {
            logger.error({ err: cronErr.message }, 'Error in Node reminder cron check');
        }
    }, 15000); // Check every 15 seconds
}

/**
 * GET/POST /cron/trigger
 * Manually trigger reminder dispatch on-demand from Node
 */
app.all('/cron/trigger', async (req, res) => {
    const authHeader = req.headers['x-whatsapp-secret'] || req.query.secret;
    if (SECRET && SECRET !== 'vama_secret_change_me_in_prod' && authHeader !== SECRET) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const type = req.query.type || req.body?.type || 'all';
    try {
        const result = await triggerLaravelReminders(type);
        return res.json({ success: true, message: `Reminders triggered for ${type}`, result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Start Express Server
app.listen(PORT, HOST, () => {
    logger.info(`Vama WhatsApp Baileys Sidecar running at http://${HOST}:${PORT}`);
    autoReconnectSessions();
    startReminderCron();
});
