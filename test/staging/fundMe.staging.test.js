const { ethers, deployments } = require("hardhat")
const { assert, expect } = require("chai")
const hardhathelpers = require("@nomicfoundation/hardhat-network-helpers")
const {developmentChains} = require("../../help-hardhat-config")

!developmentChains.includes(network.name) ?  
describe("test fundme contract",async function() {

    this.timeout(1000000000000);
    let fundMe
    let firstAccount
    
    beforeEach(async function() {
        await deployments.fixture(["all"])
        firstAccount = (await getNamedAccounts()).firstAccount
        const fundMeDeployment = await deployments.get("FundMe")
        fundMe = await ethers.getContractAt("FundMe",fundMeDeployment.address)
    })

    //test fund and fundsWithdrawn success
    it("test fund and fundsWithdrawn success",async function() {
        //make sure target reached
        await fundMe.fund({value: ethers.parseEther("0.001")})
        //make sure time is locked
        await new Promise(r => setTimeout(r, 181*1000));
        const fundsWithdrawnTx = await fundMe.fundsWithdrawn()
        const fundsWithdrawnReceipt = await fundsWithdrawnTx.wait()

        await expect(fundsWithdrawnReceipt)
                .to.emit(fundMe,"FundWithdrawned")
                .withArgs(firstAccount,ethers.parseEther("0.001"))   

    })

    //test fund and refund success 
    it("test fund and refund success",async function() {
        //make sure target not reached
        await fundMe.fund({value: ethers.parseEther("0.0004")})
        //make sure time is locked
        await new Promise(r => setTimeout(r, 181*1000));
        const refundTx = await fundMe.refund()
        const refundReceipt = await refundTx.wait()

        await expect(refundReceipt)
                .to.emit(fundMe,"FundRefunded")
                .withArgs(firstAccount,ethers.parseEther("0.0004"))   

    })
}) : describe.skip 