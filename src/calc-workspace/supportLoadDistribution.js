/**
 * Functionality: compatibility boundary for support-load distribution and
 * LOADMARKER stagedJson export. Parameters: calculation workspace, legacy
 * preview model, and visible profile. Outputs: chainage V2 engineering results.
 * Fallback: nearest-two V1 remains an exported screening label only and is
 * never selected silently.
 */

import {
  buildEngineeringLoadDistribution,
  normalizeVisibleEngineeringLoadConfig,
} from './engineering-loads/engines/engineeringLoadEngine.js';
import { buildEngineeringLoadMarkerStageJson } from './engineering-loads/engines/loadMarkerStageJson.js';

export const SUPPORT_LOAD_DISTRIBUTION_SCHEMA = 'support-load-distribution/v2';
export const SUPPORT_LOAD_DISTRIBUTION_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V2';
export const SUPPORT_LOAD_SCREENING_METHOD = 'NEAREST_TWO_SUPPORT_LEVER_V1';

export function buildSupportLoadDistribution(workspace, supportLoadModel, profileLike) {
  const visibleConfig = normalizeVisibleEngineeringLoadConfig({
    gravityMps2: profileLike?.gravityFactor,
    loadFactor: profileLike?.verticalLoadFactor,
    distributionMethod: SUPPORT_LOAD_DISTRIBUTION_METHOD,
    source: profileLike?.configSource || 'visible-editable-config',
  });
  const evaluatedAt = supportLoadModel?.evaluatedAt || new Date().toISOString();
  return buildEngineeringLoadDistribution(workspace, visibleConfig, evaluatedAt);
}

export function buildSupportLoadStageTree(workspace, distribution, sourceName) {
  return buildEngineeringLoadMarkerStageJson(workspace, distribution, sourceName);
}
