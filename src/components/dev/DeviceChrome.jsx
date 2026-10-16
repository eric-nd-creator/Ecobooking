// Pure-CSS phone/tablet bezel wrapping the preview iframe — no chrome at all
// ('none') for the desktop mode / "frame off" toggle.
const DeviceChrome = ({ type, chrome, width, height, children }) => {
  if (chrome === 'none') {
    return (
      <div style={{ width, height }} className="overflow-hidden rounded-lg shadow-lg bg-white">
        {children}
      </div>
    );
  }

  const bezel = type === 'tablet' ? 24 : 14;

  return (
    <div className="relative bg-gray-900 rounded-[2.5rem] shadow-2xl" style={{ width: width + bezel * 2, height: height + bezel * 2, padding: bezel }}>
      {chrome === 'ios-notch' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-gray-900 rounded-full z-10" />
      )}
      {chrome === 'ios' && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full z-10" />
      )}
      <div className="bg-white rounded-[1.75rem] overflow-hidden" style={{ width, height }}>
        {children}
      </div>
      {chrome === 'android' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full" />
      )}
      {(chrome === 'ios' || chrome === 'ios-notch') && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
      )}
    </div>
  );
};

export default DeviceChrome;
