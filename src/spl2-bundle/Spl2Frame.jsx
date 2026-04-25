/**
 * Spl2Frame.jsx — Renders the SPL2 bundle in an iframe
 * States: loading | error | ready
 * Injects CSS into the iframe on load to hide its duplicate app-header.
 */

import React, { useRef, useCallback, useState } from 'react';
import { log } from '../utils/logger';

const SPL2_BUNDLE_PATH = `${import.meta.env.BASE_URL}spl2-bundle/spl2_master.html`;

const styles = {
    wrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117' },
    overlay: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: 12, fontSize: 14 },
    spinner: { width: 32, height: 32, border: '3px solid #1e293b', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    iframe: { flex: 1, border: 'none', width: '100%', height: '100%' },
};

// CSS injected into the iframe to suppress the SPL2 bundle's own top nav bar
const HIDE_HEADER_CSS = `#app-header { display: none !important; } #app-layout { height: 100vh !important; }`;

export function Spl2Frame() {
    const iframeRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    const onLoad = useCallback(() => {
        try {
            const doc = iframeRef.current?.contentDocument;
            if (doc) {
                const style = doc.createElement('style');
                style.textContent = HIDE_HEADER_CSS;
                doc.head.appendChild(style);
                log('info', 'Spl2Frame', 'Injected header-hide CSS into SPL2 iframe');
            }
        } catch (e) {
            // Cross-origin restriction or doc not available — non-fatal
            log('warn', 'Spl2Frame', 'Could not inject CSS (may be cross-origin)', { error: e.message });
        }
        setIsReady(true);
        setHasError(false);
    }, []);

    const onError = useCallback((e) => {
        log('error', 'Spl2Frame', 'SPL2 iframe failed to load', { src: SPL2_BUNDLE_PATH });
        setHasError(true);
        setIsReady(false);
    }, []);

    if (hasError) {
        return (
            <div style={styles.overlay}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <span>Failed to load the 2D Calc Bundle.</span>
                <span style={{ color: '#475569', fontSize: 12 }}>Check that <code>/public/spl2-bundle/spl2_master.html</code> exists.</span>
            </div>
        );
    }

    return (
        <div style={styles.wrapper}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            {!isReady && (
                <div style={styles.overlay}>
                    <div style={styles.spinner} />
                    <span>Loading 2D Calc Bundle…</span>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={SPL2_BUNDLE_PATH}
                title="SPL2 2D Calc Bundle"
                style={{ ...styles.iframe, display: isReady ? 'block' : 'none' }}
                onLoad={onLoad}
                onError={onError}
            />
        </div>
    );
}
