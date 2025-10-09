// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelloWorld {
    // 存储问候消息
    string public greet = "Hello World";

    // 获取问候消息的函数
    function getGreeting() public view returns (string memory) {
        return greet;
    }
}