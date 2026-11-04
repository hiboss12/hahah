const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DEFAULT_SCRIPT_FILENAME = 'bloxflare.lua';
const ALLOWED_FILENAMES = ['bloxflare_wear.lua', 'bloxflare_avatar.lua', 'bloxflare.lua'];

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise(function(resolve, reject) {
        let body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async function(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/ping') {
        sendResponse(res, 200, { status: 'ok', message: 'Bloxflare bridge is running' });
        return;
    }

    if (req.method === 'POST' && req.url === '/write-script') {
        try {
            const data = await parseBody(req);
            const autoexecPath = data.autoexecPath;
            const script = data.script;

            if (!autoexecPath) {
                sendResponse(res, 400, { status: 'error', message: 'No autoexec path provided' });
                return;
            }

            if (!script) {
                sendResponse(res, 400, { status: 'error', message: 'No script provided' });
                return;
            }

            if (!fs.existsSync(autoexecPath)) {
                sendResponse(res, 400, { status: 'error', message: 'Path does not exist: ' + autoexecPath });
                return;
            }

            const stats = fs.statSync(autoexecPath);
            if (!stats.isDirectory()) {
                sendResponse(res, 400, { status: 'error', message: 'Path is not a directory: ' + autoexecPath });
                return;
            }

            const filename = ALLOWED_FILENAMES.includes(data.filename) ? data.filename : DEFAULT_SCRIPT_FILENAME;
            const filePath = path.join(autoexecPath, filename);
            fs.writeFileSync(filePath, script, 'utf8');

            console.log('[BRIDGE] Script written to ' + filePath);
            sendResponse(res, 200, { status: 'ok', message: 'Script written', path: filePath });
        } catch (e) {
            console.error('[BRIDGE] Write error:', e.message);
            sendResponse(res, 500, { status: 'error', message: e.message });
        }
        return;
    }

    if (req.method === 'POST' && req.url === '/clear-script') {
        try {
            const data = await parseBody(req);
            const autoexecPath = data.autoexecPath;

            if (!autoexecPath) {
                sendResponse(res, 400, { status: 'error', message: 'No autoexec path provided' });
                return;
            }

            const filename = ALLOWED_FILENAMES.includes(data.filename) ? data.filename : DEFAULT_SCRIPT_FILENAME;
            const filePath = path.join(autoexecPath, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('[BRIDGE] Script removed from ' + filePath);
            }

            sendResponse(res, 200, { status: 'ok', message: 'Script cleared' });
        } catch (e) {
            console.error('[BRIDGE] Clear error:', e.message);
            sendResponse(res, 500, { status: 'error', message: e.message });
        }
        return;
    }

    sendResponse(res, 404, { status: 'error', message: 'Not found' });
});

server.listen(PORT, '127.0.0.1', function() {
    console.log('');
    console.log('  ====================================');
    console.log('  Bloxflare Bridge v1.0');
    console.log('  ====================================');
    console.log('');
    console.log('  Running on http://localhost:' + PORT);
    console.log('  Waiting for Bloxflare script...');
    console.log('');
    console.log('  Keep this window open while using');
    console.log('  Fake Wear or Avatar Spoof.');
    console.log('');
    console.log('  ====================================');
    console.log('');
});

server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        console.error('[BRIDGE] Port ' + PORT + ' is already in use. Is another bridge instance running?');
    } else {
        console.error('[BRIDGE] Server error:', err.message);
    }
    process.exit(1);
});
