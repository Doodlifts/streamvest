import React from 'react';
import ReactDOM from 'react-dom/client';
import { FlowProvider } from '@onflow/react-sdk';
import * as fcl from '@onflow/fcl';
import { init as initWc } from '@onflow/fcl-wc';
import flowJson from '../../flow.json';
import App from './App';
import './App.css';

// Initialize WalletConnect for mobile wallet support
// Get a project ID at https://cloud.walletconnect.com
const WC_PROJECT_ID = '048a39de68b9eab4dba498855d3a1777';

initWc({
  projectId: WC_PROJECT_ID,
  metadata: {
    name: 'StreamVest',
    description: 'Autonomous Token Vesting on Flow',
    url: 'https://streamvest.vercel.app',
    icons: ['https://i.imgur.com/YbFxBJQ.png'],
  },
  includeBaseWC: true,
}).then(({ FclWcServicePlugin }) => {
  fcl.pluginRegistry.add(FclWcServicePlugin);
}).catch((err) => {
  console.warn('WalletConnect init failed (non-critical):', err.message);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FlowProvider
      config={{
        accessNodeUrl: 'https://rest-mainnet.onflow.org',
        flowNetwork: 'mainnet',
        appDetailTitle: 'StreamVest',
        appDetailIcon: 'https://i.imgur.com/YbFxBJQ.png',
        appDetailDescription: 'Autonomous Token Vesting on Flow',
        appDetailUrl: 'https://streamvest.vercel.app',
        discoveryWallet: 'https://fcl-discovery.onflow.org/authn',
        discoveryAuthnEndpoint: 'https://fcl-discovery.onflow.org/api/authn',
      }}
      flowJson={flowJson}
    >
      <App />
    </FlowProvider>
  </React.StrictMode>
);
