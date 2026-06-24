/*
 * PIM field → ACF key mapping, grouped by field group. ACF stores meta_keys as
 * `{group_key}_{field_key}` (e.g. `components_nitrogen_nts`), so each group has
 * its own ACF prefix input and each field shows the resulting effective key.
 * Left blank, a field falls back to its fieldcode; a blank group prefix means no
 * prefix. State lives in WooIntegrationMainViewModel.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useTranslation, withTranslation } from 'react-i18next';
import { Table, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { withWooIntegrationViewModel } from '../WooIntegrationViewModel/WooIntegrationViewModelContextProvider';

const FieldMappingTable = observer((props) => {
  const { t } = useTranslation();
  const viewModel = props.model.wooIntegrationMainViewModel;
  const { loading, saving, errorMsg, groups } = viewModel.fieldMappings;

  useEffect(() => {
    viewModel.loadFieldMappings();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return <p className="text-muted mb-0">{t('txt_woo_no_fields') || 'No PIM fields found.'}</p>;
  }

  return (
    <>
      {errorMsg && (
        <Alert variant="danger" className="py-2">
          {errorMsg}
        </Alert>
      )}
      <p className="text-muted small mb-3">
        {t('txt_woo_field_mapping_hint') ||
          'ACF stores meta keys as {group_key}_{field_key}. Set a group prefix and per-field key below; leave a field blank to use its field code. Image fields (thumb_image, image_upload) are synced as product images, not ACF.'}
      </p>

      {groups.map((g) => (
        <div key={g.group_id ?? 'ungrouped'} className="mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom">
            <h6 className="mb-0 fw-semibold">
              {g.group_name || (t('txt_woo_no_group') || 'No group')}
            </h6>
            {g.group_id !== null && g.group_id !== undefined && (
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">
                  {t('txt_woo_acf_group_prefix') || 'ACF Group Prefix'}
                </span>
                <Form.Control
                  size="sm"
                  type="text"
                  style={{ width: 220 }}
                  placeholder={t('txt_woo_no_prefix') || '(no prefix)'}
                  value={g.woo_acf_key ?? ''}
                  onChange={(e) => viewModel.changeGroupKey(g.group_id, e.target.value)}
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <Table hover responsive className="align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>{t('txt_woo_pim_field') || 'PIM Field'}</th>
                <th style={{ width: '12%' }}>{t('txt_woo_field_type') || 'Type'}</th>
                <th style={{ width: '28%' }}>{t('txt_woo_acf_key') || 'ACF Field Name'}</th>
                <th>{t('txt_woo_effective_key') || 'Effective meta_key'}</th>
              </tr>
            </thead>
            <tbody>
              {g.fields.map((r) => (
                <tr key={r.fieldcode}>
                  <td>
                    {r.label || r.fieldcode}
                    <div className="text-muted small">
                      <code>{r.fieldcode}</code>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark">{r.type}</span>
                  </td>
                  <td>
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder={r.fieldcode}
                      value={r.woo_acf_key ?? ''}
                      onChange={(e) => viewModel.changeFieldKey(r.fieldcode, e.target.value)}
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <code className="text-success">{r.effective_key}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ))}

      <div className="d-flex justify-content-end">
        <Button
          variant="primary"
          onClick={() => viewModel.saveFieldMappings()}
          disabled={saving}
          className="fw-semibold"
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('txt_saving') || 'Saving...'}
            </>
          ) : (
            t('txt_woo_save_mappings') || 'Save Mappings'
          )}
        </Button>
      </div>
    </>
  );
});

export default withTranslation()(withWooIntegrationViewModel(FieldMappingTable));
