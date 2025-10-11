const { ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const hardhathelpers = require("@nomicfoundation/hardhat-network-helpers")
const {developmentChains} = require("../../help-hardhat-config")

developmentChains.includes(network.name) ?  
describe("test fundme contract",async function() {

    let fundMe
    let firstAccount
    let secondAccount
    let fundMeSecondAccount
    let thirdAccount
    let fundMeThirdAccount

    beforeEach(async function() {
        await deployments.fixture(["all"])
        firstAccount = (await getNamedAccounts()).firstAccount
        secondAccount = (await getNamedAccounts()).secondAccount
        thirdAccount = (await getNamedAccounts()).thirdAccount
        const fundMeDeployment = await deployments.get("FundMe")
        fundMe = await ethers.getContractAt("FundMe",fundMeDeployment.address)
        const signer = await ethers.getSigner(secondAccount)
        fundMeSecondAccount = await ethers.getContractAt("FundMe", fundMeDeployment.address, signer)
        const signer3 = await ethers.getSigner(thirdAccount)
        fundMeThirdAccount = await ethers.getContractAt("FundMe", fundMeDeployment.address, signer3)
    })

    it("test if the owner is msg.sender", async function() {
        await fundMe.waitForDeployment()
        assert.equal((await fundMe.owner()),firstAccount)
    })

    //it("test if dataFeed is init", async function() {
    //    await fundMe.waitForDeployment()
    //    assert.equal((await fundMe.dataFeed()),"0x694AA1769357215DE4FAC081bf1f309aDC325306")
    //})


    // unit test for fund function
    it("window closed, value greater than minimun, fund failed", 
        async function() {
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)
            await expect(
                fundMe.fund({value: ethers.parseEther("0.1")})
            ).to.be.revertedWith("LOCK TIME IS OVER")
    })

    it("window open, value less than minimun, fund failed", 
        async function() {
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks - 2n)
            await expect(
                fundMe.fund({value: ethers.parseEther("0.0001")})
            ).to.be.revertedWith("Send more ETH")
    })

    it("window open, value greater than minimun, fund success", 
        async function() {
            await fundMe.fund({value: ethers.parseEther("0.1")})
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks - 2n)
            const balance = await fundMe.fundersAmountList(firstAccount)
            expect(balance.toString()).to.equal(ethers.parseEther("0.1").toString());
    })

    //unit test for fundsWithdrawn function
    //1、onlyOwner  2、whenNotPaused  3、windowsClosed 4、target reached 5、 not success
    it("not owner, not paused, windows closed, target reached, not success,fundsWithdrawn failed", 
        async function() {
            await fundMe.fund({value: ethers.parseEther("0.1")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMeSecondAccount.fundsWithdrawn())
                    .to.be.revertedWith("this function can only be called by owner")
    })

    it("owner, paused, windows closed, target reached, not success,fundsWithdrawn failed", 
        async function() {
            await fundMe.pause();
            await hardhathelpers.mine(2n)
            const isPaused = await fundMe.paused();
            expect(isPaused).to.be.true;

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.1")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMe.fundsWithdrawn())
                .to.be.revertedWithCustomError(fundMe, "EnforcedPause")
    })

    it("owner, not paused, windows open, target reached, not success, fundsWithdrawn failed", async function() {
    // 1. 获取部署时的区块号
    const deploymentBlock = await fundMe.deploymentBlockNumber();
    console.log(`部署区块: ${deploymentBlock}`);
    
    // 2. 获取锁定期区块数
    const lockBlocks = await fundMe.LOCK_BLOCKS();
    console.log(`锁定期区块数: ${lockBlocks}`);
    
    // 3. 转入足够资金以达到目标
    const targetEth = ethers.parseEther("2.0");
    await fundMe.fund({value: targetEth});
    
    // 4. 计算需要挖矿的区块数，确保当前区块 < 部署区块 + 锁定期区块数
    // 先获取当前区块号
    const currentBlockBeforeMine = await ethers.provider.getBlockNumber();
    console.log(`挖矿前区块: ${currentBlockBeforeMine}`);
    
    // 计算已过区块（统一用 BigInt）
    const passedBlocks = BigInt(currentBlockBeforeMine) - BigInt(deploymentBlock);
    // 计算需要挖矿的数量，确保锁定期未结束（挖到 lockEnd - 1）
    const blocksToMine = lockBlocks - passedBlocks - 5n;
    console.log(`需要挖矿的区块数: ${blocksToMine}`);

    // 执行挖矿
    if (blocksToMine > 0) {
        await hardhathelpers.mine(blocksToMine);
    }
    
    // 5. 验证当前区块状态
    const currentBlock = await ethers.provider.getBlockNumber();
    const lockEndBlock = deploymentBlock + lockBlocks;
    console.log(`当前区块: ${currentBlock}, 锁定期结束区块: ${lockEndBlock}`);
    console.log(`锁定期是否结束: ${currentBlock >= lockEndBlock}`);
    
    // 6. 尝试调用提款函数
    await expect(fundMe.fundsWithdrawn())
        .to.be.revertedWith("LOCK TIME IS NOT OVER");
    });

    it("owner, not paused, windows closed, target not reached, not success,fundsWithdrawn failed", 
        async function() {
            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMe.fundsWithdrawn())
                    .to.be.revertedWith("TARGET is not reached")
    })


    it("owner, not paused, windows closed, target reached, success,fundsWithdrawn failed", 
        async function() {
            await fundMeSecondAccount.fund({value: ethers.parseEther("0.1")})
            
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await fundMe.fundsWithdrawn();
            
            await expect(fundMe.fundsWithdrawn())
                    .to.be.revertedWith("Funds have already been withdrawn")
    })

    it("owner, not paused, windows closed, target reached, not success,fundsWithdrawn success", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.1")})
            
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMe.fundsWithdrawn())
                .to.emit(fundMe,"FundWithdrawned")
                .withArgs(firstAccount,ethers.parseEther("0.1"))   
    })

    //refund function
    it("paused, windows closed, not success, target not reached, have fund, not refund, refund failed", 
        async function() {

            await fundMe.pause();
            await hardhathelpers.mine(2n)
            const isPaused = await fundMe.paused();
            expect(isPaused).to.be.true;

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMeSecondAccount.refund())
                .to.be.revertedWithCustomError(fundMe, "EnforcedPause")
    })

    it("not paused, windows open, not success, target not reached, have fund, not refund, refund failed", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks - 6n)

            await expect(fundMeSecondAccount.refund())
                .to.be.revertedWith("LOCK TIME IS NOT OVER")
    })

    it("not paused, windows closed, success, target not reached, have fund, not refund, refund failed", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.01")})
            await fundMeThirdAccount.fund({value: ethers.parseEther("0.01")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await fundMe.fundsWithdrawn()

            await expect(fundMeSecondAccount.refund())
                .to.be.revertedWith("Funds have already been withdrawn")
    })

    it("not paused, windows closed, not success, target reached, have fund, not refund, refund failed", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.01")})
            await fundMeThirdAccount.fund({value: ethers.parseEther("0.01")})

            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMeSecondAccount.refund())
                .to.be.revertedWith("TARGET is reached")
    })

    it("not paused, windows closed, not success, target not reached, not fund, not refund, refund failed", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})
            
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMeThirdAccount.refund())
                .to.be.revertedWith("you have not fund")
    })

    it("not paused, windows closed, not success, target not reached, have fund, have refund, refund failed", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})
            
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await fundMeSecondAccount.refund()

            await expect(fundMeSecondAccount.refund())
                .to.be.revertedWith("you have not fund")
    })

    it("not paused, windows closed, not success, target not reached, have fund, not refund, refund success", 
        async function() {

            await fundMeSecondAccount.fund({value: ethers.parseEther("0.001")})
            
            const lockBlocks = await fundMe.LOCK_BLOCKS();
            await hardhathelpers.mine(lockBlocks + 1n)

            await expect(fundMeSecondAccount.refund())
                .to.emit(fundMe,"FundRefunded")
                .withArgs(secondAccount,ethers.parseEther("0"))   
    })



}) : describe.skip 