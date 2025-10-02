const { ethers} = require("hardhat") 
const hre = require("hardhat")

async function main(){
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
        await fundMe.deploymentTransaction().wait(5);
        await verifyFundMe(fundMe.target,25);
    }
    else{
        console.log("verification is skiped .....")
    }

    //init 2 accounts
    const [firstAccount, secondAccount] = await ethers.getSigners();

    //fund contract with first account
    const fundTx = await fundMe.fund({value: ethers.parseEther("0.001")});
    await fundTx.wait();

    //check balance of contract
    const balanceContract = await ethers.provider.getBalance(fundMe.target)
    console.log(`Balance of contract is ${balanceContract}`)

    //fund contract with second account
    const fundTxWithSecond = await fundMe.connect(secondAccount).fund({value: ethers.parseEther("0.001")});
    await fundTxWithSecond.wait();

    //check balance of contract
    const balanceContractSecond = await ethers.provider.getBalance(fundMe.target)
    console.log(`Balance of contract is ${balanceContractSecond}`)

    //check mapping
    const firstAccountbalanceInFundMe = await fundMe.fundersAmountList(firstAccount.address);
    const secondAccountbalanceInFundMe = await fundMe.fundersAmountList(secondAccount.address);
    console.log(`${firstAccount.address} is ${firstAccountbalanceInFundMe}`);
    console.log(`${secondAccount.address} is ${secondAccountbalanceInFundMe}`);

}

async function verifyFundMe(fundMeAddr, input) {
     
    await hre.run("verify:verify",{
        address: fundMeAddr,
        constructorArguments:[input]
    });
    
}




main()
        .then(() => process.exit(0))
        .catch( (error) => {
        console.error(error);
        process.exit(1);
    })