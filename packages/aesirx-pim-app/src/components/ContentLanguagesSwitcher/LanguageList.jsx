/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import React, { Fragment } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { useContentLanguage } from 'store/ContentLanguageStore';

const LanguageList = ({ size = 'fi-lg' }) => {
  const { store: contentLanguageStore } = useContentLanguage();
  const languageList = contentLanguageStore.languages.filter(
    (o) => o.code && contentLanguageStore.language != o.code
  );
  if (!languageList?.length) return null;

  return (
    <div className="d-inline-flex align-items-center gap-1">
      {languageList.map((country, index) => {
        if (
          contentLanguageStore.language === '*' &&
          country.code == contentLanguageStore.defaultLanguage
        ) {
          return <Fragment key={index}></Fragment>;
        }

        return (
          <span key={index} className={`fi fi-${country?.flag} ${size}`} title={country?.name} />
        );
      })}
    </div>
  );
};

export { LanguageList };
