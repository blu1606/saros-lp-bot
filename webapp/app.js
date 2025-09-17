// Telegram Web App initialization
let tg = window.Telegram.WebApp;
tg.expand();

// Global state
let connectedWallet = null;
let walletPublicKey = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Telegram Web App loaded');
    
    // Set theme colors
    document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.body.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.body.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.body.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
    document.body.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.body.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f1f1f1');

    // Get user data from Telegram
    const initData = tg.initData;
    const user = tg.initDataUnsafe?.user;
    
    console.log('User:', user);
    console.log('Init data:', initData);

    // Fetch and display current network setting
    await loadNetworkSettings(user?.id);

    // Check for existing wallet connection
    checkWalletConnection();
});

// Load network settings from bot
async function loadNetworkSettings(userId) {
    try {
        if (!userId) {
            console.log('No user ID, using default mainnet');
            updateNetworkDisplay('mainnet');
            return;
        }

        const response = await fetch(`/api/network/${userId}`);
        const data = await response.json();
        
        console.log('Network settings loaded:', data);
        updateNetworkDisplay(data.network);
        
        // Store for later use
        window.currentNetwork = data.network;
        window.currentRpcUrl = data.rpcUrl;
        
    } catch (error) {
        console.error('Failed to load network settings:', error);
        updateNetworkDisplay('mainnet'); // fallback
        window.currentNetwork = 'mainnet';
        window.currentRpcUrl = 'https://api.mainnet-beta.solana.com';
    }
}

// Update network display
function updateNetworkDisplay(network) {
    const networkStatus = document.getElementById('networkStatus');
    if (networkStatus) {
        networkStatus.textContent = network === 'devnet' ? 'Devnet' : 'Mainnet';
        networkStatus.style.color = network === 'devnet' ? '#ff9800' : '#4caf50';
    }
}

// Wallet connection functions
async function connectPhantom() {
    try {
        showLoading(true);
        hideMessages();

        if (!window.phantom?.solana) {
            throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
        }

        const response = await window.phantom.solana.connect();
        const publicKey = response.publicKey.toString();
        
        await handleWalletConnected('phantom', publicKey);
        
    } catch (error) {
        console.error('Phantom connection error:', error);
        showError(error.message || 'Failed to connect to Phantom wallet');
    } finally {
        showLoading(false);
    }
}

async function connectSolflare() {
    try {
        showLoading(true);
        hideMessages();

        if (!window.solflare?.isSolflare) {
            throw new Error('Solflare wallet not found. Please install Solflare wallet extension.');
        }

        await window.solflare.connect();
        const publicKey = window.solflare.publicKey.toString();
        
        await handleWalletConnected('solflare', publicKey);
        
    } catch (error) {
        console.error('Solflare connection error:', error);
        showError(error.message || 'Failed to connect to Solflare wallet');
    } finally {
        showLoading(false);
    }
}

async function connectBackpack() {
    try {
        showLoading(true);
        hideMessages();

        if (!window.backpack?.isBackpack) {
            throw new Error('Backpack wallet not found. Please install Backpack wallet extension.');
        }

        const response = await window.backpack.connect();
        const publicKey = response.publicKey.toString();
        
        await handleWalletConnected('backpack', publicKey);
        
    } catch (error) {
        console.error('Backpack connection error:', error);
        showError(error.message || 'Failed to connect to Backpack wallet');
    } finally {
        showLoading(false);
    }
}

async function handleWalletConnected(walletType, publicKey) {
    try {
        connectedWallet = walletType;
        walletPublicKey = publicKey;

        // Update UI
        updateConnectionStatus('Connected', publicKey);
        showConnectedState();
        showSuccess(`Successfully connected to ${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet!`);

        // Send data back to Telegram bot
        await sendWalletDataToBot({
            walletType: walletType,
            publicKey: publicKey,
            timestamp: Date.now()
        });

        // Show main button to return to bot
        tg.MainButton.setText('Return to Bot');
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            tg.close();
        });

    } catch (error) {
        console.error('Error handling wallet connection:', error);
        showError('Failed to complete wallet connection');
    }
}

