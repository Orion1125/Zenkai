// ══════════════════════════════════════════════
// ZENKAI — Wallet connection via Reown AppKit
// WalletConnect + MetaMask + Coinbase + injected
// ══════════════════════════════════════════════

import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet } from '@reown/appkit/networks';

const PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || '';

const metadata = {
  name:        'ZENKAI',
  description: 'Zenkai Awakening Protocol — NFT Battler',
  url:         globalThis.location?.origin || 'https://zenkai.io',
  icons:       [],
};

// Initialize AppKit eagerly so web components register before user clicks
const modal = createAppKit({
  adapters:  [new EthersAdapter()],
  networks:  [mainnet],
  projectId: PROJECT_ID,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#FFD000',
  },
});

/** Strip CAIP-10 prefix (e.g. "eip155:1:0x…" → "0x…") */
function cleanAddress(raw) {
  if (!raw) return null;
  const hex = raw.includes(':') ? raw.split(':').pop() : raw;
  return hex.toLowerCase();
}

/** Open the wallet modal and return a lowercase address */
export async function connectWallet() {
  await modal.open();

  return new Promise((resolve, reject) => {
    let resolved = false;

    const unsub = modal.subscribeEvents((event) => {
      if (resolved) return;
      if (event.data?.event === 'CONNECT_SUCCESS' || event.data?.event === 'MODAL_CLOSE') {
        const addr = cleanAddress(modal.getAddress());
        if (addr) {
          resolved = true;
          unsub?.();
          resolve(addr);
        }
      }
    });

    // Already connected — resolve immediately
    const addr = cleanAddress(modal.getAddress());
    if (addr) {
      resolved = true;
      unsub?.();
      resolve(addr);
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub?.();
        reject(new Error('Connection timeout'));
      }
    }, 120_000);
  });
}

/** Disconnect wallet */
export async function disconnectWallet() {
  await modal.disconnect();
}

/** Get currently connected address (or null) */
export function getConnectedAddress() {
  try {
    return cleanAddress(modal.getAddress());
  } catch {
    return null;
  }
}
