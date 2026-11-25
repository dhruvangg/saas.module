import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Factory, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // In dev mode, sends mock credential; if real Google Client ID is configured, real token can be provided
      await loginWithGoogle('dev-mock-google-token');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillQuickAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-xl shadow-sky-600/30">
            <Factory className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          MES Enterprise Platform
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Sign in to access your shopfloor dashboard and microservices
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@boilerplate.com"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign In with Credentials
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                loading={googleLoading}
                onClick={handleDevGoogleLogin}
                className="w-full flex items-center justify-center gap-2 border border-slate-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-xs font-semibold text-slate-500 mb-2">
              Instant Demo Accounts:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@boilerplate.com', 'Admin@123456')}
                className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium px-2.5 py-1 rounded-md border border-sky-200"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('operator@boilerplate.com', 'Operator@123456')}
                className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium px-2.5 py-1 rounded-md border border-slate-200"
              >
                Operator (Restricted)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
