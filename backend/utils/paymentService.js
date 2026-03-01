/**
 * Payment Service — Handles on-chain token transfers on Arbitrum Sepolia.
 *
 * Responsibilities:
 *  - Load the admin wallet from the encrypted private key in SystemSetting
 *  - Send ERC-20 (xUSDC) transfers from admin wallet → user wallet
 *  - Check admin wallet balances (token + ETH for gas)
 */

const { ethers } = require('ethers')
const crypto = require('crypto')
const SystemSetting = require('../models/SystemSetting')

// Minimal ERC-20 ABI — only the functions we need
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
]

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

/**
 * Encrypt a string using AES-256-CBC.
 */
function encrypt(text, encryptionKey) {
    const key = Buffer.from(encryptionKey, 'hex')
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt an AES-256-CBC encrypted string.
 */
function decrypt(encrypted, encryptionKey) {
    const key = Buffer.from(encryptionKey, 'hex')
    const parts = encrypted.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(parts[1], 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

/**
 * Get the encryption key from env. Must be a 64-char hex string (32 bytes).
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
    }
    return key
}

/**
 * Get a configured ethers provider for Arbitrum Sepolia.
 */
function getProvider() {
    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL
    if (!rpcUrl) {
        throw new Error('ARBITRUM_SEPOLIA_RPC_URL not set in .env')
    }
    return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * Get the token contract address from env.
 */
function getTokenAddress() {
    const addr = process.env.TOKEN_CONTRACT_ADDRESS
    if (!addr) {
        throw new Error('TOKEN_CONTRACT_ADDRESS not set in .env')
    }
    return addr
}

/**
 * Save the admin's private key (encrypted) to the database.
 */
async function savePrivateKey(privateKey) {
    const encryptionKey = getEncryptionKey()

    // Validate the private key by trying to create a wallet
    try {
        new ethers.Wallet(privateKey)
    } catch {
        throw new Error('Invalid private key format')
    }

    const encrypted = encrypt(privateKey, encryptionKey)

    await SystemSetting.findOneAndUpdate(
        { key: 'admin_private_key' },
        {
            key: 'admin_private_key',
            value: encrypted,
            description: 'Encrypted admin wallet private key for payment processing',
            updatedBy: 'admin',
            updatedAt: new Date(),
        },
        { upsert: true, new: true }
    )

    // Return the wallet address for confirmation
    const wallet = new ethers.Wallet(privateKey)
    return wallet.address
}

/**
 * Load the admin wallet (decrypted) from the database.
 * Returns an ethers Wallet connected to the provider, or null if not configured.
 */
async function getAdminWallet() {
    const setting = await SystemSetting.findOne({ key: 'admin_private_key' })
    if (!setting || !setting.value) {
        return null
    }

    const encryptionKey = getEncryptionKey()
    const privateKey = decrypt(setting.value, encryptionKey)
    const provider = getProvider()
    return new ethers.Wallet(privateKey, provider)
}

/**
 * Check if the admin wallet is configured.
 * Returns { configured, walletAddress } without exposing the private key.
 */
async function getPaymentStatus() {
    const setting = await SystemSetting.findOne({ key: 'admin_private_key' })
    if (!setting || !setting.value) {
        return { configured: false, walletAddress: null }
    }

    try {
        const encryptionKey = getEncryptionKey()
        const privateKey = decrypt(setting.value, encryptionKey)
        const wallet = new ethers.Wallet(privateKey)
        return { configured: true, walletAddress: wallet.address }
    } catch {
        return { configured: false, walletAddress: null }
    }
}

/**
 * Get the admin wallet's token and ETH balances.
 */
async function getWalletBalances() {
    const wallet = await getAdminWallet()
    if (!wallet) {
        return { tokenBalance: '0', ethBalance: '0', walletAddress: null }
    }

    const provider = getProvider()
    const tokenAddress = getTokenAddress()
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [tokenBalanceRaw, ethBalanceRaw, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(wallet.address),
        provider.getBalance(wallet.address),
        tokenContract.decimals(),
        tokenContract.symbol(),
    ])

    return {
        tokenBalance: ethers.formatUnits(tokenBalanceRaw, decimals),
        ethBalance: ethers.formatEther(ethBalanceRaw),
        tokenSymbol: symbol,
        walletAddress: wallet.address,
    }
}

/**
 * Process a withdrawal by sending tokens on-chain.
 *
 * @param {Object} withdrawal - The Withdrawal document
 * @param {Object} user - The User document
 * @returns {Object} - { success, transactionHash, error }
 */
async function processWithdrawal(withdrawal, user) {
    const wallet = await getAdminWallet()
    if (!wallet) {
        withdrawal.status = 'failed'
        withdrawal.errorMessage = 'Admin wallet not configured'
        await withdrawal.save()
        return { success: false, error: 'Admin wallet not configured' }
    }

    try {
        const tokenAddress = getTokenAddress()
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
        // Convert amount to token units (6 decimals for USDC-like tokens)
        const decimals = await tokenContract.decimals()
        // Fix floating-point precision (e.g., 6.800000000000003 → "6.800000")
        const fixedAmount = Number(withdrawal.amount).toFixed(Number(decimals))
        const amount = ethers.parseUnits(fixedAmount, decimals)

        // Check admin has enough tokens
        const balance = await tokenContract.balanceOf(wallet.address)
        if (balance < amount) {
            return { success: false, error: 'Insufficient token balance in admin wallet' }
        }

        // Send the transfer
        console.log(`💸 Sending ${withdrawal.amount} xUSDC to ${withdrawal.walletAddress}...`)
        const tx = await tokenContract.transfer(withdrawal.walletAddress, amount)
        console.log(`📡 Tx submitted: ${tx.hash}`)

        // Wait for confirmation
        const receipt = await tx.wait()
        console.log(`✅ Tx confirmed in block ${receipt.blockNumber}`)

        // Update withdrawal record
        withdrawal.status = 'completed'
        withdrawal.transactionHash = tx.hash
        withdrawal.network = 'arbitrum-sepolia'
        withdrawal.completedAt = new Date()
        await withdrawal.save()

        // Update user's withdrawnRewards
        user.withdrawnRewards += withdrawal.amount
        await user.save()

        return { success: true, transactionHash: tx.hash }
    } catch (err) {
        console.error('❌ Payment failed:', err.message)

        // Mark as failed
        withdrawal.status = 'failed'
        withdrawal.errorMessage = err.message
        await withdrawal.save()

        return { success: false, error: err.message }
    }
}

module.exports = {
    savePrivateKey,
    getAdminWallet,
    getPaymentStatus,
    getWalletBalances,
    processWithdrawal,
    encrypt,
    decrypt,
}
