// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
//1、创建一个收款函数

//2、记录投资人并且查看

//3、在锁定期内，达到目标值，生厂商可以提款

//4、在锁定期内，没有达到目标值，投资人在锁定期以后退款

contract FundMe is ReentrancyGuard, Pausable
{
    mapping(address => uint256) public fundersAmountList;

    uint256 constant MINIMUM_VALUE = 1 * 10 ** 18; //1 USD

    uint256 constant TARGET = 2 * 10 ** 18;

    AggregatorV3Interface internal immutable dataFeed;

    address public owner;

    event Funded(address indexed funder, uint256 amount);

    event FundWithdrawned(address indexed funder, uint256 amount);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event FundRefunded(address indexed funder, uint256 amount);

    uint256 public immutable deploymentBlockNumber;

    uint256 public constant PRICE_ORACLE_TIMEOUT = 1800;

    // 锁定期（以区块数表示，如2880块≈12小时，基于15秒/块计算）
    uint256 public immutable LOCK_BLOCKS; 

    address xYLQToken;

    bool public getFundSuccess = false;

    constructor(uint256 _lockblocks)
    {
        //Sepolia testnet
        dataFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
        owner = msg.sender;
        deploymentBlockNumber = block.number; // 记录部署时的区块编号
        LOCK_BLOCKS = _lockblocks;
        emit OwnershipTransferred(address(0), owner);
    }
    
    function fund() external payable 
    {
        require(convertEthToUsd(msg.value) >= MINIMUM_VALUE,"Send more ETH");
        require(block.number < deploymentBlockNumber + LOCK_BLOCKS,"LOCK TIME IS OVER");
        fundersAmountList[msg.sender] += msg.value;

        emit Funded(msg.sender, msg.value);
    }

    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = dataFeed.latestRoundData();

        // 验证返回值的有效性
        require(answer > 0, "Invalid price");
        require(updatedAt != 0, "Round not complete");
        require(answeredInRound >= roundId, "Stale price");
        uint256 safeTimeout = PRICE_ORACLE_TIMEOUT + 30; 

        require(block.timestamp - updatedAt < safeTimeout, "Price too old");
        return answer;
    }

    function getCurrentTime() public view returns(uint256)
    {
        return block.timestamp;
    }

    function convertEthToUsd(uint256 ethAmount) internal view returns (uint256)
    {
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        return ethAmount * ethPrice / (10 ** 8);
        /*precision is 10**8  x / eth = 10 ** 18 */
    }

    function fundsWithdrawn() external onlyOwner nonReentrant whenNotPaused windowsClosed
    {
        //Check
        require(convertEthToUsd(address(this).balance) >= TARGET,"TARGET is not reached");
        require(!getFundSuccess,"Funds have already been withdrawn");

        //Effects
        fundersAmountList[msg.sender] = 0;
        getFundSuccess = true;
        uint256 amount = address(this).balance;

        //Interactions
        bool success;
        (success, ) = payable (msg.sender).call{value: address(this).balance}("");
        require(success,"transfer tx failed");

        emit FundWithdrawned(msg.sender, amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function transferOwnership(address newOwner) public onlyOwner
    {
        require(newOwner != address(0), "New owner cannot be the zero address");

        address oldOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function refund() external nonReentrant whenNotPaused windowsClosed 
    {
        require(!getFundSuccess,"Funds have already been withdrawn");
        require(convertEthToUsd(address(this).balance) < TARGET,"TARGET is reached");
        require(fundersAmountList[msg.sender] != 0,"you have not fund");

        fundersAmountList[msg.sender] = 0;
        emit FundRefunded(msg.sender, fundersAmountList[msg.sender]);

        bool success;
        (success, ) = payable (msg.sender).call{value: fundersAmountList[msg.sender]}("");
        require(success,"transfer tx failed");
    }

    function setXYLQToken(address _xylqToken) public onlyOwner
    {
        require(_xylqToken != address(0), "New owner cannot be the zero address");
        xYLQToken = _xylqToken;
    }

    function setFunderAmountAfterMint(address _addr, uint256 _amout) external
    {
        require(msg.sender == xYLQToken,"the wrong function caller");
        fundersAmountList[_addr] -= _amout;
    }

    modifier windowsClosed()
    {
        require(block.number >= deploymentBlockNumber + LOCK_BLOCKS,"LOCK TIME IS NOT OVER");
        _;
    }

    modifier onlyOwner()
    {
        require(owner == msg.sender,"this function can only be called by owner");
        _;
    }
}