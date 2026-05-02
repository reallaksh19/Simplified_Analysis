/**
 * Spl2BundleTab.jsx — Tab root for the SPL2 2D Calc Bundle
 * Standalone: no props required. Import and drop into any app.
 */

import React from 'react';
import { Spl2Frame } from './Spl2Frame';
import { log } from '../utils/logger';

const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', height: '100%', flex: 1, overflow: 'hidden' },
};

export function Spl2BundleTab() {
    log('info', 'Spl2BundleTab', 'Tab mounted — rendering SPL2 iframe');

    return (
        <div style={styles.wrapper}>
            <Spl2Frame />
        </div>
    );
}
