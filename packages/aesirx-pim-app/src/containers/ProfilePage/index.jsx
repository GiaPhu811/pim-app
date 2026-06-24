/*
 * Local PIM Profile page backed by the new express-backend:
 *   GET    /api/v1/auth/me                 — load current member (member is root; email/status supplemented from users)
 *   PATCH  /api/v1/auth/me                 — update display_name / phone / department / title / name / email / published
 *   POST   /api/v1/auth/change-password    — change own password (revokes sessions)
 * Response shape: { member, organisation, organisations } — `member` is the
 * reditem_member doc with `email` and `status` synced from JoomlaUser.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { AUTHORIZATION_KEY, Storage, env } from 'aesirx-lib';
import { notify } from 'aesirx-uikit';

const API_BASE =
  (typeof env !== 'undefined' && env.REACT_APP_ENDPOINT_URL) ||
  process.env.REACT_APP_ENDPOINT_URL ||
  'http://localhost:3001';

const authHeader = () => {
  const stored = Storage.getItem(AUTHORIZATION_KEY.AUTHORIZED_TOKEN_HEADER);
  if (stored) return stored;
  const token = Storage.getItem(AUTHORIZATION_KEY.ACCESS_TOKEN);
  return token ? `Bearer ${token}` : '';
};

const clearSessionAndRedirect = () => {
  Storage.removeItem(AUTHORIZATION_KEY.ACCESS_TOKEN);
  Storage.removeItem(AUTHORIZATION_KEY.AUTHORIZED_TOKEN_HEADER);
  Storage.removeItem(AUTHORIZATION_KEY.REFRESH_TOKEN);
  Storage.removeItem(AUTHORIZATION_KEY.TOKEN_TYPE);
  Storage.removeItem(AUTHORIZATION_KEY.JWT);
  Storage.removeItem('auth');
  window.location.assign('/login');
};

const emptyProfile = {
  email: '',
  name: '',
  display_name: '',
  phone: '',
  department: '',
  title: '',
};

const ProfilePage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [errorMsg, setErrorMsg] = useState('');

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          headers: { Authorization: authHeader() },
          credentials: 'include',
        });
        if (res.status === 401) {
          clearSessionAndRedirect();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(data?.message || 'Failed to load profile');
          return;
        }
        if (cancelled) return;
        const m = data?.member ?? {};
        setProfile({
          email: m.email ?? '',
          name: m.name ?? '',
          display_name: m.display_name ?? '',
          phone: m.phone ?? '',
          department: m.department ?? '',
          title: m.title ?? '',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('load profile failed', err);
        if (!cancelled) setErrorMsg('Unable to reach the authentication server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({
          display_name: profile.display_name || undefined,
          phone: profile.phone || null,
          department: profile.department || null,
          title: profile.title || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearSessionAndRedirect();
        return;
      }
      if (!res.ok) {
        const msg = data?.message || t('txt_update') || 'Update failed';
        notify(msg, 'error');
        setErrorMsg(msg);
        return;
      }
      // Keep Storage in sync so the header/initials stay current.
      const u = data?.data ?? {};
      if (u.name || u.display_name || u.email) {
        Storage.setItem(
          AUTHORIZATION_KEY.MEMBER_FULL_NAME,
          u.display_name || u.name || u.email || '',
        );
      }
      notify(t('txt_profile_updated') || 'Profile updated', 'success');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('update profile failed', err);
      setErrorMsg('Unable to reach the authentication server');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (!pwd.current_password || !pwd.new_password) {
      setPwdError(t('txt_password_required') || 'Current and new password are required');
      return;
    }
    if (pwd.new_password !== pwd.confirm_password) {
      setPwdError(t('txt_password_mismatch') || 'New password and confirmation do not match');
      return;
    }
    setChangingPwd(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({
          current_password: pwd.current_password,
          new_password: pwd.new_password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || t('txt_password_change_failed') || 'Password change failed';
        notify(msg, 'error');
        setPwdError(msg);
        return;
      }
      notify(t('txt_password_changed') || 'Password changed, please sign in again', 'success');
      // BE revoked all sessions — drop local creds and bounce to /login.
      clearSessionAndRedirect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('change password failed', err);
      setPwdError('Unable to reach the authentication server');
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h3 className="mb-4">{t('txt_profile') || 'Profile'}</h3>

      {errorMsg && (
        <Alert variant="danger" className="py-2">
          {errorMsg}
        </Alert>
      )}

      <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
        <h5 className="mb-3">{t('txt_account_info') || 'Account information'}</h5>
        <Form onSubmit={onSave} noValidate>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_email') || 'Email'}</Form.Label>
                <Form.Control type="email" value={profile.email} disabled readOnly />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_full_name') || 'Full name'}</Form.Label>
                <Form.Control type="text" value={profile.name} disabled readOnly />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_display_name') || 'Display name'}</Form.Label>
                <Form.Control
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  disabled={saving}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_phone') || 'Phone'}</Form.Label>
                <Form.Control
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  disabled={saving}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end">
            <Button type="submit" variant="success" disabled={saving} className="fw-semibold">
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('txt_saving') || 'Saving...'}
                </>
              ) : (
                t('txt_save') || 'Save'
              )}
            </Button>
          </div>
        </Form>
      </div>

      <div className="bg-white rounded-3 shadow-sm p-4">
        <h5 className="mb-3">{t('txt_change_password') || 'Change password'}</h5>
        {pwdError && (
          <Alert variant="danger" className="py-2">
            {pwdError}
          </Alert>
        )}
        <Form onSubmit={onChangePassword} noValidate>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_current_password') || 'Current Password'}</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="current-password"
                  value={pwd.current_password}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, current_password: e.target.value }))
                  }
                  disabled={changingPwd}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_new_password') || 'New Password'}</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={pwd.new_password}
                  onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
                  disabled={changingPwd}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>{t('txt_confirm_password') || 'Confirm New Password'}</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={pwd.confirm_password}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, confirm_password: e.target.value }))
                  }
                  disabled={changingPwd}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end">
            <Button
              type="submit"
              variant="primary"
              disabled={
                changingPwd ||
                !pwd.current_password ||
                !pwd.new_password ||
                !pwd.confirm_password
              }
              className="fw-semibold"
            >
              {changingPwd ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('txt_saving') || 'Saving...'}
                </>
              ) : (
                t('txt_update') || 'Update'
              )}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export { ProfilePage };
export default ProfilePage;
