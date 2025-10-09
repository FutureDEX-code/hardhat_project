const { task } = require("hardhat/config")

task("deploy-fundme").setAction(async(taskArgs,hre) => {

    //create factory
    const fundMefactory = await ethers.getContractFactory("FundMe");
    console.log("contract deploying")

    //deploy contract from factory
    const fundMe = await fundMefactory.deploy(7200);
    await fundMe.waitForDeployment();
    console.log("contract has been deployed successfully,contract address is " + fundMe.target);

   
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY)
    {
        console.log("Waiting for 5 confirmations");
        await hre.run("verify:verify", {
            address: fundMe.address,
            constructorArguments:[7200],
        });
        console.log("contract has been verified successfully");
    }
    else{
        console.log("verification is skiped .....")
    }

})

async function verifyFundMe(fundMeAddr, input) {
     
    await hre.run("verify:verify",{
        address: fundMeAddr,
        constructorArguments:[input]
    });
    
}

module.exports = {}