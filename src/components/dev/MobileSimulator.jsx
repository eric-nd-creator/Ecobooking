import { useState, useMemo } from 'react';
import { Smartphone, X, RotateCw, RefreshCw, Monitor, Tablet } from 'lucide-react';
import { DEVICE_PRESETS } from './deviceProfiles';
import DeviceChrome from './DeviceChrome';

const TYPE_ICONS = { phone: Smartphone, tablet: Tablet, desktop: Monitor };

const MobileSimulator = () => {
  const [open, setOpen] = useState(false);
  const [deviceKey, setDeviceKey] = useState('iphone-14');
  const [orientation, setOrientation] = useState('portrait');
  const [zoom, setZoom] = useState(0.5);
  const [showChrome, setShowChrome] = useState(true);
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  const [pathInput, setPathInput] = useState(path);
  const [iframeKey, setIframeKey] = useState(0);

  const preset = DEVICE_PRESETS.find(d => d.key === deviceKey) || DEVICE_PRESETS[0];
  const isLandscape = orientation === 'landscape' && preset.type !== 'desktop';
  const effectiveWidth = isLandscape ? preset.height : preset.width;
  const effectiveHeight = isLandscape ? preset.width : preset.height;
  const iframeSrc = useMemo(() => window.location.origin + path, [path]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Open Mobile Simulator"
        className="fixed bottom-4 right-4 z-[999] w-12 h-12 rounded-full bg-brand-700 text-white shadow-xl flex items-center justify-center hover:bg-brand-800 transition-all">
        <Smartphone className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-gray-800 shadow-2xl z-[999] flex flex-col border-l border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Mobile Simulator</h3>
        <button onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <select value={deviceKey} onChange={e => setDeviceKey(e.target.value)} className="input">
            {DEVICE_PRESETS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <button onClick={() => setOrientation(o => (o === 'portrait' ? 'landscape' : 'portrait'))}
            disabled={preset.type === 'desktop'} aria-label="Rotate device" title="Rotate device"
            className="btn-outline p-2.5 disabled:opacity-40">
            <RotateCw className="w-4 h-4" />
          </button>
          <button onClick={() => setIframeKey(k => k + 1)} aria-label="Refresh preview" title="Refresh preview" className="btn-outline p-2.5">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {['phone', 'tablet', 'desktop'].map(type => {
            const match = DEVICE_PRESETS.find(d => d.type === type);
            const Icon = TYPE_ICONS[type];
            return (
              <button key={type} onClick={() => setDeviceKey(match.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  preset.type === type ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {type}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input value={pathInput} onChange={e => setPathInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setPath(pathInput); }}
            className="input text-xs" placeholder="/path" />
          <button onClick={() => setPath(pathInput)} className="btn-outline py-2 px-3 text-xs">Go</button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Zoom</span>
          <input type="range" min="0.25" max="1" step="0.05" value={zoom}
            onChange={e => setZoom(Number(e.target.value))} className="flex-1" />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={showChrome} onChange={e => setShowChrome(e.target.checked)} />
          Show device frame
        </label>

        <p className="text-xs text-gray-400 text-center">{effectiveWidth} × {effectiveHeight}px</p>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <DeviceChrome type={preset.type} chrome={showChrome ? preset.chrome : 'none'} width={effectiveWidth} height={effectiveHeight}>
            <iframe key={iframeKey} src={iframeSrc} title="Mobile Simulator preview"
              style={{ width: effectiveWidth, height: effectiveHeight, border: 0 }} />
          </DeviceChrome>
        </div>
      </div>

      <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-700">
        Layout/breakpoint preview only — for real pointer/hover/touch emulation use your browser's own DevTools device toolbar.
      </p>
    </div>
  );
};

export default MobileSimulator;
