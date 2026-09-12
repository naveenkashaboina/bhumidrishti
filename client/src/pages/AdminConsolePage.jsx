import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sliders,
  Users,
  Key,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Plus,
  Copy,
  Lock,
  History,
} from 'lucide-react';

import { adminApi, usersApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AdminConsolePage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const [activeTab, setActiveTab] = useState('thresholds'); // thresholds | users | apikeys | audit
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Config state
  const [overallThreshold, setOverallThreshold] = useState(80);
  const [fieldThreshold, setFieldThreshold] = useState(60);
  const [autoValidation, setAutoValidation] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);

  // API Clients state
  const [apiClients, setApiClients] = useState([]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cfgRes, usrRes, apiRes, audRes] = await Promise.all([
        adminApi.getConfig(),
        usersApi.getUsers(),
        adminApi.getApiClients(),
        adminApi.getAuditLogs({ limit: 20 }),
      ]);

      if (cfgRes.success && cfgRes.data) {
        const overall = cfgRes.data.find((c) => c.key === 'confidenceThresholdOverall');
        const field = cfgRes.data.find((c) => c.key === 'confidenceThresholdField');
        const auto = cfgRes.data.find((c) => c.key === 'autoValidationAllowed');
        if (overall) setOverallThreshold(overall.value);
        if (field) setFieldThreshold(field.value);
        if (auto) setAutoValidation(auto.value);
      }

      if (usrRes.success && usrRes.data) setUsers(usrRes.data);
      if (apiRes.success && apiRes.data) setApiClients(apiRes.data);
      if (audRes.success && audRes.data) setAuditLogs(audRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveThresholds = async () => {
    try {
      await adminApi.updateConfig({
        key: 'confidenceThresholdOverall',
        value: Number(overallThreshold),
      });
      await adminApi.updateConfig({
        key: 'confidenceThresholdField',
        value: Number(fieldThreshold),
      });
      await adminApi.updateConfig({
        key: 'autoValidationAllowed',
        value: autoValidation,
      });
      setSaveSuccess('System threshold configurations updated successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newClientName) return;

    try {
      const res = await adminApi.createApiClient({
        clientName: newClientName,
        scopes: ['read:records', 'read:dashboard', 'read:gis'],
      });
      if (res.success && res.data) {
        setGeneratedKey(res.data.rawApiKey || res.data.apiKey);
        setNewClientName('');
        fetchData();
      }
    } catch (err) {
      alert(`Key creation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-paper-line pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-register-600">
            <Shield size={16} />
            <span>Executive Governance & System Control</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">
            {isHi ? 'प्रशासनिक नियंत्रण कक्ष' : 'System Administration Console'}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Configure dynamic confidence thresholds, manage officer jurisdictions, external API keys, and audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded border border-paper-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Reload Console</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-paper-line gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('thresholds')}
          className={`flex items-center gap-1.5 border-b-2 pb-3 transition-colors ${
            activeTab === 'thresholds'
              ? 'border-register-700 text-register-800'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Sliders size={14} />
          <span>Confidence Thresholds</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 border-b-2 pb-3 transition-colors ${
            activeTab === 'users'
              ? 'border-register-700 text-register-800'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Users size={14} />
          <span>Officer Directory ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-1.5 border-b-2 pb-3 transition-colors ${
            activeTab === 'apikeys'
              ? 'border-register-700 text-register-800'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Key size={14} />
          <span>External API Clients ({apiClients.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 border-b-2 pb-3 transition-colors ${
            activeTab === 'audit'
              ? 'border-register-700 text-register-800'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <History size={14} />
          <span>System Audit Log</span>
        </button>
      </div>

      {/* Tab 1: Confidence Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="max-w-2xl rounded-md border border-paper-line bg-white p-6 shadow-card space-y-6">
          <div>
            <h2 className="font-serif text-base font-bold text-ink">
              Dynamic AI Extraction Thresholds
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Records with extraction confidence below these thresholds are automatically diverted to local revenue officers (Patwari/Tehsildar) for verification.
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Overall Record Confidence Threshold:</span>
                <span className="font-mono text-register-700 font-bold">{overallThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={overallThreshold}
                onChange={(e) => setOverallThreshold(e.target.value)}
                className="mt-2 w-full accent-register-700"
              />
              <span className="text-[11px] text-ink-faint">
                Recommended: 80%. Records with overall confidence &lt; {overallThreshold}% require human approval.
              </span>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Individual Field Confidence Threshold:</span>
                <span className="font-mono text-register-700 font-bold">{fieldThreshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="90"
                value={fieldThreshold}
                onChange={(e) => setFieldThreshold(e.target.value)}
                className="mt-2 w-full accent-register-700"
              />
              <span className="text-[11px] text-ink-faint">
                Recommended: 60%. Any individual field (Khasra, Area, Owner) &lt; {fieldThreshold}% will be flagged with yellow warning borders.
              </span>
            </div>

            <div className="border-t border-paper-line pt-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">Permit Straight-Through Auto-Validation</p>
                <p className="text-xs text-ink-soft">
                  Allow records exceeding 95% confidence to publish without manual revenue officer sign-off.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoValidation}
                onChange={(e) => setAutoValidation(e.target.checked)}
                className="h-4 w-4 rounded accent-register-700"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveThresholds}
              className="flex items-center gap-1.5 rounded bg-register-800 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-register-900"
            >
              <Save size={13} />
              Save Dynamic Configuration
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Users Directory */}
      {activeTab === 'users' && (
        <div className="overflow-hidden rounded-md border border-paper-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-paper-line bg-paper text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Officer Name</th>
                  <th className="px-4 py-3 font-semibold">Official Email</th>
                  <th className="px-4 py-3 font-semibold">System Role</th>
                  <th className="px-4 py-3 font-semibold">Assigned Jurisdiction</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {users.map((usr) => (
                  <tr key={usr._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-ink">{usr.name}</td>
                    <td className="px-4 py-3 font-mono text-ink-soft">{usr.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-register-50 px-2 py-0.5 text-[11px] font-mono font-medium text-register-800">
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {usr.jurisdiction?.district || 'All Regions'}
                      {usr.jurisdiction?.tehsil ? ` / ${usr.jurisdiction.tehsil}` : ''}
                      {usr.jurisdiction?.village ? ` / ${usr.jurisdiction.village}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: External API Keys */}
      {activeTab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-ink-soft">
              Active API keys providing authorized DILRMP/LRMS consumers machine-to-machine data exchange with automated PII masking.
            </p>
            <button
              type="button"
              onClick={() => setNewKeyModal(true)}
              className="flex items-center gap-1.5 rounded bg-register-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-register-800"
            >
              <Plus size={13} />
              Generate Integration Key
            </button>
          </div>

          <div className="overflow-hidden rounded-md border border-paper-line bg-white shadow-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-paper-line bg-paper text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client / Consumer Name</th>
                  <th className="px-4 py-3 font-semibold">Authorized Scopes</th>
                  <th className="px-4 py-3 font-semibold">Allowed Regions</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {apiClients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-ink">
                      <div>{client.clientName}</div>
                      <div className="font-mono text-[10px] text-ink-faint">ID: {client._id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(client.scopes || []).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {client.allowedRegions?.join(', ') || 'All Regions'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 font-semibold text-[10px]">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key Generator Modal */}
          {newKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-md bg-white p-6 shadow-xl text-xs">
                <h3 className="font-serif text-base font-bold text-ink">
                  Provision New External API Key
                </h3>

                {generatedKey ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
                      <p className="font-semibold">Key Generated Successfully!</p>
                      <p className="text-[11px] mt-0.5">
                        Please copy this key now. It cannot be displayed again.
                      </p>
                      <div className="mt-2 flex items-center justify-between rounded bg-white p-2 font-mono text-xs border border-emerald-200">
                        <span className="truncate pr-2">{generatedKey}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(generatedKey)}
                          className="text-emerald-700 hover:text-emerald-900 flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedKey(null);
                        setNewKeyModal(false);
                      }}
                      className="w-full rounded bg-register-700 py-1.5 font-semibold text-white"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateApiKey} className="mt-4 space-y-3">
                    <div>
                      <label className="font-semibold text-ink-soft">Consumer Organization / Name</label>
                      <input
                        type="text"
                        required
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="e.g. State LRMS Bridge Service"
                        className="mt-1 w-full rounded border border-paper-line p-2 text-ink focus:border-register-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewKeyModal(false)}
                        className="rounded border border-paper-line px-3 py-1.5 text-ink hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded bg-register-700 px-3.5 py-1.5 font-semibold text-white hover:bg-register-800"
                      >
                        Generate Key
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: System Audit Log */}
      {activeTab === 'audit' && (
        <div className="overflow-hidden rounded-md border border-paper-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-paper-line bg-paper text-xs uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity Type</th>
                  <th className="px-4 py-3 font-semibold">Actor / Officer</th>
                  <th className="px-4 py-3 font-semibold">IP Address</th>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-register-800">{log.action}</td>
                    <td className="px-4 py-3 font-medium text-ink capitalize">{log.entityType}</td>
                    <td className="px-4 py-3 text-ink">
                      {log.performedBy?.name || 'System Auto-Engine'} ({log.performedBy?.role || 'SYSTEM'})
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-faint">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
