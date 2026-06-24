/*
 * WooCommerce Integration page content (express-backend `option=woo-integration`).
 *   - Connect: save per-org WooCommerce site URL + REST consumer key/secret.
 *   - Category mapping: link each PIM category to a Woo category (CategoryLinkTable).
 *   - Field mapping: map PIM fields to ACF keys (FieldMappingTable).
 *   - Sync by Category: bulk push products to Woo (SyncModal).
 * State is driven by WooIntegrationMainViewModel (MobX).
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useTranslation, withTranslation } from 'react-i18next';
import { Button, Spinner } from 'react-bootstrap';
import { withWooIntegrationViewModel } from '../WooIntegrationViewModel/WooIntegrationViewModelContextProvider';
import WooConnectionForm from './WooConnectionForm';
import CategoryLinkTable from './CategoryLinkTable';
import FieldMappingTable from './FieldMappingTable';
import SyncModal from './SyncModal';

const WooIntegration = observer((props) => {
  const { t } = useTranslation();
  const viewModel = props.model.wooIntegrationMainViewModel;
  const { loading, connected } = viewModel;

  useEffect(() => {
    viewModel.initializeData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">{t('txt_woo_integration') || 'WooCommerce Integration'}</h3>
        <Button
          variant="success"
          disabled={!connected}
          onClick={() => viewModel.setShowSync(true)}
          className="fw-semibold"
        >
          {t('txt_woo_sync_by_category') || 'Sync by Category'}
        </Button>
      </div>

      <WooConnectionForm />

      {connected && (
        <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
          <h5 className="mb-3">{t('txt_woo_category_mapping') || 'Category Mapping'}</h5>
          <CategoryLinkTable />
        </div>
      )}

      {connected && (
        <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
          <h5 className="mb-3">{t('txt_woo_field_mapping') || 'Field Mapping (ACF)'}</h5>
          <FieldMappingTable />
        </div>
      )}

      <SyncModal />
    </div>
  );
});

export default withTranslation()(withWooIntegrationViewModel(WooIntegration));
