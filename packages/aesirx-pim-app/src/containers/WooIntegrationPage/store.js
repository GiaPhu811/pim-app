/*
 * WooIntegrationStore — thin data layer for the WooCommerce integration page.
 * Wraps the native-fetch helpers in `./api` and normalizes every call to the
 * `{ error, response }` shape the ViewModels expect (same pattern as BrandStore).
 */
import { wooGet, wooSend, fetchLanguages } from './api';

class WooIntegrationStore {
  async getSettings() {
    try {
      const respondedData = await wooGet();
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async saveSettings(data, isUpdate = false) {
    try {
      const respondedData = await wooSend(data, undefined, isUpdate ? 'PUT' : 'POST');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async getCategoryLinks() {
    try {
      const respondedData = await wooGet('categoryLinks');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async getWooCategories() {
    try {
      const respondedData = await wooGet('wooCategories');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async saveCategoryLinks(links) {
    try {
      const respondedData = await wooSend({ links }, 'linkCategories');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async getFieldMappings() {
    try {
      const respondedData = await wooGet('fieldMappings');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async saveFieldMappings(data) {
    try {
      // `data` is `{ groups: [...], mappings: [...] }` — forwarded as-is.
      const respondedData = await wooSend(data, 'saveFieldMappings');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async getLanguages() {
    try {
      const respondedData = await fetchLanguages();
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }

  async syncByCategory(data) {
    try {
      const respondedData = await wooSend(data, 'syncByCategory');
      return { error: false, response: respondedData };
    } catch (error) {
      return { error: true, response: error };
    }
  }
}

export { WooIntegrationStore };
