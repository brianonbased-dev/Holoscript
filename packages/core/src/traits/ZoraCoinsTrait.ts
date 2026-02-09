/**
 * Zora Coins Trait
 *
 * Auto-mint .holo scenes as tradeable ERC-20 tokens on Base via Zora Protocol.
 * Every spatial experience becomes a collectible with built-in creator rewards.
 *
 * Research Reference: uAA2++ Protocol - "Zora Coins auto-mint STRENGTHEN in v3.2"
 * "Every .holo scene = tradeable ERC-20 on Base"
 *
 * Features:
 * - Automatic token creation from .holo files
 * - Base L2 deployment for low gas fees
 * - Creator rewards and royalties
 * - Collection management
 * - Secondary market integration
 * - Film3 creator economy support
 *
 * @version 3.2.0
 * @milestone v3.2 (June 2026)
 */

import type { TraitHandler } from './TraitTypes';

// =============================================================================
// TYPES
// =============================================================================

type CoinStandard = 'erc20' | 'erc1155';
type MintStatus = 'pending' | 'minting' | 'complete' | 'failed';
type DistributionModel = 'fixed_supply' | 'bonding_curve' | 'free_mint' | 'dutch_auction';

interface ZoraCoin {
  id: string;
  contractAddress: string;
  tokenId?: string; // For ERC1155
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  circulatingSupply: number;
  price: string; // In ETH
  priceUSD: number;
  creatorAddress: string;
  createdAt: number;
  chain: 'base' | 'zora' | 'optimism';
  metadata: CoinMetadata;
  stats: CoinStats;
}

interface CoinMetadata {
  holoFileHash: string;
  scenePreviewUrl: string;
  animationUrl?: string;
  traits: string[];
  category: 'scene' | 'object' | 'avatar' | 'experience' | 'film';
  license: 'cc0' | 'cc-by' | 'cc-by-nc' | 'custom';
  externalUrl?: string;
}

interface CoinStats {
  holders: number;
  totalVolume: string;
  floorPrice: string;
  marketCap: string;
  royaltiesEarned: string;
  secondarySales: number;
}

interface MintConfig {
  name: string;
  symbol: string;
  description: string;
  initialSupply: number;
  maxSupply: number;
  distribution: DistributionModel;
  initialPrice: string; // In ETH
  royaltyPercentage: number; // 0-100
  category: CoinMetadata['category'];
  license: CoinMetadata['license'];
}

interface ZoraCoinsState {
  isConnected: boolean;
  walletAddress: string | null;
  coins: ZoraCoin[];
  pendingMints: PendingMint[];
  totalRoyaltiesEarned: string;
  collections: Collection[];
  rewardsBalance: string;
}

interface PendingMint {
  id: string;
  config: MintConfig;
  holoFileHash: string;
  status: MintStatus;
  txHash?: string;
  contractAddress?: string;
  error?: string;
  createdAt: number;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  coins: string[]; // Coin IDs
  contractAddress: string;
  totalVolume: string;
}

