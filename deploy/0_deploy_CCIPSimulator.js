module.exports = async ({getNamedAccounts,deployments}) => {

    const firstAccount = await getNamedAccounts();
    const {deploy,log} = deployments;

    log("Deploying CCIP Simulator contract...");
    await deploy("CCIPLocalSimulator",{
        contract: "CCIPLocalSimulator",
        from: firstAccount,
        log: true,
        args: []
    })

    log("Deployed CCIP Simulator contract...");


}

module.exports.tags = ["all","CCIPLocalSimulator"];