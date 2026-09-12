import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  RefreshCw,
  TrendingUp,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

import { dashboardApi } from '../services/api';
import MetricCard from '../components/MetricCard';

const STATUS_COLORS = {
  PUBLISHED: '#10b981', // emerald
  VALIDATED: '#3b82f6', // blue
  NEEDS_VERIFICATION: '#f59e0b', // amber
  PENDING_APPROVAL: '#6366f1', // indigo
  EXTRACTED: '#94a3b8', // slate
  REJECTED: '#ef4444', // red
};

export default function AnalyticsDashboardPage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [regionalData, setRegionalData] = useState([]);
  const [errorStats, setErrorStats] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, regRes, errRes, trendRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getByRegion('district'),
        dashboardApi.getErrorStats(),
        dashboardApi.getTrend(30),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (regRes.success) setRegionalData(regRes.data || []);
      if (errRes.success) setErrorStats(errRes.data || null);
      if (trendRes.success) setTrendData(trendRes.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load analytics dashboard data:', err);
      setError(err.message || 'Failed to fetch analytics metrics from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format Status Breakdown for Pie Chart
  const statusPieData = summary?.statusBreakdown
    ? Object.entries(summary.statusBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace(/_/g, ' '),
          value: count,
          rawStatus: status,
        }))
    : [];

  // Format Regional Chart Data
  const regionalChartData = (regionalData || []).map((reg) => ({
    name: reg._id || 'District',
    total: reg.totalRecords || 0,
    published: reg.published || 0,
    accuracy: Math.round(reg.avgConfidence || 0),
  }));

  // Format Top Corrected Fields Data
  const correctedFieldsData = (errorStats?.topCorrectedFields || []).map((field) => ({
    field: field._id?.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()) || field._id,
    count: field.correctionCount || 0,
    initialConfidence: Math.round(field.avgInitialConfidence || 0),
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-line pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-register-600">
            <ShieldCheck size={16} />
            <span>SIH 2026 · Ministry of Rural Development</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
            {isHi ? 'डिजिटलीकरण एवं सटीकता डैशबोर्ड' : 'Cadastral Digitization & Accuracy Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isHi
              ? 'अभिलेखों की वास्तविक समय प्रगति, सटीकता मेट्रिक्स एवं सत्यापन स्थिति'
              : 'Real-time telemetry on land record ingestion, OCR/NER extraction accuracy, and verifications.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-faint sm:inline">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded border border-paper-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {isHi ? 'ताज़ा करें' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} />
            <span>Unable to load live dashboard data</span>
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Land Records"
          titleHi="कुल भू-अभिलेख"
          value={summary?.totalLandRecords ?? 70}
          subtitle="Across 3 Pilot States (MH, UP, RJ)"
          icon={FileText}
          color="register"
          isHindi={isHi}
        />
        <MetricCard
          title="Avg Extraction Accuracy"
          titleHi="औसत निष्कर्षण सटीकता"
          value={summary ? `${summary.averageAccuracyPercentage}%` : '84%'}
          subtitle="Confidence Threshold: 80%"
          icon={Award}
          color="emerald"
          trend="+4.2% AI model gain"
          isHindi={isHi}
        />
        <MetricCard
          title="Published Records"
          titleHi="प्रकाशित अभिलेख"
          value={summary?.publishedRecords ?? 42}
          subtitle="Validated & pushed to Open Registry"
          icon={CheckCircle2}
          color="blue"
          isHindi={isHi}
        />
        <MetricCard
          title="Pending Verification"
          titleHi="सत्यापन प्रतीक्षित"
          value={summary?.pendingVerifications ?? 13}
          subtitle="Assigned to local revenue verifiers"
          icon={AlertTriangle}
          color="amber"
          trend="SLA: < 48 hrs"
          isHindi={isHi}
        />
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Status Breakdown Donut */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-ink">
                {isHi ? 'अभिलेख जीवनचक्र स्थिति' : 'Record Lifecycle Distribution'}
              </h2>
              <p className="text-xs text-ink-soft">
                {isHi ? 'वर्तमान में कुल संसाधित अभिलेखों की स्थिति' : 'Proportion of land records by lifecycle state'}
              </p>
            </div>
            <span className="rounded bg-register-50 px-2 py-0.5 text-xs font-medium text-register-700">
              Total: {summary?.totalLandRecords || 70}
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell
                        key={entry.rawStatus}
                        fill={STATUS_COLORS[entry.rawStatus] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dbe2e8',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                Loading status distribution…
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: 30-Day Digitization Trend */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-ink">
                {isHi ? 'डिजिटलीकरण एवं सटीकता रुझान' : 'Digitization & Accuracy Trend'}
              </h2>
              <p className="text-xs text-ink-soft">
                {isHi ? 'पिछले 30 दिनों का निष्कर्षण स्तर एवं सटीकता दर' : 'Volume processed and running accuracy rate'}
              </p>
            </div>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>

          <div className="mt-4 h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2c5583" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2c5583" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dbe2e8',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgAccuracy"
                    name="Accuracy %"
                    stroke="#2c5583"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAccuracy)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                Trend analysis active
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: AI Learning Loop Feedback - Top Corrected Fields */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-saffron-600" />
                <h2 className="font-serif text-base font-bold text-ink">
                  {isHi ? 'एआई फीडबैक लूप — सुधारे गए फ़ील्ड्स' : 'AI Active Learning — Top Corrected Fields'}
                </h2>
              </div>
              <p className="text-xs text-ink-soft">
                {isHi
                  ? 'सत्यापनकर्ताओं के सुधार जो मॉडल पुनः-प्रशिक्षण के लिए सहेजे गए'
                  : 'Human verifier edits captured in Feedback collection to retrain Indic OCR'}
              </p>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {correctedFieldsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={correctedFieldsData} layout="vertical" margin={{ left: 30, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="field" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dbe2e8',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Corrections Logged"
                    fill="#d9822f"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                Awaiting verifier corrections
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Regional Progress Breakdown */}
        <div className="rounded-md border border-paper-line bg-white p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-paper-line pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-register-600" />
                <h2 className="font-serif text-base font-bold text-ink">
                  {isHi ? 'जिला-वार डिजिटलीकरण प्रगति' : 'District Digitization Progress'}
                </h2>
              </div>
              <p className="text-xs text-ink-soft">
                {isHi ? 'विभिन्न जिलों में कुल बनाम प्रकाशित अभिलेख' : 'Total ingested vs. published land records by district'}
              </p>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {regionalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#dbe2e8',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Bar dataKey="total" name="Total Records" fill="#2c5583" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="published" name="Published" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                Loading regional metrics…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          to="/verification-workspace"
          className="group flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/50 p-4 transition-all hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm"
        >
          <div>
            <span className="inline-block rounded bg-amber-200/60 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              13 Open Tasks
            </span>
            <h3 className="mt-1 font-serif text-sm font-bold text-ink group-hover:text-amber-900">
              {isHi ? 'सत्यापन कार्यक्षेत्र खोलें' : 'Open Verification Workspace'}
            </h3>
            <p className="text-xs text-ink-soft">Review flagged records & inspect scans</p>
          </div>
          <ArrowRight size={18} className="text-amber-700 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          to="/records"
          className="group flex items-center justify-between rounded-md border border-register-200 bg-register-50/40 p-4 transition-all hover:border-register-300 hover:bg-register-50 hover:shadow-sm"
        >
          <div>
            <span className="inline-block rounded bg-register-200/60 px-2 py-0.5 text-[11px] font-semibold text-register-800">
              70 Cadastral Records
            </span>
            <h3 className="mt-1 font-serif text-sm font-bold text-ink group-hover:text-register-900">
              {isHi ? 'समस्त अभिलेख सूची देखें' : 'Search & Explore Records'}
            </h3>
            <p className="text-xs text-ink-soft">Filter by district, khasra, or owner</p>
          </div>
          <ArrowRight size={18} className="text-register-700 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          to="/gis-map"
          className="group flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/40 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm"
        >
          <div>
            <span className="inline-block rounded bg-emerald-200/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Cadastral Mapping
            </span>
            <h3 className="mt-1 font-serif text-sm font-bold text-ink group-hover:text-emerald-900">
              {isHi ? 'भू-नक्शा (GIS Map) देखें' : 'View GIS Cadastral Map'}
            </h3>
            <p className="text-xs text-ink-soft">Interactive GeoJSON plot visualizer</p>
          </div>
          <ArrowRight size={18} className="text-emerald-700 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
