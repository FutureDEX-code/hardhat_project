module.exports = async ({getNamedAccounts,deployments}) => {

    const firstAccount = await getNamedAccounts();
    const {deploy,log} = deployments;

    log("Deploying the contract...");
    await deploy("Zlwnft",{
        contract: "Zlwnft",
        from: firstAccount,
        log: true,
        args: ["ZLW NFT","ZLW"]
    })

    log("Deployed the contract...");


}

module.exports.tags = ["all","Zlwnft"];