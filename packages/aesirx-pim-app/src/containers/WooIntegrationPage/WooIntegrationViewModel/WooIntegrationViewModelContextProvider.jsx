/*
 * @copyright   Copyright (C) 2022 AesirX. All rights reserved.
 * @license     GNU General Public License version 3, see LICENSE.
 */

import React from 'react';
import { WooIntegrationStore } from '../store';
import WooIntegrationViewModel from './WooIntegrationViewModel';

const wooIntegrationStore = new WooIntegrationStore();
const wooIntegrationViewModel = new WooIntegrationViewModel(wooIntegrationStore);

export const WooIntegrationViewModelContext = React.createContext({
  model: wooIntegrationViewModel,
});

export const WooIntegrationViewModelContextProvider = ({ children }) => {
  return (
    <WooIntegrationViewModelContext.Provider value={{ model: wooIntegrationViewModel }}>
      {children}
    </WooIntegrationViewModelContext.Provider>
  );
};

/* Hook to use store in any functional component */
export const useWooIntegrationViewModel = () => React.useContext(WooIntegrationViewModelContext);

/* HOC to inject store to any functional or class component */
export const withWooIntegrationViewModel = (Component) => (props) => {
  return <Component {...props} {...useWooIntegrationViewModel()} />;
};
