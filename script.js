/* ===== GITHUB BACKEND MANAGER (AVEC MODES LECTURE/ÉDITION) ===== */
class GitHubBackend {
    constructor() {
        this.config = {
            owner: localStorage.getItem('githubOwner') || '',
            repo: localStorage.getItem('githubRepo') || 'Restaurants_data',
            filePath: 'restaurants.json',
            branch: 'main'
        }

    // Parser les données JSON vers le format interne
    parseJsonData(jsonData) {
        console.log('🔄 Parsing des données JSON...');
        
        const data = {
            tested: jsonData.tested || [],
            wishlist: jsonData.wishlist || [],
            cuisineTypes: this.parseCuisineTypes(jsonData.cuisineTypes)
        };
        
        console.log('✅ Données parsées:', {
            tested: data.tested.length,
            wishlist: data.wishlist.length,
            cuisineTypes: data.cuisineTypes.length
        });
        
        return data;
    }

    // Convertir les cuisineTypes du JSON vers le format interne
    parseCuisineTypes(cuisineTypesData) {
        if (!cuisineTypesData) {
            return this.getDefaultCuisineTypes();
        }
        
        // Si c'est déjà un array (format interne), le retourner tel quel
        if (Array.isArray(cuisineTypesData)) {
            return cuisineTypesData;
        }
        
        // Si c'est un objet (format JSON original), le convertir
        if (typeof cuisineTypesData === 'object') {
            const cuisineArray = [];
            
            for (const [key, value] of Object.entries(cuisineTypesData)) {
                cuisineArray.push({
                    value: key,
                    label: `${value.emoji || '🍽️'} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
                    emoji: value.emoji || '🍽️'
                });
            }
            
            return cuisineArray;
        }
        
        return this.getDefaultCuisineTypes();
    }

    // Données d'exemple intégrées (basées sur votre JSON original)
    getExampleData() {
        return {
            "config": {
                "title": "Mon Carnet Gastro",
                "author": "Votre Nom",
                "location": "Paris, France"
            },
            "cuisineTypes": {
                "français": { "color": "primary", "emoji": "🥖" },
                "italien": { "color": "success", "emoji": "🍕" },
                "asiatique": { "color": "danger", "emoji": "🍜" },
                "japonais": { "color": "warning", "emoji": "🍣" }
            },
            "tested": [
                {
                    "id": 1,
                    "name": "Le Comptoir du Relais",
                    "type": "français",
                    "location": "6ème arrondissement",
                    "address": "9 Carrefour de l'Odéon, 75006 Paris",
                    "coordinates": { "lat": 48.8534, "lng": 2.3387 },
                    "ratings": {
                        "plats": 4.5,
                        "vins": 4.0,
                        "accueil": 4.5,
                        "lieu": 4.0
                    },
                    "comment": "Bistrot authentique avec une cuisine excellente. L'ambiance est parfaite !",
                    "dateVisited": "2024-12-15",
                    "priceRange": "€€",
                    "photos": [
                        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"
                    ]
                },
                {
                    "id": 2,
                    "name": "Pink Mamma",
                    "type": "italien",
                    "location": "Pigalle",
                    "address": "20 bis rue de Douai, 75009 Paris",
                    "coordinates": { "lat": 48.8814, "lng": 2.3346 },
                    "ratings": {
                        "plats": 4.0,
                        "vins": 3.5,
                        "accueil": 4.0,
                        "lieu": 5.0
                    },
                    "comment": "Décor incroyable ! Les pizzas sont bonnes mais l'attente peut être longue.",
                    "dateVisited": "2024-11-28",
                    "priceRange": "€€€",
                    "photos": [
                        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop"
                    ]
                },
                {
                    "id": 3,
                    "name": "Breizh Café",
                    "type": "français",
                    "location": "3ème arrondissement",
                    "address": "109 rue Vieille du Temple, 75003 Paris",
                    "coordinates": { "lat": 48.8608, "lng": 2.3628 },
                    "ratings": {
                        "plats": 5.0,
                        "vins": 3.0,
                        "accueil": 4.0,
                        "lieu": 3.5
                    },
                    "comment": "Les meilleures crêpes de Paris ! Version moderne et raffinée.",
                    "dateVisited": "2024-10-12",
                    "priceRange": "€€",
                    "photos": [
                        "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&h=300&fit=crop"
                    ]
                }
            ],
            "wishlist": [
                {
                    "id": 4,
                    "name": "L'Ami Jean",
                    "type": "français",
                    "location": "7ème arrondissement",
                    "address": "27 rue Malar, 75007 Paris",
                    "coordinates": { "lat": 48.8584, "lng": 2.3019 },
                    "reason": "Recommandé par un ami pour la cuisine basque",
                    "addedDate": "2024-12-01",
                    "priceRange": "€€€"
                },
                {
                    "id": 5,
                    "name": "Yam'Tcha",
                    "type": "asiatique",
                    "location": "1er arrondissement", 
                    "address": "4 rue Sauval, 75001 Paris",
                    "coordinates": { "lat": 48.8644, "lng": 2.3364 },
                    "reason": "Cuisine franco-chinoise étoilée, accord thés",
                    "addedDate": "2024-11-15",
                    "priceRange": "€€€€"
                },
                {
                    "id": 6,
                    "name": "Du Pain et des Idées",
                    "type": "français",
                    "location": "10ème arrondissement",
                    "address": "34 rue Yves Toudic, 75010 Paris",
                    "coordinates": { "lat": 48.8701, "lng": 2.3621 },
                    "reason": "Meilleure boulangerie de Paris selon Time Out",
                    "addedDate": "2024-12-20",
                    "priceRange": "€"
                }
            ]
        };
    };
        
        this.token = localStorage.getItem('githubToken');
        this.cache = null;
        this.isSetup = false;
        this.isAvailable = !!this.token && !!this.config.owner;
        this.lastSha = null; // Pour détecter les changements
        
        // Proxy CORS pour GitHub Pages
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        this.useProxy = window.location.hostname === 'giannigm06.github.io' || 
                        window.location.hostname.includes('github.io');
    }

    async setup() {
        if (!this.isAvailable) {
            return false;
        }
        
        try {
            const isConnected = await this.testConnection();
            if (!isConnected) {
                return false;
            }
            
            this.isSetup = true;
            return true;
        } catch (error) {
            console.error('GitHub setup failed:', error);
            return false;
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        const baseUrl = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`;
        const fullUrl = cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
        
        // Utiliser le proxy si on est sur GitHub Pages
        const requestUrl = this.useProxy && method === 'GET' ? 
            `${this.corsProxy}${encodeURIComponent(fullUrl)}` : fullUrl;
        
        const options = {
            method,
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        // Ajouter l'auth seulement si pas de proxy
        if (!this.useProxy || method !== 'GET') {
            options.headers['Authorization'] = `token ${this.token}`;
            options.headers['Content-Type'] = 'application/json';
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(requestUrl, options);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage += `: ${errorData.message || 'Erreur inconnue'}`;
            } catch (e) {
                errorMessage += `: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        return response.json();
    }

    async testConnection() {
        try {
            console.log('Test connexion GitHub API...');
            const data = await this.makeRequest('');
            console.log('Repository trouvé:', data.name);
            return true;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            return false;
        }
    }

    async loadFromGitHub() {
        try {
            console.log('🔄 Chargement depuis GitHub API...');
            console.log('🌐 Use proxy:', this.useProxy);
            
            const response = await this.makeRequest(`contents/${this.config.filePath}`);
            console.log('📡 Response type:', typeof response);
            console.log('📡 Response keys:', Object.keys(response || {}));
            
            let content;
            let sha = null;
            
            if (this.useProxy) {
                // Avec le proxy allorigins, on peut recevoir :
                // 1. Directement le contenu JSON (string)
                // 2. Un objet avec le contenu déjà décodé
                // 3. Un objet GitHub API standard
                
                if (typeof response === 'string') {
                    // Cas 1: Contenu direct
                    content = response;
                    console.log('✅ Contenu direct reçu');
                } else if (response && typeof response === 'object') {
                    if (response.content && typeof response.content === 'string') {
                        // Cas 3: Format GitHub API via proxy
                        content = atob(response.content.replace(/\s/g, ''));
                        sha = response.sha;
                        console.log('✅ Format GitHub API via proxy');
                    } else if (response.tested || response.wishlist) {
                        // Cas 2: L'objet JSON déjà parsé
                        content = JSON.stringify(response);
                        console.log('✅ Objet JSON déjà parsé');
                    } else {
                        console.error('❌ Format de réponse proxy inattendu:', response);
                        throw new Error('Format de réponse proxy inattendu');
                    }
                } else {
                    console.error('❌ Réponse proxy invalide:', response);
                    throw new Error('Réponse proxy invalide');
                }
            } else {
                // Sans proxy : format GitHub API standard
                if (response.content) {
                    content = atob(response.content.replace(/\s/g, ''));
                    sha = response.sha;
                    console.log('✅ Format GitHub API standard');
                } else {
                    console.error('❌ Réponse GitHub API invalide:', response);
                    throw new Error('Réponse GitHub API invalide');
                }
            }
            
            console.log('📄 Content length:', content.length);
            const data = JSON.parse(content);
            console.log('✅ JSON parsé avec succès');
            
            // Détecter les changements
            const hasChanges = this.lastSha && this.lastSha !== sha;
            this.lastSha = sha;
            
            this.cache = {
                data,
                sha: sha,
                lastModified: new Date().toISOString(),
                hasChanges
            };
            
            return { data, hasChanges };
            
        } catch (error) {
            console.error('❌ Erreur loadFromGitHub:', error);
            throw error;
        }
    }

    async saveToGitHub(data, commitMessage = null) {
        if (this.useProxy) {
            throw new Error('La sauvegarde nécessite un hébergement compatible (pas GitHub Pages). Utilisez Netlify ou Vercel.');
        }
        
        try {
            const enrichedData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    lastUpdated: new Date().toISOString(),
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
            
            if (this.cache?.sha) {
                payload.sha = this.cache.sha;
            }
            
            const response = await this.makeRequest(`contents/${this.config.filePath}`, 'PUT', payload);
            
            this.cache = {
                data: enrichedData,
                sha: response.content.sha,
                lastModified: new Date().toISOString(),
                hasChanges: false
            };
            
            this.lastSha = response.content.sha;
            
            return response;
            
        } catch (error) {
            console.error('Erreur saveToGitHub:', error);
            throw error;
        }
    }

    // Vérifier s'il y a des changements dans le JSON
    async checkForChanges() {
        if (!this.isSetup) return false;
        
        try {
            const response = await this.makeRequest(`contents/${this.config.filePath}`);
            const currentSha = response.sha || response.object?.sha;
            
            return this.lastSha && this.lastSha !== currentSha;
        } catch (error) {
            console.warn('Impossible de vérifier les changements:', error);
            return false;
        }
    }
}

/* ===== RESTAURANT MANAGER AVEC MODES LECTURE/ÉDITION ===== */
class RestaurantManager {
    constructor() {
        this.data = {
            tested: [],
            wishlist: [],
            cuisineTypes: this.getDefaultCuisineTypes()
        };
        this.map = null;
        this.userLocation = null;
        this.editingId = null;
        this.github = new GitHubBackend();
        this.isOnline = navigator.onLine;
        this.isEditMode = false; // Mode lecture par défaut
        this.syncCheckInterval = null;
        
        // Listeners de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    async initialize() {
        console.log('🚀 Initialisation du RestaurantManager...');
        console.log('📍 Config GitHub:', this.github.config);
        console.log('🔑 Token disponible:', !!this.github.token);
        
        try {
            // Essayer de se connecter à GitHub
            const githubSetup = await this.github.setup();
            
            if (githubSetup) {
                // Mode édition activé
                console.log('✅ GitHub configuré - Mode édition');
                this.isEditMode = true;
                await this.loadData();
                this.startSyncCheck(); // Vérifier les changements périodiquement
                this.updateSyncStatus('✅ Mode édition');
                this.showToast('✅ Connecté GitHub - Mode édition activé !', 'success');
            } else {
                throw new Error('GitHub non configuré ou inaccessible');
            }
            
        } catch (error) {
            // Mode lecture seule
            console.log('📖 Basculement en mode lecture seule:', error.message);
            this.isEditMode = false;
            await this.loadDataReadOnly();
            this.updateSyncStatus('👁️ Mode lecture');
            this.showToast('👁️ Mode lecture seule - Configurez GitHub pour éditer', 'info');
        }
        
        this.updateUIMode();
        console.log('🎯 Initialisation terminée');
        
        return true;
    }

    // Chargement avec GitHub (mode édition)
    async loadData() {
        try {
            console.log('Chargement des données depuis GitHub...');
            const result = await this.github.loadFromGitHub();
            
            // Parser les données du JSON
            this.data = this.parseJsonData(result.data);
            
            // Afficher notification si changements détectés
            if (result.hasChanges) {
                this.showSyncNotification();
            }
            
            console.log('📊 Données chargées depuis GitHub:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length
            });
            
        } catch (error) {
            console.error('Impossible de charger depuis GitHub:', error);
            throw error;
        }
    }

    // Chargement en lecture seule (sans GitHub ou en cas d'erreur)
    async loadDataReadOnly() {
        console.log('📖 Tentative de chargement en mode lecture seule...');
        
        try {
            // Essayer plusieurs sources pour le JSON
            let jsonData = null;
            
            // 1. Essayer avec la config GitHub si disponible
            if (this.github.config.owner && this.github.config.repo) {
                console.log('🔗 Tentative GitHub public:', `${this.github.config.owner}/${this.github.config.repo}`);
                try {
                    const url = `https://raw.githubusercontent.com/${this.github.config.owner}/${this.github.config.repo}/main/restaurants.json`;
                    console.log('📡 URL:', url);
                    const response = await fetch(url);
                    if (response.ok) {
                        jsonData = await response.json();
                        console.log('✅ Données chargées depuis GitHub public');
                    } else {
                        console.log('❌ GitHub public failed:', response.status, response.statusText);
                    }
                } catch (e) {
                    console.log('❌ GitHub public error:', e.message);
                }
            }
            
            // 2. Essayer de charger le fichier local (si sur le même domaine)
            if (!jsonData) {
                console.log('📁 Tentative fichier local...');
                try {
                    const response = await fetch('./restaurants.json');
                    if (response.ok) {
                        jsonData = await response.json();
                        console.log('✅ Données chargées depuis fichier local');
                    } else {
                        console.log('❌ Local file failed:', response.status);
                    }
                } catch (e) {
                    console.log('❌ Local file error:', e.message);
                }
            }
            
            // 3. Utiliser des données d'exemple si rien ne fonctionne
            if (!jsonData) {
                console.log('📋 Utilisation des données d\'exemple intégrées');
                jsonData = this.getExampleData();
            }
            
            // Convertir les données au bon format
            this.data = this.parseJsonData(jsonData);
            
            console.log('📊 Données finales chargées:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length,
                cuisineTypes: this.data.cuisineTypes.length
            });
            
        } catch (error) {
            console.error('❌ Erreur totale chargement lecture seule:', error);
            // Utiliser les données d'exemple en cas d'erreur totale
            console.log('🆘 Fallback vers données d\'exemple');
            this.data = this.parseJsonData(this.getExampleData());
        }
    }

    // Vérification périodique des changements
    startSyncCheck() {
        if (this.syncCheckInterval) clearInterval(this.syncCheckInterval);
        
        this.syncCheckInterval = setInterval(async () => {
            if (this.isEditMode && this.github.isSetup) {
                const hasChanges = await this.github.checkForChanges();
                if (hasChanges) {
                    this.showSyncNotification();
                }
            }
        }, 30000); // Vérifier toutes les 30 secondes
    }

    showSyncNotification() {
        const syncBtn = document.getElementById('syncButton');
        if (syncBtn) {
            syncBtn.classList.add('btn-warning');
            syncBtn.classList.remove('btn-outline-secondary');
            syncBtn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Changements détectés !';
            
            this.showToast('📋 Changements détectés dans le JSON ! Cliquez sur Synchroniser', 'warning');
        }
    }

    resetSyncButton() {
        const syncBtn = document.getElementById('syncButton');
        if (syncBtn) {
            syncBtn.classList.remove('btn-warning');
            syncBtn.classList.add('btn-outline-secondary');
            syncBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Synchroniser';
        }
    }

    // Mettre à jour l'interface selon le mode
    updateUIMode() {
        const editElements = document.querySelectorAll('.edit-mode-only');
        const readOnlyElements = document.querySelectorAll('.read-only-mode');
        
        editElements.forEach(el => {
            el.style.display = this.isEditMode ? 'block' : 'none';
        });
        
        readOnlyElements.forEach(el => {
            el.style.display = this.isEditMode ? 'none' : 'block';
        });

        // Boutons d'action dans les cards
        const actionButtons = document.querySelectorAll('.action-buttons');
        actionButtons.forEach(container => {
            const editButtons = container.querySelectorAll('.btn-outline-primary, .btn-outline-danger, .btn-success');
            editButtons.forEach(btn => {
                btn.style.display = this.isEditMode ? 'inline-block' : 'none';
            });
        });

        // Bouton flottant
        const floatingBtn = document.getElementById('addFloatingBtn');
        if (floatingBtn) {
            floatingBtn.style.display = this.isEditMode ? 'block' : 'none';
        }

        // Mettre à jour le badge de statut
        this.updateModeIndicator();
    }

    updateModeIndicator() {
        const statusBadge = document.getElementById('syncStatus');
        if (statusBadge) {
            if (this.isEditMode) {
                statusBadge.className = 'badge bg-success fs-6';
                statusBadge.textContent = '✏️ Mode édition';
            } else {
                statusBadge.className = 'badge bg-info fs-6';
                statusBadge.textContent = '👁️ Mode lecture';
            }
        }
    }

    async saveData() {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Impossible de sauvegarder', 'warning');
            return;
        }

        if (this.github.isSetup && this.isOnline) {
            try {
                this.updateSyncStatus('🔄 Sauvegarde...');
                
                const fullData = {
                    config: {
                        title: "Mon Carnet Gastro",
                        author: "Votre Nom",
                        location: "Paris, France",
                        ratingSystem: {
                            plats: { coefficient: 2.0, label: "Plats", icon: "bi-egg-fried" },
                            vins: { coefficient: 1.5, label: "Vins", icon: "bi-cup" },
                            accueil: { coefficient: 1.5, label: "Accueil", icon: "bi-people" },
                            lieu: { coefficient: 1.0, label: "Lieu", icon: "bi-building" }
                        }
                    },
                    cuisineTypes: this.generateCuisineTypesObject(),
                    tested: this.data.tested,
                    wishlist: this.data.wishlist,
                    statistics: this.generateStatistics(),
                    metadata: {
                        version: "1.0.0",
                        lastUpdated: new Date().toISOString().split('T')[0],
                        totalEntries: this.data.tested.length + this.data.wishlist.length
                    }
                };
                
                await this.github.saveToGitHub(fullData);
                this.updateSyncStatus('✅ Sauvé sur GitHub');
                this.resetSyncButton();
                
            } catch (error) {
                console.error('Erreur GitHub:', error);
                this.updateSyncStatus('❌ Erreur sauvegarde');
                this.showToast('❌ Erreur de sauvegarde: ' + error.message, 'danger');
            }
        } else {
            this.updateSyncStatus('❌ GitHub requis');
            this.showToast('❌ GitHub non configuré', 'warning');
        }
    }

    generateCuisineTypesObject() {
        const cuisineObj = {};
        this.data.cuisineTypes.forEach(cuisine => {
            cuisineObj[cuisine.value] = {
                color: this.getCuisineColor(cuisine.value),
                emoji: cuisine.emoji
            };
        });
        return cuisineObj;
    }

    getCuisineColor(type) {
        const colors = {
            'français': 'primary',
            'italien': 'success', 
            'asiatique': 'danger',
            'japonais': 'warning',
            'indien': 'info',
            'mexicain': 'dark',
            'libanais': 'secondary',
            'chinois': 'danger',
            'thaï': 'warning',
            'grec': 'info'
        };
        return colors[type] || 'secondary';
    }

    generateStatistics() {
        const avgRating = this.data.tested.length > 0 ? 
            (this.data.tested.reduce((sum, r) => sum + this.calculateFinalRating(r.ratings), 0) / this.data.tested.length) : 0;
        
        const topRated = this.data.tested.length > 0 ? 
            this.data.tested.reduce((top, current) => 
                this.calculateFinalRating(current.ratings) > this.calculateFinalRating(top.ratings) ? current : top
            ).name : null;

        return {
            totalTested: this.data.tested.length,
            totalWishlist: this.data.wishlist.length,
            averageRating: Math.round(avgRating * 10) / 10,
            favoriteType: this.getMostFrequentCuisine(),
            lastVisit: this.getLastVisitDate(),
            topRated: topRated
        };
    }

    getMostFrequentCuisine() {
        if (this.data.tested.length === 0) return null;
        
        const cuisineCounts = {};
        this.data.tested.forEach(r => {
            cuisineCounts[r.type] = (cuisineCounts[r.type] || 0) + 1;
        });
        
        return Object.keys(cuisineCounts).reduce((a, b) => 
            cuisineCounts[a] > cuisineCounts[b] ? a : b
        );
    }

    getLastVisitDate() {
        if (this.data.tested.length === 0) return null;
        
        const lastVisit = this.data.tested
            .filter(r => r.dateVisited)
            .sort((a, b) => new Date(b.dateVisited) - new Date(a.dateVisited))[0];
        
        return lastVisit ? lastVisit.dateVisited : null;
    }

    handleOnline() {
        this.isOnline = true;
        if (this.github.isSetup && this.isEditMode) {
            this.loadData().then(() => this.renderSections());
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.updateSyncStatus('📴 Hors ligne');
    }

    updateSyncStatus(status) {
        // Ne pas écraser l'indicateur de mode
        if (!status.includes('Mode')) {
            const statusElement = document.getElementById('syncStatus');
            if (statusElement && this.isEditMode) {
                statusElement.textContent = status;
            }
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

    addCuisineType(cuisineInput) {
        if (!this.isEditMode) return cuisineInput.toLowerCase().trim();
        
        const normalizedInput = cuisineInput.toLowerCase().trim();
        
        const exists = this.data.cuisineTypes.some(type => 
            type.value.toLowerCase() === normalizedInput
        );
        
        if (!exists && normalizedInput) {
            const newType = {
                value: normalizedInput,
                label: `🍽️ ${cuisineInput}`,
                emoji: '🍽️'
            };
            
            this.data.cuisineTypes.push(newType);
            this.updateCuisineDropdown();
            
            return normalizedInput;
        }
        
        return normalizedInput;
    }

    updateCuisineDropdown() {
        const dropdown = document.getElementById('cuisineDropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = this.data.cuisineTypes
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(type => 
                `<li><a class="dropdown-item" href="#" onclick="selectCuisine('${type.value}')">${type.label}</a></li>`
            ).join('');
    }

    calculateFinalRating(ratings) {
        const weighted = (ratings.plats * 2 + ratings.vins * 1.5 + ratings.accueil * 1.5 + ratings.lieu * 1) / 6;
        return Math.round(weighted * 10) / 10;
    }

    calculateCountriesCount() {
        const allRestaurants = [...this.data.tested, ...this.data.wishlist];
        const countries = new Set();
        
        allRestaurants.forEach(restaurant => {
            const location = restaurant.location.toLowerCase();
            
            if (location.includes('paris') || location.includes('france') || location.includes('ème arr')) {
                countries.add('France');
            } else if (location.includes('tokyo') || location.includes('japon')) {
                countries.add('Japon');
            } else if (location.includes('new york') || location.includes('usa') || location.includes('états-unis')) {
                countries.add('États-Unis');
            } else if (location.includes('london') || location.includes('londres') || location.includes('uk')) {
                countries.add('Royaume-Uni');
            } else if (location.includes('rome') || location.includes('milan') || location.includes('italie')) {
                countries.add('Italie');
            } else if (location.includes('barcelona') || location.includes('madrid') || location.includes('espagne')) {
                countries.add('Espagne');
            } else if (location.includes('berlin') || location.includes('munich') || location.includes('allemagne')) {
                countries.add('Allemagne');
            } else {
                const locationParts = location.split(',').map(part => part.trim());
                if (locationParts.length > 1) {
                    countries.add(locationParts[locationParts.length - 1]);
                } else {
                    countries.add('Autre');
                }
            }
        });
        
        return countries.size;
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="bi bi-star-fill"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="bi bi-star-half"></i>';
            } else {
                stars += '<i class="bi bi-star"></i>';
            }
        }
        return stars;
    }

    getCuisineBadge(type) {
        const badges = {
            'français': 'bg-primary',
            'italien': 'bg-success', 
            'asiatique': 'bg-danger',
            'japonais': 'bg-warning',
            'indien': 'bg-info',
            'mexicain': 'bg-dark',
            'libanais': 'bg-secondary',
            'chinois': 'bg-danger',
            'thaï': 'bg-warning',
            'grec': 'bg-info'
        };
        return badges[type] || 'bg-secondary';
    }

    createTestedCard(restaurant) {
        const finalRating = this.calculateFinalRating(restaurant.ratings);
        const photo = restaurant.photos && restaurant.photos[0] ? restaurant.photos[0] : 
                     (restaurant.photo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop');
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span>
                        </div>
                        <p class="card-text text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        
                        <div class="rating-section">
                            <div class="row mb-2">
                                <div class="col-8"><small>🍽️ Plats (x2)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.plats)}</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-8"><small>🍷 Vins (x1.5)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.vins)}</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-8"><small>😊 Accueil (x1.5)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.accueil)}</span></div>
                            </div>
                            <div class="row">
                                <div class="col-8"><small>🏛️ Lieu (x1)</small></div>
                                <div class="col-4 text-end"><span class="stars">${this.generateStars(restaurant.ratings.lieu)}</span></div>
                            </div>
                        </div>

                        <div class="final-rating">
                            <strong>${finalRating}/5</strong> ${this.generateStars(finalRating)}
                        </div>

                        ${restaurant.comment ? `<blockquote class="blockquote-footer mt-3">"${restaurant.comment}"</blockquote>` : ''}

                        <div class="action-buttons">
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'tested')" ${!this.isEditMode ? 'style="display:none"' : ''}>
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'tested')" ${!this.isEditMode ? 'style="display:none"' : ''}>
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="restaurantManager.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
                                <i class="bi bi-geo-alt"></i> Carte
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWishlistCard(restaurant) {
        const photo = restaurant.photos && restaurant.photos[0] ? restaurant.photos[0] : 
                     (restaurant.photo || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop');
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card wishlist-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span>
                        </div>
                        <p class="card-text text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        ${restaurant.reason ? `
                        <div class="alert alert-success">
                            <strong>💡 Pourquoi :</strong><br>
                            ${restaurant.reason}
                        </div>
                        ` : ''}
                        ${restaurant.comment ? `<p class="text-muted"><em>"${restaurant.comment}"</em></p>` : ''}
                        
                        <div class="action-buttons">
                            <button class="btn btn-success btn-action" onclick="restaurantManager.openTransferModal('${restaurant.id}')" ${!this.isEditMode ? 'style="display:none"' : ''}>
                                <i class="bi bi-arrow-right"></i> Testé !
                            </button>
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'wishlist')" ${!this.isEditMode ? 'style="display:none"' : ''}>
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'wishlist')" ${!this.isEditMode ? 'style="display:none"' : ''}>
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                            ${restaurant.coordinates ? `
                            <button class="btn btn-outline-info btn-action" onclick="restaurantManager.showOnMap(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
                                <i class="bi bi-geo-alt"></i> Carte
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyState(type) {
        const isWishlist = type === 'wishlist';
        return `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-${isWishlist ? 'heart' : 'star'}"></i>
                    <h4>Aucun restaurant ${isWishlist ? 'dans votre wishlist' : 'testé'}</h4>
                    <p class="text-muted">
                        ${this.isEditMode ? 
                            (isWishlist ? 'Commencez par ajouter des restaurants que vous aimeriez tester !' : 'Ajoutez vos premiers restaurants testés avec leurs notes !') :
                            'Aucune donnée à afficher en mode lecture seule.'
                        }
                    </p>
                    ${this.isEditMode ? `
                    <button class="btn btn-${isWishlist ? 'success' : 'primary'}" onclick="restaurantManager.openAddModal('${type}')">
                        <i class="bi bi-plus-lg"></i> ${isWishlist ? 'Ajouter une envie' : 'Ajouter un restaurant'}
                    </button>
                    ` : `
                    <div class="read-only-mode">
                        <button class="btn btn-outline-primary" onclick="restaurantManager.showGitHubConfig()">
                            <i class="bi bi-github"></i> Se connecter pour éditer
                        </button>
                    </div>
                    `}
                </div>
            </div>
        `;
    }

    renderSections() {
        const testedGrid = document.getElementById('tested-grid');
        const wishlistGrid = document.getElementById('wishlist-grid');

        if (this.data.tested.length === 0) {
            testedGrid.innerHTML = this.createEmptyState('tested');
        } else {
            testedGrid.innerHTML = this.data.tested.map(r => this.createTestedCard(r)).join('');
        }

        if (this.data.wishlist.length === 0) {
            wishlistGrid.innerHTML = this.createEmptyState('wishlist');
        } else {
            wishlistGrid.innerHTML = this.data.wishlist.map(r => this.createWishlistCard(r)).join('');
        }

        this.updateStats();
        this.updateUIMode();
    }

    updateStats() {
        document.getElementById('tested-count').textContent = this.data.tested.length;
        document.getElementById('wishlist-count').textContent = this.data.wishlist.length;
        document.getElementById('countries-count').textContent = this.calculateCountriesCount();

        if (this.data.tested.length > 0) {
            const avgRating = this.data.tested.reduce((sum, r) => sum + this.calculateFinalRating(r.ratings), 0) / this.data.tested.length;
            document.getElementById('avg-rating').textContent = Math.round(avgRating * 10) / 10;
        } else {
            document.getElementById('avg-rating').textContent = '--';
        }
    }

    openAddModal(type) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Connectez-vous à GitHub pour éditer', 'warning');
            return;
        }

        this.editingId = null;
        document.getElementById('modalTitle').textContent = type === 'tested' ? 'Ajouter un restaurant testé' : 'Ajouter à ma wishlist';
        document.getElementById('modalType').value = type;
        
        document.getElementById('restaurantForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('cuisineInput').value = '';
        
        document.getElementById('ratingsSection').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlistSection').style.display = type === 'wishlist' ? 'block' : 'none';
        
        if (type === 'tested') {
            this.setStarRating('plats', 5);
            this.setStarRating('vins', 5);
            this.setStarRating('accueil', 5);
            this.setStarRating('lieu', 5);
        }
        
        this.updateCuisineDropdown();
        new bootstrap.Modal(document.getElementById('restaurantModal')).show();
    }

    editRestaurant(id, type) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Connectez-vous à GitHub pour éditer', 'warning');
            return;
        }

