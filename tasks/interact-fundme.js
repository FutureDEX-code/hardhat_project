const { task } = require("hardhat/config")

task("interact-fundme")
    .addParam("addr","fundme contract address")
    .setAction(async(taskArgs,hre) => {

        const fundMeFactory = await ethers.getContractFactory("FundMe")
        const fundMe = fundMeFactory.attach(taskArgs.addr)
        //init 2 accounts
        const [firstAccount, secondAccount, thirdAccount ] = await ethers.getSigners();

        //fund contract with first account
        const fundTx = await fundMe.connect(thirdAccount).fund({value: ethers.parseEther("0.001")});
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

})

async function verifyFundMe(fundMeAddr, input) {
     
    await hre.run("verify:verify",{
        address: fundMeAddr,
        constructorArguments:[input]
    });
    
}

module.exports = {}