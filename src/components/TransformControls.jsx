import React from 'react';
import { useAppStore } from '../store/appStore';
import { Activity, Circle, Minus, CornerDownRight } from 'lucide-react'; 

const SVGIconWrapper = ({ children }) => (
  <div style={{
    width: 48, 
    height: 48, 
    borderRadius: '12px', 
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 8,
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
  }}>
    {children}
  </div>
);

const LIcon = () => (
  <SVGIconWrapper>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 4 4 20 20 20"></polyline>
    </svg>
  </SVGIconWrapper>
);

const ZIcon = () => (
  <SVGIconWrapper>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 6 20 6 4 18 20 18"></polyline>
    </svg>
  </SVGIconWrapper>
);

const LoopIcon = () => (
  <SVGIconWrapper>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 H8 V4 H16 V12 H20"></path>
    </svg>
  </SVGIconWrapper>
);

const AutoIcon = () => (
  <SVGIconWrapper>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 8 v8"></path>
      <path d="M8 12 h8"></path>
    </svg>
  </SVGIconWrapper>
);

export const TransformControls = () => {
  const setMode = useAppStore(state => state.setTransformMode);

  const activeGeoTab = useAppStore(state => state.activeGeoTab) || 'UNIFIED';
  const tabTransformModes = useAppStore(state => state.tabTransformModes);
  const setTabTransformMode = useAppStore(state => state.setTabTransformMode);

  // Get the mode for the currently active tab
  const mode = tabTransformModes[activeGeoTab] || 'Auto';

  const handleModeChange = (newMode) => {
    setTabTransformMode(activeGeoTab, newMode);
    setMode(newMode); // Optional: keep fallback updated
  };

  const ControlButton = ({ btnMode, icon: Icon, label }) => {
    const isActive = mode === btnMode;
    return (
      <button 
        onClick={() => handleModeChange(btnMode)}
        style={{
          padding: '16px 24px',
          background: isActive ? '#2563eb' : '#1e293b', /* Blue 600 or Slate 800 */
          color: isActive ? '#fff' : '#cbd5e1', /* White or Slate 300 */
          border: isActive ? '1px solid #3b82f6' : '1px solid #334155', /* Blue 500 or Slate 700 */
          borderRadius: '12px',
          cursor: 'pointer',
          marginRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isActive ? '0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.15)' : 'none',
          transform: isActive ? 'translateY(-2px)' : 'translateY(0)'
        }}
        onMouseEnter={(e) => {
          if(!isActive) {
            e.currentTarget.style.background = '#334155'; /* Slate 700 */
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if(!isActive) {
            e.currentTarget.style.background = '#1e293b'; /* Slate 800 */
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <Icon />
        <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '500' }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', padding: '24px 32px', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
      <ControlButton btnMode="Auto" icon={AutoIcon} label="Auto-Detect" />
      <ControlButton btnMode="L" icon={LIcon} label="Force L" />
      <ControlButton btnMode="Z" icon={ZIcon} label="Force Z" />
      <ControlButton btnMode="Loop" icon={LoopIcon} label="Force Loop" />
    </div>
  );
};
