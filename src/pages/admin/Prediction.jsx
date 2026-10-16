import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { CHART_COLORS as COLORS, DANGER_HEX } from '../../theme';
import { RefreshCw, CalendarDays, TrendingUp, CalendarRange, Clock, Trophy, Banknote, Wallet, Landmark, MapPin, X } from 'lucide-react';
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 .. 21:00

const METRICS = [
    { key: 'daily', label: 'Day', unit: 'days', defaultHorizon: 14 },
    { key: 'weekly', label: 'Week', unit: 'weeks', defaultHorizon: 8 },
    { key: 'monthly', label: 'Month', unit: 'months', defaultHorizon: 6 },
    { key: 'court_utilization', label: 'Court Usage' },
    { key: 'peak_hours', label: 'Hour' },
];

const Prediction = () => {
        const [summary, setSummary] = useState(null);
        const [metric, setMetric] = useState('daily');
        const [forecast, setForecast] = useState(null);
        const [loading, setLoading] = useState(true);
        const [training, setTraining] = useState(false);
        const [period, setPeriod] = useState(14);
        const [courtId, setCourtId] = useState('');
        const [hour, setHour] = useState('');
        const [courts, setCourts] = useState([]);
        const [pointDate, setPointDate] = useState('');
        const [pointMonth, setPointMonth] = useState('');
        const [peakPoint, setPeakPoint] = useState(null);
        const [findingPeak, setFindingPeak] = useState(false);
        const [type, setType] = useState('bookings');

        const activeMetric = METRICS.find(m => m.key === metric);
        const hasPeriod = Boolean(activeMetric ?.defaultHorizon);
        const isRevenue = type === 'revenue';
        const fmt = (v) => isRevenue ? `${Math.round(v).toLocaleString()} RWF` : Math.round(v * 10) / 10;
        // "Choose court" applies to time-series metrics and Hour (peak-hours-for-this-court)
        const showCourtFilter = metric !== 'court_utilization';
        // "Choose hour" applies to time-series metrics and Court Usage (usage-at-this-hour)
        const showHourFilter = metric !== 'peak_hours';
        // "Pick a date/month and see the peak" only makes sense on the time-series tabs
        const showPointPicker = metric === 'daily' || metric === 'monthly';

        const loadSummary = async() => {
            const { data } = await api.get('/predictions');
            setSummary(data.summary);
        };

        const loadCourts = async() => {
            const { data } = await api.get('/courts');
            setCourts(data);
        };

        const loadForecast = async() => {
            setLoading(true);
            const params = new URLSearchParams({ metric });
            if (hasPeriod) params.set('horizon', period);
            if (showCourtFilter && courtId) params.set('court_id', courtId);
            if (showHourFilter && hour !== '') params.set('hour', hour);
            if (hasPeriod) params.set('type', type);
            const { data } = await api.get(`/predictions/forecast?${params}`);
            setForecast(data);
            setLoading(false);
        };

        useEffect(() => { loadSummary();
            loadCourts(); }, []);
        useEffect(() => { loadForecast(); }, [metric, courtId, hour, type]);

        useEffect(() => {
            const m = METRICS.find(x => x.key === metric);
            if (m ?.defaultHorizon) setPeriod(m.defaultHorizon);
            else setType('bookings');
            setPeakPoint(null);
        }, [metric]);

        useEffect(() => { setPeakPoint(null); }, [courtId, hour, type]);

        const handleFindPeak = async() => {
            const target = metric === 'monthly' ? pointMonth : pointDate;
            if (!target) return;
            setFindingPeak(true);
            try {
                const params = new URLSearchParams({ metric, type });
                if (metric === 'monthly') params.set('month', pointMonth);
                else params.set('date', pointDate);
                if (courtId) params.set('court_id', courtId);
                if (hour !== '') params.set('hour', hour);
                const { data } = await api.get(`/predictions/point?${params}`);
                setPeakPoint(data);
            } catch (err) {
                toast.error(err.response ?.data ?.message || 'Could not compute that point');
            } finally {
                setFindingPeak(false);
            }
        };

        const handleTrain = async() => {
            setTraining(true);
            try {
                await api.post('/predictions/train');
                toast.success('Model retrained on latest booking data');
                await Promise.all([loadSummary(), loadForecast()]);
            } catch (err) {
                toast.error(err.response ?.data ?.message || 'Training failed');
            } finally {
                setTraining(false);
            }
        };

        // Merge historical + predicted series (+ the picked peak point, if any) into one
        // chart-friendly array keyed by period_label, sorted chronologically for the X axis.
        const chartData = (() => {
            if (!forecast) return [];
            const map = new Map();
            for (const h of forecast.historical) {
                map.set(h.period_label, { period_label: h.period_label, actual: Math.round(h.actual_value) });
            }
            for (const p of forecast.predicted) {
                const existing = map.get(p.period_label) || { period_label: p.period_label };
                existing.predicted = Math.round(p.predicted_value * 10) / 10;
                map.set(p.period_label, existing);
            }
            if (peakPoint) {
                const existing = map.get(peakPoint.period_label) || { period_label: peakPoint.period_label };
                existing.peak = Math.round(peakPoint.predicted_value * 10) / 10;
                map.set(peakPoint.period_label, existing);
            }
            return [...map.values()].sort((a, b) => a.period_label.localeCompare(b.period_label));
        })();

        return ( <
                DashboardLayout >
                <
                div className = "space-y-6" >
                <
                div className = "flex items-center justify-between flex-wrap gap-3" >
                <
                div >
                <
                h1 className = "text-2xl font-bold text-gray-800" > Reservation Forecast < /h1> <
                p className = "text-gray-500 text-sm mt-0.5" > Linear - regression predictions from historical booking data < /p> <
                /div> <
                button onClick = { handleTrain }
                disabled = { training }
                className = "flex items-center gap-2 bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-800 transition-all disabled:opacity-60" >
                <
                RefreshCw className = { `w-4 h-4 ${training ? 'animate-spin' : ''}` }
                /> {training ? 'Retraining…' : 'Retrain Model'} <
                /button> <
                /div>

                { /* KPI cards */ } <
                div className = "grid sm:grid-cols-2 lg:grid-cols-4 gap-4" > {
                    [
                        { label: 'Predicted Tomorrow', value: summary ?.predictedTomorrow ?? '—', Icon: CalendarDays, bg: 'bg-blue-500' },
                        { label: 'Predicted Next 7 Days', value: summary ?.predictedNext7Days ?? '—', Icon: TrendingUp, bg: 'bg-green-500' },
                        { label: 'Predicted Next 14 Days', value: summary ?.predictedNext14Days ?? '—', Icon: CalendarRange, bg: 'bg-purple-500' },
                        { label: 'Predicted Peak Hour', value: summary ?.peakHour ?.period_label ?? '—', Icon: Clock, bg: 'bg-yellow-500' },
                        { label: 'Trending Court', value: summary ?.trendingCourt ?.period_label ?? '—', Icon: Trophy, bg: 'bg-red-500' },
                        { label: 'Revenue Tomorrow', value: summary ? `${(summary.predictedRevenueTomorrow ?? 0).toLocaleString()} RWF` : '—', Icon: Banknote, bg: 'bg-emerald-500' },
                        { label: 'Revenue Next 7 Days', value: summary ? `${(summary.predictedRevenueNext7Days ?? 0).toLocaleString()} RWF` : '—', Icon: Wallet, bg: 'bg-teal-500' },
                        { label: 'Revenue Next 14 Days', value: summary ? `${(summary.predictedRevenueNext14Days ?? 0).toLocaleString()} RWF` : '—', Icon: Landmark, bg: 'bg-cyan-600' },
                    ].map(s => ( <
                        div key = { s.label }
                        className = "card flex items-center gap-4" >
                        <
                        div className = { `w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-white flex-shrink-0` } >
                        <
                        s.Icon className = "w-6 h-6"
                        strokeWidth = { 1.75 }
                        /> <
                        /div> <
                        div >
                        <
                        p className = "text-xs text-gray-400 uppercase font-semibold" > { s.label } < /p> <
                        p className = "text-xl font-bold text-gray-800 mt-0.5" > { s.value } < /p> <
                        /div> <
                        /div>
                    ))
                } <
                /div>

                { /* Metric tabs */ } <
                div className = "flex gap-2 flex-wrap" > {
                    METRICS.map(m => ( <
                        button key = { m.key }
                        onClick = {
                            () => setMetric(m.key) }
                        className = { `px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                metric === m.key ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }` } > { m.label } <
                        /button>
                    ))
                } <
                /div>

                { /* Admin-set filters: court, hour, forecast period */ } <
                div className = "card flex flex-wrap items-end gap-4" > {
                    hasPeriod && ( <
                        div >
                        <
                        label className = "block text-xs text-gray-500 font-medium mb-1" > Show < /label> <
                        div className = "flex rounded-lg border border-gray-200 overflow-hidden" > {
                            [
                                ['bookings', 'Bookings'],
                                ['revenue', 'Revenue (RWF)']
                            ].map(([key, label]) => ( <
                                button key = { key }
                                onClick = {
                                    () => setType(key) }
                                className = { `px-3 py-1.5 text-sm font-semibold transition-all ${
                      type === key ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }` } > { label } <
                                /button>
                            ))
                        } <
                        /div> <
                        /div>
                    )
                } {
                    showCourtFilter && ( <
                            div >
                            <
                            label className = "block text-xs text-gray-500 font-medium mb-1" > Court < /label> <
                            select value = { courtId }
                            onChange = { e => setCourtId(e.target.value) }
                            className = "input text-sm py-1.5 w-40" >
                            <
                            option value = "" > All Courts < /option> {
                                courts.map(c => < option key = { c.id }
                                    value = { c.id } > { c.name } < /option>)} <
                                    /select> <
                                    /div>
                                )
                            } {
                                showHourFilter && ( <
                                    div >
                                    <
                                    label className = "block text-xs text-gray-500 font-medium mb-1" > Hour < /label> <
                                    select value = { hour }
                                    onChange = { e => setHour(e.target.value) }
                                    className = "input text-sm py-1.5 w-32" >
                                    <
                                    option value = "" > All Hours < /option> {
                                        HOURS.map(h => < option key = { h }
                                            value = { h } > { h.toString().padStart(2, '0') }: 00 < /option>)} <
                                            /select> <
                                            /div>
                                        )
                                    } {
                                        hasPeriod && ( <
                                            div >
                                            <
                                            label className = "block text-xs text-gray-500 font-medium mb-1" > Forecast next({ activeMetric.unit }) < /label> <
                                            div className = "flex items-center gap-2" >
                                            <
                                            input type = "number"
                                            min = "1"
                                            max = "365"
                                            value = { period }
                                            onChange = { e => setPeriod(e.target.value) }
                                            className = "input w-20 text-sm py-1.5" / >
                                            <
                                            button onClick = { loadForecast }
                                            disabled = { loading }
                                            className = "btn-primary text-sm py-1.5 px-3 disabled:opacity-60" >
                                            Apply <
                                            /button> <
                                            /div> <
                                            /div>
                                        )
                                    } {
                                        (courtId || hour !== '') && ( <
                                            button onClick = {
                                                () => { setCourtId('');
                                                    setHour(''); } }
                                            className = "text-sm text-red-500 hover:underline" >
                                            Clear filters <
                                            /button>
                                        )
                                    } <
                                    /div>

                                    { /* Pick an exact date/month to see its predicted peak on the graph */ } {
                                        showPointPicker && ( <
                                            div className = "card flex flex-wrap items-end gap-4 border-2 border-dashed border-gray-200" >
                                            <
                                            div >
                                            <
                                            label className = "block text-xs text-gray-500 font-medium mb-1" > { metric === 'monthly' ? 'Pick a month' : 'Pick a date' } <
                                            /label> {
                                                metric === 'monthly' ? ( <
                                                    input type = "month"
                                                    value = { pointMonth }
                                                    onChange = { e => setPointMonth(e.target.value) }
                                                    className = "input text-sm py-1.5" / >
                                                ) : ( <
                                                    input type = "date"
                                                    value = { pointDate }
                                                    onChange = { e => setPointDate(e.target.value) }
                                                    className = "input text-sm py-1.5" / >
                                                )
                                            } <
                                            /div> <
                                            button onClick = { handleFindPeak }
                                            disabled = { findingPeak || !(metric === 'monthly' ? pointMonth : pointDate) }
                                            className = "btn-primary text-sm py-1.5 px-3 disabled:opacity-60 flex items-center gap-1.5" >
                                            <
                                            MapPin className = "w-4 h-4" / > { findingPeak ? 'Calculating…' : 'Show Peak on Graph' } <
                                            /button> {
                                                peakPoint && ( <
                                                    div className = "flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5" >
                                                    <
                                                    span className = "text-red-600 text-sm font-semibold flex items-center gap-1.5" >
                                                    <
                                                    MapPin className = "w-4 h-4" / > { peakPoint.period_label }: { fmt(peakPoint.predicted_value) }
                                                    predicted { isRevenue ? '' : 'bookings' } <
                                                    /span> <
                                                    button onClick = {
                                                        () => setPeakPoint(null) }
                                                    aria-label = "Clear peak marker"
                                                    className = "text-red-400 hover:text-red-600" >
                                                    <
                                                    X className = "w-3.5 h-3.5" / >
                                                    <
                                                    /button> <
                                                    /div>
                                                )
                                            } <
                                            /div>
                                        )
                                    }

                                    { /* Chart */ } <
                                    div className = "card" >
                                    <
                                    h2 className = "text-lg font-bold text-gray-800 mb-4" >
                                    Actual vs Predicted { isRevenue ? 'Revenue' : 'Bookings' }({ activeMetric ?.label } { courtId && showCourtFilter ? ` · ${courts.find(c => String(c.id) === String(courtId))?.name || ''}` : '' } { hour !== '' && showHourFilter ? ` · ${hour.toString().padStart(2, '0')}:00` : '' }) <
                                    /h2> {
                                        loading ? ( <
                                            div className = "h-64 bg-gray-100 rounded-xl animate-pulse" / >
                                        ) : chartData.length > 0 ? ( <
                                            ResponsiveContainer width = "100%"
                                            height = { 280 } >
                                            <
                                            ComposedChart data = { chartData } >
                                            <
                                            CartesianGrid strokeDasharray = "3 3"
                                            stroke = "#f0f0f0" / >
                                            <
                                            XAxis dataKey = "period_label"
                                            tick = {
                                                { fontSize: 11 } }
                                            /> <
                                            YAxis allowDecimals = { isRevenue }
                                            tick = {
                                                { fontSize: 11 } }
                                            /> <
                                            Tooltip formatter = { v => isRevenue ? `${Number(v).toLocaleString()} RWF` : v }
                                            /> <
                                            Legend / >
                                            <
                                            Line type = "monotone"
                                            dataKey = "actual"
                                            name = "Actual"
                                            stroke = { COLORS[0] }
                                            strokeWidth = { 2 }
                                            dot = {
                                                { r: 3 } }
                                            connectNulls / >
                                            <
                                            Line type = "monotone"
                                            dataKey = "predicted"
                                            name = "Predicted"
                                            stroke = { COLORS[2] }
                                            strokeWidth = { 2 }
                                            strokeDasharray = "5 5"
                                            dot = {
                                                { r: 3 } }
                                            connectNulls / > { peakPoint && < Scatter dataKey = "peak"
                                                name = "Selected Peak"
                                                fill = { DANGER_HEX }
                                                shape = "star"
                                                legendType = "star" / > } <
                                            /ComposedChart> <
                                            /ResponsiveContainer>
                                        ) : ( <
                                            p className = "text-gray-400 text-center py-10" > No data
                                            for this selection < /p>
                                        )
                                    } <
                                    /div>

                                    { /* Forecast table */ } <
                                    div className = "card" >
                                    <
                                    h2 className = "text-lg font-bold text-gray-800 mb-4" > { isRevenue ? 'Forecasted Revenue' : 'Forecasted Reservations' } < /h2> {
                                        forecast ?.predicted ?.length > 0 ? ( <
                                            div className = "overflow-x-auto rounded-xl border border-gray-200" >
                                            <
                                            table className = "w-full text-sm" >
                                            <
                                            thead className = "bg-gray-50" >
                                            <
                                            tr > {
                                                ['Period', 'Predicted Value'].map(h => ( <
                                                    th key = { h }
                                                    className = "px-4 py-3 text-left font-semibold text-gray-600" > { h } < /th>
                                                ))
                                            } <
                                            /tr> <
                                            /thead> <
                                            tbody className = "divide-y divide-gray-100" > {
                                                forecast.predicted.map((p, i) => ( <
                                                    tr key = { i }
                                                    className = "hover:bg-gray-50" >
                                                    <
                                                    td className = "px-4 py-3 font-medium" > { p.period_label } < /td> <
                                                    td className = "px-4 py-3" > {
                                                        metric === 'court_utilization' ?
                                                        `${p.predicted_value.toFixed(1)}%` :
                                                            fmt(p.predicted_value)
                                                    } <
                                                    /td> <
                                                    /tr>
                                                ))
                                            } <
                                            /tbody> <
                                            /table> <
                                            /div>
                                        ) : ( <
                                            p className = "text-gray-400 text-center py-10" > No forecast rows yet < /p>
                                        )
                                    } <
                                    /div> <
                                    /div> <
                                    /DashboardLayout>
                                );
                            };

                            export default Prediction;