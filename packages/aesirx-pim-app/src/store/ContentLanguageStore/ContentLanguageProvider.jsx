/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { contentLanguageStore } from './ContentLanguageStore';

const ContentLanguageContext = createContext({ store: contentLanguageStore });

const ContentLanguageProvider = ({ children }) => {
  useEffect(() => {
    contentLanguageStore.fetchLanguages();
  }, []);

  return (
    <ContentLanguageContext.Provider value={{ store: contentLanguageStore }}>
      {children}
    </ContentLanguageContext.Provider>
  );
};

const useContentLanguage = () => useContext(ContentLanguageContext);

export { ContentLanguageProvider, ContentLanguageContext, useContentLanguage };
