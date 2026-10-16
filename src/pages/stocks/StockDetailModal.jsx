import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { SUCCESS_HEX, DANGER_HEX } from '../../theme';
import { formatCompactNumber, formatMoney, formatPct, formatHistoryTick } from './stockFormat';

const RANGES = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

const StockDetailModal = ({ stockId, onClose, isWatchlisted, onToggleWatchlist }) => {
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState(null);
  const [range, setRange] = useState('1M');
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingDetail(true);
    api.get(`/stocks/${stockId}`)
      .then(({ data }) => setDetail(data))
      .catch(err => toast.error(err.response?.data?.message || 'Could not load stock details'))
      .finally(() => setLoadingDetail(false));
  }, [stockId]);

  useEffect(() => {
    setLoadingHistory(true);
    api.get(`/stocks/${stockId}/history`, { params: { range } })
      .then(({ data }) => setHistory(data))
      .catch(err => toast.error(err.response?.data?.message || 'Could not load price history'))
      .finally(() => setLoadingHistory(false));
  }, [stockId, range]);

  const isUp = (detail?.changePct ?? 0) >= 0;
  const chartColor = isUp ? SUCCESS_HEX : DANGER_HEX;

  const kpis = [
    { label: 'Price', value: formatMoney(detail?.price, detail?.currency) },
    { label: 'Change', value: `${detail?.changeAbs?.toFixed(2) ?? '—'} (${formatPct(detail?.changePct)})`, color: isUp ? 'text-green-600' : 'text-red-600' },
    { label: 'Day High', value: formatMoney(detail?.dayHigh, detail?.currency) },
    { label: 'Day Low', value: formatMoney(detail?.dayLow, detail?.currency) },
    { label: 'Open', value: formatMoney(detail?.openPrice, detail?.currency) },
    { label: 'Volume', value: formatCompactNumber(detail?.volume) },
    { label: 'Market Cap', value: formatCompactNumber(detail?.marketCap) },
    { label: 'Sector', value: detail?.sector || '—' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Stock details">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {detail?.logoUrl ? (
              <img src={detail.logoUrl} alt="" className="w-12 h-12 rounded-full object-contain bg-gray-50 dark:bg-gray-700 flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                {detail?.symbol?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{detail?.companyName || 'Loading…'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{[detail?.symbol, detail?.exchange, detail?.country].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse mb-6" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {kpis.map(kpi => (
              <div key={kpi.label} className="card py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold">{kpi.label}</p>
                <p className={`text-sm font-bold mt-0.5 ${kpi.color || 'text-gray-800 dark:text-gray-100'}`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap mb-4">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                range === r ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}>
              {r}
            </button>
          ))}
        </div>

        {loadingHistory ? (
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : !history?.candles?.length ? (
          <p className="text-gray-400 text-center py-10">No historical data for this range yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history.candles}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="ts" tickFormatter={ts => formatHistoryTick(ts, range)} tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} width={60} />
              <Tooltip labelFormatter={ts => formatHistoryTick(ts, range)} formatter={v => v.toFixed(2)} />
              <Line type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={() => onToggleWatchlist(detail?.id ?? stockId)} className="btn-outline flex items-center gap-2">
            <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-accent-500 text-accent-500' : ''}`} />
            {isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
