/**
 * GZIpper - Web Worker de Processamento
 * Responsável por executar pako.gzip e pako.ungzip em background.
 */

importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');

/**
 * Converte Uint8Array para Base64 em chunks para evitar estouro de pilha.
 */
function uint8ToBase64(uint8) {
    let result = "";
    const chunk = 16384; 
    for (let i = 0; i < uint8.length; i += chunk) {
        result += String.fromCharCode.apply(null, uint8.subarray(i, i + chunk));
    }
    return btoa(result);
}

/**
 * Converte Base64 para Uint8Array.
 */
function base64ToUint8(base64) {
    try {
        const normalized = base64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(normalized);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } catch (e) {
        throw new Error('Formato Base64 inválido.');
    }
}

self.onmessage = function(e) {
    const { action, text } = e.data;
    
    try {
        if (!text && text !== "") throw new Error("Entrada inválida.");

        if (action === 'encode') {
            const encoder = new TextEncoder();
            const uint8 = encoder.encode(text);
            const compressed = pako.gzip(uint8);
            const base64 = uint8ToBase64(compressed);
            
            self.postMessage({ 
                success: true, 
                result: base64, 
                originalSize: uint8.length, 
                compressedSize: compressed.length 
            });
        } else if (action === 'decode') {
            const compressedBytes = base64ToUint8(text);
            const decompressed = pako.ungzip(compressedBytes);
            const decoder = new TextDecoder('utf-8', { fatal: true });
            const resultText = decoder.decode(decompressed);
            
            self.postMessage({ 
                success: true, 
                result: resultText, 
                // Mantém "original" como o texto descomprimido para estatísticas coerentes
                originalSize: decompressed.length,
                compressedSize: compressedBytes.length
            });
        } else {
            throw new Error("Ação desconhecida: " + action);
        }
    } catch (err) {
        self.postMessage({ success: false, error: (err && err.message) || String(err) });
    }
};

// Log de inicialização para debug no console do navegador
console.log('[GZIpper Worker] Inicializado com sucesso.');
