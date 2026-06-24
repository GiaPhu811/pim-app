/*
 * WooCommerce Integration page root. Wires the page content into the
 * WooIntegration ViewModel via its context provider (same pattern as BrandPage).
 */
import React from 'react';
import { withTranslation } from 'react-i18next';
import { observer } from 'mobx-react';
import { WooIntegrationViewModelContextProvider } from './WooIntegrationViewModel/WooIntegrationViewModelContextProvider';
import WooIntegration from './Component/WooIntegration';

const WooIntegrationPage = observer(
  class WooIntegrationPage extends React.Component {
    constructor(props) {
      super(props);
    }

    render() {
      return (
        <WooIntegrationViewModelContextProvider>
          <WooIntegration />
        </WooIntegrationViewModelContextProvider>
      );
    }
  }
);

export default withTranslation()(WooIntegrationPage);
