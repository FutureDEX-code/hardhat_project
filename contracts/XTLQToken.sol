// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 1、让FundMe的参与者，基于mapping来领取相应数量的通证
// 2、让FundMe的参与者，transfer通证
// 3、在使用完成后，需要Burn通证

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {FundMe} from "./FundMe.sol";

contract XYLQToken is ERC20, ERC20Permit {

    FundMe fundMe;
    constructor(address _fundMeAddr) ERC20("Xeno Yield Liquidity Quantum", "XYLQ") ERC20Permit("Xeno Yield Liquidity Quantum") {
        fundMe = FundMe(_fundMeAddr);

    }


    function mint(uint256 amountToMint) public 
    {
        require(fundMe.fundersAmountList(msg.sender) >= amountToMint, "you do not have the amout to mint");
        require(fundMe.getFundSuccess(),"zhongchou shibai");
        _mint(msg.sender, amountToMint);
        fundMe.setFunderAmountAfterMint(msg.sender, amountToMint);

    }

    function claim(uint256 amountToClaim) public 
    {
        require(balanceOf(msg.sender) >= amountToClaim, "you do not have enough amount");
        require(fundMe.getFundSuccess(),"zhongchou shibai");
        _burn(msg.sender, amountToClaim);
    }
}
