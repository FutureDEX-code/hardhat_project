module.exports = async ({getNamedAccounts,deployments}) => {

    const firstAccount = await getNamedAccounts();
    const {deploy,log} = deployments;

    log("Deploying the contract...");
    await deploy("WrappedZlwnft",{
        contract: "WrappedZlwnft",
        from: firstAccount,
        log: true,
        args: ["WrappedZlw NFT","WZLW"]
    })

    log("Deployed the contract...");


}

module.exports.tags = ["all","WrappedZlwnft"];