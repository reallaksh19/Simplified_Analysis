import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAnalysisStore } from './AnalysisStore';

function resolveGc3dMaterial(settings, fallback) {
  const material = settings.defaultMaterial || fallback;
  if (material === 'Carbon Steel') return 'Carbon steels, C ≤ 0.3%';
  return material;
}

function buildGc3dParams(settings) {
  const Sc_psi = Number(settings.gc3dSc_psi ?? 20000);
  const Sh_psi = Number(settings.gc3dSh_psi ?? 19400);
  const f = Number(settings.gc3dCycleFactor ?? 1.0);
  return {
    deltaT_F: Number(settings.gc3dDeltaT_F ?? settings.deltaT_F ?? 380),
    installTemp_F: Number(settings.defaultInstallTemperature_F ?? 70),
    designTemp_F: Number(settings.defaultDesignTemperature_F ?? 450),
    E_psi: Number(settings.gc3dE_psi ?? 27000000),
    alpha_in_in_F: Number(settings.gc3dAlpha_in_in_F ?? 6.72e-6),
    Sc_psi,
    Sh_psi,
    f,
    Sa_psi: Number(settings.gc3dSa_psi ?? (f * (1.25 * Sc_psi + 0.25 * Sh_psi))),
  };
}

export function EngineeringSettingsHydrator() {
  const resolvedEngineeringSettings = useAppStore((state) => state.resolvedEngineeringSettings);

  useEffect(() => {
    const settings = resolvedEngineeringSettings?.settings;
    if (!settings) return;

    const params = buildGc3dParams(settings);
    useAnalysisStore.setState((state) => ({
      unitSystem: settings.projectUnitSystem || state.unitSystem,
      params,
      config: {
        ...state.config,
        gridSnap_mm: Number(settings.gc3dGridSnap_mm ?? state.config.gridSnap_mm),
        defaultMaterial: resolveGc3dMaterial(settings, state.config.defaultMaterial),
      },
      engineeringSettingsHash: resolvedEngineeringSettings.settingsHash,
    }));

    useAnalysisStore.getState().runAnalysis();
    useAnalysisStore.getState().log('SETTINGS_HYDRATE', `GC3D settings hydrated from ${resolvedEngineeringSettings.settingsHash}`);
  }, [resolvedEngineeringSettings?.settingsHash]);

  return null;
}
