module.exports = async ({getNamedAccounts,deployments}) => {

    const firstAccount = await getNamedAccounts();
    const {deploy,log} = deployments;

    const ccipSimulatorDeployment = await deployments.get("CCIPLocalSimulator");
    const ccipSimulator = await ethers.getContractAt("CCIPLocalSimulator",ccipSimulatorDeployment.address);
    const ccipConfig = await ccipSimulator.getConfig();

    const sourceChainRouter = ccipConfig.sourceRouter_ 
    const linkTokenAddr = ccipConfig.linkToken_

    console.log("sourceChainRouter:",sourceChainRouter);
    console.log("linkTokenAddr:",linkTokenAddr);

    const ZlwnftDeployment = await deployments.get("Zlwnft");
    const nftAddr = ZlwnftDeployment.address;

    log("NFTPoolLockAndRelease the contract...");
    await deploy("NFTPoolLockAndRelease",{
        contract: "NFTPoolLockAndRelease",
        from: firstAccount,
        log: true,
        args: [sourceChainRouter,linkTokenAddr,nftAddr]
    })

    log("Deployed the contract...");


}

module.exports.tags = ["all","NFTPoolLockAndRelease"];