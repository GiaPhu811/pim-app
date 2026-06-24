/*
 * PIM ↔ WooCommerce category mapping table. Each PIM category gets a dropdown
 * of live Woo categories; saving stores the chosen `woo_category_id` on the PIM
 * category so synced products inherit their category assignment automatically.
 * State lives in WooIntegrationMainViewModel.
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react';
import { useTranslation, withTranslation } from 'react-i18next';
import { Table, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { withWooIntegrationViewModel } from '../WooIntegrationViewModel/WooIntegrationViewModelContextProvider';
import { useContentLanguage } from 'store/ContentLanguageStore';

const CategoryLinkTable = observer((props) => {
  const { t } = useTranslation();
  const { store: contentLanguageStore } = useContentLanguage();
  const viewModel = props.model.wooIntegrationMainViewModel;
  const { loading, saving, errorMsg, rows, wooCategories } = viewModel.categoryLinks;

  useEffect(() => {
    viewModel.loadCategoryLinks();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted mb-0">{t('txt_woo_no_categories') || 'No PIM categories found.'}</p>
    );
  }

  // The stored link can be a per-language map `{ vi: 2439, en: 2440 }`, a bare
  // id (legacy / non-multilingual), or null. Resolve it to a single id to show
  // as the dropdown's selected value: any id present in the map matches the
  // category the user picked (all its translations point at the same option).
  const selectedId = (value) => {
    if (value && typeof value === 'object') {
      const ids = Object.values(value).filter((v) => typeof v === 'number');
      // Match the primary option's value (lowest id — see isPrimary below).
      return ids.length > 0 ? Math.min(...ids) : '';
    }
    return typeof value === 'number' ? value : '';
  };

  const options = wooCategories;

  return (
    <>
      {errorMsg && (
        <Alert variant="danger" className="py-2">
          {errorMsg}
        </Alert>
      )}
      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th style={{ width: '50%' }}>{t('txt_woo_pim_category') || 'PIM Category'}</th>
            <th>{t('txt_woo_woo_category') || 'WooCommerce Category'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pim_category_id}>
              <td>{r.title || `#${r.pim_category_id}`}</td>
              <td>
                <Form.Select
                  size="sm"
                  value={selectedId(
                    r.woo_category_id?.[
                      contentLanguageStore.language == '*'
                        ? contentLanguageStore.defaultLanguage
                        : contentLanguageStore.language
                    ]
                  )}
                  onChange={(e) => viewModel.changeCategoryLink(r.pim_category_id, e.target.value)}
                  disabled={saving}
                >
                  <option value="">{t('txt_woo_not_linked') || '— Not linked —'}</option>
                  {options.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.name}
                    </option>
                  ))}
                </Form.Select>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="d-flex justify-content-end">
        <Button
          variant="primary"
          onClick={() => viewModel.saveCategoryLinks()}
          disabled={saving}
          className="fw-semibold"
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              {t('txt_saving') || 'Saving...'}
            </>
          ) : (
            t('txt_woo_save_links') || 'Save Links'
          )}
        </Button>
      </div>
    </>
  );
});

export default withTranslation()(withWooIntegrationViewModel(CategoryLinkTable));
