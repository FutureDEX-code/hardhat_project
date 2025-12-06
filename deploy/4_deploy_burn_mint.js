module.exports = async ({getNamedAccounts,deployments}) => {

    const firstAccount = await getNamedAccounts();
    const {deploy,log} = deployments;

    const ccipSimulatorDeployment = await deployments.get("CCIPLocalSimulator");
    const ccipSimulator = await ethers.getContractAt("CCIPLocalSimulator",ccipSimulatorDeployment.address);
    const ccipConfig = await ccipSimulator.getConfig();

    const destinationRouter = ccipConfig.destinationRouter_ 
    const linkTokenAddr = ccipConfig.linkToken_

    console.log("sourceChainRouter:",sourceChainRouter);
    console.log("linkTokenAddr:",linkTokenAddr);

    const WrappedZlwnftDeployment = await deployments.get("WrappedZlwnft");
    const wnftAddr = WrappedZlwnftDeployment.address;

    log("NFTPoolBurnAndMint the contract...");

    await deploy("NFTPoolBurnAndMint",{
        contract: "NFTPoolBurnAndMint",
        from: firstAccount,
        log: true,
        args: [destinationRouter,linkTokenAddr,wnftAddr]
    })

    log("Deployed the contract...");


}

module.exports.tags = ["all","NFTPoolBurnAndMint"];