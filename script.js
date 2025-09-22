/* ===== GITHUB BACKEND MANAGER (OPTIONNEL) ===== */
class GitHubBackend {
    constructor() {
        this.config = {
            owner: localStorage.getItem('githubOwner') || '',
            repo: localStorage.getItem('githubRepo') || 'Restaurants_data',
            filePath: 'restaurants.json',
            branch: 'main'
        };
        
        this.token = localStorage.getItem('githubToken');
        this.cache = null;
        this.lastSync = null;
        this.isSetup = false;
        this.isAvailable = !!this.token && !!this.config.owner;
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
            
            await this.ensureFileExists();
            this.isSetup = true;
            return true;
        } catch (error) {
            console.error('GitHub setup failed:', error);
            return false;
        }
    }

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
            return false;
        }
    }

    async ensureFileExists() {
        try {
            await this.makeRequest(`contents/${this.config.filePath}`);
        } catch (error) {
            const initialData = {
                metadata: {
                    createdAt: new Date().toISOString(),
                    version: '1.0'
                },
                tested: [],
                wishlist: [],
                cuisineTypes: []
            };
            
            await this.saveToGitHub(initialData, 'Création initiale du carnet gastro');
        }
    }

    async loadFromGitHub() {
        try {
            const response = await this.makeRequest(`contents/${this.config.filePath}`);
            const content = atob(response.content.replace(/\s/g, ''));
            const data = JSON.parse(content);
            
            this.cache = {
                data,
                sha: response.sha,
                lastModified: new Date().toISOString()
            };
            
            this.lastSync = new Date();
            return data;
            
        } catch (error) {
            throw error;
        }
    }

    async saveToGitHub(data, commitMessage = null) {
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
                lastModified: new Date().toISOString()
            };
            
            return response;
            
        } catch (error) {
            throw error;
        }
    }
}

