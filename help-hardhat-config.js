const developmentChains = ["hardhat","local"]
const CONFIRMATIONS = 5
const networkConfig = {
    11155111: {
        ethUsdDataFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    },
    31337:{
        ethUsdDataFeed: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    }
}

const LOCK_BLOCKS = 12  //3 minutes
//2880 blocks = 12 hours


module.exports = {
    developmentChains,
    networkConfig,
    LOCK_BLOCKS,
    CONFIRMATIONS
}