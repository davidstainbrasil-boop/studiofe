import { z } from 'zod';

/**
 * Avatar Marketplace with Blockchain Authentication
 * NFT-based avatar ownership and trading platform
 */

// NFT Avatar Schema
export const NFTAvatarSchema = z.object({
  tokenId: z.string(),
  contractAddress: z.string(),
  chainId: z.number(),
  creator: z.string(), // Wallet address
  owner: z.string(), // Current owner wallet address
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    image: z.string().url(),
    external_url: z.string().url().optional(),
    animation_url: z.string().url().optional(),
    attributes: z.array(
      z.object({
        trait_type: z.string(),
        value: z.any(),
        rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
      }),
    ),
  }),
  createdAt: z.string().datetime(),
  lastTransferred: z.string().datetime().optional(),
  price: z.object({
    amount: z.string(),
    currency: z.string(),
    usdValue: z.number(),
  }),
  royalty: z.object({
    creatorBps: z.number().min(0).max(10000), // Basis points
    marketplaceBps: z.number().min(0).max(10000),
  }),
  isListed: z.boolean(),
  views: z.number().default(0),
  likes: z.number().default(0),
});

export type NFTAvatar = z.infer<typeof NFTAvatarSchema>;

// Marketplace Listing Schema
export const MarketplaceListingSchema = z.object({
  listingId: z.string(),
  nft: NFTAvatarSchema,
  seller: z.string(),
  price: z.object({
    amount: z.string(),
    currency: z.string(),
    usdValue: z.number(),
  }),
  auction: z
    .object({
      isAuction: z.boolean().default(false),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      minBid: z.string().optional(),
      currentBid: z.string().optional(),
      currentBidder: z.string().optional(),
      bidHistory: z
        .array(
          z.object({
            bidder: z.string(),
            amount: z.string(),
            timestamp: z.string().datetime(),
          }),
        )
        .optional(),
    })
    .optional(),
  status: z.enum(['active', 'sold', 'cancelled', 'expired']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type MarketplaceListing = z.infer<typeof MarketplaceListingSchema>;

// User Profile Schema
export const UserProfileSchema = z.object({
  walletAddress: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
  statistics: z.object({
    created: z.number().default(0),
    sold: z.number().default(0),
    purchased: z.number().default(0),
    totalVolume: z.string().default('0'),
    averagePrice: z.string().default('0'),
    followers: z.number().default(0),
    following: z.number().default(0),
  }),
  preferences: z.object({
    notifications: z.boolean().default(true),
    publicProfile: z.boolean().default(true),
    allowOffers: z.boolean().default(true),
    minOfferAmount: z.string().default('0'),
  }),
  verification: z.object({
    isVerified: z.boolean().default(false),
    verificationLevel: z.enum(['none', 'basic', 'premium', 'pro']).default('none'),
    verifiedAt: z.string().datetime().optional(),
  }),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Blockchain Service Schema
export const BlockchainServiceSchema = z.object({
  chainId: z.number(),
  rpcUrl: z.string().url(),
  contractAddress: z.string(),
  marketplaceAddress: z.string(),
  nativeCurrency: z.object({
    symbol: z.string(),
    decimals: z.number(),
    coingeckoId: z.string(),
  }),
});

export type BlockchainService = z.infer<typeof BlockchainServiceSchema>;

/**
 * Avatar Marketplace Class
 */
export class AvatarMarketplace {
  private blockchainService: BlockchainService;
  private web3Provider: any;
  private contract: any;
  private marketplaceContract: any;
  private currentUser?: UserProfile;

  constructor(blockchainConfig: BlockchainService) {
    this.blockchainService = BlockchainServiceSchema.parse(blockchainConfig);
  }

  /**
   * Initialize marketplace with wallet connection
   */
  async initialize(walletAddress: string): Promise<UserProfile> {
    try {
      // Initialize Web3 provider
      await this.initializeWeb3Provider();

      // Connect to smart contracts
      await this.connectContracts();

      // Load or create user profile
      this.currentUser = await this.loadUserProfile(walletAddress);

      return this.currentUser;
    } catch (error) {
      console.error('Failed to initialize marketplace:', error);
      throw new Error(
        `Marketplace initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create new NFT avatar
   */
  async createAvatar(avatarData: {
    name: string;
    description: string;
    imageUrl: string;
    animationUrl?: string;
    attributes: Array<{
      trait_type: string;
      value: any;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }>;
    royalty: number; // Percentage
  }): Promise<NFTAvatar> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(avatarData);

      // Mint NFT
      const tokenId = await this.mintNFT(metadataUri);

      // Create NFT avatar object
      const nftAvatar: NFTAvatar = {
        tokenId,
        contractAddress: this.blockchainService.contractAddress,
        chainId: this.blockchainService.chainId,
        creator: this.currentUser.walletAddress,
        owner: this.currentUser.walletAddress,
        metadata: {
          name: avatarData.name,
          description: avatarData.description,
          image: avatarData.imageUrl,
          animation_url: avatarData.animationUrl,
          attributes: avatarData.attributes,
        },
        createdAt: new Date().toISOString(),
        price: {
          amount: '0',
          currency: this.blockchainService.nativeCurrency.symbol,
          usdValue: 0,
        },
        royalty: {
          creatorBps: avatarData.royalty * 100, // Convert to basis points
          marketplaceBps: 250, // 2.5% marketplace fee
        },
        isListed: false,
        views: 0,
        likes: 0,
      };

      // Save to database
      await this.saveAvatarToDatabase(nftAvatar);

      // Update user statistics
      await this.updateUserStatistics('created');

      return nftAvatar;
    } catch (error) {
      console.error('Failed to create avatar:', error);
      throw new Error(
        `Avatar creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List avatar for sale
   */
  async listAvatar(
    tokenId: string,
    price: {
      amount: string;
      currency?: string;
    },
    auction?: {
      startTime?: string;
      endTime: string;
      minBid: string;
    },
  ): Promise<MarketplaceListing> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Verify ownership
      const nftAvatar = await this.getAvatar(tokenId);
      if (nftAvatar.owner.toLowerCase() !== this.currentUser.walletAddress.toLowerCase()) {
        throw new Error('Not the owner of this avatar');
      }

      // Approve marketplace contract
      await this.approveMarketplace(tokenId);

      // Convert price to USD
      const usdValue = await this.convertPriceToUSD(
        price.amount,
        price.currency || this.blockchainService.nativeCurrency.symbol,
      );

      const listing: MarketplaceListing = {
        listingId: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nft: nftAvatar,
        seller: this.currentUser.walletAddress,
        price: {
          amount: price.amount,
          currency: price.currency || this.blockchainService.nativeCurrency.symbol,
          usdValue,
        },
        auction: auction
          ? {
              isAuction: true,
              startTime: auction.startTime || new Date().toISOString(),
              endTime: auction.endTime,
              minBid: auction.minBid,
              currentBid: auction.minBid,
              currentBidder: undefined,
              bidHistory: [],
            }
          : undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt:
          auction?.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      // Execute blockchain transaction
      if (auction) {
        await this.createAuctionListing(tokenId, auction.minBid, auction.endTime);
      } else {
        await this.createFixedPriceListing(tokenId, price.amount);
      }

      // Save to database
      await this.saveListingToDatabase(listing);

      // Update avatar status
      nftAvatar.isListed = true;
      nftAvatar.price = listing.price;
      await this.updateAvatarInDatabase(tokenId, nftAvatar);

      return listing;
    } catch (error) {
      console.error('Failed to list avatar:', error);
      throw new Error(
        `Listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Purchase avatar
   */
  async purchaseAvatar(listingId: string): Promise<string> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const listing = await this.getListing(listingId);

      if (listing.status !== 'active') {
        throw new Error('Listing is not active');
      }

      if (listing.auction?.isAuction) {
        return await this.placeBid(listingId, listing.auction.minBid || '0');
      } else {
        return await this.executePurchase(listingId);
      }
    } catch (error) {
      console.error('Failed to purchase avatar:', error);
      throw new Error(
        `Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Place bid on auction
   */
  async placeBid(listingId: string, bidAmount: string): Promise<string> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const listing = await this.getListing(listingId);
    if (!listing.auction?.isAuction) {
      throw new Error('Not an auction listing');
    }

    try {
      // Execute bid transaction
      const txHash = await this.executeBidTransaction(listing.nft.tokenId, bidAmount);

      // Update bid history
      listing.auction.bidHistory = listing.auction.bidHistory || [];
      listing.auction.bidHistory.push({
        bidder: this.currentUser.walletAddress,
        amount: bidAmount,
        timestamp: new Date().toISOString(),
      });

      listing.auction.currentBid = bidAmount;
      listing.auction.currentBidder = this.currentUser.walletAddress;

      // Save to database
      await this.saveListingToDatabase(listing);

      return txHash;
    } catch (error) {
      console.error('Failed to place bid:', error);
      throw new Error(`Bid failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search marketplace
   */
  async searchAvatars(filters: {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    rarity?: string[];
    sortBy?: 'price_asc' | 'price_desc' | 'created_desc' | 'created_asc' | 'views' | 'likes';
    limit?: number;
    offset?: number;
  }): Promise<{
    avatars: NFTAvatar[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Build search query
      const searchResults = await this.searchInDatabase(filters);

      return {
        avatars: searchResults.avatars,
        total: searchResults.total,
        hasMore: (filters.offset || 0) + (filters.limit || 20) < searchResults.total,
      };
    } catch (error) {
      console.error('Search failed:', error);
      return { avatars: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get user's collection
   */
  async getUserCollection(walletAddress: string): Promise<NFTAvatar[]> {
    try {
      const avatars = await this.getUserAvatarsFromDatabase(walletAddress);
      return avatars;
    } catch (error) {
      console.error('Failed to get user collection:', error);
      return [];
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(walletAddress: string): Promise<UserProfile> {
    return await this.loadUserProfile(walletAddress);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const updatedProfile = { ...this.currentUser, ...updates };
    await this.saveUserProfileToDatabase(updatedProfile);
    this.currentUser = updatedProfile;

    return updatedProfile;
  }

  /**
   * Get avatar details
   */
  async getAvatar(tokenId: string): Promise<NFTAvatar> {
    return await this.getAvatarFromDatabase(tokenId);
  }

  /**
   * Get listing details
   */
  async getListing(listingId: string): Promise<MarketplaceListing> {
    return await this.getListingFromDatabase(listingId);
  }

  /**
   * Private methods
   */

  private async initializeWeb3Provider(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      // MetaMask or other browser wallet
      this.web3Provider = new (window as any).ethers.providers.Web3Provider((window as any).ethereum);
    } else {
      // Fallback to RPC provider
      this.web3Provider = new (window as any).ethers.providers.JsonRpcProvider(this.blockchainService.rpcUrl);
    }
  }

  private async connectContracts(): Promise<void> {
    // Load ABI and connect contracts
    const contractABI = await this.loadContractABI();
    const marketplaceABI = await this.loadMarketplaceABI();

    const ethers = (window as any).ethers;
    if (!ethers) {
      throw new Error('Ethers.js not loaded');
    }

    this.contract = new ethers.Contract(
      this.blockchainService.contractAddress,
      contractABI,
      this.web3Provider,
    );

    this.marketplaceContract = new ethers.Contract(
      this.blockchainService.marketplaceAddress,
      marketplaceABI,
      this.web3Provider,
    );
  }

  private async loadUserProfile(walletAddress: string): Promise<UserProfile> {
    // Load from database or create new profile
    let profile = await this.getUserProfileFromDatabase(walletAddress);

    if (!profile) {
      profile = {
        walletAddress,
        username: `User${walletAddress.slice(0, 6)}`,
        statistics: {
          created: 0,
          sold: 0,
          purchased: 0,
          totalVolume: '0',
          averagePrice: '0',
          followers: 0,
          following: 0,
        },
        preferences: {
          notifications: true,
          publicProfile: true,
          allowOffers: true,
          minOfferAmount: '0',
        },
        verification: {
          isVerified: false,
          verificationLevel: 'none',
        },
      };
      await this.saveUserProfileToDatabase(profile);
    }

    return profile;
  }

  private async uploadMetadataToIPFS(avatarData: any): Promise<string> {
    // Upload to IPFS (using Pinata, Infura, or other service)
    const ipfsUrl = process.env.IPFS_API_URL;
    const ipfsKey = process.env.IPFS_API_KEY;
    
    if (!ipfsUrl || !ipfsKey) {
      throw new Error('IPFS configuration missing');
    }
    
    const response = await fetch(`${ipfsUrl}/pin/json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ipfsKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: avatarData,
        pinataMetadata: {
          name: avatarData.name || 'Avatar',
        },
      }),
    });

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  }

  private async mintNFT(metadataUri: string): Promise<string> {
    // Execute minting transaction
    const tx = await this.contract.mint(metadataUri);
    const receipt = await tx.wait();

    // Get token ID from event
    const event = receipt.events?.find((e: any) => e.event === 'Transfer');
    return event.args.tokenId.toString();
  }

  private async convertPriceToUSD(amount: string, currency: string): Promise<number> {
    // Get price from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${this.blockchainService.nativeCurrency.coingeckoId}&vs_currencies=usd`,
    );

    const priceData = await response.json();
    const priceInUSD = priceData[this.blockchainService.nativeCurrency.coingeckoId].usd;

    return parseFloat(amount) * priceInUSD;
  }

  // Database methods (placeholders - implement with your preferred database)
  private async saveAvatarToDatabase(avatar: NFTAvatar): Promise<void> {
    // Implement database save
  }

  private async getAvatarFromDatabase(tokenId: string): Promise<NFTAvatar> {
    // Implement database fetch
    throw new Error('Not implemented');
  }

  private async saveListingToDatabase(listing: MarketplaceListing): Promise<void> {
    // Implement database save
  }

  private async getListingFromDatabase(listingId: string): Promise<MarketplaceListing> {
    // Implement database fetch
    throw new Error('Not implemented');
  }

  private async searchInDatabase(filters: any): Promise<{ avatars: NFTAvatar[]; total: number }> {
    // Implement database search
    return { avatars: [], total: 0 };
  }

  private async getUserAvatarsFromDatabase(walletAddress: string): Promise<NFTAvatar[]> {
    // Implement database fetch
    return [];
  }

  private async getUserProfileFromDatabase(walletAddress: string): Promise<UserProfile | null> {
    // Implement database fetch
    return null;
  }

  private async saveUserProfileToDatabase(profile: UserProfile): Promise<void> {
    // Implement database save
  }

  private async updateUserStatistics(action: 'created' | 'sold' | 'purchased'): Promise<void> {
    // Update user statistics
  }

  private async loadContractABI(): Promise<any[]> {
    // Load contract ABI
    return [];
  }

  private async loadMarketplaceABI(): Promise<any[]> {
    // Load marketplace ABI
    return [];
  }

  private async approveMarketplace(tokenId: string): Promise<void> {
    // Approve marketplace contract to transfer NFT
  }

  private async createFixedPriceListing(tokenId: string, price: string): Promise<string> {
    // Create fixed price listing
    return '';
  }

  private async createAuctionListing(
    tokenId: string,
    minBid: string,
    endTime: string,
  ): Promise<string> {
    // Create auction listing
    return '';
  }

  private async executePurchase(listingId: string): Promise<string> {
    // Execute purchase transaction
    return '';
  }

  private async executeBidTransaction(tokenId: string, bidAmount: string): Promise<string> {
    // Execute bid transaction
    return '';
  }

  private async updateAvatarInDatabase(tokenId: string, avatar: NFTAvatar): Promise<void> {
    // Update avatar in database
  }
}

/**
 * Factory function
 */
export function createAvatarMarketplace(blockchainConfig: BlockchainService): AvatarMarketplace {
  return new AvatarMarketplace(blockchainConfig);
}

/**
 * Blockchain configurations
 */
export const BLOCKCHAIN_CONFIGS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    contractAddress: '0x...', // Your NFT contract address
    marketplaceAddress: '0x...', // Your marketplace contract address
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
      coingeckoId: 'ethereum',
    },
  },

  POLYGON_MAINNET: {
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    contractAddress: '0x...',
    marketplaceAddress: '0x...',
    nativeCurrency: {
      symbol: 'MATIC',
      decimals: 18,
      coingeckoId: 'matic-network',
    },
  },

  ARBITRUM_ONE: {
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    contractAddress: '0x...',
    marketplaceAddress: '0x...',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18,
      coingeckoId: 'ethereum',
    },
  },
};