/* ===== RESTAURANT MANAGER PRINCIPAL ===== */
class RestaurantManager {
    constructor() {
        this.data = {
            tested: JSON.parse(localStorage.getItem('testedRestaurants') || '[]'),
            wishlist: JSON.parse(localStorage.getItem('wishlistRestaurants') || '[]'),
            cuisineTypes: JSON.parse(localStorage.getItem('cuisineTypes') || JSON.stringify(this.getDefaultCuisineTypes()))
        };
        this.map = null;
        this.userLocation = null;
        this.editingId = null;
        this.github = new GitHubBackend();
        this.isOnline = navigator.onLine;
        
        // Listeners de connexion
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    async initialize() {
        // Essayer de configurer GitHub, mais ne pas échouer si ça marche pas
        try {
            const githubSetup = await this.github.setup();
            if (githubSetup) {
                await this.loadFromGitHub();
                this.setupAutoSync();
                this.updateSyncStatus('✅ GitHub connecté');
                this.showToast('✅ Synchronisation GitHub activée !', 'success');
            } else {
                this.updateSyncStatus('💾 Mode local');
            }
        } catch (error) {
            console.log('GitHub pas configuré, mode local activé');
            this.updateSyncStatus('💾 Mode local');
        }
        
        return true;
    }

    async loadFromGitHub() {
        try {
            const remoteData = await this.github.loadFromGitHub();
            
            // Fusionner avec les données locales si il y en a
            this.data = {
                tested: remoteData.tested || this.data.tested,
                wishlist: remoteData.wishlist || this.data.wishlist,
                cuisineTypes: remoteData.cuisineTypes || this.data.cuisineTypes
            };
            
            // Backup local
            this.saveLocalData();
            
        } catch (error) {
            console.log('Impossible de charger depuis GitHub, utilisation des données locales');
        }
    }

    saveLocalData() {
        localStorage.setItem('testedRestaurants', JSON.stringify(this.data.tested));
        localStorage.setItem('wishlistRestaurants', JSON.stringify(this.data.wishlist));
        localStorage.setItem('cuisineTypes', JSON.stringify(this.data.cuisineTypes));
    }

    async saveData() {
        // Toujours sauvegarder en local
        this.saveLocalData();
        
        // Essayer de sauvegarder sur GitHub si disponible
        if (this.github.isSetup && this.isOnline) {
            try {
                await this.github.saveToGitHub(this.data);
                this.updateSyncStatus('✅ Synchronisé');
            } catch (error) {
                console.error('Erreur GitHub:', error);
                this.updateSyncStatus('❌ Erreur sync');
            }
        } else {
            this.updateSyncStatus('💾 Sauvé localement');
        }
    }

    setupAutoSync() {
        setInterval(async () => {
            if (this.github.isSetup && this.isOnline) {
                await this.syncWithGitHub();
            }
        }, 2 * 60 * 1000); // 2 minutes
    }

    async syncWithGitHub() {
        if (!this.github.isSetup) return;
        
        try {
            this.updateSyncStatus('🔄 Synchronisation...');
            const remoteData = await this.github.loadFromGitHub();
            
            // Merge intelligent - garder les plus récents
            this.data = {
                tested: remoteData.tested || this.data.tested,
                wishlist: remoteData.wishlist || this.data.wishlist,
                cuisineTypes: remoteData.cuisineTypes || this.data.cuisineTypes
            };
            
            this.renderSections();
            this.updateSyncStatus('✅ Synchronisé');
            
        } catch (error) {
            this.updateSyncStatus('❌ Erreur sync');
        }
    }

    handleOnline() {
        this.isOnline = true;
        if (this.github.isSetup) {
            this.syncWithGitHub();
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.updateSyncStatus('📴 Hors ligne');
    }

    updateSyncStatus(status) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            statusElement.textContent = status;
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
            this.saveData();
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
        const photo = restaurant.photo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop';
        
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
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'tested')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'tested')">
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
        const photo = restaurant.photo || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop';
        
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
                            <button class="btn btn-success btn-action" onclick="restaurantManager.openTransferModal('${restaurant.id}')">
                                <i class="bi bi-arrow-right"></i> Testé !
                            </button>
                            <button class="btn btn-outline-primary btn-action" onclick="restaurantManager.editRestaurant('${restaurant.id}', 'wishlist')">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                            <button class="btn btn-outline-danger btn-action" onclick="restaurantManager.deleteRestaurant('${restaurant.id}', 'wishlist')">
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
                        ${isWishlist ? 'Commencez par ajouter des restaurants que vous aimeriez tester !' : 'Ajoutez vos premiers restaurants testés avec leurs notes !'}
                    </p>
                    <button class="btn btn-${isWishlist ? 'success' : 'primary'}" onclick="restaurantManager.openAddModal('${type}')">
                        <i class="bi bi-plus-lg"></i> ${isWishlist ? 'Ajouter une envie' : 'Ajouter un restaurant'}
                    </button>
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
        const restaurant = this.data[type].find(r => r.id === id);
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
            id: this.editingId || Date.now().toString(),
            name: document.getElementById('name').value,
            type: cuisineType,
            location: document.getElementById('location').value,
            address: document.getElementById('address').value,
            photo: document.getElementById('photo').value,
            priceRange: document.getElementById('priceRange').value,
            comment: document.getElementById('comment').value,
            dateAdded: isEdit ? this.data[type].find(r => r.id === this.editingId).dateAdded : new Date().toISOString().split('T')[0]
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
            const index = this.data[type].findIndex(r => r.id === this.editingId);
            this.data[type][index] = restaurantData;
        } else {
            this.data[type].push(restaurantData);
        }

        this.saveData();
        this.renderSections();
        bootstrap.Modal.getInstance(document.getElementById('restaurantModal')).hide();
        
        this.showToast(isEdit ? 'Restaurant modifié !' : 'Restaurant ajouté !', 'success');
    }

    deleteRestaurant(id, type) {
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${restaurant.name}" ?`)) {
            this.data[type] = this.data[type].filter(r => r.id !== id);
            this.saveData();
            this.renderSections();
            this.showToast('Restaurant supprimé !', 'success');
        }
    }

    openTransferModal(id) {
        const restaurant = this.data.wishlist.find(r => r.id === id);
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

    transferToTested() {
        const id = document.getElementById('transferId').value;
        const restaurant = this.data.wishlist.find(r => r.id === id);
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
        this.data.wishlist = this.data.wishlist.filter(r => r.id !== id);
        
        this.saveData();
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
                            <h6>Activer la synchronisation GitHub :</h6>
                            <ol class="mb-0">
                                <li>Créez un repository <code>Restaurants_data</code> sur GitHub</li>
                                <li>Créez un token avec permissions "repo"</li>
                                <li>Remplissez les champs ci-dessous</li>
                            </ol>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Nom d'utilisateur GitHub :</label>
                            <input type="text" class="form-control" id="configOwner" value="${this.github.config.owner}">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Repository des données :</label>
                            <input type="text" class="form-control" id="configRepo" value="${this.github.config.repo}">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Token d'accès GitHub :</label>
                            <input type="password" class="form-control" id="configToken" value="${this.github.token || ''}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                        <button type="button" class="btn btn-primary" onclick="restaurantManager.saveGitHubConfig(this)">
                            <i class="bi bi-check-lg"></i> Sauvegarder
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
        const owner = modal.querySelector('#configOwner').value;
        const repo = modal.querySelector('#configRepo').value;
        const token = modal.querySelector('#configToken').value;
        
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
            // Tenter la connexion
            const setupSuccess = await this.github.setup();
            if (setupSuccess) {
                await this.github.saveToGitHub(this.data, 'Configuration initiale depuis l\'app');
                this.setupAutoSync();
                this.updateSyncStatus('✅ GitHub connecté');
                this.showToast('✅ GitHub configuré avec succès !', 'success');
            } else {
                throw new Error('Impossible de se connecter à GitHub');
            }
        } catch (error) {
            this.updateSyncStatus('❌ Erreur GitHub');
            this.showToast('❌ Erreur : ' + error.message, 'danger');
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
        if (restaurantManager.github.isSetup) {
            restaurantManager.syncWithGitHub();
        } else {
            restaurantManager.showGitHubConfig();
        }
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
        // Créer un fallback minimal si tout échoue
        if (!restaurantManager) {
            restaurantManager = {
                showToast: (msg) => alert(msg),
                openAddModal: () => alert('Erreur: Application non initialisée')
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

    // Message de bienvenue différé
    setTimeout(() => {
        if (restaurantManager && restaurantManager.showToast) {
            if (restaurantManager.github && restaurantManager.github.isSetup) {
                restaurantManager.showToast('Carnet gastro collaboratif prêt ! 🍽️', 'info');
            } else {
                restaurantManager.showToast('Carnet gastro prêt ! Pour collaborer, configurez GitHub dans le menu. 👥', 'info');
            }
        }
    }, 2000);
});
