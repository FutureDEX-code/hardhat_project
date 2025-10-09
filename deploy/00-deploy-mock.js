const {network} = require("hardhat")
const {developmentChains,networkConfig,LOCK_TIME} = require("../help-hardhat-config")

module.exports = async({getNamedAccounts,deployments}) => {


    if (developmentChains.includes( network.name )){
        const {firstAccount} = await getNamedAccounts()
        const {deploy} = deployments
    
        await deploy("MockDataFeed", {
            from: firstAccount,
            args: [8,200000000000,1],
            log: true
        })
    }
    else{
        console.log("You are on a real network, no need to deploy mocks!")
    }
    
}

module.exports.tags = ["all","mock"]