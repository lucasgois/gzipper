/**
 * GZIpper - Lógica Principal (Frontend)
 */

// --- Gerenciamento do Web Worker ---
let worker;

function initWorker() {
    try {
        // Tentativa de carregar o worker a partir de um arquivo externo
        worker = new Worker('worker.js');

        worker.onmessage = handleWorkerMessage;
        
        worker.onerror = function(err) {
            console.error('[GZIpper] Erro crítico no Worker:', err);
            showError('Erro ao carregar o processador (worker.js). Verifique se o arquivo existe no servidor.');
            toggleLoading(false);
        };

    } catch (e) {
        console.error('[GZIpper] Não foi possível inicializar o Worker:', e);
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
    loader: document.getElementById('loader')
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
elements.encodeBtn.addEventListener('click', () => {
    const text = elements.inputText.value.trim();
    if (!text) return;
    toggleLoading(true);
    worker.postMessage({ action: 'encode', text });
});

elements.decodeBtn.addEventListener('click', () => {
    const text = elements.inputText.value.trim();
    if (!text) return;
    toggleLoading(true);
    worker.postMessage({ action: 'decode', text });
});

elements.clearBtn.addEventListener('click', () => {
    elements.inputText.value = '';
    elements.outputText.value = '';
    elements.charCount.textContent = '0 caracteres';
    elements.statsPanel.classList.add('hidden');
});

elements.copyBtn.addEventListener('click', () => {
    if (!elements.outputText.value || elements.outputText.value.startsWith('❌')) return;
    navigator.clipboard.writeText(elements.outputText.value);
    const originalText = elements.copyBtn.innerHTML;
    elements.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    elements.copyBtn.classList.replace('btn-dark', 'btn-success');
    setTimeout(() => {
        elements.copyBtn.innerHTML = originalText;
        elements.copyBtn.classList.replace('btn-success', 'btn-dark');
    }, 2000);
});

elements.inputText.addEventListener('input', () => {
    const len = elements.inputText.value.length;
    elements.charCount.textContent = `${len.toLocaleString()} caractere${len !== 1 ? 's' : ''}`;
});

// --- Inicialização ---
initWorker();
