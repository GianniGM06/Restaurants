/* ===== GITHUB BACKEND MANAGER ===== */
class GitHubBackend {
    constructor() {
        // Configuration GitHub - À personnaliser
        this.config = {
            owner: 'VOTRE_USERNAME',              // Votre nom d'utilisateur GitHub
            repo: 'carnet-gastro-data',           // Nom du repository
            filePath: 'restaurants.json',         // Chemin du fichier JSON
            branch: 'main'                        // Branche par défaut
        };
        
        this.token = localStorage.getItem('githubToken');
        this.cache = null;
        this.lastSync = null;
    }

    /* ===== CONFIGURATION INITIALE ===== */
    async setup() {
        if (!this.token) {
            await this.requestTokenSetup();
        }
        
        // Vérifier la connexion
        const isConnected = await this.testConnection();
        if (!isConnected) {
            throw new Error('Impossible de se connecter à GitHub');
        }
        
        // Créer le fichier s'il n'existe pas
        await this.ensureFileExists();
        
        return true;
    }

    async requestTokenSetup() {
        const tokenModal = this.createTokenModal();
        document.body.appendChild(tokenModal);
        
        return new Promise((resolve) => {
            const modal = new bootstrap.Modal(tokenModal);
            modal.show();
            
            const saveBtn = tokenModal.querySelector('#saveToken');
            saveBtn.addEventListener('click', () => {
                const token = tokenModal.querySelector('#githubTokenInput').value;
                const owner = tokenModal.querySelector('#githubOwner').value;
                const repo = tokenModal.querySelector('#githubRepo').value;
                
                if (token && owner && repo) {
                    this.token = token;
                    this.config.owner = owner;
                    this.config.repo = repo;
                    
                    localStorage.setItem('githubToken', token);
                    localStorage.setItem('githubOwner', owner);
                    localStorage.setItem('githubRepo', repo);
                    
                    modal.hide();
                    document.body.removeChild(tokenModal);
                    resolve();
                }
            });
        });
    }

    createTokenModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🔧 Configuration GitHub</h5>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <h6>📋 Étapes à suivre :</h6>
                            <ol class="mb-0">
                                <li>Créez un repository GitHub public nommé "carnet-gastro-data"</li>
                                <li>Allez dans Settings > Developer Settings > Personal Access Tokens</li>
                                <li>Créez un token avec les permissions "repo"</li>
                                <li>Copiez le token ci-dessous</li>
                            </ol>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Nom d'utilisateur GitHub :</label>
                            <input type="text" class="form-control" id="githubOwner" placeholder="votre-username">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Nom du repository :</label>
                            <input type="text" class="form-control" id="githubRepo" value="carnet-gastro-data">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Token d'accès GitHub :</label>
                            <input type="password" class="form-control" id="githubTokenInput" placeholder="ghp_...">
                            <small class="form-text text-muted">Le token sera stocké localement de manière sécurisée</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="saveToken">
                            <i class="bi bi-check-lg"></i> Sauvegarder
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /* ===== API GITHUB ===== */
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub API Error: ${error.message}`);
        }
        
        return response.json();
    }

    async testConnection() {
        try {
            await this.makeRequest('');
            return true;
        } catch (error) {
            console.error('Connexion GitHub échouée:', error);
            return false;
        }
    }

    /* ===== GESTION DU FICHIER ===== */
    async ensureFileExists() {
        try {
            await this.makeRequest(`contents/${this.config.filePath}`);
        } catch (error) {
            // Le fichier n'existe pas, le créer
            const initialData = {
                metadata: {
                    createdAt: new Date().toISOString(),
                    version: '1.0',
                    contributors: [this.config.owner]
                },
                tested: [],
                wishlist: [],
                cuisineTypes: this.getDefaultCuisineTypes()
            };
            
            await this.saveToGitHub(initialData, 'Création initiale du carnet gastro');
        }
    }

    getDefaultCuisineTypes() {
        return [
            { value: 'français', label: '🥖 Français', emoji: '🥖' },
            { value: 'italien', label: '🍕 Italien', emoji: '🍕' },
            { value: 'asiatique', label: '🍜 Asiatique', emoji: '🍜' },
            { value: 'japonais', label: '🍣 Japonais', emoji: '🍣' },
            { value: 'indien', label: '🍛 Indien', emoji: '🍛' },
            { value: 'mexicain', label: '🌮 Mexicain', emoji: '🌮' },
            { value: 'libanais', label: '🥙 Libanais', emoji: '🥙' },
            { value: 'chinois', label: '🥢 Chinois', emoji: '🥢' },
            { value: 'thaï', label: '🌶️ Thaï', emoji: '🌶️' },
            { value: 'grec', label: '🫒 Grec', emoji: '🫒' }
        ];
    }

    /* ===== CHARGEMENT DES DONNÉES ===== */
    async loadFromGitHub() {
        try {
            const response = await this.makeRequest(`contents/${this.config.filePath}`);
            const content = atob(response.content.replace(/\s/g, ''));
            const data = JSON.parse(content);
            
            this.cache = {
                data,
                sha: response.sha,
                lastModified: response.last_modified || new Date().toISOString()
            };
            
            this.lastSync = new Date();
            return data;
            
        } catch (error) {
            console.error('Erreur lors du chargement depuis GitHub:', error);
            throw error;
        }
    }

    /* ===== SAUVEGARDE DES DONNÉES ===== */
    async saveToGitHub(data, commitMessage = null) {
        try {
            // Ajouter des métadonnées
            const enrichedData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    lastUpdated: new Date().toISOString(),
                    lastUpdatedBy: this.config.owner,
                    version: data.metadata?.version || '1.0'
                }
            };
            
            const content = btoa(JSON.stringify(enrichedData, null, 2));
            const message = commitMessage || `Mise à jour du carnet - ${new Date().toLocaleString()}`;
            
            const payload = {
                message,
                content,
                branch: this.config.branch
            };
            
            // Inclure le SHA si on a une version en cache
            if (this.cache?.sha) {
                payload.sha = this.cache.sha;
            }
            
            const response = await this.makeRequest(`contents/${this.config.filePath}`, 'PUT', payload);
            
            // Mettre à jour le cache
            this.cache = {
                data: enrichedData,
                sha: response.content.sha,
                lastModified: new Date().toISOString()
            };
            
            return response;
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde sur GitHub:', error);
            throw error;
        }
    }

    /* ===== SYNCHRONISATION ===== */
    async sync() {
        try {
            // Vérifier s'il y a des changements distants
            const remoteData = await this.loadFromGitHub();
            
            // Si on a des données locales non synchronisées, gérer le conflit
            const localData = this.getLocalUnsyncedData();
            if (localData && this.hasConflict(localData, remoteData)) {
                return await this.resolveConflict(localData, remoteData);
            }
            
            return remoteData;
            
        } catch (error) {
            console.error('Erreur de synchronisation:', error);
            throw error;
        }
    }

    getLocalUnsyncedData() {
        const data = localStorage.getItem('unsyncedData');
        return data ? JSON.parse(data) : null;
    }

    hasConflict(localData, remoteData) {
        const localTime = new Date(localData.metadata?.lastUpdated || 0);
        const remoteTime = new Date(remoteData.metadata?.lastUpdated || 0);
        
        return localTime > this.lastSync && remoteTime > this.lastSync;
    }

    async resolveConflict(localData, remoteData) {
        // Interface simple de résolution de conflit
        const choice = confirm(
            `🔄 Conflit détecté!\n\n` +
            `Données locales: ${localData.tested?.length || 0} testés, ${localData.wishlist?.length || 0} wishlist\n` +
            `Données distantes: ${remoteData.tested?.length || 0} testés, ${remoteData.wishlist?.length || 0} wishlist\n\n` +
            `Cliquez OK pour fusionner automatiquement, Annuler pour garder les données distantes.`
        );
        
        if (choice) {
            return await this.mergeData(localData, remoteData);
        } else {
            // Garder les données distantes
            localStorage.removeItem('unsyncedData');
            return remoteData;
        }
    }

    async mergeData(localData, remoteData) {
        const merged = {
            metadata: {
                ...remoteData.metadata,
                lastUpdated: new Date().toISOString(),
                mergedAt: new Date().toISOString()
            },
            tested: this.mergeArrays(localData.tested || [], remoteData.tested || [], 'id'),
            wishlist: this.mergeArrays(localData.wishlist || [], remoteData.wishlist || [], 'id'),
            cuisineTypes: this.mergeArrays(localData.cuisineTypes || [], remoteData.cuisineTypes || [], 'value')
        };
        
        await this.saveToGitHub(merged, 'Fusion automatique des données');
        localStorage.removeItem('unsyncedData');
        
        return merged;
    }

    mergeArrays(local, remote, keyField) {
        const merged = [...remote];
        const remoteIds = new Set(remote.map(item => item[keyField]));
        
        local.forEach(item => {
            if (!remoteIds.has(item[keyField])) {
                merged.push(item);
            }
        });
        
        return merged;
    }

    /* ===== CACHE LOCAL POUR OFFLINE ===== */
    saveLocalBackup(data) {
        localStorage.setItem('githubDataBackup', JSON.stringify(data));
        localStorage.setItem('lastSyncTime', new Date().toISOString());
    }

    getLocalBackup() {
        const backup = localStorage.getItem('githubDataBackup');
        return backup ? JSON.parse(backup) : null;
    }

    /* ===== HISTORIQUE DES MODIFICATIONS ===== */
    async getCommitHistory() {
        try {
            const commits = await this.makeRequest(`commits?path=${this.config.filePath}&per_page=10`);
            return commits.map(commit => ({
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: commit.commit.author.date,
                sha: commit.sha
            }));
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            return [];
        }
    }

    /* ===== STATUS ET MONITORING ===== */
    getStatus() {
        return {
            connected: !!this.token,
            lastSync: this.lastSync,
            hasCache: !!this.cache,
            config: this.config
        };
    }
}

/* ===== INTÉGRATION AVEC RESTAURANTMANAGER ===== */
class GitHubRestaurantManager extends RestaurantManager {
    constructor() {
        super();
        this.github = new GitHubBackend();
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        // Écouter les changements de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    async initialize() {
        try {
            await this.github.setup();
            await this.loadData();
            this.setupAutoSync();
            this.showToast('✅ Connecté à GitHub ! Données synchronisées.', 'success');
        } catch (error) {
            console.error('Erreur d\'initialisation GitHub:', error);
            this.loadLocalData();
            this.showToast('⚠️ Mode hors ligne - données locales chargées', 'warning');
        }
    }

    async loadData() {
        try {
            const data = await this.github.loadFromGitHub();
            this.data = {
                tested: data.tested || [],
                wishlist: data.wishlist || [],
                cuisineTypes: data.cuisineTypes || this.getDefaultCuisineTypes()
            };
            
            // Backup local
            this.github.saveLocalBackup(this.data);
            
        } catch (error) {
            console.error('Erreur de chargement GitHub:', error);
            this.loadLocalData();
        }
    }

    loadLocalData() {
        const backup = this.github.getLocalBackup();
        if (backup) {
            this.data = backup;
        } else {
            // Fallback sur localStorage
            this.data = {
                tested: JSON.parse(localStorage.getItem('testedRestaurants') || '[]'),
                wishlist: JSON.parse(localStorage.getItem('wishlistRestaurants') || '[]'),
                cuisineTypes: JSON.parse(localStorage.getItem('cuisineTypes') || JSON.stringify(this.getDefaultCuisineTypes()))
            };
        }
    }

    async saveData() {
        if (this.syncInProgress) return;
        
        try {
            if (this.isOnline) {
                await this.github.saveToGitHub(this.data);
                this.github.saveLocalBackup(this.data);
                this.updateSyncStatus('✅ Synchronisé');
            } else {
                // Sauvegarder en local pour sync ultérieure
                localStorage.setItem('unsyncedData', JSON.stringify({
                    ...this.data,
                    metadata: { lastUpdated: new Date().toISOString() }
                }));
                this.updateSyncStatus('⏳ En attente de connexion');
            }
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            this.updateSyncStatus('❌ Erreur de sync');
            
            // Fallback localStorage
            localStorage.setItem('testedRestaurants', JSON.stringify(this.data.tested));
            localStorage.setItem('wishlistRestaurants', JSON.stringify(this.data.wishlist));
            localStorage.setItem('cuisineTypes', JSON.stringify(this.data.cuisineTypes));
        }
    }

    setupAutoSync() {
        // Sync toutes les 5 minutes
        setInterval(async () => {
            if (this.isOnline && !this.syncInProgress) {
                await this.syncData();
            }
        }, 5 * 60 * 1000);
    }

    async syncData() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.updateSyncStatus('🔄 Synchronisation...');
        
        try {
            const remoteData = await this.github.sync();
            this.data = {
                tested: remoteData.tested || [],
                wishlist: remoteData.wishlist || [],
                cuisineTypes: remoteData.cuisineTypes || this.getDefaultCuisineTypes()
            };
            
            this.renderSections();
            this.updateSyncStatus('✅ Synchronisé');
            
        } catch (error) {
            console.error('Erreur de synchronisation:', error);
            this.updateSyncStatus('❌ Erreur de sync');
        } finally {
            this.syncInProgress = false;
        }
    }

    handleOnline() {
        this.isOnline = true;
        this.syncData();
        this.showToast('🌐 Connexion rétablie - synchronisation...', 'info');
    }

    handleOffline() {
        this.isOnline = false;
        this.updateSyncStatus('📴 Hors ligne');
        this.showToast('📴 Mode hors ligne activé', 'warning');
    }

    updateSyncStatus(status) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    async showHistory() {
        const history = await this.github.getCommitHistory();
        // Créer une modal pour afficher l'historique
        console.log('Historique des modifications:', history);
    }
}
