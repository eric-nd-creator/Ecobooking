import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import StockDetailModal from './StockDetailModal';
import { formatCompactNumber, formatMoney, formatPct } from './stockFormat';

const TABS = [
  { key: 'all', label: 'All Stocks' },
  { key: 'gainers', label: 'Top Gainers' },
  { key: 'losers', label: 'Top Losers' },
  { key: 'active', label: 'Most Active' },
  { key: 'watchlist', label: 'My Watchlist' },
];

const POLL_INTERVAL = 60000; // matches the backend cron's open-market poll cadence
const PAGE_SIZE = 20;

const StockCard = ({ stock, isWatchlisted, onToggleWatchlist, onOpen }) => {
  const isUp = (stock.changePct ?? 0) >= 0;
  return (
    <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {stock.logoUrl ? (
            <img src={stock.logoUrl} alt="" className="w-10 h-10 rounded-full object-contain bg-gray-50 dark:bg-gray-700 flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold flex-shrink-0">
              {stock.symbol.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{stock.companyName}</p>
            <p className="text-xs text-gray-400">{stock.symbol} · {stock.exchange}</p>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleWatchlist(); }} aria-label="Toggle watchlist"
          className="flex-shrink-0 text-gray-300 hover:text-accent-500">
          <Star className={`w-5 h-5 ${isWatchlisted ? 'fill-accent-500 text-accent-500' : ''}`} />
        </button>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{formatMoney(stock.price, stock.currency)}</p>
          <p className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {stock.changeAbs != null ? stock.changeAbs.toFixed(2) : '—'} ({formatPct(stock.changePct)})
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Vol {formatCompactNumber(stock.volume)}</p>
          <p>Cap {formatCompactNumber(stock.marketCap)}</p>
        </div>
      </div>
    </div>
  );
};

const AfricanStocks = () => {
  const [tab, setTab] = useState('all');
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState([]);

  const [marketStatus, setMarketStatus] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [selectedStockId, setSelectedStockId] = useState(null);

  // Debounce free-text search so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadWatchlistIds = () => {
    api.get('/stocks/watchlist')
      .then(({ data }) => setWatchlistIds(new Set(data.stocks.map(s => s.id))))
      .catch(() => {});
  };

  useEffect(() => {
    api.get('/stocks/countries').then(({ data }) => setCountries(data.countries)).catch(() => {});
    api.get('/stocks/market-status').then(({ data }) => setMarketStatus(data.exchanges)).catch(() => {});
    loadWatchlistIds();
  }, []);

  const loadCurrentView = useCallback(() => {
    setLoading(true);
    const request = tab === 'all'
      ? api.get('/stocks', { params: { search: search || undefined, country: country || undefined, page, pageSize: PAGE_SIZE } })
      : tab === 'watchlist'
        ? api.get('/stocks/watchlist')
        : api.get('/stocks/movers', { params: { type: tab, limit: 20 } });

    request
      .then(({ data }) => {
        setStocks(data.stocks);
        setTotal(tab === 'all' ? data.total : data.stocks.length);
      })
      .catch(err => toast.error(err.response?.data?.message || 'Could not load stocks'))
      .finally(() => setLoading(false));
  }, [tab, search, country, page]);

  useEffect(() => { loadCurrentView(); }, [loadCurrentView]);

  useEffect(() => {
    const id = setInterval(loadCurrentView, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadCurrentView]);

  const toggleWatchlist = async (stockId) => {
    const wasWatchlisted = watchlistIds.has(stockId);
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (wasWatchlisted) next.delete(stockId); else next.add(stockId);
      return next;
    });
    try {
      if (wasWatchlisted) await api.delete(`/stocks/watchlist/${stockId}`);
      else await api.post(`/stocks/watchlist/${stockId}`);
      if (tab === 'watchlist') loadCurrentView();
    } catch (err) {
      setWatchlistIds(prev => {
        const next = new Set(prev);
        if (wasWatchlisted) next.add(stockId); else next.delete(stockId);
        return next;
      });
      toast.error(err.response?.data?.message || 'Could not update watchlist');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">African Stocks</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Live prices across JSE, NGX, EGX and NSE</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {marketStatus.map(m => (
              <span key={m.exchange} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                m.isOpen ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${m.isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                {m.exchange} {m.isOpen ? 'Open' : 'Closed'}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by company, symbol or country..." className="input pl-9" />
          </div>
          <select value={country} onChange={e => { setCountry(e.target.value); setPage(1); }} className="input w-auto min-w-[160px]">
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : stocks.length === 0 ? (
          <p className="text-gray-400 text-center py-10">
            {tab === 'watchlist' ? 'Tap the star on any stock to add it to your watchlist' : 'No stocks match your filters'}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map(stock => (
              <StockCard key={stock.id} stock={stock}
                isWatchlisted={watchlistIds.has(stock.id)}
                onToggleWatchlist={() => toggleWatchlist(stock.id)}
                onOpen={() => setSelectedStockId(stock.id)} />
            ))}
          </div>
        )}

        {tab === 'all' && total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-outline py-2 px-4 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-outline py-2 px-4 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selectedStockId && (
        <StockDetailModal
          stockId={selectedStockId}
          onClose={() => setSelectedStockId(null)}
          isWatchlisted={watchlistIds.has(selectedStockId)}
          onToggleWatchlist={toggleWatchlist}
        />
      )}
    </DashboardLayout>
  );
};

export default AfricanStocks;
