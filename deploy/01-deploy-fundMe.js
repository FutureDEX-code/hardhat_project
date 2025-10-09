
const {network} = require("hardhat")
const {devlopmentChains,networkConfig,LOCK_TIME} = require("../help-hardhat-config")


module.exports = async({getNamedAccounts,deployments}) => {

    const {firstAccount} = await getNamedAccounts()
    const {deploy} = deployments

    let dataFeedAddress
    if (devlopmentChains.includes( network.name ))
    {
        const dataFeed = await deployments.get("MockDataFeed")
        dataFeedAddress = dataFeed.address
    }
    else{
        dataFeedAddress = networkConfig[network.config.chainId].ethUsdDataFeed
    }
    
    const fundMe = await deploy("FundMe", {
        from: firstAccount,
        args: [LOCK_TIME, dataFeedAddress],
        log: true
    })


    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY){
        await hre.run("verify:verify", {
            address: fundMe.address,
            constructorArguments:[LOCK_TIME, dataFeedAddr],
        });
    }
}

module.exports.tags = ["all","fundme"]