async function disconnectWallet() {
    try {
        showLoading(true);
        hideMessages();

        // Disconnect from wallet
        if (connectedWallet === 'phantom' && window.phantom?.solana) {
            await window.phantom.solana.disconnect();
        } else if (connectedWallet === 'solflare' && window.solflare) {
            await window.solflare.disconnect();
        } else if (connectedWallet === 'backpack' && window.backpack) {
            await window.backpack.disconnect();
        }

        // Reset state
        connectedWallet = null;
        walletPublicKey = null;

        // Update UI
        updateConnectionStatus('Not Connected');
        showDisconnectedState();
        showSuccess('Wallet disconnected successfully');

        // Send disconnect data to bot
        await sendWalletDataToBot({
            action: 'disconnect',
            timestamp: Date.now()
        });

        // Hide main button
        tg.MainButton.hide();

    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        showError('Failed to disconnect wallet');
    } finally {
        showLoading(false);
    }
}

async function sendWalletDataToBot(data) {
    try {
        // Get user info from Telegram
        const user = tg.initDataUnsafe?.user;
        if (!user) {
            throw new Error('User data not available');
        }

        // Send data to our bot backend
        const response = await fetch('/api/wallet-connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_user_id: user.id,
                telegram_username: user.username,
                wallet_data: data,
                init_data: tg.initData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send data to bot');
        }

        console.log('Wallet data sent to bot successfully');

    } catch (error) {
        console.error('Error sending data to bot:', error);
        throw error;
    }
}

function checkWalletConnection() {
    // Check if any wallet is already connected
    if (window.phantom?.solana?.isConnected) {
        const publicKey = window.phantom.solana.publicKey.toString();
        handleWalletConnected('phantom', publicKey);
    } else if (window.solflare?.isConnected) {
        const publicKey = window.solflare.publicKey.toString();
        handleWalletConnected('solflare', publicKey);
    } else if (window.backpack?.isConnected) {
        const publicKey = window.backpack.publicKey.toString();
        handleWalletConnected('backpack', publicKey);
    }
}

// UI Helper functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    
    // Disable all buttons during loading
    const buttons = document.querySelectorAll('.wallet-button');
    buttons.forEach(button => {
        button.disabled = show;
    });
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        successEl.style.display = 'none';
    }, 3000);
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function updateConnectionStatus(status, publicKey = null) {
    document.getElementById('connectionStatus').textContent = status;
    
    if (publicKey) {
        const shortKey = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
        document.getElementById('connectionStatus').textContent = `Connected (${shortKey})`;
    }
}

function showConnectedState() {
    // Hide wallet connection buttons
    document.getElementById('phantomButton').style.display = 'none';
    document.getElementById('solflareButton').style.display = 'none';
    document.getElementById('backpackButton').style.display = 'none';
    
    // Show disconnect button
    document.getElementById('disconnectButton').style.display = 'block';
}

function showDisconnectedState() {
    // Show wallet connection buttons
    document.getElementById('phantomButton').style.display = 'block';
    document.getElementById('solflareButton').style.display = 'block';
    document.getElementById('backpackButton').style.display = 'block';
    
    // Hide disconnect button
    document.getElementById('disconnectButton').style.display = 'none';
}

// Handle errors
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showError('An unexpected error occurred');
});

// Handle wallet events
window.addEventListener('load', function() {
    // Listen for wallet events
    if (window.phantom?.solana) {
        window.phantom.solana.on('connect', () => {
            console.log('Phantom connected');
        });
        
        window.phantom.solana.on('disconnect', () => {
            console.log('Phantom disconnected');
            if (connectedWallet === 'phantom') {
                connectedWallet = null;
                walletPublicKey = null;
                updateConnectionStatus('Not Connected');
                showDisconnectedState();
            }
        });
    }
});