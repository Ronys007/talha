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

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
 * POST /sessions/:id/connect
 * Initializes Baileys socket and generates fresh QR code.
 */
app.post('/sessions/:id/connect', async (req, res) => {
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

    const session = sessions.get(sessionId);
    if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp session is not connected',
            status: session?.status || 'disconnected'
        });
    }

    const jid = formatWhatsAppJid(phone);
    if (!jid) {
        return res.status(422).json({ success: false, error: 'Invalid phone number format' });
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
            // URL upload (Image or Document)
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

    const session = sessions.get(sessionId);
    if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp session is not connected',
            status: session?.status || 'disconnected'
        });
    }

    const jid = formatWhatsAppJid(phone);
    if (!jid) {
        return res.status(422).json({ success: false, error: 'Invalid phone number format' });
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

// Start Express Server
app.listen(PORT, HOST, () => {
    logger.info(`Vama WhatsApp Baileys Sidecar running at http://${HOST}:${PORT}`);
    autoReconnectSessions();
});
