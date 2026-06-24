/*
 * WooIntegrationMainViewModel — MobX state for the WooCommerce integration page.
 * Replaces the per-component useState/useEffect logic with a single observable
 * store (same pattern as BrandListViewModel): connection credentials, category
 * mapping, field mapping and the sync-by-category flow all live here.
 */
import { makeAutoObservable, runInAction } from 'mobx';
import { PAGE_STATUS, notify } from 'aesirx-uikit';

const EMPTY_CREDS = {
  site_url: '',
  consumer_key: '',
  consumer_secret: '',
  wp_username: '',
  wp_application_password: '',
};

class WooIntegrationMainViewModel {
  formStatus = PAGE_STATUS.READY;

  // Connection
  loading = true;
  saving = false;
  connected = false;
  creds = { ...EMPTY_CREDS };
  errorMsg = '';
  showSync = false;

  // Category mapping
  categoryLinks = {
    loading: true,
    saving: false,
    errorMsg: '',
    rows: [],
    wooCategories: [],
  };

  // Field mapping — grouped by field group. Each group carries its own ACF key
  // prefix (`woo_acf_key`) and a `fields[]` list; ACF stores meta_keys as
  // `{group_key}_{field_key}`.
  fieldMappings = {
    loading: true,
    saving: false,
    errorMsg: '',
    groups: [],
  };

  // Sync modal. Every language a product has is synced — no language selection.
  // The BE syncs in batches (skipping already-synced products); we auto-loop the
  // task until `remaining` hits 0, accumulating progress as we go.
  sync = {
    loading: true,
    syncing: false,
    errorMsg: '',
    categories: [],
    selected: {},
    result: null,
    // Running progress across the batch loop. `total` is the number of pending
    // products captured on the first batch (synced + failed + remaining), so the
    // progress bar has a stable denominator; `processed` = synced + failed.
    progress: { synced: 0, failed: 0, remaining: 0, total: 0 },
  };

  constructor(wooIntegrationStore) {
    makeAutoObservable(this);
    this.wooIntegrationStore = wooIntegrationStore;
  }

  /* ------------------------------------------------------------------ */
  /* Connection                                                          */
  /* ------------------------------------------------------------------ */
  initializeData = async () => {
    runInAction(() => {
      this.loading = true;
      this.errorMsg = '';
    });
    const data = await this.wooIntegrationStore.getSettings();
    runInAction(() => {
      if (!data?.error) {
        const response = data?.response;
        if (response?.connected) {
          this.connected = true;
          this.creds = {
            site_url: response.site_url ?? '',
            consumer_key: response.consumer_key ?? '',
            consumer_secret: '',
            wp_username: response.wp_username ?? '',
            wp_application_password: '',
          };
        }
      } else {
        this.errorMsg = data?.response?.message || 'Unable to load WooCommerce settings';
      }
      this.loading = false;
    });
  };

  setCreds = (partial) => {
    runInAction(() => {
      this.creds = { ...this.creds, ...partial };
    });
  };

  saveSettings = async () => {
    runInAction(() => {
      this.errorMsg = '';
    });
    if (!this.creds.site_url || !this.creds.consumer_key || (!this.connected && !this.creds.consumer_secret)) {
      runInAction(() => {
        this.errorMsg = 'Site URL, consumer key and consumer secret are required';
      });
      return false;
    }
    runInAction(() => {
      this.saving = true;
    });
    const data = await this.wooIntegrationStore.saveSettings(this.creds, this.connected);
    let success = false;
    runInAction(() => {
      if (!data?.error) {
        this.connected = true;
        success = true;
        notify('WooCommerce credentials saved', 'success');
      } else {
        const message = data?.response?.message || 'Save failed';
        notify(message, 'error');
        this.errorMsg = message;
      }
      this.saving = false;
    });
    return success;
  };

  setShowSync = (value) => {
    runInAction(() => {
      this.showSync = value;
    });
  };

