const devlopmentChains = ["hardhat","local"]
const networkConfig = {
    11155111: {
        ethUsdDataFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
    },
    31337:{
        ethUsdDataFeed: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    }
}
const LOCK_TIME = 7200

module.exports = {
    devlopmentChains,
    networkConfig,
    LOCK_TIME
}