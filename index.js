/**
 * GZIpper - Lógica Principal (Frontend)
 */

// --- Gerenciamento do Web Worker ---
let worker;
let workerFailed = false;

function initWorker() {
    try {
        // Tentativa de carregar o worker a partir de um arquivo externo
        worker = new Worker('worker.js');

        worker.onmessage = handleWorkerMessage;
        
        worker.onerror = function(err) {
            console.error('[GZIpper] Erro crítico no Worker:', err);
            workerFailed = true;
            showError('Erro ao carregar o processador (worker.js). Verifique se o arquivo existe no servidor.');
            toggleLoading(false);
        };

    } catch (e) {
        console.error('[GZIpper] Não foi possível inicializar o Worker:', e);
        workerFailed = true;
        showError('Seu navegador não suporta Web Workers ou o arquivo não foi encontrado.');
    }
}

// --- Elementos do DOM ---
const elements = {
    inputText: document.getElementById('inputText'),
    outputText: document.getElementById('outputText'),
    encodeBtn: document.getElementById('encodeBtn'),
    decodeBtn: document.getElementById('decodeBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    charCount: document.getElementById('charCount'),
    statsPanel: document.getElementById('statsPanel'),
    originalSizeEl: document.getElementById('originalSize'),
    compressedSizeEl: document.getElementById('compressedSize'),
    ratioEl: document.getElementById('ratio'),
    loader: document.getElementById('loader'),
    ratioBar: document.getElementById('ratioBar')
};

// --- Funções de UI ---
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function toggleLoading(isLoading) {
    if (elements.loader) elements.loader.classList.toggle('d-none', !isLoading);
    [elements.encodeBtn, elements.decodeBtn, elements.clearBtn].forEach(btn => {
        if (btn) btn.disabled = isLoading;
    });
}

function updateStats(orig, comp) {
    elements.statsPanel.classList.remove('hidden');
    elements.originalSizeEl.textContent = formatBytes(orig);
    elements.compressedSizeEl.textContent = formatBytes(comp);
    const ratio = ((1 - (comp / orig)) * 100).toFixed(1);
    elements.ratioEl.textContent = ratio > 0 ? `${ratio}% de economia` : 'Sem economia';
    elements.ratioEl.className = ratio > 0 ? 'stat-value text-success' : 'stat-value text-warning';
    if (elements.ratioBar) {
        const fill = orig > 0 ? Math.min(100, (comp / orig) * 100) : 0;
        elements.ratioBar.style.width = `${fill}%`;
    }
}

function showError(msg) {
    elements.outputText.value = `❌ ERRO: ${msg}`;
    elements.statsPanel.classList.add('hidden');
}

// --- Handlers ---
function handleWorkerMessage(e) {
    const { success, result, originalSize, compressedSize, error } = e.data;
    toggleLoading(false);

    if (success) {
        elements.outputText.value = result;
        updateStats(originalSize, compressedSize);
    } else {
        showError(error);
    }
}

// --- Event Listeners ---
function runAction(action, text) {
    if (!text) return;
    if (!worker || workerFailed) {
        showError('O processador (worker.js) não está disponível. Recarregue a página.');
        return;
    }
    toggleLoading(true);
    worker.postMessage({ action, text });
}

// Encode preserva o texto exato (sem trim) para garantir ida-e-volta fiel
elements.encodeBtn.addEventListener('click', () => {
    runAction('encode', elements.inputText.value);
});

elements.decodeBtn.addEventListener('click', () => {
    runAction('decode', elements.inputText.value.trim());
});

elements.clearBtn.addEventListener('click', () => {
    elements.inputText.value = '';
    elements.outputText.value = '';
    elements.charCount.textContent = '0 caracteres';
    elements.statsPanel.classList.add('hidden');
});

const copyBtnDefaultHTML = elements.copyBtn.innerHTML;
let copyResetTimer;

function flashCopyBtn(html, cls) {
    clearTimeout(copyResetTimer);
    elements.copyBtn.innerHTML = html;
    elements.copyBtn.classList.remove('btn-dark', 'btn-success', 'btn-danger');
    elements.copyBtn.classList.add(cls);
    copyResetTimer = setTimeout(() => {
        elements.copyBtn.innerHTML = copyBtnDefaultHTML;
        elements.copyBtn.classList.remove('btn-success', 'btn-danger');
        elements.copyBtn.classList.add('btn-dark');
    }, 2000);
}

elements.copyBtn.addEventListener('click', () => {
    const value = elements.outputText.value;
    if (!value || value.startsWith('❌')) return;
    navigator.clipboard.writeText(value)
        .then(() => flashCopyBtn('✓ Copiado', 'btn-success'))
        .catch(() => flashCopyBtn('✗ Falhou', 'btn-danger'));
});

elements.inputText.addEventListener('input', () => {
    const len = elements.inputText.value.length;
    elements.charCount.textContent = `${len.toLocaleString()} caractere${len !== 1 ? 's' : ''}`;
});

// --- Inicialização ---
initWorker();