  /* ------------------------------------------------------------------ */
  /* Category mapping                                                    */
  /* ------------------------------------------------------------------ */
  loadCategoryLinks = async () => {
    runInAction(() => {
      this.categoryLinks.loading = true;
      this.categoryLinks.errorMsg = '';
    });
    const [linksRes, wooRes] = await Promise.all([
      this.wooIntegrationStore.getCategoryLinks(),
      this.wooIntegrationStore.getWooCategories(),
    ]);
    runInAction(() => {
      if (!linksRes?.error && !wooRes?.error) {
        this.categoryLinks.rows = linksRes?.response?.categories ?? [];
        this.categoryLinks.wooCategories = wooRes?.response?.categories ?? [];
      } else {
        this.categoryLinks.errorMsg =
          linksRes?.response?.message || wooRes?.response?.message || 'Unable to load categories';
      }
      this.categoryLinks.loading = false;
    });
  };

  changeCategoryLink = (pimId, wooId) => {
    runInAction(() => {
      let nextValue = null;
      if (wooId) {
        const id = Number(wooId);
        const wc = this.categoryLinks.wooCategories.find((c) => c.id === id);
        if (wc?.translations && Object.keys(wc.translations).length > 0) {
          nextValue = { ...wc.translations };
        } else if (wc?.lang) {
          nextValue = { [wc.lang]: id };
        } else {
          nextValue = id;
        }
      }
      this.categoryLinks.rows = this.categoryLinks.rows.map((r) =>
        r.pim_category_id === pimId ? { ...r, woo_category_id: nextValue } : r
      );
    });
  };

  saveCategoryLinks = async () => {
    runInAction(() => {
      this.categoryLinks.saving = true;
      this.categoryLinks.errorMsg = '';
    });
    const links = this.categoryLinks.rows.map((r) => ({
      pim_category_id: r.pim_category_id,
      // Per-language map `{ vi, en }`, a bare id, or null — the BE accepts all.
      woo_category_id: r.woo_category_id ?? null,
    }));
    const data = await this.wooIntegrationStore.saveCategoryLinks(links);
    runInAction(() => {
      if (!data?.error) {
        notify('Category links saved', 'success');
      } else {
        const message = data?.response?.message || 'Save failed';
        notify(message, 'error');
        this.categoryLinks.errorMsg = message;
      }
      this.categoryLinks.saving = false;
    });
  };

  /* ------------------------------------------------------------------ */
  /* Field mapping                                                       */
  /* ------------------------------------------------------------------ */
  loadFieldMappings = async () => {
    runInAction(() => {
      this.fieldMappings.loading = true;
      this.fieldMappings.errorMsg = '';
    });
    const data = await this.wooIntegrationStore.getFieldMappings();
    runInAction(() => {
      if (!data?.error) {
        this.fieldMappings.groups = data?.response?.groups ?? [];
      } else {
        this.fieldMappings.errorMsg = data?.response?.message || 'Unable to load fields';
      }
      this.fieldMappings.loading = false;
    });
  };

  /** Recompute a field's `effective_key` from its group prefix + own key/fieldcode. */
  _effectiveKey = (groupKey, field) => {
    const fieldKey = field.woo_acf_key && field.woo_acf_key.length > 0 ? field.woo_acf_key : field.fieldcode;
    return groupKey && groupKey.length > 0 ? `${groupKey}_${fieldKey}` : fieldKey;
  };

  changeGroupKey = (groupId, value) => {
    runInAction(() => {
      this.fieldMappings.groups = this.fieldMappings.groups.map((g) =>
        g.group_id === groupId
          ? {
              ...g,
              woo_acf_key: value,
              fields: g.fields.map((f) => ({ ...f, effective_key: this._effectiveKey(value, f) })),
            }
          : g
      );
    });
  };

  changeFieldKey = (fieldcode, value) => {
    runInAction(() => {
      this.fieldMappings.groups = this.fieldMappings.groups.map((g) => ({
        ...g,
        fields: g.fields.map((f) => {
          if (f.fieldcode !== fieldcode) return f;
          const next = { ...f, woo_acf_key: value };
          return { ...next, effective_key: this._effectiveKey(g.woo_acf_key, next) };
        }),
      }));
    });
  };

