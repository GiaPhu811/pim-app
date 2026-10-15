/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import React, { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus } from '@fortawesome/free-solid-svg-icons';
import 'flag-icons/css/flag-icons.min.css';
import { useContentLanguage } from 'store/ContentLanguageStore';
import { PIM_PRODUCT_DETAIL_FIELD_KEY, getUrlLanguage } from 'aesirx-lib';
import { historyPush } from 'routes/routes';

const TranslationBlock = observer(({ formPropsData, productId }) => {
  const { t } = useTranslation();
  const { store } = useContentLanguage();

  const translations = formPropsData?.[PIM_PRODUCT_DETAIL_FIELD_KEY.TRANSLATIONS] ?? {};
  const listTranslations = Object.entries(translations).map(([code, value]) => ({ code, value }));

  if (!listTranslations.length || !productId) return null;

  // The `?lang=` query wins over the stored content language — same precedence
  // as contentLanguageDetailParam() used when loading the product detail.
  const currentLang = getUrlLanguage() || store.language;

  const langMeta = (code) =>
    store.languages.find((o) => o.code === code) ?? {
      flag: code.slice(-2).toLowerCase(),
      label: code,
    };

  return (
    <div className="p-24 bg-white rounded-1 shadow-sm mt-24">
      <h5 className="fw-bold text-body text-uppercase fs-6 border-bottom pb-24 mb-24">
        {t('txt_translations')}
      </h5>
      {listTranslations.map((item, index) => {
        if (
          (currentLang === '*' && item.code === store.defaultLanguage) ||
          currentLang === item.code
        ) {
          return <Fragment key={index} />;
        }
        const meta = langMeta(item.code);
        return (
          <div key={index} className="d-flex align-items-center justify-content-between mb-16">
            <div className="d-flex align-items-center gap-2">
              <span className={`fi fi-${meta.flag} fi-lg`} />
              <span>{meta.label}</span>
            </div>
            <button
              type="button"
              onClick={() => historyPush(`/products/edit/${productId}?lang=${item.code}`)}
              className="btn btn-sm p-0 border-0 text-secondary"
            >
              <FontAwesomeIcon icon={item.value ? faPen : faPlus} width={18} height={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
});

export default TranslationBlock;
