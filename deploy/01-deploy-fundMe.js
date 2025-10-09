
const {network} = require("hardhat")
const {developmentChains,networkConfig,LOCK_BLOCKS,CONFIRMATIONS} = require("../help-hardhat-config")


module.exports = async({getNamedAccounts,deployments}) => {

    const {firstAccount} = await getNamedAccounts()
    const {deploy} = deployments

    let dataFeedAddress
    let confirmations
    if (developmentChains.includes( network.name ))
    {
        const dataFeed = await deployments.get("MockDataFeed")
        dataFeedAddress = dataFeed.address
        confirmations = 0
    }
    else{
        dataFeedAddress = networkConfig[network.config.chainId].ethUsdDataFeed
        confirmations = CONFIRMATIONS
    }
    
    const fundMe = await deploy("FundMe", {
        from: firstAccount,
        args: [LOCK_BLOCKS, dataFeedAddress],
        log: true,
        waitConfirmations: confirmations
    })

    console.log("FundMe deployed at: ", fundMe.address)


    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY){
        await hre.run("verify:verify", {
            address: fundMe.address,
            constructorArguments:[LOCK_BLOCKS, dataFeedAddress],
        });
    }
    else{
        console.log("You are on a local network, no need to verify!")
    }
}

module.exports.tags = ["all","fundme"]