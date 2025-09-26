/* ===== APPLICATION RESTAURANT SIMPLIFIÉE ===== */

class SimpleRestaurantApp {
    constructor() {
        // Configuration GitHub
        this.config = {
            owner: 'giannigm06', // Votre nom d'utilisateur GitHub
            repo: 'Restaurants_data', // Nom de votre repository
            fileName: 'restaurants.json',
            branch: 'main'
        };
        
        // État de l'application
        this.data = {
            tested: [],
            wishlist: [],
            cuisineTypes: []
        };
        
        this.githubToken = localStorage.getItem('github_token');
        this.isEditMode = !!this.githubToken;
        this.map = null;
        this.fileSha = null; // Pour les mises à jour GitHub
        
        console.log('🚀 Application initialisée');
        console.log('📝 Mode édition:', this.isEditMode);
    }

    /* ===== CHARGEMENT INITIAL ===== */
    async init() {
        try {
            await this.loadData();
            this.setupUI();
            this.render();
            this.showToast('✅ Données chargées !', 'success');
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showToast('❌ Erreur de chargement', 'danger');
            this.setupUI();
            this.render();
        }
    }

    /* ===== CHARGEMENT DES DONNÉES ===== */
    async loadData() {
        console.log('📖 Chargement des données...');
        
        try {
            // Charger depuis GitHub (public, pas besoin de token)
            const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${this.config.fileName}`;
            console.log('🔗 URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            console.log('✅ JSON chargé depuis GitHub');
            
            // Si on est en mode édition, récupérer aussi le SHA pour les mises à jour
            if (this.isEditMode) {
                await this.getFileSha();
            }
            
            // Parser les données
            this.data = {
                tested: jsonData.tested || [],
                wishlist: jsonData.wishlist || [],
                cuisineTypes: this.parseCuisineTypes(jsonData.cuisineTypes || {})
            };
            
            console.log('📊 Données parsées:', {
                tested: this.data.tested.length,
                wishlist: this.data.wishlist.length,
                cuisines: this.data.cuisineTypes.length
            });
            
        } catch (error) {
            console.warn('⚠️ Erreur chargement GitHub, utilisation données par défaut');
            this.data = {
                tested: this.getDefaultTestedData(),
                wishlist: this.getDefaultWishlistData(),
                cuisineTypes: this.getDefaultCuisineTypes()
            };
        }
    }

    /* ===== RÉCUPÉRATION DU SHA (pour les mises à jour) ===== */
    async getFileSha() {
        if (!this.githubToken) return;
        
        try {
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.fileSha = data.sha;
                console.log('🔑 SHA récupéré pour les mises à jour');
            }
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer le SHA:', error);
        }
    }

    /* ===== SAUVEGARDE SUR GITHUB ===== */
    async saveToGitHub() {
        if (!this.githubToken) {
            this.showToast('❌ Token GitHub requis pour sauvegarder', 'warning');
            return false;
        }

        try {
            console.log('💾 Sauvegarde sur GitHub...');
            
            // Construire le JSON complet
            const fullData = {
                config: {
                    title: "Mon Carnet Gastro",
                    author: "Gianni",
                    location: "Paris, France"
                },
                cuisineTypes: this.generateCuisineTypesObject(),
                tested: this.data.tested,
                wishlist: this.data.wishlist,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    totalEntries: this.data.tested.length + this.data.wishlist.length
                }
            };

            // Encoder en base64
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(fullData, null, 2))));
            
            // Préparer la requête
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.fileName}`;
            const payload = {
                message: `Mise à jour restaurants - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.config.branch
            };
            
            // Inclure le SHA si on l'a (pour mise à jour)
            if (this.fileSha) {
                payload.sha = this.fileSha;
            }
            
            // Envoyer à GitHub
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API Error: ${errorData.message}`);
            }

            const result = await response.json();
            this.fileSha = result.content.sha; // Mettre à jour le SHA
            
            console.log('✅ Sauvegarde GitHub réussie');
            this.showToast('✅ Sauvegardé sur GitHub !', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde GitHub:', error);
            this.showToast('❌ Erreur sauvegarde: ' + error.message, 'danger');
            return false;
        }
    }

