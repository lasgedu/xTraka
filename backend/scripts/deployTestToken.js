/**
 * Deploy TestUSDC token to Arbitrum Sepolia and mint initial supply.
 *
 * Usage:
 *   PRIVATE_KEY=0x... RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY node scripts/deployTestToken.js
 *
 * Requirements:
 *   - The wallet must have Arbitrum Sepolia ETH for gas (free from faucets)
 */

const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')

// Minimal ERC-20 ABI + bytecode (compiled from TestUSDT.sol)
// We inline the compiled output so there's no need for a Solidity compiler on the server.

const CONTRACT_ABI = [
    'constructor()',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function mint(address to, uint256 amount)',
    'function owner() view returns (address)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
]

// Bytecode compiled from the TestUSDT.sol contract using solc 0.8.20
// To regenerate: solc --bin --optimize contracts/TestUSDT.sol
// For convenience we provide a precompiled bytecode below.
// If you need to recompile, install solc and run the command above.
const CONTRACT_BYTECODE =
    '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610c52806100606000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806340c10f191161007157806340c10f191461016857806370a082311461018457806395d89b41146101b4578063a9059cbb146101d2578063dd62ed3e14610202578063f2fde38b14610232576100a9565b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd1461011a578063313ce5671461014a575b600080fd5b6100b661024e565b6040516100c39190610953565b60405180910390f35b6100e660048036038101906100e191906109e2565b610287565b6040516100f39190610a3d565b60405180910390f35b610104610379565b6040516101119190610a67565b60405180910390f35b610134600480360381019061012f9190610a82565b61037f565b6040516101419190610a3d565b60405180910390f35b610152610600565b60405161015f9190610af1565b60405180910390f35b610182600480360381019061017d91906109e2565b610605565b005b61019e60048036038101906101999190610b0c565b610735565b6040516101ab9190610a67565b60405180910390f35b6101bc61074d565b6040516101c99190610953565b60405180910390f35b6101ec60048036038101906101e791906109e2565b610786565b6040516101f99190610a3d565b60405180910390f35b61021c60048036038101906102179190610b39565b6108f3565b6040516102299190610a67565b60405180910390f35b61024c60048036038101906102479190610b0c565b610918565b005b6040518060400160405280601081526020017f785472616b61205465737420555344540000000000000000000000000000000081525081565b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103679190610a67565b60405180910390a36001905092915050565b60015481565b600081600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015610403576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103fa90610bc5565b60405180910390fd5b81600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410156104c1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104b890610c31565b60405180910390fd5b81600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461054c9190610c80565b9250508190555081600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461054c9190610c80565b9250508190555081600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105f79190610cb4565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516106549190610a67565b60405180910390a36001905092915050565b600681565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610698576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161068f90610d34565b60405180910390fd5b8060016000828254610ac09190610cb4565b9250508190555080600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107069190610cb4565b925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167f...'

// ----- IMPORTANT -----
// The bytecode above is a placeholder. We'll use ethers ContractFactory with
// Solidity source compilation at deploy time instead.
// We use solc-js for in-process compilation.

async function main() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY
    const RPC_URL = process.env.RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/demo'
    const INITIAL_MINT = process.env.INITIAL_MINT || '1000000' // 1M tokens

    if (!PRIVATE_KEY) {
        console.error('❌ Set PRIVATE_KEY environment variable')
        console.error('Usage: PRIVATE_KEY=0x... RPC_URL=https://... node scripts/deployTestToken.js')
        process.exit(1)
    }

    console.log('🚀 Deploying TestUSDC to Arbitrum Sepolia...\n')

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

    const network = await provider.getNetwork()
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`)
    console.log(`Deployer: ${wallet.address}`)

    const balance = await provider.getBalance(wallet.address)
    console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH\n`)

    if (balance === 0n) {
        console.error('❌ Wallet has no ETH. Get free Arbitrum Sepolia ETH from:')
        console.error('   https://www.alchemy.com/faucets/arbitrum-sepolia')
        process.exit(1)
    }

    // Read and compile the Solidity source
    const sourcePath = path.join(__dirname, '..', 'contracts', 'TestUSDC.sol')
    const source = fs.readFileSync(sourcePath, 'utf8')

    let solc
    try {
        solc = require('solc')
    } catch {
        console.error('❌ solc not installed. Run: npm install solc')
        process.exit(1)
    }

    const input = {
        language: 'Solidity',
        sources: { 'TestUSDC.sol': { content: source } },
        settings: {
            optimizer: { enabled: true, runs: 200 },
            outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
        },
    }

    console.log('⚙️  Compiling contract...')
    const output = JSON.parse(solc.compile(JSON.stringify(input)))

    if (output.errors) {
        const errors = output.errors.filter((e) => e.severity === 'error')
        if (errors.length > 0) {
            console.error('❌ Compilation errors:')
            errors.forEach((e) => console.error(e.formattedMessage))
            process.exit(1)
        }
    }

    const compiled = output.contracts['TestUSDC.sol']['TestUSDC']
    const abi = compiled.abi
    const bytecode = '0x' + compiled.evm.bytecode.object

    console.log('✅ Compilation successful\n')

    // Deploy
    console.log('📦 Deploying contract...')
    const factory = new ethers.ContractFactory(abi, bytecode, wallet)
    const contract = await factory.deploy()
    await contract.waitForDeployment()

    const contractAddress = await contract.getAddress()
    console.log(`✅ Contract deployed at: ${contractAddress}\n`)

    // Mint initial supply (amount in token units, 6 decimals)
    const mintAmount = ethers.parseUnits(INITIAL_MINT, 6)
    console.log(`🪙 Minting ${INITIAL_MINT} xUSDC to ${wallet.address}...`)
    const mintTx = await contract.mint(wallet.address, mintAmount)
    await mintTx.wait()
    console.log(`✅ Minted! Tx: ${mintTx.hash}\n`)

    // Verify
    const bal = await contract.balanceOf(wallet.address)
    console.log(`📊 Wallet balance: ${ethers.formatUnits(bal, 6)} xUSDC`)

    console.log('\n========================================')
    console.log('SAVE THESE VALUES IN YOUR backend/.env:')
    console.log('========================================')
    console.log(`TOKEN_CONTRACT_ADDRESS=${contractAddress}`)
    console.log(`ARBITRUM_SEPOLIA_RPC_URL=${RPC_URL}`)
    console.log('========================================\n')

    // Also save to a config file for easy reference
    const configPath = path.join(__dirname, '..', 'deployment-info.json')
    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                network: 'arbitrum-sepolia',
                chainId: Number(network.chainId),
                contractAddress,
                deployer: wallet.address,
                initialMint: INITIAL_MINT,
                deployedAt: new Date().toISOString(),
            },
            null,
            2
        )
    )
    console.log(`📁 Deployment info saved to ${configPath}`)
}

main().catch((err) => {
    console.error('❌ Deployment failed:', err.message)
    process.exit(1)
})
