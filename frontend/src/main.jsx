import React from 'react';
import ReactDOM from 'react-dom/client';
import { FlowProvider } from '@onflow/react-sdk';
import flowJson from '../../flow.json';
import App from './App';
import './App.css';

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
        discovery: {
          wallet: 'https://fcl-discovery.onflow.org/authn',
          authnEndpoint: 'https://fcl-discovery.onflow.org/api/authn',
        },
      }}
      flowJson={flowJson}
    >
      <App />
    </FlowProvider>
  </React.StrictMode>
);
