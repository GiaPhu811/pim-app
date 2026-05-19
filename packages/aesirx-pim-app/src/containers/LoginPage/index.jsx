/*
 * Local PIM Login page that talks to the new express-backend
 * (POST /api/v1/auth/login). Replaces the old aesirx-uikit LoginPage which
 * went through the Joomla SSO `option=token&api=oauth2` flow.
 *
 * Storage shape matches what AesirxAuthenticationApiService.setTokenUser
 * writes (so the rest of the app keeps reading the same AUTHORIZATION_KEY
 * entries), minus:
 *   - getTokenByUser / persona lookup (the Joomla persona endpoint was
 *     stripped from the new backend — user data comes back inline on /login)
 *   - getFacebookAdsAppAccessToken
 *   - web3 `preregistration` fetch + Storage.setItem('preregistration', ...)
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { AUTHORIZATION_KEY, Storage, env } from 'aesirx-lib';
import { notify } from 'aesirx-uikit';

const API_BASE =
  (typeof env !== 'undefined' && env.REACT_APP_ENDPOINT_URL) ||
  process.env.REACT_APP_ENDPOINT_URL ||
  'http://localhost:3001';

const storeAuthSession = (response) => {
  const tokenType = 'Bearer';
  const accessToken = response?.token ?? '';
  const refreshToken = response?.refresh_token ?? '';
  const user = response?.user ?? {};

  // Mirror the keys AesirxAuthenticationApiService.setTokenUser writes so
  // the existing isLogin() guard and any downstream readers keep working.
  Storage.setItem(AUTHORIZATION_KEY.JWT, '');
  Storage.setItem(AUTHORIZATION_KEY.ACCESS_TOKEN, accessToken);
  Storage.setItem(AUTHORIZATION_KEY.TOKEN_TYPE, tokenType);
  Storage.setItem(AUTHORIZATION_KEY.AUTHORIZED_TOKEN_HEADER, `${tokenType} ${accessToken}`);
  Storage.setItem(AUTHORIZATION_KEY.REFRESH_TOKEN, refreshToken);

  // The new /login response carries the user inline — no need to call the
  // legacy persona/getTokenByUser endpoint to recover these.
  Storage.setItem(AUTHORIZATION_KEY.MEMBER_ID, user.user_id ?? '');
  Storage.setItem(AUTHORIZATION_KEY.MEMBER_EMAIL, user.email ?? '');
  Storage.setItem(AUTHORIZATION_KEY.MEMBER_FULL_NAME, user.name ?? user.email ?? '');

  Storage.setItem('auth', true);
};

const LoginPage = ({ text = 'PIM' }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(t('txt_email_password_required') || 'Email and password are required');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        const msg =
          data?.message || t('txt_login_failed') || 'Login information is incorrect';
        notify(msg, 'error');
        setErrorMsg(msg);
        return;
      }
      storeAuthSession(data);
      window.location.reload();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('login failed', err);
      const msg = t('txt_login_failed') || 'Unable to reach the authentication server';
      notify(msg, 'error');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vh-100 bg-blue-9 login-page position-relative">
      <div className="row justify-content-center align-items-center h-100 mx-0">
        <div className="col-lg-6 col-xxl-4">
          <div className="d-block p-4 p-lg-5 bg-white rounded-3 shadow-sm">
            <p className="fs-2 fw-semibold mb-2 text-center text-blue-5">
              {t('txt_welcome_to') || 'Welcome to'} AesirX {text}
            </p>
            <p className="fs-5 fw-semibold text-center text-blue-5 mb-4">
              {t('txt_sign_in_to_get_started') || 'Sign in to get started'}
            </p>

            {errorMsg && (
              <Alert variant="danger" className="py-2">
                {errorMsg}
              </Alert>
            )}

            <Form onSubmit={onSubmit} noValidate>
              <Form.Group className="mb-3" controlId="login-email">
                <Form.Label>{t('txt_email') || 'Email'}</Form.Label>
                <Form.Control
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="login-password">
                <Form.Label>{t('txt_password') || 'Password'}</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </Form.Group>

              <Button
                type="submit"
                variant="success"
                className="w-100 fw-semibold d-flex align-items-center justify-content-center"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('txt_signing_in') || 'Signing in...'}
                  </>
                ) : (
                  t('txt_sign_in') || 'Sign in'
                )}
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LoginPage };
export default LoginPage;