interface ZoraCoinsConfig {
  /** Wallet address for receiving royalties */
  creator_wallet: string;
  /** Default chain for minting */
  default_chain: 'base' | 'zora' | 'optimism';
  /** Auto-mint on scene publish */
  auto_mint: boolean;
  /** Default distribution model */
  default_distribution: DistributionModel;
  /** Default royalty percentage (0-10) */
  default_royalty: number;
  /** Default initial supply */
  default_initial_supply: number;
  /** Default max supply (0 = unlimited) */
  default_max_supply: number;
  /** Initial price in ETH */
  default_initial_price: string;
  /** Default license */
  default_license: CoinMetadata['license'];
  /** Collection to add minted coins to */
  collection_id?: string;
  /** Enable bonding curve for price discovery */
  enable_bonding_curve: boolean;
  /** Bonding curve steepness (0-1) */
  bonding_curve_factor: number;
  /** Enable referral rewards */
  enable_referrals: boolean;
  /** Referral reward percentage */
  referral_percentage: number;
  /** Webhook for mint events */
  webhook_url: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ZORA_API_BASE = 'https://api.zora.co/v1';
const _BASE_CHAIN_ID = 8453;
const _ZORA_CHAIN_ID = 7777777;

const BONDING_CURVE_PRESETS = {
  linear: (supply: number, factor: number) => supply * factor * 0.0001,
  exponential: (supply: number, factor: number) => Math.pow(supply, 1 + factor) * 0.00001,
  logarithmic: (supply: number, factor: number) => Math.log(supply + 1) * factor * 0.001,
};

// =============================================================================
// HANDLER
// =============================================================================

export const zoraCoinsHandler: TraitHandler<ZoraCoinsConfig> = {
  name: 'zora_coins' as any,

  defaultConfig: {
    creator_wallet: '',
    default_chain: 'base',
    auto_mint: false,
    default_distribution: 'bonding_curve',
    default_royalty: 5,
    default_initial_supply: 1000,
    default_max_supply: 10000,
    default_initial_price: '0.001',
    default_license: 'cc-by',
    collection_id: undefined,
    enable_bonding_curve: true,
    bonding_curve_factor: 0.5,
    enable_referrals: true,
    referral_percentage: 2.5,
    webhook_url: '',
  },

  onAttach(node, config, context) {
    const state: ZoraCoinsState = {
      isConnected: false,
      walletAddress: config.creator_wallet || null,
      coins: [],
      pendingMints: [],
      totalRoyaltiesEarned: '0',
      collections: [],
      rewardsBalance: '0',
    };
    (node as any).__zoraCoinsState = state;

    if (config.creator_wallet) {
      connectToZora(node, state, config, context);
    }
  },

  onDetach(node, _config, context) {
    const state = (node as any).__zoraCoinsState as ZoraCoinsState;
    if (state?.isConnected) {
      context.emit?.('zora_disconnect', { node });
    }
    delete (node as any).__zoraCoinsState;
  },

  onUpdate(node, config, context, _delta) {
    const state = (node as any).__zoraCoinsState as ZoraCoinsState;
    if (!state || !state.isConnected) return;

    // Check pending mints for status updates
    state.pendingMints.forEach((mint) => {
      if (mint.status === 'minting') {
        checkMintStatus(mint, state, context);
      }
    });
  },

  onEvent(node, config, context, event) {
    const state = (node as any).__zoraCoinsState as ZoraCoinsState;
    if (!state) return;

    // Auto-mint on scene publish
    if (event.type === 'scene_published' && config.auto_mint) {
      const { holoFileHash, sceneName, scenePreviewUrl, traits } = event.payload as {
        holoFileHash: string;
        sceneName: string;
        scenePreviewUrl: string;
        traits: string[];
      };

      mintCoin(node, state, config, context, {
        name: sceneName,
        symbol: generateSymbol(sceneName),
        description: `HoloScript scene: ${sceneName}`,
        holoFileHash,
        scenePreviewUrl,
        traits,
        category: 'scene',
      });
    }

    // Manual mint request
    if (event.type === 'zora_mint') {
      const {
        name,
        symbol,
        description,
        holoFileHash,
        scenePreviewUrl,
        traits = [],
        category = 'scene',
        customConfig,
      } = event.payload as {
        name: string;
        symbol?: string;
        description?: string;
        holoFileHash: string;
        scenePreviewUrl: string;
        traits?: string[];
        category?: CoinMetadata['category'];
        customConfig?: Partial<MintConfig>;
      };

      mintCoin(node, state, config, context, {
        name,
        symbol: symbol || generateSymbol(name),
        description: description || `HoloScript ${category}: ${name}`,
        holoFileHash,
        scenePreviewUrl,
        traits,
        category,
        ...customConfig,
      });
    }

    // Create collection
    if (event.type === 'zora_create_collection') {
      const { name, description, coinIds } = event.payload as {
        name: string;
        description: string;
        coinIds: string[];
      };

      createCollection(node, state, config, context, { name, description, coinIds });
    }

    // Claim rewards
    if (event.type === 'zora_claim_rewards') {
      claimRewards(state, config, context);
    }

    // Get price quote (bonding curve)
    if (event.type === 'zora_price_quote') {
      const { coinId, amount } = event.payload as { coinId: string; amount: number };
      const coin = state.coins.find((c) => c.id === coinId);

      if (coin && config.enable_bonding_curve) {
        const price = calculateBondingCurvePrice(
          coin.circulatingSupply,
          amount,
          config.bonding_curve_factor
        );

        context.emit?.('zora_price_quoted', {
          node,
          coinId,
          amount,
          totalPrice: price,
          pricePerToken: price / amount,
        });
      }
    }

    // Secondary sale event (for royalty tracking)
    if (event.type === 'zora_secondary_sale') {
      const { coinId, price, buyer, seller } = event.payload as {
        coinId: string;
        price: string;
        buyer: string;
        seller: string;
      };

      handleSecondarySale(node, state, config, context, { coinId, price, buyer, seller });
    }

    // Wallet connect
    if (event.type === 'wallet_connected') {
      const { address } = event.payload as { address: string };
      state.walletAddress = address;
      connectToZora(node, state, config, context);
    }
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function connectToZora(
  node: any,
  state: ZoraCoinsState,
  config: ZoraCoinsConfig,
  context: any
): Promise<void> {
  try {
    // Fetch existing coins for this creator
    const response = await simulateApiCall(`${ZORA_API_BASE}/coins`, {
      creator: config.creator_wallet,
      chain: config.default_chain,
    });

    state.isConnected = true;
    state.coins = response.coins || [];
    state.collections = response.collections || [];
    state.totalRoyaltiesEarned = response.totalRoyalties || '0';
    state.rewardsBalance = response.rewardsBalance || '0';

    context.emit?.('zora_connected', {
      node,
      coinsCount: state.coins.length,
      totalRoyalties: state.totalRoyaltiesEarned,
    });
  } catch (_error) {
    context.emit?.('zora_error', {
      node,
      error: 'Failed to connect to Zora',
    });
  }
}

async function mintCoin(
  node: any,
  state: ZoraCoinsState,
  config: ZoraCoinsConfig,
  context: any,
  params: {
    name: string;
    symbol: string;
    description: string;
    holoFileHash: string;
    scenePreviewUrl: string;
    traits: string[];
    category: CoinMetadata['category'];
    initialSupply?: number;
    maxSupply?: number;
    initialPrice?: string;
    royaltyPercentage?: number;
    distribution?: DistributionModel;
    license?: CoinMetadata['license'];
  }
): Promise<void> {
  const mintConfig: MintConfig = {
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    initialSupply: params.initialSupply || config.default_initial_supply,
    maxSupply: params.maxSupply || config.default_max_supply,
    distribution: params.distribution || config.default_distribution,
    initialPrice: params.initialPrice || config.default_initial_price,
    royaltyPercentage: params.royaltyPercentage ?? config.default_royalty,
    category: params.category,
    license: params.license || config.default_license,
  };

  const pendingMint: PendingMint = {
    id: `mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    config: mintConfig,
    holoFileHash: params.holoFileHash,
    status: 'pending',
    createdAt: Date.now(),
  };

  state.pendingMints.push(pendingMint);

  context.emit?.('zora_mint_started', {
    node,
    pendingMint,
  });

  // Simulate minting process
  try {
    pendingMint.status = 'minting';

    // In production, this would call the Zora SDK
    const result = await simulateMinting(pendingMint, config, params);

    pendingMint.status = 'complete';
    pendingMint.txHash = result.txHash;
    pendingMint.contractAddress = result.contractAddress;

    // Create coin object
    const newCoin: ZoraCoin = {
      id: `coin_${Date.now()}`,
      contractAddress: result.contractAddress,
      name: params.name,
      symbol: params.symbol,
      description: params.description,
      totalSupply: mintConfig.maxSupply,
      circulatingSupply: mintConfig.initialSupply,
      price: mintConfig.initialPrice,
      priceUSD: parseFloat(mintConfig.initialPrice) * 2500, // ETH price estimate
      creatorAddress: config.creator_wallet,
      createdAt: Date.now(),
      chain: config.default_chain,
      metadata: {
        holoFileHash: params.holoFileHash,
        scenePreviewUrl: params.scenePreviewUrl,
        traits: params.traits,
        category: params.category,
        license: mintConfig.license,
      },
      stats: {
        holders: 1,
        totalVolume: '0',
        floorPrice: mintConfig.initialPrice,
        marketCap: (parseFloat(mintConfig.initialPrice) * mintConfig.initialSupply).toString(),
        royaltiesEarned: '0',
        secondarySales: 0,
      },
    };

    state.coins.push(newCoin);

    // Add to collection if specified
    if (config.collection_id) {
      const collection = state.collections.find((c) => c.id === config.collection_id);
      if (collection) {
        collection.coins.push(newCoin.id);
      }
    }

    context.emit?.('zora_mint_complete', {
      node,
      coin: newCoin,
      txHash: result.txHash,
    });

    // Webhook notification
    if (config.webhook_url) {
      context.emit?.('zora_webhook', {
        url: config.webhook_url,
        event: 'mint_complete',
        coin: newCoin,
      });
    }
  } catch (error) {
    pendingMint.status = 'failed';
    pendingMint.error = (error as Error).message;

    context.emit?.('zora_mint_failed', {
      node,
      pendingMint,
      error: pendingMint.error,
    });
  }
}

async function createCollection(
  node: any,
  state: ZoraCoinsState,
  config: ZoraCoinsConfig,
  context: any,
  params: { name: string; description: string; coinIds: string[] }
): Promise<void> {
  const collection: Collection = {
    id: `collection_${Date.now()}`,
    name: params.name,
    description: params.description,
    coins: params.coinIds,
    contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    totalVolume: '0',
  };

  state.collections.push(collection);

  context.emit?.('zora_collection_created', {
    node,
    collection,
  });
}

async function claimRewards(
  state: ZoraCoinsState,
  config: ZoraCoinsConfig,
  context: any
): Promise<void> {
  const amount = state.rewardsBalance;
  state.rewardsBalance = '0';

  context.emit?.('zora_rewards_claimed', {
    amount,
    wallet: config.creator_wallet,
  });
}

function handleSecondarySale(
  node: any,
  state: ZoraCoinsState,
  config: ZoraCoinsConfig,
  context: any,
  params: { coinId: string; price: string; buyer: string; seller: string }
): void {
  const coin = state.coins.find((c) => c.id === params.coinId);
  if (!coin) return;

  const royaltyAmount = (parseFloat(params.price) * config.default_royalty) / 100;
  let referralAmount = 0;

  if (config.enable_referrals) {
    referralAmount = (parseFloat(params.price) * config.referral_percentage) / 100;
  }

  coin.stats.secondarySales++;
  coin.stats.totalVolume = (parseFloat(coin.stats.totalVolume) + parseFloat(params.price)).toString();
  coin.stats.royaltiesEarned = (
    parseFloat(coin.stats.royaltiesEarned) + royaltyAmount
  ).toString();

  state.totalRoyaltiesEarned = (
    parseFloat(state.totalRoyaltiesEarned) + royaltyAmount
  ).toString();

  context.emit?.('zora_royalty_earned', {
    node,
    coinId: params.coinId,
    salePrice: params.price,
    royaltyAmount: royaltyAmount.toString(),
    referralAmount: referralAmount.toString(),
  });
}

function calculateBondingCurvePrice(
  currentSupply: number,
  amount: number,
  factor: number
): number {
  // Exponential bonding curve
  let totalPrice = 0;
  for (let i = 0; i < amount; i++) {
    totalPrice += BONDING_CURVE_PRESETS.exponential(currentSupply + i, factor);
  }
  return totalPrice;
}

function generateSymbol(name: string): string {
  // Generate a symbol from the name
  const words = name.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function checkMintStatus(
  _mint: PendingMint,
  _state: ZoraCoinsState,
  _context: any
): void {
  // In production, this would check the blockchain for tx confirmation
}

// Simulation helpers
async function simulateApiCall(_url: string, _data: any): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        coins: [],
        collections: [],
        totalRoyalties: '0.5',
        rewardsBalance: '0.1',
      });
    }, 100);
  });
}

async function simulateMinting(
  _mint: PendingMint,
  _config: ZoraCoinsConfig,
  _params: any
): Promise<{ txHash: string; contractAddress: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      });
    }, 1000);
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ZoraCoinsConfig,
  ZoraCoinsState,
  ZoraCoin,
  CoinMetadata,
  CoinStats,
  MintConfig,
  PendingMint,
  Collection,
  CoinStandard,
  DistributionModel,
};
