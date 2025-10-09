module.exports = async({getNamedAccounts,deployments}) => {
    const {firstAccount} = await getNamedAccounts()
    const {deploy} = deployments
    
    await deploy("MockDataFeed", {
        from: firstAccount,
        args: [8,200000000000,1],
        log: true
    })
}

module.exports.tags = ["all","mock"]