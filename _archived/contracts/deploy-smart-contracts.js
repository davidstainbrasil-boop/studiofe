#!/usr/bin/env node

/**
 * NFT Smart Contracts for Avatar Marketplace
 * Deployable on Ethereum, Polygon, and Arbitrum
 */

const { ethers } = require('hardhat');
const { expect } = require('chai');

// Avatar NFT Contract
async function deployAvatarNFT() {
  console.log('🎭 Deploying Avatar NFT Contract...');

  const AvatarNFT = await ethers.getContractFactory('AvatarNFT');
  const avatarNFT = await AvatarNFT.deploy();
  await avatarNFT.deployed();

  console.log(`✅ Avatar NFT deployed to: ${avatarNFT.address}`);
  return avatarNFT;
}

// Marketplace Contract
async function deployMarketplace(avatarNFTAddress) {
  console.log('🏪 Deploying Marketplace Contract...');

  const Marketplace = await ethers.getContractFactory('AvatarMarketplace');
  const marketplace = await Marketplace.deploy(avatarNFTAddress);
  await marketplace.deployed();

  console.log(`✅ Marketplace deployed to: ${marketplace.address}`);
  return marketplace;
}

// Deploy to Polygon Mainnet
async function deployPolygonMainnet() {
  console.log('🔷 Deploying to Polygon Mainnet...');

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const avatarNFT = await deployAvatarNFT();
  const marketplace = await deployMarketplace(avatarNFT.address);

  // Verify contracts on Polygonscan
  console.log('🔍 Verifying contracts...');
  try {
    await hre.run('verify:verify', {
      address: avatarNFT.address,
      constructorArguments: [],
    });

    await hre.run('verify:verify', {
      address: marketplace.address,
      constructorArguments: [avatarNFT.address],
    });
    console.log('✅ Contracts verified on Polygonscan');
  } catch (error) {
    console.log('⚠️ Verification skipped:', error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: 'polygon-mainnet',
    avatarNFT: avatarNFT.address,
    marketplace: marketplace.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    gasPrice: await ethers.provider.getGasPrice(),
  };

  require('fs').writeFileSync(
    'contracts/deployments/polygon-mainnet.json',
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log('💾 Deployment info saved to contracts/deployments/polygon-mainnet.json');
  return deploymentInfo;
}

// Deploy to Ethereum Mainnet
async function deployEthereumMainnet() {
  console.log('⛽ Deploying to Ethereum Mainnet...');

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const avatarNFT = await deployAvatarNFT();
  const marketplace = await deployMarketplace(avatarNFT.address);

  // Verify contracts on Etherscan
  console.log('🔍 Verifying contracts...');
  try {
    await hre.run('verify:verify', {
      address: avatarNFT.address,
      constructorArguments: [],
    });

    await hre.run('verify:verify', {
      address: marketplace.address,
      constructorArguments: [avatarNFT.address],
    });
    console.log('✅ Contracts verified on Etherscan');
  } catch (error) {
    console.log('⚠️ Verification skipped:', error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: 'ethereum-mainnet',
    avatarNFT: avatarNFT.address,
    marketplace: marketplace.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    gasPrice: await ethers.provider.getGasPrice(),
  };

  require('fs').writeFileSync(
    'contracts/deployments/ethereum-mainnet.json',
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log('💾 Deployment info saved to contracts/deployments/ethereum-mainnet.json');
  return deploymentInfo;
}

// Deploy to Arbitrum Mainnet
async function deployArbitrumMainnet() {
  console.log('🔺 Deploying to Arbitrum Mainnet...');

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const avatarNFT = await deployAvatarNFT();
  const marketplace = await deployMarketplace(avatarNFT.address);

  // Verify contracts on Arbiscan
  console.log('🔍 Verifying contracts...');
  try {
    await hre.run('verify:verify', {
      address: avatarNFT.address,
      constructorArguments: [],
    });

    await hre.run('verify:verify', {
      address: marketplace.address,
      constructorArguments: [avatarNFT.address],
    });
    console.log('✅ Contracts verified on Arbiscan');
  } catch (error) {
    console.log('⚠️ Verification skipped:', error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: 'arbitrum-mainnet',
    avatarNFT: avatarNFT.address,
    marketplace: marketplace.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    gasPrice: await ethers.provider.getGasPrice(),
  };

  require('fs').writeFileSync(
    'contracts/deployments/arbitrum-mainnet.json',
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log('💾 Deployment info saved to contracts/deployments/arbitrum-mainnet.json');
  return deploymentInfo;
}

// Initialize marketplace with initial configuration
async function initializeMarketplace(marketplace, deployer) {
  console.log('⚙️ Initializing Marketplace...');

  // Set marketplace fee (2.5%)
  const marketplaceFee = 250; // 2.5% in basis points
  await marketplace.setMarketplaceFee(marketplaceFee);

  // Set royalty fee limits
  const minRoyalty = 0; // 0%
  const maxRoyalty = 1000; // 10%
  await marketplace.setRoyaltyLimits(minRoyalty, maxRoyalty);

  // Pause marketplace during setup
  await marketplace.pause();

  console.log('✅ Marketplace initialized');
}

// Grant roles to deployer
async function grantRoles(marketplace, avatarNFT, deployer) {
  console.log('👑 Granting roles to deployer...');

  // Grant admin role on marketplace
  const ADMIN_ROLE = await marketplace.ADMIN_ROLE();
  await marketplace.grantRole(ADMIN_ROLE, deployer.address);

  // Grant minter role on NFT contract
  const MINTER_ROLE = await avatarNFT.MINTER_ROLE();
  await avatarNFT.grantRole(MINTER_ROLE, deployer.address);

  console.log('✅ Roles granted to deployer');
}

// Create initial avatar NFTs
async function createInitialAvatars(avatarNFT, deployer) {
  console.log('🎨 Creating initial avatar NFTs...');

  const initialAvatars = [
    {
      name: 'Genesis Avatar',
      description: 'The first avatar in the Avatar Platform ecosystem',
      image: 'https://gateway.pinata.cloud/ipfs/QmExample1',
      attributes: [
        { trait_type: 'Rarity', value: 'Legendary' },
        { trait_type: 'Generation', value: 'Genesis' },
        { trait_type: 'Type', value: 'Professional' },
      ],
    },
    {
      name: 'Cyber Avatar',
      description: 'Futuristic cyberpunk-style avatar',
      image: 'https://gateway.pinata.cloud/ipfs/QmExample2',
      attributes: [
        { trait_type: 'Rarity', value: 'Epic' },
        { trait_type: 'Style', value: 'Cyberpunk' },
        { trait_type: 'Type', value: 'Creative' },
      ],
    },
    {
      name: 'Business Professional',
      description: 'Professional business avatar for corporate use',
      image: 'https://gateway.pinata.cloud/ipfs/QmExample3',
      attributes: [
        { trait_type: 'Rarity', value: 'Rare' },
        { trait_type: 'Style', value: 'Business' },
        { trait_type: 'Type', value: 'Professional' },
      ],
    },
  ];

  for (let i = 0; i < initialAvatars.length; i++) {
    const avatar = initialAvatars[i];
    const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(avatar)).toString('base64')}`;

    const tx = await avatarNFT.mint(deployer.address, metadataURI);
    await tx.wait();

    console.log(`✅ Created avatar: ${avatar.name} (Token ID: ${i + 1})`);
  }

  console.log('✅ Initial avatar NFTs created');
}

// Unpause marketplace after setup
async function activateMarketplace(marketplace) {
  console.log('🚀 Activating Marketplace...');

  await marketplace.unpause();

  console.log('✅ Marketplace is now active');
}

// Main deployment functions
module.exports = {
  deployPolygonMainnet,
  deployEthereumMainnet,
  deployArbitrumMainnet,
  initializeMarketplace,
  grantRoles,
  createInitialAvatars,
  activateMarketplace,
};

// Execute deployment based on network
if (require.main === module) {
  const network = hre.network.name;

  async function main() {
    console.log(`🌐 Deploying to network: ${network}`);

    if (network === 'polygon') {
      await deployPolygonMainnet();
    } else if (network === 'ethereum') {
      await deployEthereumMainnet();
    } else if (network === 'arbitrum') {
      await deployArbitrumMainnet();
    } else {
      console.error(`❌ Unknown network: ${network}`);
      process.exit(1);
    }

    console.log('🎉 Deployment completed successfully!');
  }

  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}
