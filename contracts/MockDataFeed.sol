// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockDataFeed is AggregatorV3Interface {
    uint8 public override decimals;
    string public override description;
    uint256 public override version;

    // 内部最新数据（非接口暴露，无需 override）
    int256 public realLatestAnswer;
    uint256 public realLatestTimestamp;
    uint256 public realLatestRound;

    // 历史数据映射
    mapping(uint256 => int256) public getAnswer;
    mapping(uint256 => uint256) public getTimestamp;
    mapping(uint256 => uint256) public getUpdatedAt;

    constructor(
        uint8 _decimals,
        int256 _initialAnswer,
        string memory _description
    ) {
        decimals = _decimals;
        description = _description;
        version = 0;

        realLatestAnswer = _initialAnswer;
        realLatestTimestamp = block.timestamp;
        realLatestRound = 0;

        getAnswer[0] = _initialAnswer;
        getTimestamp[0] = block.timestamp;
        getUpdatedAt[0] = block.timestamp;
    }

    // 更新答案（用于测试）
    function updateAnswer(int256 _answer) public {
        realLatestAnswer = _answer;
        realLatestTimestamp = block.timestamp;
        realLatestRound++;

        getAnswer[realLatestRound] = _answer;
        getTimestamp[realLatestRound] = block.timestamp;
        getUpdatedAt[realLatestRound] = block.timestamp;
    }

    // 接口实现：最新 round 数据
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            uint80(realLatestRound),
            realLatestAnswer,
            realLatestTimestamp,
            realLatestTimestamp,
            uint80(realLatestRound)
        );
    }

    // 接口实现：指定 round 数据
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            getAnswer[uint256(_roundId)],
            getTimestamp[uint256(_roundId)],
            getUpdatedAt[uint256(_roundId)],
            _roundId
        );
    }


}