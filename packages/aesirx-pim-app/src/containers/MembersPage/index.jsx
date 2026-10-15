import React, { useEffect, useRef, useState } from 'react';
import { MembersPage as SharedMembersPage } from 'aesirx-uikit';
import { AUTHORIZATION_KEY, Storage, env } from 'aesirx-lib';
import { Alert, Badge, Button, Form, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCopy, faKey, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

const base =
  env.REACT_APP_ENDPOINT_URL || process.env.REACT_APP_ENDPOINT_URL || 'http://localhost:3001';

async function request(method = 'GET', status, operation) {
  const authorization =
    Storage.getItem(AUTHORIZATION_KEY.AUTHORIZED_TOKEN_HEADER) ||
    `Bearer ${Storage.getItem(AUTHORIZATION_KEY.ACCESS_TOKEN) || ''}`;
  const response = await fetch(
    `${base}/api/v1/auth/long-term-token${operation === 'regenerate' ? '/regenerate' : ''}`,
    {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Authorization: authorization,
        ...(method !== 'GET'
          ? { 'Content-Type': 'application/json', 'X-CSRF-Token': status.csrf_token }
          : {}),
      },
      ...(method !== 'GET' ? { body: JSON.stringify({ revision: status.revision }) } : {}),
    }
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data?.error?.message || data?.message || `Request failed (${response.status})`);
  return data;
}

export default function MembersPage() {
  const [status, setStatus] = useState(null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const mounted = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    request()
      .then((data) => {
        if (mounted.current) setStatus(data);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message);
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });
    const hide = () => {
      if (document.hidden) {
        setSecret('');
        setCopied(false);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  useEffect(() => {
    if (!secret) return undefined;
    const timeout = setTimeout(() => {
      setSecret('');
      setCopied(false);
    }, 60000);
    return () => clearTimeout(timeout);
  }, [secret]);

  const mutate = async (operation) => {
    if (inFlight.current) return;
    if (
      operation !== 'create' &&
      !window.confirm('This permanently invalidates the previous token. Continue?')
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setSecret('');
    setCopied(false);
    try {
      const result = await request(operation === 'revoke' ? 'DELETE' : 'POST', status, operation);
      if (mounted.current) {
        setSecret(result.token || '');
        setStatus((previous) => ({
          ...previous,
          revision: result.revision,
          active: operation !== 'revoke',
        }));
      }
      const refreshed = await request();
      if (mounted.current) setStatus(refreshed);
    } catch (err) {
      if (mounted.current) setError(err.message);
      try {
        const refreshed = await request();
        if (mounted.current) setStatus(refreshed);
      } catch (_) {
        /* Keep explicit error; retry reload. */
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <>
      <section
        className="bg-white rounded-3 shadow-sm p-24 mb-24"
        aria-label="Long-term API token"
        aria-busy={busy}
      >
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            <span className="bg-light rounded-3 p-3 text-primary">
              <FontAwesomeIcon icon={faKey} fixedWidth aria-hidden="true" />
            </span>
            <div>
              <h2 className="fs-5 fw-semibold mb-1">Long-term API token</h2>
              <p className="text-gray mb-0">Secure API access with your current permissions.</p>
            </div>
          </div>
          {status && (
            <Badge bg={status.active ? 'success' : 'secondary'} className="fw-semibold px-3 py-2">
              {status.active ? 'Active' : 'No active token'}
            </Badge>
          )}
        </div>

        <p className="text-gray mb-3">
          Your token uses your current permissions and expires after 365 days. It cannot manage
          credentials.
        </p>
        {status?.expires_at && (
          <p className="small text-gray mb-3">
            <span className="fw-semibold">Expires: </span>
            <time dateTime={status.expires_at}>{new Date(status.expires_at).toLocaleString()}</time>
          </p>
        )}
        <div className="d-flex align-items-start gap-2 bg-light rounded-2 p-3 mb-4 small text-gray">
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="mt-1 flex-shrink-0"
            aria-hidden="true"
          />
          <span>Do not share it or enter it into analytics, URLs, or browser storage.</span>
        </div>

        {error && (
          <Alert
            variant="danger"
            className="d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <span>{error}</span>
            <Button
              type="button"
              variant="outline-danger"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </Alert>
        )}

        {secret && (
          <div
            className="ph-no-capture border rounded-2 p-3 mb-4"
            data-private="true"
            data-hj-suppress="true"
            data-clarity-mask="true"
          >
            <Alert variant="warning" id="api-token-notice" className="small mb-3">
              Shown only once. Hidden after 60 seconds or when you leave this tab.
            </Alert>
            <Form.Group controlId="new-api-token" className="mb-3">
              <Form.Label className="fw-semibold">New API token</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="font-monospace bg-light"
                aria-describedby="api-token-notice"
                value={secret}
                readOnly
                autoComplete="off"
                spellCheck={false}
              />
            </Form.Group>
            <div className="d-flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret);
                    setCopied(true);
                  } catch (_) {
                    setError('Clipboard unavailable. Copy the token manually.');
                  }
                }}
              >
                <FontAwesomeIcon
                  icon={copied ? faCheck : faCopy}
                  className="me-2"
                  aria-hidden="true"
                />
                <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
              <Button type="button" variant="outline-secondary" onClick={() => setSecret('')}>
                Hide token
              </Button>
            </div>
          </div>
        )}

        <div className="d-flex flex-wrap align-items-center gap-2 border-top pt-3">
          {!status?.active && (
            <Button
              type="button"
              variant="primary"
              className="fw-semibold"
              disabled={busy || !status}
              onClick={() => mutate('create')}
            >
              Create token
            </Button>
          )}
          {status?.active && (
            <>
              <Button
                type="button"
                variant="primary"
                className="fw-semibold"
                disabled={busy}
                onClick={() => mutate('regenerate')}
              >
                Regenerate token
              </Button>
              <Button
                type="button"
                variant="outline-danger"
                disabled={busy}
                onClick={() => mutate('revoke')}
              >
                Revoke token
              </Button>
            </>
          )}
          {busy && (
            <span
              role="status"
              className="d-inline-flex align-items-center gap-2 text-gray small ms-2"
            >
              <Spinner animation="border" size="sm" aria-hidden="true" />
              Loading…
            </span>
          )}
        </div>
      </section>
      <SharedMembersPage />
    </>
  );
}
