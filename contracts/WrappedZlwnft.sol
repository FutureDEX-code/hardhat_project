// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0

pragma solidity ^0.8.20;

import { Zlwnft } from "./Zlwnft.sol";

contract WrappedZlwnft is Zlwnft {
    constructor(string memory tokenName, string memory tokenSymbol)
        Zlwnft(tokenName, tokenSymbol)
        {}
       
    function mintTokenWithSpecificTokenID(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
    
}