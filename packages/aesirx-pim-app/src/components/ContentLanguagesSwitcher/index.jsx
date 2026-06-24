/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { AesirXSelect as SelectComponent } from 'aesirx-uikit';
import {
  useContentLanguage,
  ALL_LANGUAGE_OPTION,
} from 'store/ContentLanguageStore';

const ContentLanguagesSwitcher = observer(() => {
  const { store } = useContentLanguage();
  const options = store.languages;

  const currentValue = store.language || '*';
  const selected = options.find((o) => o.value === currentValue) ?? ALL_LANGUAGE_OPTION;

  return (
    <div className="me-3 d-flex align-items-center fs-sm">
      <SelectComponent
        isClearable={false}
        isSearchable={false}
        isBorder={false}
        isShadow={false}
        options={options}
        className="shadow-none"
        value={selected}
        onChange={(data) => {
          // Store '*' as-is; backend treats '*' as all languages.
          store.setLanguage(data?.value ?? '');
        }}
        minWidth={140}
        isLanguageSelect={true}
      />
    </div>
  );
});

export { ContentLanguagesSwitcher };
