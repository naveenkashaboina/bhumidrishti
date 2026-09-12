import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Landmark, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supportedLanguages } from '../i18n';
import { ROLES } from '../utils/roles';

const NAV_ITEMS = [
  { to: '/deo-dashboard', labelKey: 'nav.deoDashboard', roles: [ROLES.DEO, ROLES.SUPER_ADMIN] },
  {
    to: '/bulk-upload',
    labelKey: 'nav.bulkUpload',
    roles: [ROLES.DEO, ROLES.DISTRICT_OFFICER, ROLES.SUPER_ADMIN],
  },
  {
    to: '/verification-workspace',
    labelKey: 'nav.verification',
    roles: [ROLES.VERIFIER, ROLES.DISTRICT_OFFICER, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN],
  },
  { to: '/records', labelKey: 'nav.records', roles: null },
  { to: '/gis-map', labelKey: 'nav.gisMap', roles: null },
  { to: '/analytics', labelKey: 'nav.analytics', roles: null },
  { to: '/admin', labelKey: 'nav.admin', roles: [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN] },
];

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => isAuthenticated && (!item.roles || item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans text-ink">
      <header className="flex items-center justify-between border-b border-paper-line bg-register-800 px-6 py-3 text-white">
        <Link to={isAuthenticated ? '/' : '/login'} className="flex items-center gap-2">
          <Landmark size={20} strokeWidth={1.75} />
          <span className="font-serif text-lg">
            {t('app.name')} <span className="text-sm text-register-200">(भूमिदृष्टि)</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-register-100 md:flex">
          {visibleNavItems.map((item) => (
            <Link key={item.to} to={item.to} className="transition-colors hover:text-white">
              {t(item.labelKey)}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link to="/citizen-lookup" className="transition-colors hover:text-white">
              {t('nav.citizenLookup')}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 rounded border border-register-600 px-1.5 py-1 text-xs sm:flex">
            <Globe size={13} strokeWidth={1.75} className="text-register-200" />
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`rounded px-1.5 py-0.5 ${
                  i18n.resolvedLanguage === lang.code
                    ? 'bg-white text-register-800'
                    : 'text-register-200 hover:text-white'
                }`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>

          {isAuthenticated && (
            <>
              <div className="hidden text-right text-xs leading-tight sm:block">
                <div className="text-white">{user.name}</div>
                <div className="text-register-200">{t(`roles.${user.role}`)}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded border border-register-600 px-2.5 py-1.5 text-sm text-register-100 transition-colors hover:border-register-400 hover:text-white"
              >
                <LogOut size={14} strokeWidth={1.75} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-paper-line px-6 py-3 text-center text-xs text-ink-faint">
        {t('app.ministry')} — SIH Problem Statement 26018
      </footer>
    </div>
  );
}
