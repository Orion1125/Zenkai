// ══════════════════════════════════════════════
// ZENKAI — Wallet connection via Web3Modal
// WalletConnect + MetaMask + injected wallets
// ══════════════════════════════════════════════

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || '';

const MAINNET = {
  chainId:  1,
  name:     'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl:   'https://cloudflare-eth.com',
};

const metadata = {
  name:        'ZENKAI',
  description: 'Zenkai Awakening Protocol — NFT Battler',
  url:         globalThis.location?.origin || 'https://zenkai.io',
  icons:       [],
};

let modal = null;

function getModal() {
  if (modal) return modal;
  modal = createWeb3Modal({
    ethersConfig: defaultConfig({ metadata }),
    chains:       [MAINNET],
    projectId:    PROJECT_ID,
    themeMode:    'dark',
    themeVariables: {
      '--w3m-accent': '#FFD000',
    },
  });
  return modal;
}

/** Open the WalletConnect / MetaMask modal and return a lowercase address */
export async function connectWallet() {
  const m = getModal();
  await m.open();

  // Wait for the user to connect (watch provider state)
  return new Promise((resolve, reject) => {
    const unsub = m.subscribeProvider(({ address, isConnected }) => {
      if (isConnected && address) {
        unsub();
        resolve(address.toLowerCase());
      }
    });

    // Also resolve immediately if already connected
    const state = m.getState();
    if (state.selectedNetworkId && m.getAddress()) {
      unsub();
      resolve(m.getAddress().toLowerCase());
    }

    // Reject after 2 minutes of no connection
    setTimeout(() => {
      unsub();
      reject(new Error('Connection timeout'));
    }, 120_000);
  });
}

/** Disconnect wallet */
export async function disconnectWallet() {
  const m = getModal();
  await m.disconnect();
}

/** Get currently connected address (or null) */
export function getConnectedAddress() {
  if (!modal) return null;
  try {
    const addr = modal.getAddress();
    return addr ? addr.toLowerCase() : null;
  } catch {
    return null;
  }
}
