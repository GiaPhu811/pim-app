/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import { makeAutoObservable, runInAction } from 'mobx';
import {
  getContentLanguage,
  setContentLanguageStorage,
  AesirxPimLanguageApiService,
} from 'aesirx-lib';

const ALL_LANGUAGE_OPTION = { label: 'All languages', value: '*' };

class ContentLanguageStore {
  language = getContentLanguage();
  languages = [ALL_LANGUAGE_OPTION];
  defaultLanguage = '';
  isFetched = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLanguage = (code) => {
    const next = code ?? '';
    setContentLanguageStorage(next);
    this.language = next;
  };

  fetchLanguages = async () => {
    if (this.isFetched) return;
    this.isFetched = true;
    try {
      const service = new AesirxPimLanguageApiService();
      const langs = await service.getList();
      if (Array.isArray(langs)) {
        runInAction(() => {
          this.languages = [ALL_LANGUAGE_OPTION, ...langs];
          // Fall back to the first language when none is flagged default.
          this.defaultLanguage = (langs.find((o) => o.isDefault) ?? langs[0])?.value ?? '';
        });
      }
    } catch {
      runInAction(() => {
        this.isFetched = false;
      });
    }
  };
}

const contentLanguageStore = new ContentLanguageStore();

export { ContentLanguageStore, contentLanguageStore, ALL_LANGUAGE_OPTION };
