require("@nomicfoundation/hardhat-toolbox");

require("@chainlink/env-enc").config()

require("@nomicfoundation/hardhat-verify");
require("./tasks")

const SEPOLIA_URL = process.env.SEPOLIA_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: "0.8.24",
  networks:{
    sepolia:{
      url: SEPOLIA_URL,
      accounts:[PRIVATE_KEY, PRIVATE_KEY_2, PRIVATE_KEY_3],
      chainId: 11155111
    }
  },
  // 配置验证插件（关键步骤）
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY, // 对应网络的 API 密钥
      mainnet: ETHERSCAN_API_KEY
      // 其他网络（如 polygon: "POLYGONSCAN_API_KEY"）
    }
  }
};
