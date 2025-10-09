const { ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const hardhathelpers = require("@nomicfoundation/hardhat-network-helpers")

describe("test fundme contract",async function() {

    let fundMe
    let firstAccount
    let secondAccount
    let fundMeSecondAccount
    let thirdAccount

    beforeEach(async function() {
        await deployments.fixture(["all"])
        firstAccount = (await getNamedAccounts()).firstAccount
        secondAccount = (await getNamedAccounts()).secondAccount
        const fundMeDeployment = await deployments.get("FundMe")
        fundMe = await ethers.getContractAt("FundMe",fundMeDeployment.address)
        const signer = await ethers.getSigner(secondAccount)
        fundMeSecondAccount = await ethers.getContractAt("FundMe", fundMeDeployment.address, signer)
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


})