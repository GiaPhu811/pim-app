/* eslint-env jest */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MembersPage from './index';

jest.mock('aesirx-uikit', () => ({ MembersPage: () => <div>Shared members</div> }));
jest.mock('aesirx-lib', () => ({
  env: { REACT_APP_ENDPOINT_URL: 'http://localhost' },
  AUTHORIZATION_KEY: { AUTHORIZED_TOKEN_HEADER: 'header', ACCESS_TOKEN: 'access' },
  Storage: { getItem: () => 'Bearer session' },
}));
const status = { revision: 0, active: false, csrf_token: 'csrf' };
const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 403, json: async () => body });
const originalFetch = global.fetch;
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

test('renders unchanged members and manages a one-time token only in memory', async () => {
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => reply(status))
    .mockImplementationOnce(() => reply({ revision: 1, token: 'one-time-secret' }))
    .mockImplementationOnce(() => reply({ ...status, revision: 1, active: true }));
  render(<MembersPage />);
  expect(screen.getByText('Shared members')).toBeTruthy();
  await waitFor(() => expect(screen.getByText('Create token').disabled).toBe(false));
  fireEvent.click(screen.getByText('Create token'));
  await screen.findByDisplayValue('one-time-secret');
  const [, options] = global.fetch.mock.calls[1];
  expect(options.headers['X-CSRF-Token']).toBe('csrf');
  expect(JSON.parse(options.body)).toEqual({ revision: 0 });
  fireEvent.click(screen.getByText('Hide token'));
  expect(screen.queryByDisplayValue('one-time-secret')).toBeNull();
});

test('shows loading feedback and disables token creation until status is available', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  render(<MembersPage />);
  expect(
    screen.getByRole('region', { name: 'Long-term API token' }).getAttribute('aria-busy')
  ).toBe('true');
  expect(screen.getByRole('status').textContent).toContain('Loading');
  expect(screen.getByRole('button', { name: 'Create token' }).disabled).toBe(true);
});

test('shows the active badge, expiry and styled token actions', async () => {
  const expiresAt = '2027-10-15T12:00:00Z';
  global.fetch = jest.fn(() => reply({ ...status, active: true, expires_at: expiresAt }));
  render(<MembersPage />);
  expect((await screen.findByText('Active')).classList.contains('bg-success')).toBe(true);
  expect(screen.getByText(new Date(expiresAt).toLocaleString()).getAttribute('datetime')).toBe(
    expiresAt
  );
  expect(
    screen.getByRole('button', { name: 'Regenerate token' }).classList.contains('btn-primary')
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: 'Revoke token' }).classList.contains('btn-outline-danger')
  ).toBe(true);
  expect(screen.queryByRole('button', { name: 'Create token' })).toBeNull();
});

test('copies the read-only token and announces copy feedback', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => reply(status))
    .mockImplementationOnce(() => reply({ revision: 1, token: 'one-time-secret' }))
    .mockImplementationOnce(() => reply({ ...status, revision: 1, active: true }));
  render(<MembersPage />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Create token' }).disabled).toBe(false)
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create token' }));
  const token = await screen.findByRole('textbox', { name: 'New API token' });
  expect(token.readOnly).toBe(true);
  expect(token.getAttribute('aria-describedby')).toBe('api-token-notice');
  expect(token.closest('[data-private]').getAttribute('data-private')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await screen.findByRole('button', { name: 'Copied' });
  expect(writeText).toHaveBeenCalledWith('one-time-secret');
  delete navigator.clipboard;
});

test('failed status disables mutations and shows a recoverable error', async () => {
  global.fetch = jest.fn(() => reply({ message: 'Session required' }, false));
  render(<MembersPage />);
  await screen.findByText(/Session required/);
  expect(screen.getByText('Create token').disabled).toBe(true);
  expect(screen.getByText('Reload')).toBeTruthy();
});
