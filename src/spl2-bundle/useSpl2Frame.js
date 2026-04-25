/**
 * useSpl2Frame.js — Custom hook for SPL2 bundle iframe lifecycle
 * Responsibilities: derive iframe src, track ready/error state
 */

import { useState, useCallback } from 'react';
import { log } from '../utils/logger';

const SPL2_BUNDLE_PATH = '/spl2-bundle/spl2_master.html';

/**
 * @returns {{ src: string, isReady: boolean, hasError: boolean, onLoad: Function, onError: Function }}
 */
export function useSpl2Frame() {
    const [isReady, setIsReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    const onLoad = useCallback(() => {
        log('info', 'useSpl2Frame', 'SPL2 iframe loaded successfully', { src: SPL2_BUNDLE_PATH });
        setIsReady(true);
        setHasError(false);
    }, []);

    const onError = useCallback((e) => {
        log('error', 'useSpl2Frame', 'SPL2 iframe failed to load', {
            src: SPL2_BUNDLE_PATH,
            errorType: e?.type ?? 'unknown',
        });
        setIsReady(false);
        setHasError(true);
    }, []);

    return {
        src: SPL2_BUNDLE_PATH,
        isReady,
        hasError,
        onLoad,
        onError,
    };
}
