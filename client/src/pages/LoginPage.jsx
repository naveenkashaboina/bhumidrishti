import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, Lock, Mail, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleHomePath, ROLES } from '../utils/roles';
import { supportedLanguages } from '../i18n';

// Seeded demo accounts (see server README) — shown only as a convenience
// picker for the SIH panel; a real deployment would remove this entirely.
const DEMO_ACCOUNTS = [
  { role: ROLES.SUPER_ADMIN, email: 'admin@bhumidrishti.gov.in', password: 'Admin@123' },
  { role: ROLES.STATE_ADMIN, email: 'stateadmin@bhumidrishti.gov.in', password: 'StateAdmin@123' },
  { role: ROLES.DISTRICT_OFFICER, email: 'district.pune@bhumidrishti.gov.in', password: 'District@123' },
  { role: ROLES.VERIFIER, email: 'verifier.pune@bhumidrishti.gov.in', password: 'Verifier@123' },
  { role: ROLES.DEO, email: 'deo.pune@bhumidrishti.gov.in', password: 'Deo@123' },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      const redirectTo = location.state?.from?.pathname || roleHomePath(loggedInUser.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err?.message?.toLowerCase().includes('network')) {
        setErrorMessage(t('login.networkError'));
      } else {
        setErrorMessage(err?.message || t('login.invalid'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage('');
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 lg:grid-cols-5">
      {/* Left — institutional identity panel */}
      <div className="relative hidden overflow-hidden bg-register-800 px-12 py-16 text-paper lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
        <RuledBackdrop />
        <div className="relative">
          <div className="flex items-center gap-2.5 text-register-100">
            <Landmark size={22} strokeWidth={1.75} />
            <span className="font-mono text-xs tracking-wide text-register-200">
              {t('app.ministry')}
            </span>
          </div>
          <h1 className="mt-10 font-serif text-4xl leading-tight text-white">
            {t('app.name')}
          </h1>
          <p className="mt-4 max-w-sm text-register-100">{t('app.tagline')}</p>
        </div>
        <div className="relative max-w-sm border-t border-register-600 pt-6 text-sm text-register-200">
          {t('login.subheading')}
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-3 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <h1 className="font-serif text-2xl text-register-800">{t('app.name')}</h1>
          </div>

          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-ink">{t('login.heading')}</h2>
              <p className="mt-1 text-sm text-ink-soft lg:hidden">{t('login.subheading')}</p>
            </div>
            <LanguageToggle i18n={i18n} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                {t('login.emailLabel')}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-paper-line bg-paper-raised py-2.5 pl-9 pr-3 text-ink placeholder:text-ink-faint focus:border-register-500"
                  placeholder="name@bhumidrishti.gov.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-paper-line bg-paper-raised py-2.5 pl-9 pr-3 text-ink placeholder:text-ink-faint focus:border-register-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded border border-field-red/30 bg-field-redBg px-3 py-2 text-sm text-field-red">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded bg-saffron-500 py-2.5 font-medium text-white transition-colors hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t('login.signingIn') : t('login.submit')}
            </button>
          </form>

          <div className="mt-10 border-t border-paper-line pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t('login.demoHeading')}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{t('login.demoHint')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="rounded border border-paper-line bg-paper-raised px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-register-400 hover:text-register-700"
                >
                  {t(`roles.${account.role}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguageToggle({ i18n }) {
  return (
    <div className="flex items-center gap-1 rounded border border-paper-line bg-paper-raised p-1 text-sm">
      <Globe size={14} strokeWidth={1.75} className="ml-1 text-ink-faint" />
      {supportedLanguages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`rounded px-2 py-1 transition-colors ${
            i18n.resolvedLanguage === lang.code
              ? 'bg-register-700 text-white'
              : 'text-ink-soft hover:bg-paper'
          }`}
        >
          {lang.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// Subtle ruled-paper pattern for the identity panel — a nod to the ledger
// register this product digitizes, not decorative gradient noise.
function RuledBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
    >
      <defs>
        <pattern id="ruled" width="100%" height="34" patternUnits="userSpaceOnUse">
          <line x1="0" y1="33.5" x2="100%" y2="33.5" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ruled)" />
    </svg>
  );
}
