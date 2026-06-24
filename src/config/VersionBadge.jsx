/**
 * VersionBadge.jsx — Displays the active build timestamp in bottom-right.
 * Format: ver.dd-mm-yy HH:mm
 */

import React from 'react';
import { VERSION_STRING } from './version';

const style = {
    position: 'fixed',
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: '#475569',
    pointerEvents: 'none',
    userSelect: 'none',
    fontFamily: 'monospace',
    zIndex: 9999,
};

export function VersionBadge() {
    return <span style={style}>{VERSION_STRING}</span>;
}
