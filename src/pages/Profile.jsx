import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { User, Lock, ShieldCheck, ShieldOff, X } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.forcePasswordTab ? 'password' : 'info');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [totpEnabled, setTotpEnabled] = useState(user?.totpEnabled || false);
  const [setup, setSetup] = useState(null); // { secret, qrDataUrl }
  const [setupCode, setSetupCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [twoFABusy, setTwoFABusy] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setProfile({ name: r.data.name, email: r.data.email, phone: r.data.phone || '' });
      setTotpEnabled(r.data.totp_enabled);
    }).catch(() => toast.error('Could not load profile')).finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', { name: profile.name, phone: profile.phone });
      localStorage.setItem('token', data.token);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async e => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm)
      return toast.error('New passwords do not match');
    setSaving(true);
    try {
      const { data } = await api.put('/auth/password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      localStorage.setItem('token', data.token);
      updateUser(data.user);
      toast.success('Password changed successfully!');
      setPasswords({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const startTwoFASetup = async () => {
    setTwoFABusy(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSetup(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start 2FA setup');
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirmTwoFASetup = async e => {
    e.preventDefault();
    setTwoFABusy(true);
    try {
      await api.post('/auth/2fa/verify-setup', { code: setupCode });
      toast.success('Two-factor authentication enabled!');
      setTotpEnabled(true);
      updateUser({ totpEnabled: true });
      setSetup(null);
      setSetupCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setTwoFABusy(false);
    }
  };

  const disableTwoFA = async e => {
    e.preventDefault();
    setTwoFABusy(true);
    try {
      await api.post('/auth/2fa/disable', { password: disablePassword });
      toast.success('Two-factor authentication disabled');
      setTotpEnabled(false);
      updateUser({ totpEnabled: false });
      setShowDisable(false);
      setDisablePassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setTwoFABusy(false);
    }
  };

  const TABS = [
    { key: 'info', label: 'Personal Info', Icon: User },
    { key: 'password', label: 'Change Password', Icon: Lock },
    { key: 'security', label: 'Two-Factor Auth', Icon: ShieldCheck },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your personal information and security</p>
        </div>

        {user?.mustChangePassword && tab !== 'password' && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            You're using a temporary password. Please set a new one in the "Change Password" tab.
          </div>
        )}

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-700 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{user?.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === t.key
                  ? 'border-brand-700 text-brand-700 dark:border-brand-300 dark:text-brand-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}>
              <t.Icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Personal Info */}
        {tab === 'info' && (
          <form onSubmit={handleProfileSave} className="card space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Personal Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input type="text" required value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="input"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <input type="email" value={profile.email} disabled
                className="input bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed"/>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
              <input type="tel" value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                className="input" placeholder="+250 7xx xxx xxx"/>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Change Password */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordChange} className="card space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Change Password</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
              <input type="password" required value={passwords.current_password}
                onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                className="input" placeholder="Enter current password"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
              <input type="password" required value={passwords.new_password}
                onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                className="input" placeholder="Min. 6 characters"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
              <input type="password" required value={passwords.confirm}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                className="input" placeholder="Repeat new password"/>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Password requirements:</strong> minimum 6 characters. Changing your password signs you out on all other devices.
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}

        {/* Two-Factor Auth */}
        {tab === 'security' && (
          <div className="card space-y-5 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Two-Factor Authentication</h2>

            {totpEnabled ? (
              <>
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">2FA is enabled</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Your account requires an authenticator code at login.</p>
                  </div>
                </div>

                {!showDisable ? (
                  <button onClick={() => setShowDisable(true)} className="btn-outline text-red-600 border-red-300 hover:bg-red-600 hover:border-red-600">
                    Disable 2FA
                  </button>
                ) : (
                  <form onSubmit={disableTwoFA} className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm your password to disable 2FA</label>
                    <input type="password" required value={disablePassword}
                      onChange={e => setDisablePassword(e.target.value)} className="input" placeholder="Your password"/>
                    <div className="flex gap-3">
                      <button type="submit" disabled={twoFABusy} className="btn-primary bg-red-600 border-red-600 hover:bg-red-700">
                        {twoFABusy ? 'Disabling...' : 'Confirm Disable'}
                      </button>
                      <button type="button" onClick={() => setShowDisable(false)} className="btn-outline">Cancel</button>
                    </div>
                  </form>
                )}
              </>
            ) : setup ? (
              <form onSubmit={confirmTwoFASetup} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Scan this QR code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code it shows.
                </p>
                <img src={setup.qrDataUrl} alt="2FA QR code" className="mx-auto border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white" />
                <p className="text-xs text-gray-400 text-center break-all">
                  Can't scan? Enter this key manually: <span className="font-mono">{setup.secret}</span>
                </p>
                <input
                  type="text" inputMode="numeric" maxLength={6} required autoFocus
                  value={setupCode} onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  className="input text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000"
                />
                <div className="flex gap-3">
                  <button type="submit" disabled={twoFABusy || setupCode.length !== 6} className="btn-primary flex-1">
                    {twoFABusy ? 'Verifying...' : 'Enable 2FA'}
                  </button>
                  <button type="button" onClick={() => { setSetup(null); setSetupCode(''); }} className="btn-outline">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <ShieldOff className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-200">2FA is not enabled</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an authenticator app for an extra layer of security at login.</p>
                  </div>
                </div>
                <button onClick={startTwoFASetup} disabled={twoFABusy} className="btn-primary">
                  {twoFABusy ? 'Starting...' : 'Set Up 2FA'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