  saveFieldMappings = async () => {
    runInAction(() => {
      this.fieldMappings.saving = true;
      this.fieldMappings.errorMsg = '';
    });
    const groups = this.fieldMappings.groups
      .filter((g) => g.group_id !== null && g.group_id !== undefined)
      .map((g) => ({ group_id: g.group_id, woo_acf_key: g.woo_acf_key ?? '' }));
    const mappings = this.fieldMappings.groups.flatMap((g) =>
      g.fields.map((f) => ({ fieldcode: f.fieldcode, woo_acf_key: f.woo_acf_key ?? '' }))
    );
    const data = await this.wooIntegrationStore.saveFieldMappings({ groups, mappings });
    runInAction(() => {
      if (!data?.error) {
        notify('Field mappings saved', 'success');
      } else {
        const message = data?.response?.message || 'Save failed';
        notify(message, 'error');
        this.fieldMappings.errorMsg = message;
      }
      this.fieldMappings.saving = false;
    });
  };

  /* ------------------------------------------------------------------ */
  /* Sync by category                                                    */
  /* ------------------------------------------------------------------ */
  loadSyncData = async () => {
    runInAction(() => {
      this.sync.loading = true;
      this.sync.errorMsg = '';
      this.sync.result = null;
      this.sync.selected = {};
    });
    const linksRes = await this.wooIntegrationStore.getCategoryLinks();
    runInAction(() => {
      if (!linksRes?.error) {
        this.sync.categories = linksRes?.response?.categories ?? [];
      } else {
        this.sync.errorMsg = linksRes?.response?.message || 'Unable to load data';
      }
      this.sync.loading = false;
    });
  };

  toggleSyncCategory = (id) => {
    runInAction(() => {
      this.sync.selected = { ...this.sync.selected, [id]: !this.sync.selected[id] };
    });
  };

  syncByCategory = async () => {
    const categoryIds = this.sync.categories
      .map((c) => c.pim_category_id)
      .filter((id) => this.sync.selected[id]);
    if (categoryIds.length === 0) {
      runInAction(() => {
        this.sync.errorMsg = 'Select at least one category';
      });
      return;
    }
    runInAction(() => {
      this.sync.syncing = true;
      this.sync.errorMsg = '';
      this.sync.result = null;
      this.sync.progress = { synced: 0, failed: 0, remaining: 0, total: 0 };
    });

    // The BE drains one batch of not-yet-synced products per call and reports how
    // many remain. Loop until nothing is left (or a batch makes no progress, to
    // avoid an infinite loop when every remaining product keeps erroring).
    let totalSynced = 0;
    // Errored products keep woo_product_sync=false, so the next batch re-fetches
    // and re-reports them. Key by product id so a failure listed across loops
    // shows once, and the latest reason wins.
    const errorsById = new Map();
    let total = 0;
    let failed = false;
    // Safety cap: 10k products / batch 25 = 400 calls is plenty.
    for (let i = 0; i < 1000; i += 1) {
      const data = await this.wooIntegrationStore.syncByCategory({ category_ids: categoryIds });
      if (data?.error) {
        runInAction(() => {
          this.sync.errorMsg = data?.response?.message || 'Sync failed';
        });
        failed = true;
        break;
      }
      const batchSynced = data?.response?.synced ?? 0;
      const batchErrors = data?.response?.errors ?? [];
      const remaining = data?.response?.remaining ?? 0;
      totalSynced += batchSynced;
      for (const e of batchErrors) errorsById.set(e.id, e);

      // Capture the full job size on the first batch as a stable bar denominator:
      // everything synced this batch + everything still pending afterwards.
      if (i === 0) total = batchSynced + batchErrors.length + remaining;

      runInAction(() => {
        this.sync.progress = {
          synced: totalSynced,
          failed: errorsById.size,
          remaining,
          total: Math.max(total, totalSynced + errorsById.size),
        };
      });

      // Done when nothing remains. Also stop if a batch synced nothing yet still
      // reports work left — that means every pending product errored, so looping
      // again would just repeat the same failures.
      if (remaining === 0) break;
      if (batchSynced === 0) break;
    }

    runInAction(() => {
      if (!failed) {
        this.sync.result = { synced: totalSynced, errors: [...errorsById.values()] };
      }
      this.sync.syncing = false;
    });
  };

  onErrorHandler = (error) => {
    Array.isArray(error?._messages) && error?._messages[0]?.message
      ? notify(error?._messages[0]?.message, 'error')
      : error?.message && notify(error?.message, 'error');
    this.formStatus = PAGE_STATUS.READY;
  };
}

export default WooIntegrationMainViewModel;
