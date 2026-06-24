/*
 * Sync-by-Category modal. Pick one or more PIM categories, then bulk-push their
 * products to WooCommerce (`task=syncByCategory`). Every language a product has
 * is synced — no language selection. Shows the synced count and any per-product
 * errors inline. State lives in WooIntegrationMainViewModel.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useTranslation, withTranslation } from 'react-i18next';
import { Modal, Form, Button, Spinner, Alert, ProgressBar, Table } from 'react-bootstrap';
import { withWooIntegrationViewModel } from '../WooIntegrationViewModel/WooIntegrationViewModelContextProvider';

const SyncModal = observer((props) => {
  const { t } = useTranslation();
  const viewModel = props.model.wooIntegrationMainViewModel;
  const { showSync } = viewModel;
  const { loading, syncing, categories, selected, errorMsg, result, progress } = viewModel.sync;
  const processed = (progress?.synced ?? 0) + (progress?.failed ?? 0);
  const total = progress?.total ?? 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const resultFailed = result?.errors?.length ?? 0;

  const onHide = () => viewModel.setShowSync(false);

  useEffect(() => {
    if (showSync) {
      viewModel.loadSyncData();
    }
  }, [showSync]);

  return (
    <Modal show={showSync} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{t('txt_woo_sync_by_category') || 'Sync by Category'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            {errorMsg && (
              <Alert variant="danger" className="py-2">
                {errorMsg}
              </Alert>
            )}
            {result && (
              <Alert variant={resultFailed ? 'warning' : 'success'} className="py-3">
                <div className="d-flex flex-wrap gap-3 align-items-center mb-2">
                  <strong>{t('txt_woo_sync_finished') || 'Sync finished'}</strong>
                  <span className="badge bg-success">
                    {(t('txt_woo_success_count') || '{n} success').replace('{n}', result.synced)}
                  </span>
                  <span className={`badge ${resultFailed ? 'bg-danger' : 'bg-secondary'}`}>
                    {(t('txt_woo_failed_count') || '{n} failed').replace('{n}', resultFailed)}
                  </span>
                </div>
                {resultFailed > 0 && (
                  <div className="mt-3">
                    <div className="fw-semibold mb-2">
                      {t('txt_woo_failed_details') || 'Failed details'}
                    </div>
                    <Table responsive bordered hover size="sm" className="mb-0 bg-white align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: 90 }}>{t('txt_woo_product_id') || 'PIM ID'}</th>
                          <th>{t('txt_woo_product') || 'Product'}</th>
                          <th>{t('txt_woo_failed_reason') || 'Failed reason'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e) => (
                          <tr key={e.id}>
                            <td>#{e.id}</td>
                            <td>{e.title || '-'}</td>
                            <td className="text-break">{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Alert>
            )}
            {syncing && (
              <Alert variant="info" className="py-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center fw-semibold">
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('txt_woo_syncing') || 'Syncing...'}
                  </div>
                  <span>{progressPercent}%</span>
                </div>
                <ProgressBar now={progressPercent} animated striped className="mb-2" />
                <div className="small text-muted d-flex flex-wrap gap-3">
                  <span>
                    {(t('txt_woo_success_count') || '{n} success').replace('{n}', progress.synced)}
                  </span>
                  <span>
                    {(t('txt_woo_failed_count') || '{n} failed').replace('{n}', progress.failed)}
                  </span>
                  <span>
                    {(t('txt_woo_remaining_count') || '{n} remaining').replace(
                      '{n}',
                      progress.remaining
                    )}
                  </span>
                  {total > 0 && <span>{processed}/{total}</span>}
                </div>
              </Alert>
            )}
            <p className="text-muted small mb-2">
              {t('txt_woo_sync_all_langs_hint') ||
                'All languages of each product are synced automatically.'}
            </p>
            <Form.Label>{t('txt_woo_categories') || 'Categories'}</Form.Label>
            <div className="border rounded p-3" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {categories.length === 0 ? (
                <p className="text-muted mb-0">
                  {t('txt_woo_no_categories') || 'No PIM categories found.'}
                </p>
              ) : (
                categories.map((c) => (
                  <Form.Check
                    key={c.pim_category_id}
                    type="checkbox"
                    id={`woo-cat-${c.pim_category_id}`}
                    label={
                      c.woo_category_id
                        ? c.title || `#${c.pim_category_id}`
                        : `${c.title || `#${c.pim_category_id}`} ${
                            t('txt_woo_unlinked_hint') || '(not linked to Woo)'
                          }`
                    }
                    checked={!!selected[c.pim_category_id]}
                    onChange={() => viewModel.toggleSyncCategory(c.pim_category_id)}
                    disabled={syncing}
                  />
                ))
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={syncing}>
          {t('txt_close') || 'Close'}
        </Button>
        <Button
          variant="success"
          onClick={() => viewModel.syncByCategory()}
          disabled={syncing || loading}
        >
          {syncing ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('txt_woo_syncing') || 'Syncing...'}
            </>
          ) : (
            t('txt_woo_start_sync') || 'Start Sync'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default withTranslation()(withWooIntegrationViewModel(SyncModal));
