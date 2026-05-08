import { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { usePipeRackStore } from '../store/usePipeRackStore';

export default function PipeRackSettingsHydrator() {
  const resolvedEngineeringSettings = useAppStore((state) => state.resolvedEngineeringSettings);

  useEffect(() => {
    const settings = resolvedEngineeringSettings?.settings;
    if (!settings) return;

    usePipeRackStore.setState((state) => ({
      globalSettings: {
        ...state.globalSettings,
        anchorDistanceFt: Number(settings.rackAnchorDistanceFt ?? state.globalSettings.anchorDistanceFt),
        defaultSpacingFt: Number(settings.rackDefaultSpacingFt ?? state.globalSettings.defaultSpacingFt),
        allowableStressPsi: Number(settings.rackAllowableStressPsi ?? state.globalSettings.allowableStressPsi),
        rackFrictionFactor: Number(settings.rackFrictionFactor ?? state.globalSettings.rackFrictionFactor ?? 0.3),
        rackSpacingMargin: Number(settings.rackSpacingMargin ?? state.globalSettings.rackSpacingMargin ?? 75),
        defaultSpacingSource: 'engineering-settings-contract',
        settingsHash: resolvedEngineeringSettings.settingsHash,
      },
      logStream: [
        ...state.logStream.slice(-98),
        `[SETTINGS] Pipe Rack defaults hydrated from ${resolvedEngineeringSettings.settingsHash}`,
      ],
    }));
  }, [resolvedEngineeringSettings?.settingsHash]);

  return null;
}