    /* ===== CONFIGURATION GITHUB ===== */
    setupGitHub() {
        const token = prompt('Entrez votre token GitHub (commence par ghp_) :');
        if (token && token.startsWith('ghp_')) {
            localStorage.setItem('github_token', token);
            this.githubToken = token;
            this.isEditMode = true;
            this.setupUI();
            this.render();
            this.showToast('✅ Token GitHub configuré !', 'success');
        } else if (token) {
            alert('Token invalide. Il doit commencer par "ghp_"');
        }
    }

    /* ===== CONFIGURATION UI ===== */
    setupUI() {
        // Mise à jour du badge de statut
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            if (this.isEditMode) {
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = '✏️ Mode édition';
            } else {
                statusBadge.className = 'badge bg-info';
                statusBadge.textContent = '👁️ Mode lecture';
            }
        }

        // Afficher/masquer les boutons d'édition
        const editElements = document.querySelectorAll('.edit-only');
        editElements.forEach(el => {
            el.style.display = this.isEditMode ? 'block' : 'none';
        });

        // Configuration des événements
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Bouton configuration GitHub
        const githubBtn = document.getElementById('github-config');
        if (githubBtn) {
            githubBtn.onclick = () => this.setupGitHub();
        }

        // Bouton synchronisation manuelle
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.onclick = () => this.loadData().then(() => this.render());
        }

        // Boutons d'ajout
        const addTestedBtn = document.getElementById('add-tested');
        if (addTestedBtn) {
            addTestedBtn.onclick = () => this.openAddModal('tested');
        }

        const addWishlistBtn = document.getElementById('add-wishlist');
        if (addWishlistBtn) {
            addWishlistBtn.onclick = () => this.openAddModal('wishlist');
        }

        // Onglet carte
        const mapTab = document.getElementById('map-tab');
        if (mapTab) {
            mapTab.addEventListener('shown.bs.tab', () => {
                setTimeout(() => this.initMap(), 100);
            });
        }
    }

    /* ===== RENDU ===== */
    render() {
        this.renderStats();
        this.renderTested();
        this.renderWishlist();
    }

    renderStats() {
        // Statistiques
        document.getElementById('tested-count').textContent = this.data.tested.length;
        document.getElementById('wishlist-count').textContent = this.data.wishlist.length;
        
        if (this.data.tested.length > 0) {
            const avgRating = this.data.tested.reduce((sum, r) => sum + this.calculateRating(r.ratings), 0) / this.data.tested.length;
            document.getElementById('avg-rating').textContent = avgRating.toFixed(1);
        } else {
            document.getElementById('avg-rating').textContent = '--';
        }
    }

    renderTested() {
        const container = document.getElementById('tested-grid');
        if (this.data.tested.length === 0) {
            container.innerHTML = this.createEmptyState('tested');
        } else {
            container.innerHTML = this.data.tested.map(r => this.createTestedCard(r)).join('');
        }
    }

    renderWishlist() {
        const container = document.getElementById('wishlist-grid');
        if (this.data.wishlist.length === 0) {
            container.innerHTML = this.createEmptyState('wishlist');
        } else {
            container.innerHTML = this.data.wishlist.map(r => this.createWishlistCard(r)).join('');
        }
    }

    /* ===== CRÉATION DES CARDS ===== */
    createTestedCard(restaurant) {
        const rating = this.calculateRating(restaurant.ratings);
        const photo = restaurant.photo || restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card h-100">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge bg-primary">${restaurant.type}</span>
                        </div>
                        <p class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        
                        <div class="bg-light p-2 rounded mb-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>Note finale :</strong>
                                <span class="fs-5 text-warning">
                                    ${this.generateStars(rating)} ${rating.toFixed(1)}/5
                                </span>
                            </div>
                        </div>

                        ${restaurant.comment ? `<p class="text-muted"><em>"${restaurant.comment}"</em></p>` : ''}

                        <div class="edit-only" style="display: ${this.isEditMode ? 'block' : 'none'};">
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="app.editRestaurant(${restaurant.id}, 'tested')">
                                    <i class="bi bi-pencil"></i> Modifier
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="app.deleteRestaurant(${restaurant.id}, 'tested')">
                                    <i class="bi bi-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createWishlistCard(restaurant) {
        const photo = restaurant.photo || restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card restaurant-card wishlist-card h-100" style="border-left: 4px solid #198754;">
                    <img src="${photo}" class="card-img-top" alt="${restaurant.name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${restaurant.name}</h5>
                            <span class="badge bg-success">${restaurant.type}</span>
                        </div>
                        <p class="text-muted">
                            <i class="bi bi-geo-alt"></i> ${restaurant.location}
                            <span class="ms-2">${restaurant.priceRange || '€€'}</span>
                        </p>
                        
                        ${restaurant.reason ? `
                        <div class="alert alert-info py-2">
                            <strong>💡 Pourquoi :</strong> ${restaurant.reason}
                        </div>
                        ` : ''}

                        ${restaurant.comment ? `<p class="text-muted"><em>"${restaurant.comment}"</em></p>` : ''}

                        <div class="edit-only" style="display: ${this.isEditMode ? 'block' : 'none'};">
                            <div class="btn-group w-100">
                                <button class="btn btn-success btn-sm" onclick="app.moveToTested(${restaurant.id})">
                                    <i class="bi bi-check"></i> Testé !
                                </button>
                                <button class="btn btn-outline-primary btn-sm" onclick="app.editRestaurant(${restaurant.id}, 'wishlist')">
                                    <i class="bi bi-pencil"></i> Modifier
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="app.deleteRestaurant(${restaurant.id}, 'wishlist')">
                                    <i class="bi bi-trash"></i> Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createEmptyState(type) {
        const isWishlist = type === 'wishlist';
        const icon = isWishlist ? 'heart' : 'star';
        const title = isWishlist ? 'Aucun restaurant en wishlist' : 'Aucun restaurant testé';
        const text = isWishlist ? 'Ajoutez des restaurants que vous aimeriez tester !' : 'Commencez par ajouter vos premiers restaurants testés !';
        
        return `
            <div class="col-12 text-center py-5">
                <i class="bi bi-${icon} fs-1 text-muted mb-3"></i>
                <h4>${title}</h4>
                <p class="text-muted">${text}</p>
                ${this.isEditMode ? `
                <button class="btn btn-${isWishlist ? 'success' : 'primary'}" onclick="app.openAddModal('${type}')">
                    <i class="bi bi-plus-lg"></i> Ajouter
                </button>
                ` : `
                <button class="btn btn-outline-primary" onclick="app.setupGitHub()">
                    <i class="bi bi-github"></i> Se connecter pour ajouter
                </button>
                `}
            </div>
        `;
    }

    /* ===== MODAL D'AJOUT/MODIFICATION ===== */
    openAddModal(type) {
        if (!this.isEditMode) {
            this.showToast('❌ Mode lecture seule', 'warning');
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('restaurant-modal'));
        
        // Reset du formulaire
        document.getElementById('restaurant-form').reset();
        document.getElementById('restaurant-id').value = '';
        document.getElementById('restaurant-type').value = type;
        
        // Configuration selon le type
        document.getElementById('modal-title').textContent = 
            type === 'tested' ? 'Ajouter un restaurant testé' : 'Ajouter à la wishlist';
        
        // Afficher/masquer les sections
        document.getElementById('ratings-section').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlist-section').style.display = type === 'wishlist' ? 'block' : 'none';
        
        modal.show();
    }

    editRestaurant(id, type) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        // Remplir le formulaire
        document.getElementById('restaurant-id').value = id;
        document.getElementById('restaurant-type').value = type;
        document.getElementById('restaurant-name').value = restaurant.name;
        document.getElementById('restaurant-cuisine').value = restaurant.type;
        document.getElementById('restaurant-location').value = restaurant.location;
        document.getElementById('restaurant-address').value = restaurant.address || '';
        document.getElementById('restaurant-price').value = restaurant.priceRange || '€€';
        document.getElementById('restaurant-photo').value = restaurant.photo || '';
        document.getElementById('restaurant-comment').value = restaurant.comment || '';
        
        if (type === 'tested') {
            document.getElementById('rating-plats').value = restaurant.ratings.plats || 5;
            document.getElementById('rating-vins').value = restaurant.ratings.vins || 5;
            document.getElementById('rating-accueil').value = restaurant.ratings.accueil || 5;
            document.getElementById('rating-lieu').value = restaurant.ratings.lieu || 5;
        } else {
            document.getElementById('restaurant-reason').value = restaurant.reason || '';
        }
        
        // Ouvrir le modal
        document.getElementById('modal-title').textContent = `Modifier ${restaurant.name}`;
        document.getElementById('ratings-section').style.display = type === 'tested' ? 'block' : 'none';
        document.getElementById('wishlist-section').style.display = type === 'wishlist' ? 'block' : 'none';
        
        const modal = new bootstrap.Modal(document.getElementById('restaurant-modal'));
        modal.show();
    }

    async saveRestaurant() {
        if (!this.isEditMode) return;
        
        const form = document.getElementById('restaurant-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const id = document.getElementById('restaurant-id').value;
        const type = document.getElementById('restaurant-type').value;
        const isEdit = !!id;
        
        const restaurantData = {
            id: isEdit ? parseInt(id) : Date.now(),
            name: document.getElementById('restaurant-name').value,
            type: document.getElementById('restaurant-cuisine').value,
            location: document.getElementById('restaurant-location').value,
            address: document.getElementById('restaurant-address').value,
            priceRange: document.getElementById('restaurant-price').value,
            photo: document.getElementById('restaurant-photo').value,
            comment: document.getElementById('restaurant-comment').value,
            dateAdded: isEdit ? this.data[type].find(r => r.id === parseInt(id)).dateAdded : new Date().toISOString().split('T')[0]
        };
        
        if (type === 'tested') {
            restaurantData.ratings = {
                plats: parseFloat(document.getElementById('rating-plats').value),
                vins: parseFloat(document.getElementById('rating-vins').value),
                accueil: parseFloat(document.getElementById('rating-accueil').value),
                lieu: parseFloat(document.getElementById('rating-lieu').value)
            };
            restaurantData.dateVisited = restaurantData.dateAdded;
        } else {
            restaurantData.reason = document.getElementById('restaurant-reason').value;
        }
        
        // Ajouter/modifier dans les données
        if (isEdit) {
            const index = this.data[type].findIndex(r => r.id === parseInt(id));
            this.data[type][index] = restaurantData;
        } else {
            this.data[type].push(restaurantData);
        }
        
        // Sauvegarder
        await this.saveToGitHub();
        
        // Fermer le modal et re-render
        bootstrap.Modal.getInstance(document.getElementById('restaurant-modal')).hide();
        this.render();
        
        this.showToast(isEdit ? '✅ Restaurant modifié !' : '✅ Restaurant ajouté !', 'success');
    }

    async deleteRestaurant(id, type) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data[type].find(r => r.id === id);
        if (!restaurant) return;
        
        if (confirm(`Supprimer "${restaurant.name}" ?`)) {
            this.data[type] = this.data[type].filter(r => r.id !== id);
            await this.saveToGitHub();
            this.render();
            this.showToast('✅ Restaurant supprimé !', 'success');
        }
    }

    async moveToTested(id) {
        if (!this.isEditMode) return;
        
        const restaurant = this.data.wishlist.find(r => r.id === id);
        if (!restaurant) return;
        
        // Demander les notes
        const ratings = {
            plats: parseFloat(prompt('Note pour les plats (1-5) :', '5') || 5),
            vins: parseFloat(prompt('Note pour les vins (1-5) :', '5') || 5),
            accueil: parseFloat(prompt('Note pour l\'accueil (1-5) :', '5') || 5),
            lieu: parseFloat(prompt('Note pour le lieu (1-5) :', '5') || 5)
        };
        
        // Créer l'entrée testée
        const testedRestaurant = {
            ...restaurant,
            ratings: ratings,
            dateVisited: new Date().toISOString().split('T')[0]
        };
        delete testedRestaurant.reason;
        
        // Déplacer
        this.data.tested.push(testedRestaurant);
        this.data.wishlist = this.data.wishlist.filter(r => r.id !== id);
        
        await this.saveToGitHub();
        this.render();
        this.showToast('✅ Restaurant déplacé vers "Testés" !', 'success');
    }

    /* ===== CARTE ===== */
    initMap() {
        if (this.map) return;
        
        this.map = L.map('map').setView([48.8566, 2.3522], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Ajouter les marqueurs
        [...this.data.tested, ...this.data.wishlist].forEach(restaurant => {
            if (restaurant.coordinates) {
                const isTested = this.data.tested.includes(restaurant);
                const color = isTested ? 'blue' : 'green';
                
                const marker = L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="min-width: 200px;">
                        <h6><strong>${restaurant.name}</strong></h6>
                        <p class="mb-1">${restaurant.type} - ${restaurant.location}</p>
                        ${isTested ? 
                            `<div>⭐ ${this.calculateRating(restaurant.ratings).toFixed(1)}/5</div>` :
                            `<div>❤️ À tester</div>`
                        }
                        ${restaurant.comment ? `<p class="small mt-2"><em>"${restaurant.comment}"</em></p>` : ''}
                    </div>
                `);
            }
        });
    }

    /* ===== UTILITAIRES ===== */
    calculateRating(ratings) {
        return (ratings.plats * 2 + ratings.vins * 1.5 + ratings.accueil * 1.5 + ratings.lieu * 1) / 6;
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '⭐';
            } else if (i - 0.5 <= rating) {
                stars += '✨';
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    showToast(message, type = 'info') {
        // Toast simple
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /* ===== DONNÉES PAR DÉFAUT ===== */
    parseCuisineTypes(cuisineTypesData) {
        const defaults = this.getDefaultCuisineTypes();
        if (!cuisineTypesData || typeof cuisineTypesData !== 'object') {
            return defaults;
        }
        
        const parsed = [];
        for (const [key, value] of Object.entries(cuisineTypesData)) {
            parsed.push({
                value: key,
                label: `${value.emoji || '🍽️'} ${key}`,
                emoji: value.emoji || '🍽️'
            });
        }
        
        return parsed.length > 0 ? parsed : defaults;
    }

    generateCuisineTypesObject() {
        const obj = {};
        this.data.cuisineTypes.forEach(cuisine => {
            obj[cuisine.value] = {
                color: 'primary',
                emoji: cuisine.emoji
            };
        });
        return obj;
    }

    getDefaultCuisineTypes() {
        return [
            { value: 'français', label: '🥖 Français', emoji: '🥖' },
            { value: 'italien', label: '🍕 Italien', emoji: '🍕' },
            { value: 'asiatique', label: '🍜 Asiatique', emoji: '🍜' },
            { value: 'japonais', label: '🍣 Japonais', emoji: '🍣' }
        ];
    }

    getDefaultTestedData() {
        return [
            {
                id: 1,
                name: "Le Comptoir du Relais",
                type: "français",
                location: "6ème arrondissement",
                address: "9 Carrefour de l'Odéon, 75006 Paris",
                coordinates: { lat: 48.8534, lng: 2.3387 },
                ratings: { plats: 4.5, vins: 4.0, accueil: 4.5, lieu: 4.0 },
                comment: "Bistrot authentique avec une cuisine excellente !",
                dateVisited: "2024-12-15",
                dateAdded: "2024-12-15",
                priceRange: "€€",
                photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop"
            }
        ];
    }

    getDefaultWishlistData() {
        return [
            {
                id: 4,
                name: "L'Ami Jean",
                type: "français",
                location: "7ème arrondissement",
                address: "27 rue Malar, 75007 Paris",
                coordinates: { lat: 48.8584, lng: 2.3019 },
                reason: "Recommandé par un ami pour la cuisine basque",
                dateAdded: "2024-12-01",
                priceRange: "€€€",
                photo: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=250&fit=crop"
            }
        ];
    }
}

/* ===== INITIALISATION ===== */
let app;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Démarrage de l\'application...');
    
    app = new SimpleRestaurantApp();
    await app.init();
    
    console.log('✅ Application prête !');
});

/* ===== FONCTIONS GLOBALES ===== */
function saveRestaurant() {
    app.saveRestaurant();
}