        const restaurant = this.data[type].find(r => r.id == id);
        if (!restaurant) return;
        
        this.editingId = id;
        document.getElementById('modalTitle').textContent = 'Modifier ' + restaurant.name;
        document.getElementById('modalType').value = type;
        document.getElementById('editId').value = id;
        
        document.getElementById('name').value = restaurant.name;
        document.getElementById('cuisineInput').value = restaurant.type;
        document.getElementById('location').value = restaurant.location;
        document.getElementById('address').value = restaurant.address || '';
        document.getElementById('photo').value = restaurant.photo || '';
        document.getElementById('priceRange').value = restaurant.priceRange || '€€';
        document.getElementById('comment').value = restaurant.comment || '';
        
        document.getElementById('ratingsSection').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlistSection').style.display = type === 'wishlist' ? 'block' : 'none';
        
        if (type === 'tested') {
            this.setStarRating('plats', restaurant.ratings.plats);
            this.setStarRating('vins', restaurant.ratings.vins);
            this.setStarRating('accueil', restaurant.ratings.accueil);
            this.setStarRating('lieu', restaurant.ratings.lieu);
        } else {
            document.getElementById('reason').value = restaurant.reason || '';
        }
        
        this.updateCuisineDropdown();
        new bootstrap.Modal(document.getElementById('restaurantModal')).show();
    }

    async saveRestaurant() {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Impossible de sauvegarder', 'warning');
            return;
        }

        const form = document.getElementById('restaurantForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const type = document.getElementById('modalType').value;
        const isEdit = !!this.editingId;
        const cuisineInput = document.getElementById('cuisineInput').value;
        
        const cuisineType = this.addCuisineType(cuisineInput);
        
        const restaurantData = {
            id: this.editingId || Date.now(),
            name: document.getElementById('name').value,
            type: cuisineType,
            location: document.getElementById('location').value,
            address: document.getElementById('address').value,
            photo: document.getElementById('photo').value,
            priceRange: document.getElementById('priceRange').value,
            comment: document.getElementById('comment').value,
            dateAdded: isEdit ? this.data[type].find(r => r.id == this.editingId).dateAdded : new Date().toISOString().split('T')[0]
        };

        if (restaurantData.address) {
            const coords = await this.geocodeAddress(restaurantData.address);
            if (coords) {
                restaurantData.coordinates = coords;
            }
        }

        if (type === 'tested') {
            restaurantData.ratings = {
                plats: parseInt(document.getElementById('platsRating').value),
                vins: parseInt(document.getElementById('vinsRating').value),
                accueil: parseInt(document.getElementById('accueilRating').value),
                lieu: parseInt(document.getElementById('lieuRating').value)
            };
            restaurantData.dateVisited = restaurantData.dateAdded;
        } else {
            restaurantData.reason = document.getElementById('reason').value;
        }

        if (isEdit) {
            const index = this.data[type].findIndex(r => r.id == this.editingId);
            this.data[type][index] = restaurantData;
        } else {
            this.data[type].push(restaurantData);
        }

        await this.saveData();
        this.renderSections();
        bootstrap.Modal.getInstance(document.getElementById('restaurantModal')).hide();
        
        this.showToast(isEdit ? 'Restaurant modifié !' : 'Restaurant ajouté !', 'success');
    }

    async deleteRestaurant(id, type) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Impossible de supprimer', 'warning');
            return;
        }

        const restaurant = this.data[type].find(r => r.id == id);
        if (!restaurant) return;
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${restaurant.name}" ?`)) {
            this.data[type] = this.data[type].filter(r => r.id != id);
            await this.saveData();
            this.renderSections();
            this.showToast('Restaurant supprimé !', 'success');
        }
    }

    openTransferModal(id) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Connectez-vous à GitHub pour éditer', 'warning');
            return;
        }

        const restaurant = this.data.wishlist.find(r => r.id == id);
        if (!restaurant) return;
        
        document.getElementById('transferId').value = id;
        document.getElementById('transferRestaurantName').textContent = restaurant.name;
        document.getElementById('transferComment').value = '';
        
        this.setStarRating('transferPlats', 5);
        this.setStarRating('transferVins', 5);
        this.setStarRating('transferAccueil', 5);
        this.setStarRating('transferLieu', 5);
        
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    }

    async transferToTested() {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule - Impossible de transférer', 'warning');
            return;
        }

        const id = document.getElementById('transferId').value;
        const restaurant = this.data.wishlist.find(r => r.id == id);
        if (!restaurant) return;
        
        const testedRestaurant = {
            ...restaurant,
            ratings: {
                plats: parseInt(document.getElementById('transferPlatsRating').value),
                vins: parseInt(document.getElementById('transferVinsRating').value),
                accueil: parseInt(document.getElementById('transferAccueilRating').value),
                lieu: parseInt(document.getElementById('transferLieuRating').value)
            },
            comment: document.getElementById('transferComment').value,
            dateVisited: new Date().toISOString().split('T')[0]
        };
        
        delete testedRestaurant.reason;
        
        this.data.tested.push(testedRestaurant);
        this.data.wishlist = this.data.wishlist.filter(r => r.id != id);
        
        await this.saveData();
        this.renderSections();
        bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
        
        document.getElementById('tested-tab').click();
        this.showToast('Restaurant transféré dans "Testés" !', 'success');
    }

    setupStarRatings() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const rating = e.target.getAttribute('data-value');
                const ratingType = e.target.parentElement.getAttribute('data-rating');
                this.setStarRating(ratingType, rating);
            }
        });
    }

    setStarRating(type, value) {
        const container = document.querySelector(`[data-rating="${type}"]`);
        if (!container) return;
        
        const stars = container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        const input = document.getElementById(type + 'Rating');
        if (input) input.value = value;
    }

    async geocodeAddress(address) {
        try {
            const query = encodeURIComponent(address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.warn('Geocoding failed for:', address, error);
        }
        
        return { lat: 48.8566, lng: 2.3522 };
    }

    showOnMap(lat, lng) {
        document.querySelector('#map-tab').click();
        if (!this.map) {
            setTimeout(() => {
                this.initMap();
                setTimeout(() => this.map.setView([lat, lng], 16), 500);
            }, 100);
        } else {
            this.map.setView([lat, lng], 16);
        }
    }

    initMap() {
        this.map = L.map('map').setView([48.8566, 2.3522], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.data.tested.forEach(restaurant => {
            if (restaurant.coordinates) {
                const finalRating = this.calculateFinalRating(restaurant.ratings);
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);

                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span></p>
                        <p class="mb-2">${restaurant.location}</p>
                        <div>${this.generateStars(finalRating)} ${finalRating}/5</div>
                        ${restaurant.comment ? `<p class="small mt-2"><em>"${restaurant.comment}"</em></p>` : ''}
                    </div>
                `);
            }
        });

        this.data.wishlist.forEach(restaurant => {
            if (restaurant.coordinates) {
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1"><span class="badge ${this.getCuisineBadge(restaurant.type)}">${restaurant.type}</span></p>
                        <p class="mb-2">${restaurant.location}</p>
                        <div class="alert alert-info mb-0 py-2">
                            ❤️ <strong>À tester</strong><br>
                            ${restaurant.reason ? `<small>${restaurant.reason}</small>` : ''}
                        </div>
                    </div>
                `);
            }
        });
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }

    getUserLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.showToast('Position détectée !', 'info');
                },
                error => this.showToast("Impossible d'obtenir votre position.", 'warning')
            );
        }
    }

    exportData() {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                totalTested: this.data.tested.length,
                totalWishlist: this.data.wishlist.length,
                averageRating: this.data.tested.length > 0 ? 
                    (this.data.tested.reduce((sum, r) => sum + this.calculateFinalRating(r.ratings), 0) / this.data.tested.length).toFixed(1) : 0
            },
            tested: this.data.tested,
            wishlist: this.data.wishlist,
            cuisineTypes: this.data.cuisineTypes
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `carnet-gastro-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Données exportées avec succès !', 'success');
    }

    // Configuration GitHub
    showGitHubConfig() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🔧 Configuration GitHub</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <h6>Se connecter pour activer le mode édition :</h6>
                            <ol class="mb-0">
                                <li>Votre nom d'utilisateur GitHub</li>
                                <li>Le nom du repository (ex: Restaurants_data)</li>
                                <li>Un token d'accès GitHub avec permissions "repo"</li>
                            </ol>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Nom d'utilisateur GitHub :</label>
                            <input type="text" class="form-control" id="configOwner" value="${this.github.config.owner}" placeholder="ex: giannigm06">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Repository des données :</label>
                            <input type="text" class="form-control" id="configRepo" value="${this.github.config.repo}" placeholder="ex: Restaurants_data">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Token d'accès GitHub :</label>
                            <input type="password" class="form-control" id="configToken" value="${this.github.token || ''}" placeholder="ghp_...">
                            <small class="form-text text-muted">Créez un token sur GitHub > Settings > Developer settings > Personal access tokens</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" onclick="restaurantManager.saveGitHubConfig(this)">
                            <i class="bi bi-check-lg"></i> Se connecter
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async saveGitHubConfig(button) {
        const modal = button.closest('.modal');
        const owner = modal.querySelector('#configOwner').value.trim();
        const repo = modal.querySelector('#configRepo').value.trim();
        const token = modal.querySelector('#configToken').value.trim();
        
        if (!owner || !repo || !token) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        // Sauvegarder la configuration
        localStorage.setItem('githubOwner', owner);
        localStorage.setItem('githubRepo', repo);
        localStorage.setItem('githubToken', token);
        
        // Reconfigurer GitHub
        this.github.config.owner = owner;
        this.github.config.repo = repo;
        this.github.token = token;
        this.github.isAvailable = true;
        
        // Fermer le modal
        bootstrap.Modal.getInstance(modal).hide();
        
        try {
            // Tenter la connexion et activer le mode édition
            this.updateSyncStatus('🔄 Test connexion...');
            const setupSuccess = await this.github.setup();
            
            if (setupSuccess) {
                this.updateSyncStatus('🔄 Chargement données...');
                
                try {
                    // Essayer de charger les données
                    this.isEditMode = true;
                    await this.loadData();
                    this.renderSections();
                    this.startSyncCheck();
                    this.updateModeIndicator();
                    this.showToast('✅ Mode édition activé !', 'success');
                } catch (loadError) {
                    console.warn('❌ Erreur chargement GitHub, utilisation données actuelles:', loadError);
                    // Garder les données actuelles mais activer le mode édition
                    this.isEditMode = true;
                    this.renderSections();
                    this.updateModeIndicator();
                    this.showToast('⚠️ Mode édition activé avec données locales - Erreur de chargement GitHub', 'warning');
                }
            } else {
                throw new Error('Test de connexion échoué');
            }
        } catch (error) {
            console.error('❌ Erreur configuration GitHub:', error);
            this.updateSyncStatus('❌ Erreur GitHub');
            this.showToast('❌ Erreur de connexion GitHub : ' + error.message, 'danger');
            
            // Proposer de continuer en mode lecture seule
            if (confirm('Erreur de connexion GitHub. Voulez-vous continuer en mode lecture seule ?')) {
                this.isEditMode = false;
                this.updateUIMode();
                this.updateSyncStatus('👁️ Mode lecture');
            }
        }
    }

    // Méthode pour synchronisation manuelle
    async manualSync() {
        if (!this.github.isSetup) {
            this.showGitHubConfig();
            return;
        }
        
        try {
            this.updateSyncStatus('🔄 Synchronisation...');
            await this.loadData();
            this.renderSections();
            this.resetSyncButton();
            this.updateSyncStatus('✅ Synchronisé');
            this.showToast('✅ Données rechargées depuis GitHub !', 'success');
        } catch (error) {
            this.updateSyncStatus('❌ Erreur sync');
            this.showToast('❌ Erreur de synchronisation : ' + error.message, 'danger');
        }
    }
}

/* ===== VARIABLE GLOBALE ===== */
let restaurantManager;

/* ===== FONCTIONS GLOBALES ===== */
function openAddModal(type) {
    if (restaurantManager) {
        restaurantManager.openAddModal(type);
    }
}

function saveRestaurant() {
    if (restaurantManager) {
        restaurantManager.saveRestaurant();
    }
}

function transferToTested() {
    if (restaurantManager) {
        restaurantManager.transferToTested();
    }
}

function selectCuisine(cuisine) {
    document.getElementById('cuisineInput').value = cuisine;
}

function exportData() {
    if (restaurantManager) {
        restaurantManager.exportData();
    }
}

function manualSync() {
    if (restaurantManager) {
        restaurantManager.manualSync();
    }
}

function showGitHubConfig() {
    if (restaurantManager) {
        restaurantManager.showGitHubConfig();
    }
}

/* ===== INITIALISATION ===== */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initialisation du carnet gastro...');
    
    try {
        restaurantManager = new RestaurantManager();
        
        await restaurantManager.initialize();
        restaurantManager.renderSections();
        restaurantManager.setupStarRatings();
        restaurantManager.updateCuisineDropdown();
        
        console.log('✅ Carnet gastro initialisé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur d\'initialisation:', error);
        if (!restaurantManager) {
            restaurantManager = {
                showToast: (msg) => alert(msg),
                openAddModal: () => alert('Erreur: Application non initialisée'),
                showGitHubConfig: () => alert('Erreur: Configuration GitHub requise')
            };
        }
    }
    
    // Événements boutons
    const addFloatingBtn = document.getElementById('addFloatingBtn');
    if (addFloatingBtn) {
        addFloatingBtn.addEventListener('click', function() {
            const activeTab = document.querySelector('.nav-link.active');
            const type = (activeTab && activeTab.id.includes('wishlist')) ? 'wishlist' : 'tested';
            openAddModal(type);
        });
    }
    
    const findNearbyBtn = document.getElementById('findNearbyHero');
    if (findNearbyBtn) {
        findNearbyBtn.addEventListener('click', () => {
            if (restaurantManager && restaurantManager.getUserLocation) {
                restaurantManager.getUserLocation();
            }
        });
    }

    // Événement carte
    const mapTab = document.getElementById('map-tab');
    if (mapTab) {
        mapTab.addEventListener('shown.bs.tab', function() {
            if (restaurantManager && !restaurantManager.map) {
                setTimeout(() => {
                    if (restaurantManager.initMap) {
                        restaurantManager.initMap();
                    }
                }, 100);
            }
        });
    }

    // Événement cuisine input
    const cuisineInput = document.getElementById('cuisineInput');
    if (cuisineInput) {
        cuisineInput.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const dropdown = document.getElementById('cuisineDropdown');
            if (dropdown) {
                const items = dropdown.querySelectorAll('.dropdown-item');
                
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(value) ? 'block' : 'none';
                });
            }
        });
    }
});
