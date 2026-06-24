import {
  sectionProperties,
  thermalDisplacement,
  gcBasic,
  combineStressAtNode
} from '../../core/solvers/gc3d/GC3DCalcEngine.js';
import { solveGC3D as solveRouteGC3D } from './solveGC3D.js';

const UNIT_SYSTEM_GC3D = Object.freeze({
  length: 'in',
  force: 'lbf',
  stress: 'psi',
  moment: 'in-lbf',
  temperature: 'F'
});

function contract({ methodId = 'GC_BASIC_12EI', formulaIds, inputs, results, status = 'PASSED', diagnostics = [], moduleId = '3d-guided-cantilever' }) {
  return {
    moduleId,
    methodId,
    formulaIds,
    unitSystem: UNIT_SYSTEM_GC3D,
    inputs,
    results,
    status,
    diagnostics
  };
}

export function calcPipeSection({ od_in, wt_in }) {
  const props = sectionProperties(Number(od_in), Number(wt_in));
  return contract({
    moduleId: 'gc3d-core',
    formulaIds: ['PIPE_SECTION_I_HOLLOW_CIRCLE', 'PIPE_SECTION_Z_I_OVER_C'],
    inputs: { od_in, wt_in },
    results: {
      Di: props.D_i,
      I: props.I,
      Z: props.Z,
      r2: props.r2
    }
  });
}

export function calcThermalDisplacement({ alpha_in_in_F, length_in, deltaT_F }) {
  const delta = thermalDisplacement(Number(alpha_in_in_F), Number(length_in), Number(deltaT_F));
  return contract({
    formulaIds: ['THERMAL_EXPANSION_ALPHA_L_DT'],
    inputs: { alpha_in_in_F, length_in, deltaT_F },
    results: { delta }
  });
}

export function calcGuidedCantileverBasic({ E_psi, I_in4, Z_in3, OD_in, delta_in, L_in }) {
  const basic = gcBasic(Number(E_psi), Number(I_in4), Number(Z_in3), Number(OD_in), Number(delta_in), Number(L_in));
  return contract({
    formulaIds: ['GUIDED_CANTILEVER_F_12EID_OVER_L3', 'GUIDED_CANTILEVER_M_FL_OVER_2', 'CANTILEVER_STRESS_M_OVER_Z'],
    inputs: { E_psi, I_in4, Z_in3, OD_in, delta_in, L_in },
    results: {
      F: basic.F_lbf,
      M: basic.M_inlbf,
      Sb: basic.Sb_psi
    }
  });
}

export function combineNodeStress({ components }) {
  const combined = combineStressAtNode((components || []).map(Number));
  return contract({
    formulaIds: ['CANTILEVER_STRESS_M_OVER_Z'],
    inputs: { components },
    results: { combined }
  });
}

export function solveGC3D(input) {
  return solveRouteGC3D(input);
}

export { solveRouteGC3D };
