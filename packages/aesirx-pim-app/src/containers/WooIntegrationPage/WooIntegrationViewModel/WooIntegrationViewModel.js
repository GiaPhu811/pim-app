/*
 * Root ViewModel for the WooCommerce integration page. Mirrors BrandViewModel:
 * holds the sub-ViewModels and exposes them via getters.
 */
import WooIntegrationMainViewModel from './WooIntegrationMainViewModel';

class WooIntegrationViewModel {
  wooIntegrationMainViewModel = {};

  constructor(wooIntegrationStore) {
    if (wooIntegrationStore) {
      this.wooIntegrationMainViewModel = new WooIntegrationMainViewModel(wooIntegrationStore);
    }
  }

  getMainViewModel = () => this.wooIntegrationMainViewModel;
}

export default WooIntegrationViewModel;
