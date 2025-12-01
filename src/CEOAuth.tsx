import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, SparklesIcon, KeyIcon } from '@heroicons/react/24/outline';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

interface CEOAuthProps {
  onAuthenticated: () => void;
}

/**
 * CEO Authentication Component with TOTP
 *
 * Security Features:
 * - Exact credential matching
 * - TOTP (Time-based One-Time Password) 2FA
 * - QR code shown only on first setup
 * - Session persistence
 */
const CEOAuth: React.FC<CEOAuthProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'totp' | 'qr-setup'>('credentials');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');

  // CEO Credentials - EXACT MATCH REQUIRED
  const CEO_CREDENTIALS = {
    username: '19780111',
    password: 'papakoEddie@tripzy.international'
  };

  // Check for existing CEO session on mount
  useEffect(() => {
    const isCEOAuthenticated = localStorage.getItem('flowsphere_ceo_auth');
    if (isCEOAuthenticated === 'true') {
      onAuthenticated();
    }
  }, [onAuthenticated]);

  // Generate or retrieve TOTP secret
  useEffect(() => {
    const storedSecret = localStorage.getItem('flowsphere_ceo_totp_secret');
    if (storedSecret) {
      setTotpSecret(storedSecret);
    } else {
      // Generate new secret for first-time setup
      const newSecret = new OTPAuth.Secret({ size: 20 });
      setTotpSecret(newSecret.base32);
    }
  }, []);

  // Generate QR code when needed
  const generateQRCode = async (secret: string) => {
    const totp = new OTPAuth.TOTP({
      issuer: 'FlowSphere CEO',
      label: 'CEO Portal',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    });

    const otpauthUrl = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    setQrCodeDataUrl(qrDataUrl);
  };

  const validateCredentials = () => {
    // EXACT match required
    return username === CEO_CREDENTIALS.username && password === CEO_CREDENTIALS.password;
  };

  const validateTOTP = (code: string, secret: string): boolean => {
    try {
      // STRICT validation - code must be exactly 6 digits
      if (!code || code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
        console.log('TOTP Validation FAILED: Invalid format');
        return false;
      }

      const totp = new OTPAuth.TOTP({
        issuer: 'FlowSphere CEO',
        label: 'CEO Portal',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      // Use the library's validate method with a time window
      // This checks current time +/- 1 period (30 seconds)
      const delta = totp.validate({
        token: code.trim(),
        window: 1  // Allow 1 period before/after (30s window)
      });

      // delta will be a number if valid, null if invalid
      const isValid = delta !== null;

      console.log('TOTP Validation:', {
        provided: code.trim(),
        delta: delta,
        valid: isValid,
        timestamp: new Date().toISOString()
      });

      return isValid;
    } catch (error) {
      console.error('TOTP validation error:', error);
      return false;
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    if (!validateCredentials()) {
      setError('Invalid credentials. Access denied.');
      setLoading(false);
      return;
    }

    // Check if TOTP is already set up
    const isSetup = localStorage.getItem('flowsphere_ceo_totp_setup') === 'true';

    if (!isSetup) {
      // First time login - show QR code
      await generateQRCode(totpSecret);
      setStep('qr-setup');
    } else {
      // Subsequent login - go directly to TOTP entry
      setStep('totp');
    }

    setLoading(false);
  };

  const handleQRSetupComplete = () => {
    // Save secret and mark setup as complete
    localStorage.setItem('flowsphere_ceo_totp_secret', totpSecret);
    localStorage.setItem('flowsphere_ceo_totp_setup', 'true');
    setStep('totp');
  };

  const handleTOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 500));

    const secret = localStorage.getItem('flowsphere_ceo_totp_secret') || totpSecret;

    if (!validateTOTP(totpCode, secret)) {
      setError('Invalid TOTP code. Please try again.');
      setLoading(false);
      return;
    }

    // Authentication successful
    localStorage.setItem('flowsphere_ceo_auth', 'true');
    localStorage.setItem('flowsphere_ceo_login_time', new Date().toISOString());
    onAuthenticated();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 -left-4"></div>
        <div className="absolute w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 top-0 -right-4"></div>
        <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 bottom-8 left-20"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* CEO Badge */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-yellow-300 ring-opacity-50">
            <ShieldCheckIcon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white border-opacity-20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">CEO Portal</h1>
            <p className="text-purple-200 text-sm flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 mr-1" />
              Executive Command Center Access
            </p>
          </div>

          {/* STEP 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                  CEO ID
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter CEO ID"
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  CEO Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition pr-12"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-200 hover:text-white transition"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 rounded-lg p-3">
                  <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          {/* STEP 2: QR Setup (First Time Only) */}
          {step === 'qr-setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <KeyIcon className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Two-Factor Authentication Setup</h3>
                <p className="text-purple-200 text-sm">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
              </div>

              <div className="bg-white rounded-lg p-4 flex justify-center">
                {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="TOTP QR Code" className="w-48 h-48" />}
              </div>

              <div className="bg-yellow-500 bg-opacity-20 border border-yellow-400 border-opacity-30 rounded-lg p-4">
                <p className="text-yellow-100 text-xs font-medium mb-2">⚠️ Important - One-Time Setup</p>
                <p className="text-yellow-200 text-xs">
                  This QR code will only be shown ONCE. Make sure to scan it now with your authenticator app. You'll need the 6-digit code from your app for all future logins.
                </p>
              </div>

              <button
                onClick={handleQRSetupComplete}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105"
              >
                I've Scanned the QR Code
              </button>
            </div>
          )}

          {/* STEP 3: TOTP Entry */}
          {step === 'totp' && (
            <form onSubmit={handleTOTPSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <KeyIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Enter Verification Code</h3>
                <p className="text-purple-200 text-sm">Enter the 6-digit code from your authenticator app</p>
              </div>

              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-white mb-2">
                  6-Digit Code
                </label>
                <input
                  id="totp"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                  autoComplete="off"
                  disabled={loading}
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 rounded-lg p-3">
                  <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Verifying...' : 'Access CEO Dashboard'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTotpCode('');
                  setError('');
                }}
                className="w-full text-purple-200 hover:text-white text-sm transition"
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* Security Info */}
          {step === 'credentials' && (
            <div className="mt-6 p-4 bg-blue-500 bg-opacity-20 rounded-lg border border-blue-400 border-opacity-30">
              <div className="flex items-start space-x-2">
                <ShieldCheckIcon className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1">🔐 Secure CEO Access</p>
                  <p className="text-blue-200 text-xs">
                    Protected with two-factor authentication (TOTP). Only authorized CEO credentials accepted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Back to Main App */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-purple-200 hover:text-white text-sm transition inline-flex items-center"
          >
            ← Back to FlowSphere Main App
          </a>
        </div>
      </div>
    </div>
  );
};

export default CEOAuth;
