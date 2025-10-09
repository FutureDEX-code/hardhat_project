const { task } = require("hardhat/config")

task("fund-withdraw","Allows owner to withdraw funds after target is reached")
    .addParam("addr","Address of the FundMe contract")
    .setAction(async(taskArgs,hre) => {

        const fundMeFactory = await ethers.getContractFactory("FundMe")
        const fundMe = fundMeFactory.attach(taskArgs.addr)
        //init  accounts
        const [firstAccount] = await ethers.getSigners();

        // 检查当前是否可以提款（锁定期是否结束）
        const deploymentBlock = await fundMe.deploymentBlockNumber();
        const lockBlocks = await fundMe.LOCK_BLOCKS();
        const currentBlock = await ethers.provider.getBlockNumber();
        
        if (currentBlock < deploymentBlock + lockBlocks) {
            console.error(`Lock period not over yet. Current block: ${currentBlock}, Unlock block: ${deploymentBlock + lockBlocks}`);
            return;
        }

        
        const fundTx = await fundMe.connect(firstAccount).fundsWithdrawn();
        await fundTx.wait();
        console.log("Funds withdrawn successfully!");

        //check balance of contract
        const balanceContract = await ethers.provider.getBalance(fundMe.target)
        console.log(`Balance of contract is ${balanceContract}`)

        const result = await fundMe.getFundSuccess()
        console.log(`Balance of contract is ${result}`)

})

module.exports = {}