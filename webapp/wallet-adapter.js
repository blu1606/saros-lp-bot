// Wallet adapter utilities - simplified version for direct wallet integration

class WalletAdapter {
    constructor() {
        this.connected = false;
        this.publicKey = null;
        this.walletType = null;
    }

    async detectWallets() {
        const wallets = [];
        
        if (window.phantom?.solana) {
            wallets.push({
                name: 'Phantom',
                type: 'phantom',
                icon: '👻',
                installed: true,
                instance: window.phantom.solana
            });
        }

        if (window.solflare?.isSolflare) {
            wallets.push({
                name: 'Solflare',
                type: 'solflare', 
                icon: '🦊',
                installed: true,
                instance: window.solflare
            });
        }

        if (window.backpack?.isBackpack) {
            wallets.push({
                name: 'Backpack',
                type: 'backpack',
                icon: '🎒', 
                installed: true,
                instance: window.backpack
            });
        }

        // Add common wallets that might not be installed
        const commonWallets = [
            { name: 'Phantom', type: 'phantom', icon: '👻', downloadUrl: 'https://phantom.app/' },
            { name: 'Solflare', type: 'solflare', icon: '🦊', downloadUrl: 'https://solflare.com/' },
            { name: 'Backpack', type: 'backpack', icon: '🎒', downloadUrl: 'https://backpack.app/' }
        ];

        commonWallets.forEach(wallet => {
            if (!wallets.find(w => w.type === wallet.type)) {
                wallets.push({
                    ...wallet,
                    installed: false
                });
            }
        });

        return wallets;
    }

    async connect(walletType) {
        try {
            let wallet;
            let response;

            switch (walletType) {
                case 'phantom':
                    if (!window.phantom?.solana) {
                        throw new Error('Phantom wallet not installed');
                    }
                    wallet = window.phantom.solana;
                    response = await wallet.connect();
                    break;

                case 'solflare':
                    if (!window.solflare?.isSolflare) {
                        throw new Error('Solflare wallet not installed');
                    }
                    wallet = window.solflare;
                    await wallet.connect();
                    response = { publicKey: wallet.publicKey };
                    break;

                case 'backpack':
                    if (!window.backpack?.isBackpack) {
                        throw new Error('Backpack wallet not installed');
                    }
                    wallet = window.backpack;
                    response = await wallet.connect();
                    break;

                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }

            this.connected = true;
            this.publicKey = response.publicKey;
            this.walletType = walletType;
            this.wallet = wallet;

            return {
                success: true,
                publicKey: response.publicKey.toString(),
                walletType: walletType
            };

        } catch (error) {
            console.error(`Failed to connect to ${walletType}:`, error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.wallet && this.connected) {
                await this.wallet.disconnect();
            }

            this.connected = false;
            this.publicKey = null;
            this.walletType = null;
            this.wallet = null;

            return { success: true };

        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            throw error;
        }
    }

    async signTransaction(transaction) {
        if (!this.connected || !this.wallet) {
            throw new Error('Wallet not connected');
        }

        try {
            const signedTransaction = await this.wallet.signTransaction(transaction);
            return signedTransaction;
        } catch (error) {
            console.error('Failed to sign transaction:', error);
            throw error;
        }
    }

    async signMessage(message) {
        if (!this.connected || !this.wallet) {
            throw new Error('Wallet not connected');
        }

        try {
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await this.wallet.signMessage(encodedMessage);
            return signedMessage;
        } catch (error) {
            console.error('Failed to sign message:', error);
            throw error;
        }
    }

    getConnectionStatus() {
        return {
            connected: this.connected,
            publicKey: this.publicKey?.toString() || null,
            walletType: this.walletType
        };
    }
}

// Global wallet adapter instance
const walletAdapter = new WalletAdapter();

// Export for use in other scripts
window.walletAdapter = walletAdapter;