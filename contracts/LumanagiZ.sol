// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract LumanagiZ is Ownable, ReentrancyGuard, Pausable {      
    // ============ 结构体 ============
    struct Round {
        uint256 epoch;                    // 轮次编号
        uint256 startTimestamp;           // 本轮开始时间
        uint256 lockTimestamp;            // 锁盘时间（不可下注）
        uint256 closeTimestamp;           // 收盘时间（结束）
        int256 lockPrice;                 // 锁盘时的价格（Chainlink）
        int256 closePrice;                // 收盘时的价格（Chainlink）
        uint256 totalAmount;              // 本轮总奖池（wei）
        uint256 bullAmount;               // 看涨总金额
        uint256 bearAmount;               // 看跌总金额
        uint256 rewardBaseCalAmount;      // 奖励计算基数（赢家池子）
        uint256 rewardAmount;             // 本轮实际发放奖励
        bool oracleCalled;                // 是否已调用预言机结算
    }

    struct BetInfo {
        uint256 amount;                   // 下注金额
        bool claimed;                     // 是否已领取
        bool position;                    // true = Bull（看涨）, false = Bear（看跌）
    }

    // ============ 状态变量 ============
    uint256 public currentEpoch;          // 当前轮次

    mapping(uint256 => Round) public rounds;
    mapping(address => mapping(uint256 => BetInfo)) public ledger; // 用户下注记录

    uint256 public constant INTERVAL_SECONDS = 5 minutes;      // 每轮时长 5 分钟
    uint256 public constant BUFFER_SECONDS = 30;               // 锁盘前 30 秒不可下注
    uint256 public constant MIN_BET_AMOUNT = 0.01 ether;       // 最小下注 0.01 MATIC
    uint256 public constant TREASURY_FEE = 300;                // 3% 归国库（300 = 3%）
    uint256 public constant MAX_TREASURY_FEE = 1000;           // 最大 10%

    address public admin;                     // 管理员（可触发结算）
    address public operator;                  // 运营地址（可触发结算）
    address public treasury;                  // 国库地址

    AggregatorV3Interface public oracle;      // Chainlink 价格预言机（如 BTC/USD）

    // ============ 事件（前端必须监听这些！）============
    event StartRound(uint256 indexed epoch, uint256 startTimestamp);
    event LockRound(uint256 indexed epoch, uint256 lockTimestamp, int256 lockPrice);
    event CloseRound(uint256 indexed epoch, uint256 closeTimestamp, int256 closePrice);
    event EndRound(uint256 indexed epoch, uint256 bullPayout, uint256 bearPayout);

    event BetBull(address indexed user, uint256 indexed epoch, uint256 amount);
    event BetBear(address indexed user, uint256 indexed epoch, uint256 amount);

    event Claim(address indexed user, uint256[] epochs, uint256 amount);
    event FeesClaimed(uint256 treasuryAmount);

    // ============ 构造函数 ============
    constructor(
        address _oracle,        // Chainlink 预言机地址（Polygon BTC/USD: 0x007A22900a3B98143368Bd5906f8E17eD617a530）
        address _admin,
        address _treasury
    )Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle");
        require(_treasury != address(0), "Invalid treasury");

        oracle = AggregatorV3Interface(_oracle);
        admin = _admin;
        operator = msg.sender;
        treasury = _treasury;

        uint256 genesisEpoch = block.timestamp / INTERVAL_SECONDS;
        currentEpoch = genesisEpoch;

        _startRound(genesisEpoch);
    }

    // ============ 外部函数 ============
    /** 开始新轮 */
    function startRound() external onlyOwner {
        require(rounds[currentEpoch].closePrice > 0, "Round not closed");
        _startRound(currentEpoch + 1);
    }

    /** 看涨下注 */
    function betBull(uint256 epoch) external payable whenNotPaused nonReentrant {
        require(msg.value >= MIN_BET_AMOUNT, "Bet amount too low");
        require(_bettable(epoch), "Round not bettable");
        require(ledger[msg.sender][epoch].amount == 0, "Already bet");

        rounds[epoch].bullAmount += msg.value;
        rounds[epoch].totalAmount += msg.value;

        ledger[msg.sender][epoch] = BetInfo({
            amount: msg.value,
            position: true,
            claimed: false
        });

        emit BetBull(msg.sender, epoch, msg.value);
    }

    /** 看跌下注 */
    function betBear(uint256 epoch) external payable whenNotPaused nonReentrant {
        require(msg.value >= MIN_BET_AMOUNT, "Bet amount too low");
        require(_bettable(epoch), "Round not bettable");
        require(ledger[msg.sender][epoch].amount == 0, "Already bet");

        rounds[epoch].bearAmount += msg.value;
        rounds[epoch].totalAmount += msg.value;

        ledger[msg.sender][epoch] = BetInfo({
            amount: msg.value,
            position: false,
            claimed: false
        });

        emit BetBear(msg.sender, epoch, msg.value);
    }

    /** 领取多轮奖励 */
    function claim(uint256[] calldata epochs) external nonReentrant {
        require(epochs.length > 0 && epochs.length <= 100, "Invalid epochs");

        uint256 reward = 0;
        for (uint256 i = 0; i < epochs.length; i++) {
            uint256 epoch = epochs[i];
            require(rounds[epoch].closePrice > 0, "Round not closed");
            require(!ledger[msg.sender][epoch].claimed, "Already claimed");

            if (_isClaimable(msg.sender, epoch)) {
                uint256 userReward = _calculatePayout(msg.sender, epoch);
                if (userReward > 0) {
                    reward += userReward;
                    ledger[msg.sender][epoch].claimed = true;
                }
            }
        }

        if (reward > 0) {
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "Transfer failed");
        }

        emit Claim(msg.sender, epochs, reward);
    }

    /** 管理员执行结算（可由后端定时调用） */
    function executeRound() external onlyOperatorOrOwner {
        uint256 epoch = currentEpoch;

        if (block.timestamp >= rounds[epoch].lockTimestamp && rounds[epoch].lockPrice == 0) {
            _lockRound(epoch);
        }

        if (block.timestamp >= rounds[epoch].closeTimestamp && !rounds[epoch].oracleCalled) {
            _closeRound(epoch);
            _calculateRewards(epoch);
            _startNextRound();
        }
    }

    // ============ 内部函数 ============

    function _bettable(uint256 epoch) internal view returns (bool) {
        return
            rounds[epoch].startTimestamp != 0 &&
            block.timestamp > rounds[epoch].startTimestamp &&
            block.timestamp < rounds[epoch].lockTimestamp;
    }

    function _safeGetPrice() internal view returns (int256 price, uint8 decimals) {
        (, int256 answer, , uint256 updatedAt, ) = oracle.latestRoundData();
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= 3600, "Oracle stale");
        return (answer, oracle.decimals());
    }

    function _startRound(uint256 epoch) internal {
        uint256 startTime = epoch * INTERVAL_SECONDS;
        rounds[epoch] = Round({
            epoch: epoch,
            startTimestamp: startTime,
            lockTimestamp: startTime + INTERVAL_SECONDS - BUFFER_SECONDS,
            closeTimestamp: startTime + INTERVAL_SECONDS,
            lockPrice: 0,
            closePrice: 0,
            totalAmount: 0,
            bullAmount: 0,
            bearAmount: 0,
            rewardBaseCalAmount: 0,
            rewardAmount: 0,
            oracleCalled: false
        });

        emit StartRound(epoch, startTime);
    }

    function _lockRound(uint256 epoch) internal {
        (int256 price, ) = _safeGetPrice();
        rounds[epoch].lockPrice = price;
        emit LockRound(epoch, rounds[epoch].lockTimestamp, price);
    }

    function _closeRound(uint256 epoch) internal {
        (int256 price, ) = _safeGetPrice();
        rounds[epoch].closePrice = price;
        rounds[epoch].oracleCalled = true;
        emit CloseRound(epoch, rounds[epoch].closeTimestamp, price);
    }

    function _calculateRewards(uint256 epoch) internal {
        Round storage round = rounds[epoch];
        if (round.lockPrice == 0 || round.closePrice == 0) return;

        bool bullWin = round.closePrice > round.lockPrice;

        uint256 winnerPool = bullWin ? round.bullAmount : round.bearAmount;
        uint256 loserPool = bullWin ? round.bearAmount : round.bullAmount;

        if (winnerPool == 0) {
            round.rewardBaseCalAmount = round.totalAmount;
            round.rewardAmount = round.totalAmount;
            return;
        }

        uint256 treasuryAmount = (round.totalAmount * TREASURY_FEE) / 10000;
        uint256 rewardPool = round.totalAmount - treasuryAmount;

        round.rewardBaseCalAmount = winnerPool;
        round.rewardAmount = rewardPool;

        // 国库归集
        if (treasuryAmount > 0) {
            (bool success, ) = treasury.call{value: treasuryAmount}("");
            if (success) emit FeesClaimed(treasuryAmount);
        }

        emit EndRound(epoch, bullWin ? rewardPool : 0, bullWin ? 0 : rewardPool);
    }

    function _startNextRound() internal {
        currentEpoch++;
        _startRound(currentEpoch);
    }

    function _isClaimable(address user, uint256 epoch) internal view returns (bool) {
        BetInfo memory bet = ledger[user][epoch];
        if (bet.amount == 0) return false;

        Round memory round = rounds[epoch];
        if (round.closePrice == 0) return false;

        bool bullWin = round.closePrice > round.lockPrice;
        return bet.position == bullWin;
    }

    function _calculatePayout(address user, uint256 epoch) internal view returns (uint256) {
        BetInfo memory bet = ledger[user][epoch];
        Round memory round = rounds[epoch];

        if (!_isClaimable(user, epoch)) return 0;
        if (round.rewardBaseCalAmount == 0) return 0;

        return (bet.amount * round.rewardAmount) / round.rewardBaseCalAmount;
    }

    // ============ 管理员函数 ============
    modifier onlyOperatorOrOwner() {
        require(msg.sender == operator || msg.sender == owner(), "Not operator/owner");
        _;
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View 函数（前端要用） ============
    function getUserRounds(address user) external view returns (uint256[] memory, bool[] memory, bool[] memory, uint256[] memory) {
        // 返回用户参与的所有轮次 + 是否可领 + 是否已领 + 下注金额（正=看涨，负=看跌）
        // 前端已实现，此处可省略具体实现
    }

    function getCurrentEpoch() external view returns (uint256) {
        return currentEpoch;
    }
}