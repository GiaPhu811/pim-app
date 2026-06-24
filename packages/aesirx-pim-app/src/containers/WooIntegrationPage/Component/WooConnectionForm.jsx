/*
 * Connection form for the WooCommerce integration page. Reads/writes the
 * credentials state from WooIntegrationMainViewModel (no local useState).
 */
import React from 'react';
import { observer } from 'mobx-react';
import { useTranslation, withTranslation } from 'react-i18next';
import { Form, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { withWooIntegrationViewModel } from '../WooIntegrationViewModel/WooIntegrationViewModelContextProvider';

const WooConnectionForm = observer((props) => {
  const { t } = useTranslation();
  const viewModel = props.model.wooIntegrationMainViewModel;
  const { creds, saving, connected, errorMsg } = viewModel;

  const onSave = async (e) => {
    e.preventDefault();
    await viewModel.saveSettings();
  };

  return (
    <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
      <h5 className="mb-3">{t('txt_woo_connection') || 'Connection'}</h5>
      {errorMsg && (
        <Alert variant="danger" className="py-2">
          {errorMsg}
        </Alert>
      )}
      <Form onSubmit={onSave} noValidate>
        <Row>
          <Col md={12}>
            <Form.Group className="mb-3">
              <Form.Label>{t('txt_woo_site_url') || 'Store URL'}</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://shop.example.com"
                value={creds.site_url}
                onChange={(e) => viewModel.setCreds({ site_url: e.target.value })}
                disabled={saving}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('txt_woo_consumer_key') || 'Consumer Key'}</Form.Label>
              <Form.Control
                type="text"
                autoComplete="off"
                value={creds.consumer_key}
                onChange={(e) => viewModel.setCreds({ consumer_key: e.target.value })}
                disabled={saving}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('txt_woo_consumer_secret') || 'Consumer Secret'}</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
                value={creds.consumer_secret}
                onChange={(e) => viewModel.setCreds({ consumer_secret: e.target.value })}
                disabled={saving}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('txt_wp_app_username') || 'WP Application Username'}</Form.Label>
              <Form.Control
                type="text"
                autoComplete="off"
                value={creds.wp_username}
                onChange={(e) => viewModel.setCreds({ wp_username: e.target.value })}
                disabled={saving}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>{t('txt_wp_app_password') || 'WP Application Password'}</Form.Label>
              <Form.Control
                type="password"
                autoComplete="new-password"
                placeholder={connected ? '•••••••• (leave blank to keep)' : ''}
                value={creds.wp_application_password}
                onChange={(e) => viewModel.setCreds({ wp_application_password: e.target.value })}
                disabled={saving}
              />
            </Form.Group>
          </Col>
        </Row>
        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" disabled={saving} className="fw-semibold">
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
  );
});

export default withTranslation()(withWooIntegrationViewModel(WooConnectionForm));